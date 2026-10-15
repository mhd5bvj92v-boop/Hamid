import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EditDoc, SfxItem } from "../../src/kit/project";
import { fmtTime } from "../../src/kit/project";
import { retimeScene, sfxEventTime } from "../../src/kit/studio";
import { CAMERA_MOVES } from "../../src/kit/style";
import { beatWindow, kitTiming } from "../../src/kit/timing";
import type { BeatTiming } from "../../src/kit/types";
import type { Selection } from "../App";
import { FitIcon, LockIcon, MagnetIcon, RedoIcon, UndoIcon, ZoomInIcon, ZoomOutIcon } from "../ui/icons";
import { MOD } from "../ui/Shortcuts";

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
  /** A drag starts (true) / ends (false): all its edits are one undo step. */
  onGesture?: (active: boolean) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
};

const LABEL_W = 118;
const SYSTEM_TRACK: Record<string, string> = { B: "text", A: "onscreen", C: "fullscreen" };
/** Snapping distance in pixels. */
const SNAP_PX = 6;
/** Seconds between ruler labels: the smallest that keeps labels this far apart. */
const NICE_STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const LABEL_MIN_PX = 64;
/** Minor ticks per labelled step. */
const MINOR_DIV: Record<number, number> = { 0.1: 2, 0.25: 5, 0.5: 5, 1: 4, 2: 4, 5: 5, 10: 5, 15: 3, 30: 3, 60: 4, 120: 4, 300: 5, 600: 4 };

