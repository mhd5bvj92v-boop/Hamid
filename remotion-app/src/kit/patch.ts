// Field-level changes to edit.json made in the Studio (Scene Planning and Timeline
// Editor). The Studio never saves whole documents: it sends what the user changed,
// and the server applies it to the current file, so work done meanwhile by server
// actions or Claude Code (concepts, drafts, decisions, builds, requests) is never
// undone. Pure: used by the Studio client and the server.
import type { CreativeSegment, EditDoc, SfxItem } from "./project";

type DocBeat = EditDoc["beats"][number];

/** Scene fields the user edits in the Studio; everything else on a scene is owned by server actions / Claude Code. */
export const UI_SEGMENT_FIELDS = ["start", "end", "text", "type", "sceneType", "onScreen", "transcriptIds", "major"] as const;
const TOP = ["transcript", "constants", "focus", "hookEnd"] as const;

export type DocPatch = {
  top?: Partial<Pick<EditDoc, (typeof TOP)[number]>>;
  /** Changed UI fields per scene, or a whole new scene. */
  segs?: Record<string, { fields?: Partial<CreativeSegment>; created?: CreativeSegment }>;
  beats?: { upsert: DocBeat[]; remove: string[] };
  sfx?: { upsert: SfxItem[]; remove: string[] };
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const itemDiff = <T extends { id: string }>(base: T[], next: T[]) => {
  const b = new Map(base.map((x) => [x.id, x]));
  const upsert = next.filter((x) => !same(b.get(x.id), x));
  const ids = new Set(next.map((x) => x.id));
  const remove = base.filter((x) => !ids.has(x.id)).map((x) => x.id);
  return upsert.length || remove.length ? { upsert, remove } : undefined;
};

/** What the user changed between the last server copy and their local copy (null = nothing). */
export const makePatch = (base: EditDoc, next: EditDoc): DocPatch | null => {
  const p: DocPatch = {};
  for (const k of TOP) if (!same(base[k], next[k])) (p.top ??= {})[k] = next[k] as never;
  const bs = new Map(base.segments.map((s) => [s.id, s]));
  for (const s of next.segments) {
    const o = bs.get(s.id);
    if (!o) {
      (p.segs ??= {})[s.id] = { created: s };
      continue;
    }
    const fields: Partial<CreativeSegment> = {};
    for (const f of UI_SEGMENT_FIELDS) if (!same(o[f], s[f])) (fields as Record<string, unknown>)[f] = s[f];
    if (Object.keys(fields).length) (p.segs ??= {})[s.id] = { fields };
  }
  const beats = itemDiff(base.beats, next.beats);
  if (beats) p.beats = beats;
  const sfx = itemDiff(base.sfx, next.sfx);
  if (sfx) p.sfx = sfx;
  return Object.keys(p).length ? p : null;
};

const applyItems = <T extends { id: string }>(items: T[], d?: { upsert: T[]; remove: string[] }) => {
  if (!d) return items;
  const out = items.filter((x) => !d.remove.includes(x.id)).map((x) => d.upsert.find((u) => u.id === x.id) ?? x);
  for (const u of d.upsert) if (!out.some((x) => x.id === u.id)) out.push(u);
  return out;
};

/**
 * Apply the user's changes to a (newer) copy of the document. A scene whose type,
 * words or plan text changed after its plan was approved goes back to a draft plan.
 */
export const applyPatch = (doc: EditDoc, p: DocPatch | null): EditDoc => {
  if (!p) return doc;
  const out: EditDoc = { ...doc, ...(p.top ?? {}) };
  out.segments = doc.segments.map((s) => {
    const ch = p.segs?.[s.id];
    if (!ch) return s;
    const fields = ch.fields ?? (ch.created ? Object.fromEntries(UI_SEGMENT_FIELDS.map((f) => [f, ch.created![f]])) : {});
    const next = { ...s, ...fields } as CreativeSegment;
    if (s.plan?.status === "approved" && ["sceneType", "onScreen", "text", "type"].some((f) => f in fields && !same((s as Record<string, unknown>)[f], (fields as Record<string, unknown>)[f])))
      next.plan = { status: "draft" };
    return next;
  });
  for (const [id, ch] of Object.entries(p.segs ?? {})) if (ch.created && !out.segments.some((s) => s.id === id)) out.segments.push(ch.created);
  out.segments.sort((a, b) => a.start - b.start);
  out.beats = applyItems(doc.beats, p.beats).sort((a, b) => a.at - b.at);
  out.sfx = applyItems(doc.sfx, p.sfx);
  return out;
};
