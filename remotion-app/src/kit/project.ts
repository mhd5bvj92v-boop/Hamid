// The single project document (remotion-app/src/projects/<slug>/edit.json).
// One file holds the user's timestamped script, the selected segments with
// their A/B/C/D concepts and decisions, the Remotion timeline items (beats),
// the sound effects and the approvals. The Studio UI, the Remotion Player,
// the preview/final renderer and the skill's scripts all read this file.
// Pure TypeScript: no React, no Node APIs.
import type { KitBeat } from "./timing";
import type { FocusWindow } from "./SourceFootage";
import type { SourceInfo } from "./types";

export type TranscriptSegment = {
  id: string;
  /** Seconds on the source timeline, exactly as the user provided them (null = missing). */
  start: number | null;
  end: number | null;
  /** The user's own words, never rewritten. */
  text: string;
  /** Optional word timings, if the user's file has them. */
  words?: { w: string; start: number; end: number }[];
};

export type Transcript = {
  origin: "none" | "user-script";
  importedFrom?: "pasted" | "srt" | "vtt" | "json";
  importedAt?: string;
  segments: TranscriptSegment[];
};

export type SegmentType = "text" | "onscreen" | "fullscreen" | "sound";
export const SEGMENT_TYPES: { type: SegmentType; label: string; system: "A" | "B" | "C" | "D" }[] = [
  { type: "text", label: "Text Animation", system: "B" },
  { type: "onscreen", label: "On-Screen Visual", system: "A" },
  { type: "fullscreen", label: "Full-Screen Animation", system: "C" },
  { type: "sound", label: "Sound Design", system: "D" },
];

// ------------------------------------------------------------------ scene planning
// A scene IS a CreativeSegment: Scene Planning and the Timeline Editor edit the same
// record (times, type, words, plan, concepts, decision, built versions).
export type SceneType = "captions" | "captions-ui" | "halfscreen" | "fullscreen";
export const SCENE_TYPES: {
  type: SceneType;
  label: string;
  /** The animation category it maps to (timeline track / Claude concept category). */
  segType: Exclude<SegmentType, "sound">;
  what: string;
  /** Examples from the user's reference library (style examples, not frames of the edit). */
  examples: string[];
  exampleNote?: string;
}[] = [
  { type: "captions", label: "Captions Only", segType: "text", what: "designed captions under the chin; the speaker stays fully visible", examples: ["TXT-004", "TXT-007"] },
  { type: "captions-ui", label: "Captions + UI", segType: "onscreen", what: "captions plus interface elements beside the speaker (lower UI band)", examples: ["ONS-001", "ONS-004"] },
  {
    type: "halfscreen",
    label: "Halfscreen",
    segType: "onscreen",
    what: "a graphic fills one half of the frame; the speaker stays visible in the other half",
    examples: [],
    exampleNote: "No half-screen example in your library yet: the diagram shows the layout only.",
  },
  { type: "fullscreen", label: "Fullscreen", segType: "fullscreen", what: "a full-screen scene covers the footage for a moment; the original keeps running underneath", examples: ["FUL-002", "FUL-063"] },
];
export const sceneTypeOf = (seg: { sceneType?: SceneType; type: SegmentType }): SceneType | null =>
  seg.sceneType ?? (seg.type === "text" ? "captions" : seg.type === "onscreen" ? "captions-ui" : seg.type === "fullscreen" ? "fullscreen" : null);
export const segTypeOf = (t: SceneType) => SCENE_TYPES.find((x) => x.type === t)!.segType;

