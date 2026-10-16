import React, { useEffect, useState } from "react";
import type { RefAttachment } from "../../src/kit/project";
import { api, RefAnalysisRecord } from "../api";

/** What a reference attachment points to, for the analysis store (built-in / My-library id, file path or link). */
export const refKey = (a: RefAttachment) => a.url ?? (/^(ONS|TXT|FUL)-\d{3}$/.test(a.id) || a.id.startsWith("MY-") ? a.id : (a.path ?? a.id));

/**
 * The stored analysis of one reference: measured facts (always, when accessible), what Claude Code observed
 * (only after it looked at it), inferred motion kept apart, and a clear "not accessible" with an upload
 * fallback for links that cannot be opened. "Analyse" / "Refresh" asks Claude Code (an analysis request).
 */
export const RefAnalysis: React.FC<{ slug: string; segId: string; att: RefAttachment; onUploadInstead?: () => void }> = ({ slug, segId, att, onUploadInstead }) => {
  const ref = refKey(att);
  const [a, setA] = useState<RefAnalysisRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let live = true;
    api.refAnalysis(ref).then((r) => live && setA(r.analysis)).catch(() => live && setA(null));
    return () => {
      live = false;
    };
  }, [ref]);
  const ask = async (refresh: boolean) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await api.askAnalysis(slug, segId, ref, refresh);
      setA(r.analysis);
      setMsg(r.message);
    } catch (e) {
      setMsg(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };
  const m = a?.measured;
  return (
    <div className="ref-analysis" data-testid={`ref-analysis-${att.id}`}>
      {!a ? (
        <span className="muted small">checking…</span>
      ) : a.status === "inaccessible" ? (
        <div className="ra-off" data-testid={`ra-inaccessible-${att.id}`}>
          <b>Not accessible</b> <span className="small">{a.error}</span>{" "}
          {onUploadInstead ? (
            <button className="small" onClick={onUploadInstead} data-testid={`ra-upload-${att.id}`}>
              Upload a screenshot or clip instead
            </button>
          ) : null}
        </div>
      ) : (
        <div className="ra-on">
          <span className={`badge${a.status === "analysed" ? " ok" : ""}`} data-testid={`ra-status-${att.id}`}>
            {a.status === "analysed" ? `analysed by Claude Code ${String(a.analysedAt).slice(0, 10)}` : "measured only"}
          </span>
          {m ? (
            <span className="ra-facts small">
              {m.palette.slice(0, 5).map((c) => (
                <i key={c.hex} className="swatch" style={{ background: c.hex }} title={`${c.hex} ${c.share}%`} />
              ))}
              {m.width}×{m.height}
              {m.durationS ? ` · ${m.durationS}s` : ""} · {m.foundation}
            </span>
          ) : null}
          {a.observed ? (
            <div className="small ra-obs">
              <b>Observed:</b> {Object.values(a.observed).filter(Boolean).join(" · ")}
            </div>
          ) : null}
          {a.inferredMotion ? (
            <div className="small muted">
              <b>Inferred motion (a guess):</b> {a.inferredMotion}
            </div>
          ) : null}
          <button className="ghost small" disabled={busy} onClick={() => ask(a.status === "analysed")} data-testid={`ra-ask-${att.id}`}>
            {a.status === "analysed" ? "Refresh analysis" : "Ask Claude Code to analyse"}
          </button>
        </div>
      )}
      {msg ? <div className="small muted">{msg}</div> : null}
    </div>
  );
};
