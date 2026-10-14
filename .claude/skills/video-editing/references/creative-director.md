# Creative Director Workflow (mandatory for every video)

**The user is the Creative Director of every video.** Claude is responsible for visual proposals, animation implementation, sound design and technical quality. The user decides the creative direction. Nothing is built for the final edit without their choice, and nothing is exported without their explicit approval.

There are two ways to run the phases. Both read and write the **same project file**:
- **In the conversation.** Claude presents the options directly in the conversation, with Remotion preview frames attached, and records each decision with `scripts/edit_decisions.py`.
- **In the Creative Director Studio** (`cd remotion-app && npm run studio`, http://127.0.0.1:3010). This is the repository's own editor around the Remotion Player:
  - transcript
  - multi-track timeline
  - A/B/C/D panel with real Remotion preview stills
  - inspector
  - sound track
  - approvals
  - export

  The user works in it directly. Claude reads what the user did there (`edit_decisions.py status`) and answers their requests.

Remotion itself has no questionnaire or interactive chooser. The Studio is our UI built on `@remotion/player` and `@remotion/renderer`. Remotion only renders: the Player, the preview stills, the motion previews and the final picture.

**One project file.** `remotion-app/src/projects/<slug>/edit.json` holds:
- the source (path, sha256, fps, duration)
- the user's script
- the segments with every round of A/B/C(/D) concepts and the decisions
- the timeline beats
- the SFX track
- feedback
- the three approvals

The Player, the preview stills, the motion previews and the final renderer all read this file (`beats.ts` and `concepts.ts` are thin views of it). It is the project's **creative decision log**. `CREATIVE-LOG.md` next to it is generated from it for reading, by `edit_decisions.py`, on every change.

| Phase | Claude does | The user does | Gate (recorded) |
|---|---|---|---|
| 1 Analyze | intake, footage + dialogue analysis, segments on the user's timecoded script, where to stay on camera | provides the cut and the timestamped script | `analyze` (or segments created in the Studio) |
| 2 Options | A, B, C per major segment (+ D) with real Remotion preview frames | chooses, writes D, or asks for new concepts | `propose`, `decide` (or Choose in the Studio) |
| 3 Approval | concise grouped storyboard | approves the creative direction | **`direction`** |
| 4 Animation preview | builds in Remotion, motion previews with draft sound | feedback, change requests | **`preview`** |
| 5 Final render | full-resolution render, mix, QC, export | explicitly approves the edit | **`final`** |

The timeline rules in `SKILL.md` hold in every phase: the user's cut, pauses, reactions, dialogue and pacing never change.

---

## Scene Planning (the Studio's planning workspace)

The Studio's **Scene Planning** view is the default way to run Phases 1-3 with the user, sentence by sentence, on the same `edit.json` the Timeline Editor and Remotion use:
1. **Constants for the Whole Edit:** caption style, position and case, accent font and colours, interface style, transitions, sound density, music, notes (`edit.json` `constants`). Every request to Claude Code carries them; follow them unless a scene's plan says otherwise.
2. **Per sentence:** the exact words and times, word timings if the script has them, a **scene type** (Captions Only → System B; Captions + UI → System A with a caption; **Halfscreen** → a panel filling one half, the speaker visible in the other, e.g. the kit's `HalfPanel`; Fullscreen → System C) and **"What happens on screen"** in the user's words.
3. **Optional:** "Ask Claude for Ideas" (three Claude Concepts with STYLE REFERENCE images) and A/B/C/D inline for that scene.
4. **Approve the scene plans:** each approved scene becomes a build request whose brief holds the scene type, the user's on-screen description (verbatim), the constants, and the chosen concept or D if there is one. Choosing A/B/C/D also approves that scene's plan.
5. Claude Code builds each request in Remotion (`built` renders it before recording it); the user reviews in the Timeline Editor (approve, request changes, restore a version) and exports.

Changing a scene's type, words or plan text after approval sets the plan back to draft (approve again to rebuild); changing only its timing moves its animation and sounds with it (`retimeScene`). When a plan is approved without a concept, implement **the plan** (all of it, listed in `coverage`), using the kit or a new kind in `src/kit/custom/`.

## The user's script is the timing source

The user provides their **own script with timestamps**. That is the default, and it is the timecoded transcript of the project. Claude does not transcribe, rewrite or re-time it.

- **Import:**
  - In the Studio, paste it or open an SRT, VTT or JSON file.
  - From the CLI: `cd remotion-app && npx tsx scripts/import-transcript.ts <slug> <file> [--replace]`.
  - Both use the same parser (`src/kit/project.ts`). Accepted formats:
    - pasted lines like `[00:12.0 - 00:14.8] text`, `00:12.0 --> 00:14.8 text`, `12.0-14.8: text`, or `[00:12] text` (start only: the end is flagged as missing)
    - SRT and VTT cues
    - JSON as `[{start,end,text}]`, `{segments:[...]}` (Whisper-style, word timings kept) or `{transcript:[...]}`
  - Times may be seconds, mm:ss(.ms) or hh:mm:ss(,ms).
- **Text and times are kept exactly as written.** A line without an end time keeps `end: null`. An end before its start stays as written.
- **Problems are flagged, never fixed:**
  - missing start or end
  - end not after start
  - overlaps
  - lines outside the video
  - empty text

  The Studio shows them on the line. `import-transcript.ts --check` lists them. The user corrects them by:
  - typing a time
  - setting start or end from the playhead
  - splitting a line at a time they choose
  - combining lines

  Claude may *point out* a likely error ("T014 ends after the video"); it never silently changes a time.
- Replacing an imported script needs an explicit confirmation (`--replace`, or the Studio's confirm dialog).
- **Automatic transcription is optional and not part of the default workflow.** No speech-recognition model is installed in this repository. Only if the user has no script and asks for one: use a local ASR the user has installed, and label its times as unverified. Never present generated timestamps as the user's verified timing.

## Phase 1: Analyze

When the user provides a pre-cut video:

1. **Intake:** `python3 scripts/edit_init.py <video> --slug <slug>`, or "Import video" on the Studio's start page. This:
   - probes and hashes the original
   - links it (no copy)
   - creates the Remotion project with its `edit.json`
2. **Script:** import the user's timestamped script (above). Ask for it if it is missing.
3. **Look and listen.** Extract frames from the original (`compose.py frames`) and look at them: framing, where the face sits, gestures, grade, busy backgrounds. Read the whole script.
4. **Find suitable segments** (`workflow.md` §2-3). Each segment is a span of the user's own words, with the start and end taken from their script:
   - numbers, names, lists, processes (A)
   - hooks, rules, memorable phrases (B)
   - abstract ideas, big numbers, section breaks (C)
5. **Decide where keeping the user visible is stronger:**
   - emotional or personal lines
   - reactions
   - eye contact on a key promise
   - gestures that already show the idea
   - moments right after another visual

   List these as *keep-visible* stretches with the reason. This is a recommendation the user sees, not a silent omission.
6. **Record it:** `edit_decisions.py analyze <slug> --file work/<slug>/plan/analysis.json`.
   - Segments carry: `id`, `start`, `end`, the exact `text`, `type` (text | onscreen | fullscreen | sound), `section`, `why`, `major`, and `recommend: visual | keep-visible`.
   - The keep-visible stretches are recorded too.
   - In the Studio the user creates segments themselves: select words (click/shift-click lines, or drag a range on the timeline) → Text Animation / On-Screen Visual / Full-Screen Animation / Sound Design.

Major segments are the ones that get A/B/C options: every full-screen candidate, every on-screen visual, and the hook. Small connector captions or repeated house-style elements can be grouped (one decision for "all small captions in the body"). Don't create a question for every word.

## Phase 2: Present creative options

For **every major visual segment**, offer exactly:

- **A, Visual Concept 1**
- **B, Visual Concept 2**
- **C, Visual Concept 3**
- **D, My Own Idea**

**A, B and C must be genuinely different** and grounded in the reference library:
- each is built from 1-3 reference IDs whose images Claude has **opened** (Read) for this segment;
- together they differ in at least two of: system (on-screen beside the user / text / full-screen), style family, composition and placement, motion idea;
- at least one keeps the user visible (A or B system) when the segment allows it;
- each names its sound idea in one line (System D);
- no generic preset when the library has something more fitting.

Each concept is a renderable beat: `kind` (a kit component) + `props`. It is placed on the segment: its start is the segment start and its exit is solved so it ends on the segment end (`beatFromConcept` in `src/kit/studio.ts`). Write proposals with `edit_decisions.py propose <slug> --file proposals.json`. It rejects:
- missing options
- unknown reference IDs
- two options that are the same idea

It warns when all three share one system and one family. Concepts Claude writes are `author: "claude"`.

**3D and realistic objects come from the user.** Whenever a concept needs a realistic object (hands, a person, a product, a device, a planet, a building, a sculpture, a creature), never plan to draw it with code shapes. List it under the option's `assets`: `{"id": "A1", "what": "two hands holding a glowing glass sphere", "spec": "PNG, transparent background, front view, soft top light, at least 1600 px tall"}` (for motion: "WebM with alpha, 3 s, slow turn"). Be specific about angle, lighting, background and size, so the user can render or source it. The Studio shows the request on the card and an upload box per need. When the user chooses that concept, the build waits until every required asset is uploaded (or they give you a file path: `edit_decisions.py asset <slug> --segment S04 --need A1 --file <path>`); `built` refuses without them, and refuses a beat that does not use them. Prefer concepts that combine one strong asset with code-built type, light and motion (`AssetScene`, or a custom kind with `<AssetMedia>`). The user may also attach their own assets to D (`U1`...), which the build must then use.

**Studio drafts.** When the user creates a segment in the Studio, the Studio immediately offers three *library drafts*. These are mechanical variants of the kit components for the chosen type, labelled "draft from the library" (`author: "draft"`). They are a starting point so the user can preview something at once. They are **not** Claude's concepts. `edit_decisions.py status` lists segments that only have drafts ("DRAFTS"). For those, propose Claude's own A/B/C, which replaces the drafts as a new round.

**D, the user's own idea**, lets the Creative Director:
- describe their own animation;
- combine A, B and C ("A's horizon with C's serif number");
- choose different typography;
- provide a new reference image (add it to the library with `ingest.py` if it should be reused), or pick references in the Studio's reference browser;
- specify colours, camera movements, timing and transitions;
- request something completely different.

Record D faithfully:
- In the chat: `decide --choice D --custom "<their idea>" [--combine A,C] [--reference-image path]`.
- In the Studio: the D card.

If D says "based on B", the Studio builds B's beat on the segment as a starting point and records the D text. Claude then implements the rest of D (props, or a new component) and tells the user what changed. `status` lists D decisions that are not on the timeline yet ("BUILD D"). If D is ambiguous, ask **one** focused question.

**Always offer three new concepts.** End every options message with the reminder that they can ask for three new concepts for any segment. In the Studio, "Ask Claude for three new concepts" records a request (`status` shows "REQUEST"). A new round goes through `propose` again:
- the earlier concepts are archived in `history`
- the round number increases
- any earlier direction approval is withdrawn

**Preview frames:** every concept gets a real Remotion still over the footage:
- In the Studio, "Render preview" calls `renderStill` on the `StudioEdit` composition at the segment's landed frame.
- From the CLI:

```bash
python3 scripts/edit_render.py concept-frames <slug> --moment S03            # A | B | C side by side, mid-segment
python3 scripts/edit_render.py concept-frames <slug> --moment S03 --sequence # in / landed / before exit
```

Send the sheet to the user (attach the image) with the options. When a concept needs a component that doesn't exist yet, say so and show the closest reference images instead, or a still of a rough version.

### How to present a segment (in chat)

```
S03 · 00:12.0–00:14.8 · "we've helped over 300 businesses"        (recommended: A)
A — Horizon number: full-screen planet horizon, 300 rises out of the atmosphere (FUL-002 · HORIZON-ARC · 2.6 s cover; riser + hit)
B — Stat card beside you: glass card, curve draws to a peak, 300 counts up; you stay visible (ONS-024 · LIVE-UI; sci-fi impact)
C — Serif number: amber italic "300" with "businesses helped" under your chin (TXT-003 · SERIF-ACCENT; one pop)
D — Your own idea: describe it, combine A–C, change type, colours, camera, timing or transitions, send a reference, or ask for something else
Preview: S03_r1_concepts.png · Say "new concepts for S03" for three fresh options.
```

## Phase 3: Approval

1. **Concise timecoded storyboard:** `edit_decisions.py storyboard <slug>` writes `work/<slug>/plan/storyboard.md`. It is grouped by section (hook, body sections, payoff), with the recommended option per segment and the keep-visible stretches. Paste it (or a tighter version) into the chat with the preview sheets.
2. **Group decisions** so several scenes can be approved at once: "all recommended", "S01 B, S02–S04 A", "S05 D: …". Repeated house-style items (small captions, name super, music on or off) are one decision each.
3. **Don't overwhelm.** No questions about single words, easing curves, exact frames, dB values or render settings. Claude decides those technical details by the skill's rules and reports them. Escalate only creative choices and real trade-offs.
4. Record the choices: `decide`, where one call can cover a group (`--moments S02,S03,S04 --choice A --quote "..."`). In the Studio, Choose on each card.
5. **Wait.** Build nothing for the final edit until the user approves the creative direction in their own words. Then record it with `edit_decisions.py approve <slug> --gate direction --quote "<their words>"`, or the user does it in the Studio. It is refused while a major segment is undecided.

## Phase 4: Animation preview

1. **Build.** Choosing a concept puts its beat on the timeline in `edit.json`: in the Studio immediately, from the CLI by adding the beat to `beats`. Implement D as described, and build any new components in Remotion (`remotion.md` §4). In the Studio the user can then:
   - fine-tune props, start and end in the inspector
   - drag or resize the beat on the timeline

   The Player updates at once.
2. **Sound:** each animation's sound intents become SFX items on the SFX track, linked to the beat (they move with it). Gains start at the presets. Then:
   - Studio: assign sounds, gains and offsets in the Sound tab.
   - CLI: `edit_render.py sfx` → `sfx_plan.py` → choose sounds (passes 1-3) → `edit_render.py draft-sound <slug>`.

   If the library is empty or has no fit, the SFX stay unassigned and the previews carry dialogue only. Say so plainly.
3. **Short motion previews** at half resolution, with the dialogue and the draft sound. In the Studio use Export → Render motion preview. From the CLI:
   ```bash
   python3 scripts/edit_render.py preview <slug> --beat b03-horizon        # one scene + 0.6 s handles
   python3 scripts/edit_render.py preview <slug> --concept S03:B           # an unapproved concept in motion
   python3 scripts/edit_render.py preview <slug> --all                     # the whole edit, half resolution
   ```
   Send the clips to the user and ask for feedback: what works, what to change.
4. **Changes before the final render:**
   - Record each feedback round: `edit_decisions.py feedback <slug> --quote "..." --change "S03: slower rise"`, or the Studio's feedback box.
   - Apply it, re-render the affected previews, and repeat until the user is happy.
   - If feedback changes a concept fundamentally, go back to Phase 2 for that segment.
5. Record the approval of the previews: `approve --gate preview --quote "..."`.

## Phase 5: Final render

**Only after the user explicitly approves the edit** ("approved", "render the final", or equivalent; an approval of a preview is not a final approval), record it:

```bash
python3 scripts/edit_decisions.py approve <slug> --gate final --quote "<their words>"
```

Then **Remotion renders the final** (Remotion-first): `sound_mix.py` + `sound_qc.py` check the sound plan offline, `edit_render.py final <slug> --session <checked session.json>` renders the whole composition (footage with its dialogue, every layer, those sound placements) and runs `edit_qc.py` on the render → deliver (`workflow.md` §9 and Delivering). The Studio's Export final MP4 does the same on `edit.json`:
1. `export-sfx.ts` (graphics windows for the QC)
2. Remotion `renderMedia` of `StudioEdit` with every layer and every assigned sound effect → `renders/final_vN.mp4`
3. `edit_qc.py --sfx`: timeline, dialogue untouched, every effect present, nothing louder than the voice, no clipping

Enforcement:
- `edit_render.py final` / `picture` (and `downscale`) and the Studio's final export refuse to run without the `final` approval in `edit.json`, while an implementation or revision still waits for Claude Code, and for a script-only project.
- `edit_qc.py` reports an ERROR for an export without it.
- Any feedback recorded after the final approval withdraws it.
- The Studio cannot write approvals by saving the document: they change only through the approve action.

Claude records an approval only when the user has actually given it, quoting their words. Never paraphrase a "maybe" into an approval.

## The creative decision log

`edit.json` (source of truth) and `CREATIVE-LOG.md` (generated) contain:
- the source (path, sha256, duration, fps)
- the user's script (origin, format, lines as written)
- every segment (timecode, exact words, type, section, why, recommendation)
- every round of A/B/C concepts (title, system, kind, props, refs, family, description, motion, sound, author, preview)
- each decision (A/B/C/D/none, the D text, combinations, references, the user's quoted words, time)
- the beats and SFX that were built
- keep-visible stretches
- feedback rounds
- the three approvals, with the user's words and times

It is committed with the project's Remotion source, so the decisions survive the session and inform the next video. Read the previous projects' logs when the user says "like last time".

```bash
python3 scripts/edit_decisions.py status <slug>          # where the project stands, what is open, Studio requests for Claude
```