/** Global styling for the whole edit ("Constants for the Whole Edit"): every brief for Claude Code carries it. */
export type EditConstants = {
  captionStyle: string;
  captionPosition: "under-chin" | "lower-third" | "center";
  captionCase: "as-spoken" | "sentence" | "upper";
  /** 10 % of the 60-30-10 palette: the accent (key word, active element, glow). */
  accentColor: string;
  /** Legacy second accent (kept for older projects; the palette is color60 / color30 / accentColor). */
  secondaryColor: string;
  /** 60 %: the base colour (backgrounds, large surfaces). */
  color60: string;
  /** 30 %: the support colour (panels, secondary shapes). */
  color30: string;
  /** Camera move every scene uses unless its plan says otherwise. */
  camera: import("./style").CameraStyle;
  cameraIntensity: "subtle" | "medium" | "strong";
  /**
   * Stage: a background preset (e.g. "paper-grid") shared by all consecutive full-screen scenes, with one
   * continuous chained camera and flowing scene transitions (src/kit/stage.tsx). "" = every scene its own.
   */
  stage?: string;
  /** natural talking head / talking head with visuals / UI-SaaS motion (art-direction.md); a scene's plan may override */
  mode?: "natural" | "visuals" | "ui-saas";
  /** delivery: changes layout checks and guides only, never the pacing */
  platform?: "tiktok" | "shorts" | "youtube";
  /** the short art-direction note: feeling, foundation, harmony, who may use the accent */
  artDirection?: string;
  /** Motion controls for the whole project (Properties → Motion); a scene can override them in sceneMotion. */
  motion?: MotionSettings;
  /** Per-scene motion overrides by segment id (kept here so rebuilding a scene never loses them). */
  sceneMotion?: Record<string, MotionSettings>;
  /** Set by the renderers only (not a creative setting): the quality preset of this render (src/kit/quality.ts). */
  renderQuality?: import("./quality").Quality;
  accentFont: "Instrument Serif" | "Playfair Display" | "JetBrains Mono" | "none";
  uiStyle: "dark-glass" | "light-glass" | "neon-rim" | "editorial";
  transitions: string;
  soundDensity: "minimal" | "standard" | "rich";
  music: boolean;
  notes: string;
};
export const DEFAULT_CONSTANTS: EditConstants = {
  captionStyle: "Montserrat 600 white, one key word in the accent font",
  captionPosition: "under-chin",
  captionCase: "as-spoken",
  accentColor: "#2F6BFF",
  secondaryColor: "#F2A14A",
  color60: "#0A0F1F",
  color30: "#1E2A44",
  camera: "push-in",
  cameraIntensity: "medium",
  accentFont: "Instrument Serif",
  uiStyle: "dark-glass",
  transitions: "fade-rise with blur clearing in; quick fade out; hard cuts in and out of full-screen scenes",
  soundDensity: "standard",
  music: false,
  notes: "",
};

/** The plan of one scene: drafted in Scene Planning, approved before Claude Code builds it. */
export type ScenePlan = { status: "draft" | "approved"; approvedAt?: string; quote?: string; via?: "plan" | "choice" };

export type SfxFamily = "whoosh" | "texture" | "riser" | "hit";
/** Joseph's starting clip gains (sound-design.md §6). Not loudness targets. */
export const GAIN_PRESETS: Record<SfxFamily, { db: number; min: number; max: number }> = {
  whoosh: { db: -12, min: -12, max: -10 },
  texture: { db: -7, min: -7, max: -6 },
  riser: { db: -5, min: -5, max: -5 },
  hit: { db: -6, min: -12, max: -3 },
};
export const ANCHOR: Record<SfxFamily, "peak" | "onset"> = { whoosh: "peak", texture: "onset", riser: "peak", hit: "onset" };

export type ConceptSfx = { family: SfxFamily; label: string; at: "start" | "end" | number; roles?: string[] };

export type ConceptOption = "A" | "B" | "C";
/** "claude" = Claude Concepts (proposed by Claude Code with the skill); "draft" = Quick Drafts (instant, from kit templates). */
export type ConceptSet = "claude" | "draft";

export type Concept = {
  title: string;
  /** A on-screen, B text, C full-screen, D sound. */
  system: "A" | "B" | "C" | "D";
  /** Kit beat kind (visual concepts). */
  kind?: string;
  props?: Record<string, unknown>;
  /** Sound concepts: placements relative to the segment. */
  sfx?: ConceptSfx[];
  refs: string[];
  family?: string;
  description: string;
  motion?: string;
  sound?: string;
  /** "claude" = proposed by Claude Code with the skill; "draft" = Quick Draft generated instantly from a kit template. */
  author: "claude" | "draft";
  preview?: string;
  /** Claude Concepts: how elements enter, what moves, how elements exit. */
  enter?: string;
  move?: string;
  exit?: string;
  /** The reference ID shown as STYLE REFERENCE (one of refs), or null = no matching reference in the library. */
  styleRef?: string | null;
  /** Why no library reference fits (when styleRef is null). */
  noReference?: string;
  /** The animation category the concept was written for. */
  category?: SegmentType;
  /** The concept request that produced it. */
  requestId?: string;
  /**
   * 3D / realistic assets this concept needs from the user (hands, a product, a planet...): Claude never
   * draws those with code shapes. The build waits until the user has provided every required one.
   */
  assets?: AssetNeed[];
};

