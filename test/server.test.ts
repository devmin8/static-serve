import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
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
    "# Doc Title\n\nSome **bold** text with a note[^1].\n\n```ts\nconst a: number = 1;\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n- [ ] todo\n- [x] done\n\n[^1]: The footnote body.\n"
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
