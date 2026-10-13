// Design tokens from the video-editing skill (references/design-language.md §2)
// and the 9:16 placement map measured from ONS-001..ONS-005 (system-a-on-screen.md).

export const COLORS = {
  ink: "#FFFFFF",
  ink2: "rgba(255,255,255,.62)",
  ink3: "rgba(255,255,255,.38)",
  surface: "rgba(22,23,28,.86)", // dark glass (ONS-001..005)
  surface2: "rgba(36,37,44,.9)",
  hairline: "rgba(255,255,255,.09)",
  hairlineStrong: "rgba(255,255,255,.16)",
  blue: "#2F6BFF", // primary accent (ONS-004, ONS-024, FUL-002)
  blue2: "#3B82F6",
  blueGlow: "rgba(47,107,255,.55)",
  amber: "#F2A14A", // warm footage accent (TXT-001..004)
  amberGlow: "rgba(242,161,74,.38)",
  gold: "#E7A93B",
  cream: "#F3E6C4", // script accent on footage (ONS-001, ONS-005)
  green: "#22E37A", // positive metric (ONS-050)
  deep: "#05070D",
} as const;

export const SHADOW = "0 12px 36px rgba(0,0,0,.5), 0 2px 6px rgba(0,0,0,.35)";

/**
 * 9:16 zones as fractions of frame height. The face zone is never covered by
 * System A/B graphics; the bottom-safe zone is left clear for platform UI.
 */
export const ZONES = {
  face: [0.15, 0.48],
  caption: [0.48, 0.58],
  ui: [0.58, 0.85],
  bottomSafe: [0.85, 1.0],
  sideMargin: 0.06,
} as const;
