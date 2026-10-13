import { config } from "@remotion/eslint-config-flat";
import globals from "globals";

export default [
  ...config,
  {
    // the Studio is an editor UI around the Player, not a composition: native <img>/<video> are right there
    files: ["studio/**/*.{ts,tsx}"],
    rules: { "@remotion/warn-native-media-tag": "off" },
  },
  {
    files: ["studio/tests/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
