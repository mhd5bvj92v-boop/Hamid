# Remotion app

The Remotion video composition engine for this repository. It was created with `npx create-video@latest --yes --blank remotion-app` (Remotion 4.0.535, React 19, TypeScript).

The editing system itself (reference library, design rules, sound design) is still the `video-editing` skill in `../.claude/skills/video-editing/`. This app does not change or replace it.

## Defaults

| Setting | Value |
|---|---|
| Canvas | 1080 × 1920 (vertical), 60 fps |
| Deliverable | H.264 MP4 with AAC audio, yuv420p, BT.709 limited range, CRF 18 |
| Transparent overlay | ProRes 4444 `.mov` with alpha (`yuva444p10le`) |
| Timing | All animation is driven by `useCurrentFrame()` and `interpolate()`, so it is frame-exact. Beats are written in seconds and converted with `fps`. |
| Fonts | Montserrat (house sans) and Instrument Serif italic (accent), bundled from npm via `@fontsource`. Renders need no Google Fonts access. |

## Compositions (`src/Root.tsx`)

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
npm run dev              # Remotion Studio (preview)
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
