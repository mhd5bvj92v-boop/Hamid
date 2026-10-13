#!/usr/bin/env python3
"""Creative decisions in the project file (Creative Director workflow, references/creative-director.md).

Everything lives in ONE document, the same one the Remotion Player, the Studio and the final renderer
use: remotion-app/src/projects/<slug>/edit.json (segments, concepts, decisions, approvals, feedback).
CREATIVE-LOG.md next to it is generated from it for reading.

  edit_decisions.py analyze <slug> --file analysis.json    # Phase 1: segments (moments) + keep-visible
  edit_decisions.py propose <slug> --file proposals.json   # Phase 2: A/B/C per segment (a repeat = new round)
  edit_decisions.py decide <slug> --moments S01,S03 --choice A [--quote "..."]
  edit_decisions.py decide <slug> --moments S02 --choice D --custom "..." [--combine A,C] [--quote "..."]
  edit_decisions.py decide <slug> --moments S04 --choice none --quote "keep me on camera there"
  edit_decisions.py approve <slug> --gate direction|preview|final --quote "<the user's own words>"
  edit_decisions.py feedback <slug> --quote "..." --change "S03: slower entrance" [--change ...]
  edit_decisions.py status <slug> [--require final]
  edit_decisions.py storyboard <slug>                      # concise grouped storyboard -> work/<slug>/plan/storyboard.md

analysis.json:  {"moments": [{"id": "S01", "start": 0.4, "end": 2.9, "text": "<exact words from the user's script>",
                              "type": "text|onscreen|fullscreen|sound", "section": "Hook", "why": "...", "major": true,
                              "recommend": "visual" | "keep-visible"}],
                 "keep_visible": [{"in": 18.0, "out": 24.5, "why": "personal story: the face carries it"}]}
proposals.json: {"moments": {"S01": {"recommend": "B", "options": {
                    "A": {"title": "...", "system": "C", "kind": "HorizonTitle", "props": {...}, "refs": ["FUL-002"],
                          "family": "HORIZON-ARC", "description": "...", "motion": "...", "sound": "..."},
                    "B": {...}, "C": {...}}}}}

Approvals are recorded ONLY when the user has explicitly said so; --quote must hold their words.
Gates: 'direction' needs every major segment decided; 'preview' needs 'direction'; 'final' needs
'direction' and at least one 'preview' approval. edit_render.py picture and the Studio's final export
refuse to render, and edit_qc.py fails the export, without the 'final' approval.
"""
import argparse
import datetime
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vedit as V  # noqa: E402

OPTIONS = ("A", "B", "C")
GATES = ("direction", "preview", "final")


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
    jp, _ = log_paths(app, slug)
    if not jp.exists():
        raise SystemExit(f"{jp} missing - run edit_init.py first")
    doc = json.loads(jp.read_text())
    doc.setdefault("segments", []); doc.setdefault("approvals", []); doc.setdefault("feedback", []); doc.setdefault("keepVisible", [])
    return doc


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
    if any(m.get("concepts") for m in log["segments"]):
        return "2/3-options-and-approval"
    if log["segments"]:
        return "1-analyzed"
    return "0-intake"


def save(app, slug, log):
    jp, mp = log_paths(app, slug)
    log["phase"] = phase_of(log)
    log["updated"] = now()
    jp.write_text(json.dumps(log, indent=1, ensure_ascii=False) + "\n")
    mp.write_text(render_md(log))


