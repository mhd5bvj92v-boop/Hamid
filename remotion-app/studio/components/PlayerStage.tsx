import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * The Player's stage: the largest box of the composition's aspect ratio (portrait
 * 9:16, landscape 16:9, …) that fits the free space in the centre column.
 */
export const PlayerStage: React.FC<{
  aspect: number;
  children: React.ReactNode;
}> = ({ aspect, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  let w = box.w;
  let h = w / aspect;
  if (h > box.h) {
    h = box.h;
    w = h * aspect;
  }
  return (
    <div className="player-stage" ref={ref}>
      <div
        className="player-wrap"
        data-testid="player"
        style={{ width: Math.max(1, Math.floor(w)), height: Math.max(1, Math.floor(h)) }}
      >
        {children}
      </div>
    </div>
  );
};
