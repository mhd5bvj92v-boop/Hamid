import React from "react";
import { COPY } from "../data/copy";
import { C, EASE, FONT, R, SHADOW, SPRING, rgba } from "../theme";
import { Pt, buildPath, lerp, sp, track, tween } from "../lib/anim";
import { Icon } from "../components/Icons";
import { RAIL_X, railRect } from "./S6Methods";

// Gesture track: rail (vertical) → under the 1 TAP card → swoop → title underline.
export const UL = { x0: 700, x1: 1220, y: 646 }; // final title underline (world)
const CARD1 = { x: 760, y: 410, w: 440, h: 210 };
const P = buildPath([
  { line: [[RAIL_X + 2, 492], [RAIL_X + 2, 556]] },
  { cubic: [[RAIL_X + 2, 556], [RAIL_X + 2, 548], [RAIL_X + 2, 548], [CARD1.x - CARD1.w / 2 + 10, 548]] },
  { line: [[CARD1.x - CARD1.w / 2 + 10, 548], [CARD1.x + CARD1.w / 2 - 10, 548]] },
  { cubic: [[CARD1.x + CARD1.w / 2 - 10, 548], [1180, 548], [1260, 760], [1040, 770]] },
  { cubic: [[1040, 770], [820, 780], [620, 700], [UL.x0, UL.y]] },
  { line: [[UL.x0, UL.y], [UL.x1, UL.y]] },
]);
const FINAL = UL.x1 - UL.x0;

/** Head/tail of the orange stroke along the gesture track. */
export const strokeAt = (f: number) => {
  const head = track(f, [[900, 64], [1040, P.total]], EASE.inOut);
  const len = track(f, [[900, 64], [944, FINAL]], EASE.out);
  return { head, tail: Math.max(0, head - len) };
};
export const strokeHead = (f: number): Pt => P.at(strokeAt(f).head);

export const Stroke: React.FC<{ f: number }> = ({ f }) => {
  if (f < 900) {
    if (f < 752) return null;
    const r = railRect(f);
    return <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 2, background: C.orange, zIndex: 5 }} />;
  }
  const { head, tail } = strokeAt(f);
  const d = P.slice(tail, head);
  const h = P.at(head);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 5 }}>
      <path d={d} fill="none" stroke={C.orange} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {f < 1044 && <circle cx={h[0]} cy={h[1]} r={6} fill={C.orange} />}
    </svg>
  );
};

/** Scene 7 summary card + receipt fragments that snap into a capsule. */
export const OneTap: React.FC<{ f: number }> = ({ f }) => {
  if (f < 900 || f > 1080) return null;
  const inP = sp(f, 912, SPRING.ui);
  const out = tween(f, 1026, 1048, EASE.exit);
  const underlined = tween(f, 930, 960);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD1.x - CARD1.w / 2,
        top: CARD1.y - CARD1.h / 2,
        width: CARD1.w,
        height: CARD1.h,
        borderRadius: R.xl,
        background: C.white,
        boxShadow: `${SHADOW.e3}, inset 0 0 0 1px ${rgba(C.ink, 0.05)}`,
        opacity: Math.min(1, inP * 1.4) * (1 - out),
        transform: `translateY(${(1 - inP) * 30 - out * 40}px) scale(${0.94 + 0.06 * inP})`,
        fontFamily: FONT,
        color: C.ink,
      }}
    >
      <div style={{ position: "absolute", left: 36, top: 30, fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: C.mute }}>SUMMARY</div>
      <div style={{ position: "absolute", right: 30, top: 24, height: 30, padding: "0 12px 0 8px", borderRadius: 15, background: rgba(C.orange, 0.12 + 0.88 * underlined), color: underlined > 0.5 ? C.ink : C.deep, display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600 }}>
        <Icon name="check" color={underlined > 0.5 ? C.ink : C.deep} size={16} stroke={2.6} />
        Done
      </div>
      <div style={{ position: "absolute", left: 34, top: 58, fontSize: 92, fontWeight: 600, letterSpacing: -3.5 }}>
        1 <span style={{ color: C.deep }}>TAP</span>
      </div>
      <div style={{ position: "absolute", left: 36, top: 166, fontSize: 18, color: C.mute }}>{COPY.oneTap.sub}</div>
    </div>
  );
};

// capsule geometry: scene 7 (light, right) → scene 8 (dark, centred below title)
const CAP7 = { x: 1336, y: 410, w: 470, h: 96 };
const CAP8 = { x: 960, y: 808, w: 520, h: 96 };
const FRAG: { p: Pt; t: string }[] = [
  { p: [1400, 270], t: COPY.fragments[0] },
  { p: [1540, 420], t: COPY.fragments[1] },
  { p: [1360, 560], t: COPY.fragments[2] },
];

