/// <reference types="node" />
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as api from "./index.js";

/** Files every published tarball must contain (`dist/` is checked at publish). */
const REQUIRED = [
  "package.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "llms.txt",
  "docs/API.md",
  "src/index.ts",
];

const REPO_BLOB = "https://github.com/vllnt/next-llms/blob/main/";

function packedFiles(): string[] {
  const output = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  const parsed: unknown = JSON.parse(output);
  const files: unknown =
    Array.isArray(parsed) && typeof parsed[0] === "object" && parsed[0]
      ? Reflect.get(parsed[0], "files")
      : undefined;
  if (!Array.isArray(files)) throw new TypeError("unexpected npm pack output");
  return files.map((file: unknown) => {
    const path: unknown =
      typeof file === "object" && file ? Reflect.get(file, "path") : undefined;
    if (typeof path !== "string") throw new TypeError("unexpected file entry");
    return path;
  });
}

describe("published tarball", () => {
  const files = packedFiles();
  const llmsText = readFileSync("llms.txt", "utf8");

  it("contains every required file", () => {
    expect(REQUIRED.filter((path) => !files.includes(path))).toEqual([]);
  });

  it("contains nothing besides the required files, dist and source", () => {
    const extra = files.filter(
      (path) => !REQUIRED.includes(path) && !/^(?:dist|src)\//.test(path),
    );
    const tests = files.filter((path) => /\.(?:test|spec)\./.test(path));
    expect([...extra, ...tests]).toEqual([]);
  });

  it("resolves every relative llms.txt link inside the tarball", () => {
    const links = [...llmsText.matchAll(/\]\(\.\/([^)#]+)/g)].flatMap(
      (match) => match[1] ?? [],
    );
    expect(links.length).toBeGreaterThan(0);
    expect(links.filter((path) => !files.includes(path))).toEqual([]);
  });

  it("links shipped files relatively, not to the main branch", () => {
    const pinnedToMain = [
      ...llmsText.matchAll(new RegExp(`${REPO_BLOB}([^)#]+)`, "g")),
    ]
      .flatMap((match) => match[1] ?? [])
      .filter((path) => files.includes(path));
    expect(pinnedToMain).toEqual([]);
  });

  it("documents every public export in docs/API.md", () => {
    const apiDocument = readFileSync("docs/API.md", "utf8");
    const typeNames = [
      ...readFileSync("src/index.ts", "utf8").matchAll(/^ {2}(\w+),$/gm),
    ].flatMap((match) => match[1] ?? []);
    const missing = [...Object.keys(api), ...typeNames].filter(
      (name) => !apiDocument.includes(name),
    );
    expect(missing).toEqual([]);
  });
});
