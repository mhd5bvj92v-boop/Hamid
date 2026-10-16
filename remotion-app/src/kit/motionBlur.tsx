// Optional camera motion blur (motion control "Motion blur", off by default). It only switches on inside a
// travel window the caller marks (a card arriving or leaving), never on a hold, and never in draft quality.
// Cost: the wrapped element is rendered `samples` times on those frames only (light 5x, strong 8x), so a
// 0.6 s entrance plus a 0.5 s exit adds roughly that many extra element renders for ~33 frames per card.
// Keep it on elements without video (each sample would decode the footage again).
import React from "react";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { useMotion, useQuality } from "./style";

export const MOTION_BLUR: Record<"light" | "strong", { samples: number; shutterAngle: number; note: string }> = {
  light: { samples: 5, shutterAngle: 120, note: "a subtle smear on fast travel; about 5x render cost on those frames only" },
  strong: { samples: 8, shutterAngle: 216, note: "a clear film-like smear; about 8x render cost on those frames only" },
};

/** Wraps `children` in camera motion blur while `active` (the travel window), when the motion setting asks. */
export const TravelBlur: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => {
  const m = useMotion();
  const q = useQuality();
  if (!active || m.motionBlur === "off" || q === "draft") return <>{children}</>;
  const cfg = MOTION_BLUR[m.motionBlur];
  return (
    <CameraMotionBlur samples={cfg.samples} shutterAngle={cfg.shutterAngle}>
      {children}
    </CameraMotionBlur>
  );
};
