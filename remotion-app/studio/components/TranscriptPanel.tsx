import React, { useState } from "react";
import type { EditDoc, SegmentType, TranscriptIssue, TranscriptSegment } from "../../src/kit/project";
import { combineSegments, detectFormat, fmtTime, lineAt, parseTime, splitSegment, validateTranscript } from "../../src/kit/project";
import { api } from "../api";
import type { Selection } from "../App";

type Props = {
  doc: EditDoc;
  issues: TranscriptIssue[];
  frame: number;
  selection: Selection;
  setSelection: (s: Selection) => void;
  seek: (t: number) => void;
  setDoc: (d: EditDoc) => void;
  fromServer: (d: EditDoc) => void;
  setIssues: (i: TranscriptIssue[]) => void;
  onCreateSegment: (t: SegmentType) => void;
  onOpenSegment: (id: string) => void;
  setError: (e: string | null) => void;
};

const TYPE_COLOR: Record<SegmentType, string> = { text: "var(--b)", onscreen: "var(--a)", fullscreen: "var(--c)", sound: "var(--d)" };

/** mm:ss.cc input that only changes the timestamp when the user commits a valid value. */
const TimeInput: React.FC<{ value: number | null; onCommit: (v: number | null) => void; testid?: string; bad?: boolean }> = ({ value, onCommit, testid, bad }) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className={`time-input${bad ? " bad" : ""}`}
      data-testid={testid}
      value={draft ?? (value === null ? "" : fmtTime(value))}
      placeholder="--:--"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) {
          const v = draft.trim() === "" ? null : parseTime(draft);
          if (v !== null || draft.trim() === "") onCommit(v);
        }
        setDraft(null);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
};