/** An asset Claude asks the user for: what it shows and how to deliver it (format, angle, length...). */
export type AssetNeed = { id: string; what: string; spec: string; required?: boolean };
/** An asset the user provided for a scene: a copy in public/projects/<slug>/assets (the original is never touched). */
export type ProvidedAsset = {
  /** staticFile() path, e.g. "projects/my-video/assets/S04_A1_sphere.png". */
  file: string;
  name: string;
  kind: "image" | "video";
  at: string;
  what?: string;
  note?: string;
};

/** One item of an implementation checklist: every instruction is either done or explicitly not done (with the reason). */
export type Coverage = { item: string; done: boolean; how?: string; why?: string };

/** A built version of a segment's animation (the timeline item + its sounds), kept so it can be restored. */
export type BuildVersion = {
  v: number;
  at: string;
  /** What it was built from: a Quick Draft template, a Claude Concept, the user's own idea (D), or a revision. */
  source: "draft" | "claude" | "own" | "revision";
  requestId: string | null;
  beat: KitBeat & { segmentId?: string };
  sfx: SfxItem[];
  status: "built" | "partial";
  notes?: string;
  coverage?: Coverage[];
  /** Remotion renders of this version (served from work/<slug>/previews). */
  still?: string;
  clip?: string;
  /** The last preview sheet (key frames next to the style reference) and how the build matches the reference. */
  compare?: string;
  match?: { quality: string; done: boolean; how?: string; why?: string }[];
};

export type RequestType = "concepts" | "implement" | "revision" | "background" | "analysis";
// ------------------------------------------------------------------ motion controls
/** Plain-language motion controls (all optional; missing values fall back to the project, then the defaults). */
export type MotionSettings = {
  /** where elements enter from (they leave on the opposite side) */
  direction?: "right" | "left" | "bottom" | "top";
  /** 0 crisp and quick .. 1 soft and slow (durations x0.75 .. x1.4, gentler curves) */
  softness?: number;
  /** 0 no overshoot .. 1 a clear settle (about 10 %) */
  bounce?: number;
  /** 0 no glow .. 0.5 house default .. 1 double */
  glow?: number;
  /** 0 sharp entrances .. 0.5 house default .. 1 strong blur-in */
  blur?: number;
  /** shape morphs for meaningful state changes (path interpolation); off by default */
  morph?: boolean;
  /** camera motion blur on fast travel; off by default (costs render time) */
  motionBlur?: "off" | "light" | "strong";
};
export const MOTION_DEFAULTS: Required<MotionSettings> = { direction: "right", softness: 0.5, bounce: 0.2, glow: 0.5, blur: 0.5, morph: false, motionBlur: "off" };

// ------------------------------------------------------------------ references attached to ideas, scenes and the project
// A saved reference asset (built-in ONS/TXT/FUL-###, the user's MY-###, a D upload, a URL) is stored once;
// an attachment is a scoped link to it with a role, an influence and a note. Removing an attachment never
// deletes the asset. The effective set for a decision is resolved in src/kit/refs.ts.
export type RefScope = "idea" | "scene" | "project";
export type RefRole = "style" | "motion" | "typography" | "color" | "composition" | "subject";
export type RefInfluence = "use" | "light" | "exclude";
export type RefAttachment = {
  /** ONS-024 / TXT-003 / FUL-072 (built-in), MY-001 (My library), UP-<file> (upload), URL-<n> (link) */
  id: string;
  kind: "library" | "mine" | "upload" | "url";
  /** upload: absolute path on disk; mine: filled in when resolved */
  path?: string;
  url?: string;
  scope: RefScope;
  role: RefRole;
  influence: RefInfluence;
  /** "use this" / "avoid this" */
  note?: string;
  added: string;
};
/** Option D as the user is writing it: kept per scene in edit.json, so tabs, scenes and reloads never lose it. */
export type DDraft = {
  /** exactly as typed (line breaks and punctuation kept) */
  text: string;
  basedOn?: ConceptOption | "";
  combine?: string[];
  /** attachments of this idea (scope "idea") */
  attachments: RefAttachment[];
  /** optional structured hints; the free text stays the source instruction */
  hints?: { composition?: string; animation?: string; typography?: string; background?: string; sound?: string };
  /** bumped on every change of the draft; a decision records the revision it was made from */
  rev: number;
  updated: string;
};

