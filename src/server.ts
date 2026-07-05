import type { Stats } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { DEFAULT_FAVICON_ICO_BYTES } from "./favicon";
import { renderDirectoryPage, type DirectoryEntry } from "./html";

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

  return withCors(fileResponse(resolved.path, fileStat, request.method));
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
