import React from "react";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SourceInfo } from "./types";

/**
 * Optional separation treatment for a System A overlay: the footage is dimmed
 * and/or softened for a window (seconds), ramping in and out over <= 0.3 s.
 * It changes the LOOK of the footage only, never its timing.
 */
export type FocusWindow = {
  start: number;
  end: number;
  brightness?: number;
  blur?: number;
};

type Props = {
  readonly source: SourceInfo;
  readonly focus?: readonly FocusWindow[];
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
 */
export const SourceFootage: React.FC<Props> = ({ source, focus = [] }) => {
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

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        name="Source footage (untouched, full length)"
        src={staticFile(source.src)}
        objectFit="cover"
        volume={1}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          filter:
            brightness < 1 || blur > 0
              ? `brightness(${brightness}) blur(${blur}px)`
              : undefined,
        }}
      />
    </AbsoluteFill>
  );
};
