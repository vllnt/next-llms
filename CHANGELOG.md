# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-11-27

Documentation and tooling release. The published code, exports and types are
unchanged from 0.1.0; only TSDoc comments in `dist/` and `src/` differ.

### Changed

- `llms.txt` links the files shipped in the package (`README.md`, `docs/API.md`,
  `CHANGELOG.md`, `LICENSE`) by relative path, so they match the installed
  version, and adds a "For coding agents" note and an Ecosystem link to the
  vllnt oss index. The README gains matching "For coding agents" and "Related
  packages" sections.
- `package.json` `homepage` points to
  `https://oss.vllnt.com/packages/next-llms`.
- Every push to `main` that changes the package or its shipped docs publishes a
  canary; the canary job no longer depends on a repository variable.
- The README is rewritten for coding agents: a one-sentence summary, then "For
  coding agents", "When to use", "Install", "Quick start", "API", "Common
  tasks", "Errors and fixes", "Limits and gotchas" and "Compatibility". The
  examples are self-contained, and "Errors and fixes" lists every error the
  package throws or returns. A test checks the section order, the code blocks,
  the links, that every export and error is documented, and runs the README
  examples against the built package.
- `package.json` `description` and `keywords` name what the package does and its
  stack. `llms.txt` carries the same summary and use cases and links the API
  reference and the errors table.
- `docs/API.md` gives each exported type its own heading and replaces the
  undefined `getDoc` placeholder with a self-contained example; so does the
  `createMarkdownRoute` TSDoc example.
- The README ends with links to the vllnt open source index, the package page,
  vllnt.com and the author; `llms.txt` ends with a matching "Ecosystem" list;
  the entry module's TSDoc links the package page.
- Development tooling moves to eslint 10, pnpm 12 and `@vllnt/typescript` 3, and
  CI now checks formatting (`pnpm format:check`).

### Fixed

- The `llms.txt` link-list example showed a GitHub URL instead of `url`.
- `llms.txt` now documents the `400` response for unsafe paths and the `404` for
  any non-string resolver result.
- README links to `SECURITY.md` and `CONTRIBUTING.md`, which are not in the
  package, now point to GitHub so they resolve from `node_modules`.

## [0.1.0] - 2026-11-23

First stable release. Earlier `0.1.0-canary.*` builds (npm `latest` pointed at
the oldest one, from 2026-06-17) were prereleases and are superseded by this
version.

### Added

- First stable release of `@vllnt/next-llms`.
- `generateLlmsText(config)` — generate a spec-compliant `llms.txt` index: an
  `#` title, a `>` blockquote, optional free prose, `## Section` link lists, and
  a droppable `## Optional` section (per the llmstxt.org specification).
- `createMarkdownRoute(resolver, options?)` — a Web-standard
  `(request) => Promise<Response>` App Router route handler that strips a
  trailing `.md`, resolves the slug, and returns `text/markdown` with a
  `Cache-Control` header (overridable), or `404` when the resolver returns
  `null`.
- Zero runtime dependencies and no peer dependencies (the package imports
  nothing from `next` or `react`); typed end to end.

### Security

- `createMarkdownRoute` now answers `400` without calling the resolver when the
  path has malformed percent-encoding (previously an unhandled `URIError`) or a
  decoded segment that is empty, `.`, `..`, or contains `/`, `\` or a NUL byte
  (for example `..%2F..%2Fsecret`), so resolvers that map slugs to files never
  receive a traversal sequence.
- `createMarkdownRoute` answers `404` when the resolver returns a non-string
  value such as `undefined` (previously an empty `200`), sets
  `X-Content-Type-Options: nosniff`, and throws a `TypeError` at creation for an
  invalid `cacheControl` value instead of failing on every request.
- `generateLlmsText` collapses line breaks in titles, summaries and notes,
  escapes `[`, `]` and `\` in link titles, percent-encodes whitespace, `(`, `)`,
  `<`, `>` and `\` in URLs, and throws a `TypeError` for blank titles, blank
  URLs, and `javascript:`, `data:` or `vbscript:` URLs, so values cannot inject
  Markdown structure.

### Changed

- Clarify installation and release channels, document explicit private caching
  for personalized content, and expand the maintained `llms.txt` index.
- Releases are published only from a `vX.Y.Z` tag on `main` through trusted
  publishing with provenance.

### Removed

- Relative to the canary builds only: `generateLlmsFullText` and the
  `LlmsFullConfig`, `LlmsFullPage`, and `LlmsFullSection` types are not part of
  the stable API. Use `generateLlmsText` to link to pages served by
  `createMarkdownRoute` instead.
