import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup/setupTests.js"],
    environment: "node",
    pool: "threads",
    maxThreads: 1,
    minThreads: 1,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "coverage",
      include: ["server/**", "game/**", "client/**"],
      exclude: ["**/node_modules/**", "tests/**"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90,
      },
    },
  },
})
