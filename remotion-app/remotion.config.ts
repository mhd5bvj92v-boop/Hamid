/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Codec, pixel format and image format are set per composition (calculateMetadata
// defaults in src/Root.tsx) and spelled out in the npm render scripts, so the
// H.264 deliverables and the transparent ProRes overlay never share settings.

// Tag renders as BT.709 limited range (broadcast/web standard). Without this,
// JPEG frame capture produces full-range BT.601 (yuvj420p) H.264 files.
Config.setColorSpace("bt709");

// Use a local Chrome Headless Shell when Remotion cannot download its own
// (for example in sandboxes where remotion.media is blocked).
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
