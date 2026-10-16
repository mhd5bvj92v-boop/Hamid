// Recipe "Anchored popover" (brief §32, §8): a trigger appears, responds (a small press), and a popover grows
// out of it (transform origin = the trigger) with 1-3 rows; it then returns into the trigger. Variant
// "notification": a notice arrives at the top of the safe area, is read, and clears upward.
// Scale stays in 0.96..1 (no explosion from zero); opacity has its own envelope.
import { firstFrameWhere, snap } from "../motion";
import { DUR, ease, local, staggerAt } from "../motionTokens";
import type { BeatTiming, SfxIntent } from "../types";

export type PopoverProps = {
  variant?: "popover" | "notification";
  /** popover: the button it opens from (frame fractions); default on the right third */
  trigger?: { label: string; x?: number; y?: number };
  title: string;
  /** 1-3 short rows (icon = LineIcon name) */
  rows?: { text: string; icon?: string }[];
  icon?: string;
  /** seconds from the beat start: the trigger is pressed / the notice arrives */
  openAt?: number;
  /** when it closes (returns into the trigger / clears) */
  outAt: number;
  fullscreen?: boolean;
  background?: string;
  accent?: string;
};

export const popDefaults = (p: PopoverProps) => ({
  variant: p.variant ?? "popover",
  openAt: p.openAt ?? (p.variant === "notification" ? 0.1 : 0.45),
  closeDur: 0.3,
  openDur: DUR.panel * 0.8,
  rows: (p.rows ?? []).slice(0, 3),
});

export const popPose = (t: number, p: PopoverProps) => {
  const d = popDefaults(p);
  const trigger = ease("arriveGently", local(t, 0, 0.3)) * (1 - ease("leaveSoft", local(t, p.outAt + d.closeDur, p.outAt + d.closeDur + 0.25)));
  // the press: a 0.12 s dip just before it opens (feedback), then back
  const press = Math.sin(Math.PI * local(t, d.openAt - 0.12, d.openAt + 0.05));
  const openRaw = local(t, d.openAt, d.openAt + d.openDur);
  const closeRaw = local(t, p.outAt, p.outAt + d.closeDur);
  const open = ease("arriveGently", openRaw);
  const close = ease("leaveDecisively", closeRaw);
  const opacity = Math.min(1, local(t, d.openAt, d.openAt + d.openDur * 0.5)) * (1 - close);
  const rows = d.rows.map((_, i) => ease("arriveGently", local(t, d.openAt + 0.15 + staggerAt(i, d.rows.length, 0.07, 0.25), d.openAt + 0.45 + staggerAt(i, d.rows.length, 0.07, 0.25))));
  return { trigger, press, open, close, openRaw, closeRaw, opacity, scale: 0.96 + 0.04 * open - 0.04 * close, rows };
};

export const popoverTiming: BeatTiming<PopoverProps> = {
  system: "A",
  fullscreen: (p) => Boolean(p.fullscreen),
  duration: (p) => p.outAt + popDefaults(p).closeDur + 0.3,
  sfx: (p, fps) => {
    const d = popDefaults(p);
    const out: SfxIntent[] = [
      d.variant === "notification"
        ? { id: "arrive", label: "notification arrives", kind: "event", t: firstFrameWhere((t) => popPose(t, p).open >= 0.5, fps, d.openAt, p.outAt) ?? snap(d.openAt, fps),
            category: "POP", roles: ["pop", "ui-click"], priority: "recommended", measured_from: "first frame the notice is half open" }
        : { id: "press", label: `"${p.trigger?.label ?? "button"}" is pressed, the popover opens`, kind: "event", t: snap(d.openAt, fps), category: "UI", roles: ["ui-click"], priority: "recommended" },
      { id: "close", label: d.variant === "notification" ? "notice clears" : "popover returns into the trigger", kind: "event", t: snap(p.outAt, fps), category: null, roles: [], priority: "silence-ok", note: "Closing stays quiet." },
    ];
    return out;
  },
};
