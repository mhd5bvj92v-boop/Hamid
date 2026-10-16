#!/usr/bin/env python3
"""Creative decisions and Claude Code requests in the project file (references/creative-director.md).

Everything lives in ONE document, the same one the Remotion Player, the Studio and the final renderer
use: remotion-app/src/projects/<slug>/edit.json (segments, Claude Concepts, Quick Drafts, decisions,
requests for Claude Code, built versions, approvals, feedback). CREATIVE-LOG.md next to it is generated.

Creative decisions
  edit_decisions.py analyze <slug> --file analysis.json    # Phase 1: segments (moments) + keep-visible
  edit_decisions.py propose <slug> --file concepts.json [--request REQ-0001]   # Claude Concepts A/B/C
  edit_decisions.py decide <slug> --moments S01,S03 --choice A [--quote "..."]  # -> implementation request
  edit_decisions.py decide <slug> --moments S02 --choice D --custom "<the user's words>" [--combine A,C]
                    [--based-on B] [--refs ONS-001,FUL-002] [--uploads /path/a.png,/path/b.jpg] [--quote "..."]
  edit_decisions.py decide <slug> --moments S04 --choice none --quote "keep me on camera there"
  edit_decisions.py approve <slug> --gate direction|preview|final --quote "<the user's own words>"
  edit_decisions.py feedback <slug> --quote "..." --change "S03: slower entrance" [--change ...]
  edit_decisions.py status [<slug>] [--require final]
  edit_decisions.py storyboard <slug>                      # concise grouped storyboard -> work/<slug>/plan/storyboard.md

Requests for Claude Code (written by the Studio or by these commands; processed in a Claude Code session)
  edit_decisions.py pending [<slug>]                       # open requests (all projects without a slug)
  edit_decisions.py show <slug> --request REQ-0003         # the full brief + what to do + the exact command to finish
  edit_decisions.py claim <slug> --request REQ-0003        # pending -> in_progress (refused if already taken or done)
  edit_decisions.py request <slug> --segment S02 [--note "..."]   # ask for three (new) Claude Concepts
  edit_decisions.py preview <slug> --request REQ-0004 --file build.json # render key frames + a sheet next to the style reference (repeat)
  edit_decisions.py built <slug> --request REQ-0004 --file build.json   # implementation / revision done (renders it with Remotion)
  edit_decisions.py fail <slug> --request REQ-0004 --reason "..."
  edit_decisions.py cancel <slug> --request REQ-0004 --reason "..."
  edit_decisions.py review <slug> --segment S02 --approve [--note "..."] | --changes "<the user's feedback>"
  edit_decisions.py plan-approve <slug> --segments S01,S02 --quote "..."   # Scene Planning: approved plans -> build requests
  edit_decisions.py restore <slug> --segment S02 --version 1
  edit_decisions.py ask-background <slug> --segment S03 --note "<the user's description>"   # a new library background
  edit_decisions.py done <slug> --request REQ-0007 --reason "what was made"   # finish a background request
  edit_decisions.py asset <slug> --segment S04 [--need A1] --file /path/render.png [--note "..."]
                                                           # the user's 3D / realistic asset for a scene (copied into the app)

concepts.json (Claude Concepts for one segment; the moments form {"moments": {"S02": {...}}} also works):
  {"recommend": "B", "options": {
     "A": {"title": "...", "system": "A", "description": "...", "enter": "...", "move": "...", "exit": "...",
           "refs": ["ONS-024"], "styleRef": "ONS-024", "family": "LIVE-UI", "sound": "...",
           "kind": "<optional existing kind>", "props": {...optional}},
     "B": {..., "refs": [], "styleRef": null, "noReference": "nothing in the library shows ..."},
     "C": {..., "assets": [{"id": "A1", "what": "two hands holding a glowing glass sphere",
                            "spec": "PNG, transparent background, front view, at least 1600 px tall"}]}}}
  "assets": realistic / 3D objects are never drawn with code shapes; the concept asks the user for them and
  the build waits until every required asset is provided (Studio upload or the asset command).
build.json (one implementation or revision):
  {"beat": {"kind": "CyberAlert", "props": {...}, "at": 3.5}, "notes": "...",
   "coverage": [{"item": "enter: ...", "done": true, "how": "..."}, {"item": "...", "done": false, "why": "..."}],
   "match": [{"quality": "blue rim light along the bottom edge (ONS-024)", "done": true, "how": "..."}, ...]}
  built only accepts the exact beat you last previewed, and a "match" list (>= 4 visible qualities of the
  style reference: light, depth, glow, texture, scale in frame, type, colour, composition; done or why not).

Request IDs (REQ-0001...) are stable and never reused. Completed, partial and cancelled requests are final:
processing one again is refused, so nothing is built twice. Every write to edit.json is atomic and refused
if the file changed since it was read (the Studio saves the same file).
Approvals are recorded ONLY when the user has explicitly said so; --quote must hold their words.
Gates: 'direction' needs every major segment decided; 'preview' needs 'direction'; 'final' needs
'direction' and at least one 'preview' approval. edit_render.py picture and the Studio's final export
refuse to render, and edit_qc.py fails the export, without the 'final' approval or while an
implementation is still waiting for Claude Code.
"""
import argparse
import copy
import datetime
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vedit as V  # noqa: E402
import vvlib  # noqa: E402

OPTIONS = ("A", "B", "C")
GATES = ("direction", "preview", "final")
OPEN = ("pending", "in_progress")
FINAL_STATES = ("completed", "partial", "cancelled")
CAT_LABEL = {"text": "Text Animation", "onscreen": "On-Screen Visual", "fullscreen": "Full-Screen Animation", "sound": "Sound Design"}
CAT_SYSTEM = {"text": "B", "onscreen": "A", "fullscreen": "C", "sound": "D"}
CAT_REF = {"text": "TXT", "onscreen": "ONS", "fullscreen": "FUL"}
SCENE_LABEL = {"captions": "Captions Only", "captions-ui": "Captions + UI", "halfscreen": "Halfscreen", "fullscreen": "Fullscreen"}
IMG_EXT = (".png", ".webp", ".jpg", ".jpeg")
VID_EXT = (".webm", ".mp4", ".m4v", ".mov")
ASSET_ID = re.compile(r"^[A-Za-z0-9_-]{1,24}$")
SCENE_OF_TYPE = {"text": "captions", "onscreen": "captions-ui", "fullscreen": "fullscreen"}


def scene_type(m):
    return m.get("sceneType") or SCENE_OF_TYPE.get(m.get("type"))


def decided(m):
    """A scene is decided once the user chose A/B/C/D or approved its scene plan."""
    return bool(m.get("decision")) or (m.get("plan") or {}).get("status") == "approved"
FAMILY_CATS = {"whoosh": ["WSH"], "texture": ["POP", "UI", "SCI", "MEC", "TEX"], "riser": ["RIS"], "hit": ["HIT"]}
STOP = set("a an and are as at be but by for from has have i in is it its of on or our so that the their them then there "
           "these they this to was we were what when which who will with you your my me us".split())
ED = "python3 .claude/skills/video-editing/scripts/edit_decisions.py"


def now():
    return datetime.datetime.now().isoformat(timespec="seconds")


def tc(s):
    if s is None:
        return "--:--.-"
    m, sec = divmod(float(s), 60)
    return f"{int(m):02d}:{sec:04.1f}"


def log_paths(app, slug):
    d = app / "src" / "projects" / slug
    if not d.exists():
        raise SystemExit(f"Remotion project {d} not found - run edit_init.py first")
    return d / "edit.json", d / "CREATIVE-LOG.md"


def load(app, slug):
    log_paths(app, slug)
    return V.load_doc(app, slug)


def library_ids():
    data = json.loads((V.SKILL_ROOT / "data" / "references.json").read_text())
    return {r["id"]: r for r in data["references"]}


def approved(log, gate):
    return any(a["gate"] == gate for a in log["approvals"])


def phase_of(log):
    if approved(log, "final"):
        return "5-final-approved"
    if approved(log, "preview") or log["feedback"] or approved(log, "direction"):
        return "4-animation-preview"
    if any(m.get("concepts") or m.get("drafts") for m in log["segments"]):
        return "2/3-options-and-approval"
    if log["segments"]:
        return "1-analyzed"
    return "0-intake"


def save(app, slug, log):
    _, mp = log_paths(app, slug)
    log["phase"] = phase_of(log)
    log["updated"] = now()
    V.save_doc(app, slug, log)
    mp.write_text(render_md(log))


def seg_by_id(log, sid):
    s = next((m for m in log["segments"] if m["id"] == sid), None)
    if not s:
        raise SystemExit(f"unknown segment {sid}")
    return s


def find_request(log, rid):
    r = next((x for x in log["requests"] if x["id"] == rid), None)
    if not r:
        raise SystemExit(f"no request {rid} in this project (see: edit_decisions.py pending)")
    return r


def open_requests(log, sid=None, types=None):
    return [r for r in log["requests"] if r["status"] in OPEN and (sid is None or r["segmentId"] == sid) and (types is None or r["type"] in types)]


def build_state(log, seg):
    reqs = [r for r in log["requests"] if r["segmentId"] == seg["id"] and r["type"] in ("implement", "revision")]
    req = reqs[-1] if reqs else None
    ver = next((v for v in seg.get("versions", []) if v["v"] == seg.get("activeVersion")), None)
    if req and req["status"] in OPEN:
        return req["status"], req, ver
    if req and req["status"] == "failed":
        return "failed", req, ver
    if ver:
        return ver["status"], req, ver
    return "none", req, None


