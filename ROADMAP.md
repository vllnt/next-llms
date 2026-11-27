# Roadmap — @vllnt/next-llms

This package's own roadmap. Phases are immutable kebab-case **outcome slugs**;
tasks have stable `slug.N` IDs. History is never deleted — completed and dropped
work stays for the record.

**Status vocabulary:** `planned` · `in-progress` · `done` · `blocked` ·
`dropped`

> Hub-level milestones (creation, fleet programs, the canary→stable hold) live
> in the `vllnt/oss-packages` hub `ROADMAP.md`. This file tracks only this
> package's own work.

---

## scaffold-repo — `done`

First Type D (`@vllnt/next-*`) repo in the fleet. Universal conventions + canary
publishing, no Convex.

- `scaffold-repo.1` — `done` — `package.json` (zero runtime deps, author object,
  funding, engines, `publishConfig`, sideEffects), tsconfig set,
  `eslint.config.js` (base `@vllnt/eslint-config`), prettier,
  `vitest.config.mts` (node env, 100% thresholds), renovate, `.gitignore`, MIT
  `LICENSE`.
- `scaffold-repo.2` — `done` — CI (`ci.yml` lint/typecheck/test/build), canary
  `publish.yml` (`@canary`-only, OIDC provenance), `email-guard.yml`, `.github/`
  templates.
- `scaffold-repo.3` — `done` — `AGENTS.md` repository policy from the hub.

## ship-v0-core — `done`

Historical scope: three public functions at 0.1.0 (canary), 100% coverage, zero
runtime deps. **Current-state note:** merged
[PR #1](https://github.com/vllnt/next-llms/pull/1) removed
`generateLlmsFullText` and the repository full-text artifact. Current main
exports `generateLlmsText` and `createMarkdownRoute`; only early
`0.1.0-canary.*` builds include the removed export. The original task
descriptions below are retained as history, not a promise of the current export
surface. See [installation and release channels](README.md#installation).

- `ship-v0-core.1` — `done` — `generateLlmsText(config)` → llms.txt index (H1,
  blockquote, free prose, `## Section` link lists, droppable `## Optional`) per
  the llmstxt.org spec.
- `ship-v0-core.2` — `dropped` — removed by PR #1 after initial implementation;
  historical scope: `generateLlmsFullText(config)` → llms-full.txt (H1 +
  blockquote + each section's pages inlined with title + source link).
- `ship-v0-core.3` — `done` — `createMarkdownRoute(resolver, options)` → a
  Web-standard `(request) => Promise<Response>` App Router route handler: strips
  a trailing `.md`, resolves the slug, returns `text/markdown` with cache
  headers, `404` when the resolver returns `null`.
- `ship-v0-core.4` — `done` — docs set (README, `docs/API.md`, one `llms.txt`
  index, `AGENTS.md`, CHANGELOG, CONTRIBUTING, SECURITY, COC).
- `ship-v0-core.5` — `done` — 100% coverage (index format, route
  200/404/cache/content-type), lint/typecheck/build green.
- `ship-v0-core.6` — `done` — GitHub repo `vllnt/next-llms`, standard hardening
  (squash-only, branch protection, topics), push, CI green, canary publish
  verified.

## route-ergonomics — `planned`

Make the markdown route handle the full surface a real site needs.

- `route-ergonomics.1` — `planned` — `?format=md` query support via a tiny
  middleware helper (a page route can't catch `.md`-less paths; middleware
  rewrites them to the handler).
- `route-ergonomics.2` — `planned` — `HEAD` + `OPTIONS` handling,
  `Accept: text/markdown` content negotiation, configurable `Content-Type`
  charset.
- `route-ergonomics.3` — `planned` — optional `ETag` / `Last-Modified` from a
  resolver-supplied timestamp for conditional GETs.

## auto-discovery — `planned`

The value-add over a hand-written manifest: derive sections from the site
itself.

- `auto-discovery.1` — `planned` — build a manifest from an App Router route
  tree / a `content/` directory convention (the "what's on this site" index,
  automatically).
- `auto-discovery.2` — `planned` — a frontmatter convention so each page
  contributes its own title + summary to the manifest.

## next-standard — `planned`

This repo is the reference implementation for the hub `AGENTS.md` Type-D
guidance.

- `next-standard.1` — `planned` — fill the hub `AGENTS.md` Type-D guidance TBD
  section from this repo's real decisions (peer deps only when imported, node
  test env, reference repo = `next-llms`, exports map).

## first-stable-release — `in-progress`

First stable release is `0.1.0`, published from a `v0.1.0` tag on `main`. A
later 1.0.0 still waits on `route-ergonomics` and `auto-discovery`.

- `first-stable-release.1` — `planned` — a 1.0.0 commitment still needs the
  public API settled (`route-ergonomics` + `auto-discovery`).
- `first-stable-release.2` — `done` — first stable `0.1.0` was published to npm
  `latest` from a `v0.1.0` tag on 2026-11-22 (the former canary-only hold is
  lifted).
