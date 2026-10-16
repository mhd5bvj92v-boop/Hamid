// Option D drafts and scoped reference attachments, edited in the Studio. The D editor and the References
// tab both work on these same entities in edit.json (no copied lists): an idea attachment lives in
// seg.dDraft.attachments, a scene one in seg.refs, a project one in doc.refs. Removing an attachment never
// deletes the saved asset.
import type { CreativeSegment, DDraft, EditDoc, RefAttachment, RefScope } from "../src/kit/project";
import { newAttachment } from "../src/kit/refs";

export const emptyDraft = (): DDraft => ({ text: "", attachments: [], rev: 0, updated: new Date().toISOString() });
export const draftOf = (seg: CreativeSegment): DDraft => seg.dDraft ?? emptyDraft();

const mapSeg = (doc: EditDoc, segId: string, fn: (s: CreativeSegment) => CreativeSegment): EditDoc => ({
  ...doc,
  segments: doc.segments.map((s) => (s.id === segId ? fn(s) : s)),
});

/** Change the draft (text, basedOn, combine, hints, attachments); bumps its revision. */
export const editDraft = (doc: EditDoc, segId: string, patch: Partial<DDraft>): EditDoc =>
  mapSeg(doc, segId, (s) => {
    const d = draftOf(s);
    return { ...s, dDraft: { ...d, ...patch, rev: d.rev + 1, updated: new Date().toISOString() } };
  });

/** All attachments touching this scene, with where they live. */
export const sceneAttachments = (doc: EditDoc, seg: CreativeSegment) => [
  ...draftOf(seg).attachments.map((a) => ({ a, at: "idea" as RefScope })),
  ...(seg.refs ?? []).map((a) => ({ a, at: "scene" as RefScope })),
  ...(doc.refs ?? []).map((a) => ({ a, at: "project" as RefScope })),
];

/** Attach an asset to this idea (the default scope); an asset already attached here is not duplicated. */
export const attach = (doc: EditDoc, segId: string, id: string, kind: RefAttachment["kind"], extra: Partial<RefAttachment> = {}): EditDoc => {
  const seg = doc.segments.find((s) => s.id === segId);
  if (!seg) return doc;
  if (draftOf(seg).attachments.some((a) => a.id === id)) return doc;
  return editDraft(doc, segId, { attachments: [...draftOf(seg).attachments, newAttachment(id, kind, extra)] });
};

/** Remove an attachment from where it lives (idea, scene or project); the asset itself stays saved. */
export const detach = (doc: EditDoc, segId: string, id: string, at: RefScope): EditDoc => {
  if (at === "project") return { ...doc, refs: (doc.refs ?? []).filter((a) => a.id !== id) };
  const seg = doc.segments.find((s) => s.id === segId);
  if (!seg) return doc;
  if (at === "scene") return mapSeg(doc, segId, (s) => ({ ...s, refs: (s.refs ?? []).filter((a) => a.id !== id) }));
  return editDraft(doc, segId, { attachments: draftOf(seg).attachments.filter((a) => a.id !== id) });
};

/** Change role / influence / note of an attachment where it lives. */
export const updateAttachment = (doc: EditDoc, segId: string, id: string, at: RefScope, patch: Partial<RefAttachment>): EditDoc => {
  const up = (list: RefAttachment[]) => list.map((a) => (a.id === id ? { ...a, ...patch } : a));
  if (at === "project") return { ...doc, refs: up(doc.refs ?? []) };
  const seg = doc.segments.find((s) => s.id === segId);
  if (!seg) return doc;
  if (at === "scene") return mapSeg(doc, segId, (s) => ({ ...s, refs: up(s.refs ?? []) }));
  return editDraft(doc, segId, { attachments: up(draftOf(seg).attachments) });
};

/** Move an attachment to another scope (this idea / this scene / the whole project). */
export const moveScope = (doc: EditDoc, segId: string, id: string, from: RefScope, to: RefScope): EditDoc => {
  if (from === to) return doc;
  const seg = doc.segments.find((s) => s.id === segId);
  if (!seg) return doc;
  const a = sceneAttachments(doc, seg).find((x) => x.a.id === id && x.at === from)?.a;
  if (!a) return doc;
  let next = detach(doc, segId, id, from);
  const moved = { ...a, scope: to };
  if (to === "project") next = { ...next, refs: [...(next.refs ?? []).filter((x) => x.id !== id), moved] };
  else if (to === "scene") next = mapSeg(next, segId, (s) => ({ ...s, refs: [...(s.refs ?? []).filter((x) => x.id !== id), moved] }));
  else {
    const s2 = next.segments.find((s) => s.id === segId)!;
    next = editDraft(next, segId, { attachments: [...draftOf(s2).attachments.filter((x) => x.id !== id), moved] });
  }
  return next;
};

/** This scene does / does not inherit a project reference. */
export const toggleInherit = (doc: EditDoc, segId: string, id: string): EditDoc =>
  mapSeg(doc, segId, (s) => {
    const ex = new Set(s.refExclude ?? []);
    if (ex.has(id)) ex.delete(id);
    else ex.add(id);
    return { ...s, refExclude: [...ex] };
  });

/** Thumbnail / link for an attachment. */
export const thumbOf = (slug: string, a: RefAttachment) =>
  a.kind === "library"
    ? `/api/refimg/${a.id}`
    : a.kind === "mine"
      ? `/api/library/file/${a.id}`
      : a.kind === "upload" && a.path
        ? `/api/file/${slug}/refs/${a.path.split(/[\\/]/).pop()}`
        : null;
