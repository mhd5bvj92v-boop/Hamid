#!/usr/bin/env python3
"""End-to-end self-test of the System D toolchain on SYNTHETIC fixtures.

  python3 scripts/sound_selftest.py [--keep /path/to/dir]

It never touches the real library index (uses VV_SOUNDS_JSON / VV_SOUND_DOC in a temp folder).
The synthetic sounds are test signals (filtered noise, sweeps, sines); they prove that indexing,
anchoring, gain presets, music gating, clip protection, dialogue protection, QC and export work.
They are NOT a sound library and must never be delivered in a client edit.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import audiolib as A  # noqa: E402

SR = 48000
rng = np.random.default_rng(7)


def smooth_noise(n, k):
    x = rng.standard_normal(n)
    return np.convolve(x, np.ones(k) / k, mode="same")


def norm(x, peak_db):
    return (x / (np.max(np.abs(x)) + 1e-9) * A.undb(peak_db)).astype(np.float32)


def st(x):
    return np.stack([x, x], 1)


def fixtures(lib):
    t = lambda d: np.arange(int(d * SR)) / SR
    out = {}
    def w(rel, x):
        p = lib / rel; p.parent.mkdir(parents=True, exist_ok=True); A.write_audio(p, st(x)); out[rel] = p
    for i, (pk, dur) in enumerate([(0.35, 0.9), (0.5, 1.2), (0.25, 0.6)], 1):          # whoosh variations (bell envelopes)
        tt = t(dur); env = np.exp(-((tt - pk) / (dur / 6)) ** 2)
        w(f"Whooshes/Hollow whoosh/hollow whoosh {i}.wav", norm(smooth_noise(len(tt), 6) * env, -6))
    tt = t(2.0); x = np.sin(2 * np.pi * (60 + 400 * tt ** 2) * tt) * (tt / 2.0) ** 2 + 0.3 * smooth_noise(len(tt), 3) * (tt / 2) ** 3
    x[int(1.95 * SR):] *= np.linspace(1, 0, len(x) - int(1.95 * SR))
    w("Risers/Sharp bass riser 1.wav", norm(x, -3))
    tt = t(1.6); x = np.sin(2 * np.pi * (300 + 900 * tt) * tt) * (tt / 1.6) ** 2.5
    x[int(1.55 * SR):] *= np.linspace(1, 0, len(x) - int(1.55 * SR))
    w("Risers/Metallic riser 1.wav", norm(x, -3))
    tt = t(1.2); x = np.sin(2 * np.pi * 48 * tt) * np.exp(-tt * 5) + 0.4 * rng.standard_normal(len(tt)) * np.exp(-tt * 40)
    x[: int(0.01 * SR)] = 0
    w("Hits/Impact hit 1.wav", norm(x, -3))
    tt = t(0.08); w("Textures/Pop/pop 1.wav", norm(np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 60), -6))
    tt = t(0.04); w("UI/ui click 1.wav", norm(np.sin(2 * np.pi * 2200 * tt) * np.exp(-tt * 150), -6))
    tt = t(0.5); w("Sci-fi/sci-fi impact 1.wav", norm(np.sin(2 * np.pi * (1500 - 2400 * tt) * tt) * np.exp(-tt * 9), -6))
    x = np.zeros(int(0.6 * SR))
    for k in range(6):
        a = int(k * 0.1 * SR); tt = t(0.02); x[a:a + len(tt)] += np.sin(2 * np.pi * 3000 * tt) * np.exp(-tt * 300)
    w("Gears/tiny gearwheel 1.wav", norm(x, -6))
    w("Ambience/room tone.wav", norm(smooth_noise(int(5 * SR), 40), -30))
    tt = t(8.0); pad = sum(np.sin(2 * np.pi * f * tt) for f in (220, 277.2, 329.6)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * tt))
    out["music"] = lib.parent / "music" / "test bed.wav"; out["music"].parent.mkdir(exist_ok=True); A.write_audio(out["music"], st(norm(pad, -6)))
    return out


def test_video(d):
    """12 s 540x960 clip: TTS dialogue (if ffmpeg flite exists) at 0.4-2.6, 4.0-7.0, 9.8-11.6 s; full-screen look 7.5-9.5 s."""
    voice = np.zeros(int(12 * SR), np.float32)
    phrases = [(0.4, "What is the big picture here"), (4.0, "We posted every single day for a month"), (9.8, "And that changed everything")]
    for start, text in phrases:
        f = d / f"v{int(start * 10)}.wav"
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"flite=text='{text}'", "-ar", str(SR), "-ac", "1", str(f)])
        if r.returncode:
            tt = np.arange(int(2 * SR)) / SR; seg = (np.sin(2 * np.pi * 180 * tt) * (np.sin(2 * np.pi * 3 * tt) > 0)).astype(np.float32)
        else:
            seg = A.decode(f, channels=1)[:, 0]
        a = int(start * SR); voice[a:a + len(seg)] += seg[: len(voice) - a]
    voice = norm(voice, -3)
    A.write_audio(d / "voice.wav", st(voice))
    vf = ("color=c=0x3a2a20:s=540x960:r=30:d=12[b];[b]drawbox=x='100+40*sin(t)':y=200:w=340:h=420:c=0x9a7a66:t=fill,"
          "drawbox=x=0:y=0:w=540:h=960:c=0x05070d:t=fill:enable='between(t,7.5,9.5)',"
          "drawbox=x='40+(t-7.5)*900':y=600:w=200:h=40:c=0x2f6bff:t=fill:enable='between(t,7.5,8.0)'[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "nullsrc=s=540x960:r=30:d=12", "-i", str(d / "voice.wav"),
                    "-filter_complex", vf, "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k",
                    "-t", "12", str(d / "talking.mp4")], check=True)
    return d / "talking.mp4"


def run(cmd, env, expect=0):
    r = subprocess.run([sys.executable, *cmd], env=env, capture_output=True, text=True)
    ok = (r.returncode == 0) if expect == 0 else (r.returncode != 0)
    print(("  ok   " if ok else "  FAIL ") + " ".join(Path(c).name if i == 0 else c for i, c in enumerate(cmd))[:150])
    if not ok:
        print(r.stdout[-2500:], r.stderr[-2500:])
        raise SystemExit("self-test failed")
    return r


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--keep")
    a = ap.parse_args()
    d = Path(a.keep) if a.keep else Path(tempfile.mkdtemp(prefix="vv_sound_selftest_"))
    if a.keep and d.exists(): shutil.rmtree(d)
    d.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, VV_SOUNDS_JSON=str(d / "sounds.json"), VV_SOUND_DOC=str(d / "sound-library-index.md"))
    print("self-test dir:", d)
    lib = d / "SYNTHETIC_TEST_LIBRARY"
    fx = fixtures(lib)
    video = test_video(d)
    print("1. index the synthetic library")
    run([str(HERE / "sfx_index.py"), "scan", str(lib)], env)
    idx = json.loads((d / "sounds.json").read_text())
    by = {s["rel"]: s for s in idx["sounds"]}
    expect = {"Whooshes/Hollow whoosh/hollow whoosh 1.wav": "WSH", "Risers/Sharp bass riser 1.wav": "RIS", "Risers/Metallic riser 1.wav": "RIS",
              "Hits/Impact hit 1.wav": "HIT", "Textures/Pop/pop 1.wav": "POP", "UI/ui click 1.wav": "UI", "Sci-fi/sci-fi impact 1.wav": "SCI",
              "Gears/tiny gearwheel 1.wav": "MEC", "Ambience/room tone.wav": "ENV"}
    for rel, cat in expect.items():
        got = by[rel]["category"]
        print(f"  {'ok  ' if got == cat else 'FAIL'} {rel} -> {got} (role {by[rel].get('role')})")
        if got != cat: raise SystemExit("categorisation failed")
    ids = {rel: by[rel]["id"] for rel in by}
    hollow = [ids[f"Whooshes/Hollow whoosh/hollow whoosh {i}.wav"] for i in (1, 2, 3)]
    print("2. audition the whoosh variations")
    run([str(HERE / "sfx_audition.py"), "--ids", *hollow, "--fit-duration", "0.5", "--out", str(d / "audition.png")], env)
    print("3. footage analysis")
    run([str(HERE / "video_events.py"), str(video), "--out", str(d / "events.json")], env)
    ev = json.loads((d / "events.json").read_text())
    cut = min((c["t"] for c in ev["cuts"]), key=lambda t: abs(t - 7.5))
    print(f"  cut detected at {cut:.3f}s (expected 7.500); speech regions {ev['speech']}")
    assert abs(cut - 7.5) < 0.05, "cut not detected"
    print("4. render a cue sheet that follows Joseph's rules")
    cues = {"video": str(video), "hook_end": 3.0, "fullscreen_windows": [[7.5, 9.5]], "dialogue": {"file": str(video), "gain_db": 0},
            "music": {"file": str(fx["music"]), "gain_db": -19, "fade": 0.4}, "mix": {"ceiling_dbfs": -1.0},
            "cues": [
                {"id": "W01", "pass": 1, "family": "whoosh", "t": 7.7, "sound": hollow[0], "gain_db": -12, "auditioned": hollow, "event": "bar slides in (fastest frame)", "link": {"event_t": 7.7, "what": "bar slide"}},
                {"id": "T01", "pass": 2, "family": "texture", "t": 2.8, "sound": ids["Textures/Pop/pop 1.wav"], "gain_db": -7, "event": "caption key word pops"},
                {"id": "T02", "pass": 2, "family": "texture", "t": 7.5, "sound": ids["Sci-fi/sci-fi impact 1.wav"], "gain_db": -6, "event": "full-screen entry", "link": {"event_t": 7.5, "what": "cut"}},
                {"id": "T03", "pass": 2, "family": "texture", "times": [8.0, 8.1, 8.2], "sound": ids["Gears/tiny gearwheel 1.wav"], "gain_db": -7, "event": "cells tick"},
                {"id": "R01", "pass": 3, "family": "riser", "subtype": "sharp-bass", "t": 3.6, "sound": ids["Risers/Sharp bass riser 1.wav"], "gain_db": -5, "event": "hook -> body", "auditioned": [ids["Risers/Sharp bass riser 1.wav"], ids["Risers/Metallic riser 1.wav"]]},
                {"id": "H01", "pass": 3, "family": "hit", "t": 3.6, "sound": ids["Hits/Impact hit 1.wav"], "gain_db": -6, "event": "under R01"},
                {"id": "R02", "pass": 3, "family": "riser", "subtype": "metallic", "t": 7.5, "sound": ids["Risers/Metallic riser 1.wav"], "gain_db": -5, "trim": [0.8, None], "fade_in": 0.05, "event": "into full-screen (head trimmed so the build starts after the speaker finishes)", "link": {"event_t": 7.5, "what": "cut"}, "auditioned": [ids["Risers/Metallic riser 1.wav"], ids["Risers/Sharp bass riser 1.wav"]]},
                {"id": "H02", "pass": 3, "family": "hit", "t": 7.5, "sound": ids["Hits/Impact hit 1.wav"], "gain_db": -6, "event": "under R02"},
            ]}
    (d / "cues.json").write_text(json.dumps(cues, indent=1))
    run([str(HERE / "sound_mix.py"), str(d / "cues.json"), "--out", str(d / "render_ok")], env)
    r = run([str(HERE / "sound_qc.py"), str(d / "render_ok"), "--events", str(d / "events.json")], env)
    print("   " + r.stdout.strip().splitlines()[-1])
    print("5. negative tests: QC must FAIL on rule violations")
    bad = json.loads(json.dumps(cues))
    bad["cues"][0]["gain_db"] = -4                       # whoosh far too loud
    bad["cues"][1]["t"] = 1.5; bad["cues"][1]["gain_db"] = 6; bad["cues"][1]["gain_override_reason"] = None   # pop over the voice
    bad["cues"][2]["link"]["event_t"] = 7.6              # sound 3 frames off its visual event
    (d / "cues_bad.json").write_text(json.dumps(bad, indent=1))
    run([str(HERE / "sound_mix.py"), str(d / "cues_bad.json"), "--out", str(d / "render_bad")], env)
    r = run([str(HERE / "sound_qc.py"), str(d / "render_bad")], env, expect=1)
    rep = json.loads((d / "render_bad" / "qc_report.json").read_text())
    errs = {x["area"] for x in rep if x["level"] == "ERROR"}
    for area in ("levels", "sync", "dialogue"):
        print(f"  {'ok  ' if area in errs else 'FAIL'} QC flagged {area}")
        if area not in errs: raise SystemExit("negative test not caught")
    print("6. clip protection pulls the hit, never the voice")
    hot = json.loads(json.dumps(cues)); hot["cues"][5]["gain_db"] = 12; hot["cues"][5]["gain_override_reason"] = "stress test"
    (d / "cues_hot.json").write_text(json.dumps(hot, indent=1))
    r = run([str(HERE / "sound_mix.py"), str(d / "cues_hot.json"), "--out", str(d / "render_hot")], env)
    ses = json.loads((d / "render_hot" / "session.json").read_text())
    pulled = [p for p in ses["placements"] if p.get("auto_pulled_db")]
    print(f"  {'ok  ' if pulled and all(p['family'] == 'hit' for p in pulled) else 'FAIL'} auto-fixes: {ses['auto_fixes'][:2]}")
    if not pulled: raise SystemExit("clip protection did not act")
    run([str(HERE / "sound_qc.py"), str(d / "render_hot")], env)   # must pass clipping (hit pulled) with only warnings
    if not a.keep:
        shutil.rmtree(d, ignore_errors=True)
    print("SELF-TEST PASSED" + (f" (outputs kept in {d})" if a.keep else " (temp folder removed)"))


if __name__ == "__main__":
    main()
