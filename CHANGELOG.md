# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-17

### Added

- First release of `@vllnt/next-llms`.
- `generateLlmsText(config)` — generate a spec-compliant `llms.txt` index: an
  `#` title, a `>` blockquote, optional free prose, `## Section` link lists, and
  a droppable `## Optional` section (per the llmstxt.org specification).
- `generateLlmsFullText(config)` — generate the `llms-full.txt` companion: the
  same header followed by every page's full markdown inlined under `## Section`
  → `### Page` headings.
- `createMarkdownRoute(resolver, options?)` — a Web-standard
  `(request) => Promise<Response>` App Router route handler that strips a
  trailing `.md`, resolves the slug, and returns `text/markdown` with a
  `Cache-Control` header (overridable), or `404` when the resolver returns
  `null`.
- Zero runtime dependencies; typed end to end.
