import { defineConfig } from "vitest/config";
// Unit tests do not start a Workers runtime; Playwright exercises workerd separately.
export default defineConfig({ test: { include: ["tests/*.test.ts"] } });
