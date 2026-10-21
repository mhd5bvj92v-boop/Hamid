// Shared anchors between scenes (global frames / screen coordinates).
import { Easing, interpolate } from "remotion";
import { EASE } from "../theme";
import { P } from "../components/Cursor";

/** Address bar → browser window morph spans the scene 1/2 boundary. */
export const EXPAND = { from: 184, to: 250 };
export const expandAt = (g: number) =>
  interpolate(g, [EXPAND.from, EXPAND.to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.camera,
  });

/** Camera scale both scenes agree on at frame 210. */
export const cam12 = (g: number) =>
  g < 210
    ? interpolate(g, [0, 184, 210], [1.1, 1.17, 1.175], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) })
    : interpolate(g, [210, 262, 380], [1.175, 1.0, 1.025], { extrapolateRight: "clamp", easing: EASE.camera });

/** Cursor rests here across the 1→2 cut. */
export const CURSOR_HANDOFF: P = [1470, 780];

/** Scene 2 click point (Accept all) and the node the camera dives into. */
export const CLICK: P = [1152, 862];
export const DIVE_NODE: P = [960, 430];
export const DIVE_SCALE = 4.2;

/** Scene 3 → 4: toggle at screen centre, scale of the handed-off toggle. */
export const TOGGLE_HANDOFF = { x: 931, y: 540, scale: 1.7 }; // knob lands at x=960

/** Scene 4 → 5: ring at screen centre. */
export const RING_HANDOFF = { x: 960, y: 540, r: 84 };

/** Scene 5 → 6: the three habit cards merge into this window frame (screen space). */
export const MERGE = { x: 960, y: 540, w: 1500, h: 560, r: 40 };
