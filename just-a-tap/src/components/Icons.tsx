import React from "react";

type P = { size?: number; color: string; stroke?: number };

/** Contactless glyph: four concentric arcs. `arcs` 0..1 reveals them in turn. */
export const arcD = (cx: number, cy: number, r: number, deg = 48) => {
  const a = (deg * Math.PI) / 180;
  return `M${cx + r * Math.cos(-a)},${cy + r * Math.sin(-a)} A${r},${r} 0 0 1 ${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
};
export const Glyph: React.FC<P & { arcs?: number }> = ({ size = 40, color, stroke = 2.4, arcs = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
    {[7, 13, 19, 25].map((r, i) => {
      const p = Math.max(0, Math.min(1, arcs * 4 - i));
      return <path key={r} d={arcD(6, 20, r)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={p > 0 ? 1 : 0} />;
    })}
  </svg>
);

export const Icon: React.FC<P & { name: string }> = ({ name, size = 22, color, stroke = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {name === "bag" && (
      <>
        <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </>
    )}
    {name === "tram" && (
      <>
        <rect x={6} y={4} width={12} height={13} rx={3} />
        <path d="M6 11h12M9 20l-1.5 2M15 20l1.5 2M9 14.5h.01M15 14.5h.01" />
      </>
    )}
    {name === "cup" && (
      <>
        <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1 1 1 1 2M11.5 3.5c0 1 1 1 1 2" />
      </>
    )}
    {name === "check" && <path d="M5 12.5l4.2 4.2L19 7" />}
    {name === "chev" && <path d="M9 6l6 6-6 6" />}
    {name === "plus" && <path d="M12 5v14M5 12h14" />}
    {name === "cash" && (
      <>
        <rect x={3} y={6.5} width={18} height={11} rx={2.5} />
        <circle cx={12} cy={12} r={2.6} />
        <path d="M6.5 9.5v.01M17.5 14.5v.01" />
      </>
    )}
    {name === "swipe" && (
      <>
        <rect x={3} y={5.5} width={18} height={13} rx={2.5} />
        <path d="M3 9.5h18M6.5 14.5h4" />
      </>
    )}
    {name === "tap" && (
      <>
        <path d="M8.5 7.5a6.5 6.5 0 0 1 0 9M12 5a10 10 0 0 1 0 14M15.5 2.8a13 13 0 0 1 0 18.4" />
        <path d="M5 10a3 3 0 0 1 0 4" />
      </>
    )}
  </svg>
);
