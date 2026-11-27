/// <reference types="node" />
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Agent-first documentation contract: README section order, install and
 * example placement, tagged and runnable code blocks, resolving links, every
 * export and error documented, and the vllnt backlinks. README examples are
 * type-checked and run against a fresh build of the package.
 */

const ROOT = resolve(import.meta.dirname, "..");
const README = "README.md";
const SHIPPED_DOCUMENTS = [README, "docs/API.md", "llms.txt"];
const PACKAGE_NAME = "@vllnt/next-llms";
/**
 * The TypeScript 6 compiler CLI, from the `typescript` package's own `bin`
 * field. The README type-check runs in a child process because V8 coverage
 * slows the in-process compiler too much.
 */
function compilerCli(): string {
  const manifest = createRequire(import.meta.url).resolve(
    "typescript/package.json",
  );
  const parsed: unknown = JSON.parse(readFileSync(manifest, "utf8"));
  const bin: unknown =
    typeof parsed === "object" && parsed !== null
      ? Reflect.get(parsed, "bin")
      : undefined;
  const entry: unknown =
    typeof bin === "object" && bin !== null ? Object.values(bin)[0] : undefined;
  if (typeof entry !== "string") throw new TypeError("typescript has no bin");
  return join(dirname(manifest), entry);
}
const PACKAGE_PAGE = "https://oss.vllnt.com/packages/next-llms";

/** Sections every `@vllnt` README carries, in this order. */
const AGENT_SECTIONS = [
  "For coding agents",
  "When to use",
  "Install",
  "Quick start",
  "API",
  "Common tasks",
  "Errors and fixes",
  "Limits and gotchas",
  "Compatibility",
];

/** This repository's own sections, kept after the agent sections. */
const REPO_SECTIONS = [
  "Testing",
  "Security",
  "Related packages",
  "Contributing",
  "Author",
  "License",
];

/** The exact last lines of every `@vllnt` README. */
const FOOTER = `---

Part of [vllnt open source](https://oss.vllnt.com) · [Package page](${PACKAGE_PAGE}) · [vllnt.com](https://vllnt.com) · Built by [bntvllnt](https://bntvllnt.com)
`;

/** The exact last block of `llms.txt`. */
const LLMS_ECOSYSTEM = `## Ecosystem

- [Package page](${PACKAGE_PAGE})
- [All @vllnt packages](https://oss.vllnt.com/llms.txt)
- [vllnt](https://vllnt.com/llms.txt)
- [Author](https://bntvllnt.com)
`;

/** Building and type-checking with the TypeScript API is slow on shared hosts. */
const COMPILE_TIMEOUT = 60_000;
const FIRST_LINES = 40;
const FENCE = /^```(\S*)/;
const FENCED_BLOCK = /^```[\s\S]*?^```/gm;
const GAP = /^\s*(?:\/\/\s*)?(?:\.\.\.|…)\s*$|…|\/\*\s*\.\.\.\s*\*\//;
const LINK = /\]\(([^\s)]+)\)/g;
const SCHEME = /^[a-z][\d+.a-z-]*:/i;
const EXAMPLE_PATHS = ["/docs/intro.md", "/md/docs/intro.md"];
const SOURCE_FILES = [
  "src/index.ts",
  "src/llms-text.ts",
  "src/markdown-route.ts",
  "src/types.ts",
];

type CodeBlock = {
  language: string;
  code: string;
  start: number;
  end: number;
};

type PackageJson = {
  description: string;
  keywords: string[];
  files: string[];
  exports: unknown;
  type: string;
};

type RouteHandler = (request: Request) => unknown;

type FenceScan = {
  blocks: CodeBlock[];
  open?: { language: string; start: number };
};

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function isPackageJson(value: unknown): value is PackageJson {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "description") === "string" &&
    Array.isArray(Reflect.get(value, "keywords")) &&
    Array.isArray(Reflect.get(value, "files"))
  );
}

function isRouteHandler(value: unknown): value is RouteHandler {
  return typeof value === "function";
}

function loadPackageJson(): PackageJson {
  const parsed: unknown = JSON.parse(read("package.json"));
  if (!isPackageJson(parsed)) throw new TypeError("unexpected package.json");
  return parsed;
}

const packageJson = loadPackageJson();

/** Fenced code blocks with their language tag and 1-based fence line numbers. */
function codeBlocks(markdown: string): CodeBlock[] {
  const lines = markdown.split("\n");
  return lines.reduce<FenceScan>(
    (scan, line, index) => {
      const fence = FENCE.exec(line);
      if (!fence) return scan;
      if (!scan.open) {
        return {
          ...scan,
          open: { language: fence[1] ?? "", start: index + 1 },
        };
      }
      const block = {
        ...scan.open,
        code: lines.slice(scan.open.start, index).join("\n"),
        end: index + 1,
      };
      return { blocks: [...scan.blocks, block] };
    },
    { blocks: [] },
  ).blocks;
}

/** Markdown without fenced blocks or inline code, for link scans. */
function prose(markdown: string): string {
  return markdown.replaceAll(FENCED_BLOCK, "").replaceAll(/`[^\n`]*`/g, "");
}

