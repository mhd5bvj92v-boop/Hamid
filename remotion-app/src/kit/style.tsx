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

export type CameraStyle =
  | "push-in"
  | "slow-zoom-in"
  | "fast-zoom-in"
  | "slow-zoom-out"
  | "fast-zoom-out"
  | "peak-middle"
  | "drift"
  | "orbit"
  | "dynamic"
  | "static";

/** Camera moves with a short label (Studio pickers, Claude briefs). */
export const CAMERA_MOVES: { id: CameraStyle; label: string }[] = [
  { id: "push-in", label: "Slow push-in" },
  { id: "slow-zoom-in", label: "Slow zoom in" },
  { id: "fast-zoom-in", label: "Fast zoom in (punch)" },
  { id: "slow-zoom-out", label: "Slow zoom out" },
  { id: "fast-zoom-out", label: "Fast zoom out (reveal)" },
  { id: "peak-middle", label: "Zoom in, peak in the middle, out" },
  { id: "drift", label: "Drift" },
  { id: "orbit", label: "Orbit (3D)" },
  { id: "dynamic", label: "Dynamic (punch-in, then drift)" },
  { id: "static", label: "Static" },
];
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

/** Relative luminance (0 dark .. 1 white) of a #RRGGBB colour. */
export const luminance = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6).padEnd(6, "0"), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
};
/** True when the edit's 60 % colour is a light base (off-white, paper, cream). */
export const isLightBase = (c60: string) => luminance(c60) > 0.5;
/** Text colour that reads on the 60 % base: near-black ink on light bases, white on dark ones. */
export const useInk = () => {
  const { c60, c30 } = usePalette();
  const light = isLightBase(c60);
  return {
    light,
    ink: light ? (luminance(c30) < 0.2 ? c30 : "#14161C") : "#FFFFFF",
    soft: light ? "rgba(20,22,28,.45)" : "rgba(255,255,255,.38)",
    shadow: light ? "0 2px 18px rgba(20,22,28,.10)" : "0 4px 24px rgba(0,0,0,.45)",
  };
};

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
    case "slow-zoom-in":
      return { scale: 1 + 0.12 * k * ease, x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0 };
    case "fast-zoom-in": {
      const z = E.outExpo(clamp(t / 0.45));
      return { scale: 1 + 0.16 * k * z + 0.02 * k * ease, x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0 };
    }
    case "slow-zoom-out":
      return { scale: 1 + 0.12 * k * (1 - ease), x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0 };
    case "fast-zoom-out": {
      const z = E.outExpo(clamp(t / 0.55));
      return { scale: 1 + 0.18 * k * (1 - z) + 0.02 * k * ease, x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0 };
    }
    case "peak-middle": {
      // in until the middle of the scene, then back out: the peak lands on the key moment
      const tri = 1 - Math.abs(2 * p - 1);
      return { scale: 1 + 0.14 * k * E.inOutSine(tri), x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0 };
    }
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
  const { fps, width, height } = useCanvas();
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

// ------------------------------------------------------------ formats: one design canvas for 9:16, 16:9 and 4K
// Animations are designed in a canvas whose SHORT side is 1080 px: 1080x1920 for vertical, 1920x1080 for
// landscape. <DesignCanvas> scales it to the real frame (2x for 4K), so every kind works in every format and
// stays sharp. Components read the canvas with useCanvas() instead of useVideoConfig() for width/height.
const CanvasCtx = createContext<{ width: number; height: number } | null>(null);

export const designSize = (w: number, h: number) =>
  w >= h ? { width: Math.round((1080 * w) / h), height: 1080 } : { width: 1080, height: Math.round((1080 * h) / w) };

export const DesignCanvas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  const d = designSize(width, height);
  const k = width / d.width;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: d.width, height: d.height, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <CanvasCtx.Provider value={d}>{children}</CanvasCtx.Provider>
      </div>
    </AbsoluteFill>
  );
};

/** useVideoConfig() with the design canvas's width/height (short side 1080). */
export const useCanvas = () => {
  const cfg = useVideoConfig();
  const c = useContext(CanvasCtx);
  const d = c ?? designSize(cfg.width, cfg.height);
  return { ...cfg, width: d.width, height: d.height, landscape: d.width > d.height };
};