export type RequestStatus = "pending" | "in_progress" | "completed" | "partial" | "failed" | "cancelled";

/** Snapshot of everything Claude Code needs to process a request (taken when it is created). */
export type RequestBrief = {
  project: string;
  segmentId: string;
  text: string;
  start: number;
  end: number;
  category: SegmentType;
  categoryLabel: string;
  context: { before: { id: string; start: number | null; end: number | null; text: string }[]; after: { id: string; start: number | null; end: number | null; text: string }[] };
  decisions: { segmentId: string; start: number; end: number; type: SegmentType; choice: string; title?: string; built: boolean }[];
  timeline: { id: string; kind: string; at: number; segmentId?: string }[];
  references: { suggested: { id: string; title: string; family: string; file: string }[]; previous: string[] };
  /** implement / revision */
  choice?: "A" | "B" | "C" | "D";
  conceptSet?: ConceptSet;
  concept?: Concept;
  /** The user's own idea (D), exactly as typed. */
  custom?: string;
  combine?: string[];
  basedOn?: ConceptOption;
  refs?: string[];
  uploads?: string[];
  /** D: the effective references (idea + scene + inherited project, exclusions applied), snapshot at decision time. */
  attachments?: RefAttachment[];
  excluded?: string[];
  hints?: DDraft["hints"];
  draftRev?: number;
  /** The approved scene plan and the edit-wide constants (Scene Planning). */
  plan?: { sceneType: SceneType | null; sceneLabel: string; onScreen: string; status: string };
  constants?: EditConstants;
  /** revision: the user's feedback, exactly as typed, and the version it applies to. */
  feedback?: string;
  version?: number;
  currentBeat?: KitBeat;
  note?: string;
};

/** A task for Claude Code, stored in edit.json (processed with edit_decisions.py; there is no automatic Claude API). */
export type ClaudeRequest = {
  /** REQ-0001...: stable, never reused within a project. */
  id: string;
  type: RequestType;
  segmentId: string;
  status: RequestStatus;
  created: string;
  updated: string;
  claimedAt?: string;
  completedAt?: string;
  /** Short result ("round 2: A/B/C", "v2 built (CyberAlert)") or the reason it failed / was cancelled. */
  result?: string;
  error?: string;
  brief: RequestBrief;
  /** Preview rounds Claude Code rendered next to the style reference before building (edit_decisions.py preview). */
  previews?: { n: number; hash: string; sheet: string; at: string }[];
};

export type Decision = {
  choice: "A" | "B" | "C" | "D" | "none";
  round: number;
  decided: string;
  /** Which set A/B/C came from (Claude Concepts or Quick Drafts); "own" for D. */
  source?: ConceptSet | "own";
  /** D: the user's own idea, stored exactly as typed. */
  custom?: string;
  combine?: string[];
  basedOn?: ConceptOption;
  refs?: string[];
  uploads?: string[];
  /** D: the effective references snapshot this decision was made with (see RequestBrief.attachments). */
  attachments?: RefAttachment[];
  excluded?: string[];
  hints?: DDraft["hints"];
  draftRev?: number;
  quote?: string;
  note?: string;
  /** The implementation request created for this decision (Claude Concepts and D). */
  requestId?: string;
};

