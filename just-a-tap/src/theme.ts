import { Easing } from "remotion";

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const TOTAL = 1200;

export const C = {
  canvas: "#F5F2EC",
  ink: "#101114",
  orange: "#FF762B",
  deep: "#D9571A",
  soft: "#FFC39E",
  cream: "#FFFCF7",
  neutral: "#B9B3AC",
  white: "#FFFFFF",
  surface: "#191A1E",
  // derived tints (alpha of the tokens above)
  mute: "#8C8781", // neutral darkened for text on cream
  track: "#EFEBE4",
} as const;

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const R = { s: 8, m: 14, l: 22, xl: 30, phone: 62 } as const;

export const FONT = "Inter";

export const SHADOW = {
  e1: `0 1px 2px ${rgba(C.ink, 0.06)}`,
  e2: `0 8px 24px ${rgba(C.ink, 0.08)}, 0 1px 2px ${rgba(C.ink, 0.05)}`,
  e3: `0 30px 80px ${rgba(C.ink, 0.14)}, 0 8px 20px ${rgba(C.ink, 0.06)}`,
  dark: `0 40px 90px ${rgba(C.deep, 0.22)}, 0 16px 40px ${rgba(C.ink, 0.28)}`,
};

export const EASE = {
  camera: Easing.bezier(0.65, 0, 0.35, 1),
  morph: Easing.bezier(0.7, 0, 0.2, 1),
  exit: Easing.bezier(0.5, 0, 0.75, 0),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  draw: Easing.bezier(0.33, 0, 0.2, 1),
  inOut: Easing.bezier(0.45, 0, 0.55, 1),
};

export const SPRING = {
  ui: { damping: 16, stiffness: 170, mass: 0.7 },
  settle: { damping: 22, stiffness: 110, mass: 1 },
  press: { damping: 13, stiffness: 300, mass: 0.5 },
} as const;
