import React from "react";
import { AbsoluteFill } from "remotion";
import { C, rgba } from "../theme";

/** Warm off-white canvas: broad, slow reflected light + a faint micro-grid. */
export const LightBg: React.FC<{ f: number }> = ({ f }) => {
  const t = f / 60;
  const dx = Math.sin((t / 18) * Math.PI * 2) * 6;
  const dy = Math.cos((t / 23) * Math.PI * 2) * 5;
  return (
    <AbsoluteFill style={{ background: C.canvas, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 75% at ${70 + dx}% ${105 + dy}%, ${rgba(C.soft, 0.38)} 0%, ${rgba(C.soft, 0.12)} 45%, ${rgba(C.canvas, 0)} 75%)` }} />
      <AbsoluteFill style={{ background: `linear-gradient(${118 + dx * 0.6}deg, ${rgba(C.white, 0.55)} 0%, ${rgba(C.white, 0)} 38%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${rgba(C.ink, 0.028)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(C.ink, 0.028)} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          backgroundPosition: `${-dx * 2}px ${-dy * 2}px`,
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 85%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Near-black with controlled amber illumination from below and edge falloff. */
export const DarkBg: React.FC<{ f: number; cx?: number }> = ({ f, cx = 50 }) => {
  const t = f / 60;
  const d = Math.sin((t / 20) * Math.PI * 2) * 4;
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 55% at ${cx + d}% 112%, ${rgba(C.deep, 0.42)} 0%, ${rgba(C.deep, 0.12)} 45%, ${rgba(C.ink, 0)} 75%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 40% at 50% -10%, ${rgba(C.cream, 0.05)} 0%, ${rgba(C.ink, 0)} 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 95% 90% at 50% 50%, ${rgba(C.ink, 0)} 60%, ${rgba("#000000", 0.45)} 100%)` }} />
    </AbsoluteFill>
  );
};
