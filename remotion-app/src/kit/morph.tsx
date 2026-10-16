// Shape morphs for meaningful state changes (brief §29): a pending ring folds into a check, a dot grows
// into an arrow (pairs checked on rendered in-between frames). Optional (motion control "Shape morph", off by default): when off, or when two shapes cannot be
// matched point to point (several subpaths), it crossfades instead of producing a distorted in-between.
// Pure function of progress, so every frame is deterministic.
import React from "react";
import { interpolatePath, normalizePath } from "@remotion/paths";

/** Single-subpath outlines on a 24x24 grid (same stroke family as premium.tsx LineIcon). */
export const MORPH_SHAPES: Record<string, string> = {
  ring: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18",
  check: "M5 12.5l4.2 4.2L19 7",
  dot: "M12 10.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3",
  arrow: "M5 12h14l-5-5",
};

const single = (d: string) => (d.match(/[Mm]/g) ?? []).length <= 1;

/** Morph progress p (0 = from, 1 = to). `morph` false -> crossfade. Returns the stroke(s) to draw. */
export const morphShapes = (from: string, to: string, p: number, morph: boolean): { d: string; o: number }[] => {
  const a = MORPH_SHAPES[from] ?? from;
  const b = MORPH_SHAPES[to] ?? to;
  if (p <= 0) return [{ d: a, o: 1 }];
  if (p >= 1) return [{ d: b, o: 1 }];
  if (morph && single(a) && single(b)) {
    try {
      return [{ d: interpolatePath(p, normalizePath(a), normalizePath(b)), o: 1 }];
    } catch {
      // not matchable: fall through to the crossfade
    }
  }
  return [
    { d: a, o: 1 - p },
    { d: b, o: p },
  ];
};

export const MorphIcon: React.FC<{ from: string; to: string; p: number; morph: boolean; size?: number; color?: string; stroke?: number }> = ({ from, to, p, morph, size = 26, color = "#fff", stroke = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", overflow: "visible" }}>
    {morphShapes(from, to, p, morph).map((s, i) => (
      <path key={i} d={s.d} opacity={s.o} />
    ))}
  </svg>
);
