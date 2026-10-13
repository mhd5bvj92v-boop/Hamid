#!/usr/bin/env python3
"""Render and export steps of the Remotion talking-head workflow.

  python3 scripts/edit_render.py sfx <slug>                    # beat timeline + sound intents -> work/<slug>/sound/
  python3 scripts/edit_render.py still <slug> --t 3.2 [--graphics]   # one frame -> work/<slug>/qc/still_3.200.png
  python3 scripts/edit_render.py picture <slug> [--graphics] [--scale 2]
                                                               # full picture -> work/<slug>/renders/picture.mp4
  python3 scripts/edit_render.py sound-preview <slug> --session work/<slug>/sound/final_v1/session.json
                                                               # Studio preview of the mixed sound design

picture: Remotion renders the composition Edit-<slug> as H.264 (yuv420p, BT.709, CRF 18) at the
approved frame rate, with the source dialogue as its audio. The FINAL deliverable is made by
scripts/sound_mix.py from this picture (picture stream copied untouched + the System D mix built from
the untouched source dialogue), then checked by sound_qc.py and edit_qc.py.
--graphics renders the beats over black (no footage) for review or motion measurement.
--scale N renders a master at N x 1080x1920 (e.g. 2 for a 2160x3840 source); deliver with
`edit_render.py downscale` only after QC.
"""
import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vedit as V  # noqa: E402

H264 = ["--codec=h264", "--pixel-format=yuv420p", "--color-space=bt709", "--crf=18", "--audio-codec=aac", "--image-format=jpeg"]


def npx(app, args, log, env=None):
    return V.run(["npx", "--no-install", *args], cwd=app, env=env or V.browser_env(app), log=log)


def cmd_sfx(app, pj, a):
    wd = Path(pj["work"])
    out = wd / "sound"
    r = npx(app, ["tsx", "scripts/export-sfx.ts", pj["slug"], str(out)], wd / "qc" / "export-sfx.log", env=dict(os.environ))
    print(r.stdout.strip())
    # reference IDs must exist in the library
    refs = {x["id"] for x in json.loads((V.SKILL_ROOT / "data" / "references.json").read_text())["references"]}
    tl = json.loads((out / "timeline.json").read_text())
    bad = [(b["id"], x) for b in tl["beats"] for x in b["refs"] if x not in refs]
    for bid, x in bad:
        print(f"ERROR beat {bid}: unknown reference {x}")
    plan = json.loads((out / "plan.json").read_text())
    plan["video"] = str(wd / "renders" / "picture.mp4")
    plan["dialogue"] = {"file": pj["source"]["path"], "gain_db": 0}   # the untouched original dialogue, never the render
    ev = out / "video_events.json"
    if ev.exists():
        plan["events"] = "video_events.json"
    (out / "plan.json").write_text(json.dumps(plan, indent=1))
    print(f"plan    {out / 'plan.json'} (video = renders/picture.mp4). Next: python3 scripts/sfx_plan.py {out / 'plan.json'} --out {out / 'cues.json'}")
    if bad:
        sys.exit(1)


def cmd_still(app, pj, a):
    wd = Path(pj["work"])
    fps = pj["approved"]["fps"]
    frame = min(int(round(a.t * fps)), pj["approved"]["durationInFrames"] - 1)
    out = Path(a.out) if a.out else wd / "qc" / f"still{'_gfx' if a.graphics else ''}_{a.t:.3f}.png"
    props = json.dumps({"layers": "graphics" if a.graphics else "all"})
    npx(app, ["remotion", "still", pj["remotion"]["composition"], str(out), f"--frame={frame}", f"--props={props}", "--image-format=png"],
        wd / "qc" / "still.log")
    print(f"still   {out} (frame {frame} @ {fps} fps)")


def cmd_picture(app, pj, a):
    wd = Path(pj["work"])
    name = "picture_graphics.mp4" if a.graphics else ("picture_master.mp4" if a.scale and a.scale != 1 else "picture.mp4")
    out = Path(a.out) if a.out else wd / "renders" / name
    props = json.dumps({"layers": "graphics" if a.graphics else "all"})
    args = ["remotion", "render", pj["remotion"]["composition"], str(out), *H264, f"--props={props}", "--log=verbose"]
    if a.scale and a.scale != 1:
        args.append(f"--scale={a.scale}")
    if a.frames:
        args.append(f"--frames={a.frames}")
    log = wd / "renders" / (out.stem + ".log")
    npx(app, args, log)
    info = V.probe(out)
    print(f"picture {out}  {info['width']}x{info['height']} r={info['r_frame_rate']} {info['duration']:.3f}s "
          f"nb_frames={info['nb_frames']} (log: {log})")


