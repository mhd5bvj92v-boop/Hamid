import React, { useState } from "react";
import type { CreativeSegment, EditDoc, SceneBrief } from "../../src/kit/project";

const FIELDS: { k: keyof SceneBrief; label: string; hint: string }[] = [
  { k: "understand", label: "Viewer must understand", hint: "the one thing this sentence must land" },
  { k: "idea", label: "One visual idea", hint: "e.g. a single card arrives, one status changes, it leaves left" },
  { k: "why", label: "Why a visual here", hint: "why this helps more than the presenter alone" },
  { k: "focus", label: "Focus & reading order", hint: "what is seen first, second; where it sits (thirds)" },
  { k: "enterExit", label: "Enters / changes / exits", hint: "what arrives, what changes, what stays readable, how it clears" },
  { k: "inherits", label: "Next scene inherits", hint: "object, position or direction carried into the next scene" },
  { k: "sound", label: "Sound", hint: "only meaningful events (or none)" },
];

/** The scene's concise brief (persisted in edit.json as seg.brief, passed to Claude Code with every request). */
export const SceneBriefPanel: React.FC<{ doc: EditDoc; seg: CreativeSegment; setDoc: (d: EditDoc) => void }> = ({ doc, seg, setDoc }) => {
  const b = seg.brief ?? {};
  const filled = FIELDS.filter((f) => String(b[f.k] ?? "").trim());
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<SceneBrief>) =>
    setDoc({ ...doc, segments: doc.segments.map((s) => (s.id === seg.id ? { ...s, brief: { ...(s.brief ?? {}), ...patch } } : s)) });
  return (
    <div className="scene-brief" data-testid="scene-brief">
      <button className="ghost small" onClick={() => setOpen(!open)} data-testid="scene-brief-toggle">
        {open ? "▾" : "▸"} Scene brief {filled.length ? `(${filled.length}/${FIELDS.length})` : "(optional)"}
      </button>
      {!open && filled.length ? (
        <p className="muted small">
          {b.idea ? <b>{b.idea}</b> : null}
          {b.understand ? ` — ${b.understand}` : ""}
        </p>
      ) : null}
      {open ? (
        <div className="scene-brief-fields">
          {FIELDS.map((f) => (
            <label key={f.k} className="field">
              <span>{f.label}</span>
              <input value={String(b[f.k] ?? "")} placeholder={f.hint} onChange={(e) => set({ [f.k]: e.target.value })} data-testid={`brief-${f.k}`} />
            </label>
          ))}
          <label className="small">
            <input type="checkbox" checked={!!b.stillHold} onChange={(e) => set({ stillHold: e.target.checked })} /> intentional still hold (a dense visual needs attention)
          </label>
        </div>
      ) : null}
    </div>
  );
};
