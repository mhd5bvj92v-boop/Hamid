import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PLAYFAIR, SANS } from "../../fonts";
import { lerp } from "../motion";
import { StatementSceneProps, statementDefaults, statementPose } from "./statementScene.timing";

/** System C full-screen statement: aurora (FUL-063), editorial (FUL-090), streak (FUL-006). Opaque cover; the footage keeps running underneath. */
export const StatementScene: React.FC<StatementSceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const d = statementDefaults(p);
  const pose = statementPose(t, p);
  const v = d.variant;

  const bg =
    v === "editorial"
      ? "#F4F4F2"
      : v === "streak"
        ? "#02030A"
        : `radial-gradient(120% 70% at 70% 35%, #5B8CFF 0%, #1E5BFF 35%, #0B2A8F 70%, #061542 100%)`;
  const ink = v === "editorial" ? "#0E1A4F" : "#FFFFFF";

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", opacity: pose.scene, scale: String(pose.push), fontFamily: SANS }}>
      {v === "aurora" ? (
        <AbsoluteFill style={{ background: `radial-gradient(60% 40% at ${lerp(20, 30, pose.streak)}% 75%, rgba(255,255,255,.28), transparent 70%)` }} />
      ) : null}
      {v === "editorial" ? (
        <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(14,26,79,.05) 1px, transparent 1px)", backgroundSize: "6px 6px" }} />
      ) : null}
      {v === "streak"
        ? [-1, 1].map((s) => (
            <div
              key={s}
              style={{
                position: "absolute",
                left: "50%",
                top: "46%",
                width: W * 2.2,
                height: 26,
                translate: `-50% -50%`,
                rotate: `${s * lerp(70, 34, pose.streak)}deg`,
                background: `linear-gradient(90deg, transparent, ${d.accent} 30%, #CFE0FF 50%, ${d.accent} 70%, transparent)`,
                filter: "blur(10px)",
                opacity: 0.35 + 0.55 * pose.streak,
                boxShadow: `0 0 80px 30px ${d.accent}55`,
              }}
            />
          ))
        : null}
      {v === "streak" ? <AbsoluteFill style={{ background: "#fff", opacity: 0.65 * pose.flash }} /> : null}

      <div
        style={{
          position: "absolute",
          left: W * 0.08,
          right: W * 0.08,
          top: v === "editorial" ? H * 0.2 : H * 0.36,
          display: "flex",
          flexDirection: "column",
          alignItems: v === "editorial" ? "flex-start" : "center",
          textAlign: v === "editorial" ? "left" : "center",
          color: ink,
        }}
      >
        {p.kicker ? (
          <div style={{ fontWeight: 500, fontSize: 28, letterSpacing: ".28em", textTransform: "uppercase", opacity: 0.8 * (pose.lines[0] ?? 1), marginBottom: 28 }}>
            {p.kicker}
          </div>
        ) : null}
        {p.lines.map((line, i) => {
          const k = pose.lines[i];
          const isAccent = i === d.accentLine;
          const common: React.CSSProperties = { opacity: k, translate: `0px ${(1 - k) * 34}px`, filter: `blur(${(1 - k) * 10}px)`, whiteSpace: "nowrap" };
          if (v === "editorial") {
            return (
              <div key={i} style={{ ...common, position: "relative", fontWeight: 800, fontSize: 84, lineHeight: 1.02, letterSpacing: "-0.01em", textTransform: "uppercase", scale: "0.92 1", transformOrigin: "left", marginTop: 4 }}>
                {isAccent ? (
                  <span style={{ position: "absolute", left: -10, right: -10, top: 4, bottom: 4, background: d.accent, transformOrigin: "left", scale: `${pose.box} 1`, borderRadius: 4, zIndex: 0 }} />
                ) : null}
                <span style={{ position: "relative", zIndex: 1, color: isAccent && pose.box > 0.5 ? "#FFFFFF" : ink }}>{line}</span>
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                ...common,
                fontWeight: isAccent ? 800 : 300,
                fontSize: isAccent ? 150 : 104,
                lineHeight: 0.92,
                letterSpacing: isAccent ? "-0.04em" : "-0.02em",
                textShadow: isAccent ? `0 0 40px ${v === "streak" ? d.accent : "rgba(255,255,255,.35)"}` : undefined,
              }}
            >
              {line}
            </div>
          );
        })}
        {p.tag ? (
          v === "aurora" ? (
            <div style={{ marginTop: 26, padding: "8px 22px", borderRadius: 999, background: "rgba(255,255,255,.92)", color: "#1E3A8A", fontFamily: PLAYFAIR, fontStyle: "italic", fontWeight: 500, fontSize: 34, opacity: pose.tag, rotate: "-4deg" }}>
              {p.tag}
            </div>
          ) : (
            <div style={{ marginTop: 32, fontSize: 32, fontWeight: 400, opacity: 0.75 * pose.tag, color: ink }}>{p.tag}</div>
          )
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
