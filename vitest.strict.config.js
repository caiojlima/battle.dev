import { defineConfig } from "vitest/config"

import base from "./vitest.config.js"

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      ...(base.test?.coverage || {}),
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 100,
      },
    },
  },
})