export type CreativeSegment = {
  id: string;
  transcriptIds: string[];
  start: number;
  end: number;
  /** Exact spoken text of the selected range (copied from the user's script). */
  text: string;
  type: SegmentType;
  major: boolean;
  round: number;
  /** Claude Concepts only (author "claude"). */
  concepts: Partial<Record<ConceptOption, Concept>>;
  recommend?: ConceptOption;
  history: { round: number; concepts: CreativeSegment["concepts"]; replaced: string }[];
  /** Quick Drafts (author "draft"): instant template variants, kept apart from Claude Concepts. */
  drafts?: Partial<Record<ConceptOption, Concept>>;
  draftRound?: number;
  decision: Decision | null;
  /** Timeline item built from the decision (visual types). */
  beatId: string | null;
  /** Legacy free-text notes (older projects); requests now live in EditDoc.requests. */
  requests: { at: string; note: string }[];
  /** Built versions of this segment's animation (restore any of them). */
  versions?: BuildVersion[];
  activeVersion?: number | null;
  /** The user's review of the active version. */
  review?: { status: "approved" | "changes-requested"; version: number | null; at: string; note?: string } | null;
  /** Scene Planning: layout type, what happens on screen (the user's words), and the plan's approval. */
  sceneType?: SceneType;
  onScreen?: string;
  plan?: ScenePlan;
  /** 3D / realistic assets the user provided for this scene, by need id (A1...) or their own (U1...). */
  assets?: Record<string, ProvidedAsset>;
  /** Option D being written (persisted; survives tabs, scene switches and reloads). */
  dDraft?: DDraft;
  /** References attached to this whole scene (scope "scene"). */
  refs?: RefAttachment[];
  /** Project references this scene does not inherit (ids). */
  refExclude?: string[];
  /** Short scene brief: what the viewer must understand, the one visual idea, reading order, what the next scene inherits. */
  brief?: SceneBrief;
};

/** The user's saved feedback as a preference (brief §35): scoped, never promoted to a wider scope by itself. */
export type Preference = {
  id: string;
  text: string;
  kind: "like" | "avoid" | "rule";
  /** scene: only that scene; project: this video; future: every later video (library/preferences.json) */
  scope: "scene" | "project" | "future";
  segmentId?: string;
  /** the version of the scene the feedback was about */
  version?: number;
  active: boolean;
  at: string;
  source?: "review" | "manual";
};

/** The concise direction of a scene (brief §5), shown in the Studio and passed to Claude Code. */
export type SceneBrief = {
  understand?: string;
  idea?: string;
  why?: string;
  focus?: string;
  enterExit?: string;
  inherits?: string;
  sound?: string;
  /** an intentional still hold (e.g. a dense visual that needs attention) */
  stillHold?: boolean;
};

export type SfxItem = {
  id: string;
  family: SfxFamily;
  /** Linked to an animation event (moves with the beat) or a fixed time. */
  link: { beatId: string; intent: string } | { time: number };
  /** Authorised library sound id (data/sounds.json); null = not assigned yet. */
  sound: string | null;
  gainDb: number;
  gainReason?: string;
  offsetFrames: number;
  enabled: boolean;
  label: string;
  segmentId?: string;
};

export type Approval = { gate: "direction" | "preview" | "final"; at: string; quote: string; scope?: string };

export type EditDoc = {
  /** Schema revision (2: scoped references, D drafts, scene briefs) and what migrations ran, non-destructively. */
  schema?: number;
  migrations?: { to: number; at: string; notes: string }[];
  /** Saved feedback preferences of this video (scene and project scope; future ones live in the library). */
  preferences?: Preference[];
  /** References attached to the whole project (scope "project"): every scene inherits them unless it excludes them. */
  refs?: RefAttachment[];
  /** Camera moves on the talking-head footage (Timeline "Zoom" track); look only, never timing. */
  zooms?: import("./SourceFootage").ZoomWindow[];
  version: 1;
  slug: string;
  source: SourceInfo & { sha256: string };
  transcript: Transcript;
  segments: CreativeSegment[];
  beats: (KitBeat & { segmentId?: string })[];
  sfx: SfxItem[];
  focus: FocusWindow[];
  hookEnd: number | null;
  approvals: Approval[];
  feedback: { at: string; quote: string; changes: string[] }[];
  /** Global styling for the whole edit (Scene Planning). */
  constants?: EditConstants;
  /** Tasks for Claude Code (concepts, implementations, revisions). */
  requests?: ClaudeRequest[];
  nextRequest?: number;
  /** Incremented on every write (Studio, CLI): stale writes are refused instead of overwriting newer data. */
  rev?: number;
  updated?: string;
};

export const OPEN_REQUEST: RequestStatus[] = ["pending", "in_progress"];

