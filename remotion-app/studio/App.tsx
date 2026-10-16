import { Player, PlayerRef } from "@remotion/player";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CreativeSegment,
  EditDoc,
  SceneType,
  SegmentType,
  TranscriptIssue,
} from "../src/kit/project";
import {
  SEGMENT_TYPES,
  fmtTime,
  linesInRange,
  segTypeOf,
} from "../src/kit/project";
import { applyPatch, makePatch } from "../src/kit/patch";
import { StudioEdit, StudioEditProps } from "../src/kit/StudioEdit";
import { SoundMeta, resolveAudio } from "../src/kit/studio";
import {
  api,
  ConflictError,
  hasPendingSave,
  knownRev,
  ProjectInfo,
  scheduleSave,
  view as localView,
} from "./api";
import { CreativePanel } from "./components/CreativePanel";
import { ExportPanel } from "./components/ExportPanel";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { ScenePlanning } from "./components/ScenePlanning";
import { ReferencesPanel } from "./components/ReferencesPanel";
import { GuideSettings, PLATFORM_ZONES } from "../src/kit/Guides";
import { PlatformZonesEditor } from "./components/PlatformZonesEditor";
import { SoundPanel } from "./components/SoundPanel";
import { Timeline } from "./components/Timeline";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { PlayerStage } from "./components/PlayerStage";
import {
  FilmIcon,
  KeyboardIcon,
  LockIcon,
  PauseIcon,
  PlayIcon,
} from "./ui/icons";
import { ShortcutsPopover } from "./ui/Shortcuts";
import { ThemeToggle, useTheme } from "./ui/theme";

export type Selection = {
  start: number;
  end: number;
  lineIds: string[];
  source: "transcript" | "timeline";
} | null;
// Open-source Chromium builds (e.g. Playwright's) ship without H.264; Chrome, Edge and Safari have it.
const canPlayH264 =
  typeof document !== "undefined" &&
  document
    .createElement("video")
    .canPlayType('video/mp4; codecs="avc1.640028"') !== "";

type Tab = "creative" | "properties" | "sound" | "references" | "export";
/** Two connected workspaces over the same edit.json: Scene Planning and the Timeline Editor. */
type View = "plan" | "timeline";

