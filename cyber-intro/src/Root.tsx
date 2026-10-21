import React from "react";
import { Composition } from "remotion";
import { Intro } from "./Intro";
import { TOTAL } from "./data/storyboard";
import { FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="CyberIntro" component={Intro} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
