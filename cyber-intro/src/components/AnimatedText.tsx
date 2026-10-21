import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { C, FONT, SPRING } from "../theme";

/** Word-by-word masked rise. Text never floats once settled. */
export const AnimatedText: React.FC<{
  words: string[];
  frame: number; // local frame
  start: number;
  stagger?: number;
  size: number;
  weight?: number;
  tracking?: number;
  color?: string;
  accent?: string;
  accentColor?: string;
  out?: number; // 0..1 exit progress
  style?: React.CSSProperties;
}> = ({ words, frame, start, stagger = 4, size, weight = 700, tracking = 0, color = C.paper, accent, accentColor = C.orange, out = 0, style }) => {
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: size * 0.28,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: tracking,
        lineHeight: 1.1,
        color,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = spring({ frame: frame - start - i * stagger, fps, config: SPRING.settle });
        const y = interpolate(p, [0, 1], [size * 0.9, 0]);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", padding: `0 0.02em ${size * 0.12}px`, marginBottom: -size * 0.12 }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${y + out * -size * 0.25}px)`,
                opacity: Math.min(1, p * 1.4) * (1 - out),
                color: w === accent ? accentColor : undefined,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};
