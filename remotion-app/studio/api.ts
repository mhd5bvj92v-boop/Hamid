// Client for the Studio API (studio/server/api.ts). Every call reads or writes edit.json.
import type { DocPatch } from "../src/kit/patch";
import { applyPatch, makePatch } from "../src/kit/patch";
import type { ConceptOption, EditDoc, TranscriptIssue } from "../src/kit/project";
import type { SoundMeta } from "../src/kit/studio";

/** edit.json was written by someone else (Claude Code, the CLI) since this copy was loaded. */
export class ConflictError extends Error {
  constructor(
    message: string,
    public doc: EditDoc,
  ) {
    super(message);
  }
}

/** The last copy of each project's edit.json this Studio received from the server (updated by every response). */
const server = new Map<string, EditDoc>();
const known = new Map<string, number>();
export const knownRev = (slug: string) => known.get(slug) ?? 0;
const remember = (j: unknown) => {
  const d = (j as { doc?: EditDoc })?.doc;
  if (d?.slug && typeof d.rev === "number") {
    server.set(d.slug, d);
    known.set(d.slug, d.rev);
  }
};

const raw = async <T,>(method: string, url: string, body?: unknown): Promise<T> => {
  const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  remember(j);
  if (r.status === 409 && j.doc) throw new ConflictError(j.error, j.doc);
  if (!r.ok) throw new Error(j.error ?? r.statusText);
  return j as T;
};

// Writes go out one at a time, in order, and a pending autosave is sent before any other write.
let chain: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
  const p = chain.then(fn, fn);
  chain = p.catch(() => undefined);
  return p;
};
type SaveResult = { ok: true; rev: number; updated: string; doc: EditDoc; errors: string[]; issues: TranscriptIssue[] };
const send = (slug: string, patch: DocPatch | null) =>
  patch ? raw<SaveResult>("PATCH", `/api/project/${slug}`, { patch }) : Promise.resolve(null);
let pending: { slug: string; patch: DocPatch; timer: number; done: (r: SaveResult | null) => void; fail: (e: unknown) => void } | null = null;
/** Changes sent (or queued) but not yet answered: still part of what the user sees. */
const inflight = new Map<string, DocPatch[]>();
const flush = () => {
  if (!pending) return Promise.resolve();
  const p = pending;
  pending = null;
  window.clearTimeout(p.timer);
  const list = inflight.get(p.slug) ?? [];
  inflight.set(p.slug, list);
  list.push(p.patch);
  const settle = () => list.splice(list.indexOf(p.patch), 1);
  return enqueue(() => send(p.slug, p.patch)).then(
    (r) => {
      settle();
      p.done(r);
    },
    (e) => {
      settle();
      p.fail(e);
    },
  );
};
/** What the Studio shows: the last server copy, plus changes on their way, plus unsaved edits. */
export const view = (slug: string): EditDoc | undefined => {
  let d = server.get(slug);
  if (!d) return d;
  for (const p of inflight.get(slug) ?? []) d = applyPatch(d, p);
  return pending?.slug === slug ? applyPatch(d, pending.patch) : d;
};
/** Debounced autosave of a local edit (the Player already shows it): only the changed fields are sent. */
export const scheduleSave = (doc: EditDoc, done: (r: SaveResult | null) => void, fail: (e: unknown) => void, delay = 450) => {
  const base = server.get(doc.slug);
  const patch = base ? makePatch(base, doc) : null;
  if (pending) window.clearTimeout(pending.timer);
  if (!patch) {
    pending = null;
    done(null);
    return;
  }
  pending = { slug: doc.slug, patch, done, fail, timer: window.setTimeout(() => void flush(), delay) };
};
export const hasPendingSave = () => pending !== null;

const call = async <T,>(method: string, url: string, body?: unknown): Promise<T> => {
  if (method === "GET") return raw<T>(method, url, body);
  await flush();
  return enqueue(() => raw<T>(method, url, body));
};

export type ProjectInfo = { slug: string; duration: number; fps: number; segments: number; beats: number; scriptOnly: boolean; openRequests: number };
export type Loaded = { doc: EditDoc; issues: TranscriptIssue[]; errors: string[]; manifest: { source: { path: string | null } } | null };
export type Ref = { id: string; title: string; category: string; family: string; tags: string[]; img: string };
export type Job = { id: string; status: "running" | "done" | "error" | "unknown"; progress: number; log: string[]; outputs: Record<string, string> };
type DocResult = { doc: EditDoc; out?: string };

