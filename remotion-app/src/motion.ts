import { Easing, interpolate } from "remotion";

// Entrance: expo-out (fast arrival, long settle). Exit: expo-in (gentle start,
// quick departure). All times are in frames, so timing is frame-exact.
export const EASE_IN = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_OUT = Easing.bezier(0.7, 0, 0.84, 0);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 before `inStart`, 1 from `inEnd` to `outStart`, back to 0 at `outEnd`. */
export const presence = (
  frame: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
) =>
  interpolate(frame, [inStart, inEnd], [0, 1], { ...clamp, easing: EASE_IN }) *
  interpolate(frame, [outStart, outEnd], [1, 0], { ...clamp, easing: EASE_OUT });

/** Signed travel: +1 (below) while entering, 0 while held, -1 (above) after exit. */
export const travel = (
  frame: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
) =>
  interpolate(frame, [inStart, inEnd], [1, 0], { ...clamp, easing: EASE_IN }) +
  interpolate(frame, [outStart, outEnd], [0, -1], { ...clamp, easing: EASE_OUT });