# ------------------------------------------------------------------ the readable log
def render_md(log):
    src = log["source"]
    L = [f"# Creative decision log: {log['slug']}", "",
         "Creative Director: the user. Generated from `edit.json` (the project file the Studio, the Remotion Player and the renderer use).",
         (f"Source: script-only project, no footage attached yet ({src['sourceDurationSeconds']:.2f} s timeline, {src['fps']} fps)." if src.get("scriptOnly") else
          f"Source: `{Path(src.get('src', '')).name}` ({src['sourceDurationSeconds']:.2f} s, {src['fps']} fps; timeline preserved, never cut)."),
         f"Phase: **{log.get('phase', '')}**. Updated {log.get('updated', '')}.", ""]
    L += ["## Approvals", ""]
    L += [f"- **{a['gate']}** ({a['at']}): \"{a['quote']}\"" for a in log["approvals"]] or ["- none yet"]
    c = log.get("constants") or {}
    if c:
        L += ["", "## Constants for the whole edit", ""] + [f"- {k}: {v}" for k, v in c.items() if v not in ("", None)]
    L += ["", "## Scenes", "", "| Scene | Time | Spoken text | Scene type | Plan (what happens on screen) | Decision | Build | User |", "|---|---|---|---|---|---|---|---|"]
    for m in log["segments"]:
        d = m.get("decision") or {}
        choice = d.get("choice", "open")
        pool = m.get("drafts") if d.get("source") == "draft" else m.get("concepts")
        if choice in OPTIONS and (pool or {}).get(choice):
            o = pool[choice]
            label = "Quick Draft" if d.get("source") == "draft" else "Claude Concept"
            choice = f"{choice} ({label}): {o['title']} ({', '.join(o.get('refs') or []) or 'no reference'})"
        elif choice == "D":
            choice = f"D (own idea): {d.get('custom', '')}" + (f" [combines {'+'.join(d['combine'])}]" if d.get("combine") else "")
        elif choice == "none":
            choice = "keep visible (no visual)"
        state, req, ver = build_state(log, m)
        build = {"none": "-", "pending": f"waiting for Claude Code ({req['id']})" if req else "-", "in_progress": f"Claude Code working ({req['id']})" if req else "-",
                 "failed": f"failed ({req['id']}): {req.get('error', '')}" if req else "failed",
                 "built": f"v{ver['v']} built" if ver else "built", "partial": f"v{ver['v']} PARTIAL" if ver else "partial"}[state]
        if (m.get("review") or {}).get("status") == "approved":
            build += f", approved v{m['review'].get('version')}"
        said = '"' + d["quote"] + '"' if d.get("quote") else ""
        text = m.get("text", "")[:60]
        pl = m.get("plan") or {}
        plan = f"{pl.get('status', 'draft')}: {(m.get('onScreen') or '-').replace('|', '/')}"
        L.append(f'| {m["id"]} | {tc(m.get("start"))}-{tc(m.get("end"))} | "{text}" | {SCENE_LABEL.get(scene_type(m), m.get("type", ""))} | {plan} | {choice} | {build} | {said} |')
    if log.get("keepVisible"):
        L += ["", "## Deliberately kept on camera", ""] + [f"- {tc(k['in'])}-{tc(k['out'])}: {k['why']}" for k in log["keepVisible"]]
    L += ["", "## Claude Concepts (all rounds)", ""]
    for m in log["segments"]:
        rounds = [{"round": h["round"], "concepts": h["concepts"]} for h in m.get("history", [])]
        if m.get("concepts"):
            rounds.append({"round": m.get("round", 1), "concepts": m["concepts"]})
        for rnd in rounds:
            L.append(f"**{m['id']} round {rnd['round']}**")
            for k in OPTIONS:
                o = rnd["concepts"].get(k)
                if o:
                    L.append(f"- {k} — {o['title']} [{o['system']} · {o.get('kind') or 'to build'} · {', '.join(o.get('refs') or []) or 'no reference'} · {o.get('author', 'claude')}]: {o['description']}")
            L.append("")
    builds = [(m, v) for m in log["segments"] for v in m.get("versions", [])]
    if builds:
        L += ["## Built versions", ""]
        for m, v in builds:
            active = " (active)" if m.get("activeVersion") == v["v"] else ""
            L.append(f"- {m['id']} v{v['v']}{active}: {v['beat']['kind']} from {v['source']}{' via ' + v['requestId'] if v.get('requestId') else ''}, "
                     f"{v['status']} ({v['at']}){': ' + v['notes'] if v.get('notes') else ''}")
            for c in v.get("coverage") or []:
                L.append(f"  - [{'x' if c['done'] else ' '}] {c['item']}" + (f" — {c.get('how')}" if c["done"] and c.get("how") else f" — NOT DONE: {c.get('why', '')}" if not c["done"] else ""))
        L.append("")
    if log["requests"]:
        L += ["## Requests for Claude Code", ""]
        for r in log["requests"]:
            L.append(f"- {r['id']} {r['type']} {r['segmentId']}: **{r['status']}** ({r['created']})" + (f" — {r.get('result') or r.get('error')}" if r.get("result") or r.get("error") else ""))
        L.append("")
    if log["feedback"]:
        L += ["## Feedback rounds", ""]
        for i, f in enumerate(log["feedback"], 1):
            L.append(f"{i}. ({f['at']}) \"{f['quote']}\"")
            L += [f"   - {c}" for c in f["changes"]]
    return "\n".join(L) + "\n"


# ------------------------------------------------------------------ briefs for Claude Code
def suggest_refs(text, category, n=8):
    import search as S
    lib = json.loads((V.SKILL_ROOT / "data" / "references.json").read_text())["references"]
    terms = [w for w in re.findall(r"[a-zA-Z]{3,}", text.lower()) if w not in STOP]
    cat = CAT_REF.get(category)
    scored = sorted(((S.score(r, terms), r) for r in lib if not cat or r["category"] == cat), key=lambda x: (-x[0], x[1]["id"]))
    return [{"id": r["id"], "title": r["title"], "family": r["family"], "file": str(V.SKILL_ROOT / r["file"])} for sc, r in scored[:n] if sc > 0]


def make_brief(log, seg, **extra):
    lines = log.get("transcript", {}).get("segments", [])
    before = [l for l in lines if l.get("end") is not None and l["end"] <= seg["start"] + 1e-6][-2:]
    after = [l for l in lines if l.get("start") is not None and l["start"] >= seg["end"] - 1e-6][:2]
    ctx = lambda ls: [{"id": l["id"], "start": l.get("start"), "end": l.get("end"), "text": l["text"]} for l in ls]
    decisions = []
    for m in log["segments"]:
        d = m.get("decision")
        if m["id"] == seg["id"] or not d:
            continue
        pool = m.get("drafts") if d.get("source") == "draft" else m.get("concepts")
        title = (pool or {}).get(d["choice"], {}).get("title") if d["choice"] in OPTIONS else (d.get("custom", "")[:80] if d["choice"] == "D" else None)
        decisions.append({"segmentId": m["id"], "start": m["start"], "end": m["end"], "type": m.get("type"), "choice": d["choice"], "title": title,
                          "built": bool(m.get("beatId"))})
    previous = sorted({r for c in list((seg.get("concepts") or {}).values()) + list((seg.get("drafts") or {}).values()) if c for r in c.get("refs") or []})
    brief = {"project": log["slug"], "segmentId": seg["id"], "text": seg["text"], "start": seg["start"], "end": seg["end"],
             "category": seg.get("type", "text"), "categoryLabel": CAT_LABEL.get(seg.get("type", "text"), ""),
             "context": {"before": ctx(before), "after": ctx(after)}, "decisions": decisions,
             "timeline": [{"id": b["id"], "kind": b["kind"], "at": b["at"], "segmentId": b.get("segmentId")} for b in log["beats"]],
             "references": {"suggested": suggest_refs(seg["text"], seg.get("type")), "previous": previous},
             "plan": {"sceneType": scene_type(seg), "sceneLabel": SCENE_LABEL.get(scene_type(seg), ""), "onScreen": seg.get("onScreen") or "",
                      "status": (seg.get("plan") or {}).get("status", "draft")},
             "constants": log.get("constants") or {},
             **({"sceneBrief": {k: v for k, v in seg["brief"].items() if v not in (None, "", False)}} if seg.get("brief") else {}),
             # neighbours, for continuity (what the previous scene hands over, what the next one inherits)
             "neighbours": [{"segmentId": m["id"], "start": m["start"], "end": m["end"], "type": m.get("type"),
                             **({"inherits": (m.get("brief") or {}).get("inherits")} if (m.get("brief") or {}).get("inherits") else {})}
                            for m in log["segments"] if m["id"] != seg["id"] and (abs(m["end"] - seg["start"]) < 1.5 or abs(m["start"] - seg["end"]) < 1.5)]}
    brief.update({k: v for k, v in extra.items() if v not in (None, [], "")})
    return brief


def new_request(log, rtype, seg, **extra):
    rid = f"REQ-{log['nextRequest']:04d}"
    log["nextRequest"] += 1
    t = now()
    req = {"id": rid, "type": rtype, "segmentId": seg["id"], "status": "pending", "created": t, "updated": t, "brief": make_brief(log, seg, **extra)}
    log["requests"].append(req)
    return req


def set_status(req, status, result=None, error=None):
    req["status"] = status
    req["updated"] = now()
    if status == "in_progress":
        req["claimedAt"] = req["updated"]
    if status in FINAL_STATES or status == "failed":
        req["completedAt"] = req["updated"]
    if result is not None:
        req["result"] = result
    if error is not None:
        req["error"] = error


def take(req, types):
    """A request may be processed once: pending/in_progress (or failed, to retry) only."""
    if req["type"] not in types:
        raise SystemExit(f"{req['id']} is a '{req['type']}' request, not {' / '.join(types)}")
    if req["status"] in FINAL_STATES:
        raise SystemExit(f"{req['id']} is already {req['status']} ({req.get('result') or req.get('error') or ''}) - it is not processed twice")


def asset_needs(log, seg, req=None):
    """The 3D / realistic assets the scene's build needs (from the concept being built) and which required ones are missing."""
    c = (req or {}).get("brief", {}).get("concept") if req else None
    if c is None:
        d = seg.get("decision") or {}
        if d.get("choice") in OPTIONS and d.get("source") == "claude":
            c = (seg.get("concepts") or {}).get(d["choice"])
    needs = list((c or {}).get("assets") or [])
    have = seg.get("assets") or {}
    return needs, [n["id"] for n in needs if n.get("required", True) and n["id"] not in have]


def assets_to_use(seg, needs):
    """Provided assets the build must use: the concept's needs, and for the user's own idea (D) their own assets (U1...)."""
    ids = {n["id"] for n in needs}
    own = (seg.get("decision") or {}).get("choice") == "D"
    return {k: v for k, v in (seg.get("assets") or {}).items() if k in ids or (own and re.match(r"^U\d+$", k))}


# ------------------------------------------------------------------ commands: decisions
def cmd_init(app, slug, a):
    jp, _ = log_paths(app, slug)
    if not jp.exists():
        raise SystemExit(f"{jp} missing - run edit_init.py")
    save(app, slug, load(app, slug))
    print(f"creative decisions live in {jp} (CREATIVE-LOG.md generated)")


def cmd_analyze(app, slug, a):
    log = load(app, slug)
    data = json.loads(Path(a.file).read_text())
    dur = log["source"]["sourceDurationSeconds"]
    known = {m["id"]: m for m in log["segments"]}
    for m in data.get("moments", []):
        start, end = m.get("start", m.get("in")), m.get("end", m.get("out"))
        text = m.get("text", m.get("words"))
        if None in (m.get("id"), start, end) or not text or not m.get("why"):
            raise SystemExit(f"moment {m.get('id')}: needs id, start, end, text (the user's exact words) and why")
        if not (0 <= start < end <= dur + 1e-6):
            raise SystemExit(f"moment {m['id']}: {start}-{end} is outside the source (0-{dur:.2f} s)")
        keep = known.get(m["id"], {"concepts": {}, "history": [], "round": 0, "decision": None, "beatId": None, "requests": [], "transcriptIds": [], "versions": []})
        keep.update({"id": m["id"], "start": start, "end": end, "text": text, "type": m.get("type", keep.get("type", "text")),
                     "major": bool(m.get("major", True)), "recommendVisual": m.get("recommend", "visual"), "why": m["why"],
                     "section": m.get("section", keep.get("section"))})
        known[m["id"]] = keep
    log["segments"] = sorted(known.values(), key=lambda m: m["start"])
    log["keepVisible"] = data.get("keep_visible", log["keepVisible"])
    save(app, slug, log)
    print(f"analysis recorded: {len(log['segments'])} segments ({sum(m['major'] for m in log['segments'])} major), "
          f"{len(log['keepVisible'])} keep-visible stretches")