export const TranscriptPanel: React.FC<Props> = (p) => {
  const { doc } = p;
  const lines = doc.transcript.segments;
  const t = p.frame / doc.source.fps;
  const current = lineAt(lines, t);
  const [importing, setImporting] = useState(lines.length === 0);
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [anchor, setAnchor] = useState<string | null>(null);
  const issuesBy = (id: string) => p.issues.filter((i) => i.id === id);

  const updateLines = (segs: TranscriptSegment[]) => {
    const next = { ...doc, transcript: { ...doc.transcript, segments: segs } };
    p.setIssues(validateTranscript(segs, doc.source.sourceDurationSeconds));
    p.setDoc(next);
  };
  const editLine = (id: string, patch: Partial<TranscriptSegment>) => updateLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const select = (l: TranscriptSegment, extend: boolean) => {
    if (l.start === null || l.end === null) {
      p.setError(`${l.id}: fix the missing/invalid timestamp before selecting it`);
      return;
    }
    p.seek(l.start);
    if (extend && anchor) {
      const ia = lines.findIndex((x) => x.id === anchor);
      const ib = lines.findIndex((x) => x.id === l.id);
      const [a, b] = ia < ib ? [ia, ib] : [ib, ia];
      const range = lines.slice(a, b + 1);
      if (range.some((x) => x.start === null || x.end === null)) {
        p.setError("the range contains a line with a missing timestamp");
        return;
      }
      p.setSelection({ start: Math.min(...range.map((x) => x.start!)), end: Math.max(...range.map((x) => x.end!)), lineIds: range.map((x) => x.id), source: "transcript" });
    } else {
      setAnchor(l.id);
      p.setSelection({ start: l.start, end: l.end, lineIds: [l.id], source: "transcript" });
    }
  };

  if (importing) {
    return (
      <div className="import" data-testid="import-panel">
        <h2>Your timestamped script</h2>
        <p className="muted">
          Paste it or load an SRT, VTT or JSON file. It is imported exactly as written: no text is rewritten and no timestamp is changed. Problems are flagged for you to fix.
        </p>
        <textarea
          data-testid="script-input"
          placeholder={"[00:00.40 - 00:02.40] What is the big picture here\n[00:02.60 - 00:04.40] We posted every day\n00:05.70 --> 00:07.90 And that changed everything for us"}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <div className="row">
          <label className="file">
            Load file (.srt .vtt .json .txt)
            <input
              type="file"
              accept=".srt,.vtt,.json,.txt"
              data-testid="script-file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFileName(f.name);
                setRaw(await f.text());
              }}
            />
          </label>
          <span className="muted">Detected: {raw ? detectFormat(fileName, raw) : "-"}</span>
        </div>
        <div className="row">
          <button
            className="primary"
            data-testid="import-script"
            disabled={!raw.trim()}
            onClick={async () => {
              if (
                lines.length &&
                !window.confirm(`Replace the current script (${lines.length} lines) with this one? Segments and animations keep their own times and words.`)
              )
                return;
              try {
                const r = await api.importScript(doc.slug, raw, fileName, lines.length > 0);
                p.fromServer(r.doc);
                p.setIssues(r.issues);
                setImporting(false);
              } catch (e) {
                p.setError(String((e as Error).message));
              }
            }}
          >
            Import script
          </button>
          {lines.length ? (
            <button className="ghost" onClick={() => setImporting(false)}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const segOf = (lineId: string) => doc.segments.filter((s) => s.transcriptIds.includes(lineId));
  const errors = p.issues.filter((i) => i.level === "error").length;

  return (
    <div className="transcript">
      <div className="panel-head">
        <h2>Script</h2>
        <span className="muted">
          {lines.length} lines · from {doc.transcript.importedFrom}
          {errors ? <b className="flag"> · {errors} timing problem(s)</b> : null}
        </span>
        <button className="ghost small" onClick={() => setImporting(true)}>
          Re-import
        </button>
      </div>
      <p className="hint">Click a line to jump there and select it; shift-click to extend. Timestamps are yours: edit them directly or set them from the playhead.</p>
      <div className="lines">
        {lines.map((l, i) => {
          const iss = issuesBy(l.id);
          const selected = p.selection?.lineIds.includes(l.id) || (p.selection?.source === "timeline" && l.start !== null && l.end !== null && l.start < p.selection.end && l.end > p.selection.start);
          const active = current?.id === l.id;
          return (
            <div key={l.id} className={`line${selected ? " selected" : ""}${active ? " active" : ""}${iss.some((x) => x.level === "error") ? " invalid" : ""}`} data-testid={`line-${l.id}`}>
              <div className="line-times">
                <TimeInput value={l.start} bad={iss.some((x) => /start|order/.test(x.message))} testid={`start-${l.id}`} onCommit={(v) => editLine(l.id, { start: v })} />
                <TimeInput value={l.end} bad={iss.some((x) => /end/.test(x.message))} testid={`end-${l.id}`} onCommit={(v) => editLine(l.id, { end: v })} />
              </div>
              <div className="line-text" onClick={(e) => select(l, e.shiftKey)} data-testid={`text-${l.id}`}>
                {l.words && active
                  ? l.words.map((w, k) => (
                      <span key={k} className={t >= w.start && t < w.end ? "word now" : "word"}>
                        {w.w}{" "}
                      </span>
                    ))
                  : l.text}
                {segOf(l.id).map((s) => (
                  <button key={s.id} className="seg-badge" style={{ borderColor: TYPE_COLOR[s.type] }} onClick={(e) => { e.stopPropagation(); p.onOpenSegment(s.id); }}>
                    {s.id}
                    {s.decision ? ` · ${s.decision.choice}` : ""}
                  </button>
                ))}
                {iss.map((x, k) => (
                  <div key={k} className={`issue ${x.level}`}>
                    {x.level === "error" ? "⚠ " : "• "}
                    {x.message}
                  </div>
                ))}
              </div>
              <div className="line-tools">
                <button title="Set start to the playhead" onClick={() => editLine(l.id, { start: +t.toFixed(3) })}>⇤</button>
                <button title="Set end to the playhead" onClick={() => editLine(l.id, { end: +t.toFixed(3) })}>⇥</button>
                <button
                  title="Split this line at the playhead (you choose the word)"
                  onClick={() => {
                    const words = l.text.split(" ");
                    const after = window.prompt(`Split "${l.text}" after which word? (1-${words.length - 1})\nThe split time is the playhead: ${fmtTime(t)}`);
                    const n = after ? parseInt(after, 10) : NaN;
                    if (!Number.isFinite(n) || n < 1 || n >= words.length) return;
                    if (l.start !== null && l.end !== null && (t <= l.start || t >= l.end)) {
                      p.setError(`move the playhead inside ${l.id} (${fmtTime(l.start)}-${fmtTime(l.end)}) to split it there`);
                      return;
                    }
                    updateLines(splitSegment(lines, l.id, n - 1, +t.toFixed(3)));
                  }}
                >
                  ✂
                </button>
                {i < lines.length - 1 ? (
                  <button title="Combine with the next line" data-testid={`combine-${l.id}`} onClick={() => updateLines(combineSegments(lines, l.id))}>
                    ⊕
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
