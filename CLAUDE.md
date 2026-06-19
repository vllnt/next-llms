# @vllnt/next-llms

AI discoverability for Next.js sites: generate an `llms.txt` manifest and serve
any page as raw markdown. First Type D (`@vllnt/next-*`) package in the vllnt
OSS fleet. It follows the vllnt standards (see the `oss-packages` hub
`.claude/rules/nextjs-standard.md` + `component-standard.md` Universal set).

## Architecture

```
src/
├── index.ts          # public barrel — re-exports the API + types
├── types.ts          # public TypeScript types (no runtime code)
├── llms-text.ts      # generateLlmsText — the llms.txt index
└── markdown-route.ts # createMarkdownRoute — Web Response route handler
```

Pure TypeScript, zero runtime dependencies. The whole surface is two functions
over Web-standard `Request` / `Response` / `URL`.

## Ownership boundary

**Package owns:**

- The `llms.txt` markdown serialization (llmstxt.org shape).
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
- **Two pure functions, no shared state.** `generateLlmsText` is a deterministic
  string builder; `createMarkdownRoute` is a factory closing over the resolver +
  options. Nothing is global, so the package is trivially testable and
  tree-shakeable.
- **Semantic public-API ordering.** The `nodejs` ESLint preset is app-tuned;
  `eslint.config.js` disables `perfectionist/sort-*` for `src/**` (public-API
  member order is semantic — `title` first), exempts HTTP header literal keys
  from `naming-convention`, and exempts TSDoc from prose linting.
- **100% coverage is BLOCKING.** `vitest.config.mts` thresholds (statements,
  branches, functions, lines) are 100 over the three source files; CI runs
  `pnpm test:coverage`. Adding a source file to the coverage `include` without a
  test fails CI.

## Conventions

- Pure TS, ESM, NodeNext resolution — relative imports carry the `.js`
  extension.
- Explicit return types on every public function; no `any`.
- Runtime deps: none (the fleet dependency policy — official `@convex-dev/*` +
  `@vllnt/*` only — bites only if a dep is ever added; this package has none).
- Tests: `vitest` (node env), 100% coverage gate.

## Project rules

The universal vllnt engineering rules ship in `.claude/rules/` — **synced from
the `oss-packages` hub** (single source; edit them there, not here):

| Rule                                                   | Covers                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| [`code-style.md`](.claude/rules/code-style.md)         | Match-surrounding-code, smallest change that works, typed APIs |
| [`git-workflow.md`](.claude/rules/git-workflow.md)     | Branch-first, signed no-reply commits, landing mode            |
| [`commit-privacy.md`](.claude/rules/commit-privacy.md) | No-reply commit identity; never leak a personal email          |
| [`security.md`](.claude/rules/security.md)             | Secrets, boundary validation, OWASP, dependency review         |
| [`docs-sync.md`](.claude/rules/docs-sync.md)           | **BLOCKING** docs stay current with every commit               |

The full BLOCKING standard (Universal set + Next.js conventions) and fleet
governance live in the hub (`oss-packages` `.claude/rules/nextjs-standard.md` +
`component-standard.md`) — not duplicated into this repo.

## Docs sync

| Changed                                                                | Update in the same commit                                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Public API (`generateLlmsText` / `createMarkdownRoute`, args, returns) | README API table, `docs/API.md`, `llms.txt`                          |
| Config types / options (`LlmsConfig`, `MarkdownRouteOptions`)          | README, `docs/API.md`                                                |
| Response behavior (status, headers, cache defaults)                    | `docs/API.md` behavior table, README                                 |
| Naming (package, repo, exports)                                        | README, `package.json`, `llms.txt`, this file (+ `CLAUDE.md` mirror) |
| Version                                                                | `CHANGELOG.md` entry, version badge                                  |

Grep old values before committing (e.g. `git grep "<old-name>"` → must be
empty).