def check_options(mid, opts, lib, category=None):
    """Claude Concepts: three complete, library-grounded and genuinely different options."""
    errs, warns = [], []
    for k in OPTIONS:
        o = opts.get(k)
        if not o:
            errs.append(f"{mid}: option {k} missing (always present A, B and C; D is the user's own idea)")
            continue
        for f in ("title", "system", "description", "enter", "move", "exit"):
            if not str(o.get(f) or "").strip():
                errs.append(f"{mid}:{k} missing {f}" + (" (how elements enter / what moves / how they exit)" if f in ("enter", "move", "exit") else ""))
        if o.get("system") not in ("A", "B", "C", "D"):
            errs.append(f"{mid}:{k} system must be A (on-screen), B (text), C (full-screen) or D (sound)")
        if category in CAT_SYSTEM and o.get("system") and o["system"] != CAT_SYSTEM[category]:
            errs.append(f"{mid}:{k} is system {o['system']} but the user asked for {CAT_LABEL[category]} (system {CAT_SYSTEM[category]})")
        bad = [r for r in o.get("refs", []) if r not in lib]
        if bad:
            errs.append(f"{mid}:{k} unknown reference IDs {bad} (concepts must be grounded in the library)")
        sr = o.get("styleRef", (o.get("refs") or [None])[0])
        if sr is None:
            if o.get("system") != "D" and not str(o.get("noReference") or "").strip():
                errs.append(f"{mid}:{k} has no style reference: set styleRef to one of its refs, or styleRef null with noReference explaining why nothing in the library fits")
            elif o.get("system") != "D":
                warns.append(f"{mid}:{k} shows 'No matching reference' ({o.get('noReference')})")
        else:
            if sr not in (o.get("refs") or []):
                errs.append(f"{mid}:{k} styleRef {sr} must be one of its refs {o.get('refs')}")
            elif sr in lib and not (V.SKILL_ROOT / lib[sr]["file"]).exists():
                errs.append(f"{mid}:{k} styleRef {sr}: image file {lib[sr]['file']} is missing")
        assets = o.get("assets") or []
        if not isinstance(assets, list):
            errs.append(f"{mid}:{k} assets must be a list of {{id, what, spec}}")
            assets = []
        ids = [x.get("id") for x in assets if isinstance(x, dict)]
        for x in assets:
            if not isinstance(x, dict) or not ASSET_ID.match(str(x.get("id") or "")) or not str(x.get("what") or "").strip() or not str(x.get("spec") or "").strip():
                errs.append(f"{mid}:{k} each asset needs id (A1...), what (what it shows) and spec (format, angle, size or length)")
        if len(set(ids)) != len(ids):
            errs.append(f"{mid}:{k} asset ids must be unique")
    if errs:
        return errs, warns
    # genuinely different: no two options may share system + kind + primary reference + props,
    # and the three should not all come from one style family
    sig = {k: (opts[k]["system"], opts[k].get("kind"), (opts[k].get("refs") or [None])[0],
               json.dumps(opts[k].get("props") or opts[k].get("sfx"), sort_keys=True)) for k in OPTIONS}
    for i, x in enumerate(OPTIONS):
        for y in OPTIONS[i + 1:]:
            if sig[x] == sig[y]:
                errs.append(f"{mid}: options {x} and {y} are the same idea (same system, kind and primary reference)")
            if opts[x]["description"].strip().lower() == opts[y]["description"].strip().lower():
                errs.append(f"{mid}: options {x} and {y} have the same description")
            if opts[x]["title"].strip().lower() == opts[y]["title"].strip().lower():
                errs.append(f"{mid}: options {x} and {y} have the same title")
    fams = {opts[k].get("family") or (lib[opts[k]["refs"][0]]["family"] if opts[k].get("refs") else "NONE-" + k) for k in OPTIONS}
    systems = {opts[k]["system"] for k in OPTIONS}
    if len(fams) == 1 and len(systems) == 1:
        warns.append(f"{mid}: all three options share one system and one style family - make them more distinct")
    return errs, warns


def cmd_propose(app, slug, a):
    log = load(app, slug)
    lib = library_ids()
    data = json.loads(Path(a.file).read_text())
    req = find_request(log, a.request) if a.request else None
    if req:
        take(req, ("concepts",))
    if "moments" not in data:
        if not req:
            raise SystemExit("a single-segment concepts file needs --request (or use the {\"moments\": {\"S02\": ...}} form)")
        data = {"moments": {req["segmentId"]: data}}
    if req and set(data["moments"]) != {req["segmentId"]}:
        raise SystemExit(f"{req['id']} asks for concepts for {req['segmentId']}, the file has {sorted(data['moments'])}")
    by_id = {m["id"]: m for m in log["segments"]}
    errs, warns = [], []
    for mid, p in data["moments"].items():
        if mid not in by_id:
            errs.append(f"{mid}: not a segment (run analyze or select it in the Studio first)")
            continue
        # the user picked the category in the Studio (a concepts request): all three must be that category;
        # segments Claude analysed itself may mix systems (creative-director.md Phase 2)
        asked = req or next(iter(open_requests(log, mid, ("concepts",))), None)
        e, w = check_options(mid, p.get("options", {}), lib, by_id[mid].get("type") if asked else None)
        errs += e
        warns += w
        if p.get("recommend") and p["recommend"] not in OPTIONS:
            errs.append(f"{mid}: recommend must be A, B or C")
    for w in warns:
        print("WARN ", w)
    if errs:
        for e in errs:
            print("ERROR", e)
        print("nothing was written" + (f"; {req['id']} is still {req['status']}" if req else ""))
        raise SystemExit(1)
    for mid, p in data["moments"].items():
        m = by_id[mid]
        if m.get("concepts"):
            m.setdefault("history", []).append({"round": m.get("round", 1), "concepts": m["concepts"], "replaced": now()})
            m["round"] = m.get("round", 1) + 1
        else:
            m["round"] = 1
        # the request this answers: the one given, or the segment's open concepts request
        r = req or next(iter(open_requests(log, mid, ("concepts",))), None)
        m["concepts"] = {k: {**p["options"][k], "author": "claude", "category": m.get("type"),
                             "styleRef": p["options"][k].get("styleRef", (p["options"][k].get("refs") or [None])[0]),
                             **({"requestId": r["id"]} if r else {})} for k in OPTIONS}
        m["recommend"] = p.get("recommend")
        if r:
            set_status(r, "completed", result=f"round {m['round']}: Claude Concepts A/B/C written")
            print(f"{r['id']} completed")
    save(app, slug, log)
    print(f"Claude Concepts recorded for {', '.join(data['moments'])} (A/B/C + D = the user's own idea); the Studio shows them now")


def withdraw_on_change(log, seg, new_choice):
    old = seg.get("decision")
    if old and (old.get("choice"), old.get("source")) != new_choice and approved(log, "direction"):
        log["approvals"] = [x for x in log["approvals"] if x["gate"] not in ("direction", "preview", "final")]
        print("NOTE  the creative direction changed after it was approved: direction/preview/final approvals were withdrawn")


def cmd_decide(app, slug, a):
    log = load(app, slug)
    ids = [x.strip() for x in a.moments.split(",") if x.strip()]
    choice = a.choice.upper() if a.choice.lower() != "none" else "none"
    if choice not in ("A", "B", "C", "D", "none"):
        raise SystemExit("--choice must be A, B, C, D or none")
    if a.set == "draft":
        raise SystemExit("Quick Drafts are chosen in the Studio (they build from a template immediately); this command records Claude Concepts and D")
    custom = a.custom
    if choice == "D" and not (custom or "").strip():
        raise SystemExit("--choice D needs --custom with the user's own idea, exactly as they wrote it")
    split = lambda s: [x.strip() for x in s.split(",") if x.strip()] if s else []
    uploads = split(a.uploads) + ([a.reference_image] if a.reference_image else [])
    # D: the effective references snapshot (idea + scene + inherited project, exclusions applied) the Studio resolved
    snap = json.loads(Path(a.attachments_file).read_text(encoding="utf-8")) if getattr(a, "attachments_file", None) else {}
    for mid in ids:
        m = seg_by_id(log, mid)
        if choice in OPTIONS and (m.get("concepts") or {}).get(choice, {}).get("author") != "claude":
            raise SystemExit(f"{mid}: no Claude Concept {choice} yet (process the concepts request first)")
        source = "own" if choice == "D" else ("claude" if choice in OPTIONS else None)
        # applying the same decision again is idempotent: the open request for it stays, nothing is duplicated
        same_inputs = lambda d: (d.get("custom"), d.get("combine") or [], d.get("basedOn"), d.get("attachments") or [], d.get("refs") or [], d.get("uploads") or [])
        prev = m.get("decision") or {}
        cur_req = next((r for r in open_requests(log, mid, ("implement",)) if r["id"] == prev.get("requestId")), None)
        new_inputs = (custom if choice == "D" else None, [c.upper() for c in split(a.combine)], a.based_on.upper() if a.based_on else None,
                      snap.get("attachments") or [], split(a.refs), uploads)
        if cur_req and prev.get("choice") == choice and prev.get("source") == source and same_inputs(prev) == new_inputs:
            print(f"{mid}: the same decision is already waiting for Claude Code as {cur_req['id']} (nothing duplicated)")
            continue
        withdraw_on_change(log, m, (choice, source))
        # anything still waiting for (or failed in) Claude Code on this segment is superseded by this decision,
        # so an older request can never be built over the newer decision
        for r in [x for x in log["requests"] if x["segmentId"] == mid and x["type"] in ("implement", "revision") and x["status"] in (*OPEN, "failed")]:
            set_status(r, "cancelled", result="superseded by a new decision")
        if choice != "none":
            m["plan"] = {"status": "approved", "approvedAt": now(), "via": "choice", **({"quote": a.quote} if a.quote else {})}
        m["decision"] = {"choice": choice, "round": m.get("round"), "decided": now(), "quote": a.quote, "note": a.note or "",
                         **({"source": source} if source else {}),
                         **({"custom": custom} if choice == "D" else {}),
                         **({"combine": [c.upper() for c in split(a.combine)]} if a.combine else {}),
                         **({"basedOn": a.based_on.upper()} if a.based_on else {}),
                         **({"refs": split(a.refs)} if a.refs else {}),
                         **({"uploads": uploads} if uploads else {}),
                         **({"attachments": snap.get("attachments") or [], "excluded": snap.get("excluded") or []} if choice == "D" and snap else {}),
                         **({"hints": snap["hints"]} if choice == "D" and snap.get("hints") else {}),
                         **({"draftRev": snap["draftRev"]} if choice == "D" and snap.get("draftRev") is not None else {})}
        if choice == "none" or m.get("type") == "sound":
            print(f"decided {mid}: {choice}")
            continue
        extra = {"choice": choice, "conceptSet": "claude" if choice in OPTIONS else None}
        if choice in OPTIONS:
            extra["concept"] = m["concepts"][choice]
        else:
            d = m["decision"]
            extra.update(custom=custom, combine=d.get("combine"), basedOn=d.get("basedOn"), refs=d.get("refs"), uploads=d.get("uploads"),
                         attachments=d.get("attachments"), excluded=d.get("excluded"), hints=d.get("hints"), draftRev=d.get("draftRev"))
            pools = {**{k: v for k, v in (m.get("concepts") or {}).items() if v}}
            if d.get("basedOn") or d.get("combine"):
                extra["note"] = "Concepts the user referred to: " + json.dumps({k: pools.get(k, {}).get("title") for k in [d.get("basedOn"), *(d.get("combine") or [])] if k})
        req = new_request(log, "implement", m, **extra)
        m["decision"]["requestId"] = req["id"]
        print(f"decided {mid}: {choice}" + (f" (D, kept verbatim: {custom!r})" if choice == "D" else "") + f" -> implementation request {req['id']} (pending)")
    save(app, slug, log)


