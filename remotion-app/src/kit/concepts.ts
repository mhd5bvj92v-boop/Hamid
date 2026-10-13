// Creative Director workflow (video-editing skill, references/creative-director.md):
// for every major moment Claude proposes three genuinely different concepts
// (A, B, C) in chat; the user chooses or writes their own (D). Concepts are
// ordinary beats kept in a project's concepts.ts so they can be rendered as
// real preview frames and motion previews BEFORE anything enters beats.ts.
// Remotion only renders them: the options are presented by Claude, not by a UI.
import type { Beat } from "./types";

export type ConceptOption = "A" | "B" | "C" | "D";

/** One proposed (or user-described, D) concept for a moment, as a renderable beat. */
export type ConceptBeat<B extends Beat = Beat> = {
  /** Moment id from the creative log, e.g. "M03". */
  readonly moment: string;
  readonly option: ConceptOption;
  /** Concept round: 1, then 2, 3... each time the user asks for three new concepts. */
  readonly round: number;
  readonly beat: B;
};

/** Which concept a preview render shows (null = the approved edit, beats.ts). */
export type ConceptPick = {
  readonly moment: string;
  readonly option: ConceptOption;
  readonly round?: number;
} | null;

/**
 * Beats to render: the approved beat list, or, for a concept preview, only
 * the chosen concept (latest round unless one is given). The footage is the
 * same untouched SourceFootage either way.
 */
export const selectBeats = <B extends Beat>(
  beats: readonly B[],
  concepts: readonly ConceptBeat<B>[],
  pick: ConceptPick,
): readonly B[] => {
  if (!pick) return beats;
  const matching = concepts.filter(
    (c) => c.moment === pick.moment && c.option === pick.option,
  );
  if (!matching.length)
    throw new Error(`No concept ${pick.moment}:${pick.option} in concepts.ts`);
  const round = pick.round ?? Math.max(...matching.map((c) => c.round));
  const chosen = matching.filter((c) => c.round === round);
  if (!chosen.length)
    throw new Error(
      `No concept ${pick.moment}:${pick.option} in round ${round}`,
    );
  return chosen.map((c) => c.beat);
};