/** `## ` headings outside code blocks. */
function h2Headings(markdown: string): string[] {
  return [...markdown.replaceAll(FENCED_BLOCK, "").matchAll(/^## (.+)$/gm)].map(
    (match) => (match[1] ?? "").trim(),
  );
}

/** Text of one `## ` section, without its heading. */
function section(markdown: string, name: string): string {
  const heading = `\n## ${name}\n`;
  const start = markdown.indexOf(heading);
  if (start === -1) return "";
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

function bullets(text: string): string[] {
  return text.split("\n").filter((line) => line.startsWith("- "));
}

/** GitHub heading anchors of a Markdown file. */
function anchors(markdown: string): Set<string> {
  const bases = [
    ...markdown.replaceAll(FENCED_BLOCK, "").matchAll(/^#{1,6} (.+)$/gm),
  ].map((match) =>
    (match[1] ?? "")
      .trim()
      .toLowerCase()
      .replaceAll(/[^\p{L}\p{N} _-]/gu, "")
      .replaceAll(" ", "-"),
  );
  return new Set(
    bases.map((base, index) => {
      const earlier = bases.slice(0, index).filter((other) => other === base);
      return earlier.length === 0 ? base : `${base}-${String(earlier.length)}`;
    }),
  );
}

/** Whether a repository path ships in the npm tarball. */
function isShipped(path: string): boolean {
  if (/^(?:package\.json|README\.md|LICENSE|CHANGELOG\.md)$/.test(path)) {
    return true;
  }
  return packageJson.files.some(
    (entry) =>
      !entry.startsWith("!") &&
      (path === entry || path.startsWith(`${entry.replace(/\/$/, "")}/`)),
  );
}

/** Relative links in one document that do not resolve inside the package. */
function brokenLinks(path: string): string[] {
  return [...prose(read(path)).matchAll(LINK)].flatMap((match) => {
    const target = match[1] ?? "";
    if (SCHEME.test(target) || target.startsWith("/")) return [];
    const [file = "", hash] = target.split("#");
    const resolved = file
      ? normalize(join(dirname(path), file)).replaceAll("\\", "/")
      : path;
    if (!existsSync(join(ROOT, resolved)) || !isShipped(resolved)) {
      return [`${path} -> ${target}`];
    }
    return hash && !anchors(read(resolved)).has(hash)
      ? [`${path} -> ${target} (no such heading)`]
      : [];
  });
}

function sourceFile(path: string): ts.SourceFile {
  return ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true);
}

/** Every node of a source file, depth first. */
function nodes(root: ts.Node): ts.Node[] {
  return [root, ...root.getChildren().flatMap((child) => nodes(child))];
}

/** Names re-exported from `src/index.ts`. */
function exportedNames(): string[] {
  return sourceFile("src/index.ts")
    .statements.filter((statement) => ts.isExportDeclaration(statement))
    .flatMap((statement) =>
      statement.exportClause && ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements.map((element) => element.name.text)
        : [],
    );
}

function isExported(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

/** TSDoc summary of each exported function or type in a source file. */
function exportedSummaries(path: string): [string, string][] {
  return sourceFile(path).statements.flatMap(
    (statement): [string, string][] => {
      if (
        !isExported(statement) ||
        !(
          ts.isFunctionDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement)
        ) ||
        !statement.name
      ) {
        return [];
      }
      const summary = ts
        .getJSDocCommentsAndTags(statement)
        .filter((comment) => ts.isJSDoc(comment))
        .map((comment) => ts.getTextOfJSDocComment(comment.comment) ?? "")
        .join(" ")
        .trim();
      return [[statement.name.text, summary]];
    },
  );
}

/** Name of the function declaration that encloses a node. */
function enclosingFunction(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node)) return node.name?.text ?? "";
  return node.parent ? enclosingFunction(node.parent) : "";
}

