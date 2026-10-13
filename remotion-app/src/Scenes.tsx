import React from "react";
import { Audio, Video } from "@remotion/media";
import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CARD_LANDS, Overlay } from "./Overlay";

/** Plain background for the 5-second test: a slow, dark radial drift. */
const SimpleBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [38, 46]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 70% at 50% ${drift}%, #1f2a3d 0%, #0f141d 55%, #07090d 100%)`,
      }}
    />
  );
};

type SfxProps = { readonly sfxSrc: string };

/** The marker sound lands on the frame the card settles (frame-exact). */
const CardLandsSfx: React.FC<SfxProps> = ({ sfxSrc }) => {
  const { fps } = useVideoConfig();
  return <Audio name="Card lands SFX" src={staticFile(sfxSrc)} from={Math.round(CARD_LANDS * fps)} premountFor={fps} />;
};

// 1. Simple background + typography + floating card + SFX -> H.264 MP4.
export const TestComposition: React.FC<SfxProps> = ({ sfxSrc }) => (
  <AbsoluteFill>
    <SimpleBackground />
    <Overlay />
    <CardLandsSfx sfxSrc={sfxSrc} />
  </AbsoluteFill>
);

// 2. Existing footage as the background layer (with its own audio), the same
//    transparent overlay on top, and the SFX -> H.264 MP4.
export type FootageProps = SfxProps & {
  readonly footageSrc: string;
  readonly footageVolume: number;
};

export const FootageComposite: React.FC<FootageProps> = ({ footageSrc, footageVolume, sfxSrc }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        name="Footage"
        src={staticFile(footageSrc)}
        premountFor={fps}
        objectFit="cover"
        volume={footageVolume}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
      <Overlay />
      <CardLandsSfx sfxSrc={sfxSrc} />
    </AbsoluteFill>
  );
};

// The composite is as long as the footage, so real clips of any length work.
export const footageMetadata: CalculateMetadataFunction<FootageProps> = async ({ props }) => {
  const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(staticFile(props.footageSrc)) });
  const seconds = await input.computeDuration();
  return { durationInFrames: Math.max(1, Math.round(seconds * 60)), fps: 60, defaultCodec: "h264" };
};
