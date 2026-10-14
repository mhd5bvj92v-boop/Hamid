// Approved timeline of "plan-e2e", read from edit.json (the single project file used by
// the Creative Director Studio, the Remotion Player and the renderers). Edit edit.json
// (in the Studio or with the skill's scripts), not this file.
// The footage itself is never cut, trimmed, re-timed or re-ordered (see SourceFootage).
import type { FocusWindow } from "../../kit/SourceFootage";
import type { EditDoc } from "../../kit/project";
import type { KitBeat } from "../../kit/timing";
import EDIT from "./edit.json";

const DOC = EDIT as unknown as EditDoc;

/** Seconds where the hook ends: System D resolves the first riser into the body here (null = none). */
export const HOOK_END: number | null = DOC.hookEnd;

export const BEATS: KitBeat[] = DOC.beats as KitBeat[];

/** Optional dim/blur of the footage behind busy System A overlays (look only, never timing). */
export const FOCUS: FocusWindow[] = DOC.focus;
