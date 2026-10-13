import React, { useState } from "react";
import type { CreativeSegment, EditDoc, SegmentType } from "../../src/kit/project";
import { SEGMENT_TYPES, fmtTime } from "../../src/kit/project";
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

export const CreativePanel: React.FC<Props> = (p) => {
  const { doc, segment: seg } = p;
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [basedOn, setBasedOn] = useState<"" | "A" | "B" | "C">("");
  const [combine, setCombine] = useState<string[]>([]);
  const [quote, setQuote] = useState("");

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
  const openMajor = doc.segments.filter((s) => s.major && !s.decision);

  if (!seg) {
    return (
      <div className="creative empty">
        <h2>Creative options</h2>
        <p className="muted">Select spoken words in the script (or drag a range on the timeline), choose the animation type, then review A, B, C or describe D.</p>
        <SegmentsSummary doc={doc} />
        <DirectionApproval doc={doc} openMajor={openMajor.map((s) => s.id)} direction={direction} quote={quote} setQuote={setQuote} busy={busy} wrap={wrap} fromServer={p.fromServer} />
      </div>
    );
  }

  const changeType = (type: SegmentType) =>
    wrap("type", async () => {
      const next = { ...doc, segments: doc.segments.map((s) => (s.id === seg.id ? { ...s, type } : s)) };
      await api.save(next);
      const r = await api.drafts(doc.slug, seg.id);
      p.fromServer(r.doc);
    });

  const choose = (option: "A" | "B" | "C" | "D") =>
    wrap(`choose-${option}`, async () => {
      const r = await api.choose(doc.slug, {
        segmentId: seg.id,
        option,
        ...(option === "D" ? { custom, basedOn: basedOn || undefined, combine, refs: p.extraRefs } : {}),
      });
      p.fromServer(r.doc);
      const beat = r.doc.beats.find((b) => b.segmentId === seg.id);
      if (beat) {
        p.onBuilt(beat.id);
        p.seek(seg.start);
      }
      if (r.awaitingClaude) p.setError(`D recorded for ${seg.id}. Nothing is on the timeline yet: ask Claude to build your idea (or base it on A, B or C and edit it in Properties).`);
    });

  return (
    <div className="creative" data-testid="creative-panel">
      <div className="seg-head">
        <h2>
          {seg.id} <span className="muted small">round {seg.round}</span>
        </h2>
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
            <button key={t.type} className={`type-btn${seg.type === t.type ? " active" : ""}`} onClick={() => seg.type !== t.type && changeType(t.type)} disabled={!!busy}>
              {t.label}
            </button>
          ))}
        </div>
        {seg.decision ? (
          <div className="decision" data-testid="decision">
            Decision: <b>{seg.decision.choice}</b>
            {seg.decision.custom ? ` — ${seg.decision.custom}` : ""} · {seg.beatId ? "on the timeline" : seg.type === "sound" ? "sound placed on the SFX track" : "awaiting build"}
          </div>
        ) : null}
      </div>

      <div className="options">
        {(["A", "B", "C"] as const).map((k) => {
          const c = seg.concepts[k];
          if (!c) return <div key={k} className="option empty">{k} — no concept yet</div>;
          const buildable = !!c.kind && c.kind in kitTiming;
          const chosen = seg.decision?.choice === k;
          return (
            <div key={k} className={`option${chosen ? " chosen" : ""}${seg.recommend === k ? " recommended" : ""}`} data-testid={`option-${k}`}>
              <div className="opt-head">
                <span className="letter">{k}</span>
                <b>{c.title}</b>
                <span className={`author ${c.author}`}>{c.author === "claude" ? "Claude concept" : "draft from the library"}</span>
                {seg.recommend === k ? <span className="rec">recommended</span> : null}
              </div>
              <div className="opt-body">
                <div className="opt-preview">
                  {c.preview ? (
                    <img src={c.preview} alt={`${k} preview`} data-testid={`preview-${k}`} />
                  ) : buildable ? (
                    <button
                      className="ghost"
                      data-testid={`render-preview-${k}`}
                      disabled={!!busy}
                      onClick={() =>
                        wrap(`prev-${k}`, async () => {
                          const r = await api.conceptPreview(doc.slug, seg.id, k);
                          p.fromServer(r.doc);
                        })
                      }
                    >
                      {busy === `prev-${k}` ? "Rendering with Remotion…" : "Render preview"}
                    </button>
                  ) : (
                    <span className="muted small">{c.system === "D" ? "sound concept" : "component not built yet"}</span>
                  )}
                </div>
                <div className="opt-text">
                  <p>{c.description}</p>
                  {c.motion ? <p className="muted small">Motion: {c.motion}</p> : null}
                  {c.sound ? <p className="muted small">Sound: {c.sound}</p> : null}
                  {c.sfx ? <p className="muted small">Sounds: {c.sfx.map((s) => `${s.family} @ ${s.at}`).join(", ")}</p> : null}
                  <div className="refs">
                    {c.refs.map((r) => (
                      <img key={r} src={`/api/refimg/${r}`} title={r} alt={r} />
                    ))}
                    <span className="muted small">{c.refs.join(", ")}</span>
                  </div>
                  <div className="row">
                    {buildable ? (
                      <button
                        className={`ghost small${p.previewConcept?.segmentId === seg.id && p.previewConcept.option === k ? " active" : ""}`}
                        onClick={() => p.setPreviewConcept({ segmentId: seg.id, option: k })}
                        data-testid={`play-${k}`}
                      >
                        Preview in player
                      </button>
                    ) : null}
                    <button className="primary small" onClick={() => choose(k)} disabled={!!busy} data-testid={`choose-${k}`}>
                      {chosen ? "Chosen ✓" : `Choose ${k}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className={`option d${seg.decision?.choice === "D" ? " chosen" : ""}`} data-testid="option-D">
          <div className="opt-head">
            <span className="letter">D</span>
            <b>My own idea</b>
          </div>
          <textarea
            placeholder="Describe your animation, combine A–C, change typography, colours, camera, timing or transitions, or ask for something completely different."
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            data-testid="d-text"
          />
          <div className="row small">
            <label>
              start from
              <select value={basedOn} onChange={(e) => setBasedOn(e.target.value as never)} data-testid="d-based">
                <option value="">nothing (Claude builds it)</option>
                {(["A", "B", "C"] as const).filter((k) => seg.concepts[k]?.kind && seg.concepts[k]!.kind! in kitTiming).map((k) => (
                  <option key={k} value={k}>
                    {k}: {seg.concepts[k]!.title}
                  </option>
                ))}
              </select>
            </label>
            <span>combine</span>
            {(["A", "B", "C"] as const).map((k) => (
              <label key={k}>
                <input type="checkbox" checked={combine.includes(k)} onChange={(e) => setCombine(e.target.checked ? [...combine, k] : combine.filter((x) => x !== k))} /> {k}
              </label>
            ))}
          </div>
          {p.extraRefs.length ? <p className="muted small">New references from the browser: {p.extraRefs.join(", ")}</p> : <p className="muted small">Add new references in the References tab.</p>}
          <button className="primary small" disabled={!custom.trim() || !!busy} onClick={() => choose("D")} data-testid="choose-D">
            Record my idea (D)
          </button>
        </div>
      </div>

      <div className="regen row">
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
          ↻ New library drafts
        </button>
        <button
          className="ghost"
          disabled={!!busy}
          onClick={() =>
            wrap("request", async () => {
              const r = await api.request(doc.slug, seg.id, "three new concepts");
              p.fromServer(r.doc);
              p.setError(`Request saved in edit.json. Ask Claude in the chat: "three new concepts for ${seg.id}".`);
            })
          }
        >
          Ask Claude for three new concepts
        </button>
      </div>
      <DirectionApproval doc={doc} openMajor={openMajor.map((s) => s.id)} direction={direction} quote={quote} setQuote={setQuote} busy={busy} wrap={wrap} fromServer={p.fromServer} />
    </div>
  );
};

const SegmentsSummary: React.FC<{ doc: EditDoc }> = ({ doc }) => (
  <table className="summary">
    <tbody>
      {doc.segments.map((s) => (
        <tr key={s.id}>
          <td>{s.id}</td>
          <td>
            {fmtTime(s.start)}–{fmtTime(s.end)}
          </td>
          <td>{s.type}</td>
          <td>“{s.text.slice(0, 40)}”</td>
          <td>{s.decision ? s.decision.choice : "open"}</td>
        </tr>
      ))}
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
  wrap: (l: string, f: () => Promise<void>) => Promise<void>;
  fromServer: (d: EditDoc) => void;
}> = ({ doc, openMajor, direction, quote, setQuote, busy, wrap, fromServer }) => (
  <div className="approve-box">
    <h3>Creative direction</h3>
    {direction ? (
      <p className="ok" data-testid="direction-approved">Approved: “{doc.approvals.find((a) => a.gate === "direction")?.quote}”</p>
    ) : (
      <>
        <p className="muted small">{openMajor.length ? `Still open: ${openMajor.join(", ")}` : "All major segments are decided."}</p>
        <input placeholder="Your approval, in your words" value={quote} onChange={(e) => setQuote(e.target.value)} data-testid="direction-quote" />
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
