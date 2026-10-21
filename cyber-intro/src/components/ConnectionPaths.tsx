import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { cubic, P } from "./Cursor";

export type Conn = {
  p0: P;
  p1: P;
  p2: P;
  p3: P;
  draw: number; // 0..1 stroke reveal
  packet?: number | null; // 0..1 packet position along the curve
  opacity?: number;
  width?: number;
  color?: string;
};

export const pathD = (c: Pick<Conn, "p0" | "p1" | "p2" | "p3">) =>
  `M${c.p0[0]},${c.p0[1]} C${c.p1[0]},${c.p1[1]} ${c.p2[0]},${c.p2[1]} ${c.p3[0]},${c.p3[1]}`;

/** Thin luminous curves with a bright travelling packet. */
export const ConnectionPaths: React.FC<{ conns: Conn[]; id: string }> = ({ conns, id }) => (
  <AbsoluteFill>
    <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
      <defs>
        <radialGradient id={`pk-${id}`}>
          <stop offset="0%" stopColor={C.paper} stopOpacity={1} />
          <stop offset="25%" stopColor={C.warm} stopOpacity={0.9} />
          <stop offset="100%" stopColor={C.orange} stopOpacity={0} />
        </radialGradient>
      </defs>
      {conns.map((c, i) => {
        const o = c.opacity ?? 1;
        if (o <= 0.001 || c.draw <= 0.001) return null;
        const d = pathD(c);
        const pk = c.packet != null && c.packet > 0 && c.packet < 1 ? cubic(c.p0, c.p1, c.p2, c.p3, c.packet) : null;
        return (
          <g key={i} opacity={o}>
            <path d={d} pathLength={1} fill="none" stroke={c.color ?? C.orange} strokeOpacity={0.07} strokeWidth={(c.width ?? 2) * 3} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - c.draw} />
            <path d={d} pathLength={1} fill="none" stroke={c.color ?? C.orange} strokeWidth={c.width ?? 2} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - c.draw} />
            {pk && <circle cx={pk[0]} cy={pk[1]} r={3.5} fill={C.paper} />}
          </g>
        );
      })}
    </svg>
  </AbsoluteFill>
);