export const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [slug, setSlug] = useState<string>(
    () => new URLSearchParams(location.search).get("project") ?? "",
  );
  const [doc, setDocState] = useState<EditDoc | null>(null);
  const [issues, setIssues] = useState<TranscriptIssue[]>([]);
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "dirty" | "error"
  >("saved");
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [beatId, setBeatId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("creative");
  const [sounds, setSounds] = useState<SoundMeta[]>([]);
  const [previewConcept, setPreviewConcept] =
    useState<StudioEditProps["concept"]>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const [view, setViewState] = useState<View>(() =>
    new URLSearchParams(location.search).get("view") === "plan"
      ? "plan"
      : "timeline",
  );
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const setView = (v: View) => {
    setViewState(v);
    const u = new URL(location.href);
    u.searchParams.set("view", v);
    history.replaceState(null, "", u.toString());
  };
  const focusScene = (id: string) =>
    setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
  const player = useRef<PlayerRef>(null);
  const live = useRef<{ state: string }>({ state: "saved" });
  live.current = { state: saveState };
  const reloadSounds = useCallback(
    () =>
      api
        .sounds()
        .then(setSounds)
        .catch(() => setSounds([])),
    [],
  );

  useEffect(() => {
    api
      .projects()
      .then(setProjects)
      .catch((e) => setError(String(e.message)));
    api
      .sounds()
      .then(setSounds)
      .catch(() => setSounds([]));
  }, []);

  useEffect(() => {
    if (!slug) return;
    history.replaceState(
      null,
      "",
      `?project=${slug}${new URLSearchParams(location.search).get("view") ? `&view=${new URLSearchParams(location.search).get("view")}` : ""}`,
    );
    api
      .projects()
      .then(setProjects)
      .catch(() => undefined);
    api
      .load(slug)
      .then((l) => {
        setDocState(l.doc);
        setIssues(l.issues);
        setSaveState("saved");
      })
      .catch((e) => setError(String(e.message)));
  }, [slug]);

  const docRef = useRef<EditDoc | null>(null);
  docRef.current = doc;
  /** Local edit: the Player updates immediately, edit.json is saved shortly after (writes are queued in order). */
  const commitDoc = useCallback((next: EditDoc) => {
    docRef.current = next;
    setDocState(next);
    setSaveState("dirty");
    scheduleSave(
      next,
      (r) => {
        // the server copy (with everything done meanwhile) + any newer unsaved edits
        const v = localView(next.slug);
        if (v) setDocState(v);
        if (!r) {
          if (!hasPendingSave()) setSaveState("saved");
          return;
        }
        setIssues(r.issues);
        setSaveState(hasPendingSave() ? "dirty" : r.errors.length ? "error" : "saved");
        setError(r.errors.length ? r.errors.join("; ") : null);
      },
      (e) => {
        if (e instanceof ConflictError) {
          // Claude Code (or the CLI) wrote edit.json first: take its version, never overwrite it
          setDocState(e.doc);
          setSaveState("saved");
          setError(e.message);
          return;
        }
        setSaveState("error");
        setError(String((e as Error).message));
      },
    );
  }, []);

  // ---- Undo / redo of the user's own edits (the ones that go through setDoc).
  // Snapshots of the document before each edit; a drag or a burst of typing is one step.
  const past = useRef<EditDoc[]>([]);
  const future = useRef<EditDoc[]>([]);
  const lastEdit = useRef(0);
  const gesture = useRef({ active: false, pushed: false });
  const [, setHistoryTick] = useState(0);
  const bumpHistory = () => setHistoryTick((n) => n + 1);
  const clearHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    lastEdit.current = 0;
    setHistoryTick((n) => n + 1);
  }, []);
  const setDoc = useCallback(
    (next: EditDoc) => {
      const cur = docRef.current;
      if (cur && cur.slug === next.slug) {
        const now = Date.now();
        const g = gesture.current;
        const coalesce = g.active ? g.pushed : now - lastEdit.current < 700;
        if (g.active) g.pushed = true;
        lastEdit.current = now;
        if (!coalesce) {
          past.current.push(cur);
          if (past.current.length > 50) past.current.shift();
          future.current = [];
          setHistoryTick((n) => n + 1);
        }
      }
      commitDoc(next);
    },
    [commitDoc],
  );
  const onGesture = useCallback((active: boolean) => {
    gesture.current = { active, pushed: false };
    if (!active) lastEdit.current = 0;
  }, []);
  /** Bring back the user-editable fields of a snapshot; work done meanwhile by the server is kept. */
  const restore = (cur: EditDoc, snap: EditDoc) =>
    applyPatch(cur, makePatch(cur, snap));
  const undo = useCallback(() => {
    const cur = docRef.current;
    const prev = past.current.pop();
    if (!cur || !prev) return;
    future.current.push(cur);
    lastEdit.current = 0;
    commitDoc(restore(cur, prev));
    bumpHistory();
  }, [commitDoc]);
  const redo = useCallback(() => {
    const cur = docRef.current;
    const nxt = future.current.pop();
    if (!cur || !nxt) return;
    past.current.push(cur);
    lastEdit.current = 0;
    commitDoc(restore(cur, nxt));
    bumpHistory();
  }, [commitDoc]);
  // a new project starts with an empty history
  useEffect(() => clearHistory(), [slug, clearHistory]);

  // Pick up what Claude Code writes to edit.json (concepts, builds, request status) while the Studio is open.
  useEffect(() => {
    if (!slug) return;
    const t = window.setInterval(async () => {
      if (live.current.state !== "saved") return;
      try {
        const r = await api.rev(slug);
        if (r.rev === knownRev(slug) || live.current.state !== "saved")
          return;
        const l = await api.load(slug);
        if (live.current.state !== "saved") return;
        clearHistory();
        setDocState(l.doc);
        setIssues(l.issues);
        setNotice(
          `Updated from edit.json (rev ${l.doc.rev}) — e.g. Claude Code processed a request.`,
        );
        window.setTimeout(() => setNotice(null), 6000);
      } catch {
        /* server restarting: try again next tick */
      }
    }, 1500);
    return () => window.clearInterval(t);
  }, [slug, clearHistory]);
  /** Server-side change (drafts, choose, approvals): already saved. */
  /** A server action's result: the new server copy, with the user's unsaved edits (if any) re-applied on top. */
  const fromServer = useCallback(
    (next: EditDoc) => {
      // server actions are not undoable: the history starts again from here
      clearHistory();
      setDocState(localView(next.slug) ?? next);
      if (!hasPendingSave()) setSaveState("saved");
    },
    [clearHistory],
  );

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    let raf = 0;
    const onFrame = (e: { detail: { frame: number } }) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setFrame(e.detail.frame));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("seeked", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("seeked", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onPause);
    };
    // re-attach when the Player (re)mounts, e.g. after the preview proxy is created
  }, [doc?.slug, doc?.source.previewSrc]);

  const fps = doc?.source.fps ?? 30;
  const seek = useCallback(
    (t: number) => {
      const f = Math.max(0, Math.round(t * fps));
      player.current?.seekTo(f);
      setFrame(f);
    },
    [fps],
  );
  const durationInFrames = doc?.source.durationInFrames ?? 1;
  const seekFrame = useCallback(
    (f: number) => {
      const c = Math.max(0, Math.min(durationInFrames - 1, Math.round(f)));
      player.current?.seekTo(c);
      setFrame(c);
    },
    [durationInFrames],
  );
  const togglePlay = useCallback(() => player.current?.toggle(), []);

  // ---- Keyboard shortcuts (never while the user is typing in a field)
  const keys = useRef({ frame, fps, seekFrame, togglePlay, undo, redo });
  keys.current = { frame, fps, seekFrame, togglePlay, undo, redo };
  useEffect(() => {
    const typing = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t || !t.tagName) return false;
      return (
        t.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (!docRef.current || e.defaultPrevented || typing(e.target)) return;
      const k = keys.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && !e.altKey && (key === "z" || key === "y")) {
        e.preventDefault();
        if (key === "y" || e.shiftKey) k.redo();
        else k.undo();
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        setShowKeys((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setShowKeys(false);
        return;
      }
      const go = (f: number) => {
        e.preventDefault();
        k.seekFrame(f);
      };
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        // a focused button would otherwise be "clicked" by the space bar
        if ((e.target as HTMLElement)?.tagName === "BUTTON")
          (e.target as HTMLElement).blur();
        k.togglePlay();
      } else if (e.key === "ArrowLeft") go(k.frame - (e.shiftKey ? k.fps : 1));
      else if (e.key === "ArrowRight") go(k.frame + (e.shiftKey ? k.fps : 1));
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(Number.MAX_SAFE_INTEGER);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const soundMap = useMemo(
    () => Object.fromEntries(sounds.map((s) => [s.id, s])),
    [sounds],
  );
  const audio = useMemo(
    () => (doc ? resolveAudio(doc, soundMap) : []),
    [doc, soundMap],
  );
  // preview-only composition guides (per viewer, remembered in this browser; never in a render)
  const [guides, setGuidesState] = useState<GuideSettings>(() => {
    try {
      return JSON.parse(localStorage.getItem("cds-guides") ?? "{}") as GuideSettings;
    } catch {
      return {};
    }
  });
  const setGuides = (g: GuideSettings) => {
    setGuidesState(g);
    try {
      localStorage.setItem("cds-guides", JSON.stringify(g));
    } catch {
      /* private window: not remembered */
    }
  };
  const guidesOn = !!(guides.thirds || guides.center || guides.safe || guides.platform);
  const inputProps: StudioEditProps = useMemo(
    () => ({
      doc,
      layers: "all",
      concept: previewConcept,
      audio: previewConcept ? null : audio,
      guides: guidesOn ? { ...guides, zones: guides.platform ? (doc?.constants?.platformZones?.[guides.platform] ?? null) : null } : null,
    }),
    [doc, previewConcept, audio, guides, guidesOn],
  );

  const segment = doc?.segments.find((s) => s.id === segmentId) ?? null;

  const createSegment = (type: SegmentType) => {
    if (!doc || !selection) return;
    const lines = linesInRange(
      doc.transcript.segments,
      selection.start,
      selection.end,
    ).filter(
      (l) => selection.lineIds.length === 0 || selection.lineIds.includes(l.id),
    );
    addScene(lines, selection.start, selection.end, type);
  };

  /** Scene Planning: a scene type chosen on a transcript line creates the scene on that line's exact times. */
  const createScene = (lineIds: string[], sceneType: SceneType) => {
    if (!doc) return;
    const lines = doc.transcript.segments.filter((l) => lineIds.includes(l.id));
    const start = Math.min(...lines.map((l) => l.start ?? 0));
    const end = Math.max(...lines.map((l) => l.end ?? 0));
    addScene(lines, start, end, segTypeOf(sceneType), sceneType);
  };

  const addScene = (
    lines: EditDoc["transcript"]["segments"],
    start: number,
    end: number,
    type: SegmentType,
    sceneType?: SceneType,
  ) => {
    if (!doc) return;
    const text = lines
      .map((l) => l.text)
      .join(" ")
      .trim();
    // new ids never collide with a scene on the server or on its way there
    const taken = new Set([
      ...doc.segments.map((x) => x.id),
      ...(localView(doc.slug)?.segments ?? []).map((x) => x.id),
    ]);
    let n = 1;
    while (taken.has(`S${String(n).padStart(2, "0")}`)) n++;
    const seg: CreativeSegment = {
      id: `S${String(n).padStart(2, "0")}`,
      transcriptIds: lines.map((l) => l.id),
      start: +start.toFixed(3),
      end: +end.toFixed(3),
      text,
      type,
      ...(sceneType
        ? { sceneType }
        : type === "text"
          ? { sceneType: "captions" as const }
          : type === "onscreen"
            ? { sceneType: "captions-ui" as const }
            : type === "fullscreen"
              ? { sceneType: "fullscreen" as const }
              : {}),
      onScreen: "",
      plan: { status: "draft" as const },
      major: type !== "sound",
      round: 0,
      concepts: {},
      drafts: {},
      history: [],
      decision: null,
      beatId: null,
      requests: [],
      versions: [],
      activeVersion: null,
    };
    const next = {
      ...doc,
      segments: [...doc.segments, seg].sort((a, b) => a.start - b.start),
    };
    setDocState(next);
    api
      .save(next)
      .then(() => api.drafts(next.slug, seg.id)) // instant Quick Drafts; Claude Concepts are requested explicitly
      .then((r) => {
        fromServer(r.doc);
        setSegmentId(seg.id);
        setTab("creative");
        if (view === "plan") focusScene(seg.id);
      })
      .catch((e) => setError(String(e.message)));
  };

  const saveAndDraft = async (next: EditDoc, segId: string) => {
    setDocState(next);
    try {
      await api.save(next);
    } catch (e) {
      if (e instanceof ConflictError) {
        setDocState(e.doc);
        setError(e.message);
        return;
      }
      throw e;
    }
    const r = await api.drafts(next.slug, segId);
    fromServer(r.doc);
  };

  const creativeFor = (seg: CreativeSegment | null) =>
    doc ? (
      <CreativePanel
        doc={doc}
        segment={seg}
        fromServer={fromServer}
        setDoc={setDoc}
        setError={setError}
        previewConcept={previewConcept}
        setPreviewConcept={(c) => {
          setPreviewConcept(c);
          if (c && seg)
            seek(seg.start + Math.min(1, (seg.end - seg.start) / 2));
        }}
        onBuilt={(id) => {
          setBeatId(id);
          setPreviewConcept(null);
        }}
        seek={seek}
      />
    ) : null;

  /** One selection for both workspaces: the scene/line range on the timeline, the Player, the scene record. */
  const selectRange = (r: {
    segId: string | null;
    lineIds: string[];
    start: number;
    end: number;
  }) => {
    setSelection({
      start: r.start,
      end: r.end,
      lineIds: r.lineIds,
      source: "transcript",
    });
    setSegmentId(r.segId);
    seek(r.start);
  };

  const compW: number = doc?.source.width || 1080;
  const compH: number = doc?.source.height || 1920;
  const aspect = compW / compH;
  const orient = aspect > 1.05 ? "landscape" : aspect < 0.95 ? "portrait" : "square";

  if (!slug || !doc) {
    return (
      <div className="landing">
        <div className="landing-top">
          <div className="brand">
            <span className="brand-mark">
              <FilmIcon size={16} />
            </span>
            Creative Director Studio
          </div>
          <ThemeToggle theme={theme} toggle={toggleTheme} />
        </div>
        <div className="landing-hero">
          <h1>Creative Director Studio</h1>
          <p className="muted">
            Remotion-native finishing for your already-cut talking-head videos.
            Your cut, pauses and dialogue are never changed.
          </p>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <section className="card">
          <h3>Open a project</h3>
          <div className="project-list">
            {projects.map((p) => (
              <button
                key={p.slug}
                className="project"
                onClick={() => setSlug(p.slug)}
                data-testid={`open-${p.slug}`}
              >
                <span className="project-icon">
                  <FilmIcon size={18} />
                </span>
                <b>{p.slug}</b>
                <span className="muted">
                  {p.scriptOnly ? "script-only · " : ""}
                  {p.duration.toFixed(1)} s · {p.fps} fps · {p.segments}{" "}
                  segments · {p.beats} timeline items
                  {p.openRequests
                    ? ` · ${p.openRequests} waiting for Claude Code`
                    : ""}
                </span>
              </button>
            ))}
            {!projects.length ? (
              <span className="muted empty-note">
                No projects yet. Import your cut or start from the script below.
              </span>
            ) : null}
          </div>
        </section>
        <NewProject onCreated={(s) => setSlug(s)} />
      </div>
    );
  }

  return (
    <div className="studio">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand" title="Creative Director Studio">
            <span className="brand-mark">
              <FilmIcon size={16} />
            </span>
            <span className="brand-name">Creative Director Studio</span>
          </div>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="project-select"
            title="Switch project"
          >
            {projects.map((p) => (
              <option key={p.slug}>{p.slug}</option>
            ))}
          </select>
        </div>
        <nav className="views" data-testid="views">
          <button
            className={view === "plan" ? "active" : ""}
            onClick={() => setView("plan")}
            data-testid="view-plan"
          >
            Scene Planning
          </button>
          <button
            className={view === "timeline" ? "active" : ""}
            onClick={() => setView("timeline")}
            data-testid="view-timeline"
          >
            Timeline Editor
          </button>
        </nav>
        <div className="topbar-right">
          <span
            className="pill"
            title={`${doc.source.durationInFrames} frames at ${doc.source.fps} fps`}
          >
            {doc.source.durationInFrames} frames · {doc.source.fps} fps ·{" "}
            {compW}×{compH}
          </span>
          {doc.source.scriptOnly ? (
            <span
              className="pill warn-pill"
              data-testid="script-only"
              title="Attach your cut later: python3 .claude/skills/video-editing/scripts/edit_init.py /path/to/my-cut.mp4 --slug <this project>"
            >
              script-only · no footage yet
            </span>
          ) : (
            <span
              className="pill"
              title="Your original file is never modified: every animation is layered on top."
            >
              <LockIcon size={12} /> original footage locked
            </span>
          )}
          {doc.source.scriptOnly ? null : doc.source.previewSrc ? (
            <span
              className="pill"
              title="The Player shows a VP9 proxy of the same footage (same fps and duration); every render uses the original."
            >
              preview proxy on
            </span>
          ) : (
            <button
              className="ghost small"
              onClick={() =>
                api
                  .proxy(doc.slug)
                  .then((r) => fromServer(r.doc))
                  .catch((e) => setError(String(e.message)))
              }
              data-testid="make-proxy"
            >
              Create preview proxy
            </button>
          )}
          <span
            className={`save save-${saveState}`}
            data-testid="save-state"
            title="Every change is saved to edit.json automatically"
          >
            {saveState === "saved"
              ? "saved to edit.json"
              : saveState === "saving"
                ? "saving…"
                : saveState === "dirty"
                  ? "unsaved changes"
                  : "save error"}
          </span>
          <span className="topbar-sep" />
          <div className="popover-anchor">
            <button
              className={`icon-btn${showKeys ? " active" : ""}`}
              onClick={() => setShowKeys((v) => !v)}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
              data-shortcuts-toggle
              data-testid="shortcuts-toggle"
            >
              <KeyboardIcon />
            </button>
            {showKeys ? (
              <ShortcutsPopover onClose={() => setShowKeys(false)} />
            ) : null}
          </div>
          <ThemeToggle theme={theme} toggle={toggleTheme} />
        </div>
      </header>
      <div className="banner-slot">
        {notice && !error ? (
          <div
            className="notice banner"
            data-testid="notice"
            onClick={() => setNotice(null)}
          >
            {notice}
          </div>
        ) : null}
        {error ? (
          <div
            className="error banner"
            onClick={() => setError(null)}
            data-testid="error-banner"
          >
            {error}
          </div>
        ) : null}
      </div>
      <div className={`main view-${view} ar-${orient}`}>
        {view === "plan" ? (
          <section className="panel planning-panel">
            <ScenePlanning
              doc={doc}
              setDoc={setDoc}
              fromServer={fromServer}
              saveAndDraft={saveAndDraft}
              setError={setError}
              segmentId={segmentId}
              focus={focus}
              onSelectRow={selectRange}
              onCreateScene={createScene}
              renderConcepts={(seg) => creativeFor(seg)}
            />
          </section>
        ) : null}
        {view === "timeline" ? (
          <section className="panel transcript-panel">
            <TranscriptPanel
              doc={doc}
              issues={issues}
              frame={frame}
              selection={selection}
              setSelection={setSelection}
              seek={seek}
              setDoc={setDoc}
              fromServer={fromServer}
              setIssues={setIssues}
              onCreateSegment={createSegment}
              onOpenSegment={(id) => {
                setSegmentId(id);
                setTab("creative");
              }}
              setError={setError}
            />
          </section>
        ) : null}
        <section className="panel preview-panel">
          {previewConcept ? (
            <div className="concept-banner">
              Previewing concept {previewConcept.segmentId} ·{" "}
              {previewConcept.option} (not on the timeline yet)
              <button onClick={() => setPreviewConcept(null)}>
                Back to the edit
              </button>
            </div>
          ) : null}
          <PlayerStage aspect={aspect}>
            {!doc.source.scriptOnly &&
            !doc.source.previewSrc &&
            !canPlayH264 ? (
              <div className="player-error" data-testid="needs-proxy">
                <p>
                  This browser cannot decode H.264 video, so the Player cannot
                  show your file directly.
                </p>
                <p className="muted small">
                  A preview proxy (VP9, same frames, same duration) is used by
                  the Player only; every render uses the original.
                </p>
                <button
                  className="primary"
                  onClick={() =>
                    api
                      .proxy(doc.slug)
                      .then((r) => fromServer(r.doc))
                      .catch((e) => setError(String(e.message)))
                  }
                >
                  Create preview proxy
                </button>
              </div>
            ) : (
              <Player
                ref={player}
                component={StudioEdit}
                inputProps={inputProps}
                durationInFrames={doc.source.durationInFrames}
                fps={doc.source.fps}
                compositionWidth={compW}
                compositionHeight={compH}
                controls
                clickToPlay={false}
                spaceKeyToPlayOrPause={false}
                acknowledgeRemotionLicense
                errorFallback={({ error: err }) =>
                  // only a media error means the browser can't decode the footage; anything else is a bug in a scene's code
                  /MediaError|decode|codec|NotSupported|no supported source|format error|DEMUXER|PIPELINE_ERROR/i.test(String(err.message)) ? (
                    <div className="player-error">
                      <p>
                        The browser could not play the footage (
                        {String(err.message).slice(0, 120)}).
                      </p>
                      <p className="muted small">
                        This browser lacks the codec of your file. A preview proxy
                        (VP9, same timeline) fixes the Player; renders always use
                        the original.
                      </p>
                      <button
                        className="primary"
                        onClick={() =>
                          api
                            .proxy(doc.slug)
                            .then((r) => {
                              fromServer(r.doc);
                              location.reload();
                            })
                            .catch((e) => setError(String(e.message)))
                        }
                      >
                        Create preview proxy
                      </button>
                    </div>
                  ) : (
                    <div className="player-error" data-testid="player-code-error">
                      <p>
                        A scene&apos;s code has an error: <b>{String(err.message).slice(0, 160)}</b>
                      </p>
                      <p className="muted small">
                        Your footage and edit.json are fine. Tell Claude Code:{" "}
                        <i>&quot;The Studio Player shows: {String(err.message).slice(0, 160)}. Find the scene that causes it, fix it and re-run preview.&quot;</i>
                      </p>
                      <button className="primary" onClick={() => location.reload()}>
                        Try again
                      </button>
                    </div>
                  )
                }
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </PlayerStage>
          <div className="transport">
            <button
              className="icon-btn play-btn"
              onClick={togglePlay}
              title={playing ? "Pause (Space)" : "Play (Space)"}
              aria-label={playing ? "Pause" : "Play"}
              data-testid="play-toggle"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="timecode" data-testid="timecode">
              {fmtTime(frame / fps)} · frame {frame}
            </div>
            <span className="muted small">
              / {fmtTime(durationInFrames / fps)}
            </span>
            <div className="guides-ctl" data-testid="guides" title="Preview-only guides; never rendered into the video">
              <span className="muted small">Guides</span>
              {(["thirds", "center", "safe"] as const).map((k) => (
                <button key={k} className={`chip${guides[k] ? " active" : ""}`} onClick={() => setGuides({ ...guides, [k]: !guides[k] })} data-testid={`guide-${k}`}>
                  {k === "thirds" ? "thirds" : k === "center" ? "centre" : "safe"}
                </button>
              ))}
              <select value={guides.platform ?? ""} onChange={(e) => setGuides({ ...guides, platform: e.target.value as GuideSettings["platform"] })} data-testid="guide-platform" title={guides.platform ? PLATFORM_ZONES[guides.platform].checked : "platform UI zones (approximate)"}>
                <option value="">no platform zones</option>
                {Object.entries(PLATFORM_ZONES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                    {doc?.constants?.platformZones?.[k as keyof typeof PLATFORM_ZONES] ? " · yours" : ""}
                  </option>
                ))}
              </select>
              {guides.platform && doc ? <PlatformZonesEditor doc={doc} platform={guides.platform} setDoc={setDoc} /> : null}
            </div>
          </div>
        </section>
        {view === "timeline" ? (
          <section className="panel inspector">
            <nav className="tabs">
              {(
                [
                  "creative",
                  "properties",
                  "sound",
                  "references",
                  "export",
                ] as Tab[]
              ).map((t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                  data-testid={`tab-${t}`}
                >
                  {t === "creative"
                    ? "A/B/C/D"
                    : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </nav>
            <div className="tab-body">
              {tab === "creative" ? creativeFor(segment) : null}
              {tab === "properties" ? (
                <PropertiesPanel
                  onOpenPlan={(id) => {
                    setView("plan");
                    setSegmentId(id);
                    focusScene(id);
                  }}
                  doc={doc}
                  beatId={beatId}
                  setBeatId={setBeatId}
                  setDoc={setDoc}
                  seek={seek}
                  fromServer={fromServer}
                />
              ) : null}
              {tab === "sound" ? (
                <SoundPanel
                  doc={doc}
                  setDoc={setDoc}
                  fromServer={fromServer}
                  reloadSounds={reloadSounds}
                  setError={setError}
                  sounds={sounds}
                  segmentId={segmentId}
                  seek={seek}
                />
              ) : null}
              {tab === "references" ? (
                <ReferencesPanel doc={doc} segment={segment} setDoc={setDoc} />
              ) : null}
              {tab === "export" ? (
                <ExportPanel
                  doc={doc}
                  fromServer={fromServer}
                  setError={setError}
                />
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
      <section className="timeline-panel">
        <Timeline
          doc={doc}
          frame={frame}
          seek={seek}
          selection={selection}
          setSelection={setSelection}
          setDoc={setDoc}
          onGesture={onGesture}
          onUndo={undo}
          onRedo={redo}
          canUndo={past.current.length > 0}
          canRedo={future.current.length > 0}
          selectedBeat={beatId}
          selectedSegment={segmentId}
          onSelectBeat={(id) => {
            // an animation on the timeline opens its scene plan (same record in both workspaces)
            setBeatId(id);
            const sid = doc.beats.find((b) => b.id === id)?.segmentId ?? null;
            if (sid) setSegmentId(sid);
            if (view === "plan" && sid) focusScene(sid);
            else setTab("properties");
          }}
          onSelectSegment={(id) => {
            setSegmentId(id);
            if (view === "plan") focusScene(id);
            else setTab("creative");
          }}
          onSelectSfx={(id) => {
            const s = doc.sfx.find((x) => x.id === id);
            if (s?.segmentId) setSegmentId(s.segmentId);
            setTab("sound");
          }}
        />
        {selection ? (
          <div className="selection-bar" data-testid="selection-bar">
            <span>
              Selected <b data-testid="sel-start">{fmtTime(selection.start)}</b>{" "}
              – <b data-testid="sel-end">{fmtTime(selection.end)}</b> (
              {(selection.end - selection.start).toFixed(2)} s)
            </span>
            <span className="sel-text" data-testid="sel-text">
              “
              {linesInRange(
                doc.transcript.segments,
                selection.start,
                selection.end,
              )
                .filter(
                  (l) =>
                    !selection.lineIds.length ||
                    selection.lineIds.includes(l.id),
                )
                .map((l) => l.text)
                .join(" ")}
              ”
            </span>
            {SEGMENT_TYPES.map((t) => (
              <button
                key={t.type}
                className="type-btn"
                onClick={() => createSegment(t.type)}
                data-testid={`create-${t.type}`}
              >
                {t.label}
              </button>
            ))}
            <button className="ghost" onClick={() => setSelection(null)}>
              Clear
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

/** "My New Video!" -> "my-new-video" (project names: lowercase letters, digits and hyphens). */
const toSlug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").slice(0, 41);
const SIZES = [
  { id: "1080x1920", label: "9:16 vertical · 1080×1920" },
  { id: "1920x1080", label: "16:9 landscape · 1920×1080" },
  { id: "2160x3840", label: "9:16 vertical 4K · 2160×3840" },
  { id: "3840x2160", label: "16:9 landscape 4K · 3840×2160" },
];

const NewProject: React.FC<{ onCreated: (slug: string) => void }> = ({
  onCreated,
}) => {
  const [footage, setFootage] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sSlug, setSSlug] = useState("");
  const [duration, setDuration] = useState("");
  const [fps, setFps] = useState("30");
  const [size, setSize] = useState("");
  const [sSize, setSSize] = useState("1080x1920");
  return (
    <>
      <div className="new-project">
        <h3>Import an already-cut video</h3>
        <p className="muted">
          The file is linked, never copied or modified. Its frame rate and
          duration define the timeline.
        </p>
        <input
          placeholder="/path/to/my-cut.mp4"
          value={footage}
          onChange={(e) => setFootage(e.target.value)}
        />
        <input
          placeholder="project-name"
          value={slug}
          onChange={(e) => setSlug(toSlug(e.target.value))}
        />
        <select value={size} onChange={(e) => setSize(e.target.value)} data-testid="new-size">
          <option value="">Format: same as my video</option>
          {SIZES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
        <button
          className="primary"
          disabled={busy || !footage || !slug}
          onClick={async () => {
            setBusy(true);
            setMsg("");
            try {
              await api.create(footage, slug.replace(/-+$/, ""), undefined, undefined, size || undefined);
              onCreated(slug.replace(/-+$/, ""));
            } catch (e) {
              setMsg(String((e as Error).message));
            }
            setBusy(false);
          }}
        >
          {busy ? "Importing…" : "Import video"}
        </button>
        {msg ? <pre className="error">{msg}</pre> : null}
      </div>
      <div className="new-project">
        <h3>Or start from the script only</h3>
        <p className="muted">
          No cut yet? Work on your script and the animations first. The Player
          shows a neutral stand-in; attach the real cut later (decisions are
          kept). The final export needs the cut.
        </p>
        <input
          placeholder="project-name"
          value={sSlug}
          onChange={(e) => setSSlug(toSlug(e.target.value))}
          data-testid="so-slug"
        />
        <select value={sSize} onChange={(e) => setSSize(e.target.value)} data-testid="so-size">
          {SIZES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
        <div className="row">
          <input
            placeholder="length in seconds (at least the end of your script)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            data-testid="so-duration"
          />
          <input
            placeholder="fps"
            value={fps}
            onChange={(e) => setFps(e.target.value)}
            style={{ width: 90 }}
          />
        </div>
        <button
          className="primary"
          disabled={busy || !sSlug || !(parseFloat(duration) > 0)}
          data-testid="so-create"
          onClick={async () => {
            setBusy(true);
            setMsg("");
            try {
              const name = sSlug.replace(/-+$/, "");
              await api.createScriptOnly(name, parseFloat(duration), parseFloat(fps) || 30, sSize);
              onCreated(name);
            } catch (e) {
              setMsg(String((e as Error).message));
            }
            setBusy(false);
          }}
        >
          Create script-only project
        </button>
      </div>
    </>
  );
};
