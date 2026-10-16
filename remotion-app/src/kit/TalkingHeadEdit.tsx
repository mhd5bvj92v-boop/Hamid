import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { CaptionAccent } from "./beats/CaptionAccent";
import { AssetScene } from "./beats/AssetScene";
import { KineticText } from "./beats/KineticText";
import { DirectionalCard } from "./beats/DirectionalCard";
import { Popover } from "./beats/Popover";
import { HalfPanel } from "./beats/HalfPanel";
import { HorizonTitle } from "./beats/HorizonTitle";
import { StatCard } from "./beats/StatCard";
import { StatementScene } from "./beats/StatementScene";
import { UiCard } from "./beats/UiCard";
import { customComponents } from "./custom/components";
import { SoundPreview, SoundPreviewData } from "./SoundPreview";
import { FocusWindow, SourceFootage, ZoomWindow } from "./SourceFootage";
import type { EditConstants } from "./project";
import { CameraIntensity, CameraMove, CameraStyle, DesignCanvas, EditStyleProvider, MotionProvider, QualityProvider, mergeMotion } from "./style";
import { TimingRegistry, beatWindow, kitTiming } from "./timing";
import { Backdrop } from "./backgrounds";
import { FlowMotion, RUN_GAP, StageCamera, StageFade, StageScene, planStage } from "./stage";
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
  AssetScene,
  KineticText,
  DirectionalCard,
  Popover,
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
  /** Camera moves on the footage itself (look only). */
  readonly zooms?: readonly ZoomWindow[];
  readonly sound?: SoundPreviewData | null;
  /** The edit's constants (60-30-10 palette, camera): every component reads them with useEditStyle(). */
  readonly constants?: Partial<EditConstants> | null;
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
  zooms = [],
  sound,
  extraComponents = {},
  extraTiming = {},
  constants = null,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (fps !== source.fps || durationInFrames !== source.durationInFrames) {
    throw new Error(
      `Timeline mismatch: composition is ${durationInFrames} frames @ ${fps} fps, source is ${source.durationInFrames} @ ${source.fps}. The edit must keep the full original duration.`,
    );
  }
  const components = { ...kitComponents, ...extraComponents };
  const timing = { ...kitTiming, ...extraTiming };

  const windows = beats.map((beat) => ({ beat, w: beatWindow(beat, timing, fps) }));
  // the stage: one background + one chained camera under all consecutive full-screen scenes (stage.tsx)
  const stage = constants?.stage || "";
  const runs = stage
    ? planStage(
        windows.filter((x) => x.w.fullscreen).map(({ beat, w }) => ({ id: beat.id, start: w.from / fps, end: (w.from + w.durationInFrames) / fps, move: beat.camera?.move })),
        (constants?.cameraIntensity as CameraIntensity) ?? "medium",
      )
    : [];
  // motion controls: the project's, overridden per scene (Properties → Motion)
  const motionOf = (beat: Beat) => mergeMotion(constants?.motion, constants?.sceneMotion?.[(beat as { segmentId?: string }).segmentId ?? ""]);
  const runOf = (id: string) => runs.find((r) => r.segs.some((g) => g.id === id));
  const total = durationInFrames / fps;

  return (
    <EditStyleProvider constants={constants}>
      <QualityProvider value={constants?.renderQuality ?? "final"}>
      <AbsoluteFill style={{ backgroundColor: "black" }}>
        {layers === "all" ? (
          <SourceFootage source={source} focus={focus} zooms={zooms} />
        ) : null}
        {runs.map((run, i) => {
          // a run near the start or end of the video reaches it, so the video never opens or closes on black
          const start = run.start <= RUN_GAP ? 0 : run.start;
          const end = total - run.end <= RUN_GAP ? total : run.end;
          const from = Math.round(start * fps);
          const dur = Math.max(1, Math.round(end * fps) - from);
          return (
            <Sequence key={`stage-${i}`} name={`stage · ${stage}`} from={from} durationInFrames={dur} premountFor={fps}>
              <DesignCanvas>
                <StageFade dur={dur / fps} fadeIn fadeOut={end < total - 0.05}>
                  <StageCamera run={run} t0={start}>
                    <Backdrop preset={stage} force />
                  </StageCamera>
                </StageFade>
              </DesignCanvas>
            </Sequence>
          );
        })}
        {windows.map(({ beat, w }) => {
          const Component = components[beat.kind];
          if (!Component)
            throw new Error(
              `No component for beat kind "${beat.kind}" (beat ${beat.id}).`,
            );
          const run = w.fullscreen ? runOf(beat.id) : undefined;
          if (run) {
            // on the stage: no own background, the stage camera (continuous with the previous scene) and the flow
            return (
              <Sequence key={beat.id} name={`${beat.id} · ${w.system} full-screen · stage`} from={w.from} durationInFrames={w.durationInFrames} premountFor={fps}>
                <DesignCanvas>
                  <StageScene>
                    <StageCamera run={run} t0={w.from / fps}>
                      <MotionProvider value={motionOf(beat)}>
                        <FlowMotion dur={w.durationInFrames / fps}>
                          <Component {...(beat.props as object)} />
                        </FlowMotion>
                      </MotionProvider>
                    </StageCamera>
                  </StageScene>
                </DesignCanvas>
              </Sequence>
            );
          }
          return (
            <Sequence
              key={beat.id}
              name={`${beat.id} · ${w.system}${w.fullscreen ? " full-screen" : ""}`}
              from={w.from}
              durationInFrames={w.durationInFrames}
              premountFor={fps}
            >
              <DesignCanvas>
                {/* full-screen scenes move with the edit's camera unless the beat chooses a move (or "static") */}
                {beat.camera?.move ?? (w.fullscreen ? constants?.camera : undefined) ? (
                  <CameraMove
                    dur={w.durationInFrames / fps}
                    move={(beat.camera?.move ?? constants?.camera) as CameraStyle}
                    intensity={(beat.camera?.intensity ?? constants?.cameraIntensity) as CameraIntensity | undefined}
                  >
                    <MotionProvider value={motionOf(beat)}>
                      <Component {...(beat.props as object)} />
                    </MotionProvider>
                  </CameraMove>
                ) : (
                  <MotionProvider value={motionOf(beat)}>
                    <Component {...(beat.props as object)} />
                  </MotionProvider>
                )}
              </DesignCanvas>
            </Sequence>
          );
        })}
        {layers === "all" && sound ? <SoundPreview data={sound} /> : null}
      </AbsoluteFill>
      </QualityProvider>
    </EditStyleProvider>
  );
};
