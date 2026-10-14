// HalfPanel (Halfscreen): a designed panel fills the lower half of the frame while
// the speaker stays visible in the upper half (face zone 15-48% untouched). Kicker,
// a headline with one accent word, and up to 4 short rows that restate the speaker's
// words. The panel slides up from the bottom edge, rows stagger in, and it slides
// back down. Pure: the same pose drives the component and the sound intents.
import { E, clamp, firstFrameWhere, prog, snap } from "../motion";
import type { BeatTiming, SfxIntent } from "../types";

export type HalfPanelProps = {
  kicker?: string;
  headline: string;
  /** Word(s) of the headline drawn in the accent colour / accent font. */
  accent?: string;
  rows?: string[];
  /** Panel top edge as a fraction of the frame height (0.5 = exactly half). */
  top?: number;
  inAt?: number;
  rowsAt?: number;
  stagger?: number;
  outAt: number;
  outDur?: number;
  accentColor?: string;
  background?: string;
  accentFont?: "Instrument Serif" | "Playfair Display" | "JetBrains Mono" | "Montserrat";
};

export const halfDefaults = (p: HalfPanelProps) => ({
  top: p.top ?? 0.5,
  inAt: p.inAt ?? 0,
  rowsAt: p.rowsAt ?? 0.45,
  stagger: p.stagger ?? 0.16,
  outDur: p.outDur ?? 0.35,
  accentColor: p.accentColor ?? "#2F6BFF",
  background: p.background ?? "linear-gradient(180deg, #0B0D14 0%, #05070D 100%)",
  accentFont: p.accentFont ?? "Instrument Serif",
});

/** 0 = panel fully below the frame, 1 = in place. */
export const panelPose = (t: number, p: HalfPanelProps) => {
  const d = halfDefaults(p);
  const inK = prog(t, d.inAt, 0.38, "outQuart");
  const outK = E.inCubic(clamp((t - p.outAt) / d.outDur));
  return { slide: inK * (1 - outK) };
};

export const halfRowPose = (t: number, i: number, p: HalfPanelProps) => {
  const d = halfDefaults(p);
  const k = prog(t, d.rowsAt + i * d.stagger, 0.3, "outCubic");
  return { opacity: k, dx: (1 - k) * -18 };
};

export const halfPanelTiming: BeatTiming<HalfPanelProps> = {
  system: "A",
  fullscreen: () => false,
  duration: (p) => p.outAt + halfDefaults(p).outDur,
  sfx: (p, fps) => {
    const d = halfDefaults(p);
    const rows = (p.rows ?? []).map((_, i) => firstFrameWhere((t) => halfRowPose(t, i, p).opacity >= 0.5, fps, d.rowsAt, p.outAt) ?? snap(d.rowsAt + i * d.stagger, fps));
    const intents: SfxIntent[] = [
      { id: "panel-in", label: "half-screen panel slides up", kind: "movement", t: snap(d.inAt + 0.19, fps), category: "WSH", roles: ["soft-whoosh"], priority: "recommended",
        note: "the panel's fastest movement", measured_from: "panel slide midpoint" },
    ];
    if (rows.length)
      intents.push({ id: "rows", label: `${rows.length} row(s) appear`, kind: "event", t: rows[0], times: rows, category: "UI", roles: ["ui-click"], priority: "recommended", measured_from: "row opacity >= 0.5" });
    intents.push({ id: "panel-out", label: "panel slides down", kind: "movement", t: snap(p.outAt + d.outDur / 2, fps), category: "WSH", roles: ["soft-whoosh"], priority: "optional" });
    return intents;
  },
};
