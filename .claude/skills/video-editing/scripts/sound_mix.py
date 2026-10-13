#!/usr/bin/env python3
"""Render a sound-design cue sheet into editable stems + a final mixed export (System D).
The audio engine of the talking-head workflow (Remotion builds the picture): numpy places the clips sample-accurately, ffmpeg decodes/encodes/muxes.

  python3 scripts/sound_mix.py work/sound/cues.json --out work/sound/render_v1 [--passes 1,2,3] [--no-music] [--limiter]

Outputs (all new files; sources are never modified):
  stems/DIALOGUE.wav WHOOSHES.wav TEXTURES.wav RISERS.wav HITS.wav ENV.wav MUSIC.wav   (48 kHz / 24-bit, aligned to 00:00:00:00)
  mix.wav            sum of stems (what the export contains)
  final.mp4          picture copied untouched + mixed audio (AAC 320k)
  session.json       every placement as rendered: file, sha256, start, anchor, gain (incl. auto-fixes)
  cuesheet.csv       track / timecode / file / gain / event / reason (import or read in any NLE/DAW)

Rules enforced here (Joseph's system, see references/sound-design.md):
  * the voice is never altered: dialogue gain must be 0 dB;
  * each cue is placed by its ANCHOR (whoosh: loudest point; texture/hit: transient; riser: loudest point
    = resolution, or clip end), not by clip start;
  * one family per track; music is gated OFF inside full-screen / graphic-only windows;
  * if the mix would clip, HITS overlapping the clip are pulled down first (never the voice); a limiter
    is only applied with --limiter (reported as a deviation).
"""
import argparse
import csv
import datetime
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

import audiolib as A

ROOT = Path(__file__).resolve().parent.parent
SR = A.SR
FAMILY = {  # family: (track, default anchor, default gain dB, allowed range)
    "whoosh":  ("WHOOSHES", "peak",  -12.0, (-12.0, -10.0)),
    "texture": ("TEXTURES", "onset",  -7.0, (-7.0, -6.0)),
    "riser":   ("RISERS",   "peak",   -5.0, (-5.0, -5.0)),
    "hit":     ("HITS",     "onset",  -6.0, None),           # Joseph: under the riser, avoid clipping (no fixed number)
    "env":     ("ENV",      "start", -18.0, None),           # beds/room tone: not in Joseph's table
}
TRACKS = ["DIALOGUE", "WHOOSHES", "TEXTURES", "TEXTURES_2", "RISERS", "HITS", "ENV", "MUSIC"]


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 16), b""):
            h.update(b)
    return h.hexdigest()


def resolve_sound(ref, lib, base):
    if ref is None:
        raise ValueError("cue has no sound assigned")
    for s in lib.get("sounds", []):
        if s["id"] == str(ref).upper():
            return Path(s["path"]), s["id"]
    p = Path(ref)
    if not p.is_absolute():
        p = (base / p).resolve()
    if p.exists():
        return p, None
    raise FileNotFoundError(f"sound {ref!r} not found in data/sounds.json or on disk")


def expand(cues):
    out = []
    for c in cues:
        if c.get("times"):
            sounds = c.get("sounds") or [c.get("sound")]
            for k, t in enumerate(c["times"]):
                cc = {key: v for key, v in c.items() if key not in ("times", "sounds")}
                cc.update(id=f"{c['id']}.{k + 1}", t=t, sound=sounds[k % len(sounds)])
                out.append(cc)
        else:
            out.append(dict(c))
    return out


def windows_mask(n, windows, fade):
    """1.0 where music is allowed (outside windows), 0.0 inside, with linear fades."""
    m = np.ones(n, np.float32)
    f = int(fade * SR)
    for s, e in windows:
        a, b = max(0, int(s * SR)), min(n, int(e * SR))
        m[a:b] = 0
        if f:
            ramp = np.linspace(1, 0, f, dtype=np.float32)
            a0 = max(0, a - f); m[a0:a] = np.minimum(m[a0:a], ramp[f - (a - a0):])
            b1 = min(n, b + f); m[b:b1] = np.minimum(m[b:b1], ramp[::-1][: b1 - b])
    return m


