import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SANS } from "../../fonts";
import { COLORS, SHADOW } from "../tokens";
import { LoginAlertStackProps, Toast, alertDefaults, alertPose, calmPose, captionPose } from "./loginAlertStack.timing";

const TOAST_H = 96;
const GAP = 14;

const ToastCard: React.FC<{ toast: Toast; dot: string; rim?: string; glow?: number; right?: React.ReactNode; scale?: number }> = ({ toast, dot, rim, glow = 0, right, scale = 1 }) => (
  <div
    style={{
      height: TOAST_H * scale,
      display: "flex",
      alignItems: "center",
      gap: 18 * scale,
      padding: `0 ${22 * scale}px`,
      borderRadius: 18 * scale,
      background: COLORS.surface,
      border: `${rim ? 2 : 1}px solid ${rim ?? COLORS.hairline}`,
      boxShadow: `${SHADOW}${rim ? `, 0 0 ${10 + 40 * glow}px ${rim}${Math.round(40 + 120 * glow).toString(16).padStart(2, "0")}` : ""}, inset 0 1px 0 rgba(255,255,255,.06)`,
    }}
  >
    <div style={{ width: 14 * scale, height: 14 * scale, borderRadius: 99, background: dot, boxShadow: `0 0 12px ${dot}`, flex: "none" }} />
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: 26 * scale, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{toast.title}</div>
      {toast.sub ? <div style={{ fontSize: 20 * scale, color: COLORS.ink2, marginTop: 3 }}>{toast.sub}</div> : null}
    </div>
    {right}
  </div>
);

/** System A: stacked sign-in toasts beside the speaker; the flagged one drops in on top (ONS-041). */
export const LoginAlertStack: React.FC<LoginAlertStackProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const d = alertDefaults(p);
  const W = d.width * width;
  const a = alertPose(t, p);
  const alertH = TOAST_H * d.alertScale;
  const total = alertH + GAP + p.calm.length * (TOAST_H + GAP) - GAP;
  const top = d.anchor.y * height - total / 2;

  const cp = captionPose(t, p);
  const cap = p.caption;
  const capParts = cap?.accent && cap.text.includes(cap.accent) ? cap.text.split(cap.accent) : null;

  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: COLORS.ink }}>
      {cap ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: top - 96,
            textAlign: "center",
            fontWeight: 600,
            fontSize: 44,
            textShadow: "0 2px 18px rgba(0,0,0,.6)",
            opacity: cp.opacity,
            translate: `0px ${cp.dy}px`,
            filter: `blur(${cp.blur}px)`,
          }}
        >
          {capParts ? (
            <>
              {capParts[0]}
              <span style={{ color: d.alertColor }}>{cap.accent}</span>
              {capParts[1]}
            </>
          ) : (
            cap?.text
          )}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: d.anchor.x * width - W / 2, top, width: W }}>
        {/* the alert slot: its push moves the calm toasts down */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: a.opacity, translate: `0px ${a.dy}px`, filter: `blur(${a.blur}px)` }}>
          <ToastCard
            toast={p.alert}
            dot={d.alertColor}
            rim={d.alertColor}
            glow={a.pulse}
            scale={d.alertScale}
            right={
              p.alert.tag ? (
                <div
                  style={{
                    opacity: a.stampOpacity,
                    scale: String(a.stampScale),
                    fontWeight: 800,
                    fontSize: 18 * d.alertScale,
                    letterSpacing: 2,
                    color: d.alertColor,
                    border: `2px solid ${d.alertColor}`,
                    borderRadius: 8,
                    padding: "4px 10px",
                    flex: "none",
                  }}
                >
                  {p.alert.tag}
                </div>
              ) : null
            }
          />
        </div>
        {p.calm.map((c, i) => {
          const pose = calmPose(t, i, p);
          const y = a.push * (alertH + GAP) + i * (TOAST_H + GAP);
          return (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, top: y, opacity: pose.opacity, translate: `0px ${pose.dy}px`, filter: `blur(${pose.blur}px)` }}>
              <ToastCard toast={c} dot={d.okColor} right={<span style={{ fontSize: 18, color: COLORS.ink3 }}>now</span>} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