def render_md(log):
    src = log["source"]
    L = [f"# Creative decision log: {log['slug']}", "",
         f"Creative Director: the user. Generated from `edit.json` (the project file the Studio, the Remotion Player and the renderer use).",
         f"Source: `{Path(src.get('src', '')).name}` ({src['sourceDurationSeconds']:.2f} s, {src['fps']} fps; timeline preserved, never cut).",
         f"Phase: **{log['phase']}**. Updated {log['updated']}.", ""]
    L += ["## Approvals", ""]
    L += [f"- **{a['gate']}** ({a['at']}): \"{a['quote']}\"" for a in log["approvals"]] or ["- none yet"]
    L += ["", "## Segments", "", "| Segment | Time | Spoken text | Type | Decision | User |", "|---|---|---|---|---|---|"]
    for m in log["segments"]:
        d = m.get("decision") or {}
        choice = d.get("choice", "open")
        if choice in OPTIONS and m.get("concepts", {}).get(choice):
            o = m["concepts"][choice]
            choice = f"{choice}: {o['title']} ({', '.join(o['refs'])})"
        elif choice == "D":
            choice = f"D (own idea): {d.get('custom', '')}" + (f" [combines {'+'.join(d['combine'])}]" if d.get("combine") else "")
        elif choice == "none":
            choice = "keep visible (no visual)"
        said = '"' + d["quote"] + '"' if d.get("quote") else ""
        text = m.get("text", "")[:60]
        L.append(f'| {m["id"]} | {tc(m.get("start"))}-{tc(m.get("end"))} | "{text}" | {m.get("type", "")} | {choice} | {said} |')
    if log.get("keepVisible"):
        L += ["", "## Deliberately kept on camera", ""] + [f"- {tc(k['in'])}-{tc(k['out'])}: {k['why']}" for k in log["keepVisible"]]
    L += ["", "## Proposed concepts (all rounds)", ""]
    for m in log["segments"]:
        rounds = [{"round": h["round"], "concepts": h["concepts"]} for h in m.get("history", [])]
        if m.get("concepts"):
            rounds.append({"round": m.get("round", 1), "concepts": m["concepts"]})
        for rnd in rounds:
            L.append(f"**{m['id']} round {rnd['round']}**")
            for k in OPTIONS:
                o = rnd["concepts"].get(k)
                if o:
                    L.append(f"- {k} — {o['title']} [{o['system']} · {o.get('kind', 'sound')} · {', '.join(o['refs'])} · {o.get('author', 'claude')}]: {o['description']}")
            L.append("")
    if log["feedback"]:
        L += ["## Feedback rounds", ""]
        for i, f in enumerate(log["feedback"], 1):
            L.append(f"{i}. ({f['at']}) \"{f['quote']}\"")
            L += [f"   - {c}" for c in f["changes"]]
    return "\n".join(L) + "\n"


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
        keep = known.get(m["id"], {"concepts": {}, "history": [], "round": 0, "decision": None, "beatId": None, "requests": [], "transcriptIds": []})
        keep.update({"id": m["id"], "start": start, "end": end, "text": text, "type": m.get("type", keep.get("type", "text")),
                     "major": bool(m.get("major", True)), "recommendVisual": m.get("recommend", "visual"), "why": m["why"],
                     "section": m.get("section", keep.get("section"))})
        known[m["id"]] = keep
    log["segments"] = sorted(known.values(), key=lambda m: m["start"])
    log["keepVisible"] = data.get("keep_visible", log["keepVisible"])
    save(app, slug, log)
    print(f"analysis recorded: {len(log['segments'])} segments ({sum(m['major'] for m in log['segments'])} major), "
          f"{len(log['keepVisible'])} keep-visible stretches")


def check_options(mid, opts, lib):
    errs, warns = [], []
    for k in OPTIONS:
        o = opts.get(k)
        if not o:
            errs.append(f"{mid}: option {k} missing (always present A, B and C; D is the user's own idea)")
            continue
        for f in ("title", "system", "description"):
            if not o.get(f):
                errs.append(f"{mid}:{k} missing {f}")
        if o.get("system") != "D" and not o.get("refs"):
            errs.append(f"{mid}:{k} lists no reference IDs (visual concepts must be grounded in the library)")
        bad = [r for r in o.get("refs", []) if r not in lib]
        if bad:
            errs.append(f"{mid}:{k} unknown reference IDs {bad} (concepts must be grounded in the library)")
        if o.get("system") not in ("A", "B", "C", "D"):
            errs.append(f"{mid}:{k} system must be A (on-screen), B (text), C (full-screen) or D (sound)")
    if errs:
        return errs, warns
    # genuinely different: no two options may share system + kind + primary reference,
    # and the three should not all come from one style family
    sig = {k: (opts[k]["system"], opts[k].get("kind"), (opts[k].get("refs") or [None])[0],
               json.dumps(opts[k].get("props") or opts[k].get("sfx"), sort_keys=True)) for k in OPTIONS}
    for i, x in enumerate(OPTIONS):
        for y in OPTIONS[i + 1:]:
            if sig[x] == sig[y]:
                errs.append(f"{mid}: options {x} and {y} are the same idea (same system, kind and primary reference)")
            if opts[x]["description"].strip().lower() == opts[y]["description"].strip().lower():
                errs.append(f"{mid}: options {x} and {y} have the same description")
    fams = {opts[k].get("family") or (lib[opts[k]["refs"][0]]["family"] if opts[k].get("refs") else "SOUND") for k in OPTIONS}
    systems = {opts[k]["system"] for k in OPTIONS}
    if len(fams) == 1 and len(systems) == 1:
        warns.append(f"{mid}: all three options share one system and one style family - make them more distinct")
    return errs, warns


def cmd_propose(app, slug, a):
    log = load(app, slug)
    lib = library_ids()
    data = json.loads(Path(a.file).read_text())
    by_id = {m["id"]: m for m in log["segments"]}
    errs, warns = [], []
    for mid, p in data["moments"].items():
        if mid not in by_id:
            errs.append(f"{mid}: not a segment (run analyze or select it in the Studio first)")
            continue
        e, w = check_options(mid, p.get("options", {}), lib)
        errs += e
        warns += w
    for w in warns:
        print("WARN ", w)
    if errs:
        for e in errs:
            print("ERROR", e)
        raise SystemExit(1)
    replaced = False
    for mid, p in data["moments"].items():
        m = by_id[mid]
        if m.get("concepts"):
            m.setdefault("history", []).append({"round": m.get("round", 1), "concepts": m["concepts"], "replaced": now()})
            m["round"] = m.get("round", 1) + 1
            m["decision"] = None
            replaced = True
        else:
            m["round"] = 1
        m["concepts"] = {k: {"author": "claude", **p["options"][k]} for k in OPTIONS}
        m["recommend"] = p.get("recommend")
        m["requests"] = []
    if replaced and approved(log, "direction"):
        log["approvals"] = [x for x in log["approvals"] if x["gate"] not in ("direction", "preview", "final")]
        print("NOTE  new concepts replace earlier ones: the direction approval was withdrawn and must be given again")
    save(app, slug, log)
    print(f"proposals recorded for {', '.join(data['moments'])} (A/B/C + D = the user's own idea)")


