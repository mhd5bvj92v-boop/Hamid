import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { CaptionAccent } from "./beats/CaptionAccent";
import { HalfPanel } from "./beats/HalfPanel";
import { HorizonTitle } from "./beats/HorizonTitle";
import { StatCard } from "./beats/StatCard";
import { StatementScene } from "./beats/StatementScene";
import { UiCard } from "./beats/UiCard";
import { customComponents } from "./custom/components";
import { SoundPreview, SoundPreviewData } from "./SoundPreview";
import { FocusWindow, SourceFootage } from "./SourceFootage";
import { TimingRegistry, beatWindow, kitTiming } from "./timing";
import type { Beat, SourceInfo } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentRegistry = Record<string, React.FC<any>>;

export const kitComponents: ComponentRegistry = {
  CaptionAccent,
  StatCard,
  HorizonTitle,
  UiCard,
  StatementScene,
  HalfPanel,
  // kinds Claude Code built for approved concepts (src/kit/custom/)
  ...customComponents,
};

export type EditLayers = "all" | "graphics";

export type TalkingHeadEditProps = {
  readonly source: SourceInfo;
  readonly beats: readonly Beat[];
  /** "graphics" hides the footage (black) to measure or review the graphics alone. */
  readonly layers?: EditLayers;
  readonly focus?: readonly FocusWindow[];
  readonly sound?: SoundPreviewData | null;
  /** Project-specific beat kinds (component + pure timing). */
  readonly extraComponents?: ComponentRegistry;
  readonly extraTiming?: TimingRegistry;
};

/**
 * Standard talking-head edit:
 *   1. the untouched source footage, full length (SourceFootage);
 *   2. one <Sequence> per beat (System A/B overlays, System C full-screen
 *      covers), in beat order, so later beats draw on top;
 *   3. an optional Studio sound preview.
 * The composition must be exactly source.durationInFrames long at source.fps.
 */
export const TalkingHeadEdit: React.FC<TalkingHeadEditProps> = ({
  source,
  beats,
  layers = "all",
  focus,
  sound,
  extraComponents = {},
  extraTiming = {},
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (fps !== source.fps || durationInFrames !== source.durationInFrames) {
    throw new Error(
      `Timeline mismatch: composition is ${durationInFrames} frames @ ${fps} fps, source is ${source.durationInFrames} @ ${source.fps}. The edit must keep the full original duration.`,
    );
  }
  const components = { ...kitComponents, ...extraComponents };
  const timing = { ...kitTiming, ...extraTiming };

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {layers === "all" ? (
        <SourceFootage source={source} focus={focus} />
      ) : null}
      {beats.map((beat) => {
        const Component = components[beat.kind];
        if (!Component)
          throw new Error(
            `No component for beat kind "${beat.kind}" (beat ${beat.id}).`,
          );
        const w = beatWindow(beat, timing, fps);
        return (
          <Sequence
            key={beat.id}
            name={`${beat.id} · ${w.system}${w.fullscreen ? " full-screen" : ""}`}
            from={w.from}
            durationInFrames={w.durationInFrames}
            premountFor={fps}
          >
            <Component {...(beat.props as object)} />
          </Sequence>
        );
      })}
      {layers === "all" && sound ? <SoundPreview data={sound} /> : null}
    </AbsoluteFill>
  );
};
