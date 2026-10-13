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
  SegmentType,
  TranscriptIssue,
} from "../src/kit/project";
import { SEGMENT_TYPES, fmtTime, linesInRange } from "../src/kit/project";
import { StudioEdit, StudioEditProps } from "../src/kit/StudioEdit";
import { SoundMeta, resolveAudio } from "../src/kit/studio";
import { api, ProjectInfo } from "./api";
import { CreativePanel } from "./components/CreativePanel";
import { ExportPanel } from "./components/ExportPanel";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { ReferencesPanel } from "./components/ReferencesPanel";
import { SoundPanel } from "./components/SoundPanel";
import { Timeline } from "./components/Timeline";
import { TranscriptPanel } from "./components/TranscriptPanel";

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
  const [extraRefs, setExtraRefs] = useState<string[]>([]);
  const player = useRef<PlayerRef>(null);
  const saveTimer = useRef<number | null>(null);

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
    history.replaceState(null, "", `?project=${slug}`);
    api
      .load(slug)
      .then((l) => {
        setDocState(l.doc);
        setIssues(l.issues);
        setSaveState("saved");
      })
      .catch((e) => setError(String(e.message)));
  }, [slug]);

  /** Local edit: the Player updates immediately, edit.json is saved shortly after. */
  const setDoc = useCallback((next: EditDoc) => {
    setDocState(next);
    setSaveState("dirty");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const r = await api.save(next);
        setIssues(r.issues);
        setSaveState(r.errors.length ? "error" : "saved");
        setError(r.errors.length ? r.errors.join("; ") : null);
      } catch (e) {
        setSaveState("error");
        setError(String((e as Error).message));
      }
    }, 450);
  }, []);
  /** Server-side change (drafts, choose, approvals): already saved. */
  const fromServer = useCallback((next: EditDoc) => {
    setDocState(next);
    setSaveState("saved");
  }, []);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    let raf = 0;
    const onFrame = (e: { detail: { frame: number } }) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setFrame(e.detail.frame));
    };
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("seeked", onFrame);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("seeked", onFrame);
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

  const soundMap = useMemo(
    () => Object.fromEntries(sounds.map((s) => [s.id, s])),
    [sounds],
  );
  const audio = useMemo(
    () => (doc ? resolveAudio(doc, soundMap) : []),
    [doc, soundMap],
  );
  const inputProps: StudioEditProps = useMemo(
    () => ({
      doc,
      layers: "all",
      concept: previewConcept,
      audio: previewConcept ? null : audio,
    }),
    [doc, previewConcept, audio],
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
    const text = lines
      .map((l) => l.text)
      .join(" ")
      .trim();
    let n = doc.segments.length + 1;
    while (doc.segments.some((s) => s.id === `S${String(n).padStart(2, "0")}`))
      n++;
    const seg: CreativeSegment = {
      id: `S${String(n).padStart(2, "0")}`,
      transcriptIds: lines.map((l) => l.id),
      start: +selection.start.toFixed(3),
      end: +selection.end.toFixed(3),
      text,
      type,
      major: type !== "sound",
      round: 0,
      concepts: {},
      history: [],
      decision: null,
      beatId: null,
      requests: [],
    };
    const next = {
      ...doc,
      segments: [...doc.segments, seg].sort((a, b) => a.start - b.start),
    };
    setDocState(next);
    api
      .save(next)
      .then(() => api.drafts(next.slug, seg.id))
      .then((r) => {
        fromServer(r.doc);
        setSegmentId(seg.id);
        setTab("creative");
      })
      .catch((e) => setError(String(e.message)));
  };

  if (!slug || !doc) {
    return (
      <div className="landing">
        <h1>Creative Director Studio</h1>
        <p className="muted">
          Remotion-native finishing for your already-cut talking-head videos.
          Your cut, pauses and dialogue are never changed.
        </p>
        {error ? <div className="error">{error}</div> : null}
        <h3>Open a project</h3>
        <div className="project-list">
          {projects.map((p) => (
            <button
              key={p.slug}
              className="project"
              onClick={() => setSlug(p.slug)}
              data-testid={`open-${p.slug}`}
            >
              <b>{p.slug}</b>
              <span className="muted">
                {p.duration.toFixed(1)} s · {p.fps} fps · {p.segments} segments
                · {p.beats} timeline items
              </span>
            </button>
          ))}
          {!projects.length ? (
            <span className="muted">No projects yet.</span>
          ) : null}
        </div>
        <NewProject onCreated={(s) => setSlug(s)} />
      </div>
    );
  }

  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">Creative Director Studio</div>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="project-select"
        >
          {projects.map((p) => (
            <option key={p.slug}>{p.slug}</option>
          ))}
        </select>
        <span className="pill">
          {doc.source.durationInFrames} frames · {doc.source.fps} fps ·
          1080×1920
        </span>
        <span className="pill">original footage locked</span>
        {doc.source.previewSrc ? (
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
        <span className={`save save-${saveState}`} data-testid="save-state">
          {saveState === "saved"
            ? "saved to edit.json"
            : saveState === "saving"
              ? "saving…"
              : saveState === "dirty"
                ? "unsaved changes"
                : "save error"}
        </span>
        <div className="flow">
          {[
            "Select words",
            "Choose type",
            "Review A/B/C/D",
            "Approve",
            "Build",
            "Preview",
            "Export",
          ].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </header>
      <div className="banner-slot">
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
      <div className="main">
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
          <div className="player-wrap" data-testid="player">
            {!doc.source.previewSrc && !canPlayH264 ? (
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
                compositionWidth={1080}
                compositionHeight={1920}
                controls
                clickToPlay={false}
                acknowledgeRemotionLicense
                errorFallback={({ error: err }) => (
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
                )}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>
          <div className="timecode" data-testid="timecode">
            {fmtTime(frame / fps)} · frame {frame}
          </div>
        </section>
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
                {t === "creative" ? "A/B/C/D" : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
          <div className="tab-body">
            {tab === "creative" ? (
              <CreativePanel
                doc={doc}
                segment={segment}
                fromServer={fromServer}
                setDoc={setDoc}
                setError={setError}
                previewConcept={previewConcept}
                setPreviewConcept={(c) => {
                  setPreviewConcept(c);
                  if (c && segment)
                    seek(
                      segment.start +
                        Math.min(1, (segment.end - segment.start) / 2),
                    );
                }}
                extraRefs={extraRefs}
                onBuilt={(id) => {
                  setBeatId(id);
                  setPreviewConcept(null);
                }}
                seek={seek}
              />
            ) : null}
            {tab === "properties" ? (
              <PropertiesPanel
                doc={doc}
                beatId={beatId}
                setBeatId={setBeatId}
                setDoc={setDoc}
                seek={seek}
              />
            ) : null}
            {tab === "sound" ? (
              <SoundPanel
                doc={doc}
                setDoc={setDoc}
                sounds={sounds}
                segmentId={segmentId}
                seek={seek}
              />
            ) : null}
            {tab === "references" ? (
              <ReferencesPanel picked={extraRefs} setPicked={setExtraRefs} />
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
      </div>
      <section className="timeline-panel">
        <Timeline
          doc={doc}
          frame={frame}
          seek={seek}
          selection={selection}
          setSelection={setSelection}
          setDoc={setDoc}
          selectedBeat={beatId}
          onSelectBeat={(id) => {
            setBeatId(id);
            setTab("properties");
          }}
          onSelectSegment={(id) => {
            setSegmentId(id);
            setTab("creative");
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

const NewProject: React.FC<{ onCreated: (slug: string) => void }> = ({
  onCreated,
}) => {
  const [footage, setFootage] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
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
        onChange={(e) => setSlug(e.target.value)}
      />
      <button
        disabled={busy || !footage || !slug}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          try {
            await api.create(footage, slug);
            onCreated(slug);
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
  );
};
