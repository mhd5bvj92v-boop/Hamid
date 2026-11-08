# The Paris Job — Episode 1: "The Plan"

Vertical (1080×1920, 30 fps, about 61 s) 3D-animated Short. No voices; the dialogue appears as on-screen subtitles.
Everything is generated in code: three.js scenes rendered in headless Chromium, plus a synthesized score and sound design.

**Cast:** Victor (the brain, allegedly), Sasha (the hacker, actually the brain), Marco (the driver, no license).
**Cliffhanger:** someone else is already inside the Louvre. Next: *Episode 2 — The Competition*.

| File | What it does |
|---|---|
| `js/person.js` | Stylized human rig: face (eyes, lids, brows, mouth), hair styles, and poses |
| `js/world.js` | Paris rooftop at night, the Eiffel Tower, the city, and the Louvre gallery |
| `js/main.js` | Timeline: acting, camera shots, subtitles, name cards, CCTV look, end card |
| `audio.py` | Music (D-minor heist groove) and all sound effects, synthesized with numpy |
| `render.js` | Frame renderer (`stills` for checking shots, `video` for segments) |
| `finish.sh` | Joins the segments, adds the audio and normalizes it to -14 LUFS |

## Rebuild
```bash
npm install
node render.js video 0 610 work/seg/seg0.mp4      # run all three ranges (can run in parallel)
node render.js video 610 1220 work/seg/seg1.mp4
node render.js video 1220 1830 work/seg/seg2.mp4
./finish.sh                                        # -> output/the-paris-job_ep01_the-plan.mp4
```
