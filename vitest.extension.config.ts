import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@ext": path.resolve(__dirname, "extension/src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["extension/tests/**/*.test.ts"],
  },
});
