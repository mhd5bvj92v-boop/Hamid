import React from "react";
import { COPY } from "../data/copy";
import { C, FONT, rgba } from "../theme";
import { Glyph } from "./Icons";

export const CARD_W = 620;
export const CARD_H = 391; // ISO 85.6 × 54 ratio

/** Card-local anchors for the focus ring (x, y, w, h from the card's top-left). */
export const CARD_SPOTS = {
  label: { x: 30, y: 26, w: 172, h: 70 },
  digits: { x: 30, y: 318, w: 196, h: 46 },
  glyph: { x: CARD_W - 86, y: 24, w: 58, h: 58 },
};

/** Generic debit card, drawn at 620×391 and scaled by its parent. */
export const CardFace: React.FC<{ light?: number; glyphColor?: string; glyphOpacity?: number }> = ({ light = 1, glyphColor = C.cream, glyphOpacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 30,
      overflow: "hidden",
      background: C.surface,
      fontFamily: FONT,
      color: C.cream,
      boxShadow: `inset 0 0 0 1px ${rgba(C.white, 0.08)}, inset 0 1px 0 ${rgba(C.white, 0.14)}`,
    }}
  >
    {/* light living inside the card: warm field rising from the lower right */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse 75% 85% at 88% 118%, ${rgba(C.orange, 0.85 * light)} 0%, ${rgba(C.deep, 0.45 * light)} 32%, ${rgba(C.surface, 0)} 68%)`,
      }}
    />
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${rgba(C.white, 0.06)} 0%, ${rgba(C.white, 0)} 40%)` }} />
    {/* fine guilloche: two faint arcs */}
    <svg width={CARD_W} height={CARD_H} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M ${CARD_W * 0.35} ${CARD_H + 20} C ${CARD_W * 0.55} ${CARD_H * 0.4}, ${CARD_W * 0.8} ${CARD_H * 0.3}, ${CARD_W + 30} ${CARD_H * 0.05}`} stroke={rgba(C.white, 0.06)} strokeWidth={1} fill="none" />
      <path d={`M ${CARD_W * 0.45} ${CARD_H + 20} C ${CARD_W * 0.62} ${CARD_H * 0.5}, ${CARD_W * 0.84} ${CARD_H * 0.42}, ${CARD_W + 30} ${CARD_H * 0.2}`} stroke={rgba(C.white, 0.05)} strokeWidth={1} fill="none" />
    </svg>
    {/* label */}
    <div style={{ position: "absolute", left: 38, top: 34 }}>
      <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: -0.4 }}>{COPY.card.name}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: rgba(C.cream, 0.55), marginTop: 6 }}>{COPY.card.type}</div>
    </div>
    {/* contactless glyph */}
    <div style={{ position: "absolute", left: CARD_W - 80, top: 33, opacity: glyphOpacity }}>
      <Glyph size={44} color={glyphColor} stroke={2.6} />
    </div>
    {/* chip */}
    <div
      style={{
        position: "absolute",
        left: 40,
        top: 158,
        width: 70,
        height: 52,
        borderRadius: 11,
        background: `linear-gradient(135deg, ${C.soft} 0%, #E9A77A 55%, #F7CDAE 100%)`,
        boxShadow: `inset 0 0 0 1px ${rgba(C.ink, 0.18)}`,
        overflow: "hidden",
      }}
    >
      <svg width={70} height={52} style={{ position: "absolute" }} fill="none" stroke={rgba(C.ink, 0.28)} strokeWidth={1.2}>
        <path d="M0 18 H24 M0 34 H24 M46 18 H70 M46 34 H70 M24 0 V52 M46 0 V52" />
        <rect x={24} y={14} width={22} height={24} rx={5} />
      </svg>
    </div>
    {/* number + expiry */}
    <div style={{ position: "absolute", left: 38, bottom: 34, fontSize: 28, fontWeight: 500, letterSpacing: 1.5, fontVariantNumeric: "tabular-nums" }}>{COPY.card.digits}</div>
    <div style={{ position: "absolute", right: 38, bottom: 32, textAlign: "right" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.4, color: rgba(C.cream, 0.45) }}>VALID THRU</div>
      <div style={{ fontSize: 19, fontWeight: 500, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{COPY.card.valid}</div>
    </div>
  </div>
);