/** Second-argument string literals of every call to `name`. */
function callLabels(all: ts.Node[], name: string): string[] {
  return all.flatMap((node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isIdentifier(node.expression) ||
      node.expression.text !== name
    ) {
      return [];
    }
    const label = node.arguments[1];
    return label && ts.isStringLiteral(label) ? [label.text] : [];
  });
}

/** Every `TypeError` message `generateLlmsText` and its helpers can throw. */
function thrownMessages(): string[] {
  const all = nodes(sourceFile("src/llms-text.ts"));
  return all.flatMap((node) => {
    if (
      !ts.isNewExpression(node) ||
      !ts.isIdentifier(node.expression) ||
      node.expression.text !== "TypeError"
    ) {
      return [];
    }
    const argument = node.arguments?.[0];
    if (argument && ts.isStringLiteral(argument)) return [argument.text];
    if (!argument || !ts.isTemplateExpression(argument)) return [];
    const tail = argument.templateSpans
      .map((span) => span.literal.text)
      .join("");
    return callLabels(all, enclosingFunction(node)).map(
      (label) => `${argument.head.text}${label}${tail}`,
    );
  });
}

/** `[status, body]` of every error `Response` the route builds. */
function errorResponses(): [number, string][] {
  return nodes(sourceFile("src/markdown-route.ts")).flatMap(
    (node): [number, string][] => {
      if (
        !ts.isNewExpression(node) ||
        !ts.isIdentifier(node.expression) ||
        node.expression.text !== "Response"
      ) {
        return [];
      }
      const [body, init] = node.arguments ?? [];
      if (!body || !ts.isStringLiteral(body)) return [];
      if (!init || !ts.isObjectLiteralExpression(init)) return [];
      const status = init.properties.find(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === "status",
      );
      return status &&
        ts.isPropertyAssignment(status) &&
        ts.isNumericLiteral(status.initializer)
        ? [[Number(status.initializer.text), body.text]]
        : [];
    },
  );
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string[] {
  return diagnostics.map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n",
    );
    return diagnostic.file
      ? `${diagnostic.file.fileName}: ${message}`
      : message;
  });
}

function repoCompilerOptions(): ts.CompilerOptions {
  const { config } = ts.readConfigFile(
    join(ROOT, "tsconfig.build.json"),
    (path) => ts.sys.readFile(path),
  );
  return ts.parseJsonConfigFileContent(config, ts.sys, ROOT).options;
}

function label(index: number, path = ""): string {
  return `example ${String(index + 1)} ${path}`.trim();
}

