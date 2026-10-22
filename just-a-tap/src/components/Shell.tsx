import React from "react";
import { COPY } from "../data/copy";
import { PHONE_GLYPH, cardLocal, shellAt } from "../data/tracks";
import { EASE, SPRING } from "../theme";
import { C, FONT, R, SHADOW, rgba } from "../theme";
import { lerp, pressAt, sp, track, tween } from "../lib/anim";
import { CARD_H, CARD_SPOTS, CARD_W, CardFace } from "./CardFace";
import { Glyph, Icon } from "./Icons";

const Money: React.FC<{ v: number; size: number; color: string; dim?: number }> = ({ v, size, color, dim = 0.42 }) => {
  const [i, d] = v.toFixed(2).split(".");
  const int = Number(i).toLocaleString("en-US");
  return (
    <span style={{ fontSize: size, fontWeight: 600, letterSpacing: -size * 0.03, color, fontVariantNumeric: "tabular-nums" }}>
      €{int}
      <span style={{ opacity: dim }}>.{d}</span>
    </span>
  );
};
export { Money };

/** Wallet panel content (scene 1). Shell-local coords, 700 × 820. */
const PanelContent: React.FC<{ f: number; o: number }> = ({ f, o }) => {
  const row = (i: number) => sp(f, 10 + i * 3, SPRING.ui);
  const st = (p: number): React.CSSProperties => ({ opacity: Math.min(1, p * 1.4) * o, transform: `translateY(${(1 - p) * 16}px)` });
  const bal = track(f, [[34, 2150.2], [96, COPY.wallet.balance]], EASE.out);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: C.ink }}>
      <div style={{ position: "absolute", left: 40, top: 30, fontSize: 32, fontWeight: 600, letterSpacing: -0.8, ...st(row(0)) }}>{COPY.wallet.title}</div>
      <div style={{ position: "absolute", right: 40, top: 28, width: 210, height: 42, borderRadius: 21, background: C.track, ...st(row(1)) }}>
        <div style={{ position: "absolute", left: 4, top: 4, width: 102, height: 34, borderRadius: 17, background: C.white, boxShadow: SHADOW.e1 }} />
        {COPY.wallet.tabs.map((t, i) => (
          <div key={t} style={{ position: "absolute", left: 4 + i * 102, top: 4, width: 102, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? C.ink : C.mute }}>
            {t}
          </div>
        ))}
      </div>
      {/* pager */}
      <div style={{ position: "absolute", left: 350 - 25, top: 506, display: "flex", gap: 6, ...st(row(3)) }}>
        <div style={{ width: 22, height: 6, borderRadius: 3, background: C.orange }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, background: rgba(C.ink, 0.15) }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, background: rgba(C.ink, 0.15) }} />
      </div>
      {/* balance */}
      <div style={{ position: "absolute", left: 40, top: 540, ...st(row(4)) }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: C.mute }}>{COPY.wallet.balanceLabel}</div>
        <div style={{ marginTop: 2 }}>
          <Money v={bal} size={56} color={C.ink} />
        </div>
      </div>
      <div style={{ position: "absolute", right: 40, top: 586, height: 34, padding: "0 14px", borderRadius: 17, background: C.track, display: "flex", alignItems: "center", fontSize: 15, fontWeight: 500, color: C.mute, ...st(row(5)) }}>
        {COPY.wallet.today}
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 652, height: 1, background: rgba(C.ink, 0.07), ...st(row(5)) }} />
      <div style={{ position: "absolute", left: 40, top: 672, fontSize: 13, fontWeight: 600, letterSpacing: 1.2, color: C.mute, ...st(row(6)) }}>{COPY.wallet.recent}</div>
      <div style={{ position: "absolute", right: 40, top: 669, fontSize: 15, fontWeight: 500, color: C.deep, ...st(row(6)) }}>{COPY.wallet.seeAll}</div>
      {COPY.wallet.rows.map((r, i) => (
        <div key={r.name} style={{ position: "absolute", left: 40, right: 40, top: 704 + i * 58, height: 50, display: "flex", alignItems: "center", ...st(row(7 + i)) }}>
          <div style={{ width: 44, height: 44, borderRadius: R.m, background: C.track, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={r.icon} color={C.ink} size={22} />
          </div>
          <div style={{ marginLeft: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 14, color: C.mute, marginTop: 1 }}>{r.sub}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.amt}</div>
        </div>
      ))}
    </div>
  );
};

