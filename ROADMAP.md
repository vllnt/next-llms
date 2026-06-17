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
  `publish.yml` (`@canary`-only, OIDC provenance, `CANARY_ENABLED`-gated),
  `email-guard.yml`, `.github/` templates.
- `scaffold-repo.3` — `done` — `.claude/rules/` universal subset synced from the
  hub.

## ship-v0-core — `in-progress`

The three public functions at 0.1.0 (canary), 100% coverage, zero runtime deps.

- `ship-v0-core.1` — `in-progress` — `generateLlmsText(config)` → llms.txt index
  (H1, blockquote, free prose, `## Section` link lists, droppable `## Optional`)
  per the llmstxt.org spec.
- `ship-v0-core.2` — `in-progress` — `generateLlmsFullText(config)` →
  llms-full.txt (H1 + blockquote + each section's pages inlined with title +
  source link).
- `ship-v0-core.3` — `in-progress` — `createMarkdownRoute(resolver, options)` →
  a Web-standard `(request) => Promise<Response>` App Router route handler:
  strips a trailing `.md`, resolves the slug, returns `text/markdown` with cache
  headers, `404` when the resolver returns `null`.
- `ship-v0-core.4` — `in-progress` — docs set (README, `docs/API.md`,
  `llms.txt` + `llms-full.txt`, AGENTS/CLAUDE mirror, CHANGELOG, CONTRIBUTING,
  SECURITY, COC).
- `ship-v0-core.5` — `in-progress` — 100% coverage (index format, full text,
  route 200/404/cache/content-type), lint/typecheck/build green.
- `ship-v0-core.6` — `in-progress` — GitHub repo `vllnt/next-llms`, standard
  hardening (squash-only, branch protection, topics), push, CI green, canary
  publish verified.

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

This repo is the reference implementation for the hub `nextjs-standard.md`.

- `next-standard.1` — `planned` — fill the hub `nextjs-standard.md` TBD section
  from this repo's real decisions (peer deps only when imported, node test env,
  reference repo = `next-llms`, exports map).

## first-stable-release — `blocked`

Promote 0.1.0 (canary) to the first stable release.

- `first-stable-release.1` — `blocked` — needs the public API settled
  (`route-ergonomics` + `auto-discovery` shape the surface before a 1.0.0
  commitment).
- `first-stable-release.2` — `blocked` — gated by the hub canary-only version
  hold (no version bump past 0.1.0 until the owner cuts the first stable
  release).
