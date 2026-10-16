// House motion + type tokens shared by the renderer and the Studio (brief §4, §6, §25). Numbers are our
// starting points, not universal rules: tune them on a rendered preview. Everything is a pure function of
// time, so seeking to a frame gives the same image as playing to it.
import { E, EaseName, clamp } from "./motion";

/** Durations in seconds (convert with the composition's fps; never hard-code frames). */
export const DUR = {
  /** small UI feedback: a toggle, a tick */
  feedback: 0.17,
  /** a label or short text landing */
  label: 0.3,
  /** a card or panel arriving */
  panel: 0.5,
  /** a hero object reveal */
  hero: 0.8,
  /** clearing the frame */
  exit: 0.28,
  /** delay between related items, and the cap on the whole stagger */
  stagger: 0.06,
  staggerCap: 0.4,
  /** one broad cycle of ambient background movement */
  ambient: 10,
} as const;

/**
 * Semantic curves: say what the object does. "arrive" = decelerate into place; "leave" = accelerate away;
 * "travel" = start and stop softly (an object moving between two rests); "constant" = progress bars.
 */
export const CURVE: Record<"arriveGently" | "arriveFirm" | "arriveSoftSettle" | "leaveDecisively" | "leaveSoft" | "travel" | "constant", EaseName> = {
  arriveGently: "outQuart",
  arriveFirm: "outExpo",
  arriveSoftSettle: "settle",
  leaveDecisively: "inCubic",
  leaveSoft: "inOutSine",
  travel: "inOutCubic",
  constant: "linear",
};

/** Spring presets for remotion's spring(): precise UI, soft UI, deliberate emphasis. */
export const SPRING = {
  preciseUi: { damping: 26, stiffness: 260, mass: 1, overshootClamping: false },
  softUi: { damping: 20, stiffness: 140, mass: 1, overshootClamping: false },
  emphasis: { damping: 13, stiffness: 120, mass: 1, overshootClamping: false },
} as const;

/** Type scale (design px on the 1080-short-side canvas). Hook / key phrase / support / UI label / caption. */
export const TYPE = {
  portrait: { hook: 100, key: 76, support: 48, ui: 44, caption: 56 },
  landscape: { hook: 92, key: 68, support: 40, ui: 34, caption: 46 },
  weights: { hook: 800, key: 700, support: 500, ui: 600, caption: 600 },
  tracking: { hook: "-0.02em", key: "-0.015em", support: "0em", ui: "0.01em", caption: "0em" },
} as const;

/** 8-based spacing and the radii every surface shares (one card anatomy across the whole video). */
export const SPACE = [0, 8, 16, 24, 32, 48, 64, 96, 128] as const;
export const RADII = { chip: 14, card: 28, panel: 36, pill: 999 } as const;

/** Clamped local progress of [a, b) at t; a coincident boundary is a step (no division by zero). */
export const local = (t: number, a: number, b: number) => (b > a ? clamp((t - a) / (b - a)) : t >= a ? 1 : 0);

export type Phases = { enterStart: number; enterEnd: number; exitStart: number; exitEnd: number; holdOk: boolean };

/**
 * Allocate enter / readable hold / exit inside a segment of `total` seconds (brief §6, §16). Reading time
 * wins: when the segment is short, enter and exit shrink proportionally so at least `minHold` stays; a
 * segment too short for that gets a quick fade (enter/exit 25 % each); a zero-length one is a step.
 */
export const allocatePhases = (total: number, enter: number = DUR.panel, exit: number = DUR.exit, minHold = 0.6): Phases => {
  if (!(total > 0)) return { enterStart: 0, enterEnd: 0, exitStart: 0, exitEnd: 0, holdOk: false };
  let en = enter;
  let ex = exit;
  if (en + ex + minHold > total) {
    const room = Math.max(0, total - minHold);
    const k = room / (en + ex);
    en *= k;
    ex *= k;
    if (en + ex < total * 0.2) {
      en = total * 0.25;
      ex = total * 0.25;
    }
  }
  return { enterStart: 0, enterEnd: en, exitStart: total - ex, exitEnd: total, holdOk: total - en - ex >= minHold - 1e-6 };
};

/** Total stagger capped: item i of n starts at min(i * step, cap * i / (n - 1)). */
export const staggerAt = (i: number, n: number, step: number = DUR.stagger, cap: number = DUR.staggerCap) =>
  n <= 1 ? 0 : Math.min(i * step, (cap * i) / (n - 1));

/** Ease by semantic name at progress p. */
export const ease = (name: keyof typeof CURVE, p: number) => E[CURVE[name]](clamp(p));