def cmd_approve(app, slug, a):
    log = load(app, slug)
    if not a.quote or len(a.quote.strip()) < 2:
        raise SystemExit("--quote must contain the user's own words of approval")
    open_major = [m["id"] for m in log["segments"] if m.get("major") and not decided(m)]
    if a.gate == "direction" and open_major:
        raise SystemExit(f"cannot approve the direction: undecided major moments {open_major}")
    if a.gate in ("preview", "final") and not approved(log, "direction"):
        raise SystemExit(f"cannot record '{a.gate}' before the creative direction is approved")
    if a.gate == "final" and not approved(log, "preview"):
        raise SystemExit("cannot record 'final' before at least one animation preview was approved")
    log["approvals"].append({"gate": a.gate, "at": now(), "quote": a.quote.strip(), "scope": a.scope or ""})
    save(app, slug, log)
    print(f"approval recorded: {a.gate} - \"{a.quote.strip()}\"")


def cmd_feedback(app, slug, a):
    log = load(app, slug)
    log["feedback"].append({"at": now(), "quote": a.quote, "changes": a.change or []})
    # changes after a final approval reopen it
    if approved(log, "final"):
        log["approvals"] = [x for x in log["approvals"] if x["gate"] != "final"]
        print("NOTE  feedback after the final approval: the final approval was withdrawn and must be given again")
    save(app, slug, log)
    print(f"feedback round {len(log['feedback'])} recorded ({len(a.change or [])} change requests)")


def projects(app):
    d = app / "src" / "projects"
    return sorted(p.name for p in d.iterdir() if (p / "edit.json").exists()) if d.exists() else []


def cmd_status(app, slug, a):
    if not slug:
        for s in projects(app):
            cmd_status(app, s, argparse.Namespace(require=None))
            print()
        return
    log = load(app, slug)
    print(f"{slug}: phase {log.get('phase', phase_of(log))}" + ("  (script-only: no footage attached)" if log["source"].get("scriptOnly") else ""))
    undecided = [m["id"] for m in log["segments"] if m.get("major") and not decided(m)]
    unproposed = [m["id"] for m in log["segments"] if m.get("major") and m.get("recommendVisual") != "keep-visible" and not m.get("concepts")]
    print(f"  segments: {len(log['segments'])}  without Claude Concepts: {unproposed or '-'}  undecided: {undecided or '-'}  beats: {len(log.get('beats', []))}")
    for m in log["segments"]:
        state, req, ver = build_state(log, m)
        d = m.get("decision") or {}
        pl = m.get("plan") or {}
        if scene_type(m) and m.get("type") != "sound":
            print(f"  {m['id']} {tc(m['start'])}-{tc(m['end'])} scene {SCENE_LABEL.get(scene_type(m))}: plan {pl.get('status', 'draft')}"
                  + (f" - \"{(m.get('onScreen') or '')[:60]}\"" if m.get("onScreen") else " (nothing described yet)"))
        if d:
            print(f"  {m['id']} {tc(m['start'])}-{tc(m['end'])} decided {d['choice']} ({d.get('source', '')}): build {state}"
                  + (f" v{ver['v']}" if ver else "") + (f" [{req['id']} {req['status']}]" if req else "")
                  + (f", review {m['review']['status']}" if m.get("review") else ""))
        for r in m.get("requests") or []:
            print(f"  NOTE     {m['id']} ({r['at']}): {r['note']}")
    n_open = open_requests(log)
    print(f"  requests for Claude Code: {len(n_open)} open" + (f" -> {ED} pending {slug}" if n_open else ""))
    for g in GATES:
        hit = [x for x in log["approvals"] if x["gate"] == g]
        state = f'APPROVED {hit[-1]["at"]} "{hit[-1]["quote"]}"' if hit else "open"
        print(f"  {g:9} {state}")
    if a.require:
        if not approved(log, a.require):
            raise SystemExit(f"gate '{a.require}' is not approved")


def cmd_storyboard(app, slug, a):
    log = load(app, slug)
    pj = V.load_project(app, slug, a.work)
    out = Path(pj["work"]) / "plan" / "storyboard.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    L = [f"## Storyboard: {slug} ({tc(0)}-{tc(log['source']['sourceDurationSeconds'])}, timeline unchanged)", ""]
    sections = {}
    for m in log["segments"]:
        sections.setdefault(m.get("section") or "Main", []).append(m)
    for name, ms in sections.items():
        L.append(f"### {name}")
        for m in ms:
            d = m.get("decision")
            head = f"- **{m['id']} {tc(m['start'])}-{tc(m['end'])}** \"{m['text'][:70]}\" · {m.get('type', '')}"
            if m.get("recommendVisual") == "keep-visible" and not m.get("concepts"):
                L.append(f"{head}: keep you on camera ({m.get('why', '')})")
                continue
            if d:
                L.append(f"{head}: decided **{d['choice']}**" + (f" ({d.get('custom')})" if d.get("custom") else ""))
                continue
            L.append(head + (f"  (recommended: **{m['recommend']}**)" if m.get("recommend") else ""))
            previews = []
            for k in OPTIONS:
                o = (m.get("concepts") or {}).get(k)
                if o:
                    L.append(f"  - **{k}** {o['title']}: {o['description']} [{', '.join(o.get('refs') or []) or 'no reference'}]")
                    if o.get("preview") and o["preview"] not in previews:
                        previews.append(o["preview"])
            L.append("  - **D** your own idea · or ask for three new concepts")
            if previews:
                L.append("  - preview: " + ", ".join(f"`{Path(x).name}`" for x in previews))
        L.append("")
    if log.get("keepVisible"):
        L.append("### Kept on camera (no visuals)")
        L += [f"- {tc(k['in'])}-{tc(k['out'])}: {k['why']}" for k in log["keepVisible"]]
        L.append("")
    L.append("Reply per group, e.g. \"all recommended\", \"S01 B, S02-S04 A\", \"S05 D: ...\", or \"new concepts for S03\".")
    out.write_text("\n".join(L) + "\n")
    print("\n".join(L))
    print(f"\n(saved: {out})")


# ------------------------------------------------------------------ commands: requests for Claude Code
def cmd_request(app, slug, a):
    log = load(app, slug)
    seg = seg_by_id(log, a.segment)
    if seg.get("type") not in CAT_REF:
        raise SystemExit(f"{seg['id']} is a {CAT_LABEL.get(seg.get('type'), seg.get('type'))} segment: Claude Concepts are for Text Animation, On-Screen Visual and Full-Screen Animation")
    existing = open_requests(log, seg["id"], ("concepts",))
    if existing:
        print(f"{existing[0]['id']} already asks for concepts for {seg['id']} ({existing[0]['status']}); not duplicated")
        return
    req = new_request(log, "concepts", seg, note=a.note or ("three new concepts" if seg.get("concepts") else "three concepts"))
    save(app, slug, log)
    print(f"{req['id']} pending: three Claude Concepts for {seg['id']} {tc(seg['start'])}-{tc(seg['end'])} \"{seg['text']}\" ({CAT_LABEL[seg['type']]})")


def cmd_pending(app, slug, a):
    rows = []
    for s in ([slug] if slug else projects(app)):
        log = load(app, s)
        rows += [(s, r, log) for r in open_requests(log)]
    if not rows:
        print("no open requests for Claude Code" + (f" in {slug}" if slug else ""))
        return
    print(f"{len(rows)} open request(s) for Claude Code (oldest first):")
    for s, r, log in sorted(rows, key=lambda x: x[1]["created"]):
        b = r["brief"]
        miss = asset_needs(log, seg_by_id(log, r["segmentId"]), r)[1] if r["type"] in ("implement", "revision") else []
        print(f"  {r['id']}  {s}  {r['segmentId']}  {r['type']:9} {r['status']:11} {tc(b['start'])}-{tc(b['end'])} \"{b['text'][:60]}\" ({b['categoryLabel']})"
              + (f"  WAITING FOR THE USER'S ASSETS: {', '.join(miss)}" if miss else ""))
    s, r, _ = sorted(rows, key=lambda x: x[1]["created"])[0]
    print(f"\nnext: {ED} show {s} --request {r['id']}")


