# API Reference — @vllnt/next-llms

**Compatibility:** uses only Web-standard `Request`, `Response`, `URL` and
`Headers`. Checked with Next.js 16.4.6 App Router route handlers (Node.js and
Edge runtimes); other runtimes are not tested. Node `>=18`; CI runs the tests on
Node.js 24 only, so 18 to 23 are not tested. Zero runtime dependencies.

See [release channels](../README.md#compatibility) and
[errors and fixes](../README.md#errors-and-fixes). `generateLlmsFullText` from
early canary builds is not part of the stable API.

All exports are available from the package root (`"@vllnt/next-llms"`).

---

## `generateLlmsText(config)`

Render an `llms.txt` index manifest from a config object, following the
[llms.txt specification](https://llmstxt.org).

```ts
function generateLlmsText(config: LlmsConfig): string;
```

Output layout (blocks joined by a blank line, no trailing newline):

1. `# {title}` — required H1.
2. `> {summary}` — blockquote, when `summary` is set.
3. `{details}` — free-form markdown, when `details` is set.
4. One `## {section.title}` block per entry in `sections`, each followed by its
   `- [title](url): notes` link list (`: notes` omitted when absent).
5. A `## Optional` block, when `optional` is a non-empty array.

Escaping and validation: line breaks in titles, summary and notes collapse to a
space; `[`, `]` and `\` in link titles are backslash-escaped; whitespace, `(`,
`)`, `<`, `>` and `\` in URLs are percent-encoded. A blank `title`, section
title, link title or link `url`, or a `url` using `javascript:`, `data:` or
`vbscript:`, throws a `TypeError`. `details` is free-form markdown and is
emitted unchanged.

### `LlmsConfig`

| Field      | Type             | Notes                                            |
| ---------- | ---------------- | ------------------------------------------------ |
| `title`    | `string`         | Required. Rendered as the `#` H1.                |
| `summary`  | `string?`        | Rendered as a `>` blockquote.                    |
| `details`  | `string?`        | Free-form markdown after the blockquote.         |
| `sections` | `LlmsSection[]?` | Named `## Section` link lists.                   |
| `optional` | `LlmsLink[]?`    | Links under the droppable `## Optional` section. |

### `LlmsSection`

`{ title: string; links: LlmsLink[] }` — one `## {title}` block and its links.
`title` is required; a section with an empty `links` array renders only its
heading.

### `LlmsLink`

`{ title: string; url: string; notes?: string }` — one `- [title](url): notes`
line. `title` and `url` are required; `: notes` is left out when `notes` is
empty.

### Example

```ts
import { generateLlmsText } from "@vllnt/next-llms";

export const text = generateLlmsText({
  title: "Acme Docs",
  summary: "Everything an agent needs to use Acme.",
  sections: [
    {
      title: "Docs",
      links: [{ title: "Quickstart", url: "/docs/quickstart.md" }],
    },
  ],
  optional: [{ title: "Changelog", url: "/changelog.md" }],
});
```

---

## `createMarkdownRoute(resolver, options?)`

Create a Next.js App Router route handler that serves a slug's markdown content.
Mount it at a catch-all route (`app/[...slug]/route.ts`). The handler is a pure
Web-standard `(request) => Promise<Response>` and imports nothing from `next`.

```ts
function createMarkdownRoute(
  resolver: MarkdownResolver,
  options?: MarkdownRouteOptions,
): (request: Request) => Promise<Response>;
```

### `MarkdownResolver`

`(slug: string[]) => string | null | Promise<string | null>`. The slug is the
full request path's non-empty segments: a trailing lowercase `.md` is removed
from the last raw segment, then each segment is URL-decoded (`/docs/intro%2Emd`
gives `["docs", "intro.md"]`). It includes any route prefix (`/md/docs/intro.md`
gives `["md", "docs", "intro"]`). Return a string for content or `null` for not
found.

### `MarkdownRouteOptions`

`{ cacheControl?: string }` — the `Cache-Control` value for `200` responses.
`cacheControl: ""` sends an empty `Cache-Control` header; it does not fall back
to the default.

### Behavior

| Request                      | Resolver returns | Response                                                                                    |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `/docs/intro.md`             | `"# Intro…"`     | `200`, `Content-Type: text/markdown; charset=utf-8`, `Cache-Control`                        |
| `/docs/intro.md`             | `""`             | `200` with an empty body (empty string is content, not absence)                             |
| `/missing.md`                | `null`           | `404`, `Content-Type: text/plain; charset=utf-8`, body `Not Found`                          |
| `/missing.md`                | non-string       | `404`, same as `null`                                                                       |
| `/..%2Fsecret`, `/a%00b`     | not called       | `400`, `text/plain`, body `Bad Request`                                                     |
| `/docs/getting%20started.md` | —                | resolver receives `["docs", "getting started"]`                                             |
| `/`                          | —                | resolver receives `[]` (needs `app/[[...slug]]` in Next.js; `[...slug]` does not match `/`) |

A request is rejected with `400` (the resolver is not called) when the path has
malformed percent-encoding, a segment left empty by stripping `.md` (`/.md`,
`/docs/.md`), or a decoded segment that is `.`, `..`, or contains `/`, `\` or a
NUL byte. Empty segments from `//` are dropped, not rejected (`/docs//intro.md`
gives `["docs", "intro"]`). In Next.js, malformed percent-encoding (such as
`/docs/%E0.md`) gets Next's own `500` before the handler runs, so only the
segment checks are seen there. Every response carries
`X-Content-Type-Options: nosniff`. An invalid `cacheControl` value throws a
`TypeError` when the handler is created.

Default `Cache-Control`:
`public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800` — override
with `options.cacheControl`. For private or personalized responses, explicitly
use `{ cacheControl: "private, no-store" }`, and check the request in your own
`GET` before calling the handler: the resolver receives only the slug (see
[Common tasks](../README.md#common-tasks)). The public default is not suitable
for authenticated content.

### Example

```ts
// app/[...slug]/route.ts
import { createMarkdownRoute } from "@vllnt/next-llms";

const pages: Record<string, string> = { "docs/intro": "# Intro\n\nHello." };

export const GET = createMarkdownRoute(
  (slug) => pages[slug.join("/")] ?? null,
  { cacheControl: "public, max-age=60" },
);
```
