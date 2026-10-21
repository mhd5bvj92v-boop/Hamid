import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig } from "../components/CameraRig";
import { ConnectionPaths, Conn } from "../components/ConnectionPaths";
import { P } from "../components/Cursor";
import { DIVE_NODE, DIVE_SCALE, TOGGLE_HANDOFF } from "../data/handoffs";
import { COPY, SCENES } from "../data/storyboard";
import { C, EASE, FONT, SPRING, rgba, seeded } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const HUB: P = [960, 540];
// page the camera dived through, in this scene's space (hub = the dive node)
const PAGE = { x: 960, y: 540 + (556 - DIVE_NODE[1]), w: 1380, h: 776 };

type N = { p: P; z: number };
const NODES: N[] = [
  { p: [560, 400], z: 0.85 },
  { p: [700, 650], z: 1 },
  { p: [1210, 360], z: 0.8 },
  { p: [1370, 610], z: 1 }, // selected → becomes the toggle
  { p: [1530, 420], z: 0.75 },
  { p: [400, 600], z: 0.72 },
  { p: [840, 320], z: 0.78 },
  { p: [1090, 730], z: 0.9 },
  { p: [1660, 690], z: 0.7 },
  { p: [300, 380], z: 0.65 },
];
const SEL = 3;
const EDGES: [number, number][] = [
  [0, 9], [2, 4], [3, 8], [1, 5], [6, 2], [7, 3],
];
const PUSH = 2.42; // node r=12 → 58px knob on screen

const ctrl = (a: P, b: P, i: number): [P, P] => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const nx = -(b[1] - a[1]);
  const ny = b[0] - a[0];
  const k = (seeded(i + 11) - 0.5) * 0.7;
  return [
    [a[0] + (mx - a[0]) * 0.6 + nx * k, a[1] + (my - a[1]) * 0.6 + ny * k],
    [b[0] - (b[0] - mx) * 0.6 + nx * k * 0.6, b[1] - (b[1] - my) * 0.6 + ny * k * 0.6],
  ];
};