/** A scene counts as decided once the user chose A/B/C/D or approved its plan. */
export const isDecided = (s: CreativeSegment) => !!s.decision || s.plan?.status === "approved";

/** Defaults for older documents; Quick Drafts that older versions stored as concepts move to drafts. */
export const SCHEMA = 2;
export const normalizeDoc = (doc: EditDoc): EditDoc => {
  if ((doc.schema ?? 1) < SCHEMA) {
    // v1 -> v2: D decisions get an attachments snapshot built from their legacy refs/uploads (kept as they were)
    let n = 0;
    for (const s of doc.segments) {
      const d = s.decision;
      if (d?.choice === "D" && !d.attachments && ((d.refs?.length ?? 0) || (d.uploads?.length ?? 0))) {
        const at = d.decided ?? new Date().toISOString();
        d.attachments = [
          ...(d.refs ?? []).map((id): RefAttachment => ({ id, kind: id.startsWith("MY-") ? "mine" : "library", scope: "idea", role: "style", influence: "use", added: at })),
          ...(d.uploads ?? []).map((p): RefAttachment => ({ id: `UP-${p.split(/[\\/]/).pop()}`, kind: "upload", path: p, scope: "idea", role: "style", influence: "use", added: at })),
        ];
        n++;
      }
    }
    doc.migrations = [...(doc.migrations ?? []), { to: SCHEMA, at: new Date().toISOString(), notes: `scoped references; ${n} D decision(s) got an attachments snapshot from their refs/uploads` }];
    doc.schema = SCHEMA;
  }
  doc.refs ??= [];
  doc.requests ??= [];
  doc.nextRequest ??= doc.requests.length + 1;
  doc.rev ??= 0;
  doc.constants = { ...DEFAULT_CONSTANTS, ...(doc.constants ?? {}) };
  for (const s of doc.segments) {
    s.history ??= [];
    s.requests ??= [];
    s.versions ??= [];
    const cs = Object.values(s.concepts ?? {});
    if (cs.length && cs.every((c) => c?.author === "draft")) {
      s.drafts = s.concepts;
      s.draftRound = s.round;
      s.concepts = {};
      s.round = 0;
      if (s.decision && !s.decision.source) s.decision.source = "draft";
    }
    if (s.decision && !s.decision.source) s.decision.source = s.decision.choice === "D" ? "own" : "claude";
  }
  return doc;
};

/** The newest request of the given types for a segment. */
export const latestRequest = (doc: EditDoc, segmentId: string, types: RequestType[]) =>
  [...(doc.requests ?? [])].reverse().find((r) => r.segmentId === segmentId && types.includes(r.type)) ?? null;

export type BuildState = "none" | "pending" | "in_progress" | "built" | "partial" | "failed";

/** Where a segment's animation stands: waiting for Claude Code, built (which version), or failed. */
export const buildState = (doc: EditDoc, seg: CreativeSegment): { state: BuildState; request: ClaudeRequest | null; version: BuildVersion | null } => {
  const req = latestRequest(doc, seg.id, ["implement", "revision"]);
  const version = (seg.versions ?? []).find((v) => v.v === seg.activeVersion) ?? null;
  if (req && (req.status === "pending" || req.status === "in_progress")) return { state: req.status, request: req, version };
  if (req && req.status === "failed") return { state: "failed", request: req, version };
  if (version) return { state: version.status, request: req, version };
  return { state: "none", request: req, version: null };
};

// ------------------------------------------------------------------ timecodes

