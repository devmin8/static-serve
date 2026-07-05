import type { Stats } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { LruCache, hashText } from "./cache";
import { DEFAULT_FAVICON_ICO_BYTES } from "./favicon";
import { renderDirectoryPage, type DirectoryEntry } from "./html";
import { renderMarkdownPage } from "./markdown";

type ServerOptions = {
  root: string;
  port: number;
  host: string;
};

type StartedServer = {
  port: number;
  root: string;
  stop: () => void;
};

type ReadDirectoryEntry = DirectoryEntry & {
  realAbsolutePath: string;
};

export async function startServer(options: ServerOptions): Promise<StartedServer> {
  const root = await realpath(resolve(options.root));
  const rootStat = await stat(root);

  if (!rootStat.isDirectory()) {
    throw new Error(`Root must be a directory: ${root}`);
  }

  const server = Bun.serve({
    port: options.port,
    hostname: options.host,
    async fetch(request) {
      return handleRequest(request, root);
    }
  });

  return {
    port: server.port ?? options.port,
    root,
    stop: () => server.stop()
  };
}

// Local dev servers are often loaded from a different origin than the assets they
// expose (e.g. localhost:3000 fetching from localhost:8080). Browsers block those
// cross-origin reads unless we opt in with permissive CORS headers on every response.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*"
};

export async function handleRequest(request: Request, root: string): Promise<Response> {
  // Preflight requests never read a file; answer them up front so cross-origin
  // clients can proceed to the actual GET/HEAD without hitting path resolution.
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return withCors(textResponse("Method not allowed", 405, { Allow: "GET, HEAD, OPTIONS" }));
  }

  const url = new URL(request.url);
  const resolved = await resolveRequestPath(root, url.pathname);

  if (!resolved.ok) {
    // Serve a built-in favicon only when the root directory has none, so browser
    // tab requests do not 404 while browsing directory listings.
    if (url.pathname === "/favicon.ico" && resolved.status === 404) {
      return withCors(faviconResponse(request.method));
    }

    return withCors(textResponse(resolved.message, resolved.status));
  }

  const fileStat = await stat(resolved.path);

  if (fileStat.isDirectory()) {
    if (!url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
      return withCors(Response.redirect(url, 308));
    }

    // Prefer index.html over a generated listing, matching normal static hosting.
    const indexPath = join(resolved.path, "index.html");
    try {
      const indexStat = await stat(indexPath);
      if (indexStat.isFile()) {
        return withCors(fileResponse(indexPath, indexStat, request.method));
      }
    } catch {
      // Fall through to directory listing when index.html is missing.
    }

    const entries = await readDirectoryEntries(root, resolved.path, url.pathname);
    const html = renderDirectoryPage({ pathName: url.pathname, entries });
    return withCors(htmlResponse(html, request.method));
  }

  if (!fileStat.isFile()) {
    return withCors(textResponse("Not found", 404));
  }

  // Markdown is rendered to a styled HTML page on the fly. ?raw opts out and serves
  // the original text file, so the source stays reachable when you want it.
  if (isMarkdownPath(resolved.path) && !url.searchParams.has("raw")) {
    return withCors(await markdownResponse(resolved.path, request));
  }

  return withCors(fileResponse(resolved.path, fileStat, request.method));
}

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

// Rendering (marked + Shiki highlighting) is the expensive step, so we memoize the
// finished HTML. Bounded by entry count and TTL to keep memory in check on a
// long-lived server browsing a large tree.
const renderedMarkdown = new LruCache<string, string>({ maxEntries: 256, ttlMs: 30 * 60 * 1000 });

function isMarkdownPath(path: string): boolean {
  return MARKDOWN_EXTENSIONS.has(extname(path).toLowerCase());
}

