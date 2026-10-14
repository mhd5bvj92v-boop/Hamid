// LockdownTitle (System C, full-screen): built by Claude Code for cyber-demo S02,
// the user's own idea (D): black screen, "LOCKED OUT" typed letter by letter in
// big red monospace with a blinking cursor, a padlock snaps shut under it, then a
// 2-3 frame horizontal-slice glitch and a hard cut back to the speaker.
// The footage keeps running underneath (the scene only covers it).
import { clamp, prog, snap } from "../motion";
import type { BeatTiming, SfxIntent } from "../types";

export type LockdownTitleProps = {
  text: string;
  /** Seconds from the beat start. */
  typeAt?: number;
  charDur?: number;
  /** Padlock snaps shut (default: just after the last letter). */
  lockAt?: number;
  /** The glitch starts here; the scene ends glitchDur seconds later (hard cut back). */
  outAt: number;
  /** Glitch length in seconds (0.1 s = 3 frames at 30 fps). */
  glitchDur?: number;
  color?: string;
};

export const lockDefaults = (p: LockdownTitleProps) => {
  const typeAt = p.typeAt ?? 0.15;
  const charDur = p.charDur ?? 0.085;
  const typed = typeAt + p.text.length * charDur;
  return { typeAt, charDur, typedAt: typed, lockAt: p.lockAt ?? typed + 0.18, glitchDur: p.glitchDur ?? 0.1, color: p.color ?? "#FF3B3B" };
};

/** Letters shown, cursor, padlock and glitch state at time t (seconds from the beat start). */
export const lockPose = (t: number, p: LockdownTitleProps, fps: number) => {
  const d = lockDefaults(p);
  const shown = clamp(Math.floor((t - d.typeAt) / d.charDur) + 1, 0, p.text.length);
  const typing = t >= d.typeAt && t < d.typedAt;
  const cursorOn = typing || Math.floor((t - d.typedAt) / 0.5) % 2 === 0;
  const lockIn = prog(t, d.lockAt - 0.28, 0.22, "outCubic");
  const snapK = prog(t, d.lockAt, 0.09, "inCubic"); // shackle drops shut
  const squash = t >= d.lockAt + 0.09 && t < d.lockAt + 0.2 ? 1 - 0.06 * Math.sin(((t - d.lockAt - 0.09) / 0.11) * Math.PI) : 1;
  const glitchFrame = Math.floor((t - p.outAt) * fps + 1e-6);
  const glitching = t >= p.outAt && t < p.outAt + d.glitchDur;
  return { shown, cursorOn, lockIn, snapK, squash, glitching, glitchFrame };
};

export const lockdownTitleTiming: BeatTiming<LockdownTitleProps> = {
  system: "C",
  fullscreen: () => true,
  duration: (p) => p.outAt + lockDefaults(p).glitchDur,
  sfx: (p, fps) => {
    const d = lockDefaults(p);
    const times = Array.from(p.text, (ch, i) => ({ ch, t: snap(d.typeAt + i * d.charDur, fps) })).filter((x) => x.ch !== " ").map((x) => x.t);
    const intents: SfxIntent[] = [
      { id: "typing", label: `${times.length} letters typed`, kind: "event", t: times[0], times, category: "UI", roles: ["keyboard", "ui-click"], priority: "recommended",
        note: "the user asked for a soft keyboard tick per letter", measured_from: "frame each letter appears" },
      { id: "lock", label: "padlock snaps shut", kind: "event", t: snap(d.lockAt + 0.09, fps), category: "MEC", roles: ["lock", "mechanism-gizmo"], priority: "recommended",
        note: "the user asked for one heavy lock clunk", measured_from: "shackle closed" },
      { id: "glitch", label: "glitch out, hard cut back", kind: "transition", t: snap(p.outAt, fps), category: null, roles: ["glitch"], priority: "optional" },
    ];
    return intents;
  },
};
