import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Card } from "../components/Card";
import { CameraRig } from "../components/CameraRig";
import { Cursor, cubic, P } from "../components/Cursor";
import { PrivacyToggle } from "../components/PrivacyToggle";
import { MERGE, RING_HANDOFF } from "../data/handoffs";
import { COPY } from "../data/storyboard";
import { C, EASE, FONT, SPRING, rgba } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CX = [480, 960, 1440];
const CY = 620;
const CW = 420;
const CH = 380;
const ACT = [76, 120, 164]; // click frame per card
const CTRL_Y = CY - CH / 2 + 196; // control row centre
const HEADER = { ring: [800, 236] as P, r: 26 };

export const Scene05: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ring → header indicator
  const up = interpolate(f, [0, 40], [0, 1], { ...clamp, easing: EASE.camera });
  const ringX = RING_HANDOFF.x + (HEADER.ring[0] - RING_HANDOFF.x) * up;
  const ringY = RING_HANDOFF.y + (HEADER.ring[1] - RING_HANDOFF.y) * up;
  const ringR = RING_HANDOFF.r + (HEADER.r - RING_HANDOFF.r) * up;
  const done = ACT.filter((a) => f >= a + 6).length;
  const arc = spring({ frame: f - 30, fps, config: SPRING.soft }) * 0.25 + ACT.reduce((s, a) => s + 0.25 * spring({ frame: f - a - 6, fps, config: SPRING.soft }), 0);

  // the three cards slide together and become one window (scene 6's frame)
  const col = interpolate(f, [208, 238], [0, 1], { ...clamp, easing: EASE.inOut });
  const morph = interpolate(f, [226, 270], [0, 1], { ...clamp, easing: EASE.camera });

  const camS = interpolate(f, [0, 220], [1.12, 1.08], { ...clamp, easing: EASE.inOut });

  // cursor path through the three controls
  const tgt = (i: number): P => [CX[i] + 120, CTRL_Y + 6];
  const legs: [number, number, P, P][] = [
    [46, ACT[0], [700, 1040], tgt(0)],
    [ACT[0] + 12, ACT[1], tgt(0), tgt(1)],
    [ACT[1] + 12, ACT[2], tgt(1), tgt(2)],
    [ACT[2] + 14, 214, tgt(2), [1700, 1000]],
  ];
  let cur: P = legs[0][2];
  for (const [a, b, p0, p3] of legs) {
    if (f >= a) cur = cubic(p0, [p0[0] + 80, p0[1] - 60], [p3[0] - 80, p3[1] + 90], p3, interpolate(f, [a, b], [0, 1], { ...clamp, easing: EASE.camera }));
  }
  const press = (i: number) => (f >= ACT[i] && f <= ACT[i] + 14 ? Math.sin(((f - ACT[i]) / 14) * Math.PI) : 0);
  const curO = interpolate(f, [46, 60], [0, 1], clamp) * interpolate(f, [196, 214], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <CameraRig scale={camS}>
        {/* header */}
        <svg width={1920} height={1080} style={{ position: "absolute", opacity: 1 - col }}>
          <circle cx={ringX} cy={ringY} r={ringR} fill="none" stroke={rgba(C.paper, 0.14)} strokeWidth={5} />
          <circle
            cx={ringX}
            cy={ringY}
            r={ringR}
            fill="none"
            stroke={C.orange}
            strokeWidth={6 - up}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${Math.min(1, 1 - up + arc * up)} 1`}
            transform={`rotate(-90 ${ringX} ${ringY})`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: HEADER.ring[0] + 50,
            top: HEADER.ring[1] - 26,
            fontFamily: FONT,
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: -0.6,
            color: C.paper,
            opacity: interpolate(f, [24, 42], [0, 1], clamp) * (1 - col),
            transform: `translateX(${interpolate(f, [24, 50], [16, 0], { ...clamp, easing: EASE.out })}px)`,
          }}
        >
          {COPY.habitsTitle}
          <span style={{ color: C.mute, fontWeight: 500, fontSize: 26, marginLeft: 18 }}>{done}/3</span>
        </div>

        {COPY.habits.map((h, i) => {
          const pIn = spring({ frame: f - 14 - i * 3, fps, config: SPRING.entry });
          const spread = spring({ frame: f - 30 - i * 3, fps, config: SPRING.settle });
          const act = spring({ frame: f - ACT[i] - 4, fps, config: SPRING.press });
          const pop = act > 0 ? Math.sin(Math.min(1, act) * Math.PI) * 0.025 * Math.max(0, 1 - (f - ACT[i] - 4) / 30) : 0;
          // cluster near the ring, then spread into a balanced row
          const cx0 = 960 + (i - 1) * 60;
          const cy0 = 600 + (i - 1) * 10;
          let x = cx0 + (CX[i] - cx0) * spread;
          let y = cy0 + (CY - cy0) * spread;
          x = x + (CX[1] - x) * col;
          y = y + (CY - y) * col;
          const sc = 0.7 + 0.3 * pIn + pop;
          const check = interpolate(f, [ACT[i] + 8, ACT[i] + 30], [0, 1], { ...clamp, easing: EASE.draw });
          const stateT = interpolate(act, [0, 1], [0, 1], clamp);
          return (
            <Card key={h.title} x={x} y={y} w={CW} h={CH} radius={30} rim={0.25 + 0.6 * stateT} opacity={Math.min(1, pIn * 1.4) * (i === 1 ? interpolate(f, [228, 240], [1, 0], clamp) : 1 - col)} scale={sc}>
              <div style={{ position: "absolute", left: 34, top: 34, fontFamily: FONT, fontSize: 29, fontWeight: 600, color: C.paper, letterSpacing: -0.4 }}>{h.title}</div>
              <div style={{ position: "absolute", right: 34, top: 40, fontFamily: FONT, fontSize: 20, fontWeight: 500, color: C.mute }}>0{i + 1}</div>
              <div style={{ position: "absolute", left: 34, top: 82, width: CW - 68, height: 1, background: rgba(C.paper, 0.07) }} />
              {/* control row */}
              <div style={{ position: "absolute", left: 24, top: 150, width: CW - 48, height: 92, borderRadius: 20, background: rgba(C.paper, 0.05), boxShadow: `inset 0 0 0 1.5px ${rgba(C.orange, 0.5 * stateT)}` }}>
                <div style={{ position: "absolute", left: 22, top: 0, height: 92, display: "flex", alignItems: "center", fontFamily: FONT, fontSize: 22, fontWeight: 500, color: C.paperDim }}>
                  {i === 1 ? (
                    <span>
                      examp
                      <span style={{ color: stateT > 0.5 ? C.orange : C.paperDim, borderBottom: `2px solid ${rgba(C.orange, stateT)}` }}>1</span>
                      e.test/verify
                    </span>
                  ) : (
                    h.detail
                  )}
                </div>
                {i < 2 ? (
                  <div
                    style={{
                      position: "absolute",
                      right: 16,
                      top: 24,
                      height: 44,
                      padding: "0 16px",
                      borderRadius: 22,
                      display: "flex",
                      alignItems: "center",
                      fontFamily: FONT,
                      fontSize: 20,
                      fontWeight: 600,
                      color: stateT > 0.5 ? C.ink : C.paper,
                      background: stateT > 0.5 ? C.paper : rgba(C.paper, 0.1),
                      transform: `scale(${1 - 0.04 * press(i)})`,
                    }}
                  >
                    {stateT > 0.5 ? h.to : h.from}
                  </div>
                ) : (
                  <PrivacyToggle x={CW - 48 - 16 - 38} y={46} on={stateT} glow={0.5 * stateT} />
                )}
              </div>
              {/* confirmation stroke */}
              <svg width={CW} height={CH} style={{ position: "absolute", left: 0, top: 0 }}>
                <circle cx={52} cy={CH - 64} r={18} fill="none" stroke={C.orange} strokeWidth={2.4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - check} transform={`rotate(-90 52 ${CH - 64})`} />
                <path d={`M43 ${CH - 64} l6 6 l12 -12`} fill="none" stroke={C.warm} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - interpolate(check, [0.4, 1], [0, 1], clamp)} />
              </svg>
              <div style={{ position: "absolute", left: 84, top: CH - 78, fontFamily: FONT, fontSize: 22, fontWeight: 500, color: C.warm, opacity: check, transform: `translateX(${(1 - check) * 10}px)` }}>{h.done}</div>
            </Card>
          );
        })}
        <Cursor x={cur[0]} y={cur[1]} opacity={curO} press={press(0) + press(1) + press(2)} />
        {f >= 226 && f < 270 && (() => {
          // camera-space geometry that lands exactly on MERGE in screen space
          const tx = 960 + (MERGE.x - 960) / camS;
          const ty = 540 + (MERGE.y - 540) / camS;
          const w = CW + (MERGE.w / camS - CW) * morph;
          const h = CH + (MERGE.h / camS - CH) * morph;
          const x = CX[1] + (tx - CX[1]) * morph;
          const y = CY + (ty - CY) * morph;
          const r = 30 + (MERGE.r / camS - 30) * morph;
          return (
            <div
              style={{
                position: "absolute",
                left: x - w / 2,
                top: y - h / 2,
                width: w,
                height: h,
                borderRadius: r,
                background: "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 100%), rgba(16,16,18,0.55)",
                backdropFilter: "blur(30px) saturate(160%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.08), 0 40px 120px rgba(0,0,0,0.5)",
                opacity: interpolate(f, [226, 232], [0, 1], clamp),
              }}
            />
          );
        })()}
      </CameraRig>
    </AbsoluteFill>
  );
};
