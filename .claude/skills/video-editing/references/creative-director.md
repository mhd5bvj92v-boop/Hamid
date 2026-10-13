# Creative Director Workflow (mandatory for every video)

**The user is the Creative Director of every video.** Claude is responsible for visual proposals, animation implementation, sound design and technical quality. The user decides the creative direction. Nothing is built for the final edit without their choice, and nothing is exported without their explicit approval.

Claude presents every option **directly in the conversation**. Remotion has no questionnaire or interactive chooser. It only renders the preview frames and motion previews that Claude shows alongside the options.

Every choice, round of concepts, piece of feedback and approval is recorded in the project's **creative decision log**: `remotion-app/src/projects/<slug>/creative-log.json` plus the readable `CREATIVE-LOG.md`, committed with the project's Remotion source, managed by `scripts/edit_decisions.py`.

| Phase | Claude does | The user does | Gate (recorded) |
|---|---|---|---|
| 1 Analyze | footage + dialogue analysis, timecoded transcript, candidate moments, where to stay on camera | – | `analyze` |
| 2 Options | A, B, C per major moment (+ D) with preview frames | chooses, writes D, or asks for new concepts | `propose`, `decide` |
| 3 Approval | concise grouped storyboard | approves the creative direction | **`direction`** |
| 4 Animation preview | builds in Remotion, motion previews with draft sound | feedback, change requests | **`preview`** |
| 5 Final render | full-resolution render, mix, QC, export | explicitly approves the edit | **`final`** |

The timeline rules in `SKILL.md` hold in every phase: the user's cut, pauses, reactions, dialogue and pacing never change.

---

## Phase 1: Analyze

When the user provides a pre-cut video:

1. **Intake:** `python3 scripts/edit_init.py <video> --slug <slug>`. This probes and hashes the original, links it (no copy), creates the Remotion project and starts the decision log.
2. **Look and listen.** Extract frames from the original (`compose.py frames`) and look at them: framing, where the face sits, gestures, grade, busy backgrounds. Read the whole dialogue.
3. **Timecoded transcript, when possible.** Use the user's transcript/SRT, or a local ASR with word timestamps if one is installed (check first; never promise one that isn't there). Write `work/<slug>/plan/transcript.md` with `[mm:ss.s]` per sentence (per word where available). Without ASR, say so and timecode by ear and waveform at sentence level.
4. **Find suitable moments** (`workflow.md` §2-3): numbers, names, lists, processes (A); hooks, rules, memorable phrases (B); abstract ideas, big numbers, section breaks (C).
5. **Decide where keeping the user visible is stronger:** emotional or personal lines, reactions, eye contact on a key promise, gestures that already show the idea, moments right after another visual. List these as *keep-visible* stretches with the reason. This is a recommendation the user sees, not a silent omission.
6. **Record it:** `edit_decisions.py analyze <slug> --file work/<slug>/plan/analysis.json` (moments with id, in/out, words, section, why, `major`, `recommend: visual | keep-visible`; plus the keep-visible stretches).

Major moments are the ones that get A/B/C options: every full-screen candidate, every on-screen visual, and the hook. Small connector captions or repeated house-style elements can be grouped (one decision for "all small captions in the body"). Don't create a question for every word.

## Phase 2: Present creative options

For **every major visual moment**, offer exactly:

- **A, Visual Concept 1**
- **B, Visual Concept 2**
- **C, Visual Concept 3**
- **D, My Own Idea**

**A, B and C must be genuinely different** and grounded in the reference library:
- each is built from 1-3 reference IDs whose images Claude has **opened** (Read) for this moment;
- together they differ in at least two of: system (on-screen beside the user / text / full-screen), style family, composition and placement, motion idea;
- at least one keeps the user visible (A or B system) when the moment allows it;
- each names its sound idea in one line (System D);
- no generic preset when the library has something more fitting.

`edit_decisions.py propose` rejects missing options, unknown reference IDs and two options that are the same idea. It warns when all three share one system and one family.

**D, the user's own idea**, lets the Creative Director:
- describe their own animation;
- combine A, B and C ("A's horizon with C's serif number");
- choose different typography;
- provide a new reference image (add it to the library with `ingest.py` if it should be reused);
- specify colours, camera movements, timing and transitions;
- request something completely different.

Record D faithfully (`decide --choice D --custom "<their idea>" [--combine A,C] [--reference-image path]`). If it is ambiguous, ask **one** focused question.

**Always offer three new concepts.** End every options message with the reminder that they can ask for three new concepts for any moment. A new round goes through `propose` again: the earlier concepts are archived in the log (`history`), the round number increases, and any earlier direction approval is withdrawn.

**Preview frames:** for major scenes (full-screen scenes, the hook, large overlays), build each concept as a renderable beat in `src/projects/<slug>/concepts.ts` and render real frames over the footage:

