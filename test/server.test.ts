import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { handleRequest } from "../src/server";

let root = "";
let realRoot = "";
let outsideFileName = "";

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "static-serve-"));
  realRoot = await realpath(root);
  outsideFileName = `${root.split("/").pop()}-outside.txt`;
  await mkdir(join(root, "nested"));
  await writeFile(join(root, "hello world.txt"), "hello");
  await writeFile(join(root, "nested", "deep.txt"), "deep");
  await writeFile(
    join(root, "doc.md"),
    "# Doc Title\n\n**Contents** [GitHub anchor](#api-side-by-side) · [loose anchor](#API, Side by Side)\n\nSome **bold** text with a note[^1].\n\n## API, Side by Side\n\n```ts\nconst a: number = 1;\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n- [ ] todo\n- [x] done\n\n[^1]: The footnote body.\n"
  );
  await writeFile(
    join(root, "callout.md"),
    "# Callouts\n\n> [!ok] Ship safely\n> Release behind a **feature flag**.\n\n> A normal quote stays normal.\n"
  );
  await writeFile(
    join(root, "columns.md"),
    "# Columns\n\n<!-- columns:start -->\n\n### Left\n\n```js\nconst left = true;\n```\n\n<!-- column -->\n\n### Right\n\n```js\nconst right = true;\n```\n\n<!-- columns:end -->\n"
  );
  await writeFile(
    join(root, "semantics.md"),
    "# Semantics\n\n## Rapid Flashcards\n\n7 primitives string, number, boolean, null, undefined, symbol, bigint.\n\ntypeof null \"object\" — historical bug.\n\nNaN !== NaN; check Number.isNaN.\n\nReact Query server state; Redux client state.\n\n## Day-Of Checklist\n\n- Re-read once.\n- Sleep early.\n\n## Explicit Flashcards\n\n<!-- flashcards:start -->\n\n**Token** Definition text.\n\n**Cache** Keep a reusable result.\n\n<!-- flashcards:end -->\n\n<!-- checklist:start -->\n\n- One\n- Two\n\n<!-- checklist:end -->\n"
  );
  await writeFile(join(dirname(root), outsideFileName), "outside");
});

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  if (root) await rm(join(dirname(root), outsideFileName), { force: true });
});

