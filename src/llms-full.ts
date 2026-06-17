import type { LlmsFullConfig, LlmsFullPage, LlmsFullSection } from "./types.js";

function renderPage(page: LlmsFullPage): string {
  const head = page.url
    ? `### ${page.title}\n\nSource: ${page.url}`
    : `### ${page.title}`;
  return `${head}\n\n${page.content}`;
}

function renderFullSection(section: LlmsFullSection): string {
  const heading = `## ${section.title}`;
  const pages = section.pages.map(renderPage).join("\n\n");
  return pages ? `${heading}\n\n${pages}` : heading;
}

/**
 * Generate an `llms-full.txt` manifest — the same header as `llms.txt` followed
 * by every page's full markdown content inline, so an agent can read the whole
 * site in a single request.
 *
 * Hierarchy: `# {title}` (site) → `## {section}` → `### {page}` + the page body.
 *
 * @param config - The manifest content with full page bodies.
 * @returns The `llms-full.txt` file contents (no trailing newline).
 * @see https://llmstxt.org
 */
export function generateLlmsFullText(config: LlmsFullConfig): string {
  return [
    `# ${config.title}`,
    ...(config.summary ? [`> ${config.summary}`] : []),
    ...(config.details ? [config.details] : []),
    ...config.sections.map(renderFullSection),
  ].join("\n\n");
}
