#!/usr/bin/env python3
"""Creative decision log for the Creative Director workflow (references/creative-director.md).

The user is the Creative Director. Claude proposes, the user decides, and every decision and
approval is recorded here, per project, next to the editable Remotion source (committed to git):
  remotion-app/src/projects/<slug>/creative-log.json   (source of truth)
  remotion-app/src/projects/<slug>/CREATIVE-LOG.md     (generated, readable)

  edit_decisions.py init <slug>                            # done by edit_init.py
  edit_decisions.py analyze <slug> --file analysis.json    # Phase 1: transcript, moments, keep-visible
  edit_decisions.py propose <slug> --file proposals.json   # Phase 2: A/B/C per moment (a repeat = new round)
  edit_decisions.py decide <slug> --moments M01,M03 --choice A [--quote "..."]
  edit_decisions.py decide <slug> --moments M02 --choice D --custom "..." [--combine A,C] [--quote "..."]
  edit_decisions.py decide <slug> --moments M04 --choice none --quote "keep me on camera there"
  edit_decisions.py approve <slug> --gate direction|preview|final --quote "<the user's own words>"
  edit_decisions.py feedback <slug> --quote "..." --change "M03: slower entrance" [--change ...]
  edit_decisions.py status <slug>                          # phase, open decisions, gates (exit 1 if a gate is open)
  edit_decisions.py storyboard <slug>                      # concise grouped storyboard -> work/<slug>/plan/storyboard.md

analysis.json:  {"transcript": "work/<slug>/plan/transcript.md", "notes": "...",
                 "moments": [{"id": "M01", "in": 0.4, "out": 2.9, "words": "...", "section": "Hook", "why": "...",
                              "major": true, "recommend": "visual" | "keep-visible"}],
                 "keep_visible": [{"in": 18.0, "out": 24.5, "why": "personal story: the face carries it"}]}
proposals.json: {"moments": {"M01": {"recommend": "B", "options": {
                    "A": {"title": "...", "system": "C", "kind": "HorizonTitle", "refs": ["FUL-002"], "family": "HORIZON-ARC",
                          "description": "...", "motion": "...", "sound": "...", "preview": "work/<slug>/previews/M01.png"},
                    "B": {...}, "C": {...}}}}}

Approvals are recorded ONLY when the user has explicitly said so; --quote must hold their words.
Gates: 'direction' needs every major moment decided; 'preview' needs 'direction'; 'final' needs
'direction' and at least one 'preview' approval. edit_render.py picture refuses to render the final
full-resolution picture, and edit_qc.py fails the export, without the 'final' approval.
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
    return d / "creative-log.json", d / "CREATIVE-LOG.md"


def load(app, slug):
    jp, _ = log_paths(app, slug)
    if not jp.exists():
        raise SystemExit(f"{jp} missing - run: edit_decisions.py init {slug}")
    return json.loads(jp.read_text())


def library_ids():
    data = json.loads((V.SKILL_ROOT / "data" / "references.json").read_text())
    return {r["id"]: r for r in data["references"]}


def approved(log, gate):
    return any(a["gate"] == gate for a in log["approvals"])


def phase_of(log):
    if approved(log, "final"):
        return "5-final-approved"
    if approved(log, "preview") or log["feedback"]:
        return "4-animation-preview"
    if approved(log, "direction"):
        return "4-animation-preview"
    if any(m.get("options") for m in log["moments"]):
        return "2/3-options-and-approval"
    if log["moments"]:
        return "1-analyzed"
    return "0-intake"


def save(app, slug, log):
    jp, mp = log_paths(app, slug)
    log["phase"] = phase_of(log)
    log["updated"] = now()
    jp.write_text(json.dumps(log, indent=1, ensure_ascii=False) + "\n")
    mp.write_text(render_md(log))


def render_md(log):
    L = [f"# Creative decision log: {log['slug']}", "",
         f"Creative Director: the user. Source: `{Path(log['source']['path']).name}` "
         f"({log['source']['duration']:.2f} s, {log['source']['fps']} fps; timeline preserved, never cut).",
         f"Phase: **{log['phase']}**. Updated {log['updated']}.", ""]
    L += ["## Approvals", ""]
    if log["approvals"]:
        L += [f"- **{a['gate']}** ({a['at']}): \"{a['quote']}\"" for a in log["approvals"]]
    else:
        L += ["- none yet"]
    L += ["", "## Moments", "", "| Moment | Time | Words | Decision | Notes |", "|---|---|---|---|---|"]
    for m in log["moments"]:
        d = m.get("decision") or {}
        choice = d.get("choice", "open")
        if choice in OPTIONS and m.get("options"):
            o = m["options"][choice]
            choice = f"{choice}: {o['title']} ({', '.join(o['refs'])})"
        elif choice == "D":
            choice = f"D (own idea): {d.get('custom', '')}" + (f" [combines {'+'.join(d['combine'])}]" if d.get("combine") else "")
        elif choice == "none":
            choice = "keep visible (no visual)"
        said = 'user: "' + d["quote"] + '"' if d.get("quote") else ""
        words = m.get("words", "")[:60]
        L.append(f'| {m["id"]} | {tc(m.get("in"))}-{tc(m.get("out"))} | "{words}" | {choice} | {said} {d.get("note", "")} |')
    if log.get("keep_visible"):
        L += ["", "## Deliberately kept on camera", ""] + [f"- {tc(k['in'])}-{tc(k['out'])}: {k['why']}" for k in log["keep_visible"]]
    L += ["", "## Proposed concepts (all rounds)", ""]
    for m in log["moments"]:
        for rnd in m.get("history", []) + ([{"round": m["round"], "options": m["options"]}] if m.get("options") else []):
            L.append(f"**{m['id']} round {rnd['round']}**")
            for k in OPTIONS:
                o = rnd["options"][k]
                L.append(f"- {k} — {o['title']} [{o['system']} · {o.get('kind', '?')} · {', '.join(o['refs'])}]: {o['description']}")
            L.append("")
    if log["feedback"]:
        L += ["## Feedback rounds", ""]
        for i, f in enumerate(log["feedback"], 1):
            L.append(f"{i}. ({f['at']}) \"{f['quote']}\"")
            L += [f"   - {c}" for c in f["changes"]]
    return "\n".join(L) + "\n"


def cmd_init(app, slug, a):
    jp, _ = log_paths(app, slug)
    pj = V.load_project(app, slug, a.work)
    if jp.exists():
        print(f"creative log exists: {jp}")
        return
    log = {"slug": slug, "created": now(), "creative_director": "user",
           "source": {"path": pj["source"]["path"], "sha256": pj["source"]["sha256"], "duration": pj["source"]["probe"]["duration"],
                      "fps": pj["approved"]["fps"]},
           "transcript": None, "notes": "", "moments": [], "keep_visible": [], "approvals": [], "feedback": []}
    save(app, slug, log)
    print(f"creative log created: {jp}")


def cmd_analyze(app, slug, a):
    log = load(app, slug)
    data = json.loads(Path(a.file).read_text())
    dur = log["source"]["duration"]
    known = {m["id"]: m for m in log["moments"]}
    for m in data.get("moments", []):
        for k in ("id", "in", "out", "words", "why"):
            if m.get(k) in (None, ""):
                raise SystemExit(f"moment {m.get('id')}: missing {k}")
        if not (0 <= m["in"] < m["out"] <= dur + 1e-6):
            raise SystemExit(f"moment {m['id']}: {m['in']}-{m['out']} is outside the source (0-{dur:.2f} s)")
        keep = known.get(m["id"], {})
        merged = {**keep, **m, "major": bool(m.get("major", True)), "recommend": m.get("recommend", "visual")}
        known[m["id"]] = merged
    log["moments"] = sorted(known.values(), key=lambda m: m["in"])
    log["keep_visible"] = data.get("keep_visible", log["keep_visible"])
    log["transcript"] = data.get("transcript", log["transcript"])
    log["notes"] = data.get("notes", log["notes"])
    save(app, slug, log)
    print(f"analysis recorded: {len(log['moments'])} moments ({sum(m['major'] for m in log['moments'])} major), "
          f"{len(log['keep_visible'])} keep-visible stretches")


def check_options(mid, opts, lib):
    errs, warns = [], []
    for k in OPTIONS:
        o = opts.get(k)
        if not o:
            errs.append(f"{mid}: option {k} missing (always present A, B and C; D is the user's own idea)")
            continue
        for f in ("title", "system", "refs", "description"):
            if not o.get(f):
                errs.append(f"{mid}:{k} missing {f}")
        bad = [r for r in o.get("refs", []) if r not in lib]
        if bad:
            errs.append(f"{mid}:{k} unknown reference IDs {bad} (concepts must be grounded in the library)")
        if o.get("system") not in ("A", "B", "C"):
            errs.append(f"{mid}:{k} system must be A (on-screen), B (text) or C (full-screen)")
    if errs:
        return errs, warns
    # genuinely different: no two options may share system + kind + primary reference,
    # and the three should not all come from one style family
    sig = {k: (opts[k]["system"], opts[k].get("kind"), opts[k]["refs"][0]) for k in OPTIONS}
    for i, x in enumerate(OPTIONS):
        for y in OPTIONS[i + 1:]:
            if sig[x] == sig[y]:
                errs.append(f"{mid}: options {x} and {y} are the same idea (same system, kind and primary reference)")
            if opts[x]["description"].strip().lower() == opts[y]["description"].strip().lower():
                errs.append(f"{mid}: options {x} and {y} have the same description")
    fams = {opts[k].get("family") or lib[opts[k]["refs"][0]]["family"] for k in OPTIONS}
    systems = {opts[k]["system"] for k in OPTIONS}
    if len(fams) == 1 and len(systems) == 1:
        warns.append(f"{mid}: all three options share one system and one style family - make them more distinct")
    return errs, warns


def cmd_propose(app, slug, a):
    log = load(app, slug)
    lib = library_ids()
    data = json.loads(Path(a.file).read_text())
    by_id = {m["id"]: m for m in log["moments"]}
    errs, warns = [], []
    for mid, p in data["moments"].items():
        if mid not in by_id:
            errs.append(f"{mid}: not in the analysis (run analyze first)")
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
    for mid, p in data["moments"].items():
        m = by_id[mid]
        if m.get("options"):
            m.setdefault("history", []).append({"round": m["round"], "options": m["options"], "recommend": m.get("recommend_option"),
                                                "replaced": now()})
            m["round"] += 1
            m.pop("decision", None)
        else:
            m["round"] = 1
        m["options"] = {k: p["options"][k] for k in OPTIONS}
        m["recommend_option"] = p.get("recommend")
        m["proposed"] = now()
    # a new round invalidates an earlier direction approval
    if any(m.get("history") for m in log["moments"] if m["id"] in data["moments"]) and approved(log, "direction"):
        log["approvals"] = [x for x in log["approvals"] if x["gate"] not in ("direction", "preview", "final")]
        print("NOTE  new concepts replace earlier ones: the direction approval was withdrawn and must be given again")
    save(app, slug, log)
    print(f"proposals recorded for {', '.join(data['moments'])} (A/B/C + D = the user's own idea)")


def cmd_decide(app, slug, a):
    log = load(app, slug)
    ids = [x.strip() for x in a.moments.split(",") if x.strip()]
    by_id = {m["id"]: m for m in log["moments"]}
    choice = a.choice.upper() if a.choice.lower() != "none" else "none"
    if choice not in ("A", "B", "C", "D", "none"):
        raise SystemExit("--choice must be A, B, C, D or none")
    if choice == "D" and not a.custom:
        raise SystemExit("--choice D needs --custom with the user's own idea (their description, combination, typography, reference, colours, camera, timing...)")
    for mid in ids:
        if mid not in by_id:
            raise SystemExit(f"unknown moment {mid}")
        m = by_id[mid]
        if choice in OPTIONS and not m.get("options"):
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
    open_major = [m["id"] for m in log["moments"] if m.get("major") and not m.get("decision")]
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
    undecided = [m["id"] for m in log["moments"] if m.get("major") and not m.get("decision")]
    unproposed = [m["id"] for m in log["moments"] if m.get("major") and m.get("recommend") != "keep-visible" and not m.get("options")]
    print(f"  moments: {len(log['moments'])}  without concepts: {unproposed or '-'}  undecided: {undecided or '-'}")
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
    L = [f"## Storyboard: {slug} ({tc(0)}-{tc(log['source']['duration'])}, timeline unchanged)", ""]
    sections = {}
    for m in log["moments"]:
        sections.setdefault(m.get("section") or "Main", []).append(m)
    for name, ms in sections.items():
        L.append(f"### {name}")
        for m in ms:
            d = m.get("decision")
            rec = m.get("recommend_option")
            if m.get("recommend") == "keep-visible" and not m.get("options"):
                L.append(f"- **{m['id']} {tc(m['in'])}-{tc(m['out'])}** \"{m['words'][:70]}\": keep you on camera ({m['why']})")
                continue
            head = f"- **{m['id']} {tc(m['in'])}-{tc(m['out'])}** \"{m['words'][:70]}\""
            if d:
                L.append(f"{head}: decided **{d['choice']}**" + (f" ({d.get('custom')})" if d.get("custom") else ""))
                continue
            L.append(head + (f"  (recommended: **{rec}**)" if rec else ""))
            previews = []
            for k in OPTIONS:
                o = (m.get("options") or {}).get(k)
                if o:
                    L.append(f"  - **{k}** {o['title']}: {o['description']} [{', '.join(o['refs'])}]")
                    if o.get("preview") and o["preview"] not in previews:
                        previews.append(o["preview"])
            L.append("  - **D** your own idea · or ask for three new concepts")
            if previews:
                L.append("  - preview: " + ", ".join(f"`{Path(x).name}`" for x in previews))
        L.append("")
    if log.get("keep_visible"):
        L.append("### Kept on camera (no visuals)")
        L += [f"- {tc(k['in'])}-{tc(k['out'])}: {k['why']}" for k in log["keep_visible"]]
        L.append("")
    L.append("Reply per group, e.g. \"all recommended\", \"M01 B, M02-M04 A\", \"M05 D: ...\", or \"new concepts for M03\".")
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
