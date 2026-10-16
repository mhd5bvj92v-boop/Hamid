import React, { useEffect, useState } from "react";
import type { EditDoc } from "../../src/kit/project";
import { api, Job } from "../api";
import { QUALITY, Quality } from "../../src/kit/quality";

/** Approvals (Creative Director gates), preview renders and the final export, all from edit.json. */
export const ExportPanel: React.FC<{ doc: EditDoc; fromServer: (d: EditDoc) => void; setError: (e: string | null) => void }> = ({ doc, fromServer, setError }) => {
  const [quote, setQuote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [quality, setQuality] = useState<Quality>("review");
  const [times, setTimes] = useState<{ quality: string; seconds: number; frames: number }[]>([]);
  useEffect(() => {
    api.renderTimes(doc.slug).then((r) => setTimes(r.times)).catch(() => setTimes([]));
  }, [doc.slug, job?.status]);
  const lastTime = (q: Quality) => [...times].reverse().find((t) => t.quality === q);
  const has = (g: string) => doc.approvals.some((a) => a.gate === g);
  useEffect(() => {
    if (!job || job.status !== "running") return;
    const t = setInterval(async () => setJob(await api.job(job.id)), 800);
    return () => clearInterval(t);
  }, [job]);
  const approve = async (gate: string) => {
    try {
      const r = await api.approve(doc.slug, gate, quote);
      fromServer(r.doc);
      setQuote("");
    } catch (e) {
      setError(String((e as Error).message));
    }
  };
  const waiting = (doc.requests ?? []).filter((r) => (r.type === "implement" || r.type === "revision") && (r.status === "pending" || r.status === "in_progress"));
  const start = async (type: "preview" | "final") => {
    try {
      const r = await api.render(doc.slug, type, undefined, type === "preview" ? quality : undefined);
      setJob({ id: r.job, status: "running", progress: 0, log: [], outputs: {} });
    } catch (e) {
      setError(String((e as Error).message));
    }
  };
  return (
    <div className="export" data-testid="export-panel">
      <h2>Preview, approve, export</h2>
      <ol className="gates">
        {(["direction", "preview", "final"] as const).map((g) => {
          const a = doc.approvals.find((x) => x.gate === g);
          return (
            <li key={g} className={a ? "ok" : ""} data-testid={`gate-${g}`}>
              <b>{g}</b> {a ? `approved ${a.at}: “${a.quote}”` : "open"}
            </li>
          );
        })}
      </ol>
      <div className="row">
        <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)} data-testid="preview-quality" title={QUALITY[quality].note}>
          {(Object.keys(QUALITY) as Quality[]).map((q) => {
            const t = lastTime(q);
            return (
              <option key={q} value={q}>
                {QUALITY[q].label}
                {t ? ` · last ${t.seconds}s for ${t.frames} frames` : ""}
              </option>
            );
          })}
        </select>
        <button className="primary" onClick={() => start("preview")} disabled={job?.status === "running"} data-testid="render-preview">
          Render motion preview ({QUALITY[quality].label.toLowerCase()}, draft sound)
        </button>
      </div>
      <p className="muted small" data-testid="preview-quality-note">
        {QUALITY[quality].label}: {QUALITY[quality].note}. The final export is always full quality.
      </p>
      <h3>Feedback</h3>
      <div className="row">
        <input placeholder="What should change?" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <button
          className="ghost"
          disabled={!feedback.trim()}
          onClick={async () => {
            try {
              const r = await api.feedback(doc.slug, feedback, [feedback]);
              fromServer(r.doc);
              setFeedback("");
            } catch (e) {
              setError(String((e as Error).message));
            }
          }}
        >
          Record feedback
        </button>
      </div>
      <h3>Approve</h3>
      <input placeholder="Your approval, in your words" value={quote} onChange={(e) => setQuote(e.target.value)} data-testid="approve-quote" />
      <div className="row">
        <button className="ghost" disabled={!quote.trim() || !has("direction") || has("preview")} onClick={() => approve("preview")} data-testid="approve-preview">
          Approve the previews
        </button>
        <button className="ghost" disabled={!quote.trim() || !has("preview") || has("final")} onClick={() => approve("final")} data-testid="approve-final">
          Approve the final edit
        </button>
      </div>
      <h3>Final export</h3>
      <p className="muted small">The final MP4 is rendered by Remotion: your original footage and dialogue (unchanged), every animation layer and every sound effect in one composition → timeline + audio QC. Only after your final approval.</p>
      {doc.source.scriptOnly ? (
        <p className="warn small" data-testid="export-blocked">
          Script-only project: attach your cut first (python3 .claude/skills/video-editing/scripts/edit_init.py /path/to/my-cut.mp4 --slug {doc.slug}). The final export needs the
          original footage and dialogue.
        </p>
      ) : null}
      {waiting.length ? (
        <p className="warn small" data-testid="export-waiting">
          Still waiting for Claude Code: {waiting.map((r) => `${r.segmentId} (${r.id}, ${r.type})`).join(", ")}. The export would miss these animations; process or cancel them first.
        </p>
      ) : null}
      <button
        className="primary"
        disabled={!has("final") || job?.status === "running" || !!doc.source.scriptOnly || waiting.length > 0}
        onClick={() => start("final")}
        data-testid="export-final"
      >
        Export final MP4
      </button>
      {job ? (
        <div className="job" data-testid="job">
          <div className="bar">
            <i style={{ width: `${Math.round(job.progress * 100)}%` }} />
          </div>
          <b data-testid="job-status">{job.status}</b> {Math.round(job.progress * 100)}%
          <pre>{job.log.join("\n")}</pre>
          {job.outputs.url ? <video src={job.outputs.url} controls className="preview-video" data-testid="preview-video" /> : null}
          {job.outputs.final ? <p className="ok" data-testid="final-path">Final: {job.outputs.final}</p> : null}
        </div>
      ) : null}
    </div>
  );
};
