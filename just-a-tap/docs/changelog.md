# Changelog

## v1: first full build
- New Remotion project `just-a-tap/` (separate from `cyber-intro/`): a single 1200-frame composition with global hero tracks (`src/data/tracks.ts`).
- Reference audit: `docs/reference-database.md` covers the 169 archive files with their sizes, hashes and duplicate groups. It adds the 6 anchor JPEGs (copies in `docs/anchors/`), a top-15 list, measured detail density, and a "must NOT copy" column. The archive ZIP is byte-identical to the previously supplied `references.zip`.
- Design docs: `style-decisions.md` (observed / inference / decision), `shot-list.md`, `animation-curve-map.md`.
- 0–5 s proof rendered and checked before the rest was built: no frozen frames and no velocity spikes.
- Fixes found while reviewing stills:
  - the headline overlapped the panel
  - the panel was blank during its first frames
  - the phone screen bottom was empty (added recent rows)
  - the status rail sat under the phone (moved under the terminal, camera pulls back to 0.95)
  - the dark transitions were soft circular blobs (replaced by shape masks that grow out of the terminal and out of the final underline)
  - the underline → rail morph went through a fat block (now two stages: contract, then grow)
  - the method rows entered while the confirmation panel was still on screen
  - the capsule crossed the end title (new route and timing)
