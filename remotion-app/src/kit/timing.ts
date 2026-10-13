// Pure timing registry of the kit's beat kinds (no React): used by the
// compositions AND by scripts/export-sfx.ts (sound intents for System D).
import { captionAccentTiming } from "./beats/captionAccent.timing";
import { horizonTitleTiming } from "./beats/horizonTitle.timing";
import { statCardTiming } from "./beats/statCard.timing";
import { statementSceneTiming } from "./beats/statementScene.timing";
import { uiCardTiming } from "./beats/uiCard.timing";
import type { CaptionAccentProps } from "./beats/captionAccent.timing";
import type { HorizonTitleProps } from "./beats/horizonTitle.timing";
import type { StatCardProps } from "./beats/statCard.timing";
import type { StatementSceneProps } from "./beats/statementScene.timing";
import type { UiCardProps } from "./beats/uiCard.timing";
import type { Beat, BeatTiming } from "./types";

export const kitTiming = {
  CaptionAccent: captionAccentTiming,
  StatCard: statCardTiming,
  HorizonTitle: horizonTitleTiming,
  UiCard: uiCardTiming,
  StatementScene: statementSceneTiming,
} satisfies Record<string, BeatTiming<never>>;

/** A beat that uses one of the kit's kinds. Projects may add their own kinds. */
export type KitBeat =
  | Beat<"CaptionAccent", CaptionAccentProps>
  | Beat<"StatCard", StatCardProps>
  | Beat<"HorizonTitle", HorizonTitleProps>
  | Beat<"UiCard", UiCardProps>
  | Beat<"StatementScene", StatementSceneProps>;

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
