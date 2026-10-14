// Pure helpers shared by the Studio UI, the StudioEdit composition, the
// Studio server and the final render. They turn edit.json into what Remotion
// renders, so preview and export can never disagree.
import type { Concept, ConceptOption, ConceptSet, CreativeSegment, EditDoc, SfxFamily, SfxItem } from "./project";
import { ANCHOR, GAIN_PRESETS } from "./project";
import { TimingRegistry, beatWindow, kitTiming } from "./timing";
import type { Beat, BeatTiming, SfxIntent } from "./types";

type AnyTiming = BeatTiming<unknown>;

const timingOf = (kind: string, extra: TimingRegistry = {}) => ({ ...kitTiming, ...extra })[kind] as AnyTiming | undefined;

/**
 * The timeline item for a visual concept, placed exactly on the segment:
 * it starts on the segment's start and ends on its end (outAt is solved from
 * the kind's own duration rule).
 */
export const beatFromConcept = (seg: CreativeSegment, concept: Concept, extra: TimingRegistry = {}): Beat & { segmentId: string } => {
  if (!concept.kind) throw new Error(`concept "${concept.title}" has no kind`);
  const tm = timingOf(concept.kind, extra);
  if (!tm) throw new Error(`unknown kind ${concept.kind}`);
  const props = { ...(concept.props ?? {}) } as Record<string, unknown>;
  const tail = tm.duration({ ...props, outAt: 0 });
  props.outAt = Math.max(0.6, +(seg.end - seg.start - tail).toFixed(3));
  return { id: seg.id, kind: concept.kind, at: seg.start, props, reason: `${seg.type}: "${seg.text}" (${concept.title})`, refs: concept.refs, segmentId: seg.id };
};

/** Seconds where a beat's sound intent happens on the source timeline. */
export const intentTime = (beat: Beat, intentId: string, fps: number, extra: TimingRegistry = {}) => {
  const tm = timingOf(beat.kind, extra);
  const it = tm?.sfx(beat.props, fps).find((x) => x.id === intentId);
  return it ? beat.at + it.t : null;
};

export const intentsOf = (beat: Beat, fps: number, extra: TimingRegistry = {}): SfxIntent[] => timingOf(beat.kind, extra)?.sfx(beat.props, fps) ?? [];

const familyOf = (it: SfxIntent): SfxFamily | null => {
  if (it.kind === "movement") return "whoosh";
  if (it.kind === "event" || it.kind === "transition") return "texture";
  return null;
};

/** Sound effects proposed from a beat's recommended intents (System D), linked to the animation events. */
export const sfxForBeat = (beat: Beat, fps: number, extra: TimingRegistry = {}): SfxItem[] =>
  intentsOf(beat, fps, extra)
    .filter((it) => it.priority === "recommended")
    .flatMap((it) => {
      const fam = familyOf(it);
      if (!fam) return [];
      return [{ id: `${beat.id}-${it.id}`, family: fam, link: { beatId: beat.id, intent: it.id }, sound: null, gainDb: GAIN_PRESETS[fam].db, offsetFrames: 0, enabled: true, label: it.label, segmentId: (beat as { segmentId?: string }).segmentId }];
    });

/** Event time of an SFX item (seconds), or null if its beat or intent no longer exists. */
export const sfxEventTime = (doc: EditDoc, s: SfxItem, extra: TimingRegistry = {}) => {
  const fps = doc.source.fps;
  if ("time" in s.link) return s.link.time + s.offsetFrames / fps;
  const link = s.link;
  const beat = doc.beats.find((b) => b.id === link.beatId);
  if (!beat) return null;
  const t = intentTime(beat, link.intent, fps, extra);
  return t === null ? null : t + s.offsetFrames / fps;
};

export type SoundMeta = { id: string; url: string; duration: number; peak_time: number; onset_time: number; category?: string; role?: string };

export type AudioPlacement = { id: string; family: SfxFamily; src: string; eventTime: number; start: number; clipIn: number; gainDb: number };

