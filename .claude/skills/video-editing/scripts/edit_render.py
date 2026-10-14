#!/usr/bin/env python3
"""Render and export steps of the Remotion talking-head workflow (Creative Director phases 3-5).

  python3 scripts/edit_render.py sfx <slug>                    # beat + concept timeline, sound intents -> work/<slug>/sound/
  python3 scripts/edit_render.py still <slug> --t 3.2 [--graphics] [--concept S03:A]
  python3 scripts/edit_render.py concept-frames <slug> --moment S03 [--options A,B,C] [--sequence]
                                                               # Phase 3: real preview frames of the proposed concepts
  python3 scripts/edit_render.py draft-sound <slug>            # Phase 4: draft mix of cues.json (original as picture) + Studio preview
  python3 scripts/edit_render.py preview <slug> --beat b03 | --concept S03:B | --all [--scale 0.5] [--handles 0.6]
                                                               # Phase 4: short half-resolution motion previews (with draft sound)
  python3 scripts/edit_render.py final <slug> [--session work/<slug>/sound/draft_v2/session.json]
                                                               # Phase 5 ONLY: THE deliverable, rendered by Remotion: footage
                                                               # (dialogue at unity) + all layers + sound effects + music, then edit_qc
  python3 scripts/edit_render.py picture <slug> [--scale 2]    # Phase 5: full-resolution picture (+ dialogue) for analysis / masters
  python3 scripts/edit_render.py picture <slug> --graphics     # beats over black (review / motion measurement)
  python3 scripts/edit_render.py sound-preview <slug> --session work/<slug>/sound/final_v1/session.json

picture is the FINAL render: it refuses to run until the user's explicit final approval is recorded in the
project's creative decision log (edit_decisions.py approve --gate final). Before that, use still,
concept-frames and preview. The final deliverable is made by scripts/sound_mix.py from this picture
(picture stream copied untouched + the System D mix built from the untouched source dialogue), then
checked by sound_qc.py and edit_qc.py. --scale N renders a master at N x 1080x1920 (e.g. 2 for a
2160x3840 source); `edit_render.py downscale` makes the 1080x1920 picture from it.
"""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vedit as V  # noqa: E402

H264 = ["--codec=h264", "--pixel-format=yuv420p", "--color-space=bt709", "--crf=18", "--audio-codec=aac", "--image-format=jpeg"]


def npx(app, args, log, env=None):
    return V.run(["npx", "--no-install", *args], cwd=app, env=env or V.browser_env(app), log=log)


def creative_log(app, slug):
    p = app / "src" / "projects" / slug / "edit.json"      # the single project file (decisions + approvals)
    return json.loads(p.read_text()) if p.exists() else None


def pending_builds(log):
    """Segments whose animation is still waiting for Claude Code (an export would silently miss it)."""
    return [f"{r['segmentId']} ({r['id']} {r['status']})" for r in (log or {}).get("requests", [])
            if r["type"] in ("implement", "revision") and r["status"] in ("pending", "in_progress")]


def require_final_approval(app, pj):
    log = creative_log(app, pj["slug"])
    if pj["source"].get("scriptOnly"):
        sys.exit("script-only project: attach the real cut first (edit_init.py <footage> --slug ...); a final picture needs the footage.")
    if pending_builds(log):
        sys.exit("cannot render the final picture while animations are still waiting for Claude Code: " + ", ".join(pending_builds(log))
                 + "\nProcess them (edit_decisions.py pending) or cancel them first.")
    if not log or not any(x["gate"] == "final" for x in log.get("approvals", [])):
        sys.exit("PHASE 5 GATE: the final full-resolution render needs the Creative Director's explicit final approval.\n"
                 "Show the motion previews (edit_render.py preview), collect feedback, and only after the user approves the edit run:\n"
                 f"  python3 scripts/edit_decisions.py approve {pj['slug']} --gate final --quote \"<the user's words>\"")


def export_timeline(app, pj):
    wd = Path(pj["work"])
    r = npx(app, ["tsx", "scripts/export-sfx.ts", pj["slug"], str(wd / "sound")], wd / "qc" / "export-sfx.log", env=dict(os.environ))
    return json.loads((wd / "sound" / "timeline.json").read_text()), r.stdout.strip()


def bundle(app, pj):
    """Bundle once, render many (each CLI render otherwise re-bundles)."""
    out = Path(pj["work"]) / "renders" / "_bundle"
    npx(app, ["remotion", "bundle", "--out-dir", str(out)], Path(pj["work"]) / "renders" / "bundle.log")
    return str(out)


def parse_concept(s):
    if not s:
        return None
    m, _, o = s.partition(":")
    if o.upper() not in ("A", "B", "C", "D"):
        sys.exit("--concept must look like M03:A")
    return {"moment": m, "option": o.upper()}


