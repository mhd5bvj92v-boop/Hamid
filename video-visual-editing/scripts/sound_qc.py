#!/usr/bin/env python3
"""Validate a rendered sound design (System D) before delivery. Exit code 1 if any ERROR.

  python3 scripts/sound_qc.py work/sound/render_v1 [--events work/sound/video_events.json] [--strict-style]

Checks (each reports PASS / WARN / ERROR with numbers):
  export     final.mp4 exists, has picture + audio, duration matches, picture stream bit-identical to source
  placement  every cue is in its stem at the right sample position (correlation with the source clip)
  sync       anchor (whoosh loudest point / texture+hit transient / riser resolution) on its target frame (+-1 frame);
             linked motion events (fastest frame / visible frame) match; whoosh loudest point measured in the stem
  levels     family gain presets (whoosh -12..-10, texture -7..-6, riser -5, music -19, suck-back very low/very loud)
  risers     riser resolves on a transition with a hit beneath; riser near the hook; >=2 sharp-bass + >=2 metallic (style target)
  music      silent inside full-screen / graphic windows
  clipping   sample peak of mix.wav and true peak of final.mp4 under the ceiling; loudest stack reported
  dialogue   nothing louder than the voice while the speaker talks; voice stem bit-identical to the source; voice at unity in the mix
  assets     every source file (library sounds, video, music) unchanged (sha256)
  tracks     one sound family per track; auditioned variations recorded
"""
import argparse
import hashlib
import json
import subprocess
from collections import defaultdict
from pathlib import Path

import numpy as np

import audiolib as A

SR = A.SR
RES = []


def add(level, area, msg):
    RES.append((level, area, msg))


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 16), b""):
            h.update(b)
    return h.hexdigest()


def stream_md5(path, sel):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", f"0:{sel}", "-c", "copy", "-f", "md5", "-"], capture_output=True, text=True)
    return r.stdout.strip()


