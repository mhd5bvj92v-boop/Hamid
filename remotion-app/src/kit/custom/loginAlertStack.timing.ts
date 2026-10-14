// LoginAlertStack (System A, GLASS-DARK, from ONS-041 "Stacked Toast Notifications"):
// built by Claude Code for cyber-demo S01, Claude Concept A "Flagged login toast".
// Calm sign-in toasts stack beside the speaker; the alert toast drops in on top,
// pushes them down, its red rim pulses and a FLAGGED tag stamps in; everything
// exits together. Pure: the same pose functions drive the component and the
// sound intents.
import { E, clamp, firstFrameWhere, prog, snap } from "../motion";
import type { BeatTiming, SfxIntent } from "../types";

export type Toast = { title: string; sub?: string };

export type LoginAlertStackProps = {
  /** Neutral toasts that arrive first (1-3), top to bottom. */
  calm: Toast[];
  /** The flagged toast. */
  alert: Toast & { tag?: string };
  /** Seconds from the beat start. */
  inAt?: number;
  stagger?: number;
  /** When the alert drops in (on the spoken words it illustrates). */
  alertAt: number;
  outAt: number;
  outDur?: number;
  /** When the calm toasts leave (default: with the alert, at outAt). Earlier = the alert is alone on screen at the end. */
  calmOutAt?: number;
  /** Stack centre (frame fractions) and width (fraction of the frame width). */
  anchor?: { x: number; y: number };
  width?: number;
  alertColor?: string;
  okColor?: string;
  /** Size of the alert toast relative to the calm ones (1 = same size). */
  alertScale?: number;
};

export const alertDefaults = (p: LoginAlertStackProps) => ({
  inAt: p.inAt ?? 0.1,
  stagger: p.stagger ?? 0.22,
  outDur: p.outDur ?? 0.3,
  anchor: p.anchor ?? { x: 0.5, y: 0.7 },
  width: p.width ?? 0.62,
  alertColor: p.alertColor ?? "#FF4D57",
  okColor: p.okColor ?? "#3DDC97",
  alertScale: p.alertScale ?? 1,
});

/** Exit envelope: 1 while shown, 0 when gone (the calm toasts may leave before the alert). */
const exitK = (t: number, p: LoginAlertStackProps, at = p.outAt) => 1 - E.inCubic(clamp((t - at) / alertDefaults(p).outDur));

/** A calm toast: slides down into place, fades in and de-blurs. */
export const calmPose = (t: number, i: number, p: LoginAlertStackProps) => {
  const d = alertDefaults(p);
  const k = prog(t, d.inAt + i * d.stagger, 0.34, "outCubic");
  const x = exitK(t, p, p.calmOutAt ?? p.outAt);
  return { opacity: k * x, dy: (1 - k) * -26 + (1 - x) * -18, blur: (1 - k) * 7 };
};

/** The alert toast: drops in on top (pushing the stack down), rim pulse, FLAGGED stamp. */
export const alertPose = (t: number, p: LoginAlertStackProps) => {
  const k = prog(t, p.alertAt, 0.36, "outCubic");
  const x = exitK(t, p);
  const since = t - (p.alertAt + 0.36);
  const pulse = since > 0 && since < 0.7 ? Math.sin((since / 0.7) * Math.PI) : 0;
  const stamp = prog(t, p.alertAt + 0.42, 0.22, "outCubic");
  return { push: k, opacity: k * x, dy: (1 - k) * -40 + (1 - x) * -18, blur: (1 - k) * 8, pulse, stampOpacity: stamp * x, stampScale: 1.45 - 0.45 * stamp };
};

export const loginAlertStackTiming: BeatTiming<LoginAlertStackProps> = {
  system: "A",
  fullscreen: () => false,
  duration: (p) => p.outAt + alertDefaults(p).outDur + 0.1,
  sfx: (p, fps) => {
    const d = alertDefaults(p);
    const times = p.calm.map((_, i) => firstFrameWhere((t) => calmPose(t, i, p).opacity >= 0.5, fps, d.inAt, p.outAt) ?? snap(d.inAt + i * d.stagger, fps));
    const alertT = firstFrameWhere((t) => alertPose(t, p).push >= 0.5, fps, p.alertAt, p.outAt) ?? snap(p.alertAt, fps);
    const intents: SfxIntent[] = [
      { id: "toasts", label: `${p.calm.length} sign-in toast(s) appear`, kind: "event", t: times[0], times, category: "UI", roles: ["ui-click"], priority: "recommended",
        note: "soft UI tick per neutral toast, first visible frame", measured_from: "calm toast opacity >= 0.5" },
      { id: "alert", label: "flagged sign-in lands", kind: "event", t: alertT, category: "SCI", roles: ["sci-fi-click", "alert"], priority: "recommended",
        note: "one sharper alert click as the red toast lands", measured_from: "alert push >= 0.5" },
      { id: "stamp", label: "FLAGGED tag stamps in", kind: "event", t: snap(p.alertAt + 0.42, fps), category: "UI", roles: ["ui-click"], priority: "optional" },
      ...(p.calmOutAt !== undefined && p.calmOutAt < p.outAt
        ? [{ id: "calm-exit", label: "sign-in toasts leave first", kind: "event" as const, t: snap(p.calmOutAt, fps), category: null, roles: [], priority: "silence-ok" as const }]
        : []),
      { id: "exit", label: "stack exits", kind: "event", t: snap(p.outAt, fps), category: null, roles: [], priority: "silence-ok", note: "Exits stay silent." },
    ];
    return intents;
  },
};
