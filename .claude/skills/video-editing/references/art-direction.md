# Art direction: modes, delivery, palette, backgrounds, type

Load this when you set up a project's look, or when you choose a background, palette or type for a scene. Everything here is editable in the Studio (Scene Planning → constants) and stored in `edit.json` `constants`.

## Creative mode (constants.mode)

| Mode | Result | Default treatment |
| --- | --- | --- |
| `natural` | A person talking to the viewer | Presenter stays primary; short designed text; minimal additions. A plain-styling request never turns into cutaways. |
| `visuals` | An explanation supported by graphics | A few useful overlays or explicitly chosen full-screen moments. |
| `ui-saas` | A product or concept explained through animation | Coherent interface states, staged interactions, restrained camera. |

A scene can override the mode visibly (its plan). The mode never permits touching the locked footage or the transcript.

## Delivery platform (constants.platform)

Independent of the mode.

| Platform | New-project canvas | Treatment |
| --- | --- | --- |
| `tiktok` | 1080×1920 | Person-first, immediate context, short readable text, space for the right-side actions and the caption area. |
| `shorts` | 1080×1920 | One self-contained idea, phone-readable graphics, an ending that completes the thought. |
| `youtube` | 1920×1080 (4K 3840×2160 only when the source and budget justify it) | Use the width for relationships and side-by-side; allow reading time. |

Existing projects keep their resolution and frame rate.

The Studio's **Guides** (thirds, centre, safe area, platform zones) are preview-only. The platform zones are approximate and labelled as such (`src/kit/Guides.tsx`).

## Palette

Write a short art-direction note per video:
- topic and feeling;
- light or dark foundation;
- text / surface / accent colours;
- the harmony (monochromatic, analogous, or one restrained complementary accent);
- which elements may use the accent.

60-30-10 is a helpful heuristic (`usePalette()`), not a measurement law; `preview` reports the shares.
- **Contrast:** aim for 4.5:1 for text against the final composited background. Add a surface or scrim when a moving background lowers it.
- **Status colours:** keep warning, success and selected-state meanings consistent.
- **Red** is reserved for real warnings in the dark technology look.
- **Footage colour:** a palette change updates backgrounds, highlights and surfaces together. It never recolours the presenter.

## Background families (`src/kit/backgrounds.tsx`, `backgrounds/gradients.tsx`)

| Family | Presets |
| --- | --- |
| Near-black with one light | `near-black-light`, `minimal`, `spotlight` |
| Four-colour fields | `midnight-blue` `#05070D #101B3D #244E9B #487EC7`, `indigo-violet` `#0B0B17 #24204A #514899 #8A79CB`, `deep-teal` `#061211 #10352F #246357 #629587`, `warm-graphite` `#100E0C #30231B #73503A #AD8661`, `porcelain-blue` `#F4F6FA #E6ECF5 #CCD9EE #A7BDDF`, `soft-lavender` `#F5F3F8 #E8E2F0 #D1C5E2 #B4A1CC`, `palette-gradient` (the edit's own colours) |
| Light neutral | `paper-grid` (on the thirds), `dot-field` |
| Atmospheric | `aurora`, `mesh`, `glass-blobs`, `light-rays`, `beams`, `data-lines` |
| Horizon / surface | `horizon`, `grid-floor`, `tunnel`, `starfield` |

These palettes are original starting points, not taken from any creator or brand.

Four-colour fields use:
- the darkest (or lightest) colour as the base;
- the midtones for structure;
- the strongest colour sparingly, upper-centre, away from small text.

Each field moves on its own slow periodic path (11–19 s, out of phase), driven only by composition time. So it never pumps, rotates like a rainbow or resets at a scene boundary. Background time is continuous across scenes on a stage (`constants.stage`, premium-motion.md §3c).

**Check after encoding:** inspect dark gradients for banding in the encoded MP4. Fine grain (the cinematic finish) may help, but it is not a cure.

## Type

Montserrat is the only sans. Scale (design px, `TYPE` in `src/kit/motionTokens.ts`):

| Format | Hook | Key | Support | UI | Caption |
| --- | --- | --- | --- | --- | --- |
| Portrait | 100 | 76 | 48 | 44 | 56 |
| Landscape | 92 | 68 | 40 | 34 | 46 |

- Use one primary family with few weights.
- A short hook plus one smaller supporting line; in the middle and at the end, one or two short stacked lines; never paragraph overlays.
- Captions are a separate layer and must not collide with designed text.
- Check legibility at about 360 px wide.
