import { dirname, posix } from "node:path";
import { DIRECTORY_CLIENT } from "./directory-client";
import { DIRECTORY_STYLES } from "./directory-styles";
import { escapeHtml } from "./escape";
import { FAVICON_HREF, FAVICON_PNG_HREF } from "./favicon";
import { THEME_INIT_SCRIPT, THEME_TOGGLE_HTML, THEME_TOKENS } from "./theme";

export type DirectoryEntry = {
  name: string;
  href: string;
  kind: "directory" | "file";
  size: number | null;
  modifiedAt: string;
};

type PageOptions = {
  pathName: string;
  entries: DirectoryEntry[];
};

export function renderDirectoryPage({ pathName, entries }: PageOptions): string {
  const heading = directoryHeading(pathName);
  const title = pathName === "/" ? "Static Serve - Root" : `Static Serve - ${pathName}`;
  const payload = safeJson(entries);
  const parentHref = pathName === "/" ? null : toHref(dirname(pathName));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/png" sizes="32x32" href="${FAVICON_PNG_HREF}">
  <link rel="icon" type="image/svg+xml" href="${FAVICON_HREF}">
  <script>${THEME_INIT_SCRIPT}</script>
  <style>${THEME_TOKENS}${DIRECTORY_STYLES}</style>
</head>
<body>
  ${THEME_TOGGLE_HTML}
  <main>
    <section class="masthead" aria-label="Current directory">
      <div>
        <div class="kicker">Directory</div>
        <h1>${escapeHtml(heading)}</h1>
        <nav class="path" aria-label="Breadcrumb">${renderBreadcrumbs(pathName)}</nav>
      </div>
      <div class="stats" id="stats"></div>
    </section>

    <section class="toolbar" aria-label="Directory controls">
      <label class="searchbox">
        <input class="search" id="search" type="search" placeholder="Search this folder" autocomplete="off">
      </label>
      <div class="sortbar">
        <span class="sortlabel">Sort</span>
        <div class="sort-options" role="group" aria-label="Sort field">
          <button class="sort-option" type="button" data-sort="name" aria-pressed="true">Name</button>
          <button class="sort-option" type="button" data-sort="kind" aria-pressed="false">Type</button>
          <button class="sort-option" type="button" data-sort="size" aria-pressed="false">Size</button>
          <button class="sort-option" type="button" data-sort="modifiedAt" aria-pressed="false">Date</button>
        </div>
        <button class="toggle" id="direction" type="button" aria-label="Change sort direction">Asc</button>
      </div>
    </section>

    <section class="panel" aria-label="Directory listing">
      <div class="header" aria-hidden="true">
        <div>Name</div>
        <div>Type</div>
        <div>Size</div>
        <div>Modified</div>
      </div>
      <div id="listing"></div>
    </section>
  </main>

  <div class="route-loader" id="route-loader" aria-hidden="true">
    <div class="route-loader__card">
      <div class="route-loader__spinner"></div>
      <div class="route-loader__label">Rendering<span class="route-loader__file"></span></div>
    </div>
  </div>

  <script>
    const directoryEntries = ${payload};
    const parentHref = ${parentHref ? JSON.stringify(parentHref) : "null"};
  </script>
  <script>${DIRECTORY_CLIENT}</script>
</body>
</html>`;
}

function renderBreadcrumbs(pathName: string): string {
  const segments = pathName.split("/").filter(Boolean);
  const links = [`<a href="/">root</a>`];
  let current = "";

  for (const segment of segments) {
    current = posix.join(current, segment);
    links.push(`<span>/</span><a href="${escapeHtml(toHref(`/${current}`))}">${escapeHtml(segment)}</a>`);
  }

  return links.join("");
}

function directoryHeading(pathName: string): string {
  if (pathName === "/") return "Root";
  const segments = pathName.split("/").filter(Boolean);
  const name = segments.at(-1) ?? pathName;

  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function toHref(pathName: string): string {
  if (pathName === "." || pathName === "/") return "/";
  const normalized = pathName.startsWith("/") ? pathName : `/${pathName}`;
  return encodeURI(normalized.endsWith("/") ? normalized : `${normalized}/`);
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