def render(cfg, base, out, passes, no_music, limiter):
    lib = A.load_library()
    video = (base / cfg["video"]).resolve() if not Path(cfg["video"]).is_absolute() else Path(cfg["video"])
    vinfo = A.probe(video)
    fps = cfg.get("fps")
    if not fps:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(video)],
                           capture_output=True, text=True).stdout.strip()
        num, den = map(int, r.split("/")); fps = num / den
    D = vinfo["duration"]
    N = int(round(D * SR))
    stems = {t: np.zeros((N, 2), np.float32) for t in TRACKS}
    hashes_before = {}
    # dialogue (voice is king: never processed)
    dlg = cfg.get("dialogue", {"file": cfg["video"]})
    if float(dlg.get("gain_db", 0)) != 0:
        sys.exit("Refusing: dialogue gain_db must be 0 (the voice is never altered). Adjust effects instead.")
    dpath = (base / dlg["file"]).resolve() if not Path(dlg["file"]).is_absolute() else Path(dlg["file"])
    if A.probe(dpath)["has_audio"]:
        v = A.decode(dpath, stream=dlg.get("stream", "a:0"))
        stems["DIALOGUE"][: min(N, len(v))] = v[:N]
        hashes_before[str(dpath)] = sha(dpath)
    else:
        print("WARNING: no dialogue audio found - rendering effects only")
    hashes_before[str(video)] = sha(video)
    placements, warnings = [], []
    allc = expand(cfg.get("cues", []))
    skipped = [c["id"] for c in allc if c.get("status") in ("rejected", "silence")]
    undecided = [c["id"] for c in allc if c.get("status") not in ("rejected", "silence") and not c.get("sound")]
    if undecided:
        sys.exit("Cues without a sound (decide or set status 'rejected'/'silence'): " + ", ".join(undecided[:20]))
    cues = [c for c in allc if c.get("status") not in ("rejected", "silence") and (int(c.get("pass", 1)) in passes or c.get("family") == "env")]
    cache = {}
    segs = []          # (s0, e0, unscaled samples) per placement, for exact gain changes
    for c in cues:
        fam = c["family"]
        track_default, anchor_default, gain_default, _ = FAMILY[fam]
        track = c.get("track", track_default)
        if track not in stems:
            sys.exit(f"cue {c['id']}: unknown track {track}")
        path, sid = resolve_sound(c.get("sound"), lib, base)
        if str(path) not in cache:
            cache[str(path)] = A.decode(path)
            hashes_before[str(path)] = sha(path)
        clip = cache[str(path)]
        if c.get("trim"):
            a_, b_ = c["trim"]; clip = clip[int(a_ * SR): int(b_ * SR) if b_ else None]
        clip = clip.copy()
        fi, fo = float(c.get("fade_in", 0)), float(c.get("fade_out", 0.01))
        if fi > 0: k = min(len(clip), int(fi * SR)); clip[:k] *= np.linspace(0, 1, k, dtype=np.float32)[:, None]
        if fo > 0: k = min(len(clip), int(fo * SR)); clip[len(clip) - k:] *= np.linspace(1, 0, k, dtype=np.float32)[:, None]
        m = A.analyze(clip)
        anchor = c.get("anchor", anchor_default)
        off = {"peak": m["peak_time"], "onset": m["onset_time"], "start": 0.0, "end": m["duration"]}[anchor]
        if "anchor_offset" in c: off = float(c["anchor_offset"])        # manual override (e.g. hand-picked hit point)
        gain = float(c.get("gain_db", gain_default))
        lead = int(c.get("lead_frames", 0)) / fps
        start = float(c["t"]) - lead - off
        s0 = int(round(start * SR))
        src0 = 0
        if s0 < 0:
            src0, s0 = -s0, 0
            warnings.append(f"{c['id']}: clip head trimmed ({src0 / SR:.3f}s) because it starts before 0")
        seg = clip[src0:]
        e0 = min(N, s0 + len(seg))
        if e0 <= s0:
            warnings.append(f"{c['id']}: placed outside the video - skipped"); continue
        stems[track][s0:e0] += seg[: e0 - s0] * A.undb(gain)
        segs.append((s0, e0, seg[: e0 - s0]))
        placements.append({"id": c["id"], "family": fam, "track": track, "subtype": c.get("subtype"), "sound_id": sid, "file": str(path),
                           "sha256": hashes_before[str(path)], "event": c.get("event", ""), "reason": c.get("reason", ""),
                           "target_t": float(c["t"]), "anchor": anchor, "anchor_offset": round(off, 4), "lead_frames": int(c.get("lead_frames", 0)),
                           "start": round(start, 5), "end": round(start + len(clip) / SR, 5), "gain_db": gain, "pass": int(c.get("pass", 1)),
                           "gain_override_reason": c.get("gain_override_reason"), "link": c.get("link"), "auditioned": c.get("auditioned"),
                           "trim": c.get("trim"), "fade_in": fi, "fade_out": fo})
    # music (pass 4): talking head only, gated out of full-screen/graphic windows
    mus = cfg.get("music")
    no_music_windows = cfg.get("fullscreen_windows", []) + cfg.get("graphic_windows", [])
    if mus and not no_music:
        mp = (base / mus["file"]).resolve() if not Path(mus["file"]).is_absolute() else Path(mus["file"])
        hashes_before[str(mp)] = sha(mp)
        mm = A.decode(mp)
        off = int(float(mus.get("start_offset", 0)) * SR)
        mm = mm[off:]
        reps = int(np.ceil(N / max(len(mm), 1)))
        bed = np.tile(mm, (reps, 1))[:N] * A.undb(float(mus.get("gain_db", -19)))
        bed *= windows_mask(N, no_music_windows, float(mus.get("fade", 0.4)))[:, None]
        fo = int(float(mus.get("tail_fade", 1.0)) * SR); bed[N - fo:] *= np.linspace(1, 0, fo, dtype=np.float32)[:, None]
        stems["MUSIC"] = bed.astype(np.float32)
    # clip protection: pull HITS first, never the voice
    ceiling = A.undb(float(cfg.get("mix", {}).get("ceiling_dbfs", -1.0)))
    fixes = []
    for it in range(8):
        mix = sum(stems.values())
        over = np.nonzero(np.max(np.abs(mix), axis=1) > ceiling)[0]
        if not len(over):
            break
        t_over = over / SR
        hit_idx = [k for k, p in enumerate(placements) if p["family"] == "hit" and any(p["start"] <= t <= p["end"] for t in t_over[:: max(1, len(t_over) // 200)])]
        if not hit_idx:
            break
        need = A.db(np.max(np.abs(mix[over])) / ceiling) + 0.5
        for k in hit_idx:
            p = placements[k]
            s0, e0, raw = segs[k]
            old, new = p["gain_db"], p["gain_db"] - need
            stems[p["track"]][s0:e0] -= raw * (A.undb(old) - A.undb(new))     # exact: only this hit changes
            p["gain_db"] = new; p["auto_pulled_db"] = p.get("auto_pulled_db", 0) - need      # exact (QC rebuilds stems from these)
            fixes.append(f"pulled {p['id']} (at {p['target_t']:.2f}s) by {need:.1f} dB to stop the stack clipping (hit pulled, voice untouched)")
    mix = sum(stems.values())
    peak = float(np.max(np.abs(mix))) if N else 0
    if peak > ceiling:
        culprits = sorted({p["family"] for p in placements if any(p["start"] <= t <= p["end"] for t in (np.nonzero(np.max(np.abs(mix), axis=1) > ceiling)[0] / SR)[::200])})
        msg = f"mix peaks at {A.db(peak):.1f} dBFS (ceiling {A.db(ceiling):.1f}); stack involves {culprits or ['dialogue/music']}"
        if limiter:
            warnings.append(msg + " -> limiter applied (--limiter)")
        else:
            warnings.append(msg + " -> NOT fixed automatically: lower the riser/hit stack or move it off the speech; never lower the voice")
    out.mkdir(parents=True, exist_ok=True); (out / "stems").mkdir(exist_ok=True)
    for t, data in stems.items():
        if t == "TEXTURES_2" and not np.any(data):
            continue
        A.write_audio(out / "stems" / f"{t}.wav", data)
    A.write_audio(out / "mix_raw.wav", mix)
    mix_file = out / "mix.wav"
    if limiter and peak > ceiling:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out / "mix_raw.wav"), "-af", f"alimiter=limit={ceiling}:level=disabled",
                        "-c:a", "pcm_s24le", str(mix_file)], check=True)
    else:
        (out / "mix_raw.wav").replace(mix_file)
    final = out / "final.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(mix_file), "-map", "0:v:0", "-map", "1:a:0",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest", str(final)], check=True)
    # cue sheet for humans/NLEs
    with open(out / "cuesheet.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["track", "cue", "anchor_timecode", "clip_in_timecode", "anchor", "file", "gain_db", "event", "reason"])
        for p in sorted(placements, key=lambda x: x["target_t"]):
            w.writerow([p["track"], p["id"], A.tc(p["target_t"] - p["lead_frames"] / fps, fps), A.tc(max(0, p["start"]), fps), p["anchor"],
                        p["file"], p["gain_db"], p["event"], p["reason"]])
    session = {"rendered": datetime.datetime.now().isoformat(timespec="seconds"), "cue_sheet": str(cfg.get("_path")), "video": str(video),
               "dialogue": str(dpath), "fps": fps, "duration": D, "sample_rate": SR, "passes": sorted(passes), "music": bool(mus and not no_music),
               "no_music_windows": no_music_windows, "hook_end": cfg.get("hook_end"), "ceiling_dbfs": round(A.db(ceiling), 2), "limiter_applied": bool(limiter and peak > ceiling),
               "placements": placements, "skipped_cues": skipped, "auto_fixes": fixes, "warnings": warnings, "source_hashes": hashes_before,
               "outputs": {"final": str(final), "mix": str(mix_file), "stems": sorted(str(p) for p in (out / "stems").glob("*.wav"))}}
    (out / "session.json").write_text(json.dumps(session, indent=1))
    print(f"rendered {len(placements)} placements into {out} (final.mp4, mix.wav, stems/, session.json, cuesheet.csv)")
    for m_ in fixes + warnings:
        print("  -", m_)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cues"); ap.add_argument("--out", required=True)
    ap.add_argument("--passes", default="1,2,3", help="which passes to include (music is pass 4 / --no-music)")
    ap.add_argument("--no-music", action="store_true"); ap.add_argument("--limiter", action="store_true")
    a = ap.parse_args()
    p = Path(a.cues).resolve()
    cfg = json.loads(p.read_text()); cfg["_path"] = str(p)
    render(cfg, p.parent, Path(a.out).resolve(), {int(x) for x in a.passes.split(",")}, a.no_music, a.limiter)


if __name__ == "__main__":
    main()