```bash
python3 scripts/edit_render.py concept-frames <slug> --moment M03            # A | B | C side by side, mid-moment
python3 scripts/edit_render.py concept-frames <slug> --moment M03 --sequence # in / landed / before exit
```

Send the sheet to the user (attach the image) with the options. When a concept needs a component that doesn't exist yet, say so and show the closest reference images instead, or a still of a rough version.

### How to present a moment (in chat)

```
M03 · 00:12.0–00:14.8 · "we've helped over 300 businesses"        (recommended: A)
A — Horizon number: full-screen planet horizon, 300 rises out of the atmosphere (FUL-002 · HORIZON-ARC · 2.6 s cover; riser + hit)
B — Stat card beside you: glass card, curve draws to a peak, 300 counts up; you stay visible (ONS-024 · LIVE-UI; sci-fi impact)
C — Serif number: amber italic "300" with "businesses helped" under your chin (TXT-003 · SERIF-ACCENT; one pop)
D — Your own idea: describe it, combine A–C, change type, colours, camera, timing or transitions, send a reference, or ask for something else
Preview: M03_r1_concepts.png · Say "new concepts for M03" for three fresh options.
```

## Phase 3: Approval

1. **Concise timecoded storyboard:** `edit_decisions.py storyboard <slug>` writes `work/<slug>/plan/storyboard.md`, grouped by section (hook, body sections, payoff), with the recommended option per moment and the keep-visible stretches. Paste it (or a tighter version) into the chat with the preview sheets.
2. **Group decisions** so several scenes can be approved at once: "all recommended", "M01 B, M02–M04 A", "M05 D: …". Repeated house-style items (small captions, name super, music on or off) are one decision each.
3. **Don't overwhelm.** No questions about single words, easing curves, exact frames, dB values or render settings. Claude decides those technical details by the skill's rules and reports them. Escalate only creative choices and real trade-offs.
4. Record the choices (`decide`, one call can cover a group: `--moments M02,M03,M04 --choice A --quote "..."`).
5. **Wait.** Build nothing for the final edit until the user approves the creative direction in their own words. Then record it: `edit_decisions.py approve <slug> --gate direction --quote "<their words>"` (refused while a major moment is undecided).

## Phase 4: Animation preview

1. Copy the chosen concepts into `beats.ts` (with D implemented as described), and build any new components in Remotion (`remotion.md` §4).
2. **Sound:** `edit_render.py sfx` → `sfx_plan.py` → choose sounds (passes 1-3) → `edit_render.py draft-sound <slug>`. This writes a draft mix (stems + session, no export) and puts it in the Studio preview. If the library is empty or has no fit, the previews carry dialogue only; say so plainly.
3. **Short motion previews** at half resolution, with the dialogue and the draft sound:
   ```bash
   python3 scripts/edit_render.py preview <slug> --beat b03-horizon        # one scene + 0.6 s handles
   python3 scripts/edit_render.py preview <slug> --concept M03:B           # an unapproved concept in motion
   python3 scripts/edit_render.py preview <slug> --all                     # the whole edit, half resolution
   ```
   Send the clips to the user and ask for feedback: what works, what to change.
4. **Changes before the final render:** record each feedback round (`edit_decisions.py feedback <slug> --quote "..." --change "M03: slower rise"`), apply it, re-render the affected previews, and repeat until the user is happy. If feedback changes a concept fundamentally, go back to Phase 2 for that moment.
5. Record the approval of the previews: `approve --gate preview --quote "..."`.

## Phase 5: Final render

**Only after the user explicitly approves the edit** ("approved", "render the final", or equivalent; an approval of a preview is not a final approval), record it:

```bash
python3 scripts/edit_decisions.py approve <slug> --gate final --quote "<their words>"
```

Then: `edit_render.py picture <slug>` (full resolution) → `sound_mix.py` (all passes, music if approved) → `sound_qc.py` → `edit_qc.py` → deliver (`workflow.md` §9 and Delivering).

Enforcement: `edit_render.py picture` (and `downscale`) refuse to run without the `final` approval in the log; `edit_qc.py` reports an ERROR for an export without it; any feedback recorded after the final approval withdraws it. Claude records an approval only when the user has actually given it, quoting their words. Never paraphrase a "maybe" into an approval.

## The creative decision log

`creative-log.json` (source of truth) and `CREATIVE-LOG.md` (generated) contain: the source (path, sha256, duration, fps), the transcript reference, every moment (timecode, words, section, why, recommendation), every round of A/B/C concepts (title, system, kind, refs, family, description, motion, sound, preview), each decision (A/B/C/D/none, the D text, combinations, the user's quoted words, time), keep-visible stretches, feedback rounds, and the three approvals with the user's words and times. It is committed with the project's Remotion source so the decisions survive the session and inform the next video. Read the previous projects' logs when the user says "like last time".

```bash
python3 scripts/edit_decisions.py status <slug>          # where the project stands, what is still open
```
