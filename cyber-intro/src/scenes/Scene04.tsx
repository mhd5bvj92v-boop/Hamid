import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Card } from "../components/Card";
import { CameraRig } from "../components/CameraRig";
import { Cursor, cubic, P } from "../components/Cursor";
import { PrivacyToggle } from "../components/PrivacyToggle";
import { RING_HANDOFF, TOGGLE_HANDOFF } from "../data/handoffs";
import { COPY } from "../data/storyboard";
import { C, EASE, FONT, SPRING, rgba } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CARD = { x: 960, y: 540, w: 780, h: 540 };
const TOP = CARD.y - CARD.h / 2;
const ROW_Y = [TOP + 214, TOP + 324, TOP + 434];
const TOG_X = CARD.x + CARD.w / 2 - 44 - 38;
const HOVER = [92, 142, 192]; // frames the cursor reaches each row

const Icon: React.FC<{ i: number; color: string }> = ({ i, color }) => (
  <svg width={26} height={26} viewBox="0 0 26 26" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {i === 0 && (
      <>
        <path d="M13 23 C13 23 5 15.5 5 10.5 a8 8 0 0 1 16 0 C21 15.5 13 23 13 23 Z" />
        <circle cx={13} cy={10.5} r={2.8} />
      </>
    )}
    {i === 1 && (
      <>
        <rect x={3} y={8} width={20} height={14} rx={3.5} />
        <path d="M9 8 L10.5 5 H15.5 L17 8" />
        <circle cx={13} cy={15} r={3.6} />
      </>
    )}
    {i === 2 && (
      <>
        <circle cx={13} cy={13} r={8.5} />
        <circle cx={13} cy={13} r={2.4} />
        <path d="M13 1.5 V6 M13 20 V24.5 M1.5 13 H6 M20 13 H24.5" />
      </>
    )}
  </svg>
);

