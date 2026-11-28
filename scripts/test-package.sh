#!/usr/bin/env bash
#
# test-package.sh — install the packed tarball into a clean consumer project
# and prove it works the way a user gets it: every `exports` entry imports, the
# main entry exports exactly the public functions and they run, and a strict
# TypeScript consumer type-checks against the shipped declarations.
#
# Expects dist/ to be built already (run `pnpm build` first).
#
# Usage: test-package.sh
#
# Exit codes: 0 pass, 1 any failure.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TSC="$ROOT/node_modules/.bin/tsc"

if [[ ! -f "$ROOT/dist/index.js" ]]; then
  echo "error: dist/index.js is missing; run pnpm build first" >&2
  exit 1
fi
if [[ ! -x "$TSC" ]]; then
  echo "error: $TSC is missing; run pnpm install first" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 1. Pack the package exactly as publish would.
(cd "$ROOT" && npm pack --ignore-scripts --pack-destination "$tmp" > "$tmp/pack-name.txt" 2> "$tmp/pack.err") || {
  cat "$tmp/pack.err" >&2
  echo "FAIL pack: npm pack failed" >&2
  exit 1
}
tarball="$(find "$tmp" -maxdepth 1 -name '*.tgz' -print -quit)"
if [[ -z "$tarball" ]]; then
  echo "FAIL pack: npm pack produced no tarball" >&2
  exit 1
fi
echo "OK    pack: ${tarball##*/}"

# 2. Install it into a clean project outside the repo. Its own
# pnpm-workspace.yaml makes it a standalone root (no parent workspace). It is a
# copy of the repo's: the project has no lockfile, so the repo's 7-day
# release-age rule must apply there too, and its `@vllnt/*` exclusion also
# covers the local @vllnt/next-llms tarball.
project="$tmp/consumer"
mkdir -p "$project"
printf '%s\n' '{ "name": "next-llms-package-test", "private": true, "type": "module" }' > "$project/package.json"
cp "$ROOT/pnpm-workspace.yaml" "$project/pnpm-workspace.yaml"
(cd "$project" && pnpm add "$tarball" > "$tmp/install.log" 2>&1) || {
  cat "$tmp/install.log" >&2
  echo "FAIL install: pnpm add of the tarball failed" >&2
  exit 1
}
echo "OK    install: pnpm add into a clean project"

# 3. Import every entry point in the packed exports map and run the API.
cat > "$project/smoke.mjs" <<'EOF'
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL("node_modules/" + process.env.PKG_NAME + "/package.json", import.meta.url), "utf8"),
);
const fail = (message) => {
  console.error("FAIL " + message);
  process.exit(1);
};

const keys = Object.keys(manifest.exports ?? {});
if (!keys.includes(".")) fail('exports: no "." entry');
let main;
for (const key of keys) {
  if (key.includes("*")) fail(`exports: pattern ${key} is not covered by this test`);
  const specifier = manifest.name + key.slice(1);
  try {
    const mod = key.endsWith(".json") ? require(specifier) : await import(specifier);
    if (key === ".") main = mod;
  } catch (error) {
    fail(`import ${specifier}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(`OK    import: ${keys.length} exports entr${keys.length === 1 ? "y" : "ies"} (${keys.join(", ")})`);

const names = Object.keys(main).sort();
const expected = ["createMarkdownRoute", "generateLlmsText"];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  fail(`main exports: expected ${expected.join(", ")}, got ${names.join(", ")}`);
}
for (const name of expected) {
  if (typeof main[name] !== "function") fail(`main exports: ${name} is not a function`);
}

const text = main.generateLlmsText({ title: "x" });
if (text !== "# x") fail(`generateLlmsText: unexpected ${JSON.stringify(text)}`);
const handler = main.createMarkdownRoute(() => "# Hi");
const response = await handler(new Request("https://example.com/a.md"));
if (response.status !== 200) fail(`createMarkdownRoute: status ${response.status}`);
const body = await response.text();
if (body !== "# Hi") fail(`createMarkdownRoute: unexpected body ${JSON.stringify(body)}`);
console.log("OK    runtime: main exports exactly " + expected.join(", ") + " and both work");
EOF
pkg_name="$(node -p 'require(process.argv[1]).name' "$ROOT/package.json")"
(cd "$project" && PKG_NAME="$pkg_name" node smoke.mjs)

# 4. Type-check a strict consumer with the repo's own compiler.
cat > "$project/consumer.ts" <<EOF
import { createMarkdownRoute, generateLlmsText } from "$pkg_name";
import type {
  LlmsConfig,
  LlmsLink,
  LlmsSection,
  MarkdownResolver,
  MarkdownRouteOptions,
} from "$pkg_name";

const link: LlmsLink = { title: "Intro", url: "/intro.md", notes: "Start" };
const section: LlmsSection = { title: "Docs", links: [link] };
const config: LlmsConfig = { title: "x", summary: "s", sections: [section], optional: [link] };
const text: string = generateLlmsText(config);
const resolver: MarkdownResolver = (slug) => (slug[0] === undefined ? null : "# Hi");
const options: MarkdownRouteOptions = { cacheControl: "no-store" };
const handler: (request: Request) => Promise<Response> = createMarkdownRoute(resolver, options);
export const result: [string, Promise<Response>] = [text, handler(new Request("https://example.com/a.md"))];
EOF
cat > "$project/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2024",
    "lib": ["ES2024", "DOM"],
    "types": [],
    "noEmit": true,
    "skipLibCheck": false
  },
  "files": ["consumer.ts"]
}
EOF
"$TSC" --project "$project/tsconfig.json" || {
  echo "FAIL types: strict consumer does not type-check against the packed declarations" >&2
  exit 1
}
echo "OK    types: strict consumer type-checks with $("$TSC" --version)"

echo "OK    test-package.sh"
