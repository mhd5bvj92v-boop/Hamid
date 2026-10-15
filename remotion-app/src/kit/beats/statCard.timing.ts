// System A (or C with fullscreen: true): tall glass stat card, neon rim on the
// lower edge, a bell curve that draws to a glowing peak, a big count-up.
// Port of templates/stat-card.html (ONS-024 blue 400%, ONS-050 green 300%).
import { envelope, fastestFrame, firstFrameWhere, prog, snap } from "../motion";
import type { BeatTiming } from "../types";

export type StatCardProps = {
  fullscreen?: boolean;
  /** Full-screen only: a background library preset (backgrounds.tsx) instead of the default dark stage. */
  background?: string;
  /** Card centre as frame fractions (System A default sits in the UI band). */
  center?: { x: number; y: number };
  /** Card width as a fraction of frame width. */
  cardWidth?: number;
  uiScale?: number;
  accent?: string;
  glow?: string;
  header?: string;
  pill?: string;
  label: string;
  /** Use the speaker's own number. Never invent data. */
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  footnote?: string;
  inAt?: number;
  drawAt?: number;
  drawDur?: number;
  countAt?: number;
  countDur?: number;
  outAt: number;
  outDur?: number;
};

// System A default: a 40%-wide card (0.8 aspect = 28% of the height) centred at
// 71% so it stays inside the 58-85% UI band, clear of the face and of the
// platform's bottom-safe zone. Full-screen: the template's 62% card, centred.
// Type scales with the card (uiScale = cardWidth / 0.62) unless set.
export const statDefaults = (p: StatCardProps) => {
  const cardWidth = p.cardWidth ?? (p.fullscreen ? 0.62 : 0.4);
  const drawAt = p.drawAt ?? 0.45;
  const countAt = p.countAt ?? 0.9;
  return {
    center: p.center ?? { x: 0.5, y: p.fullscreen ? 0.5 : 0.71 },
    cardWidth,
    uiScale: p.uiScale ?? cardWidth / 0.62,
    accent: p.accent ?? "#2F6BFF",
    glow: p.glow ?? "rgba(47,107,255,.55)",
    inAt: p.inAt ?? 0.15,
    drawAt,
    // the draw and the count-up always finish while the card is fully visible
    // (>= 0.15 s before the exit), however short the beat is
    drawDur: Math.max(0.3, Math.min(p.drawDur ?? 1.1, p.outAt - 0.15 - drawAt)),
    countAt,
    countDur: Math.max(
      0.3,
      Math.min(p.countDur ?? 1.1, p.outAt - 0.15 - countAt),
    ),
    outDur: p.outDur ?? 0.35,
  };
};

// The curve: the template's 121-point polyline in a 600x300 viewBox.
export const CURVE: [number, number][] = Array.from({ length: 121 }, (_, i) => {
  const x = i / 120;
  return [
    x * 600,
    260 - 220 * Math.exp(-Math.pow((x - 0.5) / 0.12, 2)) - 18 * Math.sin(x * 9),
  ];
});
const SEG = CURVE.slice(1).map((p, i) =>
  Math.hypot(p[0] - CURVE[i][0], p[1] - CURVE[i][1]),
);
export const CURVE_LENGTH = SEG.reduce((a, b) => a + b, 0);
export const pointAtLength = (len: number): [number, number] => {
  let rest = Math.max(0, Math.min(len, CURVE_LENGTH));
  for (let i = 0; i < SEG.length; i++) {
    if (rest <= SEG[i]) {
      const k = SEG[i] ? rest / SEG[i] : 0;
      return [
        CURVE[i][0] + (CURVE[i + 1][0] - CURVE[i][0]) * k,
        CURVE[i][1] + (CURVE[i + 1][1] - CURVE[i][1]) * k,
      ];
    }
    rest -= SEG[i];
  }
  return CURVE[CURVE.length - 1];
};

export const statPose = (t: number, p: StatCardProps) => {
  const d = statDefaults(p);
  const e = envelope(t, d.inAt, 0.45, p.outAt, d.outDur);
  const draw = prog(t, d.drawAt, d.drawDur, "inOutCubic");
  const peakT = d.drawAt + d.drawDur * 0.5;
  const flash = prog(t, peakT, 0.25) * (1 - prog(t, peakT + 0.25, 0.6));
  const count = prog(t, d.countAt, d.countDur, "outExpo");
  return { e, draw, dotLen: CURVE_LENGTH * Math.min(draw, 0.5), flash, count };
};

export const statCardTiming: BeatTiming<StatCardProps> = {
  system: "A",
  fullscreen: (p) => Boolean(p.fullscreen),
  duration: (p) => p.outAt + statDefaults(p).outDur + 0.1,
  sfx: (p, fps) => {
    const d = statDefaults(p);
    const vis = firstFrameWhere(
      (t) => statPose(t, p).e >= 0.5,
      fps,
      d.inAt,
      p.outAt,
    );
    const fastest = fastestFrame(
      (t) => statPose(t, p).dotLen,
      fps,
      d.drawAt,
      d.drawAt + d.drawDur,
    );
    const peakT = d.drawAt + d.drawDur * 0.5;
    return [
      {
        id: "card",
        label: "stat card revealed",
        kind: p.fullscreen ? "transition" : "event",
        t: vis ?? snap(d.inAt, fps),
        category: "SCI",
        roles: p.fullscreen
          ? ["activate-energy", "sci-fi-impact"]
          : ["sci-fi-impact", "ui-click"],
        priority: "recommended",
        note: p.fullscreen
          ? "Entry into a new animation -> activate-energy / sci-fi entry; consider a riser resolving on the cut (pass 3)."
          : "New UI is revealed -> sci-fi impact, first visible frame.",
        measured_from: "first visible frame (envelope >= 0.5)",
      },
      {
        id: "curve",
        label: "curve draws to the peak (dot travels)",
        kind: "movement",
        t: fastest,
        category: "WSH",
        roles: ["futuristic-whoosh", "deep-voice-whoosh", "hollow-whoosh"],
        priority: "recommended",
        note: "Movement inside the animation -> whoosh, loudest point on the dot's fastest frame, -12 dB.",
        measured_from: "fastest frame of the dot",
      },
      {
        id: "peak",
        label: "peak node flashes",
        kind: "event",
        t: snap(peakT, fps),
        category: "SCI",
        roles: ["sci-fi-click", "video-scan"],
        priority: "recommended",
      },
      {
        id: "count",
        label: "number counts up",
        kind: "continuous",
        t: snap(d.countAt, fps),
        t_end: snap(d.countAt + d.countDur, fps),
        category: "MEC",
        roles: ["gears", "video-scan"],
        priority: "optional",
        note: "Usually silent: the peak flash already carries the moment.",
      },
    ];
  },
};
