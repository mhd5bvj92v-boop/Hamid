import React from "react";
import { AbsoluteFill, useCurrentFrame} from "remotion";
import { useCanvas } from "../style";
import { SANS } from "../../fonts";
import { enterStyle, fmtNumber, lerp } from "../motion";
import { COLORS } from "../tokens";
import {
  CURVE,
  StatCardProps,
  pointAtLength,
  statDefaults,
  statPose,
  CURVE_LENGTH,
} from "./statCard.timing";

const PATH =
  "M" + CURVE.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L");

// System A rule: text under ~20 px at 1080 w is unreadable on a phone.
const readable = (px: number) => Math.max(20, px);

/** System A stat card (ONS-024, ONS-050); `fullscreen: true` turns it into a System C scene. */
export const StatCard: React.FC<StatCardProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useCanvas();
  const t = frame / fps;
  const d = statDefaults(p);
  const pose = statPose(t, p);
  const s = d.uiScale; // 1 = template size at 1080 w
  const [dx, dy] = pointAtLength(pose.dotLen);
  const enter = enterStyle(pose.e, { rise: 30, blur: 10, scale: 0.94 });
  const id = `sc${Math.round(d.center.x * 1000)}${Math.round(d.center.y * 1000)}`;

  return (
    <AbsoluteFill>
      {p.fullscreen ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(80% 50% at 50% 60%, ${d.glow.replace(/[\d.]+\)$/, ".18)")}, transparent 70%), ${COLORS.deep}`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: d.center.x * width,
          top: d.center.y * height,
          width: d.cardWidth * width,
          aspectRatio: "0.8",
          marginLeft: (-d.cardWidth * width) / 2,
          marginTop: (-d.cardWidth * width) / 0.8 / 2,
          borderRadius: 70 * s,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(14,18,32,.92), rgba(8,12,26,.95))",
          border: `${1.5 * s}px solid color-mix(in srgb, ${d.accent} 40%, transparent)`,
          boxShadow: `inset 0 ${-32 * s}px ${50 * s}px ${-24 * s}px ${d.accent}, inset 0 ${-5 * s}px ${6 * s}px ${-3 * s}px rgba(255,255,255,.75), inset 0 1px 0 rgba(255,255,255,.08), 0 30px 80px rgba(0,0,0,.6), 0 26px 70px -16px ${d.glow}`,
          fontFamily: SANS,
          color: COLORS.ink,
          ...enter,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "46%",
            opacity: 0.95,
            background: `linear-gradient(0deg, color-mix(in srgb, ${d.accent} 80%, white 20%) 0%, color-mix(in srgb, ${d.accent} 55%, transparent) 9%, color-mix(in srgb, ${d.accent} 12%, transparent) 30%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
            backgroundSize: `${48 * s}px ${48 * s}px`,
            maskImage:
              "linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 46 * s,
            right: 46 * s,
            top: 44 * s,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: readable(26 * s), color: COLORS.ink3 }}>
            {p.header ?? "Data updated 2h ago"}
          </span>
          <span
            style={{
              fontWeight: 500,
              fontSize: readable(24 * s),
              color: COLORS.ink2,
              padding: `${8 * s}px ${14 * s}px`,
              borderRadius: 999,
              border: `1px solid ${COLORS.hairlineStrong}`,
              background: "rgba(255,255,255,.04)",
            }}
          >
            {p.pill ?? "Monthly"} ⌄
          </span>
        </div>
        <svg
          viewBox="0 0 600 300"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            left: 0,
            top: "14%",
            width: "100%",
            height: "46%",
            overflow: "visible",
          }}
        >
          <defs>
            <linearGradient id={`${id}lg`} x1="0" x2="1">
              <stop offset="0" stopColor={d.accent} stopOpacity=".15" />
              <stop offset=".5" stopColor={d.accent} />
              <stop offset="1" stopColor={d.accent} stopOpacity=".15" />
            </linearGradient>
            <filter id={`${id}gl`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <path
            d={PATH}
            fill="none"
            stroke={d.accent}
            strokeWidth={10}
            filter={`url(#${id}gl)`}
            opacity={0.7}
            strokeDasharray={CURVE_LENGTH}
            strokeDashoffset={CURVE_LENGTH * (1 - pose.draw)}
          />
          <path
            d={PATH}
            fill="none"
            stroke={`url(#${id}lg)`}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={CURVE_LENGTH}
            strokeDashoffset={CURVE_LENGTH * (1 - pose.draw)}
          />
          <circle
            cx={dx}
            cy={dy}
            r={22 + 18 * pose.flash}
            fill={d.accent}
            opacity={(pose.draw > 0 ? 0.35 : 0) + 0.4 * pose.flash}
            filter={`url(#${id}gl)`}
          />
          <circle
            cx={dx}
            cy={dy}
            r={9}
            fill="#fff"
            opacity={pose.draw > 0 ? 1 : 0}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "15%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: readable(26 * s),
              color: COLORS.ink2,
              marginBottom: 12 * s,
            }}
          >
            {p.label}
          </div>
          <div
            style={{
              fontWeight: 500,
              fontSize: 120 * s,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 0 30px rgba(255,255,255,.18)",
            }}
          >
            {fmtNumber(lerp(0, p.value, pose.count), {
              decimals: p.decimals,
              prefix: p.prefix,
              suffix: p.suffix,
            })}
          </div>
          {p.footnote ? (
            <div
              style={{
                fontSize: readable(18 * s),
                color: COLORS.ink3,
                marginTop: 10 * s,
              }}
            >
              {p.footnote}
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
