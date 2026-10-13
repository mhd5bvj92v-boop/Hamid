# Extending the Reference Library

New references are **added**, never rebuilt from scratch. Existing IDs, files and entries stay stable, so plans and notes that cite `ONS-004` keep working forever.

## If the user says more references are coming

Acknowledge each upload, analyse it, and stage it (steps 1-3). **Do not finalise or package** until the user says **"ALL REFERENCES UPLOADED"**. Then commit, rebuild and validate (steps 4-6) and update the design rules (step 7).

## Steps

1. **Unpack into a fresh, empty folder** outside the skill (for example `work/incoming/batch-002/`). Ignore `__MACOSX/`, `._*` and `.DS_Store`. They are metadata, not images, and `ingest.py` skips them.
2. **Scan for duplicates and stage a draft:**
   ```bash
   python3 scripts/ingest.py scan work/incoming/batch-002 --batch-name batch-002
   ```
   - `skip`: byte-identical to an existing file (reported, not added).
   - `alternate`: the same design at another size/crop (perceptual distance ≤ 30). It is attached to the existing ID as an alternate copy, so the original file is preserved.
   - `alternate-in-batch`: a near-duplicate inside the new batch, attached to its twin.
   - `new`: gets a stub in `data/inbox/draft.json`. `similar_to` lists close-but-distinct references (distance 31-60). Look at both images before deciding whether it is really new.
   - Folder names containing "on screen", "text" or "full" pre-fill a suggested category. The user's folder choice is authoritative when it is present.
3. **Analyse every new image visually.** Open each one with Read (and `data/inbox/inbox-sheet.png` for an overview). Fill in each draft item:
   - `category` (ONS | TXT | FUL): would it appear *with* the speaker (ONS), is it typography/caption-driven (TXT), or does it *replace* the speaker (FUL)? Put secondary uses in `also_useful_for`.
   - `subcategory`, `family`: reuse existing names (`python3 scripts/search.py --list-families`). Create a new family only for a genuinely new visual language.
   - `title`, `tags` (lowercase, hyphenated, 5-10 tags).
   - `observed.description / typography / composition / lighting_effects / depth_layering`: only what is visible.
   - `inferred.animation / use_cases / recreation`: start animation with "INFERRED:", and give concrete values (px, ms, hex, easing).
   - `notes`: low resolution, watermarks, crops, or "user placed in X folder but reads as Y".
   The palette is measured automatically at commit, so don't type it.
4. **Commit:**
   ```bash
   python3 scripts/ingest.py commit
   ```
   This assigns the next free ID in each category, copies the originals into `assets/references/<CAT>/`, appends to `data/references.json`, records the batch, rebuilds `references/library/*` and the contact sheets, and runs validation.
5. **Validate:** `python3 scripts/validate.py` must report 0 errors. Every file is referenced, checksums match and docs are in sync.
6. **Look at the new contact sheets** (`assets/contact-sheets/`) to confirm the new IDs are where you expect them.
7. **Evolve the design rules** without rewriting them:
   - If a new family was created, add a `### FAMILY` recipe to `design-language.md` (validation fails until you do).
   - If a pattern now appears in 3 or more references, add it to the composition or principle lists with its IDs.
   - Update the evidence numbers at the top of `design-language.md` (counts and hue share) and the routing tables in the system docs if a new treatment appeared.
   - Never delete or renumber old entries. If a reference should no longer be used, add `"deprecated": "reason"` to its JSON entry and mention it in its notes.
8. **Package** (if the user wants an installable file): see `SKILL.md` → Packaging.

## Editing an existing entry

Edit `data/references.json` directly (it is the single source of truth), then run `python3 scripts/build_library.py` and `python3 scripts/validate.py`. Never edit the generated files in `references/library/`.