export const fmtTime = (s: number | null | undefined, decimals = 2) => {
  if (s === null || s === undefined || !Number.isFinite(s)) return "--:--";
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${String(m).padStart(2, "0")}:${r.toFixed(decimals).padStart(decimals + 3, "0")}`;
};

/** "1:02.5", "00:01:02,500", "62.5", "01:02" -> seconds (null if unparseable). */
export const parseTime = (raw: string): number | null => {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const nums = parts.map(parseFloat);
  return nums.reduce((acc, n) => acc * 60 + n, 0);
};

// ------------------------------------------------------------------ script import
// The user's script is imported as written: text is never rewritten and
// timestamps are never changed. Problems are flagged for the user to fix.

const TS = String.raw`(\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?|\d+(?:[.,]\d{1,3})?`;

const cleanText = (t: string) => t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const withIds = (segs: Omit<TranscriptSegment, "id">[]): TranscriptSegment[] =>
  segs.map((s, i) => ({ id: `T${String(i + 1).padStart(3, "0")}`, ...s }));

/** SRT or VTT cues. */
export const parseSubtitles = (raw: string): TranscriptSegment[] => {
  const blocks = raw.replace(/\r/g, "").replace(/^WEBVTT[^\n]*\n/, "").split(/\n\s*\n/);
  const out: Omit<TranscriptSegment, "id">[] = [];
  const re = new RegExp(`^\\s*(${TS})\\s*-->\\s*(${TS})`);
  for (const b of blocks) {
    const lines = b.split("\n").filter((l) => l.trim() !== "");
    const i = lines.findIndex((l) => re.test(l));
    if (i < 0) continue;
    const m = lines[i].match(re)!;
    const text = cleanText(lines.slice(i + 1).join(" "));
    if (!text) continue;
    out.push({ start: parseTime(m[1]), end: parseTime(m[3]), text });
  }
  return withIds(out);
};

/**
 * Pasted script, one cue per line. Accepted forms (separators -, –, —, -->, to):
 *   [00:01.2 - 00:03.4] text      00:01.2 --> 00:03.4 text      1.2-3.4: text
 *   [00:12] text   (start only: the end is flagged as missing, never guessed)
 */
export const parsePasted = (raw: string): TranscriptSegment[] => {
  const out: Omit<TranscriptSegment, "id">[] = [];
  const range = new RegExp(`^\\s*[\\[(]?\\s*(${TS})\\s*(?:-->|–|—|-|to)\\s*(${TS})\\s*[\\])]?\\s*[:|\\-–—]?\\s*(.*)$`);
  const single = new RegExp(`^\\s*[\\[(]\\s*(${TS})\\s*[\\])]\\s*[:|\\-–—]?\\s*(.*)$`);
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    if (!line.trim()) continue;
    let m = line.match(range);
    if (m && cleanText(m[5] ?? "")) {
      out.push({ start: parseTime(m[1]), end: parseTime(m[3]), text: cleanText(m[5]) });
      continue;
    }
    m = line.match(single);
    if (m) {
      out.push({ start: parseTime(m[1]), end: null, text: cleanText(m[3] ?? "") });
      continue;
    }
    out.push({ start: null, end: null, text: cleanText(line) });
  }
  return withIds(out);
};

/** JSON: [{start, end, text, words?}] or {segments: [...]} (seconds or timecode strings). */
export const parseJsonTranscript = (raw: string): TranscriptSegment[] => {
  const data = JSON.parse(raw);
  const arr: unknown[] = Array.isArray(data) ? data : (data.segments ?? data.transcript ?? []);
  const t = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? parseTime(v) : null);
  return withIds(
    arr.map((x) => {
      const o = x as Record<string, unknown>;
      const words = Array.isArray(o.words)
        ? (o.words as Record<string, unknown>[]).map((w) => ({ w: String(w.w ?? w.word ?? w.text ?? ""), start: t(w.start) ?? NaN, end: t(w.end) ?? NaN }))
        : undefined;
      return { start: t(o.start ?? o.from), end: t(o.end ?? o.to), text: String(o.text ?? o.sentence ?? ""), ...(words ? { words } : {}) };
    }),
  );
};

export const detectFormat = (name: string, raw: string): Transcript["importedFrom"] => {
  const n = name.toLowerCase();
  if (n.endsWith(".srt")) return "srt";
  if (n.endsWith(".vtt") || raw.trimStart().startsWith("WEBVTT")) return "vtt";
  if (n.endsWith(".json")) return "json";
  if (/^\s*[[{]/.test(raw)) {
    // "[00:01.2 - 00:03.4] text" also starts with "[": only real JSON counts
    try {
      JSON.parse(raw);
      return "json";
    } catch {
      /* not JSON */
    }
  }
  if (/-->/.test(raw) && /^\s*\d+\s*$/m.test(raw)) return "srt";
  return "pasted";
};

export const parseTranscript = (format: Transcript["importedFrom"], raw: string) =>
  format === "srt" || format === "vtt" ? parseSubtitles(raw) : format === "json" ? parseJsonTranscript(raw) : parsePasted(raw);

export type TranscriptIssue = { id: string; level: "error" | "warning"; message: string };

/** Flags problems. Never fixes them: the user corrects the timing. */
export const validateTranscript = (segs: TranscriptSegment[], duration: number): TranscriptIssue[] => {
  const out: TranscriptIssue[] = [];
  segs.forEach((s, i) => {
    if (!s.text.trim()) out.push({ id: s.id, level: "warning", message: "empty text" });
    if (s.start === null) out.push({ id: s.id, level: "error", message: "missing start time" });
    if (s.end === null) out.push({ id: s.id, level: "error", message: "missing end time" });
    if (s.start !== null && s.end !== null && s.end <= s.start) out.push({ id: s.id, level: "error", message: "end is not after start" });
    if (s.start !== null && (s.start < 0 || s.start >= duration)) out.push({ id: s.id, level: "error", message: `start outside the video (0-${duration.toFixed(2)} s)` });
    if (s.end !== null && s.end > duration + 0.05) out.push({ id: s.id, level: "error", message: `end after the video ends (${duration.toFixed(2)} s)` });
    const prev = segs[i - 1];
    if (prev && prev.start !== null && s.start !== null && s.start < prev.start) out.push({ id: s.id, level: "error", message: "starts before the previous line (order)" });
    if (prev && prev.end !== null && s.start !== null && s.start < prev.end - 0.001) out.push({ id: s.id, level: "warning", message: `overlaps the previous line by ${(prev.end - s.start).toFixed(2)} s` });
    for (const w of s.words ?? []) {
      if (!Number.isFinite(w.start) || !Number.isFinite(w.end) || w.end < w.start) {
        out.push({ id: s.id, level: "warning", message: `word "${w.w}" has invalid timing` });
        break;
      }
    }
  });
  return out;
};

/** Combine two adjacent lines: text joined, start of the first, end of the second (no timing invented). */
export const combineSegments = (segs: TranscriptSegment[], id: string): TranscriptSegment[] => {
  const i = segs.findIndex((s) => s.id === id);
  if (i < 0 || i >= segs.length - 1) return segs;
  const a = segs[i];
  const b = segs[i + 1];
  const merged: TranscriptSegment = {
    id: a.id,
    start: a.start,
    end: b.end,
    text: `${a.text} ${b.text}`.trim(),
    ...(a.words && b.words ? { words: [...a.words, ...b.words] } : {}),
  };
  return [...segs.slice(0, i), merged, ...segs.slice(i + 2)];
};

/** Split a line after word index `wordIndex` at the time the USER gives. */
export const splitSegment = (segs: TranscriptSegment[], id: string, wordIndex: number, at: number): TranscriptSegment[] => {
  const i = segs.findIndex((s) => s.id === id);
  if (i < 0) return segs;
  const s = segs[i];
  const tokens = s.text.split(" ");
  if (wordIndex < 0 || wordIndex >= tokens.length - 1) return segs;
  const used = new Set(segs.map((x) => x.id));
  let n = segs.length + 1;
  while (used.has(`T${String(n).padStart(3, "0")}`)) n++;
  const first: TranscriptSegment = { id: s.id, start: s.start, end: at, text: tokens.slice(0, wordIndex + 1).join(" ") };
  const second: TranscriptSegment = { id: `T${String(n).padStart(3, "0")}`, start: at, end: s.end, text: tokens.slice(wordIndex + 1).join(" ") };
  if (s.words) {
    first.words = s.words.filter((w) => w.end <= at + 1e-6);
    second.words = s.words.filter((w) => w.start >= at - 1e-6);
  }
  return [...segs.slice(0, i), first, second, ...segs.slice(i + 1)];
};

/** Transcript lines overlapping [start, end) (timeline selection -> highlighted text). */
export const linesInRange = (segs: TranscriptSegment[], start: number, end: number) =>
  segs.filter((s) => s.start !== null && s.end !== null && s.start < end && s.end > start);

/** The line being spoken at time t (null between lines). */
export const lineAt = (segs: TranscriptSegment[], t: number) =>
  segs.find((s) => s.start !== null && s.end !== null && t >= s.start && t < s.end) ?? null;
