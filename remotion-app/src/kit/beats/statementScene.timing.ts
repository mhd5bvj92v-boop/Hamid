// System C full-screen statement. Three looks from the library:
//  "aurora"    FUL-063: blue aurora gradient, mixed-weight stacked headline
//              (light / bold alternating lines), one small script tag.
//  "editorial" FUL-090 (EDITORIAL-PRINT): light paper, navy condensed caps,
//              the key phrase in a highlight box that wipes in.
//  "streak"    FUL-006 (LIGHT-STREAK): black, two blue light streaks cross
//              behind a centred line; the cut lands at peak brightness.
// The scene covers the footage; the footage and dialogue keep running underneath.
import { E, clamp, envelope, fastestFrame, firstFrameWhere, prog, snap } from "../motion";
import type { BeatTiming, SfxIntent } from "../types";

export type StatementSceneProps = {
  variant?: "aurora" | "editorial" | "streak";
  /** The statement, one line per array item (2-4 short lines read best). Use the speaker's words. */
  lines: string[];
  /** Index of the line that carries the accent (bold / highlight box / glow). */
  accentLine?: number;
  kicker?: string;
  /** Small script tag (aurora) or footnote (editorial / streak). */
  tag?: string;
  accent?: string;
  inAt?: number;
  lineStagger?: number;
  camPush?: number;
  outAt: number;
  outDur?: number;
};

export const statementDefaults = (p: StatementSceneProps) => ({
  variant: p.variant ?? "aurora",
  accentLine: p.accentLine ?? Math.min(1, p.lines.length - 1),
  accent: p.accent ?? (p.variant === "editorial" ? "#1D4ED8" : "#2F6BFF"),
  inAt: p.inAt ?? 0.15,
  lineStagger: p.lineStagger ?? 0.16,
  camPush: p.camPush ?? 0.035,
  outDur: p.outDur ?? 0.35,
});

export const statementPose = (t: number, p: StatementSceneProps) => {
  const d = statementDefaults(p);
  const scene = envelope(t, -1, 0.01, p.outAt, d.outDur);
  const lines = p.lines.map((_, i) => prog(t, d.inAt + 0.2 + i * d.lineStagger, 0.45, "outQuart"));
  const box = prog(t, d.inAt + 0.2 + d.accentLine * d.lineStagger + 0.25, 0.35, "outCubic");
  // light streaks: fast at the start (outExpo), they cross and settle
  const streak = prog(t, 0, 0.9, "outExpo");
  const flash = 1 - E.inCubic(clamp(t / 0.25));
  return {
    scene,
    lines,
    box,
    streak,
    flash,
    tag: prog(t, d.inAt + 0.3 + p.lines.length * d.lineStagger, 0.4),
    push: 1 + d.camPush * prog(t, 0, p.outAt + d.outDur, "linear"),
  };
};

export const statementSceneTiming: BeatTiming<StatementSceneProps> = {
  system: "C",
  fullscreen: () => true,
  duration: (p) => p.outAt + statementDefaults(p).outDur + 0.1,
  sfx: (p, fps) => {
    const d = statementDefaults(p);
    const accentVisible = firstFrameWhere((t) => statementPose(t, p).lines[d.accentLine] >= 0.5, fps, d.inAt, p.outAt);
    const out: SfxIntent[] = [
      { id: "entry", label: "cut into the full-screen statement", kind: "transition", t: 0, category: "SCI", roles: ["activate-energy", "sci-fi-impact", "camera-click"], priority: "recommended", note: "Cut frame of a new scene; a riser can resolve here with a hit beneath (pass 3). No music under it." },
      { id: "accent", label: `accent line lands: "${p.lines[d.accentLine] ?? ""}"`, kind: "event", t: accentVisible ?? snap(d.inAt, fps), category: "POP", roles: ["pop", "sci-fi-click"], priority: "optional", measured_from: "first visible frame of the accent line" },
    ];
    if (d.variant === "streak") {
      out.push({ id: "streaks", label: "light streaks cross", kind: "movement", t: fastestFrame((t) => statementPose(t, p).streak, fps, 0, 0.9), category: "WSH", roles: ["transition-spacey-whoosh", "synthetic-whoosh", "futuristic-whoosh"], priority: "recommended", note: "Big fast move -> whoosh on its fastest frame, up to -10 dB.", measured_from: "fastest frame of the streaks" });
    }
    return out;
  },
};
