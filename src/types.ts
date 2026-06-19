/**
 * A single link entry in an `llms.txt` section — rendered as
 * `- [title](url): notes`.
 */
export type LlmsLink = {
  /** Human-readable link text. */
  title: string;
  /** Absolute or root-relative URL. */
  url: string;
  /** Optional one-line description shown after the link. */
  notes?: string;
};

/**
 * A named H2 section of an `llms.txt` manifest (e.g. `## Docs`) and its links.
 */
export type LlmsSection = {
  /** Section heading, rendered as `## {title}`. */
  title: string;
  /** Links listed under the section. */
  links: LlmsLink[];
};

/**
 * Input for {@link generateLlmsText} — the `llms.txt` index manifest.
 *
 * @see https://llmstxt.org
 */
export type LlmsConfig = {
  /** Site/project name, rendered as the `# {title}` H1. */
  title: string;
  /** One-line summary, rendered as a `> {summary}` blockquote. */
  summary?: string;
  /** Free-form markdown shown after the blockquote, before the sections. */
  details?: string;
  /** Named link-list sections (`## Docs`, `## Examples`, …). */
  sections?: LlmsSection[];
  /**
   * Links placed under the special `## Optional` section. Agents may skip this
   * section when a shorter context helps, per the llms.txt spec.
   */
  optional?: LlmsLink[];
};

/**
 * Maps a route slug to its markdown content, or `null` if there is no page for
 * the slug. The slug is the path segments with any trailing `.md` stripped.
 */
export type MarkdownResolver = (
  slug: string[],
) => string | null | Promise<string | null>;

/**
 * Options for {@link createMarkdownRoute}.
 */
export type MarkdownRouteOptions = {
  /**
   * `Cache-Control` header value for resolved (200) responses.
   *
   * @defaultValue `"public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"`
   */
  cacheControl?: string;
};