export const api = {
  projects: () => call<ProjectInfo[]>("GET", "/api/projects"),
  create: (footage: string, slug: string, fps?: number, fit?: boolean, size?: string) =>
    call<{ doc: EditDoc; out: string }>("POST", "/api/projects", { footage, slug, fps, fit, size }),
  createScriptOnly: (slug: string, duration: number, fps?: number, size?: string) =>
    call<{ doc: EditDoc; out: string }>("POST", "/api/projects", { scriptOnly: true, slug, duration, fps, size }),
  load: (slug: string) => call<Loaded>("GET", `/api/project/${slug}`),
  rev: (slug: string) => call<{ rev: number; updated: string; open: number }>("GET", `/api/project/${slug}/rev`),
  /** Save now: the user's changes since the last server copy go out (in order) and stay visible until answered. */
  save: (doc: EditDoc) =>
    new Promise<SaveResult>((ok, fail) => {
      scheduleSave(doc, (r) => ok(r ?? { ok: true, rev: known.get(doc.slug) ?? 0, updated: "", doc: view(doc.slug) ?? doc, errors: [], issues: [] }), fail, 0);
      void flush();
    }),
  importScript: (slug: string, raw: string, name: string, replace: boolean) => call<{ doc: EditDoc; issues: TranscriptIssue[] }>("POST", `/api/project/${slug}/transcript`, { raw, name, replace }),
  references: (q: string, cat: string) => call<Ref[]>("GET", `/api/references?q=${encodeURIComponent(q)}&cat=${cat}`),
  sounds: () => call<SoundMeta[]>("GET", "/api/sounds"),
  assignSounds: (slug: string) => call<DocResult & { assigned: number; missing: number }>("POST", `/api/project/${slug}/assign-sounds`),
  drafts: (slug: string, segmentId: string) => call<DocResult>("POST", `/api/project/${slug}/drafts`, { segmentId }),
  claudeRequest: (slug: string, segmentId: string, note?: string) => call<DocResult>("POST", `/api/project/${slug}/claude-request`, { segmentId, note }),
  cancelRequest: (slug: string, requestId: string) => call<DocResult>("POST", `/api/project/${slug}/cancel-request`, { requestId }),
  conceptPreview: (slug: string, segmentId: string, option: string, set: "claude" | "draft") =>
    call<DocResult & { url: string }>("POST", `/api/project/${slug}/concept-preview`, { segmentId, option, set }),
  choose: (
    slug: string,
    b: { segmentId: string; option: ConceptOption | "D"; set: "claude" | "draft"; custom?: string; basedOn?: string; combine?: string[]; refs?: string[]; uploads?: string[]; quote?: string },
  ) => call<DocResult & { built: boolean; awaitingClaude: boolean }>("POST", `/api/project/${slug}/choose`, b),
  review: (slug: string, segmentId: string, action: "approve" | "changes", feedback?: string) => call<DocResult>("POST", `/api/project/${slug}/review`, { segmentId, action, feedback }),
  restore: (slug: string, segmentId: string, version: number) => call<DocResult>("POST", `/api/project/${slug}/restore`, { segmentId, version }),
  renderVersion: (slug: string, segmentId: string) => call<DocResult>("POST", `/api/project/${slug}/render-version`, { segmentId }),
  upload: (slug: string, name: string, data: string) => call<{ path: string; url: string }>("POST", `/api/project/${slug}/upload`, { name, data }),
  askBackground: (slug: string, segmentId: string, prompt: string) =>
    call<{ doc: EditDoc; out: string }>("POST", `/api/project/${slug}/ask-background`, { segmentId, prompt }),
  library: () =>
    call<{ backgrounds: { id: string; label: string; description: string }[]; cameraMoves: { id: string; label: string }[]; textStyles: string[];
      references: { id: string; name: string; tags: string[]; note: string; kind: string }[] }>("GET", "/api/library"),
  addReference: (name: string, data: string, tags: string, note: string, kind: string) =>
    call<{ references: { id: string; name: string; tags: string[]; note: string; kind: string }[] }>("POST", "/api/library/reference", { name, data, tags, note, kind }),
  /** The user's 3D / realistic asset for a scene (a concept's need id, or none for their own asset). */
  uploadAsset: (slug: string, segmentId: string, name: string, data: string, needId?: string, note?: string) =>
    call<{ doc: EditDoc; out: string }>("POST", `/api/project/${slug}/asset`, { segmentId, name, data, needId, note }),
  approvePlans: (slug: string, segmentIds: string[], quote: string) => call<DocResult>("POST", `/api/project/${slug}/plan-approve`, { segmentIds, quote }),
  approve: (slug: string, gate: string, quote: string) => call<DocResult>("POST", `/api/project/${slug}/approve`, { gate, quote }),
  feedback: (slug: string, quote: string, changes: string[]) => call<DocResult>("POST", `/api/project/${slug}/feedback`, { quote, changes }),
  render: (slug: string, type: "preview" | "final", frameRange?: [number, number]) => call<{ job: string }>("POST", `/api/project/${slug}/render`, { type, frameRange }),
  proxy: (slug: string) => call<{ doc: EditDoc; frames: number; duration: number }>("POST", `/api/project/${slug}/proxy`),
  job: (id: string) => call<Job>("GET", `/api/jobs/${id}`),
};
