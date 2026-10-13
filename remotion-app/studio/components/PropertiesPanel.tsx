import React from "react";
import type { EditDoc } from "../../src/kit/project";
import { fmtTime } from "../../src/kit/project";
import { beatWindow, kitTiming } from "../../src/kit/timing";
import type { BeatTiming } from "../../src/kit/types";

type Props = { doc: EditDoc; beatId: string | null; setBeatId: (id: string) => void; setDoc: (d: EditDoc) => void; seek: (t: number) => void };
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Generic editor for a beat's props: every change goes into edit.json and the Remotion Player at once. */
const Field: React.FC<{ name: string; value: Json; onChange: (v: Json) => void; path: string }> = ({ name, value, onChange, path }) => {
  if (typeof value === "string") {
    const isColor = /^#[0-9a-f]{6}$/i.test(value);
    return (
      <label className="field">
        <span>{name}</span>
        {isColor ? <input type="color" value={value} onChange={(e) => onChange(e.target.value)} data-testid={`prop-${path}`} /> : null}
        <input value={value} onChange={(e) => onChange(e.target.value)} data-testid={isColor ? undefined : `prop-${path}`} />
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <label className="field">
        <span>{name}</span>
        <input type="number" step={Number.isInteger(value) && Math.abs(value) > 5 ? 1 : 0.05} value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : +e.target.value)} data-testid={`prop-${path}`} />
      </label>
    );
  }
  if (typeof value === "boolean") {
    return (
      <label className="field">
        <span>{name}</span>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} data-testid={`prop-${path}`} />
      </label>
    );
  }
  if (Array.isArray(value)) {
    return (
      <fieldset className="group">
        <legend>{name}</legend>
        {value.map((v, i) => (
          <Field key={i} name={`${i + 1}`} value={v} path={`${path}.${i}`} onChange={(nv) => onChange(value.map((x, k) => (k === i ? nv : x)))} />
        ))}
      </fieldset>
    );
  }
  if (value && typeof value === "object") {
    return (
      <fieldset className="group">
        <legend>{name}</legend>
        {Object.entries(value).map(([k, v]) => (
          <Field key={k} name={k} value={v} path={`${path}.${k}`} onChange={(nv) => onChange({ ...value, [k]: nv })} />
        ))}
      </fieldset>
    );
  }
  return null;
};

export const PropertiesPanel: React.FC<Props> = ({ doc, beatId, setBeatId, setDoc, seek }) => {
  const beat = doc.beats.find((b) => b.id === beatId);
  if (!beat) {
    return (
      <div className="props">
        <h2>Animation inspector</h2>
        <p className="muted">Click an item on the timeline.</p>
        {doc.beats.map((b) => (
          <button key={b.id} className="ghost" onClick={() => setBeatId(b.id)}>
            {b.id} · {b.kind} · {fmtTime(b.at)}
          </button>
        ))}
      </div>
    );
  }
  const fps = doc.source.fps;
  const w = beatWindow(beat, kitTiming, fps);
  const tm = (kitTiming as unknown as Record<string, BeatTiming<Record<string, unknown>>>)[beat.kind];
  const props = beat.props as Record<string, Json>;
  const update = (patch: { at?: number; props?: Record<string, unknown> }) =>
    setDoc({ ...doc, beats: doc.beats.map((b) => (b.id === beat.id ? ({ ...b, ...patch } as typeof b) : b)) });
  const seg = doc.segments.find((s) => s.id === (beat as { segmentId?: string }).segmentId);
  const start = w.from / fps;
  const end = (w.from + w.durationInFrames) / fps;

  return (
    <div className="props" data-testid="props-panel">
      <h2>
        {beat.id} <span className="muted small">{beat.kind} · System {w.system}</span>
      </h2>
      <p className="muted small">{beat.reason}</p>
      <div className="field-row">
        <label className="field">
          <span>start (s)</span>
          <input type="number" step={1 / fps} value={+beat.at.toFixed(3)} data-testid="beat-at" onChange={(e) => update({ at: Math.max(0, +e.target.value) })} />
        </label>
        <label className="field">
          <span>end (s)</span>
          <input
            type="number"
            step={1 / fps}
            value={+end.toFixed(3)}
            data-testid="beat-end"
            onChange={(e) => {
              const tail = tm.duration({ ...props, outAt: 0 });
              update({ props: { ...props, outAt: Math.max(0.3, +(+e.target.value - beat.at - tail).toFixed(3)) } });
            }}
          />
        </label>
      </div>
      <p className="muted small" data-testid="beat-frames">
        frames {w.from}–{w.from + w.durationInFrames} · {fmtTime(start)}–{fmtTime(end)}
        {seg ? ` · segment ${seg.id} ${fmtTime(seg.start)}–${fmtTime(seg.end)}` : ""}
      </p>
      <div className="row">
        <button className="ghost small" onClick={() => seek(start + Math.min(1, (end - start) / 2))}>
          ▶ preview here
        </button>
        {seg ? (
          <button
            className="ghost small"
            onClick={() => {
              const tail = tm.duration({ ...props, outAt: 0 });
              update({ at: seg.start, props: { ...props, outAt: Math.max(0.6, +(seg.end - seg.start - tail).toFixed(3)) } });
            }}
          >
            Snap to segment
          </button>
        ) : null}
      </div>
      <div className="fields">
        {Object.entries(props).map(([k, v]) => (
          <Field key={k} name={k} value={v} path={k} onChange={(nv) => update({ props: { ...props, [k]: nv } })} />
        ))}
      </div>
      <p className="muted small">Refs: {beat.refs.join(", ")}</p>
    </div>
  );
};
