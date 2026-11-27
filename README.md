<!-- Badges -->

[![npm](https://img.shields.io/npm/v/@vllnt/next-llms.svg)](https://www.npmjs.com/package/@vllnt/next-llms)
[![CI](https://github.com/vllnt/next-llms/actions/workflows/ci.yml/badge.svg)](https://github.com/vllnt/next-llms/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@vllnt/next-llms.svg)](./LICENSE)

# @vllnt/next-llms

Make your Next.js site legible to AI agents — generate a spec-compliant
`llms.txt` manifest and serve any page as raw markdown.

```ts
// app/llms.txt/route.ts
import { generateLlmsText } from "@vllnt/next-llms";

export function GET() {
  return new Response(
    generateLlmsText({
      title: "Acme",
      summary: "Acme is a widget API.",
      sections: [
        {
          title: "Docs",
          links: [{ title: "Quickstart", url: "/docs/quickstart.md" }],
        },
      ],
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
```

Emit the `llms.txt` index and expose any page's markdown at `/path.md` so agents
skip HTML parsing. Zero runtime dependencies — pure Web-standard APIs that run
in any Next.js runtime (and Remix, Hono, Deno, …).

## Features

- **Spec-compliant `llms.txt`** — `generateLlmsText` emits the llmstxt.org
  shape: an `#` title, a `>` blockquote, `## Section` link lists, and a
  droppable `## Optional` section.
- **Raw-markdown routes** — `createMarkdownRoute` serves any page as
  `text/markdown`, stripping a trailing `.md` and resolving the slug through
  your own content source.
- **Zero dependencies** — pure TypeScript over Web `Request` / `Response`;
  nothing added to your bundle.
- **Runtime-agnostic** — the route handler imports nothing from `next`; it runs
  on the Edge, Node, or any Web-standard runtime.
- **Typed end to end** — concrete config types guide correct usage; no `any`.
- **Cache-friendly** — sensible `Cache-Control` defaults, overridable per route.

## Installation

```bash
pnpm add @vllnt/next-llms
```

Node.js `>=18`; no peer dependencies (the package imports nothing from `next` or
`react`). Every push to `main` that changes the package publishes a prerelease
to the `canary` channel (`pnpm add @vllnt/next-llms@canary`); stable releases
are published from a `vX.Y.Z` tag. The older `generateLlmsFullText` API from
early canary builds is not part of the stable API; use the two exports below.

## Usage

```ts
// app/[...slug]/route.ts — serve any page as raw markdown
import { createMarkdownRoute } from "@vllnt/next-llms";

export const GET = createMarkdownRoute(async (slug) => {
  const doc = await getDoc(slug.join("/")); // your content source
  return doc?.markdown ?? null; // null → 404
});
```

`/docs/intro.md` resolves the slug `["docs", "intro"]` and returns the markdown
with `Content-Type: text/markdown`, or `404` when the resolver returns `null`.

## API Reference

| Export                                    | Kind     | Result                                    |
| ----------------------------------------- | -------- | ----------------------------------------- |
| `generateLlmsText(config)`                | function | `string` — the `llms.txt` index           |
| `createMarkdownRoute(resolver, options?)` | factory  | `(request: Request) => Promise<Response>` |

Full reference: [docs/API.md](docs/API.md). Also see the [LLM index](llms.txt),
[changelog](CHANGELOG.md), and
[issue tracker](https://github.com/vllnt/next-llms/issues).

## For coding agents

The docs ship inside the package at `node_modules/@vllnt/next-llms/docs/`, next
to `README.md`, `CHANGELOG.md`, `llms.txt` and the TypeScript source in `src/`.
They match the installed version. Read them before writing code that uses this
package.

The bundled `llms.txt` describes this package. It is not output of
`generateLlmsText`; the `llms.txt` your site serves is the one you build with
`generateLlmsText`.

## Related packages

No other `@vllnt` package covers `llms.txt` manifests or markdown routes. See
every package at [oss.vllnt.com/packages](https://oss.vllnt.com/packages).

## Security

- No secrets touched — the package generates text and serves whatever your
  resolver returns.
- Your resolver is the boundary — authorize the slug before returning content.
  The route rejects malformed percent-encoding and slug segments that are empty,
  `.`, `..`, or contain `/`, `\` or NUL (`400`), but you still own how a slug
  maps to a file or record.
- `generateLlmsText` escapes link titles and URLs and collapses line breaks, and
  rejects blank titles/URLs and `javascript:`, `data:` or `vbscript:` URLs with
  a `TypeError`.
- Successful responses default to **public caching** (one hour in browsers, one
  day in shared caches). For private or personalized content, explicitly pass
  `{ cacheControl: "private, no-store" }`; authorization alone does not disable
  caching.

See [docs/API.md](docs/API.md) and the [security reporting policy](SECURITY.md).

## Testing

```bash
pnpm test           # single run
pnpm test:coverage  # enforced 100% on covered files
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Author

Built by [bntvllnt](https://github.com/bntvllnt) ·
[bntvllnt.com](https://bntvllnt.com) · [X @bntvllnt](https://x.com/bntvllnt)

If this is useful, [sponsor the work](https://github.com/sponsors/bntvllnt).

## License

MIT — see [LICENSE](LICENSE).

---

Part of vllnt oss: <https://oss.vllnt.com>