/**
 * Where each sound plays: the same anchor rule as scripts/sound_mix.py
 * (whoosh/riser: loudest point on the event; texture/hit: transient on it).
 */
export const resolveAudio = (doc: EditDoc, lib: Record<string, SoundMeta>, extra: TimingRegistry = {}): AudioPlacement[] =>
  doc.sfx.flatMap((s) => {
    if (!s.enabled || !s.sound || !lib[s.sound]) return [];
    const t = sfxEventTime(doc, s, extra);
    if (t === null) return [];
    const m = lib[s.sound];
    const off = ANCHOR[s.family] === "peak" ? m.peak_time : m.onset_time;
    const start = t - off;
    return [{ id: s.id, family: s.family, src: m.url, eventTime: t, start: Math.max(0, start), clipIn: Math.max(0, -start), gainDb: s.gainDb }];
  });

/** Beats a render shows: the approved timeline, or one concept for a preview. */
export type ConceptPreviewPick = { segmentId: string; option: ConceptOption; set?: ConceptSet };

export const beatsForRender = (doc: EditDoc, concept: ConceptPreviewPick | null, extra: TimingRegistry = {}) => {
  if (!concept) return doc.beats;
  const seg = doc.segments.find((s) => s.id === concept.segmentId);
  const c = concept.set === "draft" ? seg?.drafts?.[concept.option] : seg?.concepts[concept.option];
  if (!seg || !c || !c.kind || !timingOf(c.kind, extra)) return [];
  return [beatFromConcept(seg, c, extra)];
};

/** Problems that block a render (the timeline contract). */
export const docErrors = (doc: EditDoc, extra: TimingRegistry = {}) => {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const b of doc.beats) {
    if (ids.has(b.id)) errs.push(`duplicate beat id ${b.id}`);
    ids.add(b.id);
    try {
      const w = beatWindow(b, { ...kitTiming, ...extra }, doc.source.fps);
      if (w.from < 0 || w.from + w.durationInFrames > doc.source.durationInFrames) errs.push(`beat ${b.id} runs outside the source timeline`);
    } catch (e) {
      errs.push(String((e as Error).message));
    }
  }
  return errs;
};

/**
 * Change a scene's start/end. The scene is the one record both workspaces edit:
 * its timeline item moves with it (start offset kept, end kept aligned through
 * outAt), sounds linked to the item follow automatically, and fixed-time sounds
 * of the scene shift by the same amount. Nothing else on the timeline changes.
 */
export const retimeScene = (doc: EditDoc, segId: string, start: number, end: number): EditDoc => {
  const seg = doc.segments.find((s) => s.id === segId);
  if (!seg) return doc;
  const fps = doc.source.fps;
  const snap = (t: number) => Math.round(t * fps) / fps;
  const total = doc.source.durationInFrames / fps;
  let s = Math.max(0, snap(start));
  let e = Math.min(total, snap(end));
  if (e - s < 0.3) {
    if (start !== seg.start) s = Math.max(0, e - 0.3);
    else e = Math.min(total, s + 0.3);
  }
  const dS = +(s - seg.start).toFixed(4);
  const dE = +(e - seg.end).toFixed(4);
  if (!dS && !dE) return doc;
  return {
    ...doc,
    segments: doc.segments.map((x) => (x.id === segId ? { ...x, start: +s.toFixed(4), end: +e.toFixed(4) } : x)),
    beats: doc.beats.map((b) => {
      if (b.segmentId !== segId) return b;
      const props = { ...(b.props as Record<string, unknown>) };
      if (typeof props.outAt === "number") props.outAt = Math.max(0.3, +((props.outAt as number) + dE - dS).toFixed(4));
      return { ...b, at: +(b.at + dS).toFixed(4), props } as typeof b;
    }),
    sfx: doc.sfx.map((x) => (x.segmentId === segId && "time" in x.link ? { ...x, link: { time: +(x.link.time + dS).toFixed(4) } } : x)),
  };
};
