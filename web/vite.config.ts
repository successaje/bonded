import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const agentsSrc = fileURLToPath(new URL("../agents/src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The dashboard scores offers with the *same* module the buyer agent
      // runs — one source of truth for the underwriting model, so the UI can
      // never show reasoning the agent wouldn't actually act on.
      "@bonded/underwriting": `${agentsSrc}/underwriting.ts`,
    },
  },
  server: {
    port: 5175,
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
  },
});
