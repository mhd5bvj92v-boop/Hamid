import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Local OFL-licensed Inter; loadFont holds rendering until each face is ready.
const faces: [string, string][] = [
  ["Inter-Regular.otf", "400"],
  ["Inter-Medium.otf", "500"],
  ["Inter-SemiBold.otf", "600"],
  ["Inter-Bold.otf", "700"],
];

export const fontsReady = Promise.all(
  faces.map(([file, weight]) => loadFont({ family: "Inter", url: staticFile(`fonts/${file}`), weight, format: "opentype" })),
);