GUIDE = {
    "background": """WHAT TO DO (Claude Code): the user wants a NEW background for the library, described above (verbatim).
 1. Read remotion-app/src/kit/backgrounds.tsx (the presets and BackgroundProps) and references/premium-motion.md.
 2. Add a preset to remotion-app/src/kit/backgrounds/custom.tsx: {{ id, label, description, render }} - animated (t),
    palette-driven (c60 / c30 / c10), deep glows, layered (atmosphere, light, particles), never a flat fill.
 3. Use it on this scene if it has a full-screen beat (props.background = "<id>"), preview it
    ({ed} preview ... for an open build, or render a still with edit_render.py still), and look at it.
 4. Finish: {ed} done {slug} --request {rid} --reason "added background <id>: ..." """,
    "analysis": """WHAT TO DO (Claude Code): the user asked you to ANALYSE a reference (shown above with its measured facts).
 1. Open the file (or, for a clip, the frame strip printed above) and LOOK at it. If it cannot be opened, do not
    analyse it: tell the user it was not accessible and ask for an upload.
 2. Write what you actually see as "observed" (color, typography, layout, materials, hierarchy, composition, notes).
    Motion: a still image shows none - write it as "inferredMotion" (a labelled guess). Only a clip may have
    "observedMotion" ([{{"t": seconds, "what": "..."}}], from its frames). Add "takeaways" (what to use from it).
 3. python3 .claude/skills/video-editing/scripts/ref_analysis.py record "<ref>" --file analysis.json
 4. Finish: {ed} done {slug} --request {rid} --reason "analysed <ref>: <one line>" """,
    "concepts": """WHAT TO DO (Claude Code, with the video-editing skill):
 1. Read .claude/skills/video-editing/SKILL.md and references/creative-director.md (Phase 2), plus the system doc
    for this category (system-a-on-screen.md / system-b-text.md / system-c-full-screen.md) and design-language.md.
 2. Search the library (python3 .claude/skills/video-editing/scripts/search.py <words> --cat {cat}) and OPEN the
    images you consider (Read). The suggested references above are a keyword match, not a design decision.
 3. Write three genuinely different concepts for exactly these words and times: title, system {system}, description,
    enter / move / exit, refs + styleRef (the reference image the Studio shows as STYLE REFERENCE; styleRef null +
    noReference when nothing fits - never an unrelated image), family, sound idea. Optional kind/props if an existing
    kit kind already implements it.
    REALISTIC / 3D OBJECTS (hands, people, products, devices, planets, buildings, sculptures, creatures...) are never
    drawn with code shapes - that looks cheap. List each one under "assets": [{{"id": "A1", "what": "...", "spec":
    "PNG, transparent background, front view, soft top light, at least 1600 px tall" or "WebM with alpha, 3 s, slow
    turn"}}]; the user provides it. Type, UI, charts, lines, light, particles and gradients are built in Remotion code.
 4. Save them to a JSON file and run:
      {ed} propose {slug} --request {rid} --file <concepts.json>
    Validation runs before anything is written; the request is completed and the Studio shows the concepts.""",
    "implement": """WHAT TO DO (Claude Code, with the video-editing skill):
 1. Read the approved scene plan (scene type + what happens on screen), the constants for the whole edit, and the
    approved concept or the user's own idea (D, verbatim) if there is one; then references/remotion.md (§4 adding a kind,
    §8 Studio) and the style references (open the images).
 2. Build it in Remotion. Reuse a kit kind only if it really does what was approved; otherwise write a new kind in
    remotion-app/src/kit/custom/ (<name>.timing.ts + <Name>.tsx) and register it in custom/timing.ts and
    custom/components.ts. Never substitute a generic template for an approved custom concept.
    3D / REALISTIC ASSETS (listed above): build with the user's files, never redraw them with shapes. The kit kind
    AssetScene stages one full-screen (props.asset = the file); custom kinds render <AssetMedia src={{props.asset}} />
    from src/kit/Asset.tsx. Pass every asset file in the beat props. If assets are still missing, ask the user for
    them (Studio: the scene's 3D assets box, or a file path for {ed} asset) - do not build without them.
    STYLE: 60-30-10 palette from the constants (usePalette(): c60 base ~60 %, c30 support ~30 %, c10 accent ~10 %,
    plus neutrals only); wrap the scene in <CameraMove dur=...> (camera from the constants) - nothing static; keep
    text and key elements inside the safe area (8 % margins, top 12 %, bottom 20 % free). preview measures palette and motion.
    STAGE (constants.stage set, e.g. "paper-grid"): the stage draws the one shared background and runs the chained camera
    and the scene flow itself - draw content only (no own background, no own zoom), lay it out with useLayout() on the
    thirds and snapGrid(), same font/card style as the other scenes, and set outAt = next scene's at - this at - 0.1 so
    the exit crosses the next entrance (premium-motion.md 3c).
    DOCS: references/art-direction.md (mode, platform, palette, backgrounds, type), references/motion-recipes.md (lifecycle,
    timing tokens, DirectionalCard / Popover recipes, transitions, diagnosis), references/references-and-d.md (D + references).
    LOOK: read references/premium-motion.md and build from src/kit/premium.tsx (glass, rim light, grain, light sweep,
    bloom, light rays, dust, vignette, line icons, tilt-in). Flat boxes, letter tiles, emoji and tiny elements are not acceptable.
 3b. PREVIEW AND COMPARE (required, usually 2-3 rounds): write build.json, then run
      {ed} preview {slug} --request {rid} --file <build.json>
    Open the comparison sheet it prints (Read) and list what the style reference has that your frames lack. Fix it, preview
    again, and repeat until your frames hold up next to the reference.
 3. Time it on the segment ({start:.2f}-{end:.2f} s). Do not touch other timeline items or the footage.
 4. Write build.json {{"beat": {{"kind", "props", "at"}}, "notes", "coverage": [...]}} - one coverage item per element
    of the concept (enter, move, exit, typography, colours...) and per instruction of D, each done:true with how,
    or done:false with why, plus "match": at least 4 visible qualities of the style reference and how you matched them
    (or why not). built accepts only the beat you last previewed. Then run:
      {ed} built {slug} --request {rid} --file <build.json>
    It validates the item, renders a Remotion still + clip, adds it to the timeline as a new version (the previous
    one can be restored) and marks the request completed (or partial if anything is not done).""",
    "revision": """WHAT TO DO (Claude Code, with the video-editing skill):
 1. Read the user's feedback (verbatim) and the current version below. Apply every point.
 2. Change props, or the component. If you change a component, keep earlier versions rendering as they did
    (add a prop with a default, or create a new kind) so 'restore' still shows what the user saw.
 3. Preview and compare as for an implementation ({ed} preview {slug} --request {rid} --file <build.json>, open the sheet,
    fix, repeat). Write build.json (coverage = one item per feedback point, plus "match") and run:
      {ed} built {slug} --request {rid} --file <build.json>""",
}


BUILTIN_ID = re.compile(r"^(ONS|TXT|FUL)-\d{3}$")


def user_library():
    lib = V.SKILL_ROOT.parents[2] / "library" / "references.json"
    return json.loads(lib.read_text(encoding="utf-8")) if lib.exists() else []


def ref_file(att, cat=None, mine=None):
    """The file a reference attachment points to (built-in image, My-library file, upload) or its URL."""
    rid = att.get("id", "")
    if att.get("kind") == "url" or att.get("url"):
        return att.get("url")
    if BUILTIN_ID.match(rid):
        cat = cat or vvlib.load_catalog()
        hit = next((x for x in cat["references"] if x["id"] == rid), None)
        return str(V.SKILL_ROOT / hit["file"]) if hit else None
    if rid.startswith("MY-"):
        hit = next((x for x in (mine if mine is not None else user_library()) if x["id"] == rid), None)
        return hit["file"] if hit else att.get("path")
    return att.get("path")


def brief_attachments(b):
    """The effective references of a request: the D snapshot, or (older requests) its refs/uploads."""
    if b.get("attachments") is not None:
        return b["attachments"]
    return [*({"id": x, "kind": "mine" if x.startswith("MY-") else "library", "scope": "idea", "role": "style", "influence": "use", "from": "idea"} for x in (b.get("refs") or [])),
            *({"id": "UP-" + Path(u).name, "kind": "upload", "path": u, "scope": "idea", "role": "style", "influence": "use", "from": "idea"} for u in (b.get("uploads") or []))]


def check_current(log, r):
    """An older request never builds over a newer decision: implement requests must be the scene's current decision's,
    revisions the newest revision of the scene."""
    seg = seg_by_id(log, r["segmentId"])
    d = seg.get("decision") or {}
    if r["type"] == "implement" and d.get("requestId") and d["requestId"] != r["id"]:
        raise SystemExit(f"{r['id']} is out of date: {seg['id']}'s current decision ({d.get('choice')}) belongs to {d['requestId']}. "
                         f"Nothing was built; process {d['requestId']} instead.")
    if r["type"] == "revision":
        newest = [x for x in log["requests"] if x["segmentId"] == seg["id"] and x["type"] == "revision"][-1]
        if newest["id"] != r["id"]:
            raise SystemExit(f"{r['id']} is out of date: {newest['id']} is the newest revision of {seg['id']}. Nothing was built.")


def cmd_show(app, slug, a):
    log = load(app, slug)
    r = find_request(log, a.request)
    b = r["brief"]
    print(f"{r['id']} · {r['type']} · {r['status']} · project {slug} · segment {r['segmentId']}")
    print(f"category: {b['categoryLabel']}   time: {tc(b['start'])}-{tc(b['end'])} ({b['start']}-{b['end']} s)")
    print(f"spoken text (exact): \"{b['text']}\"")
    for l in b["context"]["before"]:
        print(f"  before {tc(l['start'])}: {l['text']}")
    for l in b["context"]["after"]:
        print(f"  after  {tc(l['start'])}: {l['text']}")
    pl = b.get("plan") or {}
    if pl.get("sceneType"):
        print(f"\nSCENE PLAN ({pl.get('status')}): {pl.get('sceneLabel')}" + (f"\n  what happens on screen (the user's words): {pl['onScreen']}" if pl.get("onScreen") else ""))
    if b.get("constants"):
        c = b["constants"]
        print("CONSTANTS FOR THE WHOLE EDIT: " + "; ".join(f"{k}: {v}" for k, v in c.items() if v not in ("", None)))
    sb = b.get("sceneBrief") or {}
    if sb:
        names = {"understand": "viewer must understand", "idea": "one visual idea", "why": "why a visual", "focus": "focus & reading order",
                 "enterExit": "enters / changes / exits", "inherits": "next scene inherits", "sound": "sound", "stillHold": "intentional still hold"}
        print("\nSCENE BRIEF (the user's direction for this scene):\n" + "\n".join(f"  {names.get(k, k)}: {v}" for k, v in sb.items()))
    for n in b.get("neighbours") or []:
        if n.get("inherits"):
            print(f"  neighbour {n['segmentId']} ({n['start']}-{n['end']} s) hands over: {n['inherits']}")
    if b.get("custom") is not None:
        print("\nTHE USER'S OWN IDEA (D), verbatim - implement all of it (it wins over any reference):\n" + "-" * 60 + f"\n{b['custom']}\n" + "-" * 60)
        seg0 = seg_by_id(log, r["segmentId"])
        pools = {**(seg0.get("concepts") or {})}
        for k in [b.get("basedOn"), *(b.get("combine") or [])]:
            if k and pools.get(k):
                c = pools[k]
                print(f"  the user builds on concept {k} ({'based on' if k == b.get('basedOn') else 'combine'}): {c['title']} - {c['description']}"
                      f"\n    enter: {c.get('enter')} | move: {c.get('move')} | exit: {c.get('exit')}")
        h = {k: v for k, v in (b.get("hints") or {}).items() if v}
        if h:
            print("  the user's structured hints: " + "; ".join(f"{k}: {v}" for k, v in h.items()))
    if b.get("feedback") is not None:
        print("\nTHE USER'S FEEDBACK, verbatim - apply all of it:\n" + "-" * 60 + f"\n{b['feedback']}\n" + "-" * 60)
        for f in b.get("earlierFeedback") or []:
            print(f"(earlier, unprocessed feedback, also apply): {f}")
    if b.get("concept"):
        c = b["concept"]
        print(f"\napproved concept {b.get('choice')}: {c['title']} [{c['system']}]\n  {c['description']}\n  enter: {c.get('enter')}\n  move:  {c.get('move')}\n  exit:  {c.get('exit')}"
              f"\n  refs: {', '.join(c.get('refs') or []) or '-'}  style reference: {c.get('styleRef') or 'none'}  sound: {c.get('sound', '-')}")
    seg = seg_by_id(log, r["segmentId"])
    needs, missing = asset_needs(log, seg, r)
    have = seg.get("assets") or {}
    if needs or have:
        print("\n3D / REALISTIC ASSETS (use these files; never draw these objects with code shapes):")
        for n in needs:
            got = have.get(n["id"])
            print(f"  {n['id']}  {n['what']}  [{n['spec']}]  ->  " + (f"PROVIDED: {got['file']} ({got['kind']})" if got else ("MISSING" if n.get("required", True) else "optional, not provided")))
        for k, v in have.items():
            if k not in {n["id"] for n in needs}:
                print(f"  {k}  the user's own asset ({'use it' if (seg.get('decision') or {}).get('choice') == 'D' else 'optional'}): {v['file']} ({v['kind']})"
                      + (f" - {v['note']}" if v.get("note") else ""))
        if missing and r["type"] != "concepts":
            print(f"WAITING FOR THE USER: {', '.join(missing)} not provided yet. Ask them to upload it in the Studio (the scene's 3D assets"
                  f" box) or to give you the file path, then: {ED} asset {slug} --segment {seg['id']} --need <id> --file <path>. Do not build before.")
    lib = V.SKILL_ROOT.parents[2] / "library" / "references.json"
    if lib.exists():
        mine = json.loads(lib.read_text())
        if mine:
            print("\nTHE USER'S OWN REFERENCE LIBRARY (library/references.json; open the ones that fit):")
            for x in mine[-30:]:
                print(f"  {x['id']}  {x.get('kind', 'style'):6} {', '.join(x.get('tags') or [])[:50]:50}  {x['file']}" + (f"  - {x['note']}" if x.get("note") else ""))
    if r["type"] == "background":
        print(f"\nTHE USER'S BACKGROUND REQUEST, verbatim:\n{b.get('note', '')}")
    if r["type"] == "analysis":
        import ref_analysis as RA
        ref = b.get("ref")
        a0 = RA.measure(ref)
        print(f"\nREFERENCE TO ANALYSE: {ref}  (file: {a0.get('downloaded') or a0.get('source')})\n" + RA.describe(a0))
    print("\nsuggested references (keyword match; open the images before using them):")
    for x in b["references"]["suggested"]:
        print(f"  {x['id']}  {x['family']:16} {x['title'][:60]}  {x['file']}")
    atts = brief_attachments(b)
    if atts or b.get("excluded"):
        cat, mine = vvlib.load_catalog(), user_library()
        print("\nTHIS SCENE WILL USE (the user's references for this decision; idea > scene > project, exclusions applied):")
        for x in atts:
            print(f"  {x['id']:12} {x.get('influence', 'use'):6} {x.get('role', 'style'):12} from {x.get('from', x.get('scope', 'idea')):7} {ref_file(x, cat, mine) or '(missing file)'}"
                  + (f"  - {x['note']}" if x.get("note") else ""))
        if b.get("excluded"):
            print(f"  excluded (do NOT use): {', '.join(b['excluded'])}")
        import ref_analysis as RA
        for x in atts:
            ref = x.get("url") or (x["id"] if BUILTIN_ID.match(x["id"]) or x["id"].startswith("MY-") else x.get("path"))
            try:
                kind, path, url, _ = RA.resolve(ref) if ref else (None, None, None, None)
                an = RA.load(RA.key_of(kind, path, url)) if kind else None
            except SystemExit:
                an = None
            if an:
                print("  analysis of " + RA.describe(an).replace("\n", "\n    "))
        print("  use = adopt its visible qualities for the given role; light = a hint only. A still image does not prove motion.")
    if b["timeline"]:
        print("existing timeline items (leave them unchanged): " + ", ".join(f"{t['id']} {t['kind']} @{t['at']}s" for t in b["timeline"]))
    print()
    print(GUIDE[r["type"]].format(ed=ED, slug=slug, rid=r["id"], cat=CAT_REF.get(b["category"], ""), system=CAT_SYSTEM.get(b["category"], ""),
                                  start=b["start"], end=b["end"]))
    if a.json:
        print("\nbrief JSON:\n" + json.dumps(b, indent=1, ensure_ascii=False))


