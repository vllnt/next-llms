import type { LlmsConfig, LlmsLink, LlmsSection } from "./types.js";

function renderLink(link: LlmsLink): string {
  return link.notes
    ? `- [${link.title}](${link.url}): ${link.notes}`
    : `- [${link.title}](${link.url})`;
}

function renderSection(section: LlmsSection): string {
  const heading = `## ${section.title}`;
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
    `# ${config.title}`,
    ...(config.summary ? [`> ${config.summary}`] : []),
    ...(config.details ? [config.details] : []),
    ...(config.sections ?? []).map(renderSection),
    ...(config.optional && config.optional.length > 0
      ? [renderSection({ links: config.optional, title: "Optional" })]
      : []),
  ].join("\n\n");
}
