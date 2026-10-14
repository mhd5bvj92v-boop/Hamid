import React from "react";
import { ConceptPick, selectBeats } from "../../kit/concepts";
import { EditLayers, TalkingHeadEdit } from "../../kit/TalkingHeadEdit";
import { BEATS, FOCUS } from "./beats";
import { CONCEPTS } from "./concepts";
import { SOUND_PREVIEW } from "./sound-preview";
import { SOURCE } from "./source";

// Talking-head edit "plan-e2e": untouched source footage + designed beats.
// `concept` renders one proposed concept (concepts.ts) instead of the approved
// beats, for Creative Director preview frames and motion previews.
// Project-specific components go here (pass them as extraComponents and
// their pure timing as extraTiming from ./timing.ts).
export const Edit: React.FC<{ layers: EditLayers; concept: ConceptPick }> = ({ layers, concept }) => (
  <TalkingHeadEdit
    source={SOURCE}
    beats={selectBeats(BEATS, CONCEPTS, concept)}
    focus={concept ? [] : FOCUS}
    sound={concept ? null : SOUND_PREVIEW}
    layers={layers}
  />
);
