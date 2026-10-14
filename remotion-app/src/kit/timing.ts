// Pure timing registry of the kit's beat kinds (no React): used by the
// compositions AND by scripts/export-sfx.ts (sound intents for System D).
import { assetSceneTiming } from "./beats/assetScene.timing";
import { captionAccentTiming } from "./beats/captionAccent.timing";
import { halfPanelTiming } from "./beats/halfPanel.timing";
import { horizonTitleTiming } from "./beats/horizonTitle.timing";
import { statCardTiming } from "./beats/statCard.timing";
import { statementSceneTiming } from "./beats/statementScene.timing";
import { uiCardTiming } from "./beats/uiCard.timing";
import type { AssetSceneProps } from "./beats/assetScene.timing";
import type { CaptionAccentProps } from "./beats/captionAccent.timing";
import type { HalfPanelProps } from "./beats/halfPanel.timing";
import type { HorizonTitleProps } from "./beats/horizonTitle.timing";
import type { StatCardProps } from "./beats/statCard.timing";
import type { StatementSceneProps } from "./beats/statementScene.timing";
import type { UiCardProps } from "./beats/uiCard.timing";
import type { Beat, BeatTiming } from "./types";
import { customTiming } from "./custom/timing";

export const kitTiming = {
  CaptionAccent: captionAccentTiming,
  StatCard: statCardTiming,
  HorizonTitle: horizonTitleTiming,
  UiCard: uiCardTiming,
  StatementScene: statementSceneTiming,
  HalfPanel: halfPanelTiming,
  // the user's own 3D asset staged full-screen (Concept.assets)
  AssetScene: assetSceneTiming,
  // kinds Claude Code built for approved concepts (src/kit/custom/)
  ...customTiming,
} satisfies Record<string, BeatTiming<never>>;

/** Kinds built by Claude Code for approved concepts (src/kit/custom/). */
export type CustomKind = Extract<keyof typeof customTiming, string>;

/** A beat that uses one of the kit's kinds. Projects may add their own kinds. */
export type KitBeat =
  | Beat<"CaptionAccent", CaptionAccentProps>
  | Beat<"StatCard", StatCardProps>
  | Beat<"HorizonTitle", HorizonTitleProps>
  | Beat<"UiCard", UiCardProps>
  | Beat<"StatementScene", StatementSceneProps>
  | Beat<"HalfPanel", HalfPanelProps>
  | Beat<"AssetScene", AssetSceneProps>
  | Beat<CustomKind, Record<string, unknown>>;

export type TimingRegistry = Record<string, BeatTiming<never>>;

/** Window of a beat on the source timeline, in frames. */
export const beatWindow = (beat: Beat, timing: TimingRegistry, fps: number) => {
  const tm = timing[beat.kind] as BeatTiming<unknown> | undefined;
  if (!tm)
    throw new Error(
      `Unknown beat kind "${beat.kind}" (beat ${beat.id}). Register it in the kit or the project timing.`,
    );
  const from = Math.round(beat.at * fps);
  const durationInFrames = Math.max(
    1,
    Math.ceil(tm.duration(beat.props) * fps),
  );
  return {
    from,
    durationInFrames,
    fullscreen: tm.fullscreen(beat.props),
    system: tm.system,
  };
};
