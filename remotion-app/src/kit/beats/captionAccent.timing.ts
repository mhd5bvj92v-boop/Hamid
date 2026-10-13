// System B caption: small sans connector words + one large expressive key
// phrase. Port of templates/caption-serif-accent.html (TXT-001..TXT-009).
import { E, clamp, firstFrameWhere, lerp, prog, snap } from "../motion";
import type { BeatTiming, SfxIntent } from "../types";

export type CaptionLineStyle =
  | "sans"
  | "sans-sm"
  | "serif"
  | "script"
  | "bold"
  | "tracked"
  | "micro";

export type CaptionAccentProps = {
  /** Group centre as frame fractions (default x .5, y .58: under the chin). */
  anchor?: { x: number; y: number };
  align?: "center" | "left";
  serifFont?: "Playfair Display" | "Instrument Serif";
  colors?: {
    text?: string;
    accent?: string;
    glow?: string;
    script?: string;
    boldFill?: string;
  };
  /** `at` = seconds from the beat start; `words` = exact per-word times from the transcript. */
  lines: {
    text: string;
    style: CaptionLineStyle;
    at: number;
    words?: { w: string; at: number }[];
  }[];
  wordStagger?: number;
  outAt: number;
  outDur?: number;
  nameSuper?: {
    name: string;
    role?: string;
    x?: number;
    y?: number;
    at?: number;
    outAt?: number;
    style?: "plain" | "boxed" | "highlight" | "serif";
  };
};

export const isHeavy = (s: CaptionLineStyle) =>
  s === "serif" || s === "script" || s === "bold";

/** Words with their own start times (key phrases land as one unit). */
export const captionWords = (p: CaptionAccentProps) =>
  p.lines.map(
    (ln) =>
      ln.words ??
      (isHeavy(ln.style)
        ? [{ w: ln.text, at: ln.at }]
        : ln.text
            .split(" ")
            .map((w, k) => ({ w, at: ln.at + k * (p.wordStagger ?? 0.09) }))),
  );

export const captionOut = (t: number, p: CaptionAccentProps) =>
  1 - E.inCubic(clamp((t - p.outAt) / (p.outDur ?? 0.28)));

/** Pose of one word at time t (seconds from the beat start). */
export const captionWordPose = (
  t: number,
  at: number,
  style: CaptionLineStyle,
  p: CaptionAccentProps,
) => {
  const heavy = isHeavy(style);
  const k = prog(t, at, heavy ? 0.42 : 0.24, heavy ? "outQuart" : "outCubic");
  const out = captionOut(t, p);
  return {
    opacity: k * out,
    rise: heavy ? 0 : (1 - k) * 12 + (1 - out) * -10,
    scale: heavy ? lerp(0.92, 1, k) : 1,
    blur: (1 - k) * (heavy ? 10 : 6),
    k,
  };
};

export const nameSuperPose = (
  t: number,
  n: NonNullable<CaptionAccentProps["nameSuper"]>,
) => {
  const at = n.at ?? 0.2;
  const outAt = n.outAt ?? 2.6;
  const e =
    t < outAt ? prog(t, at, 0.35) : 1 - E.inCubic(clamp((t - outAt) / 0.25));
  return { opacity: e, x: (1 - e) * -14, rule: prog(t, at, 0.4) };
};

export const captionAccentTiming: BeatTiming<CaptionAccentProps> = {
  system: "B",
  fullscreen: () => false,
  duration: (p) =>
    Math.max(
      p.outAt + (p.outDur ?? 0.28),
      p.nameSuper ? (p.nameSuper.outAt ?? 2.6) + 0.3 : 0,
    ) + 0.1,
  sfx: (p, fps) => {
    const out: SfxIntent[] = [];
    const words = captionWords(p);
    p.lines.forEach((ln, i) => {
      if (!isHeavy(ln.style)) return;
      const at = words[i][0].at;
      const vis = firstFrameWhere(
        (t) => captionWordPose(t, at, ln.style, p).opacity >= 0.5,
        fps,
        at,
        p.outAt,
      );
      out.push({
        id: `key-${i}`,
        label: `key phrase lands: "${ln.text}"`,
        kind: "event",
        t: vis ?? snap(at, fps),
        category: "POP",
        roles: ["pop", "sci-fi-click", "ui-click"],
        priority: "recommended",
        note: "Text pops as a whole element -> Pop (Joseph). First visible frame; -6 to -7 dB. Skip on emotional lines.",
        measured_from:
          vis === null
            ? "NOT FOUND - declared time"
            : "first visible frame (opacity >= 0.5)",
      });
    });
    if (!out.length) {
      out.push({
        id: "connectors",
        label: "connector words only",
        kind: "event",
        t: snap(p.lines[0]?.at ?? 0, fps),
        category: "POP",
        roles: [],
        priority: "silence-ok",
        note: "Small fade-rise words: no sound by default.",
      });
    }
    if (p.nameSuper) {
      const n = p.nameSuper;
      const vis = firstFrameWhere(
        (t) => nameSuperPose(t, n).opacity >= 0.5,
        fps,
        n.at ?? 0.2,
        n.outAt ?? 2.6,
      );
      out.push({
        id: "name-super",
        label: "name super appears",
        kind: "event",
        t: vis ?? snap(n.at ?? 0.2, fps),
        category: "UI",
        roles: ["ui-click"],
        priority: "optional",
        note: "A 14px slide is a pop, not a slide: texture, never a whoosh.",
        measured_from: "first visible frame (opacity >= 0.5)",
      });
    }
    out.push({
      id: "exit",
      label: "caption exits",
      kind: "event",
      t: snap(p.outAt, fps),
      category: null,
      roles: [],
      priority: "silence-ok",
      note: "Exits stay silent.",
    });
    return out;
  },
};
