import React, { useEffect, useRef, useState } from "react";
import type {
  CreativeSegment,
  EditConstants,
  EditDoc,
  SceneType,
  TranscriptSegment,
} from "../../src/kit/project";
import {
  DEFAULT_CONSTANTS,
  SCENE_TYPES,
  buildState,
  fmtTime,
  latestRequest,
  parseTime,
  sceneTypeOf,
  segTypeOf,
} from "../../src/kit/project";
import { retimeScene } from "../../src/kit/studio";
import { api } from "../api";

// Scene Planning: the whole edit as a document, sentence by sentence. A scene is the
// same CreativeSegment the Timeline Editor shows: times, type, words, plan, concepts,
// decision and built versions live in one record of edit.json.

type Props = {
  doc: EditDoc;
  setDoc: (d: EditDoc) => void;
  fromServer: (d: EditDoc) => void;
  /** Save now (no debounce) and then regenerate the scene's Quick Drafts. */
  saveAndDraft: (d: EditDoc, segId: string) => Promise<void>;
  setError: (e: string | null) => void;
  segmentId: string | null;
  focus: { id: string; n: number } | null;
  onSelectRow: (r: {
    segId: string | null;
    lineIds: string[];
    start: number;
    end: number;
  }) => void;
  onCreateScene: (lineIds: string[], sceneType: SceneType) => void;
  renderConcepts: (seg: CreativeSegment) => React.ReactNode;
};

const ED = "python3 .claude/skills/video-editing/scripts/edit_decisions.py";

const LayoutDiagram: React.FC<{ type: SceneType }> = ({ type }) => (
  <div
    className={`layout-diagram ld-${type}`}
    title="layout diagram (not a reference image)"
  >
    <i className="face" />
    {type === "captions" || type === "captions-ui" ? (
      <i className="cap" />
    ) : null}
    {type === "captions-ui" ? <i className="ui" /> : null}
    {type === "halfscreen" ? <i className="half" /> : null}
    {type === "fullscreen" ? <i className="full" /> : null}
  </div>
);

const TimeField: React.FC<{
  value: number;
  onCommit: (t: number) => void;
  testid: string;
}> = ({ value, onCommit, testid }) => {
  const [v, setV] = useState(fmtTime(value));
  useEffect(() => setV(fmtTime(value)), [value]);
  const commit = () => {
    const t = parseTime(v);
    if (t === null) return setV(fmtTime(value));
    if (Math.abs(t - value) > 1e-4) onCommit(t);
  };
  return (
    <input
      className="time"
      value={v}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) =>
        e.key === "Enter" && (e.target as HTMLInputElement).blur()
      }
      data-testid={testid}
    />
  );
};

