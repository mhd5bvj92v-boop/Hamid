import React from "react";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  getRemotionEnvironment,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CameraStyle, cameraPose } from "./style";
import type { SourceInfo } from "./types";

/**
 * Optional separation treatment for a System A overlay: the footage is dimmed
 * and/or softened for a window (seconds), ramping in and out over <= 0.3 s.
 * It changes the LOOK of the footage only, never its timing.
 */
/** A camera move on the talking-head footage itself (look only: the footage's timing never changes). */
export type ZoomWindow = {
  start: number;
  end: number;
  /** style.tsx camera move: slow-zoom-in, fast-zoom-in, slow-zoom-out, fast-zoom-out, peak-middle, push-in, drift... */
  move: string;
  intensity?: "subtle" | "medium" | "strong";
  /** Zoom centre in frame fractions (default the face zone: 0.5, 0.32). */
  x?: number;
  y?: number;
};

export type FocusWindow = {
  start: number;
  end: number;
  brightness?: number;
  blur?: number;
};

type Props = {
  readonly source: SourceInfo;
  readonly focus?: readonly FocusWindow[];
  readonly zooms?: readonly ZoomWindow[];
};

/**
 * The untouched original footage, as the base layer of every edit.
 *
 * TIMELINE CONTRACT (video-editing skill, non-negotiable):
 * - plays from source time 0 to the end, at its original speed, for the
 *   whole composition: no trim, no playbackRate, no loop, no re-ordering;
 * - its own audio (the dialogue) is kept at unity;
 * - full-screen scenes are layered ABOVE it, so it keeps running underneath.
 * These props are deliberately not exposed. Do not add them.
 * In the Remotion Player only, a proxy of the same footage (source.previewSrc)
 * may be shown for smooth interactive preview; every render uses the original.
 */
export const SourceFootage: React.FC<Props> = ({ source, focus = [], zooms = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let brightness = 1;
  let blur = 0;
  for (const w of focus) {
    const ramp = Math.min(0.3, (w.end - w.start) / 2);
    const k = interpolate(
      t,
      [w.start, w.start + ramp, w.end - ramp, w.end],
      [0, 1, 1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    brightness = Math.min(brightness, 1 - (1 - (w.brightness ?? 0.62)) * k);
    blur = Math.max(blur, (w.blur ?? 6) * k);
  }

  const z = zooms.find((w) => t >= w.start && t < w.end);
  const cam = z ? cameraPose(t - z.start, z.end - z.start, z.move as CameraStyle, z.intensity ?? "medium") : null;
  const zoomStyle: React.CSSProperties = cam
    ? { transform: `scale(${cam.scale}) rotate(${cam.rotate}deg)`, transformOrigin: `${(z!.x ?? 0.5) * 100}% ${(z!.y ?? 0.32) * 100}%` }
    : {};

  if (source.scriptOnly || !source.src) {
    // Script-only project: no footage attached yet. A neutral stand-in keeps
    // the face zone visible for layout; the final export is refused.
    return (
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #2a2522 0%, #15120f 100%)" }}>
        <div style={{ position: "absolute", left: "26%", top: "17%", width: "48%", height: "30%", borderRadius: 48, background: "rgba(255,255,255,0.06)", border: "3px dashed rgba(255,255,255,0.18)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: "33%", textAlign: "center", fontFamily: "Montserrat", fontWeight: 600, fontSize: 30, letterSpacing: 4, color: "rgba(255,255,255,0.35)" }}>
          SCRIPT-ONLY · NO FOOTAGE YET
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        name="Source footage (untouched, full length)"
        src={staticFile(getRemotionEnvironment().isPlayer && source.previewSrc ? source.previewSrc : source.src)}
        objectFit="cover"
        volume={1}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          ...zoomStyle,
          filter:
            brightness < 1 || blur > 0
              ? `brightness(${brightness}) blur(${blur}px)`
              : undefined,
        }}
      />
    </AbsoluteFill>
  );
};
