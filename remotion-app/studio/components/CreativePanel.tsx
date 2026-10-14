import React, { useEffect, useState } from "react";
import type {
  ClaudeRequest,
  Concept,
  ConceptOption,
  CreativeSegment,
  EditDoc,
  SegmentType,
} from "../../src/kit/project";
import {
  SEGMENT_TYPES,
  buildState,
  fmtTime,
  isDecided,
  latestRequest,
} from "../../src/kit/project";
import type { StudioEditProps } from "../../src/kit/StudioEdit";
import { kitTiming } from "../../src/kit/timing";
import { api } from "../api";

type Props = {
  doc: EditDoc;
  segment: CreativeSegment | null;
  fromServer: (d: EditDoc) => void;
  setDoc: (d: EditDoc) => void;
  setError: (e: string | null) => void;
  previewConcept: StudioEditProps["concept"];
  setPreviewConcept: (c: StudioEditProps["concept"]) => void;
  extraRefs: string[];
  onBuilt: (beatId: string) => void;
  seek: (t: number) => void;
};

const OPTS: ConceptOption[] = ["A", "B", "C"];
const CAT_LABEL = Object.fromEntries(
  SEGMENT_TYPES.map((t) => [t.type, t.label]),
) as Record<SegmentType, string>;
const ED = "python3 .claude/skills/video-editing/scripts/edit_decisions.py";
const STATUS_TEXT: Record<string, string> = {
  pending: "waiting for Claude Code",
  in_progress: "Claude Code is working on it",
  completed: "completed",
  partial: "completed with open items",
  failed: "failed",
  cancelled: "cancelled",
};

const ClaudeNote: React.FC<{ slug: string; req: ClaudeRequest }> = ({
  slug,
  req,
}) => (
  <p className="muted small claude-note">
    Processing needs an active Claude Code session: there is no automatic Claude
    connection. In Claude Code, ask Claude to process the Studio requests, or
    run{" "}
    <code>
      {ED} show {slug} --request {req.id}
    </code>
    . This panel updates by itself when Claude Code writes the result to
    edit.json.
  </p>
);