describe("agent-first documentation", () => {
  const readme = read(README);
  const readmeLines = readme.split("\n");

  it("uses the shared section names in the shared order", () => {
    expect(readmeLines[0]).toBe(`# ${PACKAGE_NAME}`);
    expect(h2Headings(readme)).toEqual([...AGENT_SECTIONS, ...REPO_SECTIONS]);
  });

  it("opens with the package.json description as one sentence", () => {
    const intro = readme.split("\n\n")[1]?.replaceAll("\n", " ");
    expect(intro).toBe(packageJson.description);
    expect(packageJson.description.length).toBeLessThanOrEqual(160);
    expect(packageJson.description).not.toMatch(/\.\s/);
    expect(packageJson.description).toMatch(/Next\.js/);
  });

  it("has 8 to 12 distinct keywords", () => {
    const { keywords } = packageJson;
    expect(keywords.length).toBeGreaterThanOrEqual(8);
    expect(keywords.length).toBeLessThanOrEqual(12);
    expect(new Set(keywords).size).toBe(keywords.length);
  });

  it("keeps the agent note to 3 lines and the use cases to 2-4 and 1-3 bullets", () => {
    const note = section(readme, "For coding agents").trim().split("\n");
    const list = bullets(section(readme, "When to use"));
    const use = list.filter((line) => line.startsWith("- Use it when"));
    const avoid = list.filter((line) => line.startsWith("- Do not use it"));
    expect(note).toHaveLength(3);
    expect(use.length).toBeGreaterThanOrEqual(2);
    expect(use.length).toBeLessThanOrEqual(4);
    expect(avoid.length).toBeGreaterThanOrEqual(1);
    expect(avoid.length).toBeLessThanOrEqual(3);
    expect(use.length + avoid.length).toBe(list.length);
  });

  it("puts the install command and the first example in the first 40 lines", () => {
    const install = readmeLines.indexOf(`pnpm add ${PACKAGE_NAME}`);
    const quickStart = readmeLines.indexOf("## Quick start") + 1;
    const first = codeBlocks(readme).find((block) => block.start > quickStart);
    expect(install).toBeGreaterThanOrEqual(0);
    expect(install + 1).toBeLessThanOrEqual(FIRST_LINES);
    expect(first?.language).toBe("ts");
    expect(first?.end).toBeLessThanOrEqual(FIRST_LINES);
  });

  it("puts badges below the quick start examples", () => {
    const quickStart = readmeLines.indexOf("## Quick start") + 1;
    const api = readmeLines.indexOf("## API") + 1;
    const ends = codeBlocks(readme)
      .filter((block) => block.start > quickStart && block.end < api)
      .map((block) => block.end);
    const badges = readmeLines.flatMap((line, index) =>
      line.includes("[![") ? [index + 1] : [],
    );
    expect(ends.length).toBeGreaterThan(0);
    expect(badges.filter((line) => line <= Math.max(...ends))).toEqual([]);
  });

  it("tags every code block with a language and leaves no gaps", () => {
    const untagged = SHIPPED_DOCUMENTS.flatMap((path) =>
      codeBlocks(read(path))
        .filter((block) => block.language === "")
        .map((block) => `${path}:${String(block.start)}`),
    );
    const gaps = codeBlocks(readme).filter((block) =>
      block.code.split("\n").some((line) => GAP.test(line)),
    );
    expect(untagged).toEqual([]);
    expect(gaps).toEqual([]);
  });

  it("resolves every relative link and anchor inside the package", () => {
    expect(SHIPPED_DOCUMENTS.flatMap((path) => brokenLinks(path))).toEqual([]);
  });

  it("lists every public export in the README API table and docs/API.md", () => {
    const names = exportedNames();
    const rows = section(readme, "API")
      .split("\n")
      .filter((line) => line.startsWith("| [`"));
    const apiAnchors = anchors(read("docs/API.md"));
    const unlinked = names.filter((name) => {
      const row = rows.find((line) => line.startsWith(`| [\`${name}`));
      const anchor = /\(docs\/API\.md#([^)]+)\)/.exec(row ?? "")?.[1] ?? "";
      return !apiAnchors.has(anchor);
    });
    expect(names).toHaveLength(7);
    expect(rows).toHaveLength(names.length);
    expect(unlinked).toEqual([]);
  });

  it("gives every public export a TSDoc summary", () => {
    const summaries = new Map(
      SOURCE_FILES.flatMap((path) => exportedSummaries(path)),
    );
    const undocumented = exportedNames().filter(
      (name) => (summaries.get(name)?.length ?? 0) < 10,
    );
    expect(undocumented).toEqual([]);
  });

  it("links the package page from the entry point TSDoc", () => {
    expect(read("src/index.ts")).toMatch(
      new RegExp(String.raw`^/\*\*[\s\S]*@see ${PACKAGE_PAGE}\n[\s\S]*?\*/`),
    );
  });

  it("documents every thrown error and error response", () => {
    const table = section(readme, "Errors and fixes");
    const messages = thrownMessages();
    const responses = errorResponses();
    const missingMessages = messages.filter(
      (message) => !table.includes(`\`TypeError: ${message}\``),
    );
    const missingResponses = responses.filter(
      ([status, body]) =>
        !table
          .split("\n")
          .some(
            (line) =>
              line.includes(`\`${String(status)}\``) &&
              line.includes(`\`${body}\``),
          ),
    );
    expect(messages).toHaveLength(5);
    expect(responses.map(([status]) => status).toSorted()).toEqual([400, 404]);
    expect(missingMessages).toEqual([]);
    expect(missingResponses).toEqual([]);
    expect(table).toContain("cacheControl");
  });

  it("carries the summary, use cases and key links in llms.txt", () => {
    const llms = read("llms.txt");
    const quote = [...llms.matchAll(/^> (.*)$/gm)]
      .map((match) => match[1])
      .join(" ");
    const missing = bullets(section(readme, "When to use")).filter(
      (line) => !llms.includes(line),
    );
    expect(quote).toBe(packageJson.description);
    expect(llms).toContain("When to use:");
    expect(missing).toEqual([]);
    expect(llms).toContain("](./docs/API.md)");
    expect(llms).toContain("](./README.md#errors-and-fixes)");
  });

  it("ends the README with the vllnt footer", () => {
    expect(readme.endsWith(`\n\n${FOOTER}`)).toBe(true);
  });

  it("ends llms.txt with the ecosystem block and lists the index once", () => {
    const llms = read("llms.txt");
    expect(llms.endsWith(`\n\n${LLMS_ECOSYSTEM}`)).toBe(true);
    expect(llms.split("https://oss.vllnt.com/llms.txt")).toHaveLength(2);
  });

  it("never mentions vllnt.ai in a shipped file", () => {
    const shipped = [
      "package.json",
      "CHANGELOG.md",
      "LICENSE",
      ...SHIPPED_DOCUMENTS,
      ...SOURCE_FILES,
    ];
    expect(shipped.filter((path) => /vllnt\.ai/i.test(read(path)))).toEqual([]);
  });

  describe("README examples against the built package", () => {
    const work = join(ROOT, "node_modules/.cache/readme-examples");
    const packageDirectory = join(work, "node_modules", PACKAGE_NAME);
    const examples = codeBlocks(readme).filter(
      (block) => block.language === "ts",
    );
    const files = examples.map((_, index) =>
      join(work, `example-${String(index + 1)}.ts`),
    );

    beforeAll(() => {
      rmSync(work, { force: true, recursive: true });
      mkdirSync(packageDirectory, { recursive: true });
      const build = ts
        .createProgram(
          SOURCE_FILES.map((path) => join(ROOT, path)),
          {
            ...repoCompilerOptions(),
            declarationMap: false,
            incremental: false,
            outDir: join(packageDirectory, "dist"),
            sourceMap: false,
          },
        )
        .emit();
      expect(formatDiagnostics(build.diagnostics)).toEqual([]);
      writeFileSync(
        join(packageDirectory, "package.json"),
        JSON.stringify({
          exports: packageJson.exports,
          name: PACKAGE_NAME,
          type: packageJson.type,
        }),
      );
      examples.forEach((example, index) => {
        writeFileSync(files[index] ?? "", example.code);
      });
    }, COMPILE_TIMEOUT);

    it("has runnable TypeScript examples that import the package", () => {
      expect(examples.length).toBeGreaterThanOrEqual(4);
      expect(
        examples.filter(
          (example) => !example.code.includes(`from "${PACKAGE_NAME}"`),
        ),
      ).toEqual([]);
    });

    it(
      "type-checks every example against the built declarations",
      () => {
        const project = join(work, "tsconfig.json");
        writeFileSync(
          project,
          JSON.stringify({
            compilerOptions: {
              declaration: false,
              declarationMap: false,
              incremental: false,
              module: "ESNext",
              moduleResolution: "Bundler",
              noEmit: true,
              rootDir: ".",
              sourceMap: false,
              types: ["node"],
            },
            exclude: [],
            extends: join(ROOT, "tsconfig.build.json"),
            include: files.map((file) => basename(file)),
          }),
        );
        const result = spawnSync(
          process.execPath,
          [compilerCli(), "--project", project, "--pretty", "false"],
          { encoding: "utf8" },
        );
        expect({
          output: `${result.stdout}${result.stderr}`,
          status: result.status,
        }).toEqual({
          output: "",
          status: 0,
        });
      },
      COMPILE_TIMEOUT,
    );

    it(
      "runs every example route against the built package",
      async () => {
        const quickStart = new Set(
          codeBlocks(section(readme, "Quick start")).map((block) => block.code),
        );
        const results = await Promise.all(
          examples.map(async (example, index) => {
            const output = (files[index] ?? "").replace(/\.ts$/, ".mjs");
            writeFileSync(
              output,
              ts.transpileModule(example.code, {
                compilerOptions: {
                  module: ts.ModuleKind.ESNext,
                  target: ts.ScriptTarget.ES2022,
                },
              }).outputText,
            );
            const module: unknown = await import(pathToFileURL(output).href);
            const get: unknown =
              typeof module === "object" && module !== null
                ? Reflect.get(module, "GET")
                : undefined;
            if (!isRouteHandler(get)) return [`${label(index)}: no GET export`];
            const responses = await Promise.all(
              EXAMPLE_PATHS.map(async (path) => ({
                path,
                response: await get(new Request(`https://example.com${path}`)),
              })),
            );
            return responses.flatMap(({ path, response }) => {
              if (!(response instanceof Response)) {
                return [`${label(index, path)}: not a Response`];
              }
              if (response.status >= 500) {
                return [`${label(index, path)}: ${String(response.status)}`];
              }
              return quickStart.has(example.code) &&
                path === "/docs/intro.md" &&
                response.status !== 200
                ? [
                    `${label(index, path)}: quick start ${String(response.status)}`,
                  ]
                : [];
            });
          }),
        );
        expect(results.flat()).toEqual([]);
      },
      COMPILE_TIMEOUT,
    );
  });
});