export const Timeline: React.FC<Props> = (p) => {
  const { doc } = p;
  const fps = doc.source.fps;
  const total = doc.source.durationInFrames / fps;
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [zoom, setZoom] = useState(1);
  const [snapOn, setSnapOn] = useState(true);
  const [guide, setGuide] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // measure the panel, not the (scrollable) content, so the lanes never grow the layout
    const host = el.parentElement ?? el;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, host.clientWidth - LABEL_W - 24)));
    ro.observe(host);
    return () => ro.disconnect();
  }, []);
  // zoom up to ~300 px per second (frame-level work), whatever the video length
  const maxZoom = Math.max(6, Math.ceil((total * 300) / width));
  const pps = (width / total) * zoom;
  const x = (t: number) => t * pps;
  const snap = (t: number) => Math.round(t * fps) / fps;
  const tAt = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(total, (clientX - r.left) / pps));
  };

  // ---- zoom, keeping one point in time under the same screen position
  const anchor = useRef<{ t: number; px: number } | null>(null);
  const zoomTo = (z: number, at?: { t: number; px: number }) => {
    const nz = Math.max(1, Math.min(maxZoom, z));
    const sc = scrollRef.current;
    if (sc) {
      const playT = p.frame / fps;
      const playPx = LABEL_W + x(playT) - sc.scrollLeft;
      const visible = playPx >= LABEL_W && playPx <= sc.clientWidth;
      anchor.current = at ?? (visible ? { t: playT, px: playPx } : { t: (sc.scrollLeft + (sc.clientWidth + LABEL_W) / 2 - LABEL_W) / pps, px: (sc.clientWidth + LABEL_W) / 2 });
    }
    setZoom(nz);
  };
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    const a = anchor.current;
    anchor.current = null;
    if (sc && a) sc.scrollLeft = Math.max(0, LABEL_W + a.t * pps - a.px);
    // pps follows zoom (and the measured width)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);
  // Ctrl/Cmd + wheel zooms at the mouse (a native listener: React's wheel events cannot preventDefault)
  const wheel = useRef({ zoom, pps });
  wheel.current = { zoom, pps };
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const on = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const { zoom: z, pps: s } = wheel.current;
      const px = e.clientX - sc.getBoundingClientRect().left;
      const t = Math.max(0, (sc.scrollLeft + px - LABEL_W) / s);
      const f = Math.exp(-e.deltaY * 0.0025);
      anchor.current = { t, px };
      setZoom(Math.max(1, Math.min(maxZoom, z * f)));
    };
    sc.addEventListener("wheel", on, { passive: false });
    return () => sc.removeEventListener("wheel", on);
  }, [maxZoom]);
  // keep the playhead in view when zoomed in (playback, keyboard steps)
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc || zoom <= 1) return;
    const px = LABEL_W + (p.frame / fps) * pps;
    const left = sc.scrollLeft + LABEL_W;
    const right = sc.scrollLeft + sc.clientWidth - 16;
    if (px < left || px > right) sc.scrollLeft = Math.max(0, px - LABEL_W - (sc.clientWidth - LABEL_W) * 0.1);
    // only when the playhead moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.frame]);

  // ---- snapping: script lines, other scenes' edges and the playhead (hold Alt to move freely)
  const snapTargets = (excludeSeg?: string) => {
    const ts: number[] = [p.frame / fps];
    for (const l of doc.transcript.segments) {
      if (l.start !== null) ts.push(l.start);
      if (l.end !== null) ts.push(l.end);
    }
    for (const s of doc.segments) if (s.id !== excludeSeg) ts.push(s.start, s.end);
    return ts;
  };

  const drag = (
    e: React.PointerEvent,
    onMove: (dt: number) => void,
    onClick?: () => void,
    snapping?: { edges: number[]; exclude?: string },
  ) => {
    e.stopPropagation();
    const x0 = e.clientX;
    let moved = false;
    const targets = snapping ? snapTargets(snapping.exclude) : [];
    p.onGesture?.(true);
    const move = (ev: PointerEvent) => {
      let dt = (ev.clientX - x0) / pps;
      if (Math.abs(ev.clientX - x0) > 2) moved = true;
      if (!moved) return;
      if (snapping && snapOn && !ev.altKey) {
        let best: { d: number; t: number } | null = null;
        for (const edge of snapping.edges)
          for (const t of targets) {
            const d = t - (edge + dt);
            if (Math.abs(d) * pps <= SNAP_PX && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t };
          }
        if (best) dt += best.d;
        setGuide(best ? best.t : null);
      } else setGuide(null);
      onMove(dt);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGuide(null);
      p.onGesture?.(false);
      if (!moved) onClick?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const timing = kitTiming as unknown as Record<string, BeatTiming<Record<string, unknown>>>;
  // a scene's item moves the scene (and with it the plan's times and its sounds): one record, never two copies
  const moveScene = (segId: string, s0: number, e0: number, dt: number, edge: "move" | "start" | "end") =>
    p.setDoc(retimeScene(doc, segId, edge === "end" ? s0 : s0 + dt, edge === "start" ? e0 : e0 + dt));
  const [selZoom, setSelZoom] = useState<number | null>(null);
  const segOf = (id?: string) => (id ? doc.segments.find((s) => s.id === id) : undefined);
  // ---- zooms on the talking-head footage (look only: the footage's timing never changes)
  const zooms = doc.zooms ?? [];
  const setZooms = (z: typeof zooms) => p.setDoc({ ...doc, zooms: [...z].sort((a, b) => a.start - b.start) });
  const addZoom = () => {
    const t0 = p.selection ? p.selection.start : snap(p.frame / fps);
    const t1 = p.selection ? p.selection.end : Math.min(total, t0 + 2);
    if (t1 - t0 < 0.2) return;
    setZooms([...zooms, { start: +t0.toFixed(3), end: +t1.toFixed(3), move: "slow-zoom-in", intensity: "medium" }]);
    setSelZoom(zooms.length);
  };
  const moveZoom = (i: number, s0: number, e0: number, dt: number, edge: "move" | "start" | "end") => {
    let s1 = edge === "end" ? s0 : s0 + dt;
    let e1 = edge === "start" ? e0 : e0 + dt;
    if (edge === "move") {
      const d = Math.max(-s0, Math.min(total - e0, dt));
      s1 = s0 + d;
      e1 = e0 + d;
    }
    s1 = Math.max(0, Math.min(s1, e1 - 0.2));
    e1 = Math.min(total, Math.max(e1, s1 + 0.2));
    setZooms(zooms.map((z, k) => (k === i ? { ...z, start: snap(s1), end: snap(e1) } : z)));
  };
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

  // ---- ruler: labels at a readable spacing, with minor ticks in between
  const step = NICE_STEPS.find((s) => s * pps >= LABEL_MIN_PX) ?? NICE_STEPS[NICE_STEPS.length - 1];
  const decimals = step >= 1 ? 0 : step >= 0.5 ? 1 : step === 0.1 ? 1 : 2;
  const div = MINOR_DIV[step] ?? 5;
  const ticks: number[] = [];
  const minors: number[] = [];
  const showMinor = (step / div) * pps >= 6;
  for (let i = 0; (i * step) / div <= total + 1e-6; i++) {
    const t = +((i * step) / div).toFixed(4);
    if (i % div === 0) ticks.push(t);
    else if (showMinor) minors.push(t);
  }

  const beatRows = (["text", "onscreen", "fullscreen"] as const).map((track) => ({
    track,
    label: track === "text" ? "Text (B)" : track === "onscreen" ? "On-screen (A)" : "Full-screen (C)",
    beats: doc.beats.filter((b) => {
      const w = beatWindow(b, kitTiming, fps);
      return (w.fullscreen ? "fullscreen" : SYSTEM_TRACK[w.system]) === track;
    }),
  }));

  // the ruler scrubs: press and drag to move the playhead continuously
  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const lane = e.currentTarget;
    p.seek(snap(tAt(e.clientX, lane)));
    document.body.classList.add("scrubbing");
    const move = (ev: PointerEvent) => p.seek(snap(tAt(ev.clientX, lane)));
    const up = () => {
      document.body.classList.remove("scrubbing");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const fitPct = Math.round(zoom * 100);
  const laneW = x(total);
  return (
    <div className="timeline" ref={ref} data-testid="timeline">
      <div className="tl-toolbar">
        <div className="tl-tools">
          <button className="icon-btn" onClick={p.onUndo} disabled={!p.canUndo} title={`Undo (${MOD}+Z)`} aria-label="Undo" data-testid="undo">
            <UndoIcon />
          </button>
          <button className="icon-btn" onClick={p.onRedo} disabled={!p.canRedo} title={`Redo (${MOD}+Shift+Z)`} aria-label="Redo" data-testid="redo">
            <RedoIcon />
          </button>
          <span className="tl-divider" />
          <button
            className={`icon-btn${snapOn ? " active" : ""}`}
            onClick={() => setSnapOn((v) => !v)}
            title={snapOn ? "Snapping on: scenes snap to script lines, other scenes and the playhead (hold Alt to move freely)" : "Snapping off"}
            aria-pressed={snapOn}
            data-testid="snap-toggle"
          >
            <MagnetIcon />
          </button>
          <span className="tl-divider" />
          <button className="small" onClick={addZoom} title="Add a camera zoom on your footage over the selection (or 2 s from the playhead)" data-testid="add-zoom">
            + Zoom
          </button>
          {selZoom !== null && zooms[selZoom] ? (
            <span className="zoom-edit" data-testid="zoom-edit">
              <select value={zooms[selZoom].move} onChange={(e) => setZooms(zooms.map((z, k) => (k === selZoom ? { ...z, move: e.target.value } : z)))} data-testid="zoom-move">
                {CAMERA_MOVES.filter((m) => m.id !== "static" && m.id !== "orbit").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={zooms[selZoom].intensity ?? "medium"}
                onChange={(e) => setZooms(zooms.map((z, k) => (k === selZoom ? { ...z, intensity: e.target.value as "subtle" | "medium" | "strong" } : z)))}
              >
                <option value="subtle">subtle</option>
                <option value="medium">medium</option>
                <option value="strong">strong</option>
              </select>
              <button className="ghost small" onClick={() => { setZooms(zooms.filter((_, k) => k !== selZoom)); setSelZoom(null); }} data-testid="zoom-delete">
                Delete zoom
              </button>
            </span>
          ) : null}
          <span className="tl-time">
            <b>{fmtTime(p.frame / fps)}</b>
            <span className="muted"> / {fmtTime(total)}</span>
          </span>
        </div>
        <span className="muted tl-note" title="Your cut, pauses and dialogue are never changed">
          {doc.source.durationInFrames} frames — the original footage is never cut or moved
        </span>
        <div className="tl-tools">
          <button className="icon-btn" onClick={() => zoomTo(zoom / 1.5)} disabled={zoom <= 1} title="Zoom out" aria-label="Zoom out">
            <ZoomOutIcon />
          </button>
          <input
            className="zoom-slider"
            type="range"
            min={0}
            max={Math.log(maxZoom)}
            step={0.01}
            value={Math.log(zoom)}
            onChange={(e) => zoomTo(Math.exp(+e.target.value))}
            title={`Zoom (${MOD} + scroll over the timeline)`}
            aria-label="Zoom"
            data-testid="zoom"
          />
          <button className="icon-btn" onClick={() => zoomTo(zoom * 1.5)} disabled={zoom >= maxZoom} title="Zoom in" aria-label="Zoom in">
            <ZoomInIcon />
          </button>
          <button className="ghost small fit-btn" onClick={() => zoomTo(1)} disabled={zoom === 1} title="Fit the whole video in view" data-testid="zoom-fit">
            <FitIcon size={14} /> Fit
          </button>
          <span className="muted small zoom-pct">{fitPct}%</span>
        </div>
      </div>
      <div className="tl-scroll" ref={scrollRef}>
        <div className="tl-inner" style={{ width: laneW + LABEL_W + 8, ["--lane-w" as string]: `${laneW}px` }}>
          <div className="tl-row ruler">
            <div className="tl-label" />
            <div className="tl-lane" onPointerDown={scrub} data-testid="ruler" title="Click or drag to move the playhead">
              {minors.map((t) => (
                <span key={`m${t}`} className="tick minor" style={{ left: x(t) }} />
              ))}
              {ticks.map((t) => (
                <span key={t} className="tick" style={{ left: x(t) }}>
                  {fmtTime(t, decimals)}
                </span>
              ))}
              <div className="playhead-handle" style={{ left: x(p.frame / fps) }} title="Drag to scrub" />
            </div>
          </div>
          <div className="tl-row">
            <div className="tl-label">
              Video <LockIcon size={11} />
            </div>
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
              title="Drag across the script to select a range"
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
                  onPointerDown={(e) => drag(e, (dt) => moveScene(s.id, s.start, s.end, dt, "move"), () => p.onSelectSegment(s.id), { edges: [s.start, s.end], exclude: s.id })}
                  data-testid={`seg-${s.id}`}
                  data-start={s.start}
                  data-end={s.end}
                  title={`${s.id} ${fmtTime(s.start)}-${fmtTime(s.end)} · ${s.sceneType ?? s.type} · "${s.text}"\nDrag to move · drag an edge to trim · Alt = no snapping`}
                >
                  <i className="handle left" onPointerDown={(e) => drag(e, (dt) => moveScene(s.id, s.start, s.end, dt, "start"), undefined, { edges: [s.start], exclude: s.id })} data-testid={`seg-start-${s.id}`} />
                  {s.id} {s.decision ? `· ${s.decision.choice}` : s.plan?.status === "approved" ? "· plan ✓" : "· open"} · {s.text}
                  <i className="handle" onPointerDown={(e) => drag(e, (dt) => moveScene(s.id, s.start, s.end, dt, "end"), undefined, { edges: [s.end], exclude: s.id })} data-testid={`seg-end-${s.id}`} />
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
                      onPointerDown={(e) => drag(e, (dt) => moveBeat(b.id, b.at, dt), () => p.onSelectBeat(b.id), { edges: [start, start + dur], exclude: b.segmentId })}
                      title={`${b.kind}${b.segmentId ? ` · scene ${b.segmentId}` : ""} · ${fmtTime(start)}-${fmtTime(start + dur)}\nClick to edit · drag to move · drag the right edge to change its length`}
                    >
                      <span>{b.kind}</span>
                      <i className="handle" onPointerDown={(e) => drag(e, (dt) => resizeBeat(b.id, dur, dt), undefined, { edges: [start + dur], exclude: b.segmentId })} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="tl-row">
            <div className="tl-label">Zoom</div>
            <div className="tl-lane" data-testid="zoom-lane">
              {zooms.map((z, i) => (
                <div
                  key={i}
                  className={`clip zoom${selZoom === i ? " sel" : ""}`}
                  style={{ left: x(z.start), width: Math.max(6, x(z.end - z.start)) }}
                  data-testid={`zoom-${i}`}
                  data-start={z.start}
                  data-end={z.end}
                  title={`${CAMERA_MOVES.find((m) => m.id === z.move)?.label ?? z.move} · ${fmtTime(z.start)}–${fmtTime(z.end)} (your footage; timing never changes)`}
                  onPointerDown={(e) => drag(e, (dt) => moveZoom(i, z.start, z.end, dt, "move"), () => setSelZoom(i), { edges: [z.start, z.end] })}
                >
                  <i className="handle left" onPointerDown={(e) => drag(e, (dt) => moveZoom(i, z.start, z.end, dt, "start"), undefined, { edges: [z.start] })} />
                  {CAMERA_MOVES.find((m) => m.id === z.move)?.label ?? z.move}
                  <i className="handle" onPointerDown={(e) => drag(e, (dt) => moveZoom(i, z.start, z.end, dt, "end"), undefined, { edges: [z.end] })} />
                </div>
              ))}
            </div>
          </div>
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
            <div className="tl-label">
              Dialogue <LockIcon size={11} />
            </div>
            <div className="tl-lane">
              <div className="clip dialogue" style={{ left: 0, width: x(total) }}>
                original dialogue · 0 dB · untouched
              </div>
            </div>
          </div>
          {guide !== null ? <div className="snap-guide" style={{ left: LABEL_W + x(guide) }} /> : null}
          <div className="playhead" style={{ left: LABEL_W + x(p.frame / fps) }} />
        </div>
      </div>
    </div>
  );
};
