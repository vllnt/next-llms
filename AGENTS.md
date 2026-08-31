# @vllnt/next-llms

AI discoverability for Next.js sites: generate `llms.txt` / `llms-full.txt`
manifests and serve any page as raw markdown. First Type D (`@vllnt/next-*`)
package in the vllnt OSS fleet. It follows the vllnt standards (see the
`oss-packages` hub `AGENTS.md` universal package contract).

## Agent instructions

`AGENTS.md` is the sole agent-instruction source for this repository. Do not add
`CLAUDE.md` or `.claude` content.

## Architecture

```
src/
├── index.ts          # public barrel — re-exports the API + types
├── types.ts          # public TypeScript types (no runtime code)
├── llms-text.ts      # generateLlmsText — the llms.txt index
├── llms-full.ts      # generateLlmsFullText — the llms-full.txt bundle
└── markdown-route.ts # createMarkdownRoute — Web Response route handler
```

Pure TypeScript, zero runtime dependencies. The whole surface is three functions
over Web-standard `Request` / `Response` / `URL`.

## Ownership boundary

**Package owns:**

- The `llms.txt` / `llms-full.txt` markdown serialization (llmstxt.org shape).
- The route handler's request→slug decoding (trailing `.md` strip, URL-decode)
  and response shaping (status, `Content-Type`, `Cache-Control`, `404`).

**Consumer owns:**

- The manifest content (titles, summaries, section links) — passed in as config.
- The `MarkdownResolver` — where page content comes from (filesystem, CMS, DB),
  and authorizing/validating the slug before returning content.
- Where each route is mounted (`app/llms.txt/route.ts`,
  `app/[...slug]/route.ts`).

## Key design decisions

- **Zero runtime dependencies, runtime-agnostic.** The route handler returns a
  Web-standard `Response` and imports nothing from `next`, so it runs on the
  Edge, Node, Remix, Hono, or Deno. `next` is not even a peer dependency — the
  package is positioned for Next.js but coupled to nothing.
- **`null` is the not-found sentinel.** `MarkdownResolver` returns `string` for
  content (an empty string is still content → `200`) or `null` for "no page" →
  `404`. This is an explicit, type-level distinction, so `unicorn/no-null` is
  disabled for `src/**` (the sentinel is the public contract).
- **Three pure functions, no shared state.** `generateLlmsText` /
  `generateLlmsFullText` are deterministic string builders;
  `createMarkdownRoute` is a factory closing over the resolver + options.
  Nothing is global, so the package is trivially testable and tree-shakeable.
- **llms.txt vs llms-full.txt split.** The index links to pages; the full bundle
  inlines them. They take different config types (`LlmsConfig` with links vs
  `LlmsFullConfig` with page bodies) rather than one overloaded shape.
- **Semantic public-API ordering.** The `nodejs` ESLint preset is app-tuned;
  `eslint.config.js` disables `perfectionist/sort-*` for `src/**` (public-API
  member order is semantic — `title` first), exempts HTTP header literal keys
  from `naming-convention`, and exempts TSDoc from prose linting.
- **100% coverage is BLOCKING.** `vitest.config.mts` thresholds (statements,
  branches, functions, lines) are 100 over the four source files; CI runs
  `pnpm test:coverage`. Adding a source file to the coverage `include` without a
  test fails CI.

## Conventions

- Pure TS, ESM, NodeNext resolution — relative imports carry the `.js`
  extension.
- Explicit return types on every public function; no `any`.
- Runtime deps: none (the fleet dependency policy — official `@convex-dev/*` +
  `@vllnt/*` only — bites only if a dep is ever added; this package has none).
- Tests: `vitest` (node env), 100% coverage gate.

## Repository policy

- Match surrounding code and make the smallest coherent change.
- Keep public APIs typed, validate trust boundaries, and never commit secrets.
- Use a feature branch, signed no-reply commits, and the repository's required checks.
- Update affected documentation in the same commit and grep stale values.

## Docs sync

| Changed                                                                                         | Update in the same commit                                               |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Public API (`generateLlmsText` / `generateLlmsFullText` / `createMarkdownRoute`, args, returns) | README API table, `docs/API.md`, `llms.txt`, regenerate `llms-full.txt` |
| Config types / options (`LlmsConfig`, `MarkdownRouteOptions`)                                   | README, `docs/API.md`                                                   |
| Response behavior (status, headers, cache defaults)                                             | `docs/API.md` behavior table, README                                    |
| Naming (package, repo, exports)                                                                 | README, `package.json`, `llms.txt`, this file    |
| Version                                                                                         | `CHANGELOG.md` entry, version badge                                     |
| Any change                                                                                      | `pnpm generate:llms` to keep `llms-full.txt` current                    |

Grep old values before committing (e.g. `git grep "<old-name>"` → must be
empty).
