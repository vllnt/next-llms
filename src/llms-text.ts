import type { LlmsConfig, LlmsLink, LlmsSection } from "./types.js";

const UNSAFE_URL_SCHEME = /^(?:javascript|data|vbscript):/i;
// eslint-disable-next-line no-control-regex -- strips control characters browsers ignore inside a scheme
const SCHEME_NOISE = /[\u0000-\u0020]/g;
const LINE_BREAKS = /\s*[\n\r\u2028\u2029]+\s*/g;

/** Percent-encode one character that would end a Markdown link destination. */
function encodeUrlCharacter(character: string): string {
  if (character === "(") return "%28";
  if (character === ")") return "%29";
  return encodeURIComponent(character);
}

/** Collapse line breaks so a value cannot start a new Markdown block. */
function singleLine(value: string): string {
  return value.replaceAll(LINE_BREAKS, " ").trim();
}

/** Single-line value that must be a non-blank string. */
function requiredLine(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return singleLine(value);
}

function renderUrl(url: unknown): string {
  const text = requiredLine(url, "link url");
  if (UNSAFE_URL_SCHEME.test(text.replaceAll(SCHEME_NOISE, ""))) {
    throw new TypeError(
      "link url must not use a javascript:, data: or vbscript: scheme",
    );
  }
  return text.replaceAll(/[\s()<>\\]/g, encodeUrlCharacter);
}

function renderLink(link: LlmsLink): string {
  const title = requiredLine(link.title, "link title").replaceAll(
    /[[\\\]]/g,
    String.raw`\$&`,
  );
  const base = `- [${title}](${renderUrl(link.url)})`;
  const notes = link.notes ? singleLine(link.notes) : "";
  return notes ? `${base}: ${notes}` : base;
}

function renderSection(section: LlmsSection): string {
  const heading = `## ${requiredLine(section.title, "section title")}`;
  const links = section.links.map(renderLink).join("\n");
  return links ? `${heading}\n\n${links}` : heading;
}

/**
 * Generate an `llms.txt` index manifest from a config, following the llms.txt
 * specification: an `# {title}` H1, a `> {summary}` blockquote, optional free
 * prose, `## {section}` link lists, and a droppable `## Optional` section.
 *
 * @param config - The manifest content.
 * @returns The `llms.txt` file contents (no trailing newline).
 * @throws {TypeError} When a title or link URL is blank, or a URL uses a
 * `javascript:`, `data:` or `vbscript:` scheme. Line breaks inside titles,
 * summaries and notes are collapsed to spaces, `[`, `]` and `\` in link titles
 * are backslash-escaped, and whitespace, `(`, `)`, `<`, `>` and `\` in URLs
 * are percent-encoded, so values cannot inject Markdown structure.
 * @see https://llmstxt.org
 *
 * @example
 * ```ts
 * generateLlmsText({
 *   title: "Acme Docs",
 *   summary: "Everything an agent needs to use Acme.",
 *   sections: [
 *     { title: "Docs", links: [{ title: "Quickstart", url: "/docs/quickstart.md" }] },
 *   ],
 * });
 * ```
 */
export function generateLlmsText(config: LlmsConfig): string {
  return [
    `# ${requiredLine(config.title, "title")}`,
    ...(config.summary ? [`> ${singleLine(config.summary)}`] : []),
    ...(config.details ? [config.details] : []),
    ...(config.sections ?? []).map(renderSection),
    ...(config.optional && config.optional.length > 0
      ? [renderSection({ links: config.optional, title: "Optional" })]
      : []),
  ].join("\n\n");
}
