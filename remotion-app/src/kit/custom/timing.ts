// Custom beat kinds built by Claude Code for approved concepts (Creative Director
// Studio: "Build with Remotion"). Each kind is a pure <name>.timing.ts (props,
// pose, duration, sound intents) plus a <Name>.tsx component in this folder,
// registered here and in ./components.ts. They join the kit's registry, so the
// Studio Player, the timeline, the renderers and the sound tools all know them.
//
// Rules (video-editing skill, references/remotion.md §4 and §8):
//  - never change how an existing kind renders a version the user has seen:
//    add a prop with a default that keeps the old look, or add a new kind;
//  - everything is driven by useCurrentFrame() (no CSS animations);
//  - the footage is never touched: kinds are layers above SourceFootage.
import type { BeatTiming } from "../types";
import { lockdownTitleTiming } from "./lockdownTitle.timing";
import { loginAlertStackTiming } from "./loginAlertStack.timing";

export const customTiming = {
  // cyber-demo S01, Claude Concept A "Flagged login toast" (ONS-041)
  LoginAlertStack: loginAlertStackTiming,
  // cyber-demo S02, the user's own idea (D): typed "LOCKED OUT", padlock, glitch cut
  LockdownTitle: lockdownTitleTiming,
} satisfies Record<string, BeatTiming<never>>;