def cmd_downscale(app, pj, a):
    wd = Path(pj["work"])
    src = Path(a.input) if a.input else wd / "renders" / "picture_master.mp4"
    out = wd / "renders" / "picture.mp4"
    V.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", "scale=1080:1920:flags=lanczos", "-c:v", "libx264", "-crf", "18",
           "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
           "-c:a", "copy", "-movflags", "+faststart", str(out)])
    print(f"picture {out} (lanczos downscale of {src.name})")


def cmd_sound_preview(app, pj, a):
    session = json.loads(Path(a.session).read_text())
    cues_path = session.get("cue_sheet")
    cues = json.loads(Path(cues_path).read_text()) if cues_path and Path(cues_path).exists() else {}
    slug = pj["slug"]
    sfx_dir = app / "public" / "projects" / slug / "sfx"
    sfx_dir.mkdir(parents=True, exist_ok=True)
    linked = {}

    folders = {}

    def link(path):
        # Remotion serves files inside symlinked folders (not symlinked files): link each library folder once
        p = Path(path).resolve()
        if str(p.parent) not in folders:
            name = f"{len(folders):03d}"
            dst = sfx_dir / name
            if dst.is_symlink() or dst.exists():
                dst.unlink()
            os.symlink(p.parent, dst, target_is_directory=True)
            folders[str(p.parent)] = name
        linked[str(p)] = f"projects/{slug}/sfx/{folders[str(p.parent)]}/{p.name}"
        return linked[str(p)]

    placements = []
    for p in session["placements"]:
        trim = p.get("trim") or [0, None]
        head = max(0.0, -p["start"])
        placements.append({"id": p["id"], "family": p["family"], "src": link(p["file"]), "at": round(max(0.0, p["start"]), 5),
                           "clipIn": round(float(trim[0] or 0) + head, 5), "clipOut": trim[1], "gainDb": p["gain_db"]})
    music = None
    if session.get("music") and cues.get("music"):
        m = cues["music"]
        mp = Path(m["file"]) if Path(m["file"]).is_absolute() else (Path(cues_path).parent / m["file"]).resolve()
        music = {"src": link(mp), "gainDb": m.get("gain_db", -19),
                 "silentWindows": cues.get("fullscreen_windows", []) + cues.get("graphic_windows", [])}
    data = {"generatedFrom": str(a.session), "placements": placements, "music": music}
    ts = ("// GENERATED by edit_render.py sound-preview from the mixer's session.json (Studio preview only).\n"
          'import type { SoundPreviewData } from "../../kit/SoundPreview";\n\n'
          f"export const SOUND_PREVIEW: SoundPreviewData | null = {json.dumps(data, indent=1)};\n")
    (app / "src" / "projects" / slug / "sound-preview.ts").write_text(ts)
    print(f"sound preview: {len(placements)} placements{' + music' if music else ''} -> src/projects/{slug}/sound-preview.ts "
          f"(files linked under public/projects/{slug}/sfx/)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["sfx", "still", "picture", "downscale", "sound-preview"])
    ap.add_argument("slug")
    ap.add_argument("--app"); ap.add_argument("--work")
    ap.add_argument("--t", type=float, default=0.0); ap.add_argument("--out")
    ap.add_argument("--graphics", action="store_true"); ap.add_argument("--scale", type=float)
    ap.add_argument("--frames", help="render only a frame range, e.g. 0-89 (previews)")
    ap.add_argument("--session"); ap.add_argument("--input")
    a = ap.parse_args()
    app = V.find_app(a.app)
    pj = V.load_project(app, a.slug, a.work)
    st = Path(pj["source"]["path"]).stat()     # fast check here; edit_qc.py verifies the full sha256
    if st.st_size != pj["source"]["size"] or st.st_mtime_ns != pj["source"].get("mtime_ns", st.st_mtime_ns):
        sys.exit("STOP: the original footage changed since edit_init (size/mtime differ). It must stay untouched.")
    {"sfx": cmd_sfx, "still": cmd_still, "picture": cmd_picture, "downscale": cmd_downscale, "sound-preview": cmd_sound_preview}[a.cmd](app, pj, a)


if __name__ == "__main__":
    main()
