import React from "react";
import { COPY } from "../data/copy";
import { TERM, termAt } from "../data/tracks";
import { C, EASE, FONT, R, SHADOW, SPRING, rgba } from "../theme";
import { sp, tween } from "../lib/anim";
import { Money } from "./Shell";
import { Glyph, Icon } from "./Icons";

/** Fictional merchant terminal UI (dark squircle). `state` 0 Ready · 1 Reading · 2 Approved. */
export const Terminal: React.FC<{ f: number; state: number; zone: number }> = ({ f, state, zone }) => {
  const t = termAt(f);
  if (t.opacity <= 0.001) return null;
  const row = (i: number) => sp(f, 318 + i * 3, SPRING.ui);
  const st = (p: number): React.CSSProperties => ({ opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 12}px)` });
  const total = COPY.terminal.total * tween(f, 330, 384, EASE.out);
  const label = COPY.terminal.states[Math.min(2, Math.floor(state))];
  const pulse = 0.5 + 0.5 * Math.sin((f / 60) * Math.PI * 2 * 1.1);
  const pill = state >= 2 ? C.orange : rgba(C.orange, 0.14);
  return (
    <div
      style={{
        position: "absolute",
        left: t.x - TERM.w / 2,
        top: t.y - TERM.h / 2,
        width: TERM.w,
        height: TERM.h,
        borderRadius: TERM.r,
        background: C.surface,
        boxShadow: `${SHADOW.dark}, inset 0 0 0 1px ${rgba(C.white, 0.07)}, inset 0 1px 0 ${rgba(C.white, 0.12)}`,
        overflow: "hidden",
        opacity: t.opacity,
        transform: `rotate(${t.rot}deg) scale(${t.scale})`,
        fontFamily: FONT,
        color: C.cream,
      }}
    >
      {/* amber light rising from the tap zone */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 45% at 50% 108%, ${rgba(C.orange, 0.5 + 0.25 * zone)} 0%, ${rgba(C.deep, 0.18)} 45%, ${rgba(C.surface, 0)} 75%)` }} />
      {/* header */}
      <div style={{ position: "absolute", left: 34, top: 32, display: "flex", alignItems: "center", gap: 14, ...st(row(0)) }}>
        <div style={{ width: 44, height: 44, borderRadius: R.m, background: rgba(C.orange, 0.16), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="cup" color={C.orange} size={24} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2.2 }}>{COPY.terminal.merchant}</div>
          <div style={{ fontSize: 14, color: rgba(C.cream, 0.5), marginTop: 2 }}>{COPY.terminal.order}</div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 30,
          top: 38,
          height: 32,
          padding: "0 14px 0 12px",
          borderRadius: 16,
          background: pill,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: state >= 2 ? C.ink : C.soft,
          ...st(row(1)),
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: state >= 2 ? C.ink : C.orange, opacity: state >= 2 ? 1 : 0.55 + 0.45 * pulse }} />
        {label}
      </div>
      <div style={{ position: "absolute", left: 34, right: 34, top: 104, height: 1, background: rgba(C.white, 0.08), ...st(row(1)) }} />
      {/* items */}
      {COPY.terminal.items.map((it, i) => (
        <div key={it.name} style={{ position: "absolute", left: 34, right: 34, top: 126 + i * 40, display: "flex", fontSize: 18, ...st(row(2 + i)) }}>
          <span style={{ color: rgba(C.cream, 0.82) }}>{it.name}</span>
          <span style={{ color: rgba(C.cream, 0.4), marginLeft: 8 }}>{it.qty}</span>
          <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", color: rgba(C.cream, 0.82) }}>{it.amt}</span>
        </div>
      ))}
      <div style={{ position: "absolute", left: 34, right: 34, top: 252, height: 1, background: rgba(C.white, 0.08), ...st(row(5)) }} />
      <div style={{ position: "absolute", left: 34, top: 274, ...st(row(6)) }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: rgba(C.cream, 0.5) }}>{COPY.terminal.totalLabel}</div>
        <Money v={total} size={84} color={C.cream} dim={0.38} />
      </div>
      {/* tap zone */}
      <div
        style={{
          position: "absolute",
          left: 30,
          right: 30,
          bottom: 30,
          height: 220,
          borderRadius: R.xl,
          background: rgba(C.white, 0.03 + 0.03 * zone),
          boxShadow: `inset 0 0 0 1px ${rgba(C.soft, 0.16 + 0.3 * zone)}`,
          ...st(row(7)),
        }}
      >
        <div style={{ position: "absolute", left: "50%", top: 46, transform: "translateX(-50%)" }}>
          <Glyph size={78} color={zone > 0.5 ? C.orange : rgba(C.cream, 0.8)} stroke={2.2} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", fontSize: 18, fontWeight: 500, color: rgba(C.cream, 0.7) }}>{COPY.terminal.tap}</div>
      </div>
    </div>
  );
};
