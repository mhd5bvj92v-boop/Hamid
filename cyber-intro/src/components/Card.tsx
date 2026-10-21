import React from "react";
import { C, rgba } from "../theme";

/** Frosted glass panel. Light lives behind and beneath the glass: a warm
 * field glows through the lower edge (`rim` 0..1), a fine highlight sits on
 * the top edge. */
export const Card: React.FC<{
  x: number; // centre
  y: number;
  w: number;
  h: number;
  radius?: number;
  rim?: number; // 0..1 warm light through the glass
  fill?: string;
  opacity?: number;
  scale?: number;
  shadow?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, radius = 28, rim = 0.6, opacity = 1, scale = 1, shadow = 1, style, children }) => (
  <>
    {/* light source behind the glass */}
    <div
      style={{
        position: "absolute",
        left: x - w * 0.55,
        top: y + h * 0.05,
        width: w * 1.1,
        height: h * 0.9,
        borderRadius: "50%",
        background: `radial-gradient(ellipse at 50% 50%, ${rgba(C.orange, 0.42 * rim)} 0%, ${rgba(C.orange, 0.12 * rim)} 45%, rgba(0,0,0,0) 72%)`,
        opacity,
        transform: `scale(${scale})`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: radius,
        opacity,
        transform: `scale(${scale})`,
        overflow: "hidden",
        background: `linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.02) 100%), rgba(16,16,18,0.55)`,
        backdropFilter: "blur(30px) saturate(160%)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.08), 0 ${30 * shadow}px ${90 * shadow}px rgba(0,0,0,${0.5 * shadow})`,
        ...style,
      }}
    >
      {/* warm light seeping in at the bottom edge */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 90% 55% at 50% 118%, ${rgba(C.warm, 0.55 * rim)} 0%, ${rgba(C.orange, 0.25 * rim)} 38%, rgba(0,0,0,0) 72%)`,
        }}
      />
      <div style={{ position: "absolute", left: "12%", right: "12%", bottom: 0, height: 1.5, background: `linear-gradient(90deg, rgba(0,0,0,0), ${rgba(C.warm, 0.8 * rim)}, rgba(0,0,0,0))` }} />
      {children}
    </div>
  </>
);