/** Phone screen content. Shell-local coords, 404 × 840 (screen inset 10). */
const PhoneContent: React.FC<{ f: number; o: number; state: number; glyphLeft: number }> = ({ f, o, state, glyphLeft }) => {
  const row = (i: number) => sp(f, 184 + i * 3, SPRING.ui);
  const st = (p: number): React.CSSProperties => ({ opacity: Math.min(1, p * 1.4) * o, transform: `translateY(${(1 - p) * 14}px)` });
  // READY → PAYING → DONE (scene 4)
  const label = state < 1 ? COPY.phone.ready : state < 2 ? COPY.phone.paying : COPY.phone.done;
  const pulse = 0.5 + 0.5 * Math.sin((f / 60) * Math.PI * 2 * 0.9);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: C.ink }}>
      <div style={{ position: "absolute", left: 36, top: 22, fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums", ...st(row(0)) }}>{COPY.phone.time}</div>
      <div style={{ position: "absolute", right: 34, top: 25, display: "flex", gap: 3, alignItems: "flex-end", ...st(row(0)) }}>
        {[5, 7, 9, 11].map((h) => (
          <div key={h} style={{ width: 3, height: h, borderRadius: 1, background: C.ink }} />
        ))}
        <div style={{ width: 22, height: 11, borderRadius: 3, border: `1.4px solid ${C.ink}`, marginLeft: 6, padding: 1.5, boxSizing: "border-box" }}>
          <div style={{ width: "72%", height: "100%", borderRadius: 1, background: C.ink }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 28, top: 62, fontSize: 28, fontWeight: 600, letterSpacing: -0.7, ...st(row(1)) }}>{COPY.wallet.title}</div>
      <div style={{ position: "absolute", right: 26, top: 62, width: 36, height: 36, borderRadius: 18, boxShadow: `inset 0 0 0 1px ${rgba(C.ink, 0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", ...st(row(1)) }}>
        <Icon name="plus" color={C.ink} size={18} />
      </div>
      {/* pager */}
      <div style={{ position: "absolute", left: 202 - 19, top: 346, display: "flex", gap: 5, ...st(row(2)) }}>
        <div style={{ width: 18, height: 5, borderRadius: 3, background: C.orange }} />
        <div style={{ width: 5, height: 5, borderRadius: 3, background: rgba(C.ink, 0.15) }} />
        <div style={{ width: 5, height: 5, borderRadius: 3, background: rgba(C.ink, 0.15) }} />
      </div>
      {/* READY TO PAY row */}
      <div style={{ position: "absolute", left: 22, right: 22, top: 372, height: 104, borderRadius: R.l, background: C.white, boxShadow: `${SHADOW.e2}, inset 0 0 0 1px ${rgba(C.ink, 0.05)}`, ...st(row(3)) }}>
        <div style={{ position: "absolute", left: 14, top: 26, width: 52, height: 52, borderRadius: 16, background: rgba(C.orange, 0.12 + 0.06 * pulse * (state < 1 ? 1 : 0)) }} />
        <div style={{ position: "absolute", left: 26, top: 32, opacity: 1 - glyphLeft * 0.85 }}>
          <Glyph size={40} color={state >= 2 ? C.deep : C.orange} stroke={2.6} />
        </div>
        <div style={{ position: "absolute", left: 82, top: 27 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.3, color: C.deep }}>{label}</div>
          <div style={{ fontSize: 19, fontWeight: 500, marginTop: 4 }}>{COPY.phone.hint}</div>
        </div>
        <div style={{ position: "absolute", right: 16, top: 40 }}>
          {state >= 2 ? <Icon name="check" color={C.deep} size={24} stroke={2.4} /> : <Icon name="chev" color={C.neutral} size={22} />}
        </div>
      </div>
      {/* balance */}
      <div style={{ position: "absolute", left: 28, top: 500, ...st(row(4)) }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: C.mute }}>{COPY.wallet.balanceLabel}</div>
        <Money v={COPY.wallet.balance} size={40} color={C.ink} />
      </div>
      <div style={{ position: "absolute", left: 22, right: 22, top: 590, height: 1, background: rgba(C.ink, 0.07), ...st(row(5)) }} />
      <div style={{ position: "absolute", left: 28, right: 28, top: 606, display: "flex", alignItems: "center", ...st(row(5)) }}>
        <div style={{ width: 40, height: 26, borderRadius: 6, background: C.surface, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 90% 120%, ${rgba(C.orange, 0.8)} 0%, rgba(0,0,0,0) 70%)` }} />
        </div>
        <div style={{ marginLeft: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{COPY.card.name}</div>
          <div style={{ fontSize: 13, color: C.mute, letterSpacing: 0.5 }}>{COPY.card.digits}</div>
        </div>
        <div style={{ marginLeft: "auto", height: 28, padding: "0 12px", borderRadius: 14, background: rgba(C.orange, 0.12), color: C.deep, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" }}>{COPY.phone.defaultPill}</div>
      </div>
      <div style={{ position: "absolute", left: 28, top: 668, fontSize: 12, fontWeight: 600, letterSpacing: 1.1, color: C.mute, ...st(row(6)) }}>{COPY.wallet.recent}</div>
      {COPY.wallet.rows.map((r, i) => (
        <div key={r.name} style={{ position: "absolute", left: 28, right: 28, top: 692 + i * 50, height: 42, display: "flex", alignItems: "center", ...st(row(7 + i)) }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: C.track, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={r.icon} color={C.ink} size={18} />
          </div>
          <div style={{ marginLeft: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: C.mute }}>{r.sub}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.amt}</div>
        </div>
      ))}
      {/* home indicator */}
      <div style={{ position: "absolute", left: 202 - 64, bottom: 18, width: 128, height: 5, borderRadius: 3, background: rgba(C.ink, 0.85 * o) }} />
    </div>
  );
};

/** Wallet panel that morphs into a phone, with the card parented inside. */
export const Shell: React.FC<{ f: number; phoneState: number; glyphLeft: number }> = ({ f, phoneState, glyphLeft }) => {
  const s = shellAt(f);
  const { rect, m } = s;
  if (s.opacity <= 0.001) return null;
  const bezel = 10 * tween(m, 0.15, 1);
  const panelO = 1 - tween(f, 154, 178, EASE.exit);
  const phoneO = tween(f, 184, 194);
  const c = cardLocal(f, m);
  const cs = c.w / CARD_W;
  // focus ring hops across the card (scene 1)
  const hops = [CARD_SPOTS.label, CARD_SPOTS.digits, CARD_SPOTS.glyph];
  const hopT = [44, 78, 112];
  const k1 = sp(f, hopT[1], SPRING.ui);
  const k2 = sp(f, hopT[2], SPRING.ui);
  const lerpSpot = (a: typeof hops[0], b: typeof hops[0], t: number) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
  const spot = lerpSpot(lerpSpot(hops[0], hops[1], k1), hops[2], k2);
  const ringO = tween(f, hopT[0] - 6, hopT[0] + 4) * (1 - tween(f, 140, 156));
  const ringPress = pressAt(f, hopT[0], 10) + pressAt(f, hopT[1] + 6, 10) + pressAt(f, hopT[2] + 6, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x - rect.w / 2,
        top: rect.y - rect.h / 2,
        width: rect.w,
        height: rect.h,
        transform: `rotate(${s.rot}deg) scale(${s.scale})`,
        opacity: s.opacity,
      }}
    >
      {/* body: bezel grows from 0 as the panel becomes a phone */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: rect.r,
          background: m > 0.05 ? C.ink : C.cream,
          boxShadow: `${SHADOW.e3}, inset 0 0 0 1px ${rgba(C.ink, 0.06)}`,
        }}
      />
      {/* side keys */}
      <div style={{ position: "absolute", right: -3, top: 210, width: 3, height: 90 * m, borderRadius: 2, background: C.ink, opacity: m }} />
      <div style={{ position: "absolute", left: -3, top: 180, width: 3, height: 54 * m, borderRadius: 2, background: C.ink, opacity: m }} />
      <div style={{ position: "absolute", left: -3, top: 250, width: 3, height: 54 * m, borderRadius: 2, background: C.ink, opacity: m }} />
      {/* screen */}
      <div style={{ position: "absolute", inset: bezel, borderRadius: Math.max(8, rect.r - bezel), background: C.cream, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 90% 50% at 50% 0%, ${rgba(C.white, 0.9)} 0%, ${rgba(C.white, 0)} 70%)` }} />
        <div style={{ position: "absolute", left: -bezel, top: -bezel, width: rect.w, height: rect.h }}>
          {panelO > 0.001 && <PanelContent f={f} o={panelO} />}
          {phoneO > 0.001 && <PhoneContent f={f} o={phoneO} state={phoneState} glyphLeft={glyphLeft} />}
        </div>
      </div>
      {/* card, parented to the shell */}
      <div
        style={{
          position: "absolute",
          left: c.x - CARD_W / 2,
          top: c.y - CARD_H / 2,
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${cs}) rotate(${c.rot}deg)`,
          opacity: c.opacity,
          filter: `drop-shadow(0 ${24 * cs}px ${30 * cs}px ${rgba(C.deep, 0.28)})`,
        }}
      >
        <CardFace />
        <div
          style={{
            position: "absolute",
            left: spot.x - 6,
            top: spot.y - 6,
            width: spot.w + 12,
            height: spot.h + 12,
            borderRadius: 16,
            boxShadow: `0 0 0 2.5px ${C.orange}, 0 0 0 7px ${rgba(C.orange, 0.18)}`,
            opacity: ringO,
            transform: `scale(${1 - 0.04 * ringPress})`,
          }}
        />
      </div>
    </div>
  );
};
