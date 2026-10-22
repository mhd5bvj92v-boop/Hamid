import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { FPS, H, TOTAL, W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="JustATap" component={Film} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