export const CreativePanel: React.FC<Props> = (p) => {
  const { doc, segment: seg } = p;
  const [busy, setBusy] = useState<string | null>(null);
  const [set, setSet] = useState<"claude" | "draft">("claude");
  const [custom, setCustom] = useState("");
  const [basedOn, setBasedOn] = useState<"" | ConceptOption>("");
  const [combine, setCombine] = useState<string[]>([]);
  const [uploads, setUploads] = useState<{ path: string; url: string }[]>([]);
  const [feedback, setFeedback] = useState("");
  const [quote, setQuote] = useState("");
  // each segment opens on Claude Concepts, with an empty D
  useEffect(() => {
    setSet("claude");
    setCustom("");
    setBasedOn("");
    setCombine([]);
    setUploads([]);
    setFeedback("");
  }, [seg?.id]);

  const wrap = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    p.setError(null);
    try {
      await fn();
    } catch (e) {
      p.setError(String((e as Error).message));
    }
    setBusy(null);
  };

  const direction = doc.approvals.some((a) => a.gate === "direction");
  const openMajor = doc.segments.filter((s) => s.major && !isDecided(s));

  if (!seg) {
    return (
      <div className="creative empty">
        <h2>Creative options</h2>
        <p className="muted">
          Select spoken words in the script (or drag a range on the timeline),
          choose Text Animation, On-Screen Visual or Full-Screen Animation, then
          generate three concepts with Claude (or use instant Quick Drafts) and
          choose A, B, C or D.
        </p>
        <SegmentsSummary doc={doc} />
        <DirectionApproval
          doc={doc}
          openMajor={openMajor.map((s) => s.id)}
          direction={direction}
          quote={quote}
          setQuote={setQuote}
          busy={busy}
          wrap={wrap}
          fromServer={p.fromServer}
        />
      </div>
    );
  }

  const visual = seg.type !== "sound";
  const conceptReq = latestRequest(doc, seg.id, ["concepts"]);
  const build = buildState(doc, seg);
  const hasClaude = OPTS.some((k) => seg.concepts[k]);

  const changeType = (type: SegmentType) =>
    wrap("type", async () => {
      const next = {
        ...doc,
        segments: doc.segments.map((s) =>
          // keep Scene Planning's scene type in step (one record)
          s.id === seg.id
            ? {
                ...s,
                type,
                sceneType:
                  type === "text"
                    ? ("captions" as const)
                    : type === "onscreen"
                      ? s.sceneType === "halfscreen"
                        ? ("halfscreen" as const)
                        : ("captions-ui" as const)
                      : type === "fullscreen"
                        ? ("fullscreen" as const)
                        : undefined,
              }
            : s,
        ),
      };
      await api.save(next);
      const r = await api.drafts(doc.slug, seg.id);
      p.fromServer(r.doc);
    });

  const generate = (label: string) =>
    wrap(label, async () => {
      const r = await api.claudeRequest(
        doc.slug,
        seg.id,
        hasClaude ? "three new concepts" : undefined,
      );
      p.fromServer(r.doc);
      setSet("claude");
    });

  const choose = (option: ConceptOption | "D", from: "claude" | "draft") =>
    wrap(`choose-${from}-${option}`, async () => {
      const r = await api.choose(doc.slug, {
        segmentId: seg.id,
        option,
        set: from,
        ...(option === "D"
          ? {
              custom,
              basedOn: basedOn || undefined,
              combine,
              refs: p.extraRefs,
              uploads: uploads.map((u) => u.path),
            }
          : {}),
      });
      p.fromServer(r.doc);
      const beat = r.doc.beats.find((b) => b.segmentId === seg.id);
      if (r.built && beat) {
        p.onBuilt(beat.id);
        p.seek(seg.start);
      }
    });

  return (
    <div className="creative" data-testid="creative-panel">
      <div className="seg-head">
        <h2>{seg.id}</h2>
        <blockquote data-testid="seg-text">“{seg.text}”</blockquote>
        <div className="seg-meta">
          <span>
            start <b data-testid="seg-start">{fmtTime(seg.start)}</b>
          </span>
          <span>
            end <b data-testid="seg-end">{fmtTime(seg.end)}</b>
          </span>
          <span>{(seg.end - seg.start).toFixed(2)} s</span>
          <button className="ghost small" onClick={() => p.seek(seg.start)}>
            ▶ jump
          </button>
        </div>
        <div className="type-row">
          {SEGMENT_TYPES.map((t) => (
            <button
              key={t.type}
              className={`type-btn${seg.type === t.type ? " active" : ""}`}
              onClick={() => seg.type !== t.type && changeType(t.type)}
              disabled={!!busy}
            >
              {t.label}
            </button>
          ))}
        </div>
        {seg.decision ? (
          <div className="decision" data-testid="decision">
            Decision: <b>{seg.decision.choice}</b> (
            {seg.decision.source === "draft"
              ? "Quick Draft"
              : seg.decision.source === "own"
                ? "my own idea"
                : "Claude Concept"}
            )
            {seg.decision.custom ? (
              <span className="custom-echo"> — {seg.decision.custom}</span>
            ) : (
              ""
            )}
          </div>
        ) : null}
      </div>

      {visual ? (
        <BuildPanel
          doc={doc}
          seg={seg}
          build={build}
          busy={busy}
          wrap={wrap}
          fromServer={p.fromServer}
          feedback={feedback}
          setFeedback={setFeedback}
          generate={generate}
          seek={p.seek}
        />
      ) : null}

      <nav className="set-tabs">
        <button
          className={set === "claude" ? "active" : ""}
          onClick={() => setSet("claude")}
          data-testid="set-claude"
        >
          Claude Concepts {hasClaude ? `· round ${seg.round}` : ""}
        </button>
        <button
          className={set === "draft" ? "active" : ""}
          onClick={() => setSet("draft")}
          data-testid="set-draft"
        >
          Quick Drafts (templates)
        </button>
      </nav>

      {set === "claude" ? (
        <div className="claude-set">
          {!visual ? (
            <p className="muted small">
              Claude Concepts are for Text Animation, On-Screen Visual and
              Full-Screen Animation. Use Quick Drafts or the Sound tab for
              sound.
            </p>
          ) : (
            <ConceptRequestStatus
              slug={doc.slug}
              req={conceptReq}
              hasClaude={hasClaude}
              busy={busy}
              generate={generate}
              wrap={wrap}
              fromServer={p.fromServer}
            />
          )}
          <div className="options">
            {OPTS.map((k) => {
              const c = seg.concepts[k];
              if (!c) return null;
              return (
                <ClaudeCard
                  key={k}
                  k={k}
                  c={c}
                  seg={seg}
                  chosen={
                    seg.decision?.choice === k &&
                    seg.decision.source === "claude"
                  }
                  busy={busy}
                  onChoose={() => choose(k, "claude")}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="options draft-set">
          <p className="muted small">
            Quick Drafts are instant variants of existing templates, not Claude
            Concepts. Choosing one puts the template on the timeline right away.
          </p>
          {OPTS.map((k) => {
            const c = seg.drafts?.[k];
            if (!c)
              return (
                <div key={k} className="option empty">
                  {k} — no quick draft
                </div>
              );
            return (
              <DraftCard
                key={k}
                k={k}
                c={c}
                seg={seg}
                chosen={
                  seg.decision?.choice === k && seg.decision.source === "draft"
                }
                busy={busy}
                previewing={
                  p.previewConcept?.segmentId === seg.id &&
                  p.previewConcept.option === k &&
                  p.previewConcept.set === "draft"
                }
                onPreview={() =>
                  p.setPreviewConcept({
                    segmentId: seg.id,
                    option: k,
                    set: "draft",
                  })
                }
                onRender={() =>
                  wrap(`prev-${k}`, async () => {
                    const r = await api.conceptPreview(
                      doc.slug,
                      seg.id,
                      k,
                      "draft",
                    );
                    p.fromServer(r.doc);
                  })
                }
                onChoose={() => choose(k, "draft")}
              />
            );
          })}
          <button
            className="ghost"
            disabled={!!busy}
            data-testid="new-drafts"
            onClick={() =>
              wrap("drafts", async () => {
                const r = await api.drafts(doc.slug, seg.id);
                p.fromServer(r.doc);
              })
            }
          >
            ↻ New quick drafts
          </button>
        </div>
      )}

      {visual ? (
        <div
          className={`option d${seg.decision?.choice === "D" ? " chosen" : ""}`}
          data-testid="option-D"
        >
          <div className="opt-head">
            <span className="letter">D</span>
            <b>My own idea</b>
          </div>
          <p className="muted small">
            Describe your animation: combine A, B and C, change a suggestion,
            typography, movement, colours, transitions, sound effects. Your text
            is saved exactly as you write it and Claude Code implements all of
            it (anything it cannot do is listed, not skipped).
          </p>
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            data-testid="d-text"
            placeholder="e.g. Take B's card, but make it red, slide it in from the right, and add a soft glitch when it leaves."
          />
          {hasClaude ? (
            <div className="row small">
              <label>
                based on
                <select
                  value={basedOn}
                  onChange={(e) => setBasedOn(e.target.value as never)}
                  data-testid="d-based"
                >
                  <option value="">—</option>
                  {OPTS.filter((k) => seg.concepts[k]).map((k) => (
                    <option key={k} value={k}>
                      {k}: {seg.concepts[k]!.title}
                    </option>
                  ))}
                </select>
              </label>
              <span>combine</span>
              {OPTS.filter((k) => seg.concepts[k]).map((k) => (
                <label key={k}>
                  <input
                    type="checkbox"
                    checked={combine.includes(k)}
                    onChange={(e) =>
                      setCombine(
                        e.target.checked
                          ? [...combine, k]
                          : combine.filter((x) => x !== k),
                      )
                    }
                    data-testid={`d-combine-${k}`}
                  />{" "}
                  {k}
                </label>
              ))}
            </div>
          ) : null}
          <div className="row small">
            <span className="muted">
              Library references:{" "}
              {p.extraRefs.length
                ? p.extraRefs.join(", ")
                : "add them in the References tab"}
            </span>
          </div>
          <div className="row small">
            <label className="file">
              Add reference images
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                data-testid="d-upload"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  wrap("upload", async () => {
                    for (const f of files) {
                      const data = await new Promise<string>((ok) => {
                        const fr = new FileReader();
                        fr.onload = () =>
                          ok(String(fr.result).split(",")[1] ?? "");
                        fr.readAsDataURL(f);
                      });
                      const r = await api.upload(doc.slug, f.name, data);
                      setUploads((u) => [...u, r]);
                    }
                  });
                }}
              />
            </label>
            {uploads.map((u) => (
              <img
                key={u.path}
                src={u.url}
                className="upload-thumb"
                alt="your reference"
                title={u.path}
              />
            ))}
          </div>
          <button
            className="primary small"
            disabled={!custom.trim() || !!busy}
            onClick={() => choose("D", "claude")}
            data-testid="choose-D"
          >
            Save my idea (D) for Claude Code
          </button>
        </div>
      ) : null}

      <DirectionApproval
        doc={doc}
        openMajor={openMajor.map((s) => s.id)}
        direction={direction}
        quote={quote}
        setQuote={setQuote}
        busy={busy}
        wrap={wrap}
        fromServer={p.fromServer}
      />
    </div>
  );
};

type Wrap = (l: string, f: () => Promise<void>) => Promise<void>;

const ConceptRequestStatus: React.FC<{
  slug: string;
  req: ClaudeRequest | null;
  hasClaude: boolean;
  busy: string | null;
  generate: (l: string) => void;
  wrap: Wrap;
  fromServer: (d: EditDoc) => void;
}> = ({ slug, req, hasClaude, busy, generate, wrap, fromServer }) => {
  const open =
    req && (req.status === "pending" || req.status === "in_progress");
  return (
    <div
      className={`request-status${req ? ` st-${req.status}` : ""}`}
      data-testid="concept-request"
    >
      {req ? (
        <div className="row">
          <b data-testid="concept-request-status">
            {req.id} · {STATUS_TEXT[req.status]}
          </b>
          <span className="muted small">
            {req.type === "concepts" ? "three Claude Concepts" : req.type} ·
            requested {req.created.replace("T", " ")}
          </span>
        </div>
      ) : (
        <p className="muted small">No Claude Concepts yet for these words.</p>
      )}
      {req?.status === "failed" ? (
        <p className="error small">{req.error}</p>
      ) : null}
      {req?.result && !open ? (
        <p className="muted small">{req.result}</p>
      ) : null}
      {open ? <ClaudeNote slug={slug} req={req} /> : null}
      <div className="row">
        {!open ? (
          <button
            className="primary"
            disabled={!!busy}
            onClick={() => generate("generate")}
            data-testid="generate-claude"
          >
            {hasClaude
              ? "↻ Regenerate concepts with Claude"
              : "✦ Generate with Claude"}
          </button>
        ) : (
          <button
            className="ghost small"
            disabled={!!busy}
            onClick={() =>
              wrap("cancel", async () => {
                const r = await api.cancelRequest(slug, req.id);
                fromServer(r.doc);
              })
            }
          >
            Cancel request
          </button>
        )}
      </div>
    </div>
  );
};

const StyleReference: React.FC<{ k: string; c: Concept }> = ({ k, c }) =>
  c.styleRef ? (
    <figure className="style-ref" data-testid={`style-ref-${k}`}>
      <img
        src={`/api/refimg/${c.styleRef}`}
        alt={`style reference ${c.styleRef}`}
        data-testid={`style-img-${k}`}
      />
      <figcaption>
        <b>STYLE REFERENCE</b> ·{" "}
        <span data-testid={`ref-id-${k}`}>{c.styleRef}</span>
        <br />
        <span className="muted">
          from your library: the look, not a frame of this animation
        </span>
      </figcaption>
    </figure>
  ) : (
    <div className="style-ref none" data-testid={`no-ref-${k}`}>
      <b>No matching reference</b>
      <span className="muted small">
        {c.noReference ?? "Nothing in the library fits this idea."}
      </span>
    </div>
  );

const ClaudeCard: React.FC<{
  k: ConceptOption;
  c: Concept;
  seg: CreativeSegment;
  chosen: boolean;
  busy: string | null;
  onChoose: () => void;
}> = ({ k, c, seg, chosen, busy, onChoose }) => (
  <div
    className={`option claude${chosen ? " chosen" : ""}${seg.recommend === k ? " recommended" : ""}`}
    data-testid={`option-${k}`}
  >
    <div className="opt-head">
      <span className="letter">{k}</span>
      <b data-testid={`title-${k}`}>{c.title}</b>
      <span className="author claude">
        Claude Concept {OPTS.indexOf(k) + 1}
      </span>
      {seg.recommend === k ? <span className="rec">recommended</span> : null}
    </div>
    <div className="opt-body">
      <StyleReference k={k} c={c} />
      <div className="opt-text">
        <p data-testid={`desc-${k}`}>{c.description}</p>
        <dl className="facts">
          <dt>Words</dt>
          <dd>“{seg.text}”</dd>
          <dt>Time</dt>
          <dd>
            {fmtTime(seg.start)}–{fmtTime(seg.end)}
          </dd>
          <dt>Category</dt>
          <dd>{CAT_LABEL[c.category ?? seg.type]}</dd>
          <dt>Enters</dt>
          <dd data-testid={`enter-${k}`}>{c.enter}</dd>
          <dt>Moves</dt>
          <dd>{c.move}</dd>
          <dt>Exits</dt>
          <dd>{c.exit}</dd>
          {c.sound ? (
            <>
              <dt>Sound</dt>
              <dd>{c.sound}</dd>
            </>
          ) : null}
        </dl>
        {c.refs.length > 1 ? (
          <p className="muted small">
            Also from: {c.refs.filter((r) => r !== c.styleRef).join(", ")}
          </p>
        ) : null}
        <button
          className="primary small"
          onClick={onChoose}
          disabled={!!busy}
          data-testid={`choose-${k}`}
        >
          {chosen ? "Chosen ✓" : `Choose ${k}`}
        </button>
      </div>
    </div>
  </div>
);

const DraftCard: React.FC<{
  k: ConceptOption;
  c: Concept;
  seg: CreativeSegment;
  chosen: boolean;
  busy: string | null;
  previewing: boolean;
  onPreview: () => void;
  onRender: () => void;
  onChoose: () => void;
}> = ({ k, c, chosen, busy, previewing, onPreview, onRender, onChoose }) => {
  const buildable = !!c.kind && c.kind in kitTiming;
  return (
    <div
      className={`option draft${chosen ? " chosen" : ""}`}
      data-testid={`draft-${k}`}
    >
      <div className="opt-head">
        <span className="letter">{k}</span>
        <b>{c.title}</b>
        <span className="author draft">Quick Draft · template</span>
      </div>
      <div className="opt-body">
        <div className="opt-preview">
          {c.preview ? (
            <img
              src={c.preview}
              alt={`${k} preview`}
              data-testid={`draft-preview-${k}`}
            />
          ) : buildable ? (
            <button
              className="ghost"
              data-testid={`draft-render-${k}`}
              disabled={!!busy}
              onClick={onRender}
            >
              {busy === `prev-${k}`
                ? "Rendering with Remotion…"
                : "Render preview"}
            </button>
          ) : (
            <span className="muted small">
              {c.system === "D" ? "sound draft" : "no template"}
            </span>
          )}
        </div>
        <div className="opt-text">
          <p>{c.description}</p>
          {c.refs.length ? (
            <p className="muted small">Template based on {c.refs.join(", ")}</p>
          ) : null}
          <div className="row">
            {buildable ? (
              <button
                className={`ghost small${previewing ? " active" : ""}`}
                onClick={onPreview}
                data-testid={`draft-play-${k}`}
              >
                Preview in player
              </button>
            ) : null}
            <button
              className="primary small"
              onClick={onChoose}
              disabled={!!busy}
              data-testid={`draft-choose-${k}`}
            >
              {chosen ? "On the timeline ✓" : `Use draft ${k}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BuildPanel: React.FC<{
  doc: EditDoc;
  seg: CreativeSegment;
  build: ReturnType<typeof buildState>;
  busy: string | null;
  wrap: Wrap;
  fromServer: (d: EditDoc) => void;
  feedback: string;
  setFeedback: (s: string) => void;
  generate: (l: string) => void;
  seek: (t: number) => void;
}> = ({
  doc,
  seg,
  build,
  busy,
  wrap,
  fromServer,
  feedback,
  setFeedback,
  generate,
  seek,
}) => {
  if (!seg.decision || seg.decision.choice === "none") return null;
  const { state, request: req, version: ver } = build;
  const versions = seg.versions ?? [];
  return (
    <div className={`build-panel bs-${state}`} data-testid="build-panel">
      <h3>
        Animation on the timeline ·{" "}
        <span data-testid="build-state">
          {state === "none"
            ? "not built"
            : state === "built"
              ? `built v${ver?.v}`
              : state === "partial"
                ? `built v${ver?.v} — PARTIAL`
                : STATUS_TEXT[state]}
        </span>
      </h3>
      {req && (state === "pending" || state === "in_progress") ? (
        <>
          <p className="small">
            <b data-testid="build-request">{req.id}</b> (
            {req.type === "revision" ? "revision" : "implementation"}) is{" "}
            {STATUS_TEXT[req.status]}. Nothing new is on the timeline yet
            {ver ? `; v${ver.v} stays there until it is replaced` : ""}.
          </p>
          {req.brief.custom !== undefined ? (
            <pre className="verbatim" data-testid="d-saved">
              {req.brief.custom}
            </pre>
          ) : null}
          {req.brief.feedback !== undefined ? (
            <pre className="verbatim">{req.brief.feedback}</pre>
          ) : null}
          <ClaudeNote slug={doc.slug} req={req} />
        </>
      ) : null}
      {state === "failed" && req ? (
        <p className="error small">
          {req.id} failed: {req.error}
        </p>
      ) : null}
      {ver ? (
        <div className="version" data-testid="version">
          <div className="version-media">
            {ver.still ? (
              <img
                src={ver.still}
                alt={`v${ver.v} rendered`}
                data-testid="version-still"
                onClick={() => seek(ver.beat.at)}
              />
            ) : null}
            {ver.clip ? (
              <>
                <video
                  src={ver.clip}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="version-video"
                />
                <a
                  href={ver.clip}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="version-clip"
                >
                  ▶ open the rendered clip (Remotion, ½ resolution)
                </a>
              </>
            ) : null}
            {!ver.still ? (
              <button
                className="ghost small"
                disabled={!!busy}
                onClick={() =>
                  wrap("render-version", async () => {
                    const r = await api.renderVersion(doc.slug, seg.id);
                    fromServer(r.doc);
                  })
                }
              >
                Render a still with Remotion
              </button>
            ) : null}
          </div>
          <div className="version-text">
            <p className="small">
              v{ver.v} · {ver.beat.kind} · from{" "}
              {ver.source === "draft"
                ? "a Quick Draft template"
                : ver.source === "own"
                  ? "your own idea (D)"
                  : ver.source === "revision"
                    ? "a revision"
                    : "a Claude Concept"}
              {ver.requestId ? ` (${ver.requestId})` : ""} ·{" "}
              {ver.at.replace("T", " ")}
            </p>
            {ver.notes ? <p className="muted small">{ver.notes}</p> : null}
            {ver.coverage?.length ? (
              <ul className="coverage" data-testid="coverage">
                {ver.coverage.map((c, i) => (
                  <li key={i} className={c.done ? "done" : "not-done"}>
                    {c.done ? "✓" : "✗"} {c.item}
                    {c.done
                      ? c.how
                        ? ` — ${c.how}`
                        : ""
                      : ` — not done: ${c.why}`}
                  </li>
                ))}
              </ul>
            ) : null}
            {seg.review?.status === "approved" &&
            seg.review.version === ver.v ? (
              <p className="ok small" data-testid="review-approved">
                Approved ({seg.review.at.replace("T", " ")})
              </p>
            ) : null}
            {seg.review?.status === "changes-requested" ? (
              <p className="small">Changes requested: “{seg.review.note}”</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {ver && state !== "pending" && state !== "in_progress" ? (
        <div className="review">
          <div className="row">
            <button
              className="primary small"
              disabled={
                !!busy ||
                (seg.review?.status === "approved" &&
                  seg.review.version === ver.v)
              }
              data-testid="review-approve"
              onClick={() =>
                wrap("approve-anim", async () => {
                  const r = await api.review(doc.slug, seg.id, "approve");
                  fromServer(r.doc);
                })
              }
            >
              Approve
            </button>
            <button
              className="ghost small"
              disabled={!!busy}
              onClick={() => generate("regen")}
              data-testid="regen-concepts"
            >
              Regenerate concepts
            </button>
          </div>
          <textarea
            placeholder="What should change? (saved exactly as written, as a revision request for Claude Code)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            data-testid="changes-text"
          />
          <button
            className="small"
            disabled={!feedback.trim() || !!busy}
            data-testid="request-changes"
            onClick={() =>
              wrap("changes", async () => {
                const r = await api.review(
                  doc.slug,
                  seg.id,
                  "changes",
                  feedback,
                );
                fromServer(r.doc);
                setFeedback("");
              })
            }
          >
            Request changes
          </button>
        </div>
      ) : null}
      {versions.length > 1 ? (
        <div className="versions" data-testid="versions">
          <span className="muted small">Versions:</span>
          {versions.map((v) => (
            <button
              key={v.v}
              className={`ghost small${v.v === seg.activeVersion ? " active" : ""}`}
              disabled={!!busy || v.v === seg.activeVersion}
              data-testid={`restore-v${v.v}`}
              onClick={() =>
                wrap("restore", async () => {
                  const r = await api.restore(doc.slug, seg.id, v.v);
                  fromServer(r.doc);
                })
              }
            >
              v{v.v}
              {v.status === "partial" ? " (partial)" : ""}
              {v.v === seg.activeVersion ? " · active" : " · restore"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const SegmentsSummary: React.FC<{ doc: EditDoc }> = ({ doc }) => (
  <table className="summary">
    <tbody>
      {doc.segments.map((s) => {
        const b = buildState(doc, s);
        return (
          <tr key={s.id}>
            <td>{s.id}</td>
            <td>
              {fmtTime(s.start)}–{fmtTime(s.end)}
            </td>
            <td>{s.type}</td>
            <td>“{s.text.slice(0, 40)}”</td>
            <td>{s.decision ? s.decision.choice : "open"}</td>
            <td>
              {b.state === "none"
                ? ""
                : b.state === "built" || b.state === "partial"
                  ? `v${b.version?.v} ${b.state}`
                  : STATUS_TEXT[b.state]}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const DirectionApproval: React.FC<{
  doc: EditDoc;
  openMajor: string[];
  direction: boolean;
  quote: string;
  setQuote: (s: string) => void;
  busy: string | null;
  wrap: Wrap;
  fromServer: (d: EditDoc) => void;
}> = ({
  doc,
  openMajor,
  direction,
  quote,
  setQuote,
  busy,
  wrap,
  fromServer,
}) => (
  <div className="approve-box">
    <h3>Creative direction</h3>
    {direction ? (
      <p className="ok" data-testid="direction-approved">
        Approved: “{doc.approvals.find((a) => a.gate === "direction")?.quote}”
      </p>
    ) : (
      <>
        <p className="muted small">
          {openMajor.length
            ? `Still open: ${openMajor.join(", ")}`
            : "All major segments are decided."}
        </p>
        <input
          placeholder="Your approval, in your words"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          data-testid="direction-quote"
        />
        <button
          className="primary"
          disabled={!quote.trim() || openMajor.length > 0 || !!busy}
          data-testid="approve-direction"
          onClick={() =>
            wrap("approve", async () => {
              const r = await api.approve(doc.slug, "direction", quote);
              fromServer(r.doc);
              setQuote("");
            })
          }
        >
          Approve the creative direction
        </button>
      </>
    )}
  </div>
);
