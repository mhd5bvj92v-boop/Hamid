import React from "react";
import { interpolate } from "remotion";
import { C, FONT, rgba } from "../theme";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Geometry at the two ends of the bar → window morph.
export const BAR = { x: 960, y: 540, w: 900, h: 88 };
export const WIN = { x: 960, y: 556, w: 1380, h: 776 };
export const WIN_BAR = { y: WIN.y - WIN.h / 2 + 44, w: 640, h: 50 };
export const CONTENT_TOP = 88; // content area offset inside window

/** The browser: a glass address bar that can grow into a full glass window. */
export const Browser: React.FC<{
  expand: number; // 0 = floating bar, 1 = full window
  open?: number; // 0..1 vertical unfold of the bar from a hairline
  typed?: string;
  caret?: number;
  barGlow?: number;
  contentOpacity?: number;
  surface?: number; // kept for API compatibility
  children?: React.ReactNode;
}> = ({ expand, open = 1, typed = "", caret = 0, barGlow = 0, contentOpacity = 1, children }) => {
  const e = expand;
  const wx = lerp(BAR.x, WIN.x, e);
  const wy = lerp(BAR.y, WIN.y, e);
  const ww = lerp(BAR.w, WIN.w, e);
  const wh = lerp(BAR.h, WIN.h, e);
  const bh = lerp(BAR.h * Math.max(open, 0.04), WIN_BAR.h, e);
  const bw = lerp(BAR.w, WIN_BAR.w, e);
  const by = lerp(BAR.y, WIN_BAR.y, e);
  const fs = lerp(32, 20, e);
  const winOpacity = interpolate(e, [0, 0.25], [0, 1], { extrapolateRight: "clamp" });
  const rim = 0.35 + 0.65 * barGlow;
  return (
    <>
      {/* window: frosted glass */}
      <div
        style={{
          position: "absolute",
          left: wx - ww / 2,
          top: wy - wh / 2,
          width: ww,
          height: wh,
          borderRadius: lerp(44, 30, e),
          opacity: winOpacity,
          background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 30%, rgba(255,255,255,0.015) 100%), rgba(14,14,16,0.6)",
          backdropFilter: "blur(34px) saturate(160%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.08), 0 50px 140px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: 30 + i * 22, top: 38, width: 12, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.16)" }} />
        ))}
        <div style={{ position: "absolute", left: 0, top: CONTENT_TOP, right: 0, bottom: 0, opacity: contentOpacity }}>{children}</div>
      </div>
      {/* address bar: dark glass pill, warm light along its rim */}
      <div
        style={{
          position: "absolute",
          left: wx - bw / 2,
          top: by - bh / 2,
          width: bw,
          height: bh,
          borderRadius: bh / 2,
          padding: 1.5,
          boxSizing: "border-box",
          background: `linear-gradient(90deg, ${rgba(C.orange, 0.95 * rim)} 0%, ${rgba(C.warm, 0.35 * rim)} 22%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.1) 75%, ${rgba(C.warm, 0.6 * rim)} 100%)`,
          boxShadow: `-30px 0 70px ${rgba(C.orange, 0.22 * rim)}, 30px 0 70px ${rgba(C.warm, 0.12 * rim)}, 0 24px 60px rgba(0,0,0,0.5)`,
          opacity: interpolate(open, [0, 0.05], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: bh / 2,
            background: "linear-gradient(180deg, #1A1A1D 0%, #111113 100%)",
            display: "flex",
            alignItems: "center",
            paddingLeft: bh * 0.42,
            gap: bh * 0.2,
            overflow: "hidden",
            fontFamily: FONT,
            fontSize: fs,
            fontWeight: 500,
            color: C.paper,
            boxSizing: "border-box",
          }}
        >
          <svg width={fs * 0.72} height={fs * 0.86} viewBox="0 0 20 24" style={{ flexShrink: 0, opacity: open }}>
            <rect x={2} y={10} width={16} height={12} rx={3} fill={rgba(C.paper, 0.75)} />
            <path d="M6 10 V7 a4 4 0 0 1 8 0 V10" fill="none" stroke={rgba(C.paper, 0.75)} strokeWidth={2.4} />
          </svg>
          <span style={{ whiteSpace: "nowrap", opacity: open, letterSpacing: -0.3 }}>
            {typed}
            <span style={{ display: "inline-block", width: 2.5, height: fs * 1.05, marginLeft: 3, verticalAlign: "-0.18em", background: C.warm, opacity: caret }} />
          </span>
        </div>
      </div>
    </>
  );
};
