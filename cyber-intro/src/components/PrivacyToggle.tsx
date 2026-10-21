import React from "react";
import { C, rgba } from "../theme";

/** Switch; `on` 0..1 slides the knob and warms the track. */
export const PrivacyToggle: React.FC<{
  x: number; // centre
  y: number;
  on: number;
  w?: number;
  h?: number;
  glow?: number;
  opacity?: number;
  knobScale?: number;
  scale?: number;
}> = ({ x, y, on, w = 76, h = 42, glow = 0, opacity = 1, knobScale = 1, scale = 1 }) => {
  const k = h - 8;
  const kx = 4 + on * (w - k - 8);
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, opacity, transform: `scale(${scale})` }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: h / 2,
          background: `linear-gradient(90deg, ${rgba(C.orange, on)} 0%, ${rgba(C.warm, on)} 100%), ${C.line}`,
          backgroundBlendMode: "normal",
          boxShadow: `inset 0 0 0 1.5px ${rgba(C.paper, 0.08 + 0.1 * (1 - on))}, 0 0 ${28 * glow}px ${rgba(C.orange, 0.55 * glow)}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: kx,
          top: 4,
          width: k,
          height: k,
          borderRadius: k / 2,
          background: C.paper,
          transform: `scale(${knobScale})`,
          boxShadow: "0 3px 8px rgba(0,0,0,0.45)",
        }}
      />
    </div>
  );
};