def cmd_sfx(app, pj, a):
    wd = Path(pj["work"])
    out = wd / "sound"
    _, msg = export_timeline(app, pj)
    print(msg)
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
    props = json.dumps({"layers": "graphics" if a.graphics else "all", "concept": parse_concept(a.concept)})
    npx(app, ["remotion", "still", pj["remotion"]["composition"], str(out), f"--frame={frame}", f"--props={props}", "--image-format=png"],
        wd / "qc" / "still.log")
    print(f"still   {out} (frame {frame} @ {fps} fps)")


def cmd_picture(app, pj, a):
    if not a.graphics:
        require_final_approval(app, pj)
    wd = Path(pj["work"])
    name = "picture_graphics.mp4" if a.graphics else ("picture_master.mp4" if a.scale and a.scale != 1 else "picture.mp4")
    out = Path(a.out) if a.out else wd / "renders" / name
    props = json.dumps({"layers": "graphics" if a.graphics else "all", "concept": None})
    args = ["remotion", "render", pj["remotion"]["composition"], str(out), *H264, f"--props={props}", "--log=verbose"]
    if a.scale and a.scale != 1:
        args.append(f"--scale={a.scale}")
    log = wd / "renders" / (out.stem + ".log")
    npx(app, args, log)
    info = V.probe(out)
    print(f"picture {out}  {info['width']}x{info['height']} r={info['r_frame_rate']} {info['duration']:.3f}s "
          f"nb_frames={info['nb_frames']} (log: {log})")


def sound_preview_data(app, slug):
    """The sound placements the Remotion composition plays (sound-preview.ts, written by sound-preview / draft-sound)."""
    f = app / "src" / "projects" / slug / "sound-preview.ts"
    txt = f.read_text() if f.exists() else ""
    i = txt.find("SOUND_PREVIEW: SoundPreviewData | null = ")
    if i < 0:
        return None
    body = txt[i + len("SOUND_PREVIEW: SoundPreviewData | null = "):].strip().rstrip(";").strip()
    return None if body == "null" else json.loads(body)


def cmd_final(app, pj, a):
    """Remotion-first: the final MP4 is the Remotion composition itself (footage + every layer + every sound), then QC."""
    require_final_approval(app, pj)
    if a.session:
        cmd_sound_preview(app, pj, a)          # place exactly this session's sounds in the composition
    sp = sound_preview_data(app, pj["slug"])
    wd = Path(pj["work"])
    n = 1 + len(list((wd / "renders").glob("final_v*.mp4")))
    out = Path(a.out) if a.out else wd / "renders" / f"final_v{n}.mp4"
    print(f"final   Remotion render of {pj['remotion']['composition']}: footage + layers + "
          f"{len(sp['placements']) if sp else 0} sound effect(s){' + music' if sp and sp.get('music') else ''} -> {out}")
    if not sp:
        print("NOTE  no sound placements in the composition (sound-preview.ts is empty): the final carries the dialogue only")
    props = json.dumps({"layers": "all", "concept": None})
    args = ["remotion", "render", pj["remotion"]["composition"], str(out), *H264, "--audio-bitrate=320k", f"--props={props}", "--log=verbose"]
    npx(app, args, out.with_suffix(".log"))
    export_timeline(app, pj)                   # graphics windows for the QC
    qc = [sys.executable, str(Path(__file__).with_name("edit_qc.py")), pj["slug"], "--final", str(out)]
    if sp and sp.get("generatedFrom"):
        qc += ["--sfx", sp["generatedFrom"]]
    r = V.run(qc, check=False)
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr)
    if r.returncode:
        sys.exit(f"edit_qc failed on {out} - do not deliver it")
    print(f"final   {out}  (rendered by Remotion; edit_qc passed)")


def cmd_downscale(app, pj, a):
    require_final_approval(app, pj)
    wd = Path(pj["work"])
    src = Path(a.input) if a.input else wd / "renders" / "picture_master.mp4"
    out = wd / "renders" / "picture.mp4"
    V.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", "scale=1080:1920:flags=lanczos", "-c:v", "libx264", "-crf", "18",
           "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
           "-c:a", "copy", "-movflags", "+faststart", str(out)])
    print(f"picture {out} (lanczos downscale of {src.name})")


