# Remotion app

The Remotion video composition engine for this repository: it renders the picture of every talking-head edit. It was created with `npx create-video@latest --yes --blank remotion-app` (Remotion 4.0.535, React 19, TypeScript).

The editing rules, reference library and sound design live in the `video-editing` skill (`../.claude/skills/video-editing/`), which drives this app. Its timeline rules apply here: the user's footage is never cut, trimmed, re-timed or re-voiced.

## Defaults

| Setting | Value |
|---|---|
| Canvas | 1080 × 1920 (vertical). Talking-head edits: the source's (approved) frame rate. Setup-check compositions: 60 fps |
| Deliverable | H.264 MP4 with AAC audio, yuv420p, BT.709 limited range, CRF 18 |
| Transparent overlay | ProRes 4444 `.mov` with alpha (`yuva444p10le`) |
| Timing | All animation is driven by `useCurrentFrame()` and `interpolate()`, so it is frame-exact. Beats are written in seconds and converted with `fps`. |
| Fonts | Montserrat 100-800 (house sans), Playfair Display italic and Instrument Serif italic (accents), bundled from npm via `@fontsource`. Renders need no Google Fonts access. |

## Talking-head edits (the default use)

Every talking-head project is a composition `Edit-<slug>` in `src/projects/<slug>/`, created by the `video-editing` skill (`python3 ../.claude/skills/video-editing/scripts/edit_init.py <footage> --slug <slug>`):

- `source.ts` is generated: the original's size, frame rate and duration. The composition is exactly as long as the source, at the approved frame rate, 1080x1920.
- `edit.json` is the project: the user's script, segments with their A/B/C/D concepts and decisions, the beats (text, overlays, full-screen scenes) on the source timeline, the SFX track, feedback and approvals. `beats.ts` and `concepts.ts` are typed views of it.
- `Edit.tsx` renders `TalkingHeadEdit`: the untouched footage (`SourceFootage`: full length, original speed, no trim) with one `<Sequence>` per beat on top, plus an optional Studio sound preview.
- The footage is reached through `public/projects/<slug>/footage/`, a link to the original's folder (git-ignored, never copied).

The edit kit is in `src/kit/` (`SourceFootage`, `TalkingHeadEdit`, `StudioEdit`, `CaptionAccent`, `StatCard`, `HorizonTitle`, `UiCard`, `StatementScene`, `SoundPreview`, the `edit.json` schema and script import in `project.ts`, house motion and tokens). `scripts/import-transcript.ts` imports the user's timestamped script into `edit.json` as written (`npx tsx scripts/import-transcript.ts <slug> <file> [--replace]`, `--check` lists timing problems). `scripts/export-sfx.ts` exports each beat's measured sound intents for the skill's sound pipeline (`npx tsx scripts/export-sfx.ts <slug> <outDir>`). Rendering, mixing and QC go through the skill's scripts; see `.claude/skills/video-editing/references/remotion.md`.

## Creative Director Studio (`studio/`)

`npm run studio` opens the editor at http://127.0.0.1:3010: the Remotion Player (composition `StudioEdit`), the user's script, a multi-track timeline, the A/B/C/D panel with `renderStill` previews, the inspector, the reference browser, the SFX track and the export (gated by the final approval; Remotion `renderMedia` + the skill's mix and QC). Everything reads and writes the project's `edit.json`. In browsers without H.264 (open-source Chromium) it offers a VP9 preview proxy used by the Player only. `npm run studio:test` drives it end to end in Chromium. See `../.claude/skills/video-editing/references/remotion.md` §8.

## Setup-check compositions (`src/Root.tsx`)

| ID | What it is | Output |
|---|---|---|
| `TestComposition` | 5 s test: simple background, animated typography, floating interface card, entrance and exit, plus one SFX on the card-landing frame | `out/test-composition.mp4` |
| `FootageComposite` | Footage as the background layer (with its own audio), the same transparent overlay on top, and the SFX. Its duration follows the footage. | `out/footage-composite.mp4` |
| `Overlay` | The overlay alone, with no background, rendered with alpha | `out/overlay-alpha.mov` |

To use real footage, put it in `public/footage/` (git-ignored) and pass the path as a prop:

```bash
npx remotion render FootageComposite out/my-edit.mp4 --props='{"footageSrc":"footage/my-clip.mp4","footageVolume":1,"sfxSrc":"test-media/pop.wav"}'
```

## Commands

```bash
npm i                    # install dependencies
npm run dev              # Remotion Studio (Remotion's own preview tool)
npm run studio           # Creative Director Studio (the editor)
npm run studio:test      # its end-to-end test (Chromium, synthetic footage)
npm run test-media       # generate the synthetic test footage and marker sound (public/test-media/)
npm run render:test      # -> out/test-composition.mp4
npm run render:footage   # -> out/footage-composite.mp4
npm run render:overlay   # -> out/overlay-alpha.mov
npm run verify           # ffprobe checks: size, fps, frames, duration, codec, colour, A/V sync, alpha
npm run test:render      # all of the above, in order
npm run lint             # eslint + tsc
```

`out/` and `public/test-media/` are git-ignored, so rendered video never goes into the repository.

## Browser for rendering

Remotion normally downloads its own Chrome Headless Shell. Where that download is blocked (as in the Claude Code cloud sandbox, where `remotion.media` is not reachable), point it at a local one:

```bash
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```

`remotion.config.ts` reads this variable. With a non-Remotion Chrome build, Remotion logs "shared-memory capture is unavailable" and falls back to screenshot capture. The output is identical; only rendering is slower.

## Test media

`scripts/make-test-media.sh` generates synthetic sync markers. They are not real footage or authorised sound effects:

- `footage.mp4`: 1080 × 1920, 60 fps, 5 s. A white flash on frames 150 to 152 and a 1 kHz beep starting at 2.500 s, at the same instant. The frame number is burned in.
- `pop.wav`: a 0.15 s tone, placed on the frame where the card lands (1.300 s, frame 78).

`npm run verify` measures these in the rendered files to prove audio and video sync.

## Agent Skills

The official Remotion Agent Skill (`remotion-best-practices`, which bundles all Remotion skills) is installed at project level in `../.claude/skills/remotion-best-practices/`. It was installed with `npx skills add remotion-dev/skills --agent claude-code --skill remotion-best-practices --yes`, and its source is pinned in `../skills-lock.json`. Update it with `npx skills update`.

## License

Remotion is free for individuals and teams of up to 3. Larger companies need a company license: https://www.remotion.pro/license
