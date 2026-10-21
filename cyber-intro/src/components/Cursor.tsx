import React from "react";
import { C } from "../theme";

/** Pointer; (x,y) is the hotspot. `press` 0..1 drives the click squash. */
export const Cursor: React.FC<{ x: number; y: number; opacity?: number; press?: number; size?: number }> = ({
  x,
  y,
  opacity = 1,
  press = 0,
  size = 1,
}) => {
  const s = size * (1 - 0.12 * press);
  return (
    <svg
      width={40}
      height={48}
      viewBox="0 0 40 48"
      style={{
        position: "absolute",
        left: x - 6,
        top: y - 4,
        opacity,
        transform: `scale(${s})`,
        transformOrigin: "6px 4px",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))",
        overflow: "visible",
      }}
    >
      <path
        d="M6 4 L6 38 L14.5 30 L20.5 43.5 L26.5 41 L20.5 27.8 L32 27.5 Z"
        fill={C.paper}
        stroke={C.ink}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Cubic Bézier helpers shared by cursor paths and connection paths. */
export type P = [number, number];
export const cubic = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};
