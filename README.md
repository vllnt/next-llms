<!-- Badges -->

[![npm](https://img.shields.io/npm/v/@vllnt/next-llms.svg)](https://www.npmjs.com/package/@vllnt/next-llms)
[![CI](https://github.com/vllnt/next-llms/actions/workflows/ci.yml/badge.svg)](https://github.com/vllnt/next-llms/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@vllnt/next-llms.svg)](./LICENSE)

# @vllnt/next-llms

Make your Next.js site legible to AI agents — generate a spec-compliant
`llms.txt` / `llms-full.txt` manifest and serve any page as raw markdown.

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

Emit the `llms.txt` index and its `llms-full.txt` companion, and expose any
page's markdown at `/path.md` so agents skip HTML parsing. Zero runtime
dependencies — pure Web-standard APIs that run in any Next.js runtime (and
Remix, Hono, Deno, …).

## Features

- **Spec-compliant `llms.txt`** — `generateLlmsText` emits the llmstxt.org
  shape: an `#` title, a `>` blockquote, `## Section` link lists, and a
  droppable `## Optional` section.
- **`llms-full.txt` companion** — `generateLlmsFullText` inlines every page's
  full markdown so an agent reads the whole site in one request.
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

No peer dependencies.

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
| `generateLlmsFullText(config)`            | function | `string` — the `llms-full.txt` bundle     |
| `createMarkdownRoute(resolver, options?)` | factory  | `(request: Request) => Promise<Response>` |

Full reference: [docs/API.md](docs/API.md).

## Security

- No secrets touched — the package generates text and serves whatever your
  resolver returns.
- Your resolver is the boundary — validate and authorize the slug before
  returning content.
- Server-controlled cache headers — defaults are safe and overridable per route.

See [docs/API.md](docs/API.md).

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

Part of the [@vllnt](https://github.com/vllnt) open-source fleet —
[vllnt.com](https://vllnt.com)

If this is useful, [sponsor the work](https://github.com/sponsors/bntvllnt).

## License

MIT — see [LICENSE](LICENSE).
