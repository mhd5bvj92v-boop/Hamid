#!/usr/bin/env python3
"""End-to-end self-test of the default talking-head workflow (Remotion + System D) on SYNTHETIC media.

  python3 scripts/edit_selftest.py [--keep]

1. makes an 8 s synthetic "already-cut" clip (1080x1920 @ 30 fps, moving test pattern, TTS dialogue);
2. edit_init.py -> Remotion project "selftest" (footage linked, never copied or modified);
3. writes a beat list with one beat per system (B caption TXT-001, A stat card ONS-024, C horizon FUL-002);
4. edit_render.py sfx (timeline + measured sound intents) -> sfx_plan.py -> cue sheet;
5. assigns SYNTHETIC test sounds (sound_selftest fixtures, temp library; never a deliverable);
6. edit_render.py picture (Remotion) -> sound_mix.py (final.mp4) -> sound_qc.py and edit_qc.py must pass;
7. edit_render.py sound-preview + tsc: the Studio preview compiles;
8. negative tests: a trimmed head, a sped-up copy, shifted audio and a cut in the middle must FAIL edit_qc;
9. the original synthetic footage is byte-identical at the end.
Without --keep, the temp folder and the Remotion project are removed afterwards.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import vedit as V  # noqa: E402
import sound_selftest as SST  # noqa: E402

SLUG = "selftest"
BEATS = """// SELF-TEST beat list (synthetic footage). Also a worked example of the three systems.
import type { KitBeat } from "../../kit/timing";
import type { FocusWindow } from "../../kit/SourceFootage";

export const HOOK_END: number | null = 2.4;

export const BEATS: KitBeat[] = [
  {
    id: "b01-hook",
    kind: "CaptionAccent",
    at: 0.4,
    reason: "Hook question: the phrase itself is the point (System B)",
    refs: ["TXT-001", "TXT-004"],
    props: {
      lines: [
        { text: "What's the", style: "sans", at: 0.1 },
        { text: "big picture", style: "serif", at: 0.5 },
        { text: "here?", style: "sans-sm", at: 0.95 },
      ],
      outAt: 1.6,
    },
  },
  {
    id: "b02-stat",
    kind: "StatCard",
    at: 2.6,
    reason: "Speaker says 'we posted every day': a stat card makes the 30 concrete while he stays visible (System A)",
    refs: ["ONS-024", "ONS-050"],
    props: { label: "Posts in one month", value: 30, header: "Last 30 days", pill: "Daily", footnote: "One post every day", outAt: 2.0, drawDur: 0.9, countAt: 0.7, countDur: 0.9 },
  },
  {
    id: "b03-horizon",
    kind: "HorizonTitle",
    at: 5.2,
    reason: "Payoff line: the number deserves the whole frame for a moment (System C); dialogue keeps running underneath",
    refs: ["FUL-002"],
    props: { kicker: "Every single day", value: 30, body: "Posts in one month", outAt: 1.9, riseDur: 1.2, numDur: 1.2, bodyAt: 1.1, numAt: 0.4 },
  },
];

