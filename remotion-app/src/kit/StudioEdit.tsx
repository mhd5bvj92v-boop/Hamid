import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, CalculateMetadataFunction, Sequence, useVideoConfig } from "remotion";
import type { EditDoc } from "./project";
import { AudioPlacement, ConceptPreviewPick, beatsForRender } from "./studio";
import { EditLayers, TalkingHeadEdit } from "./TalkingHeadEdit";

export type StudioEditProps = {
  /** The project document (edit.json) - the single source of truth. */
  doc: EditDoc | null;
  layers: EditLayers;
  /** Render one concept instead of the approved timeline (Creative Director previews). */
  concept: ConceptPreviewPick | null;
  /** Resolved sound-effect placements (Player / preview renders). The final mix is made by sound_mix.py. */
  audio: AudioPlacement[] | null;
};

const undb = (db: number) => Math.pow(10, db / 20);

/**
 * The Studio's composition: the untouched footage plus the beats of edit.json,
 * driven by inputProps. The Remotion Player, the concept previews and the final
 * render all use this component with the same document.
 */
export const StudioEdit: React.FC<StudioEditProps> = ({ doc, layers, concept, audio }) => {
  const { fps } = useVideoConfig();
  if (!doc) return <AbsoluteFill style={{ backgroundColor: "black" }} />;
  const beats = beatsForRender(doc, concept);
  return (
    <AbsoluteFill>
      <TalkingHeadEdit source={doc.source} beats={beats} focus={concept ? [] : doc.focus} layers={layers} sound={null} constants={doc.constants} />
      {(audio ?? []).map((p) => (
        <Sequence key={p.id} name={`SFX ${p.id} (${p.family})`} from={Math.round(p.start * fps)} premountFor={fps}>
          <Audio src={p.src} trimBefore={Math.round(p.clipIn * fps)} volume={undb(p.gainDb)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const studioMetadata: CalculateMetadataFunction<StudioEditProps> = ({ props }) => {
  const s = props.doc?.source;
  return s
    ? { durationInFrames: s.durationInFrames, fps: s.fps, width: s.width, height: s.height, defaultCodec: "h264" }
    : { durationInFrames: 1, fps: 30, width: 1080, height: 1920 };
};
