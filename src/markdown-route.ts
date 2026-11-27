import type { MarkdownResolver, MarkdownRouteOptions } from "./types.js";

const DEFAULT_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

const PLAIN_TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Split a URL pathname into slug segments, dropping empty segments (from `//`),
 * then strip a trailing lowercase `.md` from the last raw segment, then
 * URL-decode each segment. `/docs/intro.md` → `["docs", "intro"]`; `/` → `[]`.
 *
 * Returns `null` when the path cannot name a page safely: malformed
 * percent-encoding, a segment left empty by stripping `.md` (`/docs/.md`), or a
 * decoded segment that is `.`, `..`, or contains `/`, `\` or a NUL byte (so a
 * resolver that maps slugs to files is never handed a traversal sequence such
 * as `..%2F..%2Fsecret`).
 */
function pathnameToSlug(pathname: string): string[] | null {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  const last = segments.at(-1);
  if (last?.endsWith(".md")) {
    segments[segments.length - 1] = last.slice(0, -3);
  }
  try {
    const slug = segments.map((segment) => decodeURIComponent(segment));
    return slug.some((segment) => /^\.{0,2}$|[\0/\\]/.test(segment))
      ? null
      : slug;
  } catch {
    return null;
  }
}

/**
 * Create a Next.js App Router route handler that serves a slug's markdown
 * content. Mount it at a catch-all route (`app/[...slug]/route.ts`). The handler
 * is a pure Web-standard `(request) => Promise<Response>` — it imports nothing
 * from `next` and uses only Web-standard APIs.
 *
 * - Strips a trailing `.md` from the path (`/docs/intro.md` resolves the slug
 *   `["docs", "intro"]`).
 * - Returns `200` with `Content-Type: text/markdown; charset=utf-8` and a
 *   `Cache-Control` header when the resolver returns a string.
 * - Returns `404` (plain text) when the resolver returns `null` (or any
 *   non-string value, such as `undefined` from a missing map entry).
 * - Returns `400` (plain text) without calling the resolver when the path has
 *   malformed percent-encoding, a segment left empty by stripping `.md`
 *   (`/docs/.md`), or a decoded segment that is `.`, `..`, or contains `/`, `\`
 *   or a NUL byte. Empty segments from `//` are dropped, not rejected.
 * - Sets `X-Content-Type-Options: nosniff` on every response.
 *
 * @param resolver - Maps a slug to its markdown, or `null` when not found.
 * @param options - Optional cache-control override.
 * @returns A route handler suitable for `export const GET = ...`.
 * @throws {TypeError} When `options.cacheControl` is not a valid header value.
 *
 * @example
 * ```ts
 * // app/[...slug]/route.ts
 * import { createMarkdownRoute } from "@vllnt/next-llms";
 *
 * const pages: Record<string, string> = { "docs/intro": "# Intro\n\nHello." };
 *
 * export const GET = createMarkdownRoute(
 *   (slug) => pages[slug.join("/")] ?? null,
 * );
 * ```
 */
export function createMarkdownRoute(
  resolver: MarkdownResolver,
  options: MarkdownRouteOptions = {},
): (request: Request) => Promise<Response> {
  const cacheControl = options.cacheControl ?? DEFAULT_CACHE_CONTROL;
  // Fail at setup, not on the first request, if the header value is invalid.
  new Headers({ "Cache-Control": cacheControl });

  return async (request: Request): Promise<Response> => {
    const slug = pathnameToSlug(new URL(request.url).pathname);
    if (slug === null) {
      return new Response("Bad Request", {
        headers: PLAIN_TEXT_HEADERS,
        status: 400,
      });
    }
    const content = await resolver(slug);

    return typeof content === "string"
      ? new Response(content, {
          headers: {
            "Cache-Control": cacheControl,
            "Content-Type": "text/markdown; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
          status: 200,
        })
      : new Response("Not Found", {
          headers: PLAIN_TEXT_HEADERS,
          status: 404,
        });
  };
}