def cmd_ask_background(app, slug, a):
    log = load(app, slug)
    seg = seg_by_id(log, a.segment)
    if not (a.note or "").strip():
        raise SystemExit("--note: describe the background")
    req = new_request(log, "background", seg, note=a.note.strip())
    save(app, slug, log)
    print(f"{req['id']} pending: a new library background for {seg['id']} - \"{a.note.strip()}\"")


def cmd_ask_analysis(app, slug, a):
    """The user asked Claude Code to analyse a reference (Studio: Analyse / Refresh on an attachment)."""
    import ref_analysis as RA
    log = load(app, slug)
    seg = seg_by_id(log, a.segment)
    an = RA.measure(a.ref, refresh=a.refresh)
    if an["status"] == "inaccessible":
        print(f"{a.ref} is not accessible ({an.get('error')}): nothing to analyse; upload the image or clip instead")
        return
    for r in open_requests(log, seg["id"], ("analysis",)):
        if r["brief"].get("ref") == a.ref:
            print(f"{r['id']} already asks for this analysis")
            return
    req = new_request(log, "analysis", seg, ref=a.ref, note=f"analyse {a.ref}")
    save(app, slug, log)
    print(f"{req['id']} pending: analyse {a.ref} (measured; Claude Code adds its observations)")


def cmd_done(app, slug, a):
    log = load(app, slug)
    r = find_request(log, a.request)
    take(r, ("background", "analysis"))
    if not (a.reason or "").strip():
        raise SystemExit("--reason: say what was made")
    set_status(r, "completed", result=a.reason.strip())
    save(app, slug, log)
    print(f"{r['id']} completed: {a.reason.strip()}")


def cmd_claim(app, slug, a):
    log = load(app, slug)
    r = find_request(log, a.request)
    take(r, (r["type"],))
    if r["status"] == "in_progress":
        raise SystemExit(f"{r['id']} is already in progress (claimed {r.get('claimedAt')}); finish it with propose/built or release it with fail")
    set_status(r, "in_progress")
    save(app, slug, log)
    print(f"{r['id']} in progress (the Studio shows it)")


def cmd_fail(app, slug, a, status="failed"):
    log = load(app, slug)
    r = find_request(log, a.request)
    take(r, (r["type"],))
    if not (a.reason or "").strip():
        raise SystemExit("--reason required")
    set_status(r, status, **({"error": a.reason} if status == "failed" else {"result": a.reason}))
    save(app, slug, log)
    print(f"{r['id']} {status}: {a.reason}")


def pick_sound(family):
    p = Path(os.environ.get("VV_SOUNDS_JSON", V.SKILL_ROOT / "data" / "sounds.json"))
    lib = json.loads(p.read_text()).get("sounds", []) if p.exists() else []
    hit = next((s for s in lib if s.get("category") in FAMILY_CATS.get(family, [])), None)
    return hit["id"] if hit else None


def render_version(app, slug, doc, beat, version):
    """Remotion still (landed frame) + half-resolution clip of the candidate timeline, before it is saved."""
    import edit_render as ER
    pj = V.load_project(app, slug)
    wd = Path(pj["work"])
    fps = doc["source"]["fps"]
    chk = beat_check(app, slug, beat["segmentId"], beat)
    w = chk["window"]
    total = doc["source"]["durationInFrames"]
    landed = max(w["from"], w["from"] + w["durationInFrames"] - max(2, round(0.65 * fps)))
    prev = wd / "previews"
    prev.mkdir(parents=True, exist_ok=True)
    props = prev / f"_{beat['segmentId']}_v{version}_props.json"
    props.write_text(json.dumps({"doc": V.clean_doc(doc), "layers": "all", "concept": None, "audio": None}))
    serve = ER.bundle(app, pj)
    still = prev / f"{beat['segmentId']}_v{version}.png"
    ER.npx(app, ["remotion", "still", serve, "StudioEdit", str(still), f"--frame={landed}", f"--props={props}", "--image-format=png", "--scale=0.5"],
           prev / f"{beat['segmentId']}_v{version}_still.log")
    h = round(0.5 * fps)
    f0, f1 = max(0, w["from"] - h), min(total - 1, w["from"] + w["durationInFrames"] + h)
    clip = prev / f"{beat['segmentId']}_v{version}.mp4"
    ER.npx(app, ["remotion", "render", serve, "StudioEdit", str(clip), *ER.H264, f"--props={props}", f"--frames={f0}-{f1}", "--scale=0.5"],
           prev / f"{beat['segmentId']}_v{version}_clip.log")
    props.unlink()
    return f"/api/file/{slug}/previews/{still.name}", f"/api/file/{slug}/previews/{clip.name}", landed


def beat_check(app, slug, sid, beat):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"segmentId": sid, "beat": beat}, f)
    r = V.run(["npx", "--no-install", "tsx", "scripts/beat-check.ts", slug, f.name], cwd=app, check=False)
    os.unlink(f.name)
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        raise SystemExit(f"beat-check failed to run:\n{r.stdout}\n{r.stderr}")


def make_beat(seg, r, b):
    return {"id": b.get("id") or seg["id"], "kind": b.get("kind"), "at": b.get("at", seg["start"]), "props": b.get("props") or {},
            "reason": b.get("reason") or f"{seg.get('type')}: \"{seg['text']}\" ({r['type']} {r['id']})",
            "refs": b.get("refs") or (r["brief"].get("concept") or {}).get("refs") or r["brief"].get("refs") or [], "segmentId": seg["id"]}


def beat_hash(beat):
    return hashlib.sha1(json.dumps({k: beat.get(k) for k in ("kind", "at", "props")}, sort_keys=True).encode()).hexdigest()[:12]


def style_refs(log, seg, r):
    """What the build must hold up against: the concept's style reference (+ its refs) or the user's references/uploads (D)."""
    c = r["brief"].get("concept") or {}
    atts = [x for x in brief_attachments(r["brief"]) if x.get("influence", "use") != "exclude"]
    # built-in ids go to the sheet as references; My-library files and uploads go as images
    refs = [x for x in [c.get("styleRef"), *(c.get("refs") or []), *(x["id"] for x in atts)] if x and BUILTIN_ID.match(x)]
    mine = user_library()
    uploads = [f for f in (ref_file(x, None, mine) for x in atts if not BUILTIN_ID.match(x["id"]) and x.get("kind") != "url") if f and Path(f).exists()]
    return list(dict.fromkeys(refs))[:2], list(dict.fromkeys(uploads))[:2]


def check_assets_used(seg, needs, b):
    use = assets_to_use(seg, needs)
    unused = [k for k, v in use.items() if v["file"] not in json.dumps(b.get("props") or {})]
    return [f"the user's assets {unused} are not in the beat props: build with them (e.g. AssetScene props.asset = \"{use[unused[0]]['file']}\"), never redraw them with shapes"] if unused else []