def cmd_concept_frames(app, pj, a):
    """Phase 3: render the proposed concepts of one moment as real frames over the footage, side by side."""
    from PIL import Image, ImageDraw, ImageFont
    if not a.moment:
        sys.exit("--moment required")
    tl, _ = export_timeline(app, pj)
    rows = [c for c in tl.get("concepts", []) if c["moment"] == a.moment]
    if not rows:
        sys.exit(f"no concepts for {a.moment} in concepts.ts")
    rnd = max(c["round"] for c in rows)
    want = [o.strip().upper() for o in (a.options or "A,B,C,D").split(",")]
    rows = [c for c in rows if c["round"] == rnd and c["option"] in want]
    fps = pj["approved"]["fps"]
    wd = Path(pj["work"])
    outdir = wd / "previews" / f"{a.moment}_r{rnd}"
    outdir.mkdir(parents=True, exist_ok=True)
    serve = bundle(app, pj)
    log = creative_log(app, pj["slug"]) or {"segments": []}
    titles = {}
    for m in log.get("segments", []):
        if m["id"] == a.moment:
            titles = {k: v.get("title", "") for k, v in (m.get("concepts") or {}).items()}
    tiles = []
    for c in sorted(rows, key=lambda c: c["option"]):
        n = c["endFrame"] - c["startFrame"]
        landed = c["endFrame"] - max(2, int(round(0.65 * fps)))      # settled, just before the exit starts
        keys = ([min(c["startFrame"] + int(round(0.3 * fps)), landed), c["startFrame"] + n // 2, landed] if a.sequence else [landed])
        props = json.dumps({"layers": "all", "concept": {"moment": c["moment"], "option": c["option"], "round": rnd}})
        seq = outdir / c["option"]
        if seq.exists():
            shutil.rmtree(seq)
        npx(app, ["remotion", "render", serve, pj["remotion"]["composition"], str(seq), f"--frames={','.join(map(str, keys))}",
                  "--sequence", "--image-format=png", f"--props={props}", "--scale=0.5"], outdir / f"{c['option']}.log")
        frames = sorted(seq.glob("*.png"))
        tiles.append((c, [Image.open(f).convert("RGB") for f in frames], keys))
    # contact sheet: one column per option (rows = key frames)
    w, h = tiles[0][1][0].size
    nrow = max(len(f) for _, f, _ in tiles)
    pad, head = 16, 64
    sheet = Image.new("RGB", (len(tiles) * (w + pad) + pad, head + nrow * (h + pad) + pad), (12, 13, 17))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 22)
        small = ImageFont.truetype("DejaVuSans.ttf", 16)
    except OSError:
        font = small = ImageFont.load_default()
    for i, (c, frames, keys) in enumerate(tiles):
        x = pad + i * (w + pad)
        d.text((x, 12), f"{c['option']} - {titles.get(c['option'], c['kind'])}"[:34], fill=(255, 255, 255), font=font)
        sysname = {"A": "on-screen", "B": "text", "C": "full-screen"}.get(c["system"], c["system"])
        d.text((x, 40), f"{', '.join(c['refs'])}  ·  {'full-screen' if c['fullscreen'] else sysname}"[:44], fill=(170, 175, 190), font=small)
        for j, (im, k) in enumerate(zip(frames, keys)):
            y = head + j * (h + pad)
            sheet.paste(im, (x, y))
            d.text((x + 8, y + h - 26), f"{k / fps:.2f}s", fill=(255, 255, 255), font=small)
    out = wd / "previews" / f"{a.moment}_r{rnd}_concepts.png"
    sheet.save(out)
    # remember the preview in the creative log
    if V.doc_path(app, pj["slug"]).exists():
        lg = V.load_doc(app, pj["slug"])
        for m in lg.get("segments", []):
            if m["id"] == a.moment and m.get("concepts"):
                for c, _, _ in tiles:
                    if c["option"] in m["concepts"]:
                        m["concepts"][c["option"]]["preview"] = str(out)
        V.save_doc(app, pj["slug"], lg)
    print(f"concepts {a.moment} round {rnd}: {', '.join(c['option'] for c, _, _ in tiles)} -> {out}")


def cmd_draft_sound(app, pj, a):
    """Phase 4: a draft mix of the current cue sheet for the motion previews (never a deliverable)."""
    wd = Path(pj["work"])
    cues_path = Path(a.cues) if a.cues else wd / "sound" / "cues.json"
    if not cues_path.exists():
        sys.exit(f"{cues_path} missing: run edit_render.py sfx, then sfx_plan.py, then choose the sounds (passes 1-3)")
    cues = json.loads(cues_path.read_text())
    cues["video"] = pj["source"]["path"]          # same timeline as the edit; the draft never needs the final picture
    cues["dialogue"] = {"file": pj["source"]["path"], "gain_db": 0}
    draft = wd / "sound" / "cues_draft.json"
    draft.write_text(json.dumps(cues, indent=1))
    n = 1 + max([int(p.name.split("_v")[-1]) for p in (wd / "sound").glob("draft_v*") if p.name.split("_v")[-1].isdigit()] or [0])
    out = wd / "sound" / f"draft_v{n}"
    V.run([sys.executable, str(Path(__file__).with_name("sound_mix.py")), str(draft), "--out", str(out), "--passes", a.passes or "1,2,3", "--no-music"],
          log=out.parent / f"draft_v{n}.log")
    (out / "final.mp4").unlink(missing_ok=True)   # a draft is not an export
    a.session = str(out / "session.json")
    cmd_sound_preview(app, pj, a)
    print(f"draft sound v{n}: {out} (stems + mix; previews now include it)")


def cmd_preview(app, pj, a):
    """Phase 4: short motion previews at reduced resolution (dialogue + draft sound), never the final export."""
    wd = Path(pj["work"])
    fps = pj["approved"]["fps"]
    total = pj["approved"]["durationInFrames"]
    concept = parse_concept(a.concept)
    if a.all:
        f0, f1, name = 0, total - 1, "full_edit"
    else:
        tl, _ = export_timeline(app, pj)
        if concept:
            rows = [c for c in tl.get("concepts", []) if c["moment"] == concept["moment"] and c["option"] == concept["option"]]
            if not rows:
                sys.exit(f"no concept {a.concept}")
            rnd = max(c["round"] for c in rows)
            row = [c for c in rows if c["round"] == rnd][0]
            concept["round"] = rnd
            name = f"{concept['moment']}{concept['option']}_r{rnd}"
        else:
            rows = [b for b in tl["beats"] if b["id"] == a.beat]
            if not rows:
                sys.exit(f"no beat {a.beat} in beats.ts")
            row, name = rows[0], a.beat
        h = int(round((a.handles if a.handles is not None else 0.6) * fps))
        f0, f1 = max(0, row["startFrame"] - h), min(total - 1, row["endFrame"] + h)
    n = 1 + len(list((wd / "previews").glob(f"{name}_v*.mp4")))
    out = wd / "previews" / f"{name}_v{n}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    props = json.dumps({"layers": "all", "concept": concept})
    npx(app, ["remotion", "render", pj["remotion"]["composition"], str(out), *H264, f"--props={props}", f"--frames={f0}-{f1}",
              f"--scale={a.scale or 0.5}"], out.with_suffix(".log"))
    info = V.probe(out)
    print(f"preview {out}  {info['width']}x{info['height']}  {f0 / fps:.2f}-{(f1 + 1) / fps:.2f}s of the timeline "
          f"({info['duration']:.2f}s, {'with audio' if info['audio'] else 'no audio'})")


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
    ap.add_argument("cmd", choices=["sfx", "still", "concept-frames", "draft-sound", "preview", "picture", "final", "downscale", "sound-preview"])
    ap.add_argument("slug")
    ap.add_argument("--app"); ap.add_argument("--work")
    ap.add_argument("--t", type=float, default=0.0); ap.add_argument("--out")
    ap.add_argument("--graphics", action="store_true"); ap.add_argument("--scale", type=float)
    ap.add_argument("--session"); ap.add_argument("--input"); ap.add_argument("--cues"); ap.add_argument("--passes")
    ap.add_argument("--concept", help="M03:A - render a proposed concept instead of the approved beats")
    ap.add_argument("--moment"); ap.add_argument("--options"); ap.add_argument("--sequence", action="store_true")
    ap.add_argument("--beat"); ap.add_argument("--all", action="store_true"); ap.add_argument("--handles", type=float)
    a = ap.parse_args()
    app = V.find_app(a.app)
    pj = V.load_project(app, a.slug, a.work)
    if pj["source"].get("scriptOnly"):
        if a.cmd in ("sfx", "draft-sound", "sound-preview", "downscale"):
            sys.exit(f"script-only project: '{a.cmd}' needs the footage's dialogue. Attach the cut first (edit_init.py <footage> --slug {a.slug}).")
    else:
        st = Path(pj["source"]["path"]).stat()     # fast check here; edit_qc.py verifies the full sha256
        if st.st_size != pj["source"]["size"] or st.st_mtime_ns != pj["source"].get("mtime_ns", st.st_mtime_ns):
            sys.exit("STOP: the original footage changed since edit_init (size/mtime differ). It must stay untouched.")
    {"sfx": cmd_sfx, "still": cmd_still, "concept-frames": cmd_concept_frames, "draft-sound": cmd_draft_sound, "preview": cmd_preview,
     "picture": cmd_picture, "final": cmd_final, "downscale": cmd_downscale, "sound-preview": cmd_sound_preview}[a.cmd](app, pj, a)


if __name__ == "__main__":
    main()
