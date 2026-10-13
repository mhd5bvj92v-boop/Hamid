import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";

/**
 * Sound design preview for Remotion Studio, generated from the sound mixer's
 * session.json by `edit_render.py sound-preview` (never hand-edited).
 *
 * The cue sheet (work/<slug>/sound/cues.json) is the source of truth and
 * scripts/sound_mix.py renders the final, sample-accurate mix with QC. This
 * layer only lets you hear and see the placements in Studio; it is
 * frame-quantised (+-half a frame) and ignores fades.
 */
export type SoundPreviewData = {
  readonly generatedFrom: string;
  readonly placements: readonly {
    readonly id: string;
    readonly family: string;
    /** Path inside public/ (a link to the authorised library file). */
    readonly src: string;
    /** Seconds on the timeline where the clip starts (>= 0). */
    readonly at: number;
    /** Seconds into the file where playback starts (trim + head cut). */
    readonly clipIn: number;
    /** Seconds into the file where playback ends, or null for the file end. */
    readonly clipOut: number | null;
    readonly gainDb: number;
  }[];
  readonly music: null | {
    readonly src: string;
    readonly gainDb: number;
    /** [start, end] seconds where music is gated off (full-screen / graphic windows). */
    readonly silentWindows: readonly (readonly [number, number])[];
  };
};

const undb = (db: number) => Math.pow(10, db / 20);

export const SoundPreview: React.FC<{ readonly data: SoundPreviewData }> = ({
  data,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {data.placements.map((p) => (
        <Sequence
          key={p.id}
          name={`SFX ${p.id} (${p.family})`}
          from={Math.round(p.at * fps)}
          premountFor={fps}
        >
          <Audio
            src={staticFile(p.src)}
            trimBefore={Math.round(p.clipIn * fps)}
            trimAfter={
              p.clipOut === null ? undefined : Math.round(p.clipOut * fps)
            }
            volume={undb(p.gainDb)}
          />
        </Sequence>
      ))}
      {data.music ? (
        <Audio
          name="Music (talking head only)"
          src={staticFile(data.music.src)}
          loop
          volume={(f) => {
            const t = f / fps;
            const gated = data.music!.silentWindows.some(
              ([a, b]) => t >= a && t <= b,
            );
            return gated ? 0 : undb(data.music!.gainDb);
          }}
        />
      ) : null}
    </>
  );
};
