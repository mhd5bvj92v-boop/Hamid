import React, { useEffect, useRef, useState } from "react";
import type { EditDoc, SfxItem } from "../../src/kit/project";
import { fmtTime } from "../../src/kit/project";
import { retimeScene, sfxEventTime } from "../../src/kit/studio";
import { beatWindow, kitTiming } from "../../src/kit/timing";
import type { BeatTiming } from "../../src/kit/types";
import type { Selection } from "../App";

type Props = {
  doc: EditDoc;
  frame: number;
  seek: (t: number) => void;
  selection: Selection;
  setSelection: (s: Selection) => void;
  setDoc: (d: EditDoc) => void;
  selectedBeat: string | null;
  selectedSegment?: string | null;
  onSelectBeat: (id: string) => void;
  onSelectSegment: (id: string) => void;
  onSelectSfx: (id: string) => void;
};

const LABEL_W = 118;
const SYSTEM_TRACK: Record<string, string> = { B: "text", A: "onscreen", C: "fullscreen" };

export const Timeline: React.FC<Props> = (p) => {
  const { doc } = p;
  const fps = doc.source.fps;
  const total = doc.source.durationInFrames / fps;
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // measure the panel, not the (scrollable) content, so the lanes never grow the layout
    const host = el.parentElement ?? el;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, host.clientWidth - LABEL_W - 24)));
    ro.observe(host);
    return () => ro.disconnect();
  }, []);
  const pps = (width / total) * zoom;
  const x = (t: number) => t * pps;
  const snap = (t: number) => Math.round(t * fps) / fps;
  const tAt = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(total, (clientX - r.left) / pps));
  };

  const drag = (e: React.PointerEvent, onMove: (dt: number) => void, onClick?: () => void) => {
    e.stopPropagation();
    const x0 = e.clientX;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / pps;
      if (Math.abs(ev.clientX - x0) > 2) moved = true;
      if (moved) onMove(dt);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) onClick?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const timing = kitTiming as unknown as Record<string, BeatTiming<Record<string, unknown>>>;
  // a scene's item moves the scene (and with it the plan's times and its sounds): one record, never two copies
  const moveScene = (segId: string, s0: number, e0: number, dt: number, edge: "move" | "start" | "end") =>
    p.setDoc(retimeScene(doc, segId, edge === "end" ? s0 : s0 + dt, edge === "start" ? e0 : e0 + dt));
  const segOf = (id?: string) => (id ? doc.segments.find((s) => s.id === id) : undefined);
  const moveBeat = (id: string, at0: number, dt: number) => {
    const b = doc.beats.find((x) => x.id === id)!;
    const sg = segOf(b.segmentId);
    if (sg) return moveScene(sg.id, sg.start, sg.end, dt, "move");
    const w = beatWindow(b, kitTiming, fps);
    const at = Math.max(0, Math.min(total - w.durationInFrames / fps, snap(at0 + dt)));
    p.setDoc({ ...doc, beats: doc.beats.map((x) => (x.id === id ? { ...x, at } : x)) });
  };
  const resizeBeat = (id: string, dur0: number, dt: number) => {
    const b = doc.beats.find((x) => x.id === id)!;
    const sg = segOf(b.segmentId);
    if (sg) return moveScene(sg.id, sg.start, sg.end, dt, "end");
    const tm = timing[b.kind];
    const props = b.props as Record<string, unknown>;
    const tail = tm.duration({ ...props, outAt: 0 });
    const dur = Math.max(0.8, Math.min(total - b.at, snap(dur0 + dt)));
    const outAt = +(dur - tail).toFixed(3);
    p.setDoc({ ...doc, beats: doc.beats.map((x) => (x.id === id ? ({ ...x, props: { ...props, outAt } } as typeof x) : x)) });
  };
  const nudgeSfx = (s: SfxItem, off0: number, dt: number) => {
    const offsetFrames = Math.round(off0 + dt * fps);
    p.setDoc({ ...doc, sfx: doc.sfx.map((x) => (x.id === s.id ? { ...x, offsetFrames } : x)) });
  };

  const ticks = [];
  const step = total / zoom > 40 ? 5 : total / zoom > 12 ? 1 : 0.5;
  for (let t = 0; t <= total + 1e-6; t += step) ticks.push(t);

  const beatRows = (["text", "onscreen", "fullscreen"] as const).map((track) => ({
    track,
    label: track === "text" ? "Text (B)" : track === "onscreen" ? "On-screen (A)" : "Full-screen (C)",
    beats: doc.beats.filter((b) => {
      const w = beatWindow(b, kitTiming, fps);
      return (w.fullscreen ? "fullscreen" : SYSTEM_TRACK[w.system]) === track;
    }),
  }));

  return (
    <div className="timeline" ref={ref} data-testid="timeline">
      <div className="tl-toolbar">
        <span className="muted">Timeline · {fmtTime(total)} · {doc.source.durationInFrames} frames — the original footage is never cut or moved</span>
        <label className="muted">
          zoom <input type="range" min={1} max={6} step={0.5} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
        </label>
      </div>
      <div className="tl-scroll">
        <div className="tl-inner" style={{ width: x(total) + LABEL_W + 8 }}>
          <div className="tl-row ruler">
            <div className="tl-label" />
            <div className="tl-lane" onPointerDown={(e) => p.seek(snap(tAt(e.clientX, e.currentTarget)))} data-testid="ruler">
              {ticks.map((t) => (
                <span key={t} className="tick" style={{ left: x(t) }}>
                  {fmtTime(t, 1)}
                </span>
              ))}
            </div>
          </div>
          <div className="tl-row">
            <div className="tl-label">Video 🔒</div>
            <div className="tl-lane">
              <div className="clip source" style={{ left: 0, width: x(total) }}>
                original footage · untouched · full length
              </div>
            </div>
          </div>
          <div className="tl-row">
            <div className="tl-label">Script</div>
            <div
              className="tl-lane selectable"
              data-testid="script-lane"
              onPointerDown={(e) => {
                const lane = e.currentTarget;
                const t0 = snap(tAt(e.clientX, lane));
                const move = (ev: PointerEvent) => {
                  const t1 = snap(tAt(ev.clientX, lane));
                  if (Math.abs(t1 - t0) > 1 / fps) p.setSelection({ start: Math.min(t0, t1), end: Math.max(t0, t1), lineIds: [], source: "timeline" });
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }}
            >
              {doc.transcript.segments
                .filter((l) => l.start !== null && l.end !== null && l.end > l.start)
                .map((l) => (
                  <div key={l.id} className="clip line-clip" style={{ left: x(l.start!), width: Math.max(2, x(l.end! - l.start!)) }} title={l.text}>
                    {l.text}
                  </div>
                ))}
              {p.selection ? <div className="range" data-testid="range" style={{ left: x(p.selection.start), width: x(p.selection.end - p.selection.start) }} /> : null}
            </div>
          </div>
          <div className="tl-row">
            <div className="tl-label">Segments</div>
            <div className="tl-lane">
              {doc.segments.map((s) => (
                <div
                  key={s.id}
                  className={`clip seg seg-${s.type}${p.selectedSegment === s.id ? " sel" : ""}`}
                  style={{ left: x(s.start), width: Math.max(4, x(s.end - s.start)) }}
                  onPointerDown={(e) => drag(e, (dt) => moveScene(s.id, s.start, s.end, dt, "move"), () => p.onSelectSegment(s.id))}
                  data-testid={`seg-${s.id}`}
                  data-start={s.start}
                  data-end={s.end}
                  title={`${s.id} ${fmtTime(s.start)}-${fmtTime(s.end)} · ${s.sceneType ?? s.type} · "${s.text}"`}
                >
                  <i className="handle left" onPointerDown={(e) => drag(e, (dt) => moveScene(s.id, s.start, s.end, dt, "start"))} data-testid={`seg-start-${s.id}`} />
                  {s.id} {s.decision ? `· ${s.decision.choice}` : s.plan?.status === "approved" ? "· plan ✓" : "· open"} · {s.text}
                  <i className="handle" onPointerDown={(e) => drag(e, (dt) => moveScene(s.id, s.start, s.end, dt, "end"))} data-testid={`seg-end-${s.id}`} />
                </div>
              ))}
            </div>
          </div>
          {beatRows.map((row) => (
            <div className="tl-row" key={row.track}>
              <div className="tl-label">{row.label}</div>
              <div className="tl-lane">
                {row.beats.map((b) => {
                  const w = beatWindow(b, kitTiming, fps);
                  const start = w.from / fps;
                  const dur = w.durationInFrames / fps;
                  return (
                    <div
                      key={b.id}
                      className={`clip beat beat-${row.track}${p.selectedBeat === b.id ? " sel" : ""}`}
                      style={{ left: x(start), width: Math.max(6, x(dur)) }}
                      data-testid={`beat-${b.id}`}
                      data-start={start}
                      data-end={start + dur}
                      onPointerDown={(e) => drag(e, (dt) => moveBeat(b.id, b.at, dt), () => p.onSelectBeat(b.id))}
                      title={`${b.kind} ${fmtTime(start)}-${fmtTime(start + dur)}`}
                    >
                      <span>{b.kind}</span>
                      <i className="handle" onPointerDown={(e) => drag(e, (dt) => resizeBeat(b.id, dur, dt))} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="tl-row">
            <div className="tl-label">SFX</div>
            <div className="tl-lane">
              {doc.sfx.map((s) => {
                const t = sfxEventTime(doc, s);
                if (t === null) return null;
                return (
                  <div
                    key={s.id}
                    className={`sfx fam-${s.family}${s.sound ? "" : " missing"}${s.enabled ? "" : " off"}`}
                    style={{ left: x(t) }}
                    data-testid={`sfx-${s.id}`}
                    data-time={t}
                    title={`${s.label} · ${s.family} · ${s.sound ?? "no sound assigned"} · ${s.gainDb} dB · ${fmtTime(t)}`}
                    onPointerDown={(e) => drag(e, (dt) => nudgeSfx(s, s.offsetFrames, dt), () => p.onSelectSfx(s.id))}
                  >
                    ◆
                  </div>
                );
              })}
            </div>
          </div>
          <div className="tl-row">
            <div className="tl-label">Dialogue 🔒</div>
            <div className="tl-lane">
              <div className="clip dialogue" style={{ left: 0, width: x(total) }}>
                original dialogue · 0 dB · untouched
              </div>
            </div>
          </div>
          <div className="playhead" style={{ left: LABEL_W + x(p.frame / fps) }} />
        </div>
      </div>
    </div>
  );
};