const Constants: React.FC<{ doc: EditDoc; setDoc: (d: EditDoc) => void }> = ({
  doc,
  setDoc,
}) => {
  const c = { ...DEFAULT_CONSTANTS, ...(doc.constants ?? {}) };
  const set = (patch: Partial<EditConstants>) =>
    setDoc({ ...doc, constants: { ...c, ...patch } });
  return (
    <section className="constants" data-testid="constants">
      <h2>Constants for the Whole Edit</h2>
      <p className="muted small">
        Applies to every scene. Claude Code receives these with every concept
        and build request. Montserrat stays the only sans-serif.
      </p>
      <div className="const-grid">
        <label>
          Caption style
          <input
            value={c.captionStyle}
            onChange={(e) => set({ captionStyle: e.target.value })}
            data-testid="const-captionStyle"
          />
        </label>
        <label>
          Caption position
          <select
            value={c.captionPosition}
            onChange={(e) =>
              set({
                captionPosition: e.target
                  .value as EditConstants["captionPosition"],
              })
            }
            data-testid="const-captionPosition"
          >
            <option value="under-chin">under the chin (48–58%)</option>
            <option value="lower-third">lower third</option>
            <option value="center">centre</option>
          </select>
        </label>
        <label>
          Caption case
          <select
            value={c.captionCase}
            onChange={(e) =>
              set({
                captionCase: e.target.value as EditConstants["captionCase"],
              })
            }
          >
            <option value="as-spoken">as spoken</option>
            <option value="sentence">sentence case</option>
            <option value="upper">UPPER CASE</option>
          </select>
        </label>
        <label>
          Accent font
          <select
            value={c.accentFont}
            onChange={(e) =>
              set({ accentFont: e.target.value as EditConstants["accentFont"] })
            }
            data-testid="const-accentFont"
          >
            <option>Instrument Serif</option>
            <option>Playfair Display</option>
            <option>JetBrains Mono</option>
            <option value="none">none</option>
          </select>
        </label>
        <label>
          Accent colour
          <span className="row tight">
            <input
              type="color"
              value={c.accentColor}
              onChange={(e) => set({ accentColor: e.target.value })}
              data-testid="const-accentColor"
            />
            <code>{c.accentColor}</code>
          </span>
        </label>
        <label>
          Second colour
          <span className="row tight">
            <input
              type="color"
              value={c.secondaryColor}
              onChange={(e) => set({ secondaryColor: e.target.value })}
            />
            <code>{c.secondaryColor}</code>
          </span>
        </label>
        <label>
          Interface style
          <select
            value={c.uiStyle}
            onChange={(e) =>
              set({ uiStyle: e.target.value as EditConstants["uiStyle"] })
            }
          >
            <option value="dark-glass">dark glass</option>
            <option value="light-glass">light glass</option>
            <option value="neon-rim">neon rim</option>
            <option value="editorial">editorial print</option>
          </select>
        </label>
        <label>
          Sound effects
          <select
            value={c.soundDensity}
            onChange={(e) =>
              set({
                soundDensity: e.target.value as EditConstants["soundDensity"],
              })
            }
          >
            <option value="minimal">minimal</option>
            <option value="standard">standard</option>
            <option value="rich">rich</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={c.music}
            onChange={(e) => set({ music: e.target.checked })}
          />{" "}
          Music bed (−19 dB, under the voice)
        </label>
        <label className="wide">
          Transitions
          <input
            value={c.transitions}
            onChange={(e) => set({ transitions: e.target.value })}
          />
        </label>
        <label className="wide">
          Notes for every scene
          <textarea
            value={c.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Brand, words to avoid, things you always want…"
            data-testid="const-notes"
          />
        </label>
      </div>
    </section>
  );
};

export const ScenePlanning: React.FC<Props> = (p) => {
  const { doc } = p;
  const [open, setOpen] = useState<string | null>(null);
  const [quote, setQuote] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (!p.focus) return;
    rows.current[p.focus.id]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [p.focus]);

  const lines = doc.transcript.segments;
  const sceneOfLine = (l: TranscriptSegment) =>
    doc.segments.find((s) => s.transcriptIds.includes(l.id));
  // one row per scene (at its first line) and one per line that has no scene yet
  const items: (
    | { kind: "scene"; seg: CreativeSegment; lines: TranscriptSegment[] }
    | { kind: "line"; line: TranscriptSegment }
  )[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const seg = sceneOfLine(l);
    if (!seg) items.push({ kind: "line", line: l });
    else if (!seen.has(seg.id)) {
      seen.add(seg.id);
      items.push({
        kind: "scene",
        seg,
        lines: lines.filter((x) => seg.transcriptIds.includes(x.id)),
      });
    }
  }
  // scenes made from a timeline range that matches no line
  for (const s of doc.segments)
    if (!seen.has(s.id) && s.type !== "sound")
      items.push({ kind: "scene", seg: s, lines: [] });
  items.sort(
    (a, b) =>
      (a.kind === "scene" ? a.seg.start : (a.line.start ?? 0)) -
      (b.kind === "scene" ? b.seg.start : (b.line.start ?? 0)),
  );

  const updateScene = (
    segId: string,
    patch: Partial<CreativeSegment>,
    resetPlan = true,
  ) =>
    p.setDoc({
      ...doc,
      segments: doc.segments.map((s) =>
        s.id === segId
          ? {
              ...s,
              ...patch,
              ...(resetPlan && s.plan?.status === "approved"
                ? { plan: { status: "draft" as const } }
                : {}),
            }
          : s,
      ),
    });
  const changeType = (seg: CreativeSegment, t: SceneType) => {
    const next = {
      ...doc,
      segments: doc.segments.map((s) =>
        s.id === seg.id
          ? {
              ...s,
              sceneType: t,
              type: segTypeOf(t),
              ...(s.plan?.status === "approved"
                ? { plan: { status: "draft" as const } }
                : {}),
            }
          : s,
      ),
    };
    p.saveAndDraft(next, seg.id).catch((e) => p.setError(String(e.message)));
  };
  const approve = async (ids: string[], q: string) => {
    setBusy(true);
    p.setError(null);
    try {
      const r = await api.approvePlans(doc.slug, ids, q);
      p.fromServer(r.doc);
      setQuote("");
    } catch (e) {
      p.setError(String((e as Error).message));
    }
    setBusy(false);
  };

  const planned = doc.segments.filter(
    (s) => sceneTypeOf(s) && s.type !== "sound",
  );
  const toApprove = planned.filter(
    (s) =>
      s.plan?.status !== "approved" && !s.decision && (s.onScreen ?? "").trim(),
  );
  const missingPlan = planned.filter(
    (s) =>
      s.plan?.status !== "approved" &&
      !s.decision &&
      !(s.onScreen ?? "").trim(),
  );

  return (
    <div className="planning" data-testid="scene-planning">
      <Constants doc={doc} setDoc={p.setDoc} />
      <section className="plan-section">
        <h2>Transcript &amp; Scene Plan</h2>
        <div className="type-legend" data-testid="type-legend">
          {SCENE_TYPES.map((t) => (
            <div
              key={t.type}
              className="legend-item"
              data-testid={`legend-${t.type}`}
            >
              <div className="legend-head">
                <LayoutDiagram type={t.type} />
                <div>
                  <b>{t.label}</b>
                  <p className="muted small">{t.what}</p>
                </div>
              </div>
              <div className="legend-examples">
                {t.examples.map((id) => (
                  <figure key={id}>
                    <img
                      src={`/api/refimg/${id}`}
                      alt={id}
                      data-testid={`example-${t.type}-${id}`}
                    />
                    <figcaption>{id}</figcaption>
                  </figure>
                ))}
                {!t.examples.length ? (
                  <span className="muted small no-example">
                    {t.exampleNote}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
          <p className="muted small">
            Examples come from your reference library (style examples, not
            frames of this edit); the small diagrams show the layout only.
          </p>
        </div>

        <div className="plan-rows">
          {items.map((it) => {
            if (it.kind === "line") {
              const l = it.line;
              const ok = l.start !== null && l.end !== null && l.end > l.start;
              return (
                <div
                  key={l.id}
                  className="plan-row empty"
                  data-testid={`plan-row-${l.id}`}
                  onClick={() =>
                    ok &&
                    p.onSelectRow({
                      segId: null,
                      lineIds: [l.id],
                      start: l.start!,
                      end: l.end!,
                    })
                  }
                >
                  <div className="pr-time">
                    {fmtTime(l.start)}
                    <br />
                    {fmtTime(l.end)}
                  </div>
                  <div className="pr-text">
                    <p className="spoken">{l.text}</p>
                    {l.words?.length ? <Words words={l.words} /> : null}
                  </div>
                  <div className="pr-plan">
                    <select
                      value=""
                      disabled={!ok}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        e.target.value &&
                        p.onCreateScene([l.id], e.target.value as SceneType)
                      }
                      data-testid={`plan-type-${l.id}`}
                    >
                      <option value="">— choose a scene type —</option>
                      {SCENE_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {!ok ? (
                      <span className="flag small">
                        fix this line's times in the Timeline Editor script
                        first
                      </span>
                    ) : (
                      <span className="muted small">
                        no scene yet: the speaker stays as cut
                      </span>
                    )}
                  </div>
                </div>
              );
            }
            const seg = it.seg;
            const st = sceneTypeOf(seg);
            const meta = SCENE_TYPES.find((t) => t.type === st);
            const build = buildState(doc, seg);
            const creq = latestRequest(doc, seg.id, ["concepts"]);
            const spoken = it.lines.map((l) => l.text).join(" ");
            const selected = p.segmentId === seg.id;
            return (
              <div
                key={seg.id}
                ref={(el) => {
                  rows.current[seg.id] = el;
                }}
                className={`plan-row${selected ? " selected" : ""}${p.focus?.id === seg.id ? " focused" : ""}`}
                data-testid={`plan-row-${seg.id}`}
                onClick={() =>
                  p.onSelectRow({
                    segId: seg.id,
                    lineIds: seg.transcriptIds,
                    start: seg.start,
                    end: seg.end,
                  })
                }
              >
                <div className="pr-time">
                  <b className="scene-id">{seg.id}</b>
                  <TimeField
                    value={seg.start}
                    testid={`plan-start-${seg.id}`}
                    onCommit={(t) =>
                      p.setDoc(retimeScene(doc, seg.id, t, seg.end))
                    }
                  />
                  <TimeField
                    value={seg.end}
                    testid={`plan-end-${seg.id}`}
                    onCommit={(t) =>
                      p.setDoc(retimeScene(doc, seg.id, seg.start, t))
                    }
                  />
                </div>
                <div className="pr-text">
                  {spoken ? (
                    <p className="spoken" data-testid={`plan-spoken-${seg.id}`}>
                      {spoken}
                    </p>
                  ) : null}
                  <label
                    className="small muted"
                    onClick={(e) => e.stopPropagation()}
                  >
                    scene text
                    <input
                      value={seg.text}
                      onChange={(e) =>
                        updateScene(seg.id, { text: e.target.value })
                      }
                      data-testid={`plan-text-${seg.id}`}
                    />
                  </label>
                  {it.lines.some((l) => l.words?.length) ? (
                    <Words words={it.lines.flatMap((l) => l.words ?? [])} />
                  ) : null}
                </div>
                <div className="pr-plan" onClick={(e) => e.stopPropagation()}>
                  <div className="row tight">
                    {st ? <LayoutDiagram type={st} /> : null}
                    <select
                      value={st ?? ""}
                      onChange={(e) =>
                        changeType(seg, e.target.value as SceneType)
                      }
                      data-testid={`plan-type-${seg.id}`}
                    >
                      {SCENE_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {meta?.examples.slice(0, 1).map((id) => (
                      <img
                        key={id}
                        className="mini-example"
                        src={`/api/refimg/${id}`}
                        alt={id}
                        title={`example: ${id}`}
                      />
                    ))}
                  </div>
                  <textarea
                    placeholder="What happens on screen? (your words: Claude Code builds from this)"
                    value={seg.onScreen ?? ""}
                    onChange={(e) =>
                      updateScene(seg.id, { onScreen: e.target.value })
                    }
                    data-testid={`plan-onscreen-${seg.id}`}
                  />
                  <div className="row tight status-row">
                    <span
                      className={`pill${seg.plan?.status === "approved" ? " ok-pill" : ""}`}
                      data-testid={`plan-status-${seg.id}`}
                    >
                      {seg.plan?.status === "approved"
                        ? `plan approved${seg.plan.via === "choice" ? " (via your A/B/C/D choice)" : ""}`
                        : "plan draft"}
                    </span>
                    {seg.decision ? (
                      <span className="pill">choice {seg.decision.choice}</span>
                    ) : null}
                    <span
                      className={`pill bs-pill-${build.state}`}
                      data-testid={`plan-build-${seg.id}`}
                    >
                      {build.state === "none"
                        ? "not built"
                        : build.state === "built" || build.state === "partial"
                          ? `built v${build.version?.v}${build.state === "partial" ? " (partial)" : ""}`
                          : build.state === "failed"
                            ? "build failed"
                            : `waiting for Claude Code (${build.request?.id})`}
                    </span>
                    {creq &&
                    (creq.status === "pending" ||
                      creq.status === "in_progress") ? (
                      <span className="pill warn-pill">
                        ideas requested ({creq.id})
                      </span>
                    ) : null}
                  </div>
                  <div className="row tight">
                    <button
                      className="ghost small"
                      data-testid={`plan-ask-${seg.id}`}
                      onClick={() =>
                        api
                          .claudeRequest(
                            doc.slug,
                            seg.id,
                            Object.keys(seg.concepts).length
                              ? "three new concepts"
                              : undefined,
                          )
                          .then((r) => {
                            p.fromServer(r.doc);
                            setOpen(seg.id);
                          })
                          .catch((e) => p.setError(String(e.message)))
                      }
                    >
                      ✦ Ask Claude for Ideas
                    </button>
                    <button
                      className={`ghost small${open === seg.id ? " active" : ""}`}
                      onClick={() => setOpen(open === seg.id ? null : seg.id)}
                      data-testid={`plan-abcd-${seg.id}`}
                    >
                      A/B/C/D{" "}
                      {Object.keys(seg.concepts).length
                        ? `· ${Object.keys(seg.concepts).length} concepts`
                        : ""}
                    </button>
                    <button
                      className="small"
                      disabled={
                        busy ||
                        seg.plan?.status === "approved" ||
                        !!seg.decision ||
                        !(seg.onScreen ?? "").trim()
                      }
                      onClick={() =>
                        approve(
                          [seg.id],
                          "Approved this scene plan in Scene Planning",
                        )
                      }
                      data-testid={`plan-approve-${seg.id}`}
                      title={
                        seg.decision
                          ? "your A/B/C/D choice already approved this scene"
                          : ""
                      }
                    >
                      Approve plan
                    </button>
                  </div>
                  {open === seg.id ? (
                    <div className="inline-concepts">
                      {p.renderConcepts(seg)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!items.length ? (
            <p className="muted">
              Import your timestamped script (Timeline Editor → Script) to plan
              scenes.
            </p>
          ) : null}
        </div>
      </section>
      <section className="approve-box" data-testid="approve-plans">
        <h3>Approve the scene plans</h3>
        <p className="muted small">
          {toApprove.length
            ? `${toApprove.length} scene plan(s) ready: ${toApprove.map((s) => s.id).join(", ")}. Approving creates one build request per scene for Claude Code (Remotion); nothing else on the timeline changes.`
            : "No scene plans waiting for approval."}
          {missingPlan.length
            ? ` Still without a description of what happens on screen: ${missingPlan.map((s) => s.id).join(", ")}.`
            : ""}
        </p>
        <div className="row">
          <input
            placeholder="Your approval, in your words"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            data-testid="plans-quote"
          />
          <button
            className="primary"
            disabled={busy || !toApprove.length || !quote.trim()}
            onClick={() =>
              approve(
                toApprove.map((s) => s.id),
                quote,
              )
            }
            data-testid="approve-all-plans"
          >
            Approve {toApprove.length} scene plan(s)
          </button>
        </div>
        <p className="muted small">
          Building needs an active Claude Code session (no automatic Claude
          connection): in Claude Code run <code>{ED} pending</code>. The Studio
          updates by itself when a build lands.
        </p>
      </section>
    </div>
  );
};

const Words: React.FC<{
  words: { w: string; start: number; end: number }[];
}> = ({ words }) => (
  <div className="words" data-testid="word-timings">
    {words.map((w, i) => (
      <span key={i} title={`${fmtTime(w.start)}–${fmtTime(w.end)}`}>
        {w.w}
        <i>{w.start.toFixed(2)}</i>
      </span>
    ))}
  </div>
);
