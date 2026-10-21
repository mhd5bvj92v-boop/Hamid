import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import "./fonts";
import { OVERLAP, SCENES, SceneKey } from "./data/storyboard";
import { Scene01 } from "./scenes/Scene01";
import { Scene02 } from "./scenes/Scene02";
import { Scene03 } from "./scenes/Scene03";
import { Scene04 } from "./scenes/Scene04";
import { Scene05 } from "./scenes/Scene05";
import { Scene06 } from "./scenes/Scene06";
import { Background } from "./components/Background";
import { C, FONT } from "./theme";

const COMPONENTS: Record<SceneKey, React.FC> = {
  s1: Scene01,
  s2: Scene02,
  s3: Scene03,
  s4: Scene04,
  s5: Scene05,
  s6: Scene06,
};

export const Intro: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink, fontFamily: FONT, overflow: "hidden" }}>
    <Background />
    {(Object.keys(SCENES) as SceneKey[]).map((k) => {
      const s = SCENES[k];
      const Comp = COMPONENTS[k];
      const last = k === "s6";
      return (
        <Sequence key={k} name={s.name} from={s.start} durationInFrames={s.end - s.start + (last ? 0 : OVERLAP)}>
          <Comp />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
