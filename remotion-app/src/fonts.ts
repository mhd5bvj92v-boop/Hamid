import { loadFont } from "@remotion/fonts";
import montserrat500 from "@fontsource/montserrat/files/montserrat-latin-500-normal.woff2";
import montserrat600 from "@fontsource/montserrat/files/montserrat-latin-600-normal.woff2";
import montserrat700 from "@fontsource/montserrat/files/montserrat-latin-700-normal.woff2";
import instrumentSerifItalic from "@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2";
import playfair500i from "@fontsource/playfair-display/files/playfair-display-latin-500-italic.woff2";
import playfair600i from "@fontsource/playfair-display/files/playfair-display-latin-600-italic.woff2";
import playfair700i from "@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2";
import montserrat100 from "@fontsource/montserrat/files/montserrat-latin-100-normal.woff2";
import montserrat300 from "@fontsource/montserrat/files/montserrat-latin-300-normal.woff2";
import montserrat400 from "@fontsource/montserrat/files/montserrat-latin-400-normal.woff2";
import montserrat800 from "@fontsource/montserrat/files/montserrat-latin-800-normal.woff2";

// Fonts are bundled from npm (@fontsource) instead of fetched from Google
// Fonts at render time, so renders work offline and are reproducible.
// Montserrat is the house sans (video-editing skill rule: the only sans).
// Playfair Display italic and Instrument Serif italic are the expressive
// accent voices (design-language.md); use one per beat.
export const SANS = "Montserrat";
export const SERIF = "Instrument Serif";
export const PLAYFAIR = "Playfair Display";

loadFont({ family: SANS, url: montserrat100, weight: "100" });
loadFont({ family: SANS, url: montserrat300, weight: "300" });
loadFont({ family: SANS, url: montserrat400, weight: "400" });
loadFont({ family: SANS, url: montserrat500, weight: "500" });
loadFont({ family: SANS, url: montserrat600, weight: "600" });
loadFont({ family: SANS, url: montserrat700, weight: "700" });
loadFont({ family: SANS, url: montserrat800, weight: "800" });
loadFont({ family: SERIF, url: instrumentSerifItalic, weight: "400", style: "italic" });
loadFont({ family: PLAYFAIR, url: playfair500i, weight: "500", style: "italic" });
loadFont({ family: PLAYFAIR, url: playfair600i, weight: "600", style: "italic" });
loadFont({ family: PLAYFAIR, url: playfair700i, weight: "700", style: "italic" });