export const FOCUS: FocusWindow[] = [{ start: 2.6, end: 5.0, brightness: 0.7, blur: 4 }];
"""


def say(msg):
    print(msg, flush=True)


def step(cmd, env=None, cwd=None, expect=0):
    r = subprocess.run(cmd, env=env, cwd=cwd, capture_output=True, text=True)
    ok = (r.returncode == 0) if expect == 0 else (r.returncode != 0)
    say(("  ok   " if ok else "  FAIL ") + " ".join(Path(c).name if i < 2 else c for i, c in enumerate(cmd))[:160])
    if not ok:
        say(r.stdout[-3000:] + r.stderr[-3000:])
        raise SystemExit("EDIT SELF-TEST FAILED")
    return r


def footage(d):
    sr = 48000
    import numpy as np
    voice = np.zeros(int(8 * sr), np.float32)
    for start, text in [(0.4, "What is the big picture here"), (2.7, "We posted every day"), (5.7, "And that changed everything for us")]:
        f = d / f"v{int(start * 10)}.wav"
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"flite=text='{text}'", "-ar", str(sr), "-ac", "1", str(f)])
        if r.returncode:
            tt = np.arange(int(1.8 * sr)) / sr
            seg = (np.sin(2 * np.pi * 170 * tt) * (np.sin(2 * np.pi * 3 * tt) > 0)).astype(np.float32)
        else:
            seg = SST.A.decode(f, channels=1)[:, 0]
        a = int(start * sr)
        voice[a:a + len(seg)] += seg[: len(voice) - a]
    voice = SST.norm(voice, -3)
    SST.A.write_audio(d / "voice.wav", SST.st(voice))
    font = subprocess.run(["fc-match", "-f", "%{file}", "DejaVu Sans Mono"], capture_output=True, text=True).stdout.strip()
    txt = f",drawtext=fontfile={font}:text='SYNTHETIC TEST  %{{frame_num}}':x=60:y=1700:fontsize=48:fontcolor=white@0.7" if font else ""
    vf = ("[0:v]drawbox=x='200+260*abs(sin(t*1.7))':y=380:w=420:h=560:c=0x9a7a66:t=fill,"   # moving 'speaker' block (face zone)
          "drawbox=x=0:y='1100+300*abs(sin(t*2.3))':w=1080:h=60:c=0x6a5040:t=fill" + txt + ",format=yuv420p[v]")
    out = d / "my-cut.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "gradients=s=1080x1920:r=30:d=8:c0=0x3a2a20:c1=0x1d1712:speed=0.02",
                    "-i", str(d / "voice.wav"), "-filter_complex", vf, "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-crf", "16",
                    "-r", "30", "-c:a", "aac", "-b:a", "256k", "-t", "8", str(out)], check=True)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--keep", action="store_true"); ap.add_argument("--app")
    a = ap.parse_args()
    app = V.find_app(a.app)
    d = Path(tempfile.mkdtemp(prefix="ve_edit_selftest_"))
    work = d / "work"
    env = dict(os.environ, VV_SOUNDS_JSON=str(d / "sounds.json"), VV_SOUND_DOC=str(d / "sound-library-index.md"), VE_WORK=str(work))
    py = sys.executable
    say(f"self-test dir: {d}")
    try:
        say("1. synthetic already-cut footage")
        src = footage(d)
        sha0 = V.sha256(src)
        say(f"  ok   {src.name}: 1080x1920 @ 30 fps, 8.0 s, TTS dialogue (sha256 {sha0[:12]}...)")

        say("2. intake (edit_init.py)")
        step([py, str(HERE / "edit_init.py"), str(src), "--slug", SLUG, "--app", str(app)], env)
        pj = json.loads((work / SLUG / "project.json").read_text())
        assert pj["approved"]["durationInFrames"] == 240 and pj["approved"]["fps"] == 30, pj["approved"]
        link = app / "public" / "projects" / SLUG / "footage"
        assert link.is_symlink() and (link / src.name).resolve() == src.resolve(), "footage must be linked, not copied"
        say("  ok   240 frames @ 30 fps approved; footage folder linked into public/ (no copy)")

        say("3. beat list (one beat per system)")
        (app / "src" / "projects" / SLUG / "beats.ts").write_text(BEATS)

        say("4. timeline + measured sound intents -> draft cue sheet")
        step([py, str(HERE / "edit_render.py"), "sfx", SLUG, "--app", str(app)], env)
        lib = d / "SYNTHETIC_TEST_LIBRARY"
        SST.fixtures(lib)
        step([py, str(HERE / "sfx_index.py"), "scan", str(lib)], env)
        snd = work / SLUG / "sound"
        step([py, str(HERE / "sfx_plan.py"), str(snd / "plan.json"), "--out", str(snd / "cues.json")], env)
        cues = json.loads((snd / "cues.json").read_text())
        assert Path(cues["dialogue"]["file"]) == src.resolve(), "dialogue must come from the original footage"
        tl = json.loads((snd / "timeline.json").read_text())
        assert tl["fullscreen_windows"] and abs(tl["fullscreen_windows"][0][0] - 5.2) < 1e-6, tl["fullscreen_windows"]

        say("5. assign SYNTHETIC test sounds (selftest only)")
        idx = json.loads((d / "sounds.json").read_text())["sounds"]
        by_cat = {}
        for s in idx:
            by_cat.setdefault(s["category"], []).append(s["id"])
        fam_cat = {"whoosh": ["WSH"], "riser": ["RIS"], "hit": ["HIT"], "texture": ["POP", "UI", "SCI", "MEC"]}
        placed = 0
        for c in cues["cues"]:
            if c.get("status") != "proposed":
                continue
            ids = c.get("candidates") or [i for cat in fam_cat.get(c["family"], []) for i in by_cat.get(cat, [])]
            if not ids or c["family"] == "env":
                c["status"] = "rejected"; c["reason"] = "selftest: no fixture"; continue
            c["sound"] = ids[0]; c["auditioned"] = ids[:3]; placed += 1
            if c["family"] == "riser":
                s = next(s for s in idx if s["id"] == ids[0])
                c["subtype"] = (s.get("role") or "").replace("-riser", "") or None
                # documented fix (sound-design.md §5): trim the riser's head so the build starts after the words
                c["trim"] = [round(max(0.0, s["metrics"]["duration"] - 0.4), 3), None]
                c["fade_in"] = 0.05
        (snd / "cues.json").write_text(json.dumps(cues, indent=1))
        say(f"  ok   {placed} cues placed with synthetic fixtures")

        say("6. picture (Remotion) -> mix + final (sound_mix) -> QC")
        step([py, str(HERE / "edit_render.py"), "picture", SLUG, "--app", str(app)], env)
        step([py, str(HERE / "video_events.py"), str(work / SLUG / "renders" / "picture.mp4"), "--out", str(snd / "video_events.json")], env)
        step([py, str(HERE / "sound_mix.py"), str(snd / "cues.json"), "--out", str(snd / "final_v1"), "--passes", "1,2,3", "--no-music"], env)
        r = step([py, str(HERE / "sound_qc.py"), str(snd / "final_v1")], env)
        say("   sound_qc: " + r.stdout.strip().splitlines()[-1])
        final = snd / "final_v1" / "final.mp4"
        r = step([py, str(HERE / "edit_qc.py"), SLUG, "--final", str(final), "--app", str(app)], env)
        say("   edit_qc: " + r.stdout.strip().splitlines()[-1])

        say("7. Studio sound preview compiles")
        step([py, str(HERE / "edit_render.py"), "sound-preview", SLUG, "--session", str(snd / "final_v1" / "session.json"), "--app", str(app)], env)
        step(["npx", "--no-install", "tsc", "--noEmit", "-p", "."], cwd=app)

        say("8. negative tests: edit_qc must FAIL when the timeline is not preserved")
        bad = d / "bad"
        bad.mkdir()
        enc = ["-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
               "-color_range", "tv", "-r", "30", "-c:a", "aac", "-ar", "48000"]
        variants = {
            "trimmed-head": ["-ss", "0.5", "-i", str(final), *enc],
            "sped-up": ["-i", str(final), "-filter_complex", "[0:v]setpts=PTS/1.04[v];[0:a]atempo=1.04[a]", "-map", "[v]", "-map", "[a]", *enc],
            "audio-shifted": ["-i", str(final), "-af", "adelay=80:all=1", "-t", "8", *enc],
            "cut-in-middle": ["-i", str(final), "-filter_complex",
                              "[0:v]select='not(between(t,2.4,2.9))',setpts=N/30/TB[v];[0:a]aselect='not(between(t,2.4,2.9))',asetpts=N/SR/TB[a]",
                              "-map", "[v]", "-map", "[a]", *enc],
        }
        for name, args in variants.items():
            out = bad / f"{name}.mp4"
            subprocess.run(["ffmpeg", "-v", "error", "-y", *args, str(out)], check=True)
            r = step([py, str(HERE / "edit_qc.py"), SLUG, "--final", str(out), "--app", str(app)], env, expect=1)
            errs = sorted({x["area"] for x in json.loads((bad / "edit_qc_report.json").read_text())["results"] if x["level"] == "ERROR"})
            say(f"       {name}: rejected ({', '.join(errs)})")

        say("9. original footage untouched")
        same = V.sha256(src) == sha0
        say(f"  {'ok  ' if same else 'FAIL'} sha256 identical after the whole run")
        if not same:
            raise SystemExit("EDIT SELF-TEST FAILED")
        say("EDIT SELF-TEST PASSED" + (f" (kept: {d}, Remotion project src/projects/{SLUG}/)" if a.keep else ""))
    finally:
        if not a.keep:
            subprocess.run([py, str(HERE / "edit_init.py"), "--slug", SLUG, "--remove", "--app", str(app)], env=env, capture_output=True)
            shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    main()
