#!/usr/bin/env python3
"""Build a DRAFT sound cue sheet (System D, Step 1 -> cue sheet) from what was measured.

  python3 scripts/sfx_plan.py work/sound/plan.json --out work/sound/cues.json

plan.json:
{
  "video": "../edit_v1.mp4",                     # picture the sound is designed for (paths relative to plan.json)
  "hook_end": 3.0,                               # seconds; pass 3 puts a riser into the body ~here
  "layers": [                                    # every rendered animation layer and where it sits in the video
    {"name": "01 caption", "cues": "01_cues.json", "offset": 0.40, "system": "B"},
    {"name": "02 calendar", "cues": "02_cues.json", "offset": 5.10, "system": "A"},
    {"name": "03 horizon", "cues": "03_cues.json", "offset": 12.00, "system": "C", "fullscreen": true, "duration": 2.8}
  ],
  "events": "video_events.json",                 # optional: cuts/motion found in the footage
  "music": {"file": "/path/to/user/track.wav", "gain_db": -19}   # optional; pass 4 only, user-supplied
}
The *_cues.json files come from: node scripts/render_html.js --html ... --analyze-only --cues X.json (times are
measured from the template's real motion: fastest frame for movements, first visible frame for events).

Output: cues.json with every proposal marked "status": "proposed" (or "silence" for silence-ok intents),
the family/track/anchor/gain preset filled in, and up to 5 library candidates per cue. Claude then
auditions candidates (sfx_audition.py), sets "sound" + "auditioned", rejects what should stay silent
("status": "rejected"), and renders with sound_mix.py. Nothing here is final until reviewed.
"""
import argparse
import json
from pathlib import Path

import audiolib as A

ROOT = Path(__file__).resolve().parent.parent
FAM = {"WSH": "whoosh", "RIS": "riser", "HIT": "hit", "ENV": "env"}
PASS = {"whoosh": 1, "texture": 2, "riser": 3, "hit": 3, "env": 0}
GAIN = {"whoosh": -12.0, "texture": -7.0, "riser": -5.0, "hit": -6.0, "env": -18.0}
ANCHOR = {"whoosh": "peak", "texture": "onset", "riser": "peak", "hit": "onset", "env": "start"}


def candidates(lib, category, roles):
    S = lib.get("sounds", [])
    pri = [s["id"] for s in S if roles and s.get("role") in roles]
    sec = [s["id"] for s in S if category and s["category"] == category and s["id"] not in pri]
    return (pri + sec)[:5]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plan"); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    pp = Path(a.plan).resolve(); base = pp.parent
    plan = json.loads(pp.read_text())
    lib = A.load_library()
    cues, fs_windows, n = [], [], 0
    for L in plan.get("layers", []):
        d = json.loads((base / L["cues"]).read_text())
        off = float(L["offset"])
        if L.get("fullscreen"):
            fs_windows.append([off, off + float(L.get("duration", d.get("duration", 0)))])
        for c in d["cues"]:
            n += 1
            cat = c.get("category")
            fam = FAM.get(cat, "texture") if cat else "texture"
            if c.get("kind") == "movement":
                fam = "whoosh"
            cue = {"id": f"{L['name'].split()[0]}-{c['id']}", "pass": PASS[fam], "family": fam, "anchor": ANCHOR[fam], "gain_db": GAIN[fam],
                   "t": round(off + float(c.get("t", 0)), 4), "sound": None, "candidates": candidates(lib, cat, c.get("roles", [])),
                   "roles_suggested": c.get("roles", []), "priority": c.get("priority"),
                   "status": "silence" if c.get("priority") == "silence-ok" else "proposed",
                   "system": L.get("system"), "event": f"{L['name']}: {c.get('label', c['id'])}", "reason": c.get("note", ""),
                   "link": {"event_t": round(off + float(c.get("t", 0)), 4), "what": c.get("label", ""), "measured_from": c.get("measured_from")}}
            if c.get("times"):
                cue["times"] = [round(off + t, 4) for t in c["times"]]
            if c.get("kind") == "continuous" and c.get("t_end") is not None:
                cue.update(anchor="start", trim=[0, round(float(c["t_end"]) - float(c["t"]), 3)], fade_out=0.08)
            cues.append(cue)
    # pass 3 proposals: riser into the body after the hook, and into every full-screen scene, with a hit beneath
    trans = []
    if plan.get("hook_end") is not None:
        trans.append((float(plan["hook_end"]), "hook -> body"))
    trans += [(w[0], "cut into full-screen scene") for w in fs_windows]
    ev = json.loads((base / plan["events"]).read_text()) if plan.get("events") else {}
    for k, (t, why) in enumerate(trans, 1):
        cues.append({"id": f"R{k:02d}", "pass": 3, "family": "riser", "subtype": None, "anchor": "peak", "gain_db": -5.0, "t": round(t, 4), "sound": None,
                     "candidates": candidates(lib, "RIS", ["sharp-bass-riser", "metallic-riser"]), "status": "proposed",
                     "event": f"build into: {why}", "reason": "Joseph pass 3: riser resolves on the transition frame; set subtype sharp-bass/metallic/suck-back",
                     "link": {"event_t": round(t, 4), "what": why}})
        cues.append({"id": f"H{k:02d}", "pass": 3, "family": "hit", "anchor": "onset", "gain_db": -6.0, "t": round(t, 4), "sound": None,
                     "candidates": candidates(lib, "HIT", ["impact-hit"]), "status": "proposed",
                     "event": f"hit under R{k:02d}", "reason": "lands the transition; pull this first if the stack clips",
                     "link": {"event_t": round(t, 4), "what": why}})
    for c_ in ev.get("cuts", []):
        if not any(abs(c_["t"] - x["t"]) < 0.1 for x in cues):
            cues.append({"id": f"CUT{c_['frame']}", "pass": 2, "family": "texture", "anchor": "onset", "gain_db": -7.0, "t": c_["t"], "sound": None,
                         "candidates": candidates(lib, "SCI", ["camera-click", "sci-fi-impact"]), "status": "review",
                         "event": f"detected cut at {c_['timecode']}", "reason": "clip-to-clip transition -> digital camera click / sci-fi hit, on the transition frame (confirm visually)",
                         "link": {"event_t": c_["t"], "what": "detected cut"}})
    out = {"video": plan["video"], "hook_end": plan.get("hook_end"), "fullscreen_windows": fs_windows, "graphic_windows": plan.get("graphic_windows", []),
           "dialogue": plan.get("dialogue", {"file": plan["video"], "gain_db": 0}), "music": plan.get("music"),
           "mix": {"ceiling_dbfs": -1.0}, "library_size": len(lib.get("sounds", [])),
           "cues": sorted(cues, key=lambda c: (c["pass"], c["t"]))}
    op = Path(a.out); op.parent.mkdir(parents=True, exist_ok=True)
    # paths in the cue sheet are resolved relative to the cue sheet's folder
    out["video"] = str((base / plan["video"]).resolve()); out["dialogue"]["file"] = str((base / out["dialogue"]["file"]).resolve())
    if out.get("music") and out["music"].get("file"):
        out["music"]["file"] = str((base / out["music"]["file"]).resolve())
    op.write_text(json.dumps(out, indent=1))
    print(f"draft cue sheet: {len(cues)} proposals from {n} declared intents -> {op}")
    if not lib.get("sounds"):
        print("NOTE: sound library is empty - candidates are blank. Index an authorised SFX folder first (sfx_index.py scan).")


if __name__ == "__main__":
    main()
