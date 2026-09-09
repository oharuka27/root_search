import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig(config, {
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
