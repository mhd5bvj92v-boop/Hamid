// Creative Director Studio (npm run studio): the React UI with the Remotion
// Player, plus the local API (studio/server) that reads/writes edit.json and
// drives the Remotion renderer. public/ is served as-is so the Player uses the
// same staticFile() paths as the renderer.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { studioApi } from "./studio/server/api";

export default defineConfig({
  root: "studio",
  publicDir: "../public",
  plugins: [react(), studioApi()],
  server: { port: 3010, strictPort: true, host: "127.0.0.1", fs: { strict: false } },
});
