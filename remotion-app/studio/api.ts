// Client for the Studio API (studio/server/api.ts). Every call reads or writes edit.json.
import type { EditDoc, TranscriptIssue } from "../src/kit/project";
import type { SoundMeta } from "../src/kit/studio";

const call = async <T,>(method: string, url: string, body?: unknown): Promise<T> => {
  const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? r.statusText);
  return j as T;
};

export type ProjectInfo = { slug: string; duration: number; fps: number; segments: number; beats: number };
export type Loaded = { doc: EditDoc; issues: TranscriptIssue[]; errors: string[]; manifest: { source: { path: string } } | null };
export type Ref = { id: string; title: string; category: string; family: string; tags: string[]; img: string };
export type Job = { id: string; status: "running" | "done" | "error" | "unknown"; progress: number; log: string[]; outputs: Record<string, string> };

export const api = {
  projects: () => call<ProjectInfo[]>("GET", "/api/projects"),
  create: (footage: string, slug: string, fps?: number, fit?: boolean) => call<{ doc: EditDoc; out: string }>("POST", "/api/projects", { footage, slug, fps, fit }),
  load: (slug: string) => call<Loaded>("GET", `/api/project/${slug}`),
  save: (doc: EditDoc) => call<{ ok: true; updated: string; errors: string[]; issues: TranscriptIssue[] }>("PUT", `/api/project/${doc.slug}`, doc),
  importScript: (slug: string, raw: string, name: string, replace: boolean) => call<{ doc: EditDoc; issues: TranscriptIssue[] }>("POST", `/api/project/${slug}/transcript`, { raw, name, replace }),
  references: (q: string, cat: string) => call<Ref[]>("GET", `/api/references?q=${encodeURIComponent(q)}&cat=${cat}`),
  sounds: () => call<SoundMeta[]>("GET", "/api/sounds"),
  drafts: (slug: string, segmentId: string) => call<{ doc: EditDoc }>("POST", `/api/project/${slug}/drafts`, { segmentId }),
  request: (slug: string, segmentId: string, note: string) => call<{ doc: EditDoc }>("POST", `/api/project/${slug}/request`, { segmentId, note }),
  conceptPreview: (slug: string, segmentId: string, option: string) => call<{ doc: EditDoc; url: string }>("POST", `/api/project/${slug}/concept-preview`, { segmentId, option }),
  choose: (slug: string, b: { segmentId: string; option: string; custom?: string; basedOn?: string; combine?: string[]; refs?: string[]; quote?: string }) =>
    call<{ doc: EditDoc; built: boolean; awaitingClaude: boolean }>("POST", `/api/project/${slug}/choose`, b),
  approve: (slug: string, gate: string, quote: string) => call<{ doc: EditDoc }>("POST", `/api/project/${slug}/approve`, { gate, quote }),
  feedback: (slug: string, quote: string, changes: string[]) => call<{ doc: EditDoc }>("POST", `/api/project/${slug}/feedback`, { quote, changes }),
  render: (slug: string, type: "preview" | "final", frameRange?: [number, number]) => call<{ job: string }>("POST", `/api/project/${slug}/render`, { type, frameRange }),
  proxy: (slug: string) => call<{ doc: EditDoc; frames: number; duration: number }>("POST", `/api/project/${slug}/proxy`),
  job: (id: string) => call<Job>("GET", `/api/jobs/${id}`),
};
