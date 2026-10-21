# Reference → scene decisions

The references are still thumbnails. Each row says which **observed** feature informed a scene and which part is **our own inference or invention**. No layout was copied. Everything was redrawn in vector form in the orange/black/off-white palette.

| Scene | Informed by (observed still feature) | What we built (our design; motion is inference) |
|---|---|---|
| 1 The ordinary click | 123/124/161: dark input bar with warm rim glow at one end · 096/089: pill controls with a single coloured indicator · 167: cursor beneath a pill | An off-white address bar unfolds from a horizontal orange hairline, a spring settles it into a rounded pill, and `example.com` types in. The cursor follows a Bézier path. |
| 2 Auto-pilot | 026: stacked notification cards · 005/012: small cards in a row · 016: concentric arcs around a focal point · 007/090: pressed tile as the focal action | An abstract page cascades in with a 3-frame stagger. A cookie sheet glides up and "Accept all" is pressed (1→0.96→1). An orange ring radiates out and breaks into outgoing paths. |
| 3 The reveal | 083: iceberg, with mass below the surface · 097: camera among panels · 062/107/125/126: nodes joined by luminous paths, one warm core | The camera dives through the page surface, which turns into an outline and then a wireframe. A restrained node network appears with packets on eased arcs, and a label asks "What's happening behind this page?" |
| 4 The invisible layer | 075/153: a single settings card under a diagonal light · 112/015: toggle rows · 019/047: things orbiting a centre · 113: a light scanning a card | A central privacy card has three staggered rows with orange diagnostic accents. `cookies` / `redirects` / `permissions` chips orbit in a shallow ellipse. |
| 5 A different habit | 058/147: three dashboard cards · 102/092: circular indicators · 003: a calm confirmation card | A ring becomes a dashboard of three action cards. Each card gets an orange confirmation stroke with a spring settle, then the three collapse into a point. |
| 6 The thesis | 095/156: a bright point landing on a thin line under a small headline · 104: a line drawn to a glowing dot · 087/116: a centred headline under an arc | The point traces a browser outline, the camera pulls back, and the two-line thesis appears with `SEE` in orange. A moving underline accompanies a soft decay. |

**Rejected:** presenter frames 162-166 (a real person). The blue/violet neon palettes (most of the set) were re-keyed to orange. 3D glossy objects (041, 045, 115) were dropped: they need heavyweight 3D and don't fit the story. Chart and number-count motifs (000, 060, 080) were dropped: they would imply metrics we can't honestly claim.

## Revision 2: glass + Apple-style backdrop (after review)
Feedback on the first build was that the glowing orbs, the comet trail and the point that drew a line looked fake and childish. The request was frosted glass like the references, on an Apple-style background. The changes:

| Element | Before | After | Reference basis (observed in stills) |
|---|---|---|---|
| Backdrop | flat near-black with one warm pool | `Background.tsx`: deep black, a soft overhead light, and two large warm light fields drifting on 22 s / 27 s periods, plus a vignette | 018, 030, 037, 051: deep black with large soft light fields |
| Panels | dark cards with an orange rim gradient | `Card.tsx`: frosted glass (`backdrop-filter` blur + saturate), a 1px top highlight, warm light seeping through the lower edge, and a light field behind | 005/136, 042/144, 075/153 |
| Address bar | solid off-white pill | dark glass pill with warm light along its rim | 123/124/161 |
| Cookie sheet / primary buttons | off-white sheet, orange button | glass sheet, white pill primary button | 003/135 |
| Packets and nodes | radial-glow orbs | 3.5 px solid dots, hairline rings, no bloom | none; deliberate restraint |
| Scene 5 → 6 | cards collapse to a glowing point that traces an outline | cards slide together and the centre card becomes one glass window. That window *is* the thesis frame. | 005: two adjacent glass cards |
| Type | bold all-caps thesis | sentence-case Inter SemiBold, tight tracking (-3 at 92 px). Same words, with "see" in orange. | Apple-like typographic restraint (our choice) |
