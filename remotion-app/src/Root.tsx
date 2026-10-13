import React from "react";
import { Composition } from "remotion";
import "./fonts";
import { Overlay } from "./Overlay";
import { FootageComposite, footageMetadata, TestComposition } from "./Scenes";
import { Projects } from "./projects";

// Talking-head edits (one composition per project, src/projects/<slug>/)
// come first. The three test compositions below are the setup check from
// Step 2: vertical 1080x1920 at 60 fps, H.264 MP4 and an alpha overlay.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Projects />
      <Composition
        id="TestComposition"
        component={TestComposition}
        durationInFrames={300}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ sfxSrc: "test-media/pop.wav" }}
        calculateMetadata={() => ({ defaultCodec: "h264", defaultOutName: "test-composition.mp4" })}
      />
      <Composition
        id="FootageComposite"
        component={FootageComposite}
        durationInFrames={300}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{
          footageSrc: "test-media/footage.mp4",
          footageVolume: 1,
          sfxSrc: "test-media/pop.wav",
        }}
        calculateMetadata={footageMetadata}
      />
      <Composition
        id="Overlay"
        component={Overlay}
        durationInFrames={300}
        fps={60}
        width={1080}
        height={1920}
        calculateMetadata={() => ({
          defaultCodec: "prores",
          defaultProResProfile: "4444",
          defaultPixelFormat: "yuva444p10le",
          defaultVideoImageFormat: "png",
          defaultOutName: "overlay-alpha.mov",
        })}
      />
    </>
  );
};
