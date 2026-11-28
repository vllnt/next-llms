# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-11-28

Documentation and tooling release. The published code, exports and types are
unchanged from 0.1.0; only TSDoc comments in `dist/` and `src/`, and the
matching source maps, differ.

### Changed

- `llms.txt` links the files shipped in the package (`README.md`, `docs/API.md`,
  `CHANGELOG.md`, `LICENSE`) by relative path, so they match the installed
  version, adds a "For coding agents" note, and ends with an "Ecosystem" list:
  the package page, the release feed, the vllnt oss index, package search, vllnt
  and the author. The README gains matching "For coding agents" and "Related
  packages" sections and adds a "Links" section before "License", in place of
  "Author", with the package page, release feed, oss index, package search,
  source, community, vllnt.com, author and sponsor links. The entry module's
  TSDoc links the package page.
- `package.json` `homepage` points to
  `https://oss.vllnt.com/packages/next-llms`.
- Every push to `main` that changes the package or its shipped docs publishes a
  canary.
- The README is rewritten for coding agents: a one-sentence summary, then "For
  coding agents", "When to use", "Install", "Quick start", "API", "Common
  tasks", "Errors and fixes", "Limits and gotchas" and "Compatibility". The
  examples are self-contained, and "Errors and fixes" lists every error the
  package raises itself or returns, plus the Next.js `500` for malformed
  percent-encoding.
- `package.json` `description` and `keywords` name what the package does and its
  stack. `llms.txt` carries the same summary and use cases and links the API
  reference and the errors table.
- `docs/API.md` gives each exported type its own heading and replaces the
  undefined `getDoc` placeholder with a self-contained example; so does the
  `createMarkdownRoute` TSDoc example. It no longer says to authorize in the
  resolver, which only receives the slug, and no longer claims Remix, Hono and
  Deno support, which is untested. It states that CI tests only Node.js 24 and
  that Next.js 16.4.6 was checked by hand.
- The docs state that empty segments from `//` are dropped (Next.js first
  answers `308` with the single-slash path) and only a segment left empty by
  stripping `.md` gets `400`, that `.md` is stripped before the segments are
  URL-decoded, that `cacheControl: ""` sends an empty `Cache-Control` header,
  which `Headers` message Node.js 18.0.0 gives for a bad `cacheControl`, that
  the slug includes any route prefix, that only a lowercase `.md` is stripped,
  that serving `/` needs `app/[[...slug]]`, and that a trailing newline in
  `details` is kept when no section follows.
- Internal: development tooling moves to eslint 10, pnpm 12 and
  `@vllnt/typescript` 3; CI and every publish test the packed tarball in a clean
  project first.

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
- `generateLlmsText(config)` — generate an `llms.txt` index in the llmstxt.org
  shape: an `#` title, a `>` blockquote, optional free prose, `## Section` link
  lists, and a droppable `## Optional` section.
- `createMarkdownRoute(resolver, options?)` — a Web-standard
  `(request) => Promise<Response>` App Router route handler that strips a
  trailing `.md`, resolves the slug, and returns `text/markdown` with a
  `Cache-Control` header (overridable), or `404` when the resolver returns
  `null`.
- Zero runtime dependencies and no peer dependencies (the package imports
  nothing from `next` or `react`); typed end to end.

### Security

- `createMarkdownRoute` now answers `400` without calling the resolver when the
  path has malformed percent-encoding (previously an unhandled `URIError`), a
  segment left empty by stripping `.md`, or a decoded segment that is `.`, `..`,
  or contains `/`, `\` or a NUL byte (for example `..%2F..%2Fsecret`), so
  resolvers that map slugs to files never receive a traversal sequence.
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