async function markdownResponse(path: string, request: Request): Promise<Response> {
  const source = await Bun.file(path).text();
  // Hash path + content: two files with identical bodies keep distinct keys (and
  // titles), and any edit yields a fresh key. The same value is the ETag, so an
  // unchanged file revalidates to a cheap 304 without re-reading the render cache.
  const etag = `"${hashText(`${path}\0${source}`)}"`;

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers: markdownCacheHeaders(etag) });
  }

  let html = renderedMarkdown.get(etag);
  if (html === undefined) {
    html = await renderMarkdownPage({ markdown: source, fallbackTitle: basename(path) });
    renderedMarkdown.set(etag, html);
  }

  return new Response(request.method === "HEAD" ? null : html, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...markdownCacheHeaders(etag) }
  });
}

// no-cache keeps the browser revalidating every visit (so edits show immediately)
// while the ETag makes that revalidation a bodiless 304 whenever nothing changed.
function markdownCacheHeaders(etag: string): Record<string, string> {
  return { ETag: etag, "Cache-Control": "no-cache" };
}

async function resolveRequestPath(root: string, urlPathname: string) {
  let decodedPathname: string;

  try {
    decodedPathname = decodeURIComponent(urlPathname);
  } catch {
    return { ok: false as const, status: 400, message: "Bad request" };
  }

  if (decodedPathname.includes("\0")) {
    return { ok: false as const, status: 400, message: "Bad request" };
  }

  const absolutePath = resolve(root, `.${decodedPathname}`);

  let realAbsolutePath: string;
  try {
    realAbsolutePath = await realpath(absolutePath);
  } catch {
    return { ok: false as const, status: 404, message: "Not found" };
  }

  if (!isInside(root, realAbsolutePath)) {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const, path: realAbsolutePath };
}

async function readDirectoryEntries(root: string, directory: string, urlPathname: string): Promise<DirectoryEntry[]> {
  const dirents = await readdir(directory, { withFileTypes: true });
  const entries = await Promise.all(
    dirents.map(async (dirent) => {
      const absolutePath = resolve(directory, dirent.name);
      try {
        const realAbsolutePath = await realpath(absolutePath);
        const entryStat = await stat(absolutePath);
        const href = new URL(encodePathSegment(dirent.name), `http://local${urlPathname}`).pathname;

        return {
          name: dirent.name,
          href: entryStat.isDirectory() ? ensureTrailingSlash(href) : href,
          kind: entryStat.isDirectory() ? "directory" as const : "file" as const,
          size: entryStat.isDirectory() ? null : entryStat.size,
          modifiedAt: entryStat.mtime.toISOString(),
          realAbsolutePath
        };
      } catch {
        return null;
      }
    })
  );

  return entries
    .filter(isReadableEntry)
    .filter((entry) => isInside(root, entry.realAbsolutePath))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    })
    .map(({ realAbsolutePath: _realAbsolutePath, ...entry }) => entry);
}

function isReadableEntry(entry: ReadDirectoryEntry | null): entry is ReadDirectoryEntry {
  return entry !== null;
}

function isInside(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !pathFromRoot.startsWith(sep));
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replaceAll("%2F", "/");
}

function withCors(response: Response): Response {
  // Applied at each return site instead of inside response helpers so every exit
  // path (redirects, errors, files, HTML) gets the same headers without duplicating
  // CORS logic across fileResponse, htmlResponse, textResponse, and faviconResponse.
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(name, value);
  }

  return response;
}

function fileResponse(path: string, fileStat: Stats, method: string): Response {
  const file = Bun.file(path);

  return new Response(method === "HEAD" ? null : file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Length": String(fileStat.size),
      "Last-Modified": fileStat.mtime.toUTCString()
    }
  });
}

function htmlResponse(body: string, method: string): Response {
  return new Response(method === "HEAD" ? null : body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

function faviconResponse(method: string): Response {
  const body = method === "HEAD" ? null : new Blob([DEFAULT_FAVICON_ICO_BYTES], { type: "image/x-icon" });

  return new Response(body, {
    headers: {
      "Content-Type": "image/x-icon",
      "Content-Length": String(DEFAULT_FAVICON_ICO_BYTES.byteLength),
      "Cache-Control": "public, max-age=86400"
    }
  });
}

function textResponse(body: string, status: number, headers?: HeadersInit): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...headers
    }
  });
}
