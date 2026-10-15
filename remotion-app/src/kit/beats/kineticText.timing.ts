// KineticText (System B; full-screen when placement is "fullscreen"): the text-animation
// library. One kind, many styles, all in the edit's palette (accent words in the 10 %
// colour with a deep glow), Montserrat only, and the speaker's own words.
//   typewriter     letters type on with a blinking cursor
//   word-pop       words pop in with a small overshoot
//   word-rise      words rise out of blur, one by one
//   letter-cascade letters fall into place
//   blur-in        the line resolves from a heavy blur while the tracking tightens
//   mask-reveal    each line slides up inside its own mask
//   highlight-sweep words appear, then a glowing bar sweeps behind the accent words
//   glitch         RGB-split jitter that snaps into a clean line
//   scramble       random characters resolve into the words
//   scale-punch    the phrase punches in from big to its size
//   slide-stack    lines slide in from alternating sides
//   karaoke        the whole line is visible; each word lights up as it is spoken
import { E, clamp, firstFrameWhere, prog, snap } from "../motion";
import type { BeatTiming, SfxIntent } from "../types";

export const TEXT_STYLES = [
  "typewriter",
  "word-pop",
  "word-rise",
  "letter-cascade",
  "blur-in",
  "mask-reveal",
  "highlight-sweep",
  "glitch",
  "scramble",
  "scale-punch",
  "slide-stack",
  "karaoke",
] as const;
export type TextStyle = (typeof TEXT_STYLES)[number];

export type KineticTextProps = {
  /** The speaker's exact words. */
  text: string;
  style?: TextStyle;
  /** Words (or phrases) shown in the accent colour with a glow. */
  accent?: string[];
  /** "caption": lower third over the footage; "center": over the footage; "fullscreen": own animated background. */
  placement?: "caption" | "center" | "fullscreen";
  /** Background library preset for fullscreen (backgrounds.tsx). */
  background?: string;
  size?: "s" | "m" | "l" | "xl";
  /** Max words per line (auto line breaks). */
  wordsPerLine?: number;
  /** Seconds from the beat start at which each word is spoken (karaoke / sync); default evenly spread. */
  wordTimes?: number[];
  /** Small tracked label above (fullscreen / center). */
  kicker?: string;
  inAt?: number;
  /** Seconds between words (or letters for letter styles). */
  stagger?: number;
  outAt: number;
  outDur?: number;
};

export const textDefaults = (p: KineticTextProps) => {
  const style = p.style ?? "word-rise";
  const letters = style === "typewriter" || style === "letter-cascade" || style === "scramble";
  return {
    style,
    placement: p.placement ?? "caption",
    background: p.background ?? "aurora",
    size: p.size ?? (p.placement === "fullscreen" ? "xl" : p.placement === "center" ? "l" : "m"),
    wordsPerLine: p.wordsPerLine ?? (p.placement === "fullscreen" ? 3 : 4),
    inAt: p.inAt ?? 0.1,
    stagger: p.stagger ?? (letters ? 0.035 : style === "karaoke" ? 0 : 0.12),
    outDur: p.outDur ?? 0.3,
    letters,
  };
};

export const splitWords = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/** Progress (0..1) of word i (letter styles: of each word's first letter) at t. */
export const wordProg = (t: number, i: number, p: KineticTextProps) => {
  const d = textDefaults(p);
  const words = splitWords(p.text);
  if (d.style === "karaoke") {
    const times = p.wordTimes ?? words.map((_, k) => d.inAt + (k * (p.outAt - d.inAt - 0.2)) / Math.max(1, words.length));
    return t >= (times[i] ?? Infinity) ? 1 : 0;
  }
  const before = words.slice(0, i).join(" ").length + (i ? 1 : 0);
  const start = d.letters ? d.inAt + before * d.stagger : d.inAt + i * d.stagger;
  return prog(t, start, d.letters ? d.stagger * 2 : 0.45, d.style === "word-pop" || d.style === "scale-punch" ? "settle" : "outQuart");
};

export const textScene = (t: number, p: KineticTextProps) => {
  const d = textDefaults(p);
  const out = t > p.outAt ? E.inCubic(clamp((t - p.outAt) / d.outDur)) : 0;
  return { out, in: prog(t, 0, 0.25) };
};

export const kineticTextTiming: BeatTiming<KineticTextProps> = {
  system: "B",
  fullscreen: (p) => (p.placement ?? "caption") === "fullscreen",
  duration: (p) => p.outAt + textDefaults(p).outDur + 0.1,
  sfx: (p, fps) => {
    const d = textDefaults(p);
    const words = splitWords(p.text);
    const out: SfxIntent[] = [];
    if (d.placement === "fullscreen")
      out.push({ id: "entry", label: "cut into the full-screen text", kind: "transition", t: 0, category: "SCI", roles: ["activate-energy", "sci-fi-impact"], priority: "recommended" });
    const times = words.map((_, i) => firstFrameWhere((t) => wordProg(t, i, p) >= 0.5, fps, 0, p.outAt) ?? snap(d.inAt, fps));
    out.push({
      id: "words",
      label: d.style === "typewriter" ? "letters type on" : `${words.length} words appear (${d.style})`,
      kind: "event",
      t: times[0],
      times: d.style === "typewriter" || d.style === "scramble" ? undefined : times,
      category: d.style === "typewriter" || d.style === "scramble" ? "UI" : "POP",
      roles: d.style === "typewriter" ? ["keyboard", "ui-click"] : ["pop", "sci-fi-click"],
      priority: "optional",
      measured_from: "first visible frame of each word",
    });
    const acc = (p.accent ?? [])[0];
    if (acc) {
      const i = words.findIndex((w) => w.toLowerCase().replace(/[^\w]/g, "").startsWith(acc.toLowerCase().split(/\s+/)[0].replace(/[^\w]/g, "")));
      if (i >= 0) out.push({ id: "accent", label: `accent lands: "${acc}"`, kind: "event", t: times[i], category: "HIT", roles: ["impact-hit"], priority: "optional" });
    }
    return out;
  },
};
