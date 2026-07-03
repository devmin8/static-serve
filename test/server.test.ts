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
    expect(html).toContain('rel="icon"');
  });

  test("serves files directly", async () => {
    const response = await handleRequest(new Request("http://local/hello%20world.txt"), realRoot);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
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
});