export const Capsule: React.FC<{ f: number; dark: number }> = ({ f, dark }) => {
  if (f < 930) return null;
  const snap = tween(f, 984, 1012, EASE.morph);
  // fragments
  const frags = FRAG.map((fr, i) => {
    const inP = sp(f, 932 + i * 4, SPRING.ui);
    return { ...fr, inP };
  });
  const capIn = tween(f, 1000, 1014);
  // drops below the title line first, then glides to centre (never crosses the title)
  const my = sp(f, 1034, SPRING.settle);
  const mx = sp(f, 1048, SPRING.settle);
  const x = lerp(CAP7.x, CAP8.x, mx);
  const y = lerp(CAP7.y, CAP8.y, my);
  const w = lerp(CAP7.w, CAP8.w, mx);
  const bg = dark > 0.5 ? C.surface : C.white;
  const fg = dark > 0.5 ? C.cream : C.ink;
  const sub = dark > 0.5 ? rgba(C.cream, 0.55) : C.mute;
  return (
    <>
      {snap < 1 &&
        frags.map((fr, i) => {
          const px = lerp(fr.p[0], CAP7.x - 120 + i * 120, snap);
          const py = lerp(fr.p[1], CAP7.y, snap);
          return (
            <div
              key={fr.t}
              style={{
                position: "absolute",
                left: px,
                top: py,
                transform: `translate(-50%, -50%) scale(${(0.85 + 0.15 * fr.inP) * (1 - 0.25 * snap)}) rotate(${(1 - fr.inP) * (i - 1) * 8}deg)`,
                height: 52,
                padding: "0 20px",
                borderRadius: 26,
                background: C.white,
                boxShadow: `${SHADOW.e2}, inset 0 0 0 1px ${rgba(C.ink, 0.06)}`,
                display: "flex",
                alignItems: "center",
                fontFamily: FONT,
                fontSize: 20,
                fontWeight: 600,
                color: C.ink,
                whiteSpace: "nowrap",
                opacity: Math.min(1, fr.inP * 1.4) * (1 - capIn),
              }}
            >
              {fr.t}
            </div>
          );
        })}
      {capIn > 0 && (
        <div
          style={{
            position: "absolute",
            left: x - w / 2,
            top: y - CAP7.h / 2,
            width: w,
            height: CAP7.h,
            borderRadius: CAP7.h / 2,
            background: bg,
            boxShadow: dark > 0.5 ? `${SHADOW.dark}, inset 0 0 0 1px ${rgba(C.white, 0.08)}, inset 0 1px 0 ${rgba(C.white, 0.12)}` : `${SHADOW.e3}, inset 0 0 0 1px ${rgba(C.ink, 0.05)}`,
            opacity: capIn,
            transform: `scale(${0.92 + 0.08 * capIn})`,
            fontFamily: FONT,
            display: "flex",
            alignItems: "center",
            padding: "0 26px 0 22px",
            boxSizing: "border-box",
            gap: 16,
          }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 26, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="check" color={C.white} size={26} stroke={2.8} />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 600, color: fg, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums" }}>{COPY.end.capsuleAmt}</div>
            <div style={{ fontSize: 16, color: sub, marginTop: 1 }}>{COPY.end.capsuleSub}</div>
          </div>
          <div style={{ marginLeft: "auto", height: 34, padding: "0 16px", borderRadius: 17, background: rgba(C.orange, 0.16), color: dark > 0.5 ? C.soft : C.deep, display: "flex", alignItems: "center", fontSize: 15, fontWeight: 600 }}>{COPY.end.paid}</div>
        </div>
      )}
    </>
  );
};

/** Scene 8 title, set above the stroke's final underline. */
export const EndTitle: React.FC<{ f: number }> = ({ f }) => {
  if (f < 1050) return null;
  const words = ["JUST", "A", "TAP"];
  return (
    <div style={{ position: "absolute", left: 0, width: 1920, top: 470, display: "flex", justifyContent: "center", gap: 34, fontFamily: FONT, fontSize: 152, fontWeight: 600, letterSpacing: -5, color: C.cream, lineHeight: 1 }}>
      {words.map((w, i) => {
        const p = sp(f, 1064 + i * 4, SPRING.settle);
        return (
          <span key={w} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 14, marginBottom: -14 }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 170}px)`, opacity: Math.min(1, p * 1.6) }}>
              {w}
              {i === 2 && <span style={{ color: C.orange }}>.</span>}
            </span>
          </span>
        );
      })}
    </div>
  );
};