def cmd_decide(app, slug, a):
    log = load(app, slug)
    ids = [x.strip() for x in a.moments.split(",") if x.strip()]
    by_id = {m["id"]: m for m in log["segments"]}
    choice = a.choice.upper() if a.choice.lower() != "none" else "none"
    if choice not in ("A", "B", "C", "D", "none"):
        raise SystemExit("--choice must be A, B, C, D or none")
    if choice == "D" and not a.custom:
        raise SystemExit("--choice D needs --custom with the user's own idea (their description, combination, typography, reference, colours, camera, timing...)")
    for mid in ids:
        if mid not in by_id:
            raise SystemExit(f"unknown moment {mid}")
        m = by_id[mid]
        if choice in OPTIONS and not m.get("concepts", {}).get(choice):
            raise SystemExit(f"{mid}: no concepts proposed yet")
        m["decision"] = {"choice": choice, "round": m.get("round"), "decided": now(), "quote": a.quote, "note": a.note or "",
                         **({"custom": a.custom} if a.custom else {}),
                         **({"combine": [c.strip().upper() for c in a.combine.split(",")]} if a.combine else {}),
                         **({"reference_image": a.reference_image} if a.reference_image else {})}
    save(app, slug, log)
    print(f"decided {', '.join(ids)}: {choice}" + (f" ({a.custom})" if a.custom else ""))


def cmd_approve(app, slug, a):
    log = load(app, slug)
    if not a.quote or len(a.quote.strip()) < 2:
        raise SystemExit("--quote must contain the user's own words of approval")
    open_major = [m["id"] for m in log["segments"] if m.get("major") and not m.get("decision")]
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


def cmd_status(app, slug, a):
    log = load(app, slug)
    print(f"{slug}: phase {log['phase']}")
    undecided = [m["id"] for m in log["segments"] if m.get("major") and not m.get("decision")]
    unproposed = [m["id"] for m in log["segments"] if m.get("major") and m.get("recommendVisual") != "keep-visible" and not m.get("concepts")]
    print(f"  segments: {len(log['segments'])}  without concepts: {unproposed or '-'}  undecided: {undecided or '-'}  beats: {len(log.get('beats', []))}")
    # work the Studio leaves for Claude (written there by the user)
    for m in log["segments"]:
        for r in m.get("requests") or []:
            print(f"  REQUEST  {m['id']} {tc(m['start'])}-{tc(m['end'])} ({r['at']}): {r['note']}  -> author three new concepts (propose)")
        cs = m.get("concepts") or {}
        if cs and all(c.get("author") == "draft" for c in cs.values()):
            print(f"  DRAFTS   {m['id']}: only the Studio's library drafts so far -> Claude's own A/B/C still to propose")
        d = m.get("decision") or {}
        if d.get("choice") == "D" and not m.get("beatId"):
            print(f"  BUILD D  {m['id']}: the user's own idea is not on the timeline yet: \"{d.get('custom', '')}\"")
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
                    L.append(f"  - **{k}** {o['title']}: {o['description']} [{', '.join(o['refs'])}]")
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


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["init", "analyze", "propose", "decide", "approve", "feedback", "status", "storyboard"])
    ap.add_argument("slug")
    ap.add_argument("--file"); ap.add_argument("--moments"); ap.add_argument("--choice")
    ap.add_argument("--custom"); ap.add_argument("--combine"); ap.add_argument("--reference-image")
    ap.add_argument("--quote"); ap.add_argument("--note"); ap.add_argument("--scope")
    ap.add_argument("--gate", choices=GATES); ap.add_argument("--change", action="append")
    ap.add_argument("--require", choices=GATES, help="status: exit 1 unless this gate is approved")
    ap.add_argument("--app"); ap.add_argument("--work")
    a = ap.parse_args()
    app = V.find_app(a.app)
    if a.cmd in ("analyze", "propose") and not a.file:
        sys.exit("--file required")
    if a.cmd == "decide" and not (a.moments and a.choice):
        sys.exit("--moments and --choice required")
    if a.cmd == "approve" and not a.gate:
        sys.exit("--gate required")
    {"init": cmd_init, "analyze": cmd_analyze, "propose": cmd_propose, "decide": cmd_decide, "approve": cmd_approve,
     "feedback": cmd_feedback, "status": cmd_status, "storyboard": cmd_storyboard}[a.cmd](app, a.slug, a)


if __name__ == "__main__":
    main()
