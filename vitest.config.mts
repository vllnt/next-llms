import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "dist/**"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    coverage: {
      provider: "v8",
      // List every source file that must be covered. Adding a source file here
      // without a matching test fails CI — that is the 100% coverage gate.
      include: ["src/index.ts", "src/llms-text.ts", "src/markdown-route.ts"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
