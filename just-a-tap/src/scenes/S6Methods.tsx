import React from "react";
import { COPY } from "../data/copy";
import { CONFIRM } from "../data/tracks";
import { C, EASE, FONT, R, SHADOW, SPRING, rgba } from "../theme";
import { lerp, sp, track, tween } from "../lib/anim";
import { Icon } from "../components/Icons";
import { UNDERLINE } from "./S5Confirm";

export const ROW = { x: 960, w: 860, h: 104 };
const Y = { a: 404, b: 524, c: 644 };
const LEFT = ROW.x - ROW.w / 2;
/** World x of the selection rail when it sits on a row. */
export const RAIL_X = LEFT + 18;

const rowY = (f: number, key: string) => {
  const sw = tween(f, 846, 878, EASE.morph);
  if (key === "cash") return Y.a;
  if (key === "swipe") return lerp(Y.b, Y.c, sw);
  return lerp(Y.c, Y.b, sw);
};

/** Selection rail: approval underline → vertical rail that hops between rows. */
export const railRect = (f: number) => {
  const u = { x: CONFIRM.x - CONFIRM.w / 2 + UNDERLINE.x, y: CONFIRM.y - CONFIRM.h / 2 + UNDERLINE.y, w: UNDERLINE.w, h: 4 };
  // stage 1: the underline contracts to its left end; stage 2: it travels to the rows and grows tall
  const c = tween(f, 750, 768, EASE.exit);
  const m = tween(f, 766, 800, EASE.morph);
  const g = tween(f, 788, 806, EASE.out);
  const hopY = track(f, [[800, Y.a], [814, Y.a], [828, Y.b], [834, Y.b], [848, Y.c]], EASE.inOut);
  const y = f < 848 ? hopY : rowY(f, "tap");
  const h = 4 + 60 * g;
  const yy = f < 800 ? lerp(u.y + 2, Y.a, m) : y;
  return {
    x: lerp(u.x, RAIL_X, m),
    y: yy - h / 2,
    w: lerp(u.w, 4, c),
    h,
  };
};

export const MethodRows: React.FC<{ f: number }> = ({ f }) => {
  if (f < 756 || f > 960) return null;
  const sel = tween(f, 846, 866, EASE.out);
  const prog = tween(f, 856, 898, EASE.inOut);
  return (
    <>
      {/* section header */}
      <div style={{ position: "absolute", left: LEFT + 4, top: 268, fontFamily: FONT, opacity: tween(f, 778, 794) * (1 - tween(f, 900, 922)), transform: `translateY(${(1 - tween(f, 778, 800, EASE.out)) * 14}px)` }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: C.mute }}>HOW YOU PAID</div>
        <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.9, color: C.ink, marginTop: 6 }}>Payment method</div>
      </div>
      {/* coordinated tracks */}
      {Object.values(Y).map((y, i) => (
        <div key={y} style={{ position: "absolute", left: 160, right: 160, top: y, height: 1, background: rgba(C.ink, 0.06), opacity: tween(f, 770 + i * 3, 790 + i * 3) * (1 - tween(f, 900, 930)) }} />
      ))}
      {COPY.methods.map((m, i) => {
        const isTap = m.key === "tap";
        const inP = sp(f, 774 + i * 4, SPRING.settle);
        const exitP = tween(f, 900 + i * 3, 930 + i * 3, EASE.exit);
        const dim = isTap ? 0 : sel;
        const y = rowY(f, m.key);
        const x = (1 - inP) * 1150 - dim * 28 - exitP * 1300;
        const s = isTap ? 1 + 0.04 * sel : 1 - 0.02 * dim;
        const near = Math.max(0, 1 - Math.abs(railRect(f).y + 32 - y) / 60) * (f > 792 && f < 850 ? 1 : 0);
        return (
          <div
            key={m.key}
            style={{
              position: "absolute",
              left: LEFT + x,
              top: y - ROW.h / 2,
              width: ROW.w,
              height: ROW.h,
              borderRadius: R.l,
              background: C.white,
              boxShadow: isTap ? `${sel > 0.5 ? SHADOW.e3 : SHADOW.e2}, inset 0 0 0 1.5px ${rgba(C.orange, 0.55 * sel)}` : `${SHADOW.e1}, inset 0 0 0 1px ${rgba(C.ink, 0.06)}`,
              transform: `scale(${s})`,
              opacity: Math.min(1, inP * 1.5) * (1 - 0.4 * dim) * (1 - exitP),
              zIndex: isTap ? 3 : 1,
              fontFamily: FONT,
              color: C.ink,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 40, top: 24, width: 56, height: 56, borderRadius: R.m, background: isTap ? (sel > 0.5 ? C.orange : rgba(C.orange, 0.12)) : C.track, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={m.icon} color={isTap && sel > 0.5 ? C.white : C.ink} size={28} />
            </div>
            <div style={{ position: "absolute", left: 118, top: 22 }}>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.4 }}>{m.name}</div>
              <div style={{ fontSize: 17, color: near > 0.3 ? rgba(C.ink, 0.7) : C.mute, marginTop: 3 }}>{m.meta}</div>
            </div>
            {isTap ? (
              <div style={{ position: "absolute", right: 30, top: 34, height: 36, padding: "0 14px 0 10px", borderRadius: 18, background: rgba(C.orange, sel), color: sel > 0.5 ? C.ink : C.mute, display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 600, opacity: 0.4 + 0.6 * sel }}>
                <Icon name="check" color={sel > 0.5 ? C.ink : C.mute} size={18} stroke={2.4} />
                Selected
              </div>
            ) : (
              <div style={{ position: "absolute", right: 34, top: 40 }}>
                <Icon name="chev" color={C.neutral} size={24} />
              </div>
            )}
            {isTap && <div style={{ position: "absolute", left: 118, bottom: 0, width: (ROW.w - 118 - 30) * prog, height: 3, borderRadius: 2, background: rgba(C.orange, 0.7) }} />}
          </div>
        );
      })}
    </>
  );
};
