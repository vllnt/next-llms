import { describe, expect, it, vi } from "vitest";

import type {
  LlmsConfig,
  LlmsSection,
  MarkdownResolver,
  MarkdownRouteOptions,
} from "./index.js";
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
              title: "A\nB",
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
        "## Docs ## Fake\n\n- [A B](/a.md): ok - [evil](https://evil.test)",
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
            { title: "C", url: String.raw`/a\b.md` },
          ],
        },
      ],
    });

    expect(out).toBe(
      [
        "# T",
        String.raw`## S

- [a\]b\[c\\d](/x%20y/%28z%29%3Cq%3E.md)
- [B](/p%20q.md)
- [C](/a%5Cb.md)`,
      ].join("\n\n"),
    );
  });

  it.each([
    "javascript:alert(1)",
    " JaVa\tScript:alert(1)",
    "data:text/html,x",
    "vbscript:x",
    "\u0000javascript:alert(1)",
  ])("rejects the unsafe URL %j", (url) => {
    expect(() =>
      generateLlmsText({
        title: "T",
        sections: [{ title: "S", links: [{ title: "L", url }] }],
      }),
    ).toThrow(
      new TypeError(
        "link url must not use a javascript:, data: or vbscript: scheme",
      ),
    );
  });

  it("ends the output with details' trailing newline only when no section follows", () => {
    const link = { title: "L", url: "/l.md" };
    expect(generateLlmsText({ title: "T", details: "Prose\n" })).toBe(
      "# T\n\nProse\n",
    );
    expect(
      generateLlmsText({ title: "T", details: "Prose\n", optional: [link] }),
    ).toBe("# T\n\nProse\n\n\n## Optional\n\n- [L](/l.md)");
  });

  it("omits empty summary, details and notes, and whitespace-only notes", () => {
    expect(
      generateLlmsText({
        title: "T",
        summary: "",
        details: "",
        sections: [
          {
            title: "S",
            links: [
              { title: "A", url: "/a.md", notes: "" },
              { title: "B", url: "/b.md", notes: " \n\t " },
            ],
          },
        ],
      }),
    ).toBe("# T\n\n## S\n\n- [A](/a.md)\n- [B](/b.md)");
  });

  it("renders a whitespace-only summary as an empty blockquote line", () => {
    expect(generateLlmsText({ title: "T", summary: " \n " })).toBe("# T\n\n> ");
  });

  it("inserts details as-is, without escaping, even when only whitespace", () => {
    const raw = "## Raw\n- [x](javascript:alert(1))";
    expect(generateLlmsText({ title: "T", details: raw })).toBe(
      `# T\n\n${raw}`,
    );
    expect(generateLlmsText({ title: "T", details: "   " })).toBe("# T\n\n   ");
  });

  it.each([
    ["title must be a non-empty string", { title: 42 as unknown as string }],
    [
      "section title must be a non-empty string",
      {
        title: "T",
        sections: [{ title: undefined as unknown as string, links: [] }],
      },
    ],
    [
      "link title must be a non-empty string",
      {
        title: "T",
        optional: [{ title: null as unknown as string, url: "/l.md" }],
      },
    ],
    [
      "link url must be a non-empty string",
      { title: "T", optional: [{ title: "L", url: 7 as unknown as string }] },
    ],
  ])("throws %j for a non-string value", (message, config) => {
    expect(() => generateLlmsText(config)).toThrow(new TypeError(message));
  });

  it("throws a TypeError for input that does not match the types", () => {
    expect(() =>
      generateLlmsText({
        title: "T",
        sections: [{ title: "S" } as unknown as LlmsSection],
      }),
    ).toThrow(
      new TypeError("Cannot read properties of undefined (reading 'map')"),
    );
    expect(() => generateLlmsText(undefined as unknown as LlmsConfig)).toThrow(
      TypeError,
    );
  });

  it("rejects blank titles and URLs", () => {
    const link = { title: "L", url: "/l.md" };
    expect(() => generateLlmsText({ title: "" })).toThrow(
      new TypeError("title must be a non-empty string"),
    );
    expect(() => generateLlmsText({ title: "  \n " })).toThrow(TypeError);
    expect(() =>
      generateLlmsText({ title: "T", sections: [{ title: "", links: [] }] }),
    ).toThrow(new TypeError("section title must be a non-empty string"));
    expect(() =>
      generateLlmsText({
        title: "T",
        optional: [{ ...link, title: " " }],
      }),
    ).toThrow(new TypeError("link title must be a non-empty string"));
    expect(() =>
      generateLlmsText({ title: "T", optional: [{ ...link, url: "" }] }),
    ).toThrow(new TypeError("link url must be a non-empty string"));
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
    ["/docs//intro.md", ["docs", "intro"]],
    ["/docs/INTRO.MD", ["docs", "INTRO.MD"]],
    ["/docs/intro%2Emd", ["docs", "intro.md"]],
    ["/md/docs/intro.md", ["md", "docs", "intro"]],
    ["/docs/../x", ["x"]],
    ["/docs/%2E%2E/x", ["x"]],
  ])("passes the request path %s to the resolver as %j", async (path, slug) => {
    const resolver = vi.fn(() => "ok");
    await createMarkdownRoute(resolver)(
      new Request(`https://site.test${path}`),
    );

    expect(resolver).toHaveBeenCalledWith(slug);
  });

  it.each([
    "/..%2F..%2Fetc%2Fpasswd.md",
    "/..%2Fsecret",
    "/docs/..%2Fsecret.md",
    "/docs/%2e%2e%2fsecret",
    "/docs%5C..%5Csecret",
    "/a%00b",
    "/%E0%A4%A",
    "/docs/%E0.md",
    "/.md",
    "/docs/.md",
    "/docs/...md",
    "/docs/%2E%2E.md",
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

  it("sends plain text with nosniff and no Cache-Control on 400 and 404", async () => {
    const handler = createMarkdownRoute(() => null);
    const responses = await Promise.all([
      handler(new Request("https://site.test/missing.md")),
      handler(new Request("https://site.test/docs/.md")),
    ]);

    expect(responses.map((response) => response.status)).toEqual([404, 400]);
    expect(
      responses.map((response) => [
        response.headers.get("Content-Type"),
        response.headers.get("X-Content-Type-Options"),
        response.headers.has("Cache-Control"),
      ]),
    ).toEqual([
      ["text/plain; charset=utf-8", "nosniff", false],
      ["text/plain; charset=utf-8", "nosniff", false],
    ]);
  });

  it("rejects with the resolver's error when the resolver rejects", async () => {
    const error = new Error("resolver failed");
    const handler = createMarkdownRoute(() => Promise.reject(error));

    await expect(handler(new Request("https://site.test/a.md"))).rejects.toBe(
      error,
    );
  });

  it("rejects with the resolver's error when the resolver throws synchronously", async () => {
    const error = new Error("resolver failed");
    const handler = createMarkdownRoute(() => {
      throw error;
    });

    await expect(handler(new Request("https://site.test/a.md"))).rejects.toBe(
      error,
    );
  });

  it("rejects on each request when the resolver is not a function", async () => {
    const handler = createMarkdownRoute(42 as unknown as MarkdownResolver);

    await expect(
      handler(new Request("https://site.test/a.md")),
    ).rejects.toThrow(new TypeError("resolver is not a function"));
  });

  it('sends an empty Cache-Control header for cacheControl: ""', async () => {
    const response = await createMarkdownRoute(() => "x", { cacheControl: "" })(
      new Request("https://site.test/a.md"),
    );

    expect(response.headers.has("Cache-Control")).toBe(true);
    expect(response.headers.get("Cache-Control")).toBe("");
  });

  it("trims leading and trailing whitespace from cacheControl", async () => {
    const response = await createMarkdownRoute(() => "x", {
      cacheControl: " no-store\r\n",
    })(new Request("https://site.test/a.md"));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([
    ["no-store\r\nX-Evil: 1", /is an invalid header value/],
    ["no-\u0000store", /is an invalid header value/],
    ["no-\u0100store", /ByteString/],
  ])(
    "rejects the invalid cacheControl value %j when the handler is created",
    (cacheControl, message) => {
      const create = (): unknown =>
        createMarkdownRoute(() => "x", { cacheControl });
      expect(create).toThrow(TypeError);
      expect(create).toThrow(message);
    },
  );

  it("throws a TypeError at creation when options is null", () => {
    expect(() =>
      createMarkdownRoute(() => "x", null as unknown as MarkdownRouteOptions),
    ).toThrow(
      new TypeError("Cannot read properties of null (reading 'cacheControl')"),
    );
  });
});
