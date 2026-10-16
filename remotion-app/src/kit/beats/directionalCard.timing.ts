// Recipe "Directional card" (brief §32): one dark card arrives from a side, settles at its anchor,
// communicates ONE state change, then continues out the other side (progressive travel: right -> left).
// "return" exits back where it came from (a cancelled action / a drawer closing) and is a deliberate choice.
// Translation leads; opacity and a 0.97 -> 1 scale support it (separate envelopes, so alpha stays 0..1).
// Short segments shrink enter/exit before they eat into the readable hold (allocatePhases).
import { firstFrameWhere, fastestFrame, snap } from "../motion";
import { allocatePhases, ease, local } from "../motionTokens";
import type { BeatTiming, SfxIntent } from "../types";

export type DirectionalCardProps = {
  /** small header ("Workflow", "Invoice #212") */
  label?: string;
  /** the one line to read: the speaker's point */
  title: string;
  /** the one state change the card shows (e.g. Pending -> Approved); omit for a card without a change */
  status?: { from: string; to: string };
  /** LineIcon name (premium.tsx) */
  icon?: string;
  /** seconds from the beat start at which the state changes (default: middle of the hold) */
  changeAt?: number;
  /** default: the motion control's direction (Properties → Motion), else right */
  enterFrom?: "right" | "left" | "bottom";
  /** "continue" (default): leaves in the travel direction; "return": goes back where it came from */
  exit?: "continue" | "return";
  /** "offscreen": starts/ends fully outside the frame (bounds incl. glow); "short": a short in-frame travel with opacity */
  travel?: "offscreen" | "short";
  /** where the card settles: on the thirds or centred */
  anchor?: "center" | "left-third" | "right-third";
  /** System C: full-screen over its own background (or the edit's stage) */
  fullscreen?: boolean;
  background?: string;
  /** a soft backing scrim behind the card, fading with it (over busy footage) */
  scrim?: boolean;
  accent?: string;
  inAt?: number;
  /** when the exit starts (seconds from the beat start) */
  outAt: number;
  enterDur?: number;
  exitDur?: number;
};

export const dcDefaults = (p: DirectionalCardProps) => {
  const inAt = p.inAt ?? 0;
  const ph = allocatePhases(p.outAt + (p.exitDur ?? 0.5) - inAt, p.enterDur ?? 0.6, p.exitDur ?? 0.5);
  const enterDur = ph.enterEnd - ph.enterStart;
  const exitDur = ph.exitEnd - ph.exitStart;
  return {
    inAt,
    enterDur,
    exitDur,
    outAt: inAt + ph.exitStart,
    enterFrom: p.enterFrom ?? "right",
    exit: p.exit ?? "continue",
    travel: p.travel ?? "short",
    anchor: p.anchor ?? "center",
    changeAt: p.changeAt ?? inAt + enterDur + (ph.exitStart - enterDur) * 0.4,
    accent: p.accent,
  };
};

/** Pure pose at t (seconds from the beat start): progress values; the component turns them into pixels. */
export const dcPose = (t: number, p: DirectionalCardProps) => {
  const d = dcDefaults(p);
  const enterRaw = local(t, d.inAt, d.inAt + d.enterDur);
  const exitRaw = local(t, d.outAt, d.outAt + d.exitDur);
  const enter = ease("arriveGently", enterRaw);
  const exit = ease("leaveDecisively", exitRaw);
  // opacity: in quickly with the move, out only in the last 60 % of the exit (the move reads first)
  const opacity = Math.min(1, local(t, d.inAt, d.inAt + d.enterDur * 0.6)) * (1 - local(t, d.outAt + d.exitDur * 0.4, d.outAt + d.exitDur));
  const change = p.status ? ease("arriveSoftSettle", local(t, d.changeAt, d.changeAt + 0.35)) : 0;
  // the accent responds to the change and settles (no constant pumping)
  const pulse = p.status ? Math.sin(Math.PI * local(t, d.changeAt, d.changeAt + 0.7)) : 0;
  return { enter, exit, enterRaw, exitRaw, opacity, scale: 0.97 + 0.03 * enter, change, pulse };
};

export const directionalCardTiming: BeatTiming<DirectionalCardProps> = {
  system: "A",
  fullscreen: (p) => Boolean(p.fullscreen),
  duration: (p) => dcDefaults(p).outAt + dcDefaults(p).exitDur + 0.05,
  sfx: (p, fps) => {
    const d = dcDefaults(p);
    const out: SfxIntent[] = [
      { id: "arrive", label: `card arrives from the ${d.enterFrom}`, kind: "movement", t: fastestFrame((t) => dcPose(t, p).enter, fps, d.inAt, d.inAt + d.enterDur),
        category: "WSH", roles: ["soft-whoosh"], priority: "optional", measured_from: "fastest frame of the arrival" },
    ];
    if (p.status)
      out.push({ id: "change", label: `state changes: ${p.status.from} -> ${p.status.to}`, kind: "event", t: firstFrameWhere((t) => dcPose(t, p).change >= 0.5, fps, d.changeAt, d.outAt) ?? snap(d.changeAt, fps),
        category: "UI", roles: ["ui-click"], priority: "recommended", measured_from: "first frame the new state is half visible" });
    out.push({ id: "leave", label: "card continues out", kind: "event", t: snap(d.outAt, fps), category: null, roles: [], priority: "silence-ok", note: "Exits stay quiet." });
    return out;
  },
};
