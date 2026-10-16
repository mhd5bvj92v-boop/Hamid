import React, { useState } from "react";
import { BACKGROUNDS } from "../../src/kit/backgrounds";
import { TEXT_STYLES } from "../../src/kit/beats/kineticText.timing";
import { CAMERA_MOVES } from "../../src/kit/style";
import { api } from "../api";
import { MotionControls } from "./MotionControls";
import type { EditDoc } from "../../src/kit/project";
import { SCENE_TYPES, fmtTime, sceneTypeOf } from "../../src/kit/project";
import { retimeScene } from "../../src/kit/studio";
import { beatWindow, kitTiming } from "../../src/kit/timing";
import type { BeatTiming } from "../../src/kit/types";

type Props = {
  doc: EditDoc;
  beatId: string | null;
  setBeatId: (id: string) => void;
  setDoc: (d: EditDoc) => void;
  seek: (t: number) => void;
  onOpenPlan?: (segmentId: string) => void;
  fromServer?: (d: EditDoc) => void;
};
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

export const PropertiesPanel: React.FC<Props> = ({ doc, beatId, setBeatId, setDoc, seek, onOpenPlan, fromServer }) => {
  const [bgPrompt, setBgPrompt] = useState("");
  const [bgMsg, setBgMsg] = useState("");
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
      {seg ? (
        <div className="scene-card" data-testid="scene-card">
          <div className="row">
            <b>Scene plan {seg.id}</b>
            <span className="pill">{SCENE_TYPES.find((t) => t.type === sceneTypeOf(seg))?.label ?? seg.type}</span>
            <span className={`pill${seg.plan?.status === "approved" ? " ok-pill" : ""}`}>{seg.plan?.status === "approved" ? "plan approved" : "plan draft"}</span>
            {onOpenPlan ? (
              <button className="ghost small" onClick={() => onOpenPlan(seg.id)} data-testid="open-plan">
                Open in Scene Planning
              </button>
            ) : null}
          </div>
          <p className="small">“{seg.text}” · {fmtTime(seg.start)}–{fmtTime(seg.end)}</p>
          {seg.onScreen ? <p className="small muted" data-testid="scene-card-onscreen">On screen: {seg.onScreen}</p> : null}
        </div>
      ) : null}
      <div className="field-row">
        <label className="field">
          <span>start (s)</span>
          <input
            type="number"
            step={1 / fps}
            value={+beat.at.toFixed(3)}
            data-testid="beat-at"
            onChange={(e) => {
              const at = Math.max(0, +e.target.value);
              // a scene's item: moving it moves the scene (Scene Planning shows the same times)
              if (seg) setDoc(retimeScene(doc, seg.id, seg.start + (at - beat.at), seg.end + (at - beat.at)));
              else update({ at });
            }}
          />
        </label>
        <label className="field">
          <span>end (s)</span>
          <input
            type="number"
            step={1 / fps}
            value={+end.toFixed(3)}
            data-testid="beat-end"
            onChange={(e) => {
              if (seg) return setDoc(retimeScene(doc, seg.id, seg.start, seg.end + (+e.target.value - end)));
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
      <div className="look-motion" data-testid="look-motion">
        <h3>Look & motion</h3>
        <MotionControls doc={doc} segId={(beat as { segmentId?: string }).segmentId ?? null} setDoc={setDoc} />
        <div className="field-row">
          <label className="field">
            <span>camera</span>
            <select
              value={beat.camera?.move ?? ""}
              data-testid="beat-camera"
              onChange={(e) =>
                setDoc({
                  ...doc,
                  beats: doc.beats.map((b) =>
                    b.id === beat.id ? ({ ...b, camera: e.target.value ? { move: e.target.value, intensity: b.camera?.intensity } : undefined } as typeof b) : b,
                  ),
                })
              }
            >
              <option value="">{w.fullscreen ? `edit default (${doc.constants?.camera ?? "push-in"})` : "none (overlay)"}</option>
              {CAMERA_MOVES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>strength</span>
            <select
              value={beat.camera?.intensity ?? ""}
              onChange={(e) =>
                setDoc({
                  ...doc,
                  beats: doc.beats.map((b) =>
                    b.id === beat.id ? ({ ...b, camera: { move: b.camera?.move ?? doc.constants?.camera ?? "push-in", intensity: e.target.value || undefined } } as typeof b) : b,
                  ),
                })
              }
            >
              <option value="">edit default</option>
              <option value="subtle">subtle</option>
              <option value="medium">medium</option>
              <option value="strong">strong</option>
            </select>
          </label>
        </div>
        {beat.kind === "KineticText" ? (
          <div className="field-row">
            <label className="field">
              <span>text animation</span>
              <select value={String(props.style ?? "word-rise")} data-testid="beat-text-style" onChange={(e) => update({ props: { ...props, style: e.target.value } })}>
                {TEXT_STYLES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>placement</span>
              <select value={String(props.placement ?? "caption")} onChange={(e) => update({ props: { ...props, placement: e.target.value } })}>
                <option value="caption">caption</option>
                <option value="center">center</option>
                <option value="fullscreen">full screen</option>
              </select>
            </label>
          </div>
        ) : null}
        {"background" in props || (beat.kind === "KineticText" && props.placement === "fullscreen") ? (
          <label className="field">
            <span>background</span>
            <select value={String(props.background ?? "aurora")} data-testid="beat-background" onChange={(e) => update({ props: { ...props, background: e.target.value } })}>
              {BACKGROUNDS.map((b) => (
                <option key={b.id} value={b.id} title={b.description}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {seg ? (
          <div className="ask-bg">
            <textarea
              placeholder="Describe a new background for Claude, e.g. 'deep violet nebula with slow light streaks and floating glass shards'"
              value={bgPrompt}
              onChange={(e) => setBgPrompt(e.target.value)}
              data-testid="ask-bg-text"
            />
            <button
              className="small"
              disabled={!bgPrompt.trim()}
              data-testid="ask-bg"
              onClick={async () => {
                const r = await api.askBackground(doc.slug, seg.id, bgPrompt.trim());
                fromServer?.(r.doc);
                setBgPrompt("");
                setBgMsg("Saved for Claude Code: ask it to process your Studio requests. The new background then appears in this list.");
              }}
            >
              Ask Claude for a new background
            </button>
            {bgMsg ? <p className="muted small">{bgMsg}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="fields">
        {Object.entries(props).map(([k, v]) => (
          <Field key={k} name={k} value={v} path={k} onChange={(nv) => update({ props: { ...props, [k]: nv } })} />
        ))}
      </div>
      <p className="muted small">Refs: {(beat.refs ?? []).join(", ") || "none"}</p>
    </div>
  );
};
