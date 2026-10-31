# Contributing to @vllnt/next-llms

Thanks for your interest in contributing!

## Development Setup

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test:coverage
```

## Testing

Tests run with [Vitest](https://vitest.dev) in the Node environment:

```bash
pnpm test           # single run
pnpm test:watch     # watch mode
pnpm test:coverage  # enforced 100% on covered files
```

Coverage is gated at 100% (`vitest.config.mts`). Every export needs a happy-path
test **and** at least one adversarial test (empty input, not-found, boundary).

## Code Style

- Prettier + ESLint (run `pnpm lint` before submitting)
- `@vllnt/eslint-config/nodejs` flat config
- No `any` — use `unknown` + type guards
- Explicit return types on public APIs

## Pull Requests

- Target `main`
- One logical change per PR
- Include tests for new behavior or bug fixes
- Ensure all checks pass:
  `pnpm typecheck && pnpm lint && pnpm test:coverage && pnpm build`

## Releases

Maintainers only. Every publish runs in `.github/workflows/publish.yml` with npm
trusted publishing and provenance; nothing is published from a local machine.

- Canary (`@canary`): pushes to `main` publish one when the `CANARY_ENABLED`
  repository variable is `true`; otherwise run the workflow manually on `main`.
- Stable (`@latest`): merge a PR that sets `package.json` `version` and adds a
  matching `## [X.Y.Z]` entry to `CHANGELOG.md`, then push the tag `vX.Y.Z` on
  that `main` commit.

## Reporting Issues

Use [GitHub Issues](https://github.com/vllnt/next-llms/issues). For security
vulnerabilities, see [SECURITY.md](./SECURITY.md).
