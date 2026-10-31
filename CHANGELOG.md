# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

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
