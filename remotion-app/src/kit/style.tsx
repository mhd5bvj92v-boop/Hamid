// The edit-wide style every animation follows, from the Creative Director's
// "Constants for the Whole Edit" (edit.json constants):
//  - the 60-30-10 palette: 60 % base (backgrounds, large surfaces), 30 % support
//    (panels, secondary shapes, body type), 10 % accent (the one thing to look at:
//    a key word, the active row, the glow). Nothing else but neutrals (white text,
//    black, greys) - off-palette colours are flagged by `edit_decisions.py preview`.
//  - the camera: every scene moves (push-in, drift, orbit, dynamic), never static.
// Components read it with useEditStyle() / usePalette(); <CameraMove> applies the move.
import React, { createContext, useContext } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { E, clamp, lerp } from "./motion";
import type { EditConstants } from "./project";

export type CameraStyle = "push-in" | "drift" | "orbit" | "dynamic" | "static";
export type CameraIntensity = "subtle" | "medium" | "strong";

export type EditStyle = {
  palette: { c60: string; c30: string; c10: string };
  camera: CameraStyle;
  cameraIntensity: CameraIntensity;
};

export const DEFAULT_STYLE: EditStyle = { palette: { c60: "#0A0F1F", c30: "#1E2A44", c10: "#2F6BFF" }, camera: "push-in", cameraIntensity: "medium" };

export const styleFromConstants = (c?: Partial<EditConstants> | null): EditStyle => ({
  palette: { c60: c?.color60 ?? DEFAULT_STYLE.palette.c60, c30: c?.color30 ?? DEFAULT_STYLE.palette.c30, c10: c?.accentColor ?? DEFAULT_STYLE.palette.c10 },
  camera: c?.camera ?? DEFAULT_STYLE.camera,
  cameraIntensity: c?.cameraIntensity ?? DEFAULT_STYLE.cameraIntensity,
});

const Ctx = createContext<EditStyle>(DEFAULT_STYLE);
export const EditStyleProvider: React.FC<{ constants?: Partial<EditConstants> | null; children: React.ReactNode }> = ({ constants, children }) => (
  <Ctx.Provider value={styleFromConstants(constants)}>{children}</Ctx.Provider>
);
export const useEditStyle = () => useContext(Ctx);
/** The 60-30-10 palette of this edit: c60 base, c30 support, c10 accent. */
export const usePalette = () => useContext(Ctx).palette;

const AMOUNT: Record<CameraIntensity, number> = { subtle: 0.6, medium: 1, strong: 1.7 };

/**
 * The camera at t seconds of a scene lasting `dur` seconds. Pure, so the same move drives
 * the picture and the sound intents. Values: scale, x / y (fractions of the frame), rotate
 * and rotateX / rotateY (degrees, for a perspective parent).
 */
export const cameraPose = (t: number, dur: number, move: CameraStyle = "push-in", intensity: CameraIntensity = "medium") => {
  const k = AMOUNT[intensity];
  const p = clamp(t / Math.max(dur, 0.01));
  const ease = E.inOutSine(p);
  switch (move) {
    case "static":
      return { scale: 1, x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0 };
    case "drift":
      return { scale: 1 + 0.04 * k, x: lerp(-0.018, 0.018, ease) * k, y: lerp(0.008, -0.008, ease) * k, rotate: lerp(-0.4, 0.4, ease) * k, rotateX: 0, rotateY: 0 };
    case "orbit":
      return { scale: 1 + 0.05 * k, x: 0, y: 0, rotate: 0, rotateX: lerp(4, -2, ease) * k, rotateY: lerp(-9, 9, ease) * k };
    case "dynamic": {
      // a fast push on arrival that settles into a slow drift
      const hit = E.outExpo(clamp(t / 0.7));
      return { scale: 1 + (0.12 * (1 - hit) + 0.035 * ease) * k, x: lerp(-0.01, 0.01, ease) * k, y: 0, rotate: (1 - hit) * -1.2 * k, rotateX: 0, rotateY: 0 };
    }
    default:
      return { scale: 1 + lerp(0, 0.07, ease) * k, x: 0, y: lerp(0.006, -0.006, ease) * k, rotate: 0, rotateX: 0, rotateY: 0 };
  }
};

/**
 * Wrap a scene's world in the edit's camera move (or an explicit one). `dur` = the scene's length in
 * seconds (e.g. outAt + outDur). Text that must stay perfectly still can sit outside the wrapper.
 */
export const CameraMove: React.FC<{ dur: number; move?: CameraStyle; intensity?: CameraIntensity; children: React.ReactNode }> = ({ dur, move, intensity, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const st = useEditStyle();
  const c = cameraPose(frame / fps, dur, move ?? st.camera, intensity ?? st.cameraIntensity);
  return (
    <AbsoluteFill style={{ perspective: 1800, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${c.x * width}px, ${c.y * height}px) scale(${c.scale}) rotate(${c.rotate}deg) rotateX(${c.rotateX}deg) rotateY(${c.rotateY}deg)`,
          transformOrigin: "50% 45%",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
