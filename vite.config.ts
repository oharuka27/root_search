import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/mcp": "http://127.0.0.1:3001" } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          mcp: [
            "@modelcontextprotocol/sdk/client/index.js",
            "@modelcontextprotocol/sdk/client/streamableHttp.js",
          ],
          map: ["leaflet"],
        },
      },
    },
  },
});
