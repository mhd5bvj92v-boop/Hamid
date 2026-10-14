// Client for the Studio API (studio/server/api.ts). Every call reads or writes edit.json.
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

const call = async <T,>(method: string, url: string, body?: unknown): Promise<T> => {
  const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (r.status === 409 && j.doc) throw new ConflictError(j.error, j.doc);
  if (!r.ok) throw new Error(j.error ?? r.statusText);
  return j as T;
};

export type ProjectInfo = { slug: string; duration: number; fps: number; segments: number; beats: number; scriptOnly: boolean; openRequests: number };
export type Loaded = { doc: EditDoc; issues: TranscriptIssue[]; errors: string[]; manifest: { source: { path: string | null } } | null };
export type Ref = { id: string; title: string; category: string; family: string; tags: string[]; img: string };
export type Job = { id: string; status: "running" | "done" | "error" | "unknown"; progress: number; log: string[]; outputs: Record<string, string> };
type DocResult = { doc: EditDoc; out?: string };

export const api = {
  projects: () => call<ProjectInfo[]>("GET", "/api/projects"),
  create: (footage: string, slug: string, fps?: number, fit?: boolean) => call<{ doc: EditDoc; out: string }>("POST", "/api/projects", { footage, slug, fps, fit }),
  createScriptOnly: (slug: string, duration: number, fps?: number) => call<{ doc: EditDoc; out: string }>("POST", "/api/projects", { scriptOnly: true, slug, duration, fps }),
  load: (slug: string) => call<Loaded>("GET", `/api/project/${slug}`),
  rev: (slug: string) => call<{ rev: number; updated: string; open: number }>("GET", `/api/project/${slug}/rev`),
  save: (doc: EditDoc) => call<{ ok: true; rev: number; updated: string; errors: string[]; issues: TranscriptIssue[] }>("PUT", `/api/project/${doc.slug}`, doc),
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
  approve: (slug: string, gate: string, quote: string) => call<DocResult>("POST", `/api/project/${slug}/approve`, { gate, quote }),
  feedback: (slug: string, quote: string, changes: string[]) => call<DocResult>("POST", `/api/project/${slug}/feedback`, { quote, changes }),
  render: (slug: string, type: "preview" | "final", frameRange?: [number, number]) => call<{ job: string }>("POST", `/api/project/${slug}/render`, { type, frameRange }),
  proxy: (slug: string) => call<{ doc: EditDoc; frames: number; duration: number }>("POST", `/api/project/${slug}/proxy`),
  job: (id: string) => call<Job>("GET", `/api/jobs/${id}`),
};
