import { loadFont } from "@remotion/fonts";
import montserrat500 from "@fontsource/montserrat/files/montserrat-latin-500-normal.woff2";
import montserrat600 from "@fontsource/montserrat/files/montserrat-latin-600-normal.woff2";
import montserrat700 from "@fontsource/montserrat/files/montserrat-latin-700-normal.woff2";
import instrumentSerifItalic from "@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2";

// Fonts are bundled from npm (@fontsource) instead of fetched from Google
// Fonts at render time, so renders work offline and are reproducible.
// Montserrat is the house sans; Instrument Serif italic is the single
// expressive accent voice.
export const SANS = "Montserrat";
export const SERIF = "Instrument Serif";

loadFont({ family: SANS, url: montserrat500, weight: "500" });
loadFont({ family: SANS, url: montserrat600, weight: "600" });
loadFont({ family: SANS, url: montserrat700, weight: "700" });
loadFont({ family: SERIF, url: instrumentSerifItalic, weight: "400", style: "italic" });