describe("handleRequest", () => {
  test("renders a directory listing with full filenames in the payload", async () => {
    const response = await handleRequest(new Request("http://local/"), realRoot);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(html).toContain("hello world.txt");
    expect(html).toContain("Search this folder");
    expect(html).toContain("<title>Static Serve - Root</title>");
    expect(html).toContain('<link rel="icon" type="image/png" sizes="32x32" href="data:image/png;base64,');
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,');

    const faviconHref = html.match(/<link rel="icon" type="image\/svg\+xml" href="([^"]+)">/)?.[1];
    expect(faviconHref).toBeDefined();
    expect(decodeURIComponent(faviconHref!.replace("data:image/svg+xml,", ""))).toStartWith("<svg");
  });

  test("serves files directly", async () => {
    const response = await handleRequest(new Request("http://local/hello%20world.txt"), realRoot);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
  });

  test("serves a default root favicon when none exists", async () => {
    const faviconRoot = await mkdtemp(join(tmpdir(), "static-serve-favicon-"));

    try {
      const response = await handleRequest(
        new Request("http://local/favicon.ico"),
        await realpath(faviconRoot)
      );
      const body = await response.arrayBuffer();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/x-icon");
      expect(response.headers.get("Content-Length")).toBe(String(body.byteLength));
      expect(body.byteLength).toBeGreaterThan(22);
    } finally {
      await rm(faviconRoot, { recursive: true, force: true });
    }
  });

  test("serves a user root favicon before the default favicon", async () => {
    const faviconRoot = await mkdtemp(join(tmpdir(), "static-serve-favicon-"));

    try {
      await writeFile(join(faviconRoot, "favicon.ico"), "custom-icon");

      const response = await handleRequest(
        new Request("http://local/favicon.ico"),
        await realpath(faviconRoot)
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("custom-icon");
    } finally {
      await rm(faviconRoot, { recursive: true, force: true });
    }
  });

  test("redirects directories to a trailing slash", async () => {
    const response = await handleRequest(new Request("http://local/nested"), realRoot);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("http://local/nested/");
  });

  test("blocks path traversal", async () => {
    const response = await handleRequest(new Request(`http://local/..%2F${outsideFileName}`), realRoot);

    expect(response.status).toBe(403);
  });

  test("serves index.html when a directory contains one", async () => {
    const indexRoot = await mkdtemp(join(tmpdir(), "static-serve-index-"));

    try {
      await mkdir(join(indexRoot, "site"));
      await writeFile(join(indexRoot, "site", "index.html"), "<!doctype html><title>Site</title>");

      const realIndexRoot = await realpath(indexRoot);
      const response = await handleRequest(new Request("http://local/site/"), realIndexRoot);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/html");
      expect(await response.text()).toBe("<!doctype html><title>Site</title>");
    } finally {
      await rm(indexRoot, { recursive: true, force: true });
    }
  });

  test("falls back to a directory listing when index.html is missing", async () => {
    const response = await handleRequest(new Request("http://local/nested/"), realRoot);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("deep.txt");
    expect(html).toContain("Search this folder");
  });

  test("adds liberal CORS headers to responses", async () => {
    const response = await handleRequest(new Request("http://local/hello%20world.txt"), realRoot);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, HEAD, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("*");
  });

  test("renders markdown files as a styled HTML page", async () => {
    const response = await handleRequest(new Request("http://local/doc.md"), realRoot);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    // Title comes from the first heading, not the file name.
    expect(html).toContain("<title>Doc Title</title>");
    expect(html).toContain('<h1 id="doc-title">Doc Title</h1>');
    expect(html).toContain('<h2 id="api-side-by-side">API, Side by Side</h2>');
    expect(html).toContain('<a href="#api-side-by-side">GitHub anchor</a>');
    expect(html).toContain('<a href="#api-side-by-side">loose anchor</a>');
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
    // Fenced code is highlighted by Shiki, not left as a bare <pre>.
    expect(html).toContain('class="shiki');
    expect(html).toContain('class="progress"');
    // Footnotes ([^1]) are rendered via the marked-footnote extension, not left raw.
    expect(html).toContain("data-footnotes");
    expect(html).not.toContain("[^1]");
    expect(response.headers.get("ETag")).toBeTruthy();
  });

  test("renders markdown callout blockquotes with themed classes", async () => {
    const response = await handleRequest(new Request("http://local/callout.md"), realRoot);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<blockquote class="callout callout-ok">');
    expect(html).toContain('<div class="callout-title">Ship safely</div>');
    expect(html).toContain("<strong>feature flag</strong>");
    expect(html).toContain("<blockquote>\n<p>A normal quote stays normal.</p>\n</blockquote>");
  });

  test("renders markdown column directives as responsive column groups", async () => {
    const response = await handleRequest(new Request("http://local/columns.md"), realRoot);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<div class="md-columns">');
    expect(html).toContain('<main class="doc">');
    expect(html).toContain('<div class="md-column">');
    expect(html).toContain('<h3 id="left">Left</h3>');
    expect(html).toContain('<h3 id="right">Right</h3>');
    expect(html).not.toContain("columns:start");
  });

  test("renders markdown flashcard and checklist semantics", async () => {
    const response = await handleRequest(new Request("http://local/semantics.md"), realRoot);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<div class="md-flashcards">');
    expect(html).toContain('<div class="md-flashcard"><strong>7 primitives</strong> string, number, boolean, null, undefined, symbol, bigint.</div>');
    expect(html).toContain('<div class="md-flashcard"><strong>React Query</strong> server state; Redux client state.</div>');
    expect(html).toContain('<div class="md-flashcard"><strong>Token</strong> Definition text.</div>');
    expect(html).toContain('<ul class="md-checklist">');
    expect(html).not.toContain("flashcards:start");
    expect(html).not.toContain("checklist:start");
  });

  test("renders reference markdown documents with working contents anchors", async () => {
    const referenceRoot = await realpath(join(import.meta.dir, "..", ".reference"));
    const markdownFiles = await findMarkdownFiles(referenceRoot);

    expect(markdownFiles.length).toBeGreaterThan(0);

    for (const file of markdownFiles) {
      const relativePath = file.slice(referenceRoot.length).split("/").map(encodeURIComponent).join("/");
      const source = await Bun.file(file).text();
      const response = await handleRequest(new Request(`http://local${relativePath}`), referenceRoot);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).not.toContain("columns:start");

      for (const id of contentsIds(source)) {
        expect(html).toContain(`href="#${id}"`);
        expect(html).toContain(`id="${id}"`);
      }

      if (file.endsWith("scotiabank-react-prep.md")) {
        expect(html).toContain('<div class="md-flashcards">');
        expect(html).toContain('<ul class="md-checklist">');
      }
    }
  });

  test("revalidates markdown with an ETag and returns 304 when unchanged", async () => {
    const first = await handleRequest(new Request("http://local/doc.md"), realRoot);
    const etag = first.headers.get("ETag");
    expect(etag).toBeTruthy();

    const revalidated = await handleRequest(
      new Request("http://local/doc.md", { headers: { "If-None-Match": etag! } }),
      realRoot
    );

    expect(revalidated.status).toBe(304);
    expect(revalidated.headers.get("ETag")).toBe(etag);
    expect(await revalidated.text()).toBe("");
  });

  test("serves the original markdown source with ?raw", async () => {
    const response = await handleRequest(new Request("http://local/doc.md?raw"), realRoot);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(body.startsWith("# Doc Title")).toBe(true);
  });

  test("directory listing wires up the markdown route loader", async () => {
    const response = await handleRequest(new Request("http://local/"), realRoot);
    const html = await response.text();

    expect(html).toContain('class="route-loader"');
    expect(html).toContain("isMarkdownHref");
  });

  test("handles CORS preflight requests", async () => {
    const response = await handleRequest(
      new Request("http://local/hello%20world.txt", { method: "OPTIONS" }),
      realRoot
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

async function findMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findMarkdownFiles(path);
    return /\.(md|markdown)$/i.test(entry.name) ? [path] : [];
  }));

  return nested.flat();
}

function contentsIds(markdown: string): string[] {
  const match = markdown.match(/\*\*Contents\*\*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (!match) return [];

  return [...match[1].matchAll(/\]\(#([^)#\s]+)\)/g)].map((idMatch) => idMatch[1]);
}