export const Scene03: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // camera: pull back out of the dive, slow drift, then push into the selected node
  const pull = interpolate(f, [0, 56], [0, 1], { ...clamp, easing: EASE.camera });
  const drift = interpolate(f, [56, 222], [0, 1], { ...clamp, easing: EASE.inOut });
  const push = interpolate(f, [218, 254], [0, 1], { ...clamp, easing: EASE.camera });
  const base = DIVE_SCALE + (1 - DIVE_SCALE) * pull + 0.05 * drift;
  const sel = NODES[SEL].p;
  const s = base + (PUSH - base) * push;
  const tx = -s * (sel[0] - 960) * push;
  const ty = -s * (sel[1] - 540) * push;
  const par = -40 * drift; // parallax drift for depth

  // page: solid → outline → wireframe floor
  const tilt = interpolate(f, [34, 110], [0, 1], { ...clamp, easing: EASE.camera });
  const grid = interpolate(f, [60, 110], [0, 1], clamp);
  const others = interpolate(f, [228, 256], [1, 0], { ...clamp, easing: EASE.exit });

  const conns: Conn[] = [];
  NODES.forEach((n, i) => {
    const [p1, p2] = ctrl(HUB, n.p, i);
    const d0 = 58 + i * 5;
    const draw = interpolate(f, [d0, d0 + 40], [0, 1], { ...clamp, easing: EASE.draw });
    const period = 84 + Math.round(seeded(i) * 40);
    const ph = (f - d0 - 30 + Math.round(seeded(i + 5) * period)) / period;
    const frac = ph - Math.floor(ph);
    const packet = draw >= 1 ? EASE.inOut(frac) : null;
    const isSel = i === SEL;
    conns.push({ p0: HUB, p1, p2, p3: n.p, draw, packet, width: 1.4 + n.z, opacity: (0.45 + 0.55 * n.z) * (isSel ? interpolate(f, [258, 280], [1, 0], clamp) : others) });
  });
  EDGES.forEach(([a, b], i) => {
    const [p1, p2] = ctrl(NODES[a].p, NODES[b].p, i + 40);
    const d0 = 100 + i * 6;
    const draw = interpolate(f, [d0, d0 + 36], [0, 1], { ...clamp, easing: EASE.draw });
    conns.push({ p0: NODES[a].p, p1, p2, p3: NODES[b].p, draw, packet: null, width: 1.1, opacity: 0.5 * others });
  });

  const labelIn = spring({ frame: f - 76, fps, config: SPRING.settle });
  const labelOut = interpolate(f, [200, 218], [0, 1], { ...clamp, easing: EASE.exit });

  // toggle morph (screen space), ends exactly as scene 4's starting toggle
  const grow = interpolate(f, [254, 270], [0, 1], { ...clamp, easing: EASE.out });
  const T = TOGGLE_HANDOFF;
  const trackH = 58 + (42 * T.scale - 58) * grow;
  const trackRight = 960 + 29 + 4 * T.scale;
  const trackW = 58 + (76 * T.scale - 58) * grow;

  return (
    <AbsoluteFill>
      <CameraRig scale={s} x={tx} y={ty}>
        {/* page plane */}
        <AbsoluteFill style={{ perspective: 1500, perspectiveOrigin: "50% 30%", opacity: others * interpolate(f, [0, 22], [0, 1], clamp) }}>
          <div
            style={{
              position: "absolute",
              left: PAGE.x - PAGE.w / 2,
              top: PAGE.y - PAGE.h / 2,
              width: PAGE.w,
              height: PAGE.h,
              borderRadius: 30,
              transformOrigin: "50% 50%",
              transform: `translateY(${tilt * 150}px) rotateX(${tilt * 66}deg) scale(${1 + tilt * 0.35})`,
              boxShadow: `inset 0 0 0 1.5px ${rgba(C.paper, 0.45 - 0.2 * tilt)}`,
              background: `radial-gradient(ellipse 60% 60% at 50% 45%, ${rgba(C.orange, 0.08 * grid)} 0%, rgba(0,0,0,0) 70%), ${rgba("#141416", 1 - pull)}`,
              overflow: "hidden",
            }}
          >
            {/* wireframe grid */}
            <svg width={PAGE.w} height={PAGE.h} style={{ position: "absolute", opacity: grid }}>
              {Array.from({ length: 24 }, (_, i) => (
                <line key={`v${i}`} x1={i * 60} y1={0} x2={i * 60} y2={PAGE.h} stroke={C.orange} strokeOpacity={0.1} strokeWidth={1} />
              ))}
              {Array.from({ length: 14 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i * 60} x2={PAGE.w} y2={i * 60} stroke={C.orange} strokeOpacity={0.1} strokeWidth={1} />
              ))}
            </svg>
            {/* page layout as outlines */}
            {[
              [60, 172, 560, 300],
              [700, 162, 620, 320],
              [60, 518, 294, 220],
              [378, 518, 294, 220],
              [696, 518, 294, 220],
              [1014, 518, 294, 220],
              [470, 30, 440, 50],
            ].map(([x, y, w, h], i) => (
              <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: i === 6 ? 25 : 18, border: `1.5px solid ${rgba(C.paper, 0.32)}` }} />
            ))}
          </div>
        </AbsoluteFill>

        <ConnectionPaths conns={conns} id="s3" />

        {/* nodes */}
        {NODES.map((n, i) => {
          const pIn = spring({ frame: f - (54 + i * 5), fps, config: SPRING.entry });
          const isSel = i === SEL;
          const o = pIn * (isSel ? 1 : others) * (0.5 + 0.5 * n.z);
          const r = 12 * n.z * (isSel ? 1 / n.z : 1);
          const x = n.p[0] + par * (n.z - 0.85) * (isSel ? 0 : 1);
          const y = n.p[1] + (1 - pIn) * 40;
          const hide = isSel && f >= 254; // screen-space knob takes over
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: "absolute",
                  left: x - r,
                  top: y - r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  background: isSel ? C.paper : C.ink,
                  border: isSel ? "none" : `${1.6}px solid ${C.warm}`,
                  boxSizing: "border-box",
                  opacity: o * (hide ? 0 : 1),
                  transform: `scale(${0.4 + 0.6 * pIn})`,
                }}
              />
              {/* small token riding beside some nodes */}
              {i % 3 === 0 && !isSel && (
                <div
                  style={{
                    position: "absolute",
                    left: x + 22 + 6 * Math.sin((f + i * 20) / 40),
                    top: y - 30,
                    width: 26,
                    height: 16,
                    borderRadius: 5,
                    border: `1.3px solid ${rgba(C.paper, 0.5)}`,
                    opacity: o * 0.8,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
        {/* hub: the page's own node */}
        <div style={{ position: "absolute", left: HUB[0] - 9, top: HUB[1] - 9, width: 18, height: 18, borderRadius: 9, background: C.paper, opacity: others }} />
      </CameraRig>

      {/* label stays in screen space so it is sharp and readable */}
      <div
        style={{
          position: "absolute",
          top: 150,
          width: 1920,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 46,
          fontWeight: 600,
          letterSpacing: -1,
          color: C.paper,
          opacity: Math.min(1, labelIn * 1.3) * (1 - labelOut),
          transform: `translateY(${(1 - labelIn) * 18 - labelOut * 10}px)`,
        }}
      >
        {COPY.revealLabel.slice(0, -1)}
        <span style={{ color: C.orange }}>?</span>
      </div>

      {/* node → toggle */}
      {f >= 254 && f < 270 && (
        <>
          <div
            style={{
              position: "absolute",
              left: trackRight - trackW,
              top: 540 - trackH / 2,
              width: trackW,
              height: trackH,
              borderRadius: trackH / 2,
              background: `linear-gradient(90deg, ${C.orange} 0%, ${C.warm} 100%)`,
              opacity: grow,
            }}
          />
          <div style={{ position: "absolute", left: 960 - 29, top: 540 - 29, width: 58, height: 58, borderRadius: 29, background: C.paper, boxShadow: "0 3px 8px rgba(0,0,0,0.45)" }} />
        </>
      )}
    </AbsoluteFill>
  );
};