def style_report(constants, stills, fullscreen):
    """60-30-10 palette shares and camera motion, measured on the preview frames (full-screen scenes)."""
    if not fullscreen:
        return {"note": "overlay: palette/camera measured by eye on the sheet (the footage fills most of the frame)"}
    import numpy as np
    from PIL import Image
    hx = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
    pal = {"60": hx(constants.get("color60", "#0A0F1F")), "30": hx(constants.get("color30", "#1E2A44")), "10": hx(constants.get("accentColor", "#2F6BFF"))}
    im = np.asarray(Image.open(stills["landed"]).convert("RGB").resize((180, 320)), float).reshape(-1, 3)
    d = np.stack([np.linalg.norm(im - c, axis=1) for c in pal.values()], 1)
    sat = im.max(1) - im.min(1)
    neutral = (sat < 28) & (d.min(1) > 40)          # white type, greys, pure black
    near = d.min(1) <= 70
    lab = d.argmin(1)
    counted = near & ~neutral
    tot = max(1, counted.sum())
    shares = {k: round(100 * float(((lab == i) & counted).sum()) / tot) for i, k in enumerate(pal)}
    off = round(100 * float((~near & ~neutral).sum()) / max(1, (~neutral).sum()))
    a = np.asarray(Image.open(stills["middle"]).convert("L").resize((180, 320)), float)
    b = np.asarray(Image.open(stills["landed"]).convert("L").resize((180, 320)), float)
    motion = round(float(np.abs(a - b).mean()), 2)
    issues = []
    if shares["60"] < 45:
        issues.append(f"base colour only {shares['60']} % (60-30-10 wants ~60 %)")
    if shares["10"] > 20:
        issues.append(f"accent {shares['10']} % (should be ~10 %: use it only for the one thing to look at)")
    if off > 15:
        issues.append(f"{off} % of the coloured pixels are off-palette")
    if motion < 0.8:
        issues.append("the frame barely changes between middle and landed: add the camera move (<CameraMove>) or living motion")
    return {"shares": shares, "offPalette": off, "motion": motion, "issues": issues}


def cmd_preview(app, slug, a):
    """Render key frames of a candidate build and put them next to the style reference: look at it, fix, repeat."""
    import edit_render as ER
    log = load(app, slug)
    r = find_request(log, a.request)
    take(r, ("implement", "revision"))
    check_current(log, r)
    seg = seg_by_id(log, r["segmentId"])
    needs, missing = asset_needs(log, seg, r)
    if missing:
        raise SystemExit(f"{r['id']} needs the user's 3D assets {missing} first; nothing was rendered")
    data = json.loads(Path(a.file).read_text())
    beat = make_beat(seg, r, data.get("beat") or {})
    errs = check_assets_used(seg, needs, data.get("beat") or {})
    chk = beat_check(app, slug, seg["id"], beat)
    errs += chk["errors"]
    if errs:
        for e in errs:
            print("ERROR", e)
        raise SystemExit(1)
    candidate = copy.deepcopy(log)
    candidate["beats"] = sorted([x for x in candidate["beats"] if x.get("segmentId") != seg["id"]] + [beat], key=lambda x: x["at"])
    pj = V.load_project(app, slug)
    prev = Path(pj["work"]) / "previews"
    prev.mkdir(parents=True, exist_ok=True)
    n = len(r.get("previews") or []) + 1
    w = chk["window"]
    fps = log["source"]["fps"]
    frames = {"entering": w["from"] + round(0.3 * fps), "middle": w["from"] + w["durationInFrames"] // 2,
              "landed": w["from"] + w["durationInFrames"] - max(2, round(0.65 * fps))}
    props = prev / f"_{seg['id']}_try{n}_props.json"
    props.write_text(json.dumps({"doc": V.clean_doc(candidate), "layers": "all", "concept": None, "audio": None}))
    serve = ER.bundle(app, pj)
    stills = []
    for name, f in frames.items():
        out = prev / f"{seg['id']}_try{n}_{name}.png"
        ER.npx(app, ["remotion", "still", serve, "StudioEdit", str(out), f"--frame={min(f, log['source']['durationInFrames'] - 1)}", f"--props={props}",
                     "--image-format=png", "--scale=0.5"], prev / f"{seg['id']}_try{n}_{name}.log")
        stills.append(str(out))
    props.unlink()
    refs, uploads = style_refs(log, seg, r)
    sheet = prev / f"{seg['id']}_try{n}_compare.png"
    import subprocess
    cp = subprocess.run([sys.executable, str(Path(__file__).with_name("compare.py")), "--render", *stills, *uploads, *(["--refs", *refs] if refs else []),
                         "--out", str(sheet), "--height", "760"], capture_output=True, text=True)
    if cp.returncode:
        raise SystemExit(f"compare sheet failed: {cp.stderr[-400:]}")
    rep = style_report(log.get("constants") or {}, dict(zip(frames, stills)), chk["window"].get("fullscreen", False))
    r.setdefault("previews", []).append({"n": n, "hash": beat_hash(beat), "sheet": f"/api/file/{slug}/previews/{sheet.name}", "at": now(), "style": rep})
    save(app, slug, log)
    print(f"preview {n} of {r['id']}: {sheet}")
    print(f"  frames: {', '.join(f'{k} {v}' for k, v in frames.items())}; style reference: {', '.join(refs) or 'none'}{' + the user uploads' if uploads else ''}")
    if rep.get("shares"):
        print(f"  60-30-10: base {rep['shares']['60']} % / support {rep['shares']['30']} % / accent {rep['shares']['10']} %, off-palette {rep['offPalette']} %; camera/motion {rep['motion']}")
    for i in rep.get("issues", []):
        print("FIX  ", i)
    print("NOW: open the sheet (Read) and compare honestly. List every visible quality of the reference your render lacks: light and glow,\n"
          "depth and layering, texture (grain, glass, noise), scale in the frame, typography (size, weight, spacing), colour, composition,\n"
          "motion cues. Fix them and preview again. Build only when it holds up next to the reference.")


def cmd_built(app, slug, a):
    log = load(app, slug)
    r = find_request(log, a.request)
    take(r, ("implement", "revision"))
    check_current(log, r)
    seg = seg_by_id(log, r["segmentId"])
    needs, missing = asset_needs(log, seg, r)
    if missing:
        raise SystemExit(f"{r['id']} needs the user's 3D assets {missing} first ({'; '.join(n['what'] for n in needs if n['id'] in missing)}). "
                         f"Ask them to upload them in the Studio or give you the files, then: {ED} asset {slug} --segment {seg['id']} --need <id> --file <path>. Nothing was written.")
    data = json.loads(Path(a.file).read_text())
    b = data.get("beat") or {}
    cov = data.get("coverage")
    errs = []
    errs += check_assets_used(seg, needs, b)
    if not isinstance(cov, list) or not cov:
        errs.append("coverage missing: list every element of the concept / every instruction of D / every feedback point, each done:true (how) or done:false (why)")
    else:
        for i, c in enumerate(cov):
            if not str(c.get("item") or "").strip() or not isinstance(c.get("done"), bool):
                errs.append(f"coverage[{i}] needs item and done (true/false)")
            elif not c["done"] and not str(c.get("why") or "").strip():
                errs.append(f"coverage[{i}] '{c['item']}' is not done: say why")
    beat = make_beat(seg, r, b)
    # quality gate: the exact beat was previewed next to its style reference, and the match is accounted for
    pv = r.get("previews") or []
    if not pv:
        errs.append(f"preview it first: {ED} preview {slug} --request {r['id']} --file <build.json>, open the comparison sheet and fix what the reference has and yours lacks")
    elif pv[-1]["hash"] != beat_hash(beat):
        errs.append(f"this beat differs from preview {pv[-1]['n']}: preview this exact version and look at it before building")
    for i in ((pv[-1].get("style") or {}).get("issues") or []) if pv else []:
        print("WARN  style:", i, "- fix it and preview again, or explain it in match")
    match = data.get("match")
    if not isinstance(match, list) or len(match) < 4:
        errs.append("match missing: list at least 4 visible qualities of the style reference (light, depth, glow, texture, scale in frame, type, colour, composition), each done:true (how) or done:false (why)")
    else:
        for i, mq in enumerate(match):
            if not str(mq.get("quality") or "").strip() or not isinstance(mq.get("done"), bool) or not str(mq.get("how") or mq.get("why") or "").strip():
                errs.append(f"match[{i}] needs quality, done (true/false) and how / why")
    chk = beat_check(app, slug, seg["id"], beat)
    errs += chk["errors"]
    for w in chk["warnings"]:
        print("WARN ", w)
    if errs:
        for e in errs:
            print("ERROR", e)
        print(f"nothing was written; {r['id']} is still {r['status']}")
        raise SystemExit(1)
    # the new sounds come from the kind's sound intents; keep the user's settings for sounds that still exist
    old = {s["id"]: s for s in log["sfx"] if s.get("segmentId") == seg["id"]}
    sfx = []
    for s in chk["sfx"]:
        o = old.get(s["id"])
        sfx.append({**s, **({k: o[k] for k in ("sound", "gainDb", "gainReason", "offsetFrames", "enabled") if k in o} if o else {"sound": pick_sound(s["family"])})})
    versions = seg.setdefault("versions", [])
    current = next((x for x in log["beats"] if x.get("segmentId") == seg["id"]), None)
    if current and not versions:      # a timeline item from before versions were kept: keep it restorable
        versions.append({"v": 1, "at": now(), "source": (seg.get("decision") or {}).get("source") or "draft", "requestId": None, "beat": current,
                         "sfx": list(old.values()), "status": "built", "notes": "earlier timeline item (kept for restore)"})
    v = len(versions) + 1
    partial = any(not c["done"] for c in cov)
    candidate = copy.deepcopy(log)
    candidate["beats"] = sorted([x for x in candidate["beats"] if x.get("segmentId") != seg["id"]] + [beat], key=lambda x: x["at"])
    candidate["sfx"] = [s for s in candidate["sfx"] if s.get("segmentId") != seg["id"]] + sfx
    # an edit is only done when it is in the Remotion composition and renders: still + clip of the candidate timeline
    print(f"rendering {seg['id']} v{v} with Remotion (still + clip)...")
    try:
        still, clip, landed = render_version(app, slug, candidate, beat, v)
    except SystemExit as e:
        raise SystemExit(f"Remotion could not render it ({e}); nothing was written; {r['id']} is still {r['status']}. Fix the component and run built again.")
    print(f"rendered: still frame {landed} -> {still}; clip -> {clip}")
    log["beats"], log["sfx"] = candidate["beats"], candidate["sfx"]
    versions.append({"v": v, "at": now(), "source": "revision" if r["type"] == "revision" else ((seg.get("decision") or {}).get("source") or "claude"),
                     "requestId": r["id"], "beat": beat, "sfx": sfx, "status": "partial" if partial else "built", "notes": data.get("notes", ""),
                     "coverage": cov, "match": match, "compare": pv[-1]["sheet"], **({"still": still} if still else {}), **({"clip": clip} if clip else {})})
    seg["beatId"], seg["activeVersion"], seg["review"] = beat["id"], v, None
    done = sum(c["done"] for c in cov)
    set_status(r, "partial" if partial else "completed", result=f"v{v} built ({beat['kind']}, {chk['window']['start']:.2f}-{chk['window']['end']:.2f} s), {done}/{len(cov)} items done")
    save(app, slug, log)
    print(f"{r['id']} {r['status']}: {r['result']}")
    if partial:
        print("NOTE  PARTIAL - not done: " + "; ".join(f"{c['item']} ({c.get('why')})" for c in cov if not c["done"]))
    missing = [s["id"] for s in sfx if not s.get("sound")]
    if missing:
        print(f"NOTE  {len(missing)} sound effect(s) have no sound assigned (the library has no fitting indexed sound): {', '.join(missing)}")


