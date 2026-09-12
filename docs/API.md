# API Reference — @vllnt/next-llms

**Compatibility:** any Web-standard runtime — Next.js App Router (Edge or Node),
Remix, Hono, Deno. Node `>=18`. Zero runtime dependencies.

All exports are available from the package root:

```ts
import { generateLlmsText, createMarkdownRoute } from "@vllnt/next-llms";
```

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

### `LlmsConfig`

| Field      | Type             | Notes                                            |
| ---------- | ---------------- | ------------------------------------------------ |
| `title`    | `string`         | Required. Rendered as the `#` H1.                |
| `summary`  | `string?`        | Rendered as a `>` blockquote.                    |
| `details`  | `string?`        | Free-form markdown after the blockquote.         |
| `sections` | `LlmsSection[]?` | Named `## Section` link lists.                   |
| `optional` | `LlmsLink[]?`    | Links under the droppable `## Optional` section. |

`LlmsSection` = `{ title: string; links: LlmsLink[] }`. `LlmsLink` =
`{ title: string; url: string; notes?: string }`.

### Example

```ts
generateLlmsText({
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

`MarkdownResolver` =
`(slug: string[]) => string | null | Promise<string | null>`. The slug is the
path segments, URL-decoded, with any trailing `.md` removed.

`MarkdownRouteOptions` = `{ cacheControl?: string }`.

### Behavior

| Request                      | Resolver returns | Response                                                             |
| ---------------------------- | ---------------- | -------------------------------------------------------------------- |
| `/docs/intro.md`             | `"# Intro…"`     | `200`, `Content-Type: text/markdown; charset=utf-8`, `Cache-Control` |
| `/docs/intro.md`             | `""`             | `200` with an empty body (empty string is content, not absence)      |
| `/missing.md`                | `null`           | `404`, `Content-Type: text/plain; charset=utf-8`, body `Not Found`   |
| `/docs/getting%20started.md` | —                | resolver receives `["docs", "getting started"]`                      |
| `/`                          | —                | resolver receives `[]`                                               |

Default `Cache-Control`:
`public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800` — override
with `options.cacheControl`.

### Example

```ts
// app/[...slug]/route.ts
import { createMarkdownRoute } from "@vllnt/next-llms";

export const GET = createMarkdownRoute(
  async (slug) => (await getDoc(slug.join("/")))?.markdown ?? null,
  { cacheControl: "public, max-age=60" },
);
```
