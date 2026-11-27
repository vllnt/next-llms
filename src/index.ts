/**
 * Generate an `llms.txt` file and serve pages as Markdown from Next.js App
 * Router route handlers.
 *
 * @packageDocumentation
 * @see https://oss.vllnt.com/packages/next-llms
 */
export { generateLlmsText } from "./llms-text.js";
export { createMarkdownRoute } from "./markdown-route.js";
export type {
  LlmsConfig,
  LlmsLink,
  LlmsSection,
  MarkdownResolver,
  MarkdownRouteOptions,
} from "./types.js";