def cmd_review(app, slug, a):
    log = load(app, slug)
    seg = seg_by_id(log, a.segment)
    if a.approve == bool(a.changes):
        raise SystemExit("use exactly one of --approve or --changes \"<feedback>\"")
    if a.approve:
        if not seg.get("activeVersion"):
            raise SystemExit(f"{seg['id']} has no built animation to approve")
        seg["review"] = {"status": "approved", "version": seg["activeVersion"], "at": now(), **({"note": a.note} if a.note else {})}
        save(app, slug, log)
        print(f"{seg['id']} v{seg['activeVersion']} approved")
        return
    if not a.changes.strip():
        raise SystemExit("--changes needs the user's feedback")
    earlier = []
    for r in open_requests(log, seg["id"], ("revision",)):
        earlier.append(r["brief"].get("feedback"))
        set_status(r, "cancelled", result="merged into a newer revision request")
    cur = next((x for x in log["beats"] if x.get("segmentId") == seg["id"]), None)
    d = seg.get("decision") or {}
    pool = seg.get("drafts") if d.get("source") == "draft" else seg.get("concepts")
    req = new_request(log, "revision", seg, feedback=a.changes, earlierFeedback=earlier, version=seg.get("activeVersion"), currentBeat=cur,
                      choice=d.get("choice"), custom=d.get("custom"), concept=(pool or {}).get(d.get("choice")) if d.get("choice") in OPTIONS else None,
                      combine=d.get("combine"), basedOn=d.get("basedOn"), refs=d.get("refs"), uploads=d.get("uploads"),
                      attachments=d.get("attachments"), excluded=d.get("excluded"), hints=d.get("hints"))
    seg["review"] = {"status": "changes-requested", "version": seg.get("activeVersion"), "at": now(), "note": a.changes}
    save(app, slug, log)
    print(f"{req['id']} pending: revision of {seg['id']} v{seg.get('activeVersion')} - \"{a.changes}\"")


def cmd_plan_approve(app, slug, a):
    """Scene Planning: the user approved these scene plans -> one build request per scene for Claude Code."""
    log = load(app, slug)
    if not a.quote or len(a.quote.strip()) < 2:
        raise SystemExit("--quote must contain the user's words (or the Studio's record of their click)")
    made = []
    for sid in [x.strip() for x in a.segments.split(",") if x.strip()]:
        m = seg_by_id(log, sid)
        if not scene_type(m) or m.get("type") == "sound":
            raise SystemExit(f"{sid}: choose a scene type first")
        if not (m.get("onScreen") or "").strip() and not m.get("decision"):
            raise SystemExit(f"{sid}: describe what happens on screen first (or choose A/B/C/D)")
        if (m.get("plan") or {}).get("status") == "approved":
            print(f"{sid}: plan already approved, not duplicated")
            continue
        for r in open_requests(log, sid, ("implement", "revision")):
            set_status(r, "cancelled", result="superseded by the approved scene plan")
        m["plan"] = {"status": "approved", "approvedAt": now(), "via": "plan", "quote": a.quote.strip()}
        d = m.get("decision") or {}
        extra = {"choice": d.get("choice") if d.get("choice") in ("A", "B", "C", "D") else None}
        if d.get("choice") in OPTIONS:
            pool = m.get("drafts") if d.get("source") == "draft" else m.get("concepts")
            extra.update(conceptSet=d.get("source"), concept=(pool or {}).get(d["choice"]))
        elif d.get("choice") == "D":
            extra.update(custom=d.get("custom"), combine=d.get("combine"), basedOn=d.get("basedOn"), refs=d.get("refs"), uploads=d.get("uploads"),
                         attachments=d.get("attachments"), excluded=d.get("excluded"), hints=d.get("hints"))
        req = new_request(log, "implement", m, **extra)
        if d.get("choice"):
            d["requestId"] = req["id"]
        made.append(f"{sid} -> {req['id']}")
    save(app, slug, log)
    print("scene plans approved: " + (", ".join(made) if made else "nothing new") + ("  (build requests pending for Claude Code)" if made else ""))


def cmd_restore(app, slug, a):
    log = load(app, slug)
    seg = seg_by_id(log, a.segment)
    ver = next((v for v in seg.get("versions", []) if v["v"] == a.version), None)
    if not ver:
        raise SystemExit(f"{seg['id']} has no version {a.version}")
    log["beats"] = sorted([x for x in log["beats"] if x.get("segmentId") != seg["id"]] + [copy.deepcopy(ver["beat"])], key=lambda x: x["at"])
    log["sfx"] = [s for s in log["sfx"] if s.get("segmentId") != seg["id"]] + copy.deepcopy(ver["sfx"])
    seg["beatId"], seg["activeVersion"], seg["review"] = ver["beat"]["id"], ver["v"], None
    save(app, slug, log)
    print(f"{seg['id']}: v{ver['v']} restored on the timeline (other items unchanged)")


def cmd_asset(app, slug, a):
    """The user's 3D / realistic asset for a scene: copied into public/projects/<slug>/assets (the original is never touched)."""
    import shutil
    import subprocess
    log = load(app, slug)
    seg = seg_by_id(log, a.segment)
    src = Path(a.file).expanduser()
    if not src.is_file():
        raise SystemExit(f"{src}: file not found")
    ext = src.suffix.lower()
    if ext not in IMG_EXT + VID_EXT:
        raise SystemExit(f"{src.name}: use a PNG/WebP (transparent background) or JPG image, or a WebM (with alpha), MP4 or MOV video")
    needs, _ = asset_needs(log, seg)
    have = seg.setdefault("assets", {})
    nid = a.need or next(f"U{i}" for i in range(1, 1000) if f"U{i}" not in have)
    if not ASSET_ID.match(nid):
        raise SystemExit("--need: letters, digits, - and _ only (e.g. A1)")
    if a.need and needs and nid not in {n["id"] for n in needs} and not re.match(r"^U\d+$", nid):
        print(f"WARN  {nid} is not one of the concept's asset needs ({', '.join(n['id'] for n in needs)}); stored as the user's own asset")
    out_dir = app / "public" / "projects" / slug / "assets"
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = re.sub(r"[^\w.-]+", "_", src.stem)[:60]
    if ext == ".mov":
        # ProRes / MOV does not play in the browser Player: a WebM with alpha (VP9) keeps transparency and plays everywhere
        dest = out_dir / f"{seg['id']}_{nid}_{stem}.webm"
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "22",
                            "-auto-alt-ref", "0", "-an", str(dest)], capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(f"could not convert {src.name} to WebM: {r.stderr[-500:]}")
    else:
        dest = out_dir / f"{seg['id']}_{nid}_{stem}{ext}"
        shutil.copy2(src, dest)
    old = have.get(nid)
    if old and Path(app / "public" / old["file"]) != dest:
        (app / "public" / old["file"]).unlink(missing_ok=True)
    what = next((n["what"] for n in needs if n["id"] == nid), None)
    have[nid] = {"file": f"projects/{slug}/assets/{dest.name}", "name": src.name, "kind": "video" if dest.suffix in VID_EXT else "image", "at": now(),
                 **({"what": what} if what else {}), **({"note": a.note} if a.note else {})}
    save(app, slug, log)
    _, missing = asset_needs(log, seg)
    print(f"{seg['id']} asset {nid}: {src.name} -> {have[nid]['file']}" + (f"  (still missing: {', '.join(missing)})" if missing else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["init", "analyze", "propose", "decide", "approve", "feedback", "status", "storyboard",
                                    "request", "pending", "show", "claim", "preview", "built", "fail", "cancel", "review", "restore", "plan-approve", "asset",
                                    "ask-background", "done", "ask-analysis"])
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--file"); ap.add_argument("--moments"); ap.add_argument("--choice")
    ap.add_argument("--set", choices=["claude", "draft"], default="claude", help="decide: which A/B/C (Claude Concepts; Quick Drafts are chosen in the Studio)")
    ap.add_argument("--custom"); ap.add_argument("--combine"); ap.add_argument("--based-on"); ap.add_argument("--refs"); ap.add_argument("--uploads")
    ap.add_argument("--attachments-file", help="JSON snapshot of the effective references (written by the Studio)")
    ap.add_argument("--ref", help="ask-analysis: the reference (ONS-024, MY-003, a file path or a link)")
    ap.add_argument("--refresh", action="store_true", help="ask-analysis: measure again (earlier observations move to its history)")
    ap.add_argument("--reference-image")
    ap.add_argument("--quote"); ap.add_argument("--note"); ap.add_argument("--scope")
    ap.add_argument("--gate", choices=GATES); ap.add_argument("--change", action="append")
    ap.add_argument("--require", choices=GATES, help="status: exit 1 unless this gate is approved")
    ap.add_argument("--request"); ap.add_argument("--segment"); ap.add_argument("--segments"); ap.add_argument("--reason"); ap.add_argument("--version", type=int)
    ap.add_argument("--approve", action="store_true"); ap.add_argument("--changes")
    ap.add_argument("--need", help="asset: the concept's asset id (A1...); omit for the user's own asset (U1...)")
    ap.add_argument("--json", action="store_true", help="show: also print the brief as JSON")
    ap.add_argument("--app"); ap.add_argument("--work")
    a = ap.parse_args()
    app = V.find_app(a.app)
    if a.cmd not in ("pending", "status") and not a.slug:
        sys.exit(f"{a.cmd}: project slug required")
    if a.cmd in ("analyze", "propose", "preview", "built", "asset") and not a.file:
        sys.exit("--file required")
    if a.cmd == "decide" and not (a.moments and a.choice):
        sys.exit("--moments and --choice required")
    if a.cmd == "approve" and not a.gate:
        sys.exit("--gate required")
    if a.cmd in ("show", "claim", "preview", "built", "fail", "cancel", "done") and not a.request:
        sys.exit("--request REQ-#### required")
    if a.cmd in ("request", "review", "restore", "asset", "ask-background", "ask-analysis") and not a.segment:
        sys.exit("--segment required")
    if a.cmd == "plan-approve" and not a.segments:
        sys.exit("--segments S01,S02 required")
    if a.cmd == "restore" and not a.version:
        sys.exit("--version required")
    {"init": cmd_init, "analyze": cmd_analyze, "propose": cmd_propose, "decide": cmd_decide, "approve": cmd_approve,
     "feedback": cmd_feedback, "status": cmd_status, "storyboard": cmd_storyboard, "request": cmd_request, "pending": cmd_pending,
     "show": cmd_show, "claim": cmd_claim, "preview": cmd_preview, "built": cmd_built, "fail": cmd_fail,
     "cancel": lambda ap_, s, x: cmd_fail(ap_, s, x, status="cancelled"), "review": cmd_review, "restore": cmd_restore,
     "plan-approve": cmd_plan_approve, "asset": cmd_asset, "ask-background": cmd_ask_background, "done": cmd_done, "ask-analysis": cmd_ask_analysis}[a.cmd](app, a.slug, a)


if __name__ == "__main__":
    main()
