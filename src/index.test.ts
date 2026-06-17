import { describe, expect, it } from "vitest";

import {
  createMarkdownRoute,
  generateLlmsFullText,
  generateLlmsText,
} from "./index.js";

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
});

describe("generateLlmsFullText", () => {
  it("inlines page content under sections, with and without source URLs", () => {
    const out = generateLlmsFullText({
      title: "Acme",
      summary: "Full text.",
      details: "Intro.",
      sections: [
        {
          title: "Docs",
          pages: [
            {
              title: "Quickstart",
              url: "/docs/quickstart",
              content: "# QS\n\nDo this.",
            },
            { title: "Reference", content: "# Ref\n\nDetails." },
          ],
        },
      ],
    });

    expect(out).toBe(
      [
        "# Acme",
        "> Full text.",
        "Intro.",
        "## Docs\n\n### Quickstart\n\nSource: /docs/quickstart\n\n# QS\n\nDo this.\n\n### Reference\n\n# Ref\n\nDetails.",
      ].join("\n\n"),
    );
  });

  it("renders a minimal full manifest (title + empty sections)", () => {
    expect(generateLlmsFullText({ title: "Bare", sections: [] })).toBe(
      "# Bare",
    );
  });

  it("renders a section heading with no pages when the page list is empty", () => {
    expect(
      generateLlmsFullText({
        title: "T",
        sections: [{ title: "Empty", pages: [] }],
      }),
    ).toBe("# T\n\n## Empty");
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
});
