// Proposed A/B/C concepts of "plan-e2e" (Creative Director workflow), derived from edit.json:
// each visual concept becomes a renderable beat placed on its segment, for preview frames
// and motion previews. The options are presented by Claude / the Studio, not by Remotion.
import type { ConceptBeat } from "../../kit/concepts";
import type { EditDoc } from "../../kit/project";
import { beatFromConcept } from "../../kit/studio";
import { type KitBeat, kitTiming } from "../../kit/timing";
import EDIT from "./edit.json";

const DOC = EDIT as unknown as EditDoc;

export const CONCEPTS: ConceptBeat<KitBeat>[] = DOC.segments.flatMap((seg) =>
  (["A", "B", "C"] as const).flatMap((option) => {
    const c = seg.concepts[option];
    // concepts whose component is not built yet (kind not in the kit) have no preview
    return c?.kind && c.kind in kitTiming ? [{ moment: seg.id, option, round: seg.round, beat: beatFromConcept(seg, c) as KitBeat }] : [];
  }),
);