export const Scene04: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // camera: small lateral shift, gentle push
  const camX = interpolate(f, [0, 300], [0, -44], { ...clamp, easing: EASE.inOut });
  const camS = interpolate(f, [0, 300], [1, 1.035], { ...clamp, easing: EASE.inOut });

  // card grows around the handed-off toggle
  const grow = spring({ frame: f - 2, fps, config: SPRING.settle });
  const cw = 230 + (CARD.w - 230) * grow;
  const ch = 130 + (CARD.h - 130) * grow;
  const cardO = interpolate(f, [0, 10], [0, 1], clamp);

  // toggle travels from screen centre to row 3
  const tt = interpolate(f, [0, 34], [0, 1], { ...clamp, easing: EASE.camera });
  const tgX = TOGGLE_HANDOFF.x + (TOG_X - TOGGLE_HANDOFF.x) * tt;
  const tgY = TOGGLE_HANDOFF.y + (ROW_Y[2] - TOGGLE_HANDOFF.y) * tt;
  const tgS = TOGGLE_HANDOFF.scale + (1 - TOGGLE_HANDOFF.scale) * tt;

  // exit: row-3 switch slides off, its knob lifts out and becomes the ring
  const flip = spring({ frame: f - 236, fps, config: SPRING.press });
  const lift = interpolate(f, [252, 290], [0, 1], { ...clamp, easing: EASE.camera });
  const exit = interpolate(f, [250, 282], [0, 1], { ...clamp, easing: EASE.exit });

  // cursor visits each row
  const pts: P[] = [[1500, 1000], [1090, ROW_Y[0] + 8], [1110, ROW_Y[1] + 8], [1130, ROW_Y[2] + 8], [TOG_X + 6, ROW_Y[2] + 6]];
  const legs = [[62, HOVER[0]], [HOVER[0] + 18, HOVER[1]], [HOVER[1] + 18, HOVER[2]], [HOVER[2] + 18, 230]];
  let cur: P = pts[0];
  legs.forEach(([a, b], i) => {
    const t = interpolate(f, [a, b], [0, 1], { ...clamp, easing: EASE.camera });
    if (f >= a) {
      const p0 = pts[i];
      const p3 = pts[i + 1];
      cur = cubic(p0, [p0[0] + 40, p0[1] + 30], [p3[0] + 60, p3[1] - 20], p3, t);
    }
  });
  const curO = interpolate(f, [62, 76], [0, 1], clamp) * (1 - exit);
  const pressAmt = f >= 232 && f <= 246 ? Math.sin(((f - 232) / 14) * Math.PI) : 0;

  // orbiting concept chips
  const chips = COPY.orbit.map((label, i) => {
    const a = (f / 300) * Math.PI * 0.75 + (i * Math.PI * 2) / 3 + 0.4;
    const depth = Math.sin(a); // +1 = front (bottom), -1 = back (top)
    const pIn = spring({ frame: f - 48 - i * 8, fps, config: SPRING.entry });
    return {
      label,
      x: 960 + Math.cos(a) * 720,
      y: 540 + depth * 335,
      depth,
      s: (0.86 + 0.14 * depth) * (0.6 + 0.4 * pIn),
      o: pIn * (0.5 + 0.35 * (depth + 1) / 2) * (1 - exit),
    };
  });
  const chip = (c: (typeof chips)[number]) => (
    <div
      key={c.label}
      style={{
        position: "absolute",
        left: c.x - 100,
        top: c.y - 26,
        width: 200,
        height: 52,
        borderRadius: 26,
        background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)), rgba(18,18,20,0.6)",
        backdropFilter: "blur(20px) saturate(160%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 0 1px rgba(255,255,255,0.09), 0 16px 40px rgba(0,0,0,0.45)",
        color: C.paper,
        fontFamily: FONT,
        fontSize: 23,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: c.o,
        transform: `scale(${c.s})`,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: C.orange }} />
      {c.label}
    </div>
  );

  const streak = interpolate(f, [0, 300], [-300, 500]);

  return (
    <AbsoluteFill>
      <CameraRig scale={camS} x={camX}>
        {chips.filter((c) => c.depth < 0).map(chip)}
        {/* card */}
        <Card x={CARD.x} y={CARD.y} w={cw} h={ch} radius={32} rim={0.7} opacity={cardO * (1 - exit)} scale={1 - 0.06 * exit}>
          {/* diagonal light across the card */}
          <div style={{ position: "absolute", left: streak, top: -200, width: 260, height: 1000, transform: "rotate(28deg)", background: `linear-gradient(90deg, rgba(0,0,0,0), ${rgba(C.warm, 0.07)}, rgba(0,0,0,0))` }} />
          <div style={{ position: "absolute", left: 44, top: 44, fontFamily: FONT, opacity: interpolate(grow, [0.6, 1], [0, 1], clamp) }}>
            <div style={{ fontSize: 36, fontWeight: 600, color: C.paper, letterSpacing: -0.5 }}>{COPY.privacyTitle}</div>
            <div style={{ fontSize: 21, color: C.mute, marginTop: 8 }}>{COPY.privacySub}</div>
          </div>
        </Card>
        {/* rows (screen-aligned to the card) */}
        {COPY.rows.map((label, i) => {
          const pIn = spring({ frame: f - 26 - i * 6, fps, config: SPRING.entry });
          const hov = interpolate(f, [HOVER[i] - 4, HOVER[i] + 10], [0, 1], { ...clamp, easing: EASE.out });
          const active = interpolate(f, [HOVER[i] + 10, HOVER[i] + 40], [1, 0.55], clamp) * hov;
          const left = CARD.x - CARD.w / 2;
          return (
            <div key={label} style={{ opacity: Math.min(1, pIn * 1.3) * (1 - exit), transform: `translateX(${(1 - pIn) * 30}px)` }}>
              {i > 0 && <div style={{ position: "absolute", left: left + 44, top: ROW_Y[i] - 55, width: CARD.w - 88, height: 1, background: rgba(C.paper, 0.07) }} />}
              {/* diagnostic accent */}
              <div style={{ position: "absolute", left: left + 22, top: ROW_Y[i] - 40, width: CARD.w - 44, height: 80, borderRadius: 18, background: `linear-gradient(90deg, ${rgba(C.orange, 0.14 * active)} 0%, rgba(0,0,0,0) 70%)` }} />
              <div style={{ position: "absolute", left: left + 22, top: ROW_Y[i] - 22 * hov, width: 4, height: 44 * hov, borderRadius: 2, background: C.orange, opacity: hov }} />
              <div style={{ position: "absolute", left: left + 44, top: ROW_Y[i] - 26, width: 52, height: 52, borderRadius: 14, background: rgba(C.paper, 0.06), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon i={i} color={hov > 0.5 ? C.warm : C.paperDim} />
              </div>
              <div style={{ position: "absolute", left: left + 116, top: ROW_Y[i] - 32, fontFamily: FONT }}>
                <div style={{ fontSize: 27, fontWeight: 500, color: C.paper }}>{label}</div>
                <div style={{ fontSize: 20, marginTop: 4, color: hov > 0.5 ? C.warm : C.mute }}>{COPY.rowState[i]}{hov > 0.5 ? " · noticed" : ""}</div>
              </div>
              {i < 2 && <PrivacyToggle x={TOG_X} y={ROW_Y[i]} on={1} />}
            </div>
          );
        })}
        {/* handed-off toggle (row 3) */}
        <PrivacyToggle x={tgX} y={tgY} on={1 - flip} scale={tgS} glow={0} opacity={1 - exit} knobScale={f >= 252 ? 0 : 1} />
        {chips.filter((c) => c.depth >= 0).map(chip)}
        <Cursor x={cur[0]} y={cur[1]} opacity={curO} press={pressAmt} />
      </CameraRig>
      {/* knob lifts out of the switch and becomes the indicator ring (screen space) */}
      {f >= 252 && f < 300 && (() => {
        const k0x = 960 + camS * (TOG_X - 17 - 960) + camX; // knob centre after flip, in screen space
        const k0y = 540 + camS * (ROW_Y[2] - 540);
        const x = k0x + (RING_HANDOFF.x - k0x) * lift;
        const y = k0y + (RING_HANDOFF.y - k0y) * lift;
        const r = 17 + (RING_HANDOFF.r - 17) * lift;
        const fill = 1 - interpolate(lift, [0.3, 0.8], [0, 1], clamp);
        return (
          <svg width={1920} height={1080} style={{ position: "absolute" }}>
                        <circle cx={x} cy={y} r={r} fill={rgba(C.paper, fill)} stroke={C.orange} strokeWidth={6 * (1 - fill)} />
          </svg>
        );
      })()}
    </AbsoluteFill>
  );
};
