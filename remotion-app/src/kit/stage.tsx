// The stage: one continuous world for consecutive full-screen scenes (constants.stage = a background
// preset, e.g. "paper-grid"). Instead of every scene drawing its own background and camera from 100 %,
//   1. ONE background runs under the whole run of full-screen scenes (no restart, no cut between scenes);
//   2. ONE camera runs over background + scenes: each scene starts at exactly the scale the previous one
//      ended on, and the moves alternate move / hold (scene 1 zooms, 2 holds, 3 zooms back, 4 holds ...);
//   3. every scene's content flows: it enters from slightly right with opacity and blur clearing, and leaves
//      quickly to the left, inside the frame, so something is always in motion.
// Components keep drawing only their content: <Backdrop> renders nothing inside a stage scene.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { E, clamp, lerp } from "./motion";
import { StageScene, useCanvas, useStage } from "./style";
import type { CameraIntensity } from "./style";

// the context lives in style.tsx (CameraMove needs it); re-exported here
export { StageScene, useStage };

/** Scale change of one camera move. */
const STEP: Record<CameraIntensity, number> = { subtle: 0.05, medium: 0.08, strong: 0.12 };
/** Full-screen scenes closer than this (seconds) share one stage run. */
export const RUN_GAP = 1.5;

export type StageItem = { id: string; start: number; end: number; move?: string };
export type CameraSeg = { id: string; start: number; end: number; s0: number; s1: number; mode: "in" | "out" | "hold"; fast: boolean };
export type StageRun = { start: number; end: number; segs: CameraSeg[] };

/**
 * Group full-screen scenes into runs and plan the chained camera. Each scene's camera segment runs
 * from its start to the next scene's start, so the scale is continuous by construction.
 * Default pattern: even scenes move (in, then out, alternating; never below 100 %), odd scenes hold.
 * A beat's camera.move overrides: "static" holds, "*zoom-out*" goes out, any other move goes in;
 * "fast-*" uses a fast ease.
 */
export const planStage = (items: StageItem[], intensity: CameraIntensity = "medium"): StageRun[] => {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const runs: StageItem[][] = [];
  for (const it of sorted) {
    const cur = runs[runs.length - 1];
    if (cur && it.start - Math.max(...cur.map((c) => c.end)) <= RUN_GAP) cur.push(it);
    else runs.push([it]);
  }
  const step = STEP[intensity] ?? STEP.medium;
  return runs.map((run) => {
    let s = 1;
    let moves = 0;
    const end = Math.max(...run.map((r) => r.end));
    const segs = run.map((it, i): CameraSeg => {
      const segEnd = i + 1 < run.length ? run[i + 1].start : end;
      const m = it.move ?? "";
      let mode: CameraSeg["mode"];
      if (m === "static") mode = "hold";
      else if (/zoom-out/.test(m)) mode = "out";
      else if (m) mode = "in";
      else if (i % 2 === 1) mode = "hold";
      else mode = moves % 2 === 0 ? "in" : "out";
      if (mode === "out" && s - step < 1 - 1e-6) mode = "in"; // never zoom out past 100 % (the edges would show)
      if (mode !== "hold") moves++;
      const s0 = s;
      const s1 = mode === "in" ? s + step : mode === "out" ? s - step : s;
      s = s1;
      return { id: it.id, start: it.start, end: segEnd, s0, s1, mode, fast: /fast/.test(m) };
    });
    return { start: run[0].start, end, segs };
  });
};

/** The stage camera's scale at time t (seconds, edit time). */
export const stageScale = (run: StageRun, t: number) => {
  const seg = run.segs.find((g) => t >= g.start && t < g.end) ?? (t < run.start ? run.segs[0] : run.segs[run.segs.length - 1]);
  if (t < seg.start) return seg.s0;
  const p = clamp((t - seg.start) / Math.max(0.01, seg.end - seg.start));
  return lerp(seg.s0, seg.s1, seg.fast ? E.outExpo(clamp(p * 2.2)) : E.inOutSine(p));
};

/** Applies the stage camera at edit time `t0 + local frame / fps` (identical transform for background and scenes). */
export const StageCamera: React.FC<{ run: StageRun; t0: number; children: React.ReactNode }> = ({ run, t0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useCanvas();
  const s = stageScale(run, t0 + frame / fps);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: "50% 50%" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Fades the stage in (also from black at the very start, so the video opens in motion) and out where it meets the footage. */
export const StageFade: React.FC<{ dur: number; fadeIn: boolean; fadeOut: boolean; children: React.ReactNode }> = ({ dur, fadeIn, fadeOut, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useCanvas();
  const t = frame / fps;
  const o = (fadeIn ? E.outQuart(clamp(t / 0.25)) : 1) * (fadeOut ? 1 - E.inCubic(clamp((t - (dur - 0.25)) / 0.25)) : 1);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/** Scene content flow: in from slightly right (opacity + blur clearing), out quickly to the left, inside the frame. */
export const FlowMotion: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useCanvas();
  const t = frame / fps;
  const k = E.outQuart(clamp(t / 0.45));
  const e = E.inCubic(clamp((t - (dur - 0.3)) / 0.3));
  return (
    <AbsoluteFill
      style={{
        opacity: k * (1 - e),
        transform: `translateX(${((1 - k) * 0.045 - e * 0.06) * width}px)`,
        filter: k < 1 || e > 0 ? `blur(${(1 - k) * 6 + e * 3}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
