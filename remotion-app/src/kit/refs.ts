// Which references a scene's decision actually uses. Pure, shared by the Studio (the "This scene will use"
// summary) and the server (the snapshot stored with the decision and the Claude Code request).
//
// Precedence (brief §15): locked timing > the user's explicit instruction (D text) > explicit exclusions >
// active scoped references (idea, then scene, then inherited project) > creative defaults.
//   - an idea attachment with influence "exclude" removes that asset from everything inherited;
//   - a scene's refExclude removes inherited project references for that scene only;
//   - the same asset attached at several scopes counts once, at its narrowest scope.
import type { CreativeSegment, EditDoc, RefAttachment, RefScope } from "./project";

export type EffectiveRef = RefAttachment & { from: RefScope };
export type ResolvedRefs = { active: EffectiveRef[]; excluded: { id: string; from: RefScope; why: string }[] };

const ORDER: RefScope[] = ["idea", "scene", "project"];

export const resolveRefs = (doc: Pick<EditDoc, "refs">, seg: Pick<CreativeSegment, "dDraft" | "refs" | "refExclude">, idea?: RefAttachment[]): ResolvedRefs => {
  const layers: Record<RefScope, RefAttachment[]> = {
    idea: idea ?? seg.dDraft?.attachments ?? [],
    scene: seg.refs ?? [],
    project: doc.refs ?? [],
  };
  const excluded: ResolvedRefs["excluded"] = [];
  const blocked = new Set<string>();
  for (const from of ORDER)
    for (const a of layers[from])
      if (a.influence === "exclude" && !blocked.has(a.id)) {
        blocked.add(a.id);
        excluded.push({ id: a.id, from, why: `excluded at ${from} level` });
      }
  for (const id of seg.refExclude ?? [])
    if (!blocked.has(id)) {
      blocked.add(id);
      excluded.push({ id, from: "scene", why: "project reference not used in this scene" });
    }
  const seen = new Set<string>();
  const active: EffectiveRef[] = [];
  for (const from of ORDER)
    for (const a of layers[from]) {
      if (a.influence === "exclude" || blocked.has(a.id) || seen.has(a.id)) continue;
      seen.add(a.id);
      active.push({ ...a, from });
    }
  return { active, excluded };
};

export const newAttachment = (id: string, kind: RefAttachment["kind"], extra: Partial<RefAttachment> = {}): RefAttachment => ({
  id,
  kind,
  scope: "idea",
  role: "style",
  influence: "use",
  added: new Date().toISOString(),
  ...extra,
});

export const kindOf = (id: string): RefAttachment["kind"] =>
  /^(ONS|TXT|FUL)-\d{3}$/.test(id) ? "library" : id.startsWith("MY-") ? "mine" : id.startsWith("URL-") ? "url" : "upload";

export const ROLE_LABEL: Record<RefAttachment["role"], string> = {
  style: "overall style",
  motion: "motion",
  typography: "typography",
  color: "colour / background",
  composition: "composition",
  subject: "subject / content",
};
export const INFLUENCE_LABEL: Record<RefAttachment["influence"], string> = { use: "use", light: "light inspiration", exclude: "exclude" };
export const SCOPE_LABEL: Record<RefScope, string> = { idea: "this idea", scene: "this scene", project: "whole project" };
