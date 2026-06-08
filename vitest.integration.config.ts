import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // Sets SUPABASE_ENV before any test module runs — satisfies the guard at
    // the top of integration test files without requiring the caller to export it.
    env: {
      SUPABASE_ENV: "local",
    },
  },
});
