import { Easing } from "remotion";

export const W = 1920;
export const H = 1080;
export const FPS = 60;

export const C = {
  ink: "#090A0B",
  panel: "#131315",
  panelHi: "#1B1B1E",
  line: "#242426",
  mute: "#85827E",
  orange: "#FF711C",
  warm: "#FF9C43",
  paper: "#F5F1E9",
  paperDim: "#D9D4CA",
} as const;

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const FONT = "Inter";

export const EASE = {
  camera: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  draw: Easing.bezier(0.33, 0, 0.2, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
  inOut: Easing.bezier(0.45, 0, 0.55, 1),
};

export const SPRING = {
  entry: { damping: 16, stiffness: 140, mass: 0.8 },
  press: { damping: 12, stiffness: 260, mass: 0.6 },
  settle: { damping: 20, stiffness: 120, mass: 1 },
  soft: { damping: 18, stiffness: 80, mass: 1 },
} as const;

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export const seeded = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
