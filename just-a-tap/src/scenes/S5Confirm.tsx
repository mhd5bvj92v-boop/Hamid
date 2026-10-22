import React from "react";
import { COPY } from "../data/copy";
import { CONFIRM, RAIL } from "../data/tracks";
import { C, EASE, FONT, R, SHADOW, SPRING, rgba } from "../theme";
import { Rect, lerpRect, sp, tween } from "../lib/anim";
import { Money } from "../components/Shell";
import { Glyph, Icon } from "../components/Icons";

const RAIL_RECT: Rect = { x: RAIL.x, y: RAIL.y, w: RAIL.w, h: RAIL.h, r: 3 };
export const confirmGrow = (f: number) => tween(f, 600, 652, EASE.morph);
export const confirmRect = (f: number) => lerpRect(RAIL_RECT, CONFIRM, confirmGrow(f));

/** Panel-local anchor of the approval underline (under "Payment complete"). */
export const UNDERLINE = { x: 112, y: 352, w: 232 };

/** Scene 5: the rail swells into a receipt-grade confirmation panel. */
export const ConfirmPanel: React.FC<{ f: number }> = ({ f }) => {
  if (f < 600 || f > 800) return null;
  const g = confirmGrow(f);
  const r = confirmRect(f);
  const out = tween(f, 750, 776, EASE.exit);
  const row = (i: number) => sp(f, 630 + i * 3, SPRING.ui);
  const st = (p: number): React.CSSProperties => ({ opacity: Math.min(1, p * 1.4) * (1 - out), transform: `translateY(${(1 - p) * 14}px)` });
  const amt = COPY.terminal.total * tween(f, 636, 700, EASE.out);
  const check = tween(f, 664, 690, EASE.draw);
  const checkPop = sp(f, 660, SPRING.press);
  const bar = tween(f, 636, 704, EASE.inOut);
  const under = tween(f, 694, 718, EASE.draw);
  const fill = g < 0.35 ? C.orange : C.white;
  return (
    <div
      style={{
        position: "absolute",
        left: r.x - r.w / 2,
        top: r.y - r.h / 2 - out * 60,
        width: r.w,
        height: r.h,
        borderRadius: r.r,
        background: fill,
        boxShadow: g > 0.3 ? `${SHADOW.e3}, inset 0 0 0 1px ${rgba(C.ink, 0.05)}` : "none",
        overflow: "hidden",
        fontFamily: FONT,
        color: C.ink,
        opacity: 1 - out,
      }}
    >
      {g > 0.5 && (
        <div style={{ position: "absolute", left: (r.w - CONFIRM.w) / 2, top: (r.h - CONFIRM.h) / 2, width: CONFIRM.w, height: CONFIRM.h }}>
          {/* completion bar */}
          <div style={{ position: "absolute", left: 0, top: 0, width: CONFIRM.w * bar, height: 4, background: `linear-gradient(90deg, ${C.deep}, ${C.orange})` }} />
          {/* header */}
          <div style={{ position: "absolute", left: 40, top: 40, display: "flex", alignItems: "center", gap: 14, ...st(row(0)) }}>
            <div style={{ width: 52, height: 52, borderRadius: R.m, background: rgba(C.orange, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="cup" color={C.deep} size={26} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>{COPY.confirm.merchant}</div>
              <div style={{ fontSize: 16, color: C.mute, marginTop: 2 }}>{COPY.confirm.when}</div>
            </div>
          </div>
          <div style={{ position: "absolute", right: 40, top: 50, height: 34, padding: "0 14px 0 8px", borderRadius: 17, background: C.track, display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, ...st(row(1)) }}>
            <Glyph size={22} color={C.deep} stroke={2.6} />
            {COPY.confirm.method[1]}
          </div>
          <div style={{ position: "absolute", left: 40, right: 40, top: 124, height: 1, background: rgba(C.ink, 0.07), ...st(row(1)) }} />
          {/* amount */}
          <div style={{ position: "absolute", left: 40, top: 146, ...st(row(2)) }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: C.mute }}>Total paid</div>
            <Money v={amt} size={96} color={C.ink} dim={0.32} />
          </div>
          {/* status */}
          <div style={{ position: "absolute", left: 40, top: 300, display: "flex", alignItems: "center", gap: 16, ...st(row(3)) }}>
            <svg width={56} height={56} viewBox="0 0 56 56" style={{ transform: `scale(${0.8 + 0.2 * checkPop})` }}>
              <circle cx={28} cy={28} r={26} fill={rgba(C.orange, 0.12 + 0.88 * check)} />
              <path d="M17 29.5l7 7L40 20" fill="none" stroke={C.white} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - check} />
            </svg>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }}>{COPY.confirm.status}</div>
          </div>
          {/* approval underline (shared element for scene 6) */}
          {f < 752 && <div style={{ position: "absolute", left: UNDERLINE.x, top: UNDERLINE.y, width: UNDERLINE.w * under, height: 4, borderRadius: 2, background: C.orange }} />}
          <div style={{ position: "absolute", left: 40, right: 40, top: 392, height: 1, background: rgba(C.ink, 0.07), ...st(row(4)) }} />
          {/* receipt rows */}
          {COPY.confirm.rows.map(([a, b], i) => (
            <div key={a} style={{ position: "absolute", left: 40, right: 40, top: 414 + i * 42, display: "flex", fontSize: 19, ...st(row(5 + i)) }}>
              <span style={{ color: rgba(C.ink, 0.75) }}>{a}</span>
              <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", color: rgba(C.ink, 0.75) }}>{b}</span>
            </div>
          ))}
          <div style={{ position: "absolute", left: 40, right: 40, top: 548, height: 0, borderTop: `1.5px dashed ${rgba(C.ink, 0.14)}`, ...st(row(8)) }} />
          {[COPY.confirm.paidWith, COPY.confirm.method].map(([a, b], i) => (
            <div key={a} style={{ position: "absolute", left: 40, right: 40, top: 570 + i * 42, display: "flex", fontSize: 19, ...st(row(9 + i)) }}>
              <span style={{ color: C.mute }}>{a}</span>
              <span style={{ marginLeft: "auto", fontWeight: 600 }}>{b}</span>
            </div>
          ))}
          <div style={{ position: "absolute", left: 40, top: 672, display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: C.mute, ...st(row(11)) }}>
            <Icon name="check" color={C.deep} size={16} stroke={2.4} />
            Receipt saved to Wallet
          </div>
        </div>
      )}
    </div>
  );
};
