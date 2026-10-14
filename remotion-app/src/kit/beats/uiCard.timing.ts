// System A: LIVE-UI rows beside the speaker. Built from ONS-001 (network
// chips: initial tile + name + subline, stacked) and ONS-003 (inbox inquiry
// cards: small dark-glass message cards). Dark glass, one blue accent,
// staggered fade-rise-deblur entrance, all rows exit together.
import { E, clamp, firstFrameWhere, prog, snap } from "../motion";
import type { BeatTiming, SfxIntent } from "../types";

export type UiCardProps = {
  /** "rows": stacked chips (ONS-001); "inbox": message cards with a header (ONS-003). */
  variant?: "rows" | "inbox";
  /** Optional header ("Inquiries", "Clients"). */
  header?: string;
  /** 1-4 rows: title + optional subline (+ optional line icon and a short value on the right, glass look). Use the speaker's own words. */
  rows: { title: string; sub?: string; icon?: string; meta?: string }[];
  /**
   * "classic": separate flat chips (the original look, kept for versions built with it);
   * "glass": one premium frosted-glass card (GLASS-DARK / NEON-RIM: rim light, grid, grain, light sweep, 3D tilt-in, line icons).
   */
  look?: "classic" | "glass";
  /** Row index that is "active" (accent border + glow), or -1. */
  active?: number;
  /** Card block position (frame fractions): default right of centre in the UI band. */
  anchor?: { x: number; y: number };
  width?: number;
  accent?: string;
  inAt?: number;
  stagger?: number;
  outAt: number;
  outDur?: number;
};

export const uiDefaults = (p: UiCardProps) => ({
  variant: p.variant ?? "rows",
  look: p.look ?? "classic",
  anchor: p.anchor ?? { x: 0.6, y: 0.7 },
  width: p.width ?? 0.5,
  accent: p.accent ?? "#2F6BFF",
  inAt: p.inAt ?? 0.1,
  stagger: p.stagger ?? 0.1,
  outDur: p.outDur ?? 0.25,
  active: p.active ?? -1,
});

export const uiRowPose = (t: number, i: number, p: UiCardProps) => {
  const d = uiDefaults(p);
  const k = prog(t, d.inAt + (p.header && d.variant === "inbox" ? 0.08 : 0) + i * d.stagger, 0.32, "outCubic");
  const out = 1 - E.inCubic(clamp((t - p.outAt) / d.outDur));
  return { opacity: k * out, rise: (1 - k) * 16 + (1 - out) * -8, blur: (1 - k) * 7 };
};
/** The glass card as a whole: tilt-in, rim light, one light sweep, and the exit. */
export const uiCardPose = (t: number, p: UiCardProps) => {
  const d = uiDefaults(p);
  const out = 1 - E.inCubic(clamp((t - p.outAt) / d.outDur));
  return {
    card: prog(t, d.inAt - 0.06, 0.62, "outQuart"),
    rim: prog(t, d.inAt + 0.3, 0.8),
    sweep: clamp((t - d.inAt - 0.35) / 0.9),
    pulse: 0.5 + 0.5 * Math.sin(t * 4),
    out,
  };
};
// header of the inbox variant
export const uiHeaderPose = (t: number, p: UiCardProps) => uiRowPose(t + uiDefaults(p).stagger, -1, p);

export const uiCardTiming: BeatTiming<UiCardProps> = {
  system: "A",
  fullscreen: () => false,
  duration: (p) => p.outAt + uiDefaults(p).outDur + 0.1,
  sfx: (p, fps) => {
    const d = uiDefaults(p);
    const times = p.rows.map((_, i) => firstFrameWhere((t) => uiRowPose(t, i, p).opacity >= 0.5, fps, d.inAt, p.outAt) ?? snap(d.inAt, fps));
    const out: SfxIntent[] = [
      {
        id: "rows",
        label: `${p.rows.length} UI row(s) appear`,
        kind: "event",
        t: times[0],
        times,
        category: "UI",
        roles: ["ui-click", "mechanism-gizmo"],
        priority: "recommended",
        note: "UI elements pop up in sequence -> one UI click / gizmo per row, first visible frame, -6 to -7 dB.",
        measured_from: "first visible frame of each row",
      },
    ];
    if (d.active >= 0) {
      const ta = times[Math.min(d.active, times.length - 1)];
      out.push({ id: "active", label: "active row lights up", kind: "event", t: snap(ta + 0.25, fps), category: "SCI", roles: ["sci-fi-click"], priority: "optional" });
    }
    out.push({ id: "exit", label: "rows exit", kind: "event", t: snap(p.outAt, fps), category: null, roles: [], priority: "silence-ok", note: "Exits stay silent." });
    return out;
  },
};
