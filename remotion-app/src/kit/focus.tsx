// Focus separation (brief §12): when a graphic sits over busy footage, calm only the area behind it.
// The blur and scrim act on what is BEHIND this layer (backdrop-filter on a feathered, padded region), so the
// graphic drawn after it stays crisp and the presenter elsewhere stays sharp. It fades with the graphic:
// pass the graphic's own opacity as `o`, never pop it on separately.
import React from "react";
import { AbsoluteFill } from "remotion";

export const FocusBacking: React.FC<{
  /** region in design px (the graphic's bounds); padding is added so the blur never shows a hard edge */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1, the graphic's opacity */
  o: number;
  /** background blur in px (0 = scrim only) */
  blur?: number;
  /** scrim darkness 0..1 (use a light scrim, e.g. 0.25, on light footage) */
  scrim?: number;
  pad?: number;
  radius?: number;
}> = ({ x, y, w, h, o, blur = 14, scrim = 0.35, pad = 60, radius = 48 }) => {
  if (o <= 0.001) return null;
  const mask = `radial-gradient(closest-side, black 62%, transparent 100%)`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x - pad,
          top: y - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          borderRadius: radius + pad,
          opacity: o,
          backdropFilter: blur ? `blur(${blur}px)` : undefined,
          WebkitBackdropFilter: blur ? `blur(${blur}px)` : undefined,
          background: `rgba(0,0,0,${scrim})`,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
    </AbsoluteFill>
  );
};
