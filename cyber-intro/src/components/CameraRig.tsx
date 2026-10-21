import React from "react";
import { AbsoluteFill } from "remotion";

/** One camera per scene: everything inside shares the same eased transform. */
export const CameraRig: React.FC<{
  scale?: number;
  x?: number;
  y?: number;
  rotate?: number;
  originX?: number;
  originY?: number;
  children: React.ReactNode;
}> = ({ scale = 1, x = 0, y = 0, rotate = 0, originX = 960, originY = 540, children }) => (
  <AbsoluteFill
    style={{
      transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`,
      transformOrigin: `${originX}px ${originY}px`,
    }}
  >
    {children}
  </AbsoluteFill>
);
