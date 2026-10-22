import { EasingFunction, interpolate, spring } from "remotion";
import { FPS } from "../theme";

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Clamped interpolate over a frame window with an easing. */
export const tween = (f: number, a: number, b: number, ease?: EasingFunction) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Spring progress starting at frame `start`. */
export const sp = (f: number, start: number, config: { damping: number; stiffness: number; mass: number }) =>
  spring({ frame: f - start, fps: FPS, config });

/** Press curve: 0 → 1 → 0 over `len` frames (for 1 → 0.96 → 1 scale). */
export const pressAt = (f: number, start: number, len = 10) =>
  f < start || f > start + len ? 0 : Math.sin(((f - start) / len) * Math.PI);

/** Piecewise keyframe track with one easing per segment. */
export const track = (f: number, keys: [number, number][], ease?: EasingFunction) =>
  interpolate(
    f,
    keys.map((k) => k[0]),
    keys.map((k) => k[1]),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease },
  );

export type Pt = [number, number];
export type Rect = { x: number; y: number; w: number; h: number; r: number }; // centre-based

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  r: lerp(a.r, b.r, t),
});

export const quad = (p0: Pt, c: Pt, p1: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
};

export const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/** Polyline path with arc-length parametrisation, built from line / cubic segments. */
export type Seg = { line: [Pt, Pt] } | { cubic: [Pt, Pt, Pt, Pt] };
export const buildPath = (segs: Seg[], samples = 48) => {
  const pts: Pt[] = [];
  segs.forEach((s, si) => {
    if ("line" in s) {
      if (si === 0) pts.push(s.line[0]);
      pts.push(s.line[1]);
    } else {
      const [a, b, c, d] = s.cubic;
      for (let i = si === 0 ? 0 : 1; i <= samples; i++) pts.push(cubic(a, b, c, d, i / samples));
    }
  });
  const len: number[] = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[len.length - 1];
  const at = (d: number): Pt => {
    d = Math.max(0, Math.min(total, d));
    let lo = 0, hi = len.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (len[m] < d) lo = m;
      else hi = m;
    }
    const k = (d - len[lo]) / Math.max(1e-6, len[hi] - len[lo]);
    return [lerp(pts[lo][0], pts[hi][0], k), lerp(pts[lo][1], pts[hi][1], k)];
  };
  /** SVG `d` for the sub-path between arc lengths a and b. */
  const slice = (a: number, b: number) => {
    if (b - a < 0.5) return "";
    const out: Pt[] = [at(a)];
    for (let i = 0; i < pts.length; i++) if (len[i] > a && len[i] < b) out.push(pts[i]);
    out.push(at(b));
    return "M" + out.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L");
  };
  return { total, at, slice };
};
