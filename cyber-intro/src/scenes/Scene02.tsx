import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Browser, CONTENT_TOP, WIN } from "../components/Browser";
import { CameraRig } from "../components/CameraRig";
import { ConnectionPaths, Conn } from "../components/ConnectionPaths";
import { Cursor, P, cubic } from "../components/Cursor";
import { CLICK, CURSOR_HANDOFF, DIVE_NODE, DIVE_SCALE, cam12, expandAt } from "../data/handoffs";
import { COPY, SCENES } from "../data/storyboard";
import { C, EASE, FONT, SPRING, rgba } from "../theme";

const START = SCENES.s2.start;
const CW = WIN.w;
const CH = WIN.h - CONTENT_TOP;
// window content origin in screen space (pre-camera)
const OX = WIN.x - WIN.w / 2;
const OY = WIN.y - WIN.h / 2 + CONTENT_TOP;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Abstract page block that cascades in. */
const Block: React.FC<{ x: number; y: number; w: number; h: number; p: number; r?: number; fill?: string; children?: React.ReactNode }> = ({ x, y, w, h, p, r = 18, fill = "rgba(255,255,255,0.04)", children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: r,
      background: fill,
      opacity: Math.min(1, p * 1.3),
      transform: `translateY(${(1 - p) * 26}px) scale(${0.96 + 0.04 * p})`,
      overflow: "hidden",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)",
    }}
  >
    {children}
  </div>
);

const Bar: React.FC<{ x: number; y: number; w: number; h?: number; o?: number }> = ({ x, y, w, h = 14, o = 0.14 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h / 2, background: rgba(C.paper, o) }} />
);

// outgoing paths from the click; index 0 is the one the camera follows
const OUT: { p1: P; p2: P; p3: P }[] = [
  { p1: [1150, 640], p2: [980, 600], p3: DIVE_NODE },
  { p1: [1300, 760], p2: [1560, 700], p3: [1760, 470] },
  { p1: [1330, 900], p2: [1600, 980], p3: [1880, 900] },
  { p1: [1000, 760], p2: [640, 760], p3: [330, 620] },
  { p1: [1220, 700], p2: [1380, 420], p3: [1460, 240] },
  { p1: [1050, 960], p2: [700, 1000], p3: [420, 1060] },
  { p1: [1100, 700], p2: [800, 420], p3: [560, 300] },
];

