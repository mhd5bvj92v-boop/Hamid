import React from "react";
import { COPY } from "../data/copy";
import { GAP, PHONE_GLYPH, RAIL, TERM, shellToWorld, termAt } from "../data/tracks";
import { C, EASE, FONT, SPRING, rgba } from "../theme";
import { Pt, quad, sp, tween } from "../lib/anim";
import { Glyph, arcD } from "../components/Icons";

/** Scene 3: the READY TO PAY glyph lifts off the phone and arcs into the gap. */
export const GlyphFlight: React.FC<{ f: number }> = ({ f }) => {
  if (f < 350 || f > 470) return null;
  const t = tween(f, 352, 414, EASE.inOut);
  const a = shellToWorld(f, PHONE_GLYPH);
  const c: Pt = [(a[0] + GAP[0]) / 2, Math.min(a[1], GAP[1]) - 170];
  const p = quad(a, c, GAP, t);
  const s = 1 + 0.9 * tween(f, 352, 420, EASE.out);
  const breathe = f > 414 ? 1 + 0.04 * Math.sin(((f - 414) / 60) * Math.PI * 2 * 1.2) : 1;
  const fade = 1 - tween(f, 452, 466);
  const size = 40 * s * breathe;
  return (
    <div style={{ position: "absolute", left: p[0] - size / 2 + 6 * s, top: p[1] - size / 2, opacity: fade }}>
      <Glyph size={size} color={C.orange} stroke={2.6 / s + 0.6} />
    </div>
  );
};

/** Scene 4: concentric arcs ripple out of the gap, then straighten into traces. */
export const NfcLink: React.FC<{ f: number }> = ({ f }) => {
  if (f < 448 || f > 640) return null;
  const waves = [450, 468, 486];
  const out = 1 - tween(f, 604, 628, EASE.exit);
  const t = termAt(f);
  const phoneEdge = (dy: number) => shellToWorld(f, [404 - 4, 424 + dy]);
  const termEdge = (dy: number): Pt => [t.x - TERM.w / 2 + 6, GAP[1] + dy];
  const straight = tween(f, 500, 548, EASE.inOut);
  const dash = (f - 500) * 3.2;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: out }}>
      {waves.map((w0, wi) =>
        [0, 1, 2, 3].map((k) => {
          const p = tween(f, w0 + k * 4, w0 + k * 4 + 54, EASE.out);
          if (p <= 0 || p >= 1) return null;
          const r = 18 + k * 14 + p * 120;
          const o = (1 - p) * (wi === 2 ? 1 : 0.8);
          return (
            <g key={`${wi}-${k}`} opacity={o}>
              <path d={arcD(GAP[0], GAP[1], r, 42)} stroke={C.orange} strokeWidth={3 - 1.6 * p} fill="none" strokeLinecap="round" />
              <path d={arcD(GAP[0], GAP[1], r, 42)} stroke={C.orange} strokeWidth={3 - 1.6 * p} fill="none" strokeLinecap="round" transform={`rotate(180 ${GAP[0]} ${GAP[1]})`} />
            </g>
          );
        }),
      )}
      {/* connection traces: an arc that relaxes into three precise lines */}
      {[-46, 0, 46].map((dy, i) => {
        const a = phoneEdge(dy);
        const b = termEdge(dy);
        const reveal = tween(f, 496 + i * 4, 536 + i * 4, EASE.draw);
        if (reveal <= 0) return null;
        const bulge = (1 - straight) * (i - 1 === 0 ? -70 : (i - 1) * 50);
        const c: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + bulge];
        const d = `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`;
        return (
          <g key={dy}>
            <path d={d} stroke={rgba(C.orange, 0.28)} strokeWidth={1.5} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - reveal} />
            <path d={d} stroke={C.orange} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeDasharray="10 26" strokeDashoffset={-dash - i * 12} opacity={reveal} />
          </g>
        );
      })}
      {/* terminal-side node + phone-side node */}
      {[phoneEdge(0), termEdge(0)].map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={5} fill={C.orange} opacity={tween(f, 500, 512)} />
      ))}
    </svg>
  );
};

/** Scene 4 status rail; at 600 it hands over to the confirmation panel. */
export const StatusRail: React.FC<{ f: number }> = ({ f }) => {
  if (f < 470 || f >= 606) return null;
  const inP = sp(f, 472, SPRING.ui);
  const prog = tween(f, 492, 590, EASE.inOut);
  const steps = [0, 0.5, 1];
  const left = RAIL.x - RAIL.w / 2;
  return (
    <div style={{ position: "absolute", left, top: RAIL.y - 50, width: RAIL.w, opacity: Math.min(1, inP * 1.4), transform: `translateY(${(1 - inP) * 18}px)`, fontFamily: FONT }}>
      {COPY.rail.map((l, i) => {
        const on = prog >= steps[i] - 0.001 && f >= 494;
        return (
          <div
            key={l}
            style={{
              position: "absolute",
              left: steps[i] * RAIL.w,
              top: 0,
              transform: `translateX(${i === 0 ? 0 : i === 2 ? -100 : -50}%)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 1.2,
              color: on ? C.soft : rgba(C.cream, 0.4),
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 4, background: on ? C.orange : rgba(C.cream, 0.25) }} />
            {l.toUpperCase()}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, top: 46, width: RAIL.w, height: RAIL.h, borderRadius: 3, background: rgba(C.cream, 0.12) }} />
      <div style={{ position: "absolute", left: 0, top: 46, width: RAIL.w * prog, height: RAIL.h, borderRadius: 3, background: `linear-gradient(90deg, ${C.deep}, ${C.orange})` }} />
    </div>
  );
};
