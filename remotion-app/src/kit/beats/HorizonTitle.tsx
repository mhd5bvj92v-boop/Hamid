import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SANS } from "../../fonts";
import { enterStyle, fmtNumber, lerp } from "../motion";
import {
  HorizonTitleProps,
  horizonDefaults,
  horizonPose,
} from "./horizonTitle.timing";

/** System C full-screen HORIZON-ARC scene (FUL-002). Opaque: it covers the footage, which keeps playing underneath. */
export const HorizonTitle: React.FC<HorizonTitleProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const d = horizonDefaults(p);
  const pose = horizonPose(t, p, H);
  const rem = W / 108;
  const bigTop = pose.top - 0.8 * d.numSize * rem + 0.21 * d.numSize * rem; // base dips ~21% behind the limb

  // deterministic star field (same generator as the HTML template)
  const stars = useMemo(() => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: 160 }, () => ({
      a: 0.15 + rnd() * 0.5,
      x: rnd() * W,
      y: rnd() * H * 0.55,
      r: rnd() * 1.4,
    }));
  }, [W, H]);

  return (
    <AbsoluteFill
      style={{
        background: "#000",
        overflow: "hidden",
        opacity: pose.out,
        scale: String(pose.push),
        fontFamily: SANS,
      }}
    >
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={`rgba(255,255,255,${s.a})`}
          />
        ))}
      </svg>
      {/* haze sits behind the numerals */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          translate: "-50% 0",
          width: W * 1.9,
          height: H * 0.5,
          top: pose.top - H * 0.5 * 0.78,
          opacity: pose.rise,
          background: `radial-gradient(ellipse 50% 50% at 50% 78%, ${d.haze} 0%, rgba(20,80,255,.16) 45%, rgba(10,40,160,0) 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: bigTop,
          textAlign: "center",
          fontWeight: 100,
          fontSize: d.numSize * rem,
          lineHeight: 0.8,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,.95)",
          textShadow:
            "0 0 8px rgba(190,215,255,.55), 0 0 30px rgba(90,150,255,.5)",
          fontVariantNumeric: "tabular-nums",
          opacity: pose.num,
        }}
      >
        {fmtNumber(lerp(0, p.value, pose.count), {
          decimals: p.decimals,
          prefix: p.prefix,
          suffix: p.suffix,
        })}
      </div>
      {/* planet: pure black and opaque to the edge, so the limb hides the numerals' base */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          translate: "-50% 0",
          width: W * 3.4,
          height: W * 3.4,
          top: pose.top,
          borderRadius: "50%",
          background: "#000",
          opacity: pose.rise,
          boxShadow: `inset 0 10px 16px -8px ${d.rim}, 0 -2.5px 5px 0 rgba(240,248,255,1), 0 -9px 20px 3px rgba(150,205,255,.95), 0 -32px 60px 10px ${d.rim}, 0 -60px 100px 16px rgba(30,105,255,.85)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: bigTop - H * 0.07,
          textAlign: "center",
          fontWeight: 400,
          fontSize: 30,
          letterSpacing: ".3em",
          color: "rgba(255,255,255,.82)",
          textTransform: "uppercase",
          ...enterStyle(pose.kicker),
        }}
      >
        {p.kicker}
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          width: 50,
          height: 3,
          background: d.rimSolid,
          borderRadius: 10,
          top: pose.top + H * 0.075,
          translate: "-50% 0",
          scale: `${pose.tick} 1`,
        }}
      />
      {p.body ? (
        <div
          style={{
            position: "absolute",
            left: "18%",
            right: "18%",
            top: pose.top + H * 0.095,
            textAlign: "center",
            fontWeight: 300,
            fontSize: 34,
            lineHeight: 1.45,
            color: "rgba(255,255,255,.72)",
            ...enterStyle(pose.body),
          }}
        >
          {p.body}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
