import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SANS } from "../../fonts";
import { clamp, prog } from "../motion";
import { COLORS, SHADOW } from "../tokens";
import { UiCardProps, uiDefaults, uiHeaderPose, uiRowPose } from "./uiCard.timing";

/** System A LIVE-UI rows (ONS-001 chips, ONS-003 inbox cards) beside the speaker. */
export const UiCard: React.FC<UiCardProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const d = uiDefaults(p);
  const W = d.width * width;
  const inbox = d.variant === "inbox";
  const hp = uiHeaderPose(t, p);
  const glow = prog(t, d.inAt + Math.max(0, d.active) * d.stagger + 0.25, 0.3);

  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: COLORS.ink }}>
      <div
        style={{
          position: "absolute",
          left: d.anchor.x * width - W / 2,
          top: d.anchor.y * height,
          width: W,
          translate: "0 -50%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {inbox && p.header ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 26, opacity: hp.opacity, translate: `0px ${hp.rise}px`, filter: `blur(${hp.blur}px)` }}>
            {p.header}
            <span style={{ minWidth: 26, height: 26, borderRadius: 99, background: d.accent, fontSize: 16, lineHeight: "26px", textAlign: "center", padding: "0 6px" }}>
              {p.rows.length}
            </span>
          </div>
        ) : null}
        {p.rows.map((r, i) => {
          const pose = uiRowPose(t, i, p);
          const isActive = i === d.active;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: inbox ? "flex-start" : "center",
                gap: 16,
                padding: inbox ? "16px 20px" : "14px 18px",
                borderRadius: inbox ? 16 : 14,
                background: COLORS.surface,
                border: `1px solid ${isActive ? d.accent : COLORS.hairline}`,
                boxShadow: `${SHADOW}${isActive ? `, 0 0 ${28 * clamp(glow)}px ${d.accent}66` : ""}, inset 0 1px 0 rgba(255,255,255,.06)`,
                opacity: pose.opacity,
                translate: `0px ${pose.rise}px`,
                filter: `blur(${pose.blur}px)`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  flex: "none",
                  borderRadius: 11,
                  background: "#2A2B31",
                  border: `1px solid ${COLORS.hairlineStrong}`,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 600,
                  fontSize: 20,
                  color: COLORS.ink2,
                }}
              >
                {r.title.trim().charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 26, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                {r.sub ? <div style={{ fontSize: 21, lineHeight: 1.3, color: COLORS.ink2, marginTop: 4 }}>{r.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
