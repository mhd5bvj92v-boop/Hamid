import React from "react";
import { AbsoluteFill, useCurrentFrame} from "remotion";
import { useCanvas } from "../style";
import { SANS } from "../../fonts";
import { clamp, prog } from "../motion";
import { FineGrid, Grain, LightSweep, LineIcon, RimGlow, StatusDot, alpha, glass, tiltIn } from "../premium";
import { COLORS, SHADOW } from "../tokens";
import { UiCardProps, uiCardPose, uiDefaults, uiHeaderPose, uiRowPose } from "./uiCard.timing";

/** System A LIVE-UI rows (ONS-001 chips, ONS-003 inbox cards) beside the speaker. */
export const UiCard: React.FC<UiCardProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useCanvas();
  const t = frame / fps;
  const d = uiDefaults(p);
  const W = d.width * width;
  const inbox = d.variant === "inbox";
  const hp = uiHeaderPose(t, p);
  const glow = prog(t, d.inAt + Math.max(0, d.active) * d.stagger + 0.25, 0.3);
  if (d.look === "glass") return <GlassCard {...p} />;

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

/** The premium look: one frosted-glass card with rim light, fine grid, grain, a light sweep and a 3D tilt-in (ONS-024 / ONS-041 / GLASS-DARK). */
const GlassCard: React.FC<UiCardProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useCanvas();
  const t = frame / fps;
  const d = uiDefaults(p);
  const c = uiCardPose(t, p);
  const W = Math.max(d.width, 0.74) * width;
  const activeGlow = prog(t, d.inAt + Math.max(0, d.active) * d.stagger + 0.3, 0.4);
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: "#fff" }}>
      <div
        style={{
          position: "absolute",
          left: (p.anchor ? d.anchor.x : 0.5) * width - W / 2,
          top: d.anchor.y * height,
          width: W,
          translate: "0 -50%",
          ...tiltIn(c.card),
          opacity: Math.min(1, c.card * 1.4) * c.out,
          scale: String(1 - 0.03 * (1 - c.out)),
        }}
      >
        {/* soft coloured light behind the card */}
        <div style={{ position: "absolute", inset: "-22% -14%", background: `radial-gradient(55% 50% at 50% 78%, ${alpha(d.accent, 0.5 * c.rim)}, transparent 70%)`, filter: "blur(50px)" }} />
        <div
          style={{
            ...glass({ radius: 48, tint: "rgba(5,12,34,.78)" }),
            padding: "42px 36px 40px",
            boxShadow: `${glass().boxShadow}, inset 0 -3px 0 ${alpha(d.accent, 0.9 * c.rim)}, 0 0 60px ${alpha(d.accent, 0.25 * c.rim)}`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: c.rim, background: `linear-gradient(to top, ${alpha(d.accent, 0.42)} 0%, ${alpha(d.accent, 0.1)} 30%, transparent 58%)` }} />
          <FineGrid opacity={0.8} />
          <RimGlow color={d.accent} strength={1.25 * c.rim} />
          <LightSweep p={c.sweep} />
          <Grain opacity={0.08} />
          {p.header ? (
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, marginBottom: 22, ...rowStyle(uiHeaderPose(t, p)) }}>
              <StatusDot color={d.accent} size={11} pulse={c.pulse} />
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>{p.header}</span>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,.18), transparent)" }} />
            </div>
          ) : null}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14 }}>
            {p.rows.map((r, i) => {
              const on = i === d.active;
              const g = on ? activeGlow : 0;
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    padding: "22px 26px 22px 20px",
                    borderRadius: 24,
                    background: on ? `linear-gradient(90deg, ${alpha(d.accent, 0.26 * g)}, rgba(255,255,255,.03) 70%)` : "rgba(255,255,255,.035)",
                    border: `1px solid ${on ? alpha(d.accent, 0.15 + 0.45 * g) : "rgba(255,255,255,.07)"}`,
                    boxShadow: on ? `0 0 ${48 * g}px ${alpha(d.accent, 0.28 * g)}, inset 0 1px 0 rgba(255,255,255,.08)` : "inset 0 1px 0 rgba(255,255,255,.05)",
                    ...rowStyle(uiRowPose(t, i, p)),
                  }}
                >
                  {on ? <div style={{ position: "absolute", left: 0, top: "22%", bottom: "22%", width: 4, borderRadius: 4, background: d.accent, boxShadow: `0 0 18px 2px ${alpha(d.accent, 0.8 * g)}`, opacity: g }} /> : null}
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      flex: "none",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: on
                        ? `radial-gradient(circle at 32% 28%, ${alpha(d.accent, 0.55)}, ${alpha(d.accent, 0.12)} 70%)`
                        : "radial-gradient(circle at 32% 28%, rgba(255,255,255,.20), rgba(255,255,255,.04) 70%)",
                      border: `1px solid ${on ? alpha(d.accent, 0.6) : "rgba(255,255,255,.14)"}`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)",
                      fontSize: 20,
                      fontWeight: 600,
                      color: "rgba(255,255,255,.85)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {r.icon ? <LineIcon name={r.icon} size={32} color={on ? "#fff" : "rgba(255,255,255,.88)"} /> : String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 37, lineHeight: 1.15, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                    {r.sub ? <div style={{ fontSize: 25, lineHeight: 1.3, color: "rgba(255,255,255,.58)", marginTop: 6 }}>{r.sub}</div> : null}
                  </div>
                  {r.meta ? (
                    <div style={{ fontSize: 27, fontWeight: 600, color: on ? "#fff" : alpha(d.accent, 0.95), fontVariantNumeric: "tabular-nums", textShadow: on ? `0 0 18px ${alpha(d.accent, 0.8)}` : undefined }}>{r.meta}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const rowStyle = (pose: { opacity: number; rise: number; blur: number }): React.CSSProperties => ({
  opacity: pose.opacity,
  translate: `0px ${pose.rise}px`,
  filter: pose.blur > 0.05 ? `blur(${pose.blur}px)` : undefined,
});
