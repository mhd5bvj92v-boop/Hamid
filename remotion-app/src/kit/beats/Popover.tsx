import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SANS } from "../../fonts";
import { Backdrop } from "../backgrounds";
import { RADII, TYPE } from "../motionTokens";
import { LineIcon, alpha, surface } from "../premium";
import { useCanvas, useInk, useLayout, usePalette } from "../style";
import { PopoverProps, popDefaults, popPose } from "./popover.timing";

/** Recipe "Anchored popover" / "notification" (popover.timing.ts). */
export const Popover: React.FC<PopoverProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, landscape } = useCanvas();
  const L = useLayout();
  const pal = usePalette();
  const ink = useInk();
  const fg = ink.light ? ink.ink : "#fff";
  const t = frame / fps;
  const d = popDefaults(p);
  const pose = popPose(t, p);
  const accent = p.accent ?? pal.c10;
  const T = landscape ? TYPE.landscape : TYPE.portrait;
  const pw = Math.min(landscape ? L.span(5) : W * 0.74, 820);
  const rowH = T.ui * 1.9;
  const ph = T.ui * 2.4 + d.rows.length * rowH + T.ui * 0.8;

  const card = (style: React.CSSProperties, origin: string) => (
    <div
      style={{
        position: "absolute",
        width: pw,
        opacity: pose.opacity,
        transform: `scale(${pose.scale})`,
        transformOrigin: origin,
        ...style,
      }}
    >
      <div style={{ ...surface(ink.light, { radius: RADII.card * 0.8 }), padding: T.ui * 0.7, color: fg, display: "grid", gap: T.ui * 0.35 }}>
        <div style={{ display: "flex", alignItems: "center", gap: T.ui * 0.4, fontWeight: 700, fontSize: T.ui * 1.05 }}>
          {p.icon ? (
            <span style={{ display: "grid", placeItems: "center", width: T.ui * 1.3, height: T.ui * 1.3, borderRadius: RADII.chip, background: alpha(accent, 0.2) }}>
              <LineIcon name={p.icon} size={T.ui * 0.75} color={ink.light ? accent : "#fff"} />
            </span>
          ) : null}
          {p.title}
        </div>
        {d.rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: T.ui * 0.35,
              height: rowH,
              padding: `0 ${T.ui * 0.4}px`,
              borderRadius: RADII.chip,
              background: ink.light ? "rgba(20,22,28,.035)" : "rgba(255,255,255,.05)",
              border: `1px solid ${ink.light ? "rgba(20,22,28,.06)" : "rgba(255,255,255,.07)"}`,
              fontSize: T.ui * 0.85,
              color: ink.light ? "rgba(20,22,28,.82)" : "rgba(255,255,255,.85)",
              opacity: pose.rows[i],
              transform: `translateY(${(1 - pose.rows[i]) * 10}px)`,
            }}
          >
            {r.icon ? <LineIcon name={r.icon} size={T.ui * 0.65} color={accent} /> : null}
            {r.text}
          </div>
        ))}
      </div>
    </div>
  );

  if (d.variant === "notification") {
    // top of the safe area, on the right third (landscape) or centred (vertical); arrives from slightly above
    const x = landscape ? L.thirds.x[1] - pw / 2 : (W - pw) / 2;
    const y = L.safe.top + (landscape ? 0 : H * 0.04);
    const dy = -(1 - pose.open) * 24 - pose.close * 40;
    return (
      <AbsoluteFill style={{ fontFamily: SANS }}>
        {p.fullscreen ? <Backdrop preset={p.background ?? "near-black-light"} /> : null}
        {card({ left: x, top: y, translate: `0 ${dy}px` }, "50% 0%")}
      </AbsoluteFill>
    );
  }

  // popover: trigger on the thirds; the popover opens above (or below in the upper half) from the trigger
  const tx = (p.trigger?.x ?? (landscape ? 0.62 : 0.5)) * W;
  const ty = (p.trigger?.y ?? (landscape ? 0.7 : 0.72)) * H;
  const above = ty > H * 0.45;
  const left = Math.max(L.safe.left, Math.min(L.safe.right - pw, tx - pw / 2));
  const top = above ? ty - T.ui * 1.2 - ph - 18 : ty + T.ui * 1.2 + 18;
  const origin = `${tx - left}px ${above ? "100%" : "0%"}`;
  const press = 1 - 0.05 * pose.press;
  return (
    <AbsoluteFill style={{ fontFamily: SANS }}>
      {p.fullscreen ? <Backdrop preset={p.background ?? "near-black-light"} /> : null}
      {card({ left, top }, origin)}
      <div
        style={{
          position: "absolute",
          left: tx,
          top: ty,
          translate: "-50% -50%",
          opacity: pose.trigger,
          transform: `scale(${press * (0.96 + 0.04 * pose.trigger)})`,
          padding: `${T.ui * 0.45}px ${T.ui * 0.9}px`,
          borderRadius: RADII.pill,
          background: accent,
          color: "#fff",
          fontWeight: 700,
          fontSize: T.ui,
          boxShadow: `0 10px 30px ${alpha(accent, 0.45)}, inset 0 1px 0 rgba(255,255,255,.35)`,
          whiteSpace: "nowrap",
        }}
      >
        {p.trigger?.label ?? "Open"}
      </div>
    </AbsoluteFill>
  );
};