export const Scene02: React.FC = () => {
  const f = useCurrentFrame();
  const g = f + START;
  const { fps } = useVideoConfig();
  const expand = expandAt(g);

  const sp = (d: number, cfg = SPRING.entry) => spring({ frame: f - d, fps, config: cfg });

  // cookie sheet
  const sheetIn = sp(70, SPRING.entry);
  const sheetOut = interpolate(f, [142, 164], [0, 1], { ...clamp, easing: EASE.exit });
  const sheetY = (1 - sheetIn) * 260 + sheetOut * 300;

  // cursor: from handoff to Accept all
  const tc = interpolate(f, [56, 112], [0, 1], { ...clamp, easing: EASE.camera });
  let cur = cubic(CURSOR_HANDOFF, [1480, 900], [1250, 960], [CLICK[0] + 4, CLICK[1] + 6], tc);
  const tAway = interpolate(f, [140, 186], [0, 1], { ...clamp, easing: EASE.inOut });
  if (tAway > 0) cur = cubic([CLICK[0] + 4, CLICK[1] + 6], [1220, 930], [1400, 1000], [1560, 1040], tAway);
  const pressT = f - 118;
  const pressAmt = pressT >= 0 && pressT <= 16 ? Math.sin((pressT / 16) * Math.PI) : 0;
  const btnScale = 1 - 0.04 * pressAmt; // 1 → 0.96 → 1
  const curOpacity = interpolate(f, [176, 196], [1, 0], clamp);

  // click ring(s)
  const ring = (d: number) => {
    const t = interpolate(f, [120 + d, 168 + d], [0, 1], { ...clamp, easing: EASE.out });
    return { r: 10 + 380 * t, o: f < 120 + d ? 0 : (1 - t) * 0.9, w: 3 * (1 - t) + 0.6 };
  };

  // paths
  const conns: Conn[] = OUT.map((o, i) => {
    const d0 = 128 + i * 4;
    const draw = interpolate(f, [d0, d0 + 44], [0, 1], { ...clamp, easing: EASE.draw });
    const pk = interpolate(f, [d0 + 8, d0 + 62], [0, 1], { ...clamp, easing: EASE.inOut });
    const tail = interpolate(f, [200, 222], [1, 0], clamp);
    return { p0: CLICK, p1: o.p1, p2: o.p2, p3: o.p3, draw, packet: pk, width: i === 0 ? 2.4 : 1.6, opacity: (i === 0 ? 1 : 0.85) * tail };
  });

  // camera: follow path 0 into its end node
  const dive = interpolate(f, [166, 210], [0, 1], { ...clamp, easing: Easing_in });
  const s = cam12(g) * (1 + (DIVE_SCALE - 1) * dive);
  const tx = -s * (DIVE_NODE[0] - 960) * dive;
  const ty = -s * (DIVE_NODE[1] - 540) * dive;
  const pageFade = interpolate(f, [150, 196], [1, 0.0], { ...clamp, easing: EASE.inOut });
  const nodeIn = interpolate(f, [168, 186], [0, 1], clamp) * interpolate(f, [210, 222], [1, 0], clamp);

  // page blocks (content coordinates)
  const P_ = (i: number) => sp(16 + i * 3);
  return (
    <AbsoluteFill>
      <CameraRig scale={s} x={tx} y={ty}>
        <div style={{ opacity: pageFade, position: "absolute", inset: 0 }}>
          <Browser expand={expand} typed={COPY.url} caret={0}>
            {/* nav */}
            <Block x={40} y={12} w={120} h={22} r={11} p={P_(0)} fill={rgba(C.paper, 0.14)} />
            {[0, 1, 2].map((i) => (
              <Block key={i} x={CW - 380 + i * 110} y={14} w={80} h={18} r={9} p={P_(1 + i)} fill={rgba(C.paper, 0.08)} />
            ))}
            {/* hero copy */}
            <Block x={60} y={84} w={560} h={300} p={P_(2)} fill="rgba(0,0,0,0)">
              <Bar x={0} y={20} w={460} h={34} o={0.85} />
              <Bar x={0} y={70} w={360} h={34} o={0.85} />
              <Bar x={0} y={140} w={500} h={14} o={0.18} />
              <Bar x={0} y={168} w={430} h={14} o={0.18} />
              <div style={{ position: "absolute", left: 0, top: 220, width: 170, height: 52, borderRadius: 26, background: C.paper }} />
            </Block>
            {/* hero visual */}
            <Block x={700} y={74} w={620} h={320} r={24} p={P_(3)} fill="rgba(255,255,255,0.035)">
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 70% 60%, ${rgba(C.orange, 0.85)} 0%, ${rgba(C.orange, 0.25)} 28%, rgba(0,0,0,0) 58%)` }} />
              <div style={{ position: "absolute", left: 120, top: 70, width: 180, height: 180, borderRadius: 90, border: `1.5px solid ${rgba(C.paper, 0.25)}` }} />
              <div style={{ position: "absolute", left: 220, top: 120, width: 120, height: 120, borderRadius: 60, background: "linear-gradient(160deg, rgba(255,255,255,0.35), rgba(255,255,255,0.06))", backdropFilter: "blur(16px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 0 0 1px rgba(255,255,255,0.15)" }} />
            </Block>
            {/* cards row */}
            {[0, 1, 2, 3].map((i) => (
              <Block key={i} x={60 + i * 318} y={430} w={294} h={220} r={20} p={P_(5 + i)} fill="rgba(255,255,255,0.035)">
                <div style={{ position: "absolute", left: 14, top: 14, right: 14, height: 110, borderRadius: 12, background: `linear-gradient(${120 + i * 40}deg, ${rgba(C.orange, 0.15 + 0.12 * (i % 2))} 0%, ${rgba(C.paper, 0.06)} 100%)` }} />
                <Bar x={18} y={144} w={190 - i * 12} h={14} o={0.5} />
                <Bar x={18} y={172} w={140 + i * 10} h={12} o={0.16} />
              </Block>
            ))}
            {/* cookie sheet */}
            <div
              style={{
                position: "absolute",
                left: CW / 2 - 310,
                top: CH - 28 - 214 + sheetY,
                width: 620,
                height: 214,
                borderRadius: 24,
                background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%), rgba(22,22,24,0.72)",
                backdropFilter: "blur(30px) saturate(160%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px rgba(255,255,255,0.1), 0 30px 80px rgba(0,0,0,0.6)",
                opacity: interpolate(sheetIn, [0, 0.3], [0, 1], clamp) * (1 - sheetOut * 0.8),
                fontFamily: FONT,
                color: C.paper,
                padding: "26px 28px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width={28} height={28} viewBox="0 0 28 28">
                  <circle cx={14} cy={14} r={12} fill={C.warm} />
                  <circle cx={10} cy={11} r={2} fill={C.ink} />
                  <circle cx={17} cy={9} r={1.6} fill={C.ink} />
                  <circle cx={16} cy={17} r={2.2} fill={C.ink} />
                  <circle cx={9} cy={18} r={1.4} fill={C.ink} />
                </svg>
                <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: -0.3 }}>{COPY.cookieTitle}</div>
              </div>
              <div style={{ fontSize: 21, color: "#B4AFA7", marginTop: 10 }}>{COPY.cookieBody}</div>
              <div style={{ position: "absolute", right: 28, bottom: 26, display: "flex", gap: 14 }}>
                <div style={{ width: 130, height: 52, borderRadius: 26, border: `1.5px solid ${rgba(C.paper, 0.25)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 500 }}>
                  {COPY.cookieManage}
                </div>
                <div
                  style={{
                    width: 160,
                    height: 52,
                    borderRadius: 26,
                    background: C.paper,
                    color: C.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 600,
                    transform: `scale(${btnScale})`,
                    
                  }}
                >
                  {COPY.cookieAccept}
                </div>
              </div>
            </div>
          </Browser>
        </div>
        {/* click rings */}
        <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
          {[0, 9].map((d) => {
            const r = ring(d);
            return <circle key={d} cx={CLICK[0]} cy={CLICK[1]} r={r.r} fill="none" stroke={C.warm} strokeOpacity={r.o} strokeWidth={r.w} />;
          })}
        </svg>
        <ConnectionPaths conns={conns} id="s2" />
        {/* node the camera dives into */}
        <div
          style={{
            position: "absolute",
            left: DIVE_NODE[0] - 60,
            top: DIVE_NODE[1] - 60,
            width: 120,
            height: 120,
            borderRadius: 60,
            border: `1.5px solid ${rgba(C.orange, 0.8)}`,
            boxSizing: "border-box",
            transform: "scale(0.3)",
            opacity: nodeIn,
          }}
        />
        <div style={{ position: "absolute", left: DIVE_NODE[0] - 9, top: DIVE_NODE[1] - 9, width: 18, height: 18, borderRadius: 9, background: C.paper, opacity: nodeIn }} />
        {g >= 210 && <Cursor x={cur[0]} y={cur[1]} opacity={curOpacity} press={pressAmt} />}
      </CameraRig>
    </AbsoluteFill>
  );
};

// accelerate into the dive, settle at the end
const Easing_in = EASE.camera;
