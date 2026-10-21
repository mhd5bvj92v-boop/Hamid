import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { CameraRig } from "../components/CameraRig";
import { MERGE } from "../data/handoffs";
import { COPY } from "../data/storyboard";
import { C, EASE, FONT, rgba } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const R = MERGE;

export const Scene06: React.FC = () => {
  const f = useCurrentFrame();
  // the merged window empties out and becomes a quiet frame around the words
  const camS = interpolate(f, [0, 214], [1, 0.965], { ...clamp, easing: EASE.inOut });
  const fill = interpolate(f, [8, 70], [1, 0], { ...clamp, easing: EASE.inOut });
  const bar = interpolate(f, [26, 60], [0, 1], { ...clamp, easing: EASE.out });
  const decay = interpolate(f, [214, 239], [0, 1], { ...clamp, easing: EASE.inOut });

  // underline: a hairline that fills slowly with orange while the line holds
  const ul = interpolate(f, [86, 112], [0, 1], { ...clamp, easing: EASE.out });
  const prog = interpolate(f, [100, 226], [0, 1], { ...clamp, easing: EASE.inOut });
  const ulW = 780;

  return (
    <AbsoluteFill style={{ opacity: 1 - decay }}>
      <CameraRig scale={camS}>
        <div
          style={{
            position: "absolute",
            left: R.x - R.w / 2,
            top: R.y - R.h / 2,
            width: R.w,
            height: R.h,
            borderRadius: R.r,
            background: `linear-gradient(180deg, rgba(255,255,255,${0.075 * (0.4 + 0.6 * fill)}) 0%, rgba(255,255,255,${0.025 * (0.4 + 0.6 * fill)}) 100%), rgba(16,16,18,${0.55 * fill})`,
            backdropFilter: "blur(30px) saturate(160%)",
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.08), 0 40px 120px rgba(0,0,0,${0.5 * fill})`,
          }}
        />
        {/* address bar, echoing the opening */}
        <div
          style={{
            position: "absolute",
            left: R.x - 260,
            top: R.y - R.h / 2 + 32,
            width: 520,
            height: 44,
            borderRadius: 22,
            boxShadow: `inset 0 0 0 1.5px ${rgba(C.paper, 0.16)}`,
            opacity: bar,
            transform: `translateY(${(1 - bar) * -8}px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            fontSize: 19,
            fontWeight: 500,
            color: C.mute,
          }}
        >
          {COPY.url}
        </div>
      </CameraRig>
      <div style={{ position: "absolute", top: 396, width: 1920 }}>
        <AnimatedText words={COPY.thesis1} frame={f} start={40} stagger={4} size={92} weight={600} tracking={-3} />
      </div>
      <div style={{ position: "absolute", top: 520, width: 1920 }}>
        <AnimatedText words={COPY.thesis2} frame={f} start={62} stagger={4} size={92} weight={600} tracking={-3} accent={COPY.thesisAccent} />
      </div>
      <div style={{ position: "absolute", left: R.x - (ulW / 2) * ul, top: 664, width: ulW * ul, height: 1, background: rgba(C.paper, 0.16) }} />
      <div style={{ position: "absolute", left: R.x - ulW / 2, top: 663.5, width: ulW * prog * ul, height: 2, background: C.orange }} />
    </AbsoluteFill>
  );
};
