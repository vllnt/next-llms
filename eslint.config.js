import nodejs from "@vllnt/eslint-config/nodejs";

export default [
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "eslint.config.js",
      "vitest.config.mts",
      "scripts/**",
    ],
  },
  ...nodejs,
  {
    // Library overrides on the app-tuned `nodejs` preset:
    // - public-API member order is semantic (title first), not alphabetical;
    // - HTTP header keys (`Content-Type`) are literal strings, not camelCase;
    // - TSDoc is prose, not subject to code prose-style linting;
    // - `null` is the explicit "no page" sentinel in the resolver contract.
    files: ["src/**/*.ts"],
    rules: {
      "perfectionist/sort-interfaces": "off",
      "perfectionist/sort-object-types": "off",
      "perfectionist/sort-union-types": "off",
      "@typescript-eslint/naming-convention": "off",
      "write-good-comments/write-good-comments": "off",
      "unicorn/no-null": "off",
    },
  },
  {
    // Test fixtures mirror the public-API shape, so their key order is semantic.
    files: ["src/**/*.test.ts"],
    rules: {
      "perfectionist/sort-objects": "off",
    },
  },
];
