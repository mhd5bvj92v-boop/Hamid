import React from "react";
import { Composition } from "remotion";
import { Edit } from "./Edit";
import { SOURCE } from "./source";

// The composition is exactly as long as the source footage, at the approved frame rate.
export const Composition_plan_e2e: React.FC = () => (
  <Composition
    id="Edit-plan-e2e"
    component={Edit}
    durationInFrames={SOURCE.durationInFrames}
    fps={SOURCE.fps}
    width={SOURCE.width}
    height={SOURCE.height}
    defaultProps={{ layers: "all" as const, concept: null }}
    calculateMetadata={() => ({ defaultCodec: "h264" as const, defaultOutName: "plan-e2e-picture.mp4" })}
  />
);