def speech_windows(dlg, frame=0.4):
    """Short-term (400 ms) voice RMS and a mask of windows with real speech energy
    (above the noise floor + 12 dB and within 15 dB of the median speech level; word tails are excluded)."""
    mono = dlg.mean(axis=1)
    hop = int(frame * SR)
    n = len(mono) // hop
    if not n:
        return np.zeros(0, bool), np.zeros(0)
    rms = np.sqrt(np.mean(mono[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    dbv = 20 * np.log10(rms)
    thr = max(-45.0, float(np.percentile(dbv, 10)) + 12)
    act = dbv > thr
    if act.any():
        med = float(np.median(dbv[act]))
        act &= dbv > med - 15
    return act, rms


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("render"); ap.add_argument("--events"); ap.add_argument("--strict-style", action="store_true")
    a = ap.parse_args()
    R = Path(a.render)
    S = json.loads((R / "session.json").read_text())
    fps, D = S["fps"], S["duration"]
    fr = 1.0 / fps
    P = S["placements"]
    # ---------------- export
    final = Path(S["outputs"]["final"])
    if not final.exists():
        add("ERROR", "export", f"{final} does not exist")
    else:
        info = A.probe(final)
        if not (info["has_audio"] and info["has_video"]):
            add("ERROR", "export", f"final.mp4 streams: video={info['has_video']} audio={info['has_audio']}")
        if abs(info["duration"] - D) > 2 * fr + 0.05:
            add("ERROR", "export", f"final duration {info['duration']:.3f}s vs source {D:.3f}s")
        same = stream_md5(final, "v:0") == stream_md5(S["video"], "v:0")
        add("PASS" if same else "ERROR", "export", "picture stream bit-identical to source" if same else "picture stream differs from source")
        add("PASS", "export", f"final.mp4 exists ({final.stat().st_size / 1e6:.1f} MB, {info['duration']:.2f}s, audio+video)")
    stems = {p.stem: A.decode(p) for p in (R / "stems").glob("*.wav")}
    mix = A.decode(R / "mix.wav")
    N = len(mix)
    # ---------------- tracks
    fam_by_track = defaultdict(set)
    for p in P:
        fam_by_track[p["track"]].add(p["family"])
    for t, fams in fam_by_track.items():
        add("PASS" if len(fams) == 1 else "ERROR", "tracks", f"{t}: families {sorted(fams)}")
    # ---------------- levels
    for p in P:
        g, f, why = p["gain_db"] - p.get("auto_pulled_db", 0), p["family"], p.get("gain_override_reason")
        bad = None
        if f == "whoosh" and not (-12.0 - 1e-6 <= g <= -10.0 + 1e-6):
            bad = f"whoosh at {g} dB (preset -12, max -10)"
        if f == "texture" and not (-7.0 - 1e-6 <= g <= -6.0 + 1e-6):
            bad = f"texture at {g} dB (preset -6 to -7)"
        if f == "riser":
            if p.get("subtype") == "suck-back":
                if -15 < g < -6:
                    bad = f"suck-back riser at {g} dB: must be very low (<= -15) or very loud (>= -6), never middle"
            elif abs(g + 5) > 1e-6:
                bad = f"riser at {g} dB (preset -5)"
        if bad:
            add("WARN" if why else "ERROR", "levels", f"{p['id']}: {bad}" + (f" - override: {why}" if why else ""))
        if p.get("auto_pulled_db"):
            add("WARN", "levels", f"{p['id']}: auto-pulled {p['auto_pulled_db']:.1f} dB to prevent clipping (hit pulled, voice untouched)")
    if not any(r[1] == "levels" and r[0] != "PASS" for r in RES):
        add("PASS", "levels", f"all {len(P)} cue gains within presets")
    # ---------------- placement + sync
    cache = {}
    rebuilt = {}
    for p in P:
        clip = cache.get(p["file"])
        if clip is None:
            clip = cache[p["file"]] = A.decode(p["file"])
        c = clip
        if p.get("trim"):
            a_, b_ = p["trim"]; c = c[int(a_ * SR): int(b_ * SR) if b_ else None]
        c = c.copy()
        if p["fade_in"] > 0: k = min(len(c), int(p["fade_in"] * SR)); c[:k] *= np.linspace(0, 1, k, dtype=np.float32)[:, None]
        if p["fade_out"] > 0: k = min(len(c), int(p["fade_out"] * SR)); c[len(c) - k:] *= np.linspace(1, 0, k, dtype=np.float32)[:, None]
        m = A.analyze(c)
        expect_off = {"peak": m["peak_time"], "onset": m["onset_time"], "start": 0.0, "end": m["duration"]}[p["anchor"]]
        placed_anchor = p["start"] + p["anchor_offset"]
        target = p["target_t"] - p["lead_frames"] * fr
        err = abs(placed_anchor - target)
        if abs(p["anchor_offset"] - expect_off) > 0.003 and p["anchor"] != "start":
            add("WARN", "sync", f"{p['id']}: anchor offset {p['anchor_offset']:.3f}s differs from re-measured {expect_off:.3f}s (manual override?)")
        add("PASS" if err <= fr / 2 else "ERROR", "sync", f"{p['id']} ({p['family']}): {p['anchor']} at {A.tc(placed_anchor, fps)} vs target {A.tc(target, fps)} (err {err * 1000:.1f} ms)")
        # rebuild this placement independently (for the exact stem comparison below)
        s0 = int(round(p["start"] * SR)); src0 = max(0, -s0); s0 = max(0, s0)
        seg = c[src0:]; e0 = min(N, s0 + len(seg))
        if e0 > s0:
            rebuilt.setdefault(p["track"], np.zeros((N, 2), np.float64))[s0:e0] += seg[: e0 - s0] * A.undb(p["gain_db"])
        st = stems.get(p["track"])
        # linked visual event
        ln = p.get("link") or {}
        if "event_t" in ln:
            d = abs(target - float(ln["event_t"]))
            add("PASS" if d <= fr + 1e-6 else "ERROR", "sync", f"{p['id']}: sound anchor vs visual event '{ln.get('what', '')}' {d * 1000:.0f} ms ({'<=' if d <= fr + 1e-6 else '>'} 1 frame)")
        # measured whoosh loudest point in the stem (when it does not overlap another whoosh)
        if p["family"] == "whoosh" and st is not None:
            others = [q for q in P if q is not p and q["track"] == p["track"] and q["start"] < p["end"] and q["end"] > p["start"]]
            if not others:
                lo, hi = max(0, int(p["start"] * SR)), min(N, int(p["end"] * SR))
                t_, env = A.envelope(st[lo:hi].mean(axis=1), win=0.05, hop=0.005)
                if len(env):
                    pk = lo / SR + float(t_[int(np.argmax(env))])
                    d = abs(pk - target)
                    add("PASS" if d <= fr else "ERROR", "sync", f"{p['id']}: measured whoosh loudest point {A.tc(pk, fps)} vs fastest frame {A.tc(target, fps)} ({d * 1000:.0f} ms)")
    for trk, exp in rebuilt.items():
        got = stems.get(trk)
        if got is None:
            add("ERROR", "placement", f"stem {trk} missing"); continue
        err = float(np.max(np.abs(got[: len(exp)] - exp[: len(got)])))
        ids = [p["id"] for p in P if p["track"] == trk]
        add("PASS" if err < 2e-4 else "ERROR", "placement",
            f"{trk}: stem rebuilt independently from the source files matches the render (max diff {err:.1e}); cues {', '.join(ids[:12])}{' ...' if len(ids) > 12 else ''}")
    # ---------------- risers & hits
    risers = [p for p in P if p["family"] == "riser"]; hits = [p for p in P if p["family"] == "hit"]
    for r in risers:
        ra = r["target_t"] - r["lead_frames"] * fr
        hit = [h for h in hits if abs(h["target_t"] - ra) <= fr + 1e-6]
        add("PASS" if hit else "WARN", "risers", f"{r['id']}: " + (f"hit {hit[0]['id']} lands under the riser's resolution" if hit else "no hit under the riser's resolution frame"))
    if S.get("hook_end") is not None and risers:
        h = float(S["hook_end"])
        ok = any(h - 1 <= r["target_t"] <= h + 6 for r in risers)
        add("PASS" if ok else "WARN", "risers", f"riser {'present' if ok else 'missing'} into the body after the hook (hook ends {h:.2f}s; Joseph places one ~5 s in)")
    sb = sum(1 for r in risers if r.get("subtype") == "sharp-bass"); me = sum(1 for r in risers if r.get("subtype") == "metallic")
    lvl = "PASS" if (sb >= 2 and me >= 2) else ("ERROR" if a.strict_style else "WARN")
    add(lvl, "risers", f"style target >=2 sharp-bass and >=2 metallic risers: found {sb} sharp-bass, {me} metallic (depends on video length and on the library having them)")
    # ---------------- music
    mus = stems.get("MUSIC")
    if mus is not None and np.any(mus):
        for s_, e_ in S.get("no_music_windows", []):
            a_, b_ = int((s_ + 0.5) * SR), int((e_ - 0.05) * SR)
            if b_ > a_:
                lv = A.db(np.sqrt(np.mean(mus[a_:b_] ** 2)) + 1e-12)
                add("PASS" if lv < -60 else "ERROR", "music", f"music in full-screen/graphic window {s_:.2f}-{e_:.2f}s: {lv:.1f} dBFS ({'silent' if lv < -60 else 'NOT silent'})")
    else:
        add("PASS", "music", "no music in this render (pass 4 not applied or no music supplied)")
    # ---------------- clipping
    pk = float(np.max(np.abs(mix))) if N else 0
    ceil = S.get("ceiling_dbfs", -1.0)
    tp = A.lufs(final).get("true_peak_dbtp") if final.exists() else None
    i_pk = int(np.argmax(np.max(np.abs(mix), axis=1))) if N else 0
    stack = [q["id"] for q in P if q["start"] <= i_pk / SR <= q["end"]]
    add("PASS" if A.db(pk) <= ceil + 0.05 else "ERROR", "clipping", f"mix sample peak {A.db(pk):.2f} dBFS (ceiling {ceil}) at {A.tc(i_pk / SR, fps)}; loudest stack: {stack or ['dialogue/music only']}")
    if tp is not None:
        add("PASS" if tp <= ceil + 0.5 else "ERROR", "clipping", f"final.mp4 true peak {tp:.2f} dBTP")
    # ---------------- dialogue
    dlg = stems.get("DIALOGUE")
    if dlg is not None and np.any(dlg):
        src = A.decode(S["dialogue"])[:N]
        diff = float(np.max(np.abs(dlg[: len(src)] - src))) if len(src) else 0
        add("PASS" if diff < 1e-4 else "ERROR", "dialogue", f"voice stem identical to source (max diff {diff:.2e})")
        others = sum(v for k, v in stems.items() if k != "DIALOGUE")
        unity = float(np.max(np.abs((mix - others)[: len(dlg)] - dlg))) if not S.get("limiter_applied") else 0
        add("PASS" if unity < 1e-3 else "ERROR", "dialogue", f"voice at unity gain in the mix (residual {unity:.2e})" + (" [limiter applied: skipped]" if S.get("limiter_applied") else ""))
        sp, vr = speech_windows(dlg)
        if len(sp):
            hop = int(0.4 * SR); n = len(sp)
            fx = (others[: n * hop].mean(axis=1).reshape(n, hop) ** 2).mean(axis=1) ** 0.5 + 1e-12
            ratio = 20 * np.log10(fx / (vr + 1e-12))
            loud = [i for i in range(n) if sp[i] and ratio[i] > 0]
            close = [i for i in range(n) if sp[i] and -3 < ratio[i] <= 0]
            if loud:
                add("ERROR", "dialogue", f"effects/music louder than the voice during speech in {len(loud)} x 400 ms windows, e.g. {', '.join(A.tc(i * 0.4, fps) for i in loud[:6])}")
            else:
                add("PASS", "dialogue", f"nothing louder than the voice in {int(sp.sum())} x 400 ms speech windows (short-term RMS)")
            if len(close) >= 1:
                add("WARN", "dialogue", f"effects within 3 dB of the voice in {len(close)} speech windows (check intelligibility), e.g. {', '.join(A.tc(i * 0.4, fps) for i in close[:6])}")
    else:
        add("WARN", "dialogue", "no dialogue in this render")
    # ---------------- assets
    changed = [p for p, h in S["source_hashes"].items() if not Path(p).exists() or sha(p) != h]
    add("PASS" if not changed else "ERROR", "assets", f"{len(S['source_hashes'])} source files unchanged" if not changed else f"source files changed/missing: {changed}")
    inside = [p for p in S["source_hashes"] if Path(p).resolve().is_relative_to(R.resolve())]
    if inside:
        add("ERROR", "assets", f"sources stored inside the render folder (could be overwritten): {inside}")
    # ---------------- audition records
    lib = A.load_library()
    if lib.get("sounds"):
        grp = defaultdict(list)
        for s in lib["sounds"]: grp[s["variation_group"]].append(s["id"])
        gid = {s["id"]: s["variation_group"] for s in lib["sounds"]}
        for p in P:
            sid = p.get("sound_id")
            if sid and len(grp.get(gid.get(sid), [])) > 1 and not (p.get("auditioned") and len(p["auditioned"]) > 1):
                add("WARN", "tracks", f"{p['id']}: {sid} has variations in '{gid[sid]}' but no audition record (list the IDs compared in 'auditioned')")
    # ---------------- events file (optional cross-check)
    if a.events:
        ev = json.loads(Path(a.events).read_text())
        cuts = [c["t"] for c in ev.get("cuts", [])]
        for r in risers:
            if cuts and min(abs(r["target_t"] - c) for c in cuts) > fr + 1e-6:
                add("WARN", "risers", f"{r['id']} resolves at {A.tc(r['target_t'], fps)}, not on a detected cut (nearest {min(cuts, key=lambda c: abs(c - r['target_t'])):.3f}s)")
    # ---------------- report
    order = {"ERROR": 0, "WARN": 1, "PASS": 2}
    RES.sort(key=lambda r: order[r[0]])
    lines = [f"# Sound QC: {R.name}\n", f"{sum(r[0] == 'ERROR' for r in RES)} errors, {sum(r[0] == 'WARN' for r in RES)} warnings, {sum(r[0] == 'PASS' for r in RES)} passes\n\n"]
    lines += [f"- **{lv}** [{ar}] {m}\n" for lv, ar, m in RES]
    (R / "qc_report.md").write_text("".join(lines))
    (R / "qc_report.json").write_text(json.dumps([{"level": l, "area": ar, "message": m} for l, ar, m in RES], indent=1))
    for lv, ar, m in RES:
        if lv != "PASS":
            print(f"{lv:5s} [{ar}] {m}")
    print(lines[1].strip(), "->", R / "qc_report.md")
    raise SystemExit(1 if any(r[0] == "ERROR" for r in RES) else 0)


if __name__ == "__main__":
    main()
