// House motion vocabulary (references/motion.md of the video-editing skill),
// ported 1:1 from templates/_runtime.js so Remotion beats move exactly like
// the reference-matched HTML templates. Pure functions of time: no React, so
// the same code drives the animation AND the sound-intent export.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const E = {
  linear: (x: number) => x,
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  outQuart: (x: number) => 1 - Math.pow(1 - x, 4),
  outQuint: (x: number) => 1 - Math.pow(1 - x, 5),
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inCubic: (x: number) => x * x * x,
  inOutCubic: (x: number) =>
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  inOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
  // gentle settle, overshoot capped at ~1.5% (the maximum the house style allows)
  settle: (x: number) => {
    const c = 1.05;
    return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  },
} as const;
export type EaseName = keyof typeof E;

/** 0..1 progress of the window [start, start + dur] (seconds) with easing. */
export const prog = (
  t: number,
  start: number,
  dur: number,
  ease: EaseName = "outCubic",
) => E[ease](clamp((t - start) / Math.max(dur, 1e-6)));

/** Enter / hold / exit envelope (0..1), e.g. for opacity. */
export const envelope = (
  t: number,
  inAt: number,
  inDur: number,
  outAt: number,
  outDur: number,
  easeIn: EaseName = "outCubic",
  easeOut: EaseName = "inCubic",
) =>
  t < outAt
    ? prog(t, inAt, inDur, easeIn)
    : 1 - E[easeOut](clamp((t - outAt) / Math.max(outDur, 1e-6)));

/** The house entrance: fade + rise + blur-to-sharp + slight scale. Returns CSS. */
export const enterStyle = (
  p: number,
  { rise = 14, blur = 8, scale = 0.97 } = {},
) => ({
  opacity: p,
  translate: `0px ${(1 - p) * rise}px`,
  scale: String(lerp(scale, 1, p)),
  filter: blur ? `blur(${(1 - p) * blur}px)` : undefined,
});

export const fmtNumber = (
  v: number,
  {
    decimals = 0,
    prefix = "",
    suffix = "",
  }: { decimals?: number; prefix?: string; suffix?: string } = {},
) =>
  prefix +
  Number(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) +
  suffix;

// ---------------------------------------------------------------- measuring
// Sound sync (System D) needs the *measured* frame of each visual event, not
// the declared start time. These helpers scan a pose function frame by frame.

/** Snap seconds to the composition's frame grid. */
export const snap = (t: number, fps: number) => Math.round(t * fps) / fps;

/** First frame (seconds) at or after `from` where pred(t) is true, or null. */
export const firstFrameWhere = (
  pred: (t: number) => boolean,
  fps: number,
  from: number,
  to: number,
) => {
  for (let f = Math.floor(from * fps); f <= Math.ceil(to * fps); f++) {
    if (pred(f / fps)) return f / fps;
  }
  return null;
};

/** Frame (seconds) of maximum speed of a scalar position function in [from, to]. */
export const fastestFrame = (
  pos: (t: number) => number,
  fps: number,
  from: number,
  to: number,
) => {
  let best = from;
  let bestV = -1;
  for (let f = Math.floor(from * fps); f < Math.ceil(to * fps); f++) {
    const v = Math.abs(pos((f + 1) / fps) - pos(f / fps));
    if (v > bestV) {
      bestV = v;
      best = f / fps;
    }
  }
  return best;
};
