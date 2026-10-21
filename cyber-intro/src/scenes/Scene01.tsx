import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Browser } from "../components/Browser";
import { CameraRig } from "../components/CameraRig";
import { Cursor, cubic } from "../components/Cursor";
import { COPY } from "../data/storyboard";
import { CURSOR_HANDOFF, cam12, expandAt } from "../data/handoffs";
import { C, EASE, SPRING, rgba, seeded } from "../theme";

const TYPE_START = 72;
// slightly irregular, human typing rhythm (seeded)
const charTimes = COPY.url.split("").map((_, i) => TYPE_START + i * 4.6 + seeded(i + 3) * 2.4);

export const Scene01: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = f; // scene 1 starts at global 0

  // hairline that the bar unfolds from
  const line = interpolate(f, [8, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.out });
  const open = spring({ frame: f - 38, fps, config: SPRING.entry });
  const lineFade = interpolate(open, [0.2, 0.9], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const typedCount = charTimes.filter((t) => f >= t).length;
  const typing = f >= TYPE_START - 4 && f < charTimes[charTimes.length - 1] + 6;
  const caret = typing ? 1 : f < 30 ? (Math.floor(f / 16) % 2 === 0 ? 1 : 0) : Math.floor(f / 30) % 2 === 0 ? 1 : 0.15;

  // breathing ~1% scale, ~0.4 Hz
  const breathe = 1 + 0.008 * Math.sin((f / fps) * Math.PI * 2 * 0.4);
  const expand = expandAt(g);

  // cursor: curved approach to the go-button, click, drift aside
  const go: [number, number] = [1372, 542];
  const tIn = interpolate(f, [104, 160], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.camera });
  let cur = cubic([1620, 1010], [1600, 760], [1440, 620], go, tIn);
  const tOut = interpolate(f, [176, 210], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.inOut });
  if (tOut > 0) cur = cubic(go, [1420, 600], [1470, 700], CURSOR_HANDOFF, tOut);
  const press = spring({ frame: f - 166, fps, config: SPRING.press });
  const pressAmt = f >= 166 ? Math.max(0, Math.sin(Math.min(1, (f - 166) / 14) * Math.PI)) : 0;
  const curOpacity = interpolate(f, [104, 118], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const goOpacity = interpolate(open, [0.5, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(f, [176, 188], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const goScale = 1 - 0.08 * pressAmt;
  const flash = f >= 166 ? interpolate(f, [166, 172, 200], [0, 1, 0], { extrapolateRight: "clamp" }) : 0;

  const glow = (0.55 + 0.1 * Math.sin((f / fps) * Math.PI * 2 * 0.3)) * interpolate(f, [30, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <CameraRig scale={cam12(g) * breathe}>
        {/* warm floor glow under the bar */}
        <div
          style={{
            position: "absolute",
            left: 960 - 700,
            top: 540 - 220 + 120,
            width: 1400,
            height: 440,
            background: `radial-gradient(ellipse at 50% 40%, ${rgba(C.orange, 0.09 * glow * (1 - expand))} 0%, rgba(0,0,0,0) 65%)`,
          }}
        />
        {/* hairline */}
        <div
          style={{
            position: "absolute",
            left: 960 - 450 * line,
            top: 539,
            width: 900 * line,
            height: 2,
            borderRadius: 1,
            background: `linear-gradient(90deg, ${rgba(C.orange, 0)} 0%, ${C.orange} 30%, ${C.warm} 70%, ${rgba(C.orange, 0)} 100%)`,
            boxShadow: `0 0 6px ${rgba(C.orange, 0.35)}`,
            opacity: lineFade,
          }}
        />
        {/* initial caret before the bar opens */}
        <div style={{ position: "absolute", left: 958, top: 520, width: 3, height: 40, background: C.paper, opacity: (1 - open) * caret * interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" }) }} />
        {g < 210 && (
          <>
            <Browser expand={expand} open={open} typed={COPY.url.slice(0, typedCount)} caret={open > 0.5 ? caret : 0} barGlow={glow * (1 - expand) + flash * 0.6} />
            {/* go button */}
            <div
              style={{
                position: "absolute",
                left: go[0] - 30,
                top: go[1] - 30,
                width: 60,
                height: 60,
                borderRadius: 30,
                background: C.orange,
                opacity: Math.max(0, goOpacity),
                transform: `scale(${goScale})`,
                boxShadow: `0 6px 18px rgba(0,0,0,0.35)`,
              }}
            >
              <svg width={60} height={60} viewBox="0 0 60 60">
                <path d="M21 30 H39 M31 22 L39 30 L31 38" stroke={C.ink} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </>
        )}
        {g < 210 && <Cursor x={cur[0]} y={cur[1]} opacity={curOpacity} press={f >= 166 ? press * pressAmt : 0} />}
      </CameraRig>
    </AbsoluteFill>
  );
};
