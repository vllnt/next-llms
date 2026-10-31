import { describe, expect, it, vi } from "vitest";

import { createMarkdownRoute, generateLlmsText } from "./index.js";

describe("generateLlmsText", () => {
  it("renders a full manifest with summary, details, sections, and Optional", () => {
    const out = generateLlmsText({
      title: "Acme Docs",
      summary: "Everything an agent needs to use Acme.",
      details: "Acme is a widget API.",
      sections: [
        {
          title: "Docs",
          links: [
            {
              title: "Quickstart",
              url: "/docs/quickstart.md",
              notes: "Start here",
            },
            { title: "Reference", url: "/docs/reference.md" },
          ],
        },
      ],
      optional: [{ title: "Changelog", url: "/changelog.md" }],
    });

    expect(out).toBe(
      [
        "# Acme Docs",
        "> Everything an agent needs to use Acme.",
        "Acme is a widget API.",
        "## Docs\n\n- [Quickstart](/docs/quickstart.md): Start here\n- [Reference](/docs/reference.md)",
        "## Optional\n\n- [Changelog](/changelog.md)",
      ].join("\n\n"),
    );
  });

  it("renders a minimal manifest with only a title", () => {
    expect(generateLlmsText({ title: "Bare" })).toBe("# Bare");
  });

  it("renders a section heading with no links when the link list is empty", () => {
    expect(
      generateLlmsText({
        title: "T",
        sections: [{ title: "Empty", links: [] }],
      }),
    ).toBe("# T\n\n## Empty");
  });

  it("omits the Optional section when optional is an empty array", () => {
    expect(generateLlmsText({ title: "T", optional: [] })).toBe("# T");
  });

  it("collapses line breaks so values cannot inject headings or links", () => {
    const out = generateLlmsText({
      title: "Site\n## Injected",
      summary: "line one\r\n# Heading",
      sections: [
        {
          title: "Docs\n## Fake",
          links: [
            {
              title: "A",
              url: "/a.md",
              notes: "ok\n- [evil](https://evil.test)",
            },
          ],
        },
      ],
    });

    expect(out).toBe(
      [
        "# Site ## Injected",
        "> line one # Heading",
        "## Docs ## Fake\n\n- [A](/a.md): ok - [evil](https://evil.test)",
      ].join("\n\n"),
    );
  });

  it("escapes brackets in link titles and encodes unsafe URL characters", () => {
    const out = generateLlmsText({
      title: "T",
      sections: [
        {
          title: "S",
          links: [
            { title: String.raw`a]b[c\d`, url: "/x y/(z)<q>.md" },
            { title: "B", url: "/p%20q.md" },
          ],
        },
      ],
    });

    expect(out).toBe(
      [
        "# T",
        String.raw`## S

- [a\]b\[c\\d](/x%20y/%28z%29%3Cq%3E.md)
- [B](/p%20q.md)`,
      ].join("\n\n"),
    );
  });

  it.each([
    "javascript:alert(1)",
    " JaVa\tScript:alert(1)",
    "data:text/html,x",
    "vbscript:x",
  ])("rejects the unsafe URL %j", (url) => {
    expect(() =>
      generateLlmsText({
        title: "T",
        sections: [{ title: "S", links: [{ title: "L", url }] }],
      }),
    ).toThrow(TypeError);
  });

  it("rejects blank titles and URLs", () => {
    const link = { title: "L", url: "/l.md" };
    expect(() => generateLlmsText({ title: "" })).toThrow("title");
    expect(() => generateLlmsText({ title: "  \n " })).toThrow(TypeError);
    expect(() =>
      generateLlmsText({ title: "T", sections: [{ title: "", links: [] }] }),
    ).toThrow("section title");
    expect(() =>
      generateLlmsText({
        title: "T",
        optional: [{ ...link, title: " " }],
      }),
    ).toThrow("link title");
    expect(() =>
      generateLlmsText({ title: "T", optional: [{ ...link, url: "" }] }),
    ).toThrow("link url");
  });
});

describe("createMarkdownRoute", () => {
  it("returns 200 markdown with default cache headers when the resolver resolves", async () => {
    const handler = createMarkdownRoute(() => Promise.resolve("# Hello"));
    const response = await handler(
      new Request("https://site.test/docs/intro.md"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    expect(await response.text()).toBe("# Hello");
  });

  it("returns 404 plain text when the resolver returns null", async () => {
    const handler = createMarkdownRoute(() => null);
    const response = await handler(new Request("https://site.test/missing.md"));

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(await response.text()).toBe("Not Found");
  });

  it("honors a custom cacheControl option", async () => {
    const handler = createMarkdownRoute(() => "x", {
      cacheControl: "no-store",
    });
    const response = await handler(new Request("https://site.test/a.md"));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("strips a trailing .md and passes the decoded slug to the resolver", async () => {
    let received: string[] = [];
    const handler = createMarkdownRoute((slug) => {
      received = slug;
      return "ok";
    });
    await handler(new Request("https://site.test/docs/getting%20started.md"));

    expect(received).toEqual(["docs", "getting started"]);
  });

  it("passes a slug without a .md suffix unchanged", async () => {
    let received: string[] = [];
    const handler = createMarkdownRoute((slug) => {
      received = slug;
      return "ok";
    });
    await handler(new Request("https://site.test/docs/intro"));

    expect(received).toEqual(["docs", "intro"]);
  });

  it("resolves an empty slug for the root path", async () => {
    let received: string[] = ["unset"];
    const handler = createMarkdownRoute((slug) => {
      received = slug;
      return "root";
    });
    await handler(new Request("https://site.test/"));

    expect(received).toEqual([]);
  });

  it("treats an empty string as content (200), not a 404", async () => {
    const handler = createMarkdownRoute(() => "");
    const response = await handler(new Request("https://site.test/empty.md"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it.each([
    "/..%2F..%2Fetc%2Fpasswd.md",
    "/docs/%2e%2e%2fsecret",
    "/docs%5C..%5Csecret",
    "/a%00b",
    "/%E0%A4%A",
    "/.md",
  ])("returns 400 without calling the resolver for %s", async (path) => {
    const resolver = vi.fn(() => "secret");
    const response = await createMarkdownRoute(resolver)(
      new Request(`https://site.test${path}`),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Bad Request");
    expect(resolver).not.toHaveBeenCalled();
  });

  it("returns 404 when the resolver returns a non-string value", async () => {
    const handler = createMarkdownRoute(() => undefined as unknown as string);
    const response = await handler(new Request("https://site.test/a.md"));

    expect(response.status).toBe(404);
  });

  it("sets nosniff on 200 and 404 responses", async () => {
    const ok = await createMarkdownRoute(() => "x")(
      new Request("https://site.test/a"),
    );
    const missing = await createMarkdownRoute(() => null)(
      new Request("https://site.test/a"),
    );

    expect(ok.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(missing.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("rejects an invalid cacheControl value when the handler is created", () => {
    expect(() =>
      createMarkdownRoute(() => "x", { cacheControl: "no-store\r\nX-Evil: 1" }),
    ).toThrow(TypeError);
  });
});
