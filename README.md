# @vllnt/next-llms

Generate an llms.txt file and serve pages as Markdown from Next.js App Router
route handlers, using Web-standard Request and Response and no dependencies.

## For coding agents

Docs ship in `node_modules/@vllnt/next-llms/` (`README.md`, `docs/API.md`,
`llms.txt`, `CHANGELOG.md`, `src/`) and match the installed version. The bundled
`llms.txt` describes this package; it is not output of `generateLlmsText`.

## When to use

- Use it when your Next.js site should serve an `/llms.txt` link index.
- Use it when you have Markdown for your pages and want it at `.md` URLs.
- Do not use it to build the link list from your routes; build it in your code.
- Do not use it to convert HTML to Markdown; use a converter such as `turndown`.
- Do not use it for `llms-full.txt`; concatenate your pages in your own route.

## Install

```bash
pnpm add @vllnt/next-llms
```

## Quick start

```ts
// app/[...slug]/route.ts — serves /docs/intro.md (and /docs/intro)
import { createMarkdownRoute } from "@vllnt/next-llms";

const pages: Record<string, string> = { "docs/intro": "# Intro\n\nHello." };

export const GET = createMarkdownRoute((slug) => pages[slug.join("/")] ?? null);
```

```ts
// app/llms.txt/route.ts — serves /llms.txt
import { generateLlmsText } from "@vllnt/next-llms";

export function GET(): Response {
  const text = generateLlmsText({
    title: "Acme",
    summary: "Acme is a widget API.",
    sections: [
      { title: "Docs", links: [{ title: "Intro", url: "/docs/intro.md" }] },
    ],
  });
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

[![npm](https://img.shields.io/npm/v/@vllnt/next-llms.svg)](https://www.npmjs.com/package/@vllnt/next-llms)
[![CI](https://github.com/vllnt/next-llms/actions/workflows/ci.yml/badge.svg)](https://github.com/vllnt/next-llms/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@vllnt/next-llms.svg)](./LICENSE)

## API

Everything is exported from the package root. Full reference:
[docs/API.md](docs/API.md).

| Export                                                                                       | Kind     | What it is                                                                |
| -------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| [`generateLlmsText(config)`](docs/API.md#generatellmstextconfig)                             | function | Returns the `llms.txt` text as a `string` (no trailing newline).          |
| [`createMarkdownRoute(resolver, options?)`](docs/API.md#createmarkdownrouteresolver-options) | function | Returns a `(request: Request) => Promise<Response>` route handler.        |
| [`LlmsConfig`](docs/API.md#llmsconfig)                                                       | type     | Input of `generateLlmsText`: title, summary, details, sections, optional. |
| [`LlmsSection`](docs/API.md#llmssection)                                                     | type     | One `## {title}` section and its links.                                   |
| [`LlmsLink`](docs/API.md#llmslink)                                                           | type     | One `- [title](url): notes` line.                                         |
| [`MarkdownResolver`](docs/API.md#markdownresolver)                                           | type     | `(slug: string[]) => string \| null \| Promise<string \| null>`.          |
| [`MarkdownRouteOptions`](docs/API.md#markdownrouteoptions)                                   | type     | `{ cacheControl?: string }` for `createMarkdownRoute`.                    |

## Common tasks

Serve Markdown files from a `content/` folder (Node.js runtime). The route
rejects slugs with `..`, `/`, `\` or NUL before the resolver runs.

```ts
// app/[...slug]/route.ts — /docs/intro.md reads content/docs/intro.md
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createMarkdownRoute } from "@vllnt/next-llms";

const CONTENT_DIR = join(process.cwd(), "content");

export const GET = createMarkdownRoute(async (slug) => {
  try {
    return await readFile(`${join(CONTENT_DIR, ...slug)}.md`, "utf8");
  } catch {
    return null; // any read error becomes a 404
  }
});
```

Mount the route under a prefix. The slug is built from the full request path, so
it includes the prefix; drop it yourself.

```ts
// app/md/[...slug]/route.ts — /md/docs/intro.md gives ["md", "docs", "intro"]
import { createMarkdownRoute } from "@vllnt/next-llms";

const pages: Record<string, string> = { "docs/intro": "# Intro\n\nHello." };

export const GET = createMarkdownRoute(
  (slug) => pages[slug.slice(1).join("/")] ?? null,
);
```

Serve private content. The resolver only receives the slug, so check the request
in your own `GET` and turn off public caching.

```ts
// app/[...slug]/route.ts
import { createMarkdownRoute } from "@vllnt/next-llms";

const pages: Record<string, string> = { "docs/intro": "# Intro\n\nHello." };

const serve = createMarkdownRoute((slug) => pages[slug.join("/")] ?? null, {
  cacheControl: "private, no-store",
});

export async function GET(request: Request): Promise<Response> {
  const token = process.env.DOCS_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return serve(request);
}
```

Run on the Edge runtime: add `export const runtime = "edge";` to the route file.
The package uses no Node.js APIs. Next.js 16.4.6 serves it but warns at build
time that the Edge Runtime is deprecated.

## Errors and fixes

| Error or response                                                                                                                                            | Cause                                                                                                                                                                                              | Fix                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `TypeError: title must be a non-empty string`                                                                                                                | `generateLlmsText` got a missing, non-string or blank `title`.                                                                                                                                     | Pass a non-empty `title`.                                           |
| `TypeError: section title must be a non-empty string`                                                                                                        | A `sections[].title` is missing or blank.                                                                                                                                                          | Give every section a title.                                         |
| `TypeError: link title must be a non-empty string`                                                                                                           | A link in `sections[].links` or `optional` has no `title`.                                                                                                                                         | Give every link a title.                                            |
| `TypeError: link url must be a non-empty string`                                                                                                             | A link has no `url`.                                                                                                                                                                               | Give every link a `url`.                                            |
| `TypeError: link url must not use a javascript:, data: or vbscript: scheme`                                                                                  | A link `url` starts with one of those schemes (case and control characters ignored).                                                                                                               | Use an `http(s)` or relative URL.                                   |
| `TypeError` from the runtime's `Headers` (Node.js: `Headers.append: "<value>" is an invalid header value.` or `Cannot convert argument to a ByteString ...`) | `createMarkdownRoute` got a `cacheControl` with a line break, NUL or a character above U+00FF. It is thrown when the route is created, not per request.                                            | Pass a plain ASCII header value.                                    |
| `400` `Bad Request` (`text/plain`)                                                                                                                           | A decoded segment is empty, `.`, `..`, or contains `/`, `\` or NUL (for example `/docs/..%2Fsecret.md`), or, outside Next.js, the path has malformed percent-encoding. The resolver is not called. | Request a path whose segments are plain names.                      |
| `404` `Not Found` (`text/plain`)                                                                                                                             | The resolver returned `null` or any non-string (such as `undefined`).                                                                                                                              | Return the Markdown `string`; return `null` only for missing pages. |
| Rejected promise (Next.js answers `500`)                                                                                                                     | The resolver threw or rejected; the handler does not catch it.                                                                                                                                     | Catch errors in the resolver and return `null` or a string.         |
| `500` `Internal Server Error` from Next.js                                                                                                                   | In Next.js, a path with malformed percent-encoding (such as `/docs/%E0.md`) fails inside Next.js before the route runs.                                                                            | Nothing to fix in the route; request a correctly encoded path.      |
| Other `TypeError`s, such as `Cannot read properties of undefined (reading 'map')`                                                                            | Input that does not match the types, for example from plain JavaScript: a section without `links`, or no config at all.                                                                            | Pass values that match `LlmsConfig`.                                |

## Limits and gotchas

- The slug comes from the full request path, not from Next.js route params: a
  route under `app/md/` gets `"md"` as its first segment.
- Only a lowercase trailing `.md` on the last segment is removed. `/docs/intro`
  and `/docs/intro.md` give the same slug; `/docs/INTRO.MD` gives `"INTRO.MD"`.
- `app/[...slug]` does not match `/`. Use `app/[[...slug]]` to also serve `/`
  (slug `[]`).
- A dynamic page route wins over a root catch-all: with
  `app/blog/[slug]/page.tsx`, `/blog/post.md` renders that page, not your
  Markdown.
- A root catch-all answers every unmatched URL with a `text/plain` 404, not your
  site's HTML not-found page. Mount it under a prefix to avoid that.
- Default `Cache-Control` is public:
  `public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`.
- An empty string from the resolver is content: `200` with an empty body.
- `generateLlmsText` output has no trailing newline. A `summary`, `details` or
  `notes` that is `""`, and an empty `optional` array, are left out without a
  warning. Whitespace-only `notes` are also left out, but a whitespace-only
  `summary` renders an empty `> ` line. A section with no links renders only its
  heading.
- `details` is inserted as-is, even when it is only whitespace; it is not
  escaped.
- In Next.js, a path with malformed percent-encoding gets Next's own `500`
  before the route runs, so the handler's `400` for it is only seen outside
  Next.js.
- Only `GET` is created. In Next.js, `HEAD` is answered from `GET`, `OPTIONS`
  gets `204` with `Allow: GET, HEAD, OPTIONS`, and other methods get `405`.
- ESM only; there is no CommonJS build.

## Compatibility

- Peer dependencies: none. Runtime dependencies: none.
- Node.js `>=18` (`engines`). Needs the global `Request`, `Response`, `URL` and
  `Headers`.
- Next.js is not imported. The package was checked by hand with Next.js 16.4.6
  App Router route handlers on the Node.js and Edge runtimes (Next.js marks the
  Edge Runtime deprecated); CI runs the unit tests on Node.js only.
- Other runtimes with the same Web APIs (Deno, Bun, Hono, Remix) are not tested.
- Release channels: stable on `latest`, prereleases on `canary`
  (`pnpm add @vllnt/next-llms@canary`). `generateLlmsFullText` from early canary
  builds is not part of the stable API.

## Testing

```bash
pnpm test           # single run
pnpm test:coverage  # enforced 100% on covered files
```

## Security

- No secrets touched — the package generates text and serves whatever your
  resolver returns.
- Your resolver is the boundary — decide which slugs it may return. It receives
  only the slug, so check the request yourself for per-user access (see
  [Common tasks](#common-tasks)).
- `generateLlmsText` escapes link titles and URLs and collapses line breaks, and
  rejects blank titles/URLs and `javascript:`, `data:` or `vbscript:` URLs with
  a `TypeError`.
- Successful responses default to **public caching**. For private or
  personalized content, pass `{ cacheControl: "private, no-store" }`;
  authorization alone does not disable caching.

See [docs/API.md](docs/API.md) and the
[security reporting policy](https://github.com/vllnt/next-llms/blob/main/SECURITY.md).

## Related packages

No other `@vllnt` package covers `llms.txt` manifests or markdown routes. See
every package at [oss.vllnt.com/packages](https://oss.vllnt.com/packages).

## Contributing

See
[CONTRIBUTING.md](https://github.com/vllnt/next-llms/blob/main/CONTRIBUTING.md).

## Author

Built by [bntvllnt](https://github.com/bntvllnt) ·
[bntvllnt.com](https://bntvllnt.com) · [X @bntvllnt](https://x.com/bntvllnt)

If this is useful, [sponsor the work](https://github.com/sponsors/bntvllnt).

## License

MIT — see [LICENSE](LICENSE).

---

Part of [vllnt open source](https://oss.vllnt.com) · [Package page](https://oss.vllnt.com/packages/next-llms) · [vllnt.com](https://vllnt.com) · Built by [bntvllnt](https://bntvllnt.com)
