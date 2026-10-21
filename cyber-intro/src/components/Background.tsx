import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, rgba } from "../theme";

/** Keynote-style backdrop: deep black, a soft overhead light and two large
 * warm light fields drifting very slowly (deterministic, ~20 s periods). */
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 60;
  const a = Math.sin((t / 22) * Math.PI * 2);
  const b = Math.cos((t / 27) * Math.PI * 2);
  const blob = (x: number, y: number, w: number, h: number, color: string, o: number) => (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: "50%",
        background: `radial-gradient(ellipse at 50% 50%, ${rgba(color, o)} 0%, ${rgba(color, o * 0.45)} 35%, rgba(0,0,0,0) 70%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: "#050506", overflow: "hidden" }}>
      {blob(560 + 120 * a, 900 + 40 * b, 1700, 900, C.orange, 0.2)}
      {blob(1420 - 140 * b, 1000 + 30 * a, 1500, 760, C.warm, 0.13)}
      {blob(960 + 60 * b, 1180, 2400, 700, "#7A2E08", 0.35)}
      {/* overhead light */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 45% at 50% -8%, ${rgba("#FFF3E6", 0.085)} 0%, rgba(0,0,0,0) 70%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 85% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)" }} />
    </AbsoluteFill>
  );
};
