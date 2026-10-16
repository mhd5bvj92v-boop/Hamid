// Render quality presets (brief §17). Composition, typography, timing and references are identical in every
// preset; only resolution, encoding and decorative cost change, and reduced previews say so.
export type Quality = "draft" | "review" | "final";

export const QUALITY: Record<Quality, { label: string; note: string; scale: number; crf: number; jpegQuality: number; effects: "reduced" | "full" }> = {
  draft: {
    label: "Draft",
    note: "one third size, decorative effects off (grain, dust, light rays, bloom, glass blur, motion blur): for timing and layout only",
    scale: 1 / 3,
    crf: 30,
    jpegQuality: 60,
    effects: "reduced",
  },
  review: { label: "Review", note: "half size, all effects: for creative decisions", scale: 0.5, crf: 23, jpegQuality: 80, effects: "full" },
  final: { label: "Final", note: "full size, all effects, high-quality encoding", scale: 1, crf: 18, jpegQuality: 92, effects: "full" },
};
