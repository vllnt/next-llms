import type { MarkdownResolver, MarkdownRouteOptions } from "./types.js";

const DEFAULT_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/**
 * Decode a URL pathname into slug segments, stripping a trailing `.md` from the
 * last segment. `/docs/intro.md` → `["docs", "intro"]`; `/` → `[]`.
 */
function pathnameToSlug(pathname: string): string[] {
  const segments = pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => decodeURIComponent(segment));
  const last = segments.at(-1);
  if (last?.endsWith(".md")) {
    segments[segments.length - 1] = last.slice(0, -3);
  }
  return segments;
}

/**
 * Create a Next.js App Router route handler that serves a slug's markdown
 * content. Mount it at a catch-all route (`app/[...slug]/route.ts`). The handler
 * is a pure Web-standard `(request) => Promise<Response>` — it imports nothing
 * from `next` and runs in any Web runtime.
 *
 * - Strips a trailing `.md` from the path (`/docs/intro.md` resolves the slug
 *   `["docs", "intro"]`).
 * - Returns `200` with `Content-Type: text/markdown; charset=utf-8` and a
 *   `Cache-Control` header when the resolver returns a string.
 * - Returns `404` (plain text) when the resolver returns `null`.
 *
 * @param resolver - Maps a slug to its markdown, or `null` when not found.
 * @param options - Optional cache-control override.
 * @returns A route handler suitable for `export const GET = ...`.
 *
 * @example
 * ```ts
 * // app/[...slug]/route.ts
 * import { createMarkdownRoute } from "@vllnt/next-llms";
 *
 * export const GET = createMarkdownRoute(async (slug) =>
 *   getDoc(slug.join("/")),
 * );
 * ```
 */
export function createMarkdownRoute(
  resolver: MarkdownResolver,
  options: MarkdownRouteOptions = {},
): (request: Request) => Promise<Response> {
  const cacheControl = options.cacheControl ?? DEFAULT_CACHE_CONTROL;

  return async (request: Request): Promise<Response> => {
    const slug = pathnameToSlug(new URL(request.url).pathname);
    const content = await resolver(slug);

    return content === null
      ? new Response("Not Found", {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          status: 404,
        })
      : new Response(content, {
          headers: {
            "Cache-Control": cacheControl,
            "Content-Type": "text/markdown; charset=utf-8",
          },
          status: 200,
        });
  };
}
