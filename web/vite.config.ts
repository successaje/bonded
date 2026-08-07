import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // A committed mirror of agents/src/underwriting.ts, kept in sync by
      // `npm run gen:abis`. Aliasing to the local copy means the web build has
      // no cross-package dependency and deploys cleanly from web/ as its own
      // root on Vercel.
      "@bonded/underwriting": fileURLToPath(new URL("./src/lib/underwriting.ts", import.meta.url)),
    },
  },
  server: { port: 5175 },
});
