# Option D and scoped references

How the user's own idea (D) and their references reach a build. Load this when a request is a D implementation or revision, or when you change the D editor, the References tab or the reference data.

## The user's flow

Select a scene → **D: My own idea** → type the idea → optionally attach references right in the D box → **Save my idea (D) for Claude Code**.

D needs no references, no A/B/C concepts and no dummy upload. The References tab is optional: its "use for D" button attaches to the selected scene's idea, which is the same entity the D editor shows.

## Data (edit.json, schema 2)

| Concept | Where | Notes |
| --- | --- | --- |
| Saved reference asset | built-in `data/references.json` (ONS/TXT/FUL-###), My library `library/references.json` (MY-###), D uploads `work/<slug>/refs/`, links | Stored once. Removing an attachment never deletes it. |
| Attachment | `seg.dDraft.attachments` (idea), `seg.refs` (scene), `doc.refs` (project) | `{id, kind, path?, url?, scope, role, influence, note?, added}` |
| Exclusion | `influence: "exclude"` on any attachment; `seg.refExclude` = project refs this scene does not inherit | An idea-level exclude also blocks the asset inherited from scene/project. |
| D draft | `seg.dDraft` `{text, basedOn, combine, attachments, hints, rev, updated}` | Saved like any Studio edit (field patch), so tabs, scene switches, reloads and undo keep it. |
| Decision snapshot | `decision.attachments`, `decision.excluded`, `decision.hints`, `decision.draftRev` | The effective set at the moment of the decision. Later changes make a new decision; old versions keep their inputs. |
| Request snapshot | `request.brief.attachments` / `excluded` / `hints` | What `show` prints and `preview` compares against. |

Legacy fields `decision.refs` / `decision.uploads` are still filled (library ids / upload paths) for older readers. `normalizeDoc` migrates a v1 D decision by building `attachments` from them, keeping both. The migration is recorded in `doc.migrations`.

**Roles:** style, motion, typography, colour/background, composition, subject.

**Influence:**
- `use`: adopt its visible qualities for that role.
- `light`: a hint only.
- `exclude`: never.

## Resolution: one function, `src/kit/refs.ts` `resolveRefs`

Precedence:
1. Locked timing and footage.
2. The user's D text.
3. Explicit exclusions.
4. Active references: idea, then scene, then inherited project. The same asset counts once, at its narrowest scope.
5. Creative defaults.

The Studio's "This scene will use…" box and the server's snapshot both call this function. The server writes the snapshot to `work/<slug>/refs/decision-<seg>-<ts>.json` and passes it to `edit_decisions.py decide --attachments-file`.

If the D text conflicts with a reference, the text wins. Say so in the build's coverage list.

## Guarantees (tested by `npm run studio:test:d`)

- **Verbatim text:** D text is kept byte for byte (line breaks, punctuation, Turkish letters) in the draft, the decision and the request.
- **Idempotent Apply:** saving the same D again (same text, same attachments) keeps the one open request and creates nothing new.
- **A newer decision wins:**
  - `decide` cancels open and failed implement/revision requests of the scene.
  - `preview` / `built` refuse a request that is not the scene's current decision's (`out of date`), or not its newest revision.
  - Nothing is written then.
- **Revisions of a D build carry its references** (refs, uploads, attachments, combine, basedOn, hints).
- **Preview handles every reference kind:** built-in ids go to the comparison sheet as references; My-library files and uploads go as images; links are listed in `show` only (open them if reachable, otherwise say they were not inspected).

## Building from a D request

1. `show` prints the idea verbatim and the concepts it builds on (based on / combine, with their full descriptions). Then the structured hints, and **THIS SCENE WILL USE**: each reference with influence, role, where it comes from, its file or link, and the user's note. Then the exclusions.
2. Open the files. A still image proves colour, type, layout and material, not motion. Write inferred motion as inferred.
3. Implement the text completely; use references only for their role. Never use an excluded one.
4. `preview`, compare, iterate, then `built` (premium-motion.md §5).
