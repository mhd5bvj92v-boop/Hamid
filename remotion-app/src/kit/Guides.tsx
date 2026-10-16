// Preview-only composition guides (brief §9): thirds, centre lines, the safe area and platform UI zones.
// Drawn only when the Studio Player asks for them (StudioEdit prop `guides`); renders and exports never
// receive that prop, so guides can never end up in a video.
// The platform zones are APPROXIMATE, adjustable starting points (where right-side actions, captions and
// player controls usually sit). They are not accurate specifications for every app version or device.
import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "./style";

export type PlatformZone = { name: string; box: [number, number, number, number] };
/** `zones`: the user's edited zones for this platform (edit.json constants.platformZones), else the preset */
export type GuideSettings = { thirds?: boolean; center?: boolean; safe?: boolean; platform?: "" | "tiktok" | "shorts" | "youtube"; zones?: PlatformZone[] | null };

/** Zones as frame fractions [x0, y0, x1, y1]; last reviewed by eye, not against official specs. */
export const PLATFORM_ZONES: Record<"tiktok" | "shorts" | "youtube", { label: string; zones: { name: string; box: [number, number, number, number] }[]; checked: string }> = {
  tiktok: {
    label: "TikTok (approx.)",
    zones: [
      { name: "right actions", box: [0.84, 0.36, 1, 0.86] },
      { name: "caption / description", box: [0, 0.8, 0.84, 1] },
      { name: "top bar", box: [0, 0, 1, 0.07] },
    ],
    checked: "approximate, not verified against the current app",
  },
  shorts: {
    label: "YouTube Shorts (approx.)",
    zones: [
      { name: "right actions", box: [0.85, 0.44, 1, 0.88] },
      { name: "title / channel", box: [0, 0.82, 0.85, 1] },
      { name: "top bar", box: [0, 0, 1, 0.06] },
    ],
    checked: "approximate, not verified against the current app",
  },
  youtube: {
    label: "YouTube player (approx.)",
    zones: [
      { name: "player controls", box: [0, 0.88, 1, 1] },
      { name: "title when paused", box: [0, 0, 1, 0.09] },
    ],
    checked: "approximate, not verified against the current player",
  },
};

export const Guides: React.FC<{ g: GuideSettings }> = ({ g }) => {
  const L = useLayout();
  const line = "rgba(255,64,160,.55)";
  const hair = (style: React.CSSProperties) => <div style={{ position: "absolute", background: line, ...style }} />;
  const z = g.platform ? { zones: g.zones ?? PLATFORM_ZONES[g.platform].zones } : null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }} data-guides="">
      {g.thirds ? (
        <>
          {L.thirds.x.map((x) => hair({ left: x, top: 0, width: 1.5, height: L.H }))}
          {L.thirds.y.map((y) => hair({ top: y, left: 0, height: 1.5, width: L.W }))}
          {Object.values(L.points).map((p, i) => (
            <div key={i} style={{ position: "absolute", left: p.x - 7, top: p.y - 7, width: 14, height: 14, borderRadius: 99, border: `2px solid ${line}` }} />
          ))}
        </>
      ) : null}
      {g.center ? (
        <>
          {hair({ left: L.W / 2, top: 0, width: 1, height: L.H, opacity: 0.6 })}
          {hair({ top: L.H / 2, left: 0, height: 1, width: L.W, opacity: 0.6 })}
        </>
      ) : null}
      {g.safe ? (
        <div style={{ position: "absolute", left: L.safe.left, top: L.safe.top, width: L.safe.right - L.safe.left, height: L.safe.bottom - L.safe.top, border: "2px dashed rgba(80,200,255,.7)" }} />
      ) : null}
      {z
        ? z.zones.map((zz) => (
            <div
              key={zz.name}
              data-zone={zz.name}
              style={{
                position: "absolute",
                left: zz.box[0] * L.W,
                top: zz.box[1] * L.H,
                width: (zz.box[2] - zz.box[0]) * L.W,
                height: (zz.box[3] - zz.box[1]) * L.H,
                background: "rgba(255,170,0,.16)",
                border: "1.5px solid rgba(255,170,0,.6)",
                color: "rgba(255,210,120,.95)",
                fontSize: 22,
                fontFamily: "sans-serif",
                padding: 6,
              }}
            >
              {zz.name}
            </div>
          ))
        : null}
    </AbsoluteFill>
  );
};
