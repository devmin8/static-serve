import { dirname, posix } from "node:path";

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
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2308090b'/%3E%3Cpath d='M15 23a6 6 0 0 1 6-6h9l5 6h8a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H21a6 6 0 0 1-6-6V23Z' fill='%2317191f' stroke='%2357c7b6' stroke-width='4'/%3E%3Cpath d='M15 29h34' stroke='%236e7cff' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E">
  <style>
    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/Geist-Variable.woff2") format("woff2");
    }

    @font-face {
      font-family: "Geist Mono";
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/GeistMono-Variable.woff2") format("woff2");
    }

    :root {
      color-scheme: dark;
      --bg: #08090b;
      --surface: #0c0d10;
      --surface-raised: #111217;
      --surface-soft: #17191f;
      --text: #f4f5f8;
      --muted: #a3a7b4;
      --faint: #6f7482;
      --line: rgba(255, 255, 255, 0.1);
      --line-soft: rgba(255, 255, 255, 0.065);
      --line-strong: rgba(255, 255, 255, 0.16);
      --accent: #6e7cff;
      --accent-strong: #a8b1ff;
      --accent-soft: rgba(110, 124, 255, 0.13);
      --focus: #8b96ff;
      --folder: #57c7b6;
      --shadow: 0 18px 48px rgba(0, 0, 0, 0.34), 0 1px 0 rgba(255, 255, 255, 0.055) inset;
      --shadow-soft: 0 10px 28px rgba(0, 0, 0, 0.24), 0 1px 0 rgba(255, 255, 255, 0.05) inset;
      --shadow-control: 0 6px 18px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.055) inset;
      --font-sans: "Geist", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-mono: "Geist Mono", "SF Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-family: var(--font-sans);
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    body::before {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--line-strong);
      content: "";
    }

    main {
      width: min(1240px, calc(100% - 48px));
      margin: 0 auto;
      padding: 32px 0 48px;
    }

    .masthead {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 18px;
    }

    .kicker {
      margin-bottom: 7px;
      color: var(--faint);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0 0 9px;
      font-size: clamp(1.45rem, 2vw, 1.95rem);
      line-height: 1.14;
      font-weight: 610;
      letter-spacing: 0;
    }

    .path {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: 0.88rem;
    }

    .path a {
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--muted);
      padding: 2px 6px;
      text-decoration: none;
    }

    .path a:hover {
      border-color: var(--line-strong);
      background: var(--surface-soft);
      color: var(--text);
    }

    .path span {
      color: var(--faint);
    }

    .stats {
      min-width: fit-content;
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(20, 22, 28, 0.94), rgba(13, 14, 18, 0.94));
      color: var(--muted);
      padding: 8px 11px;
      font-family: var(--font-mono);
      font-size: 0.84rem;
      font-weight: 450;
      box-shadow: var(--shadow-soft);
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(280px, 1fr) max-content;
      gap: 12px;
      align-items: center;
      margin-bottom: 10px;
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(19, 21, 27, 0.92), rgba(12, 13, 17, 0.92));
      padding: 8px;
      box-shadow: var(--shadow);
    }

    .searchbox {
      position: relative;
      min-width: 0;
    }

    .searchbox::before {
      position: absolute;
      top: 50%;
      left: 14px;
      width: 11px;
      height: 11px;
      border: 1.6px solid var(--faint);
      border-radius: 50%;
      content: "";
      transform: translateY(-58%);
    }

    .searchbox::after {
      position: absolute;
      top: 22px;
      left: 25px;
      width: 6px;
      height: 1.6px;
      border-radius: 999px;
      background: var(--faint);
      content: "";
      transform: rotate(45deg);
      transform-origin: left center;
    }

    .search {
      width: 100%;
      height: 36px;
      border: 0;
      border-radius: 7px;
      padding: 0 13px 0 38px;
      color: var(--text);
      background: var(--surface);
      font: inherit;
      outline: none;
      box-shadow: var(--shadow-control);
    }

    .search::placeholder {
      color: var(--faint);
    }

    .search:focus {
      box-shadow: 0 0 0 2px rgba(139, 150, 255, 0.38), var(--shadow-control);
    }

    .sortbar {
      display: grid;
      grid-template-columns: auto auto auto;
      gap: 6px;
      align-items: center;
      min-width: 0;
    }

    .sortlabel {
      color: var(--muted);
      padding: 0 3px 0 5px;
      font-size: 0.72rem;
      font-weight: 580;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .sort-options {
      display: grid;
      grid-template-columns: repeat(4, auto);
      gap: 2px;
      border-radius: 7px;
      background: var(--surface);
      padding: 2px;
      box-shadow: var(--shadow-control);
    }

    .sort-option {
      height: 30px;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--text);
      padding: 0 10px;
      font: inherit;
      font-size: 0.83rem;
      font-weight: 500;
      outline: none;
      cursor: pointer;
    }

    .sort-option:hover {
      background: var(--surface-soft);
      color: var(--text);
    }

    .sort-option[aria-pressed="true"] {
      background: var(--accent-soft);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18), inset 0 0 0 1px rgba(110, 124, 255, 0.16);
      color: var(--accent-strong);
    }

    .toggle {
      height: 30px;
      min-width: 50px;
      border: 0;
      border-radius: 5px;
      background: var(--surface-soft);
      color: var(--text);
      padding: 0 10px;
      font: inherit;
      font-size: 0.83rem;
      font-weight: 530;
      cursor: pointer;
      box-shadow: var(--shadow-control);
    }

    .toggle:hover {
      background: var(--accent-soft);
      color: var(--accent-strong);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.24), inset 0 0 0 1px rgba(110, 124, 255, 0.18);
    }

    .panel {
      overflow: hidden;
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(18, 20, 25, 0.98), rgba(13, 14, 18, 0.98));
      box-shadow: var(--shadow);
    }

    .row,
    .header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 90px 92px minmax(186px, max-content);
      gap: 14px;
      align-items: center;
    }

    .header {
      padding: 8px 16px;
      color: var(--muted);
      background: rgba(8, 9, 11, 0.42);
      font-size: 0.7rem;
      font-weight: 580;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.04) inset;
    }

    .row {
      position: relative;
      padding: 8px 16px;
      color: inherit;
      text-decoration: none;
      border-bottom: 1px solid var(--line-soft);
      transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
    }

    .row:last-child {
      border-bottom: 0;
    }

    .row::before {
      position: absolute;
      top: 7px;
      bottom: 7px;
      left: 0;
      width: 2px;
      border-radius: 0 999px 999px 0;
      background: transparent;
      content: "";
    }

    .row:hover {
      background: rgba(255, 255, 255, 0.035);
    }

    .row:hover::before {
      background: var(--accent);
    }

    .name {
      display: grid;
      grid-template-columns: 26px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      min-width: 0;
    }

    .filename {
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 0.92rem;
      font-weight: 470;
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: normal;
      white-space: normal;
    }

    .icon {
      position: relative;
      display: block;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: var(--surface-soft);
      color: var(--accent);
      box-shadow: inset 0 0 0 1px var(--line);
    }

    .icon.folder::before {
      position: absolute;
      top: 7px;
      left: 5px;
      width: 14px;
      height: 10px;
      border: 1.6px solid var(--folder);
      border-radius: 3px;
      background: rgba(87, 199, 182, 0.08);
      content: "";
    }

    .icon.folder::after {
      position: absolute;
      top: 5px;
      left: 6px;
      width: 7px;
      height: 4px;
      border-radius: 3px 3px 0 0;
      background: var(--folder);
      content: "";
    }

    .icon.file::before {
      position: absolute;
      top: 5px;
      left: 7px;
      width: 10px;
      height: 14px;
      border: 1.6px solid var(--accent);
      border-radius: 3px;
      background: rgba(110, 124, 255, 0.08);
      content: "";
    }

    .icon.file::after {
      position: absolute;
      top: 6px;
      left: 14px;
      width: 4px;
      height: 4px;
      border-radius: 0 2px 0 2px;
      background: var(--accent);
      content: "";
    }

    .meta {
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: 0.82rem;
      font-weight: 430;
      overflow-wrap: anywhere;
    }

    .type {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      width: fit-content;
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 430;
      text-transform: capitalize;
    }

    .type::before {
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: var(--faint);
      content: "";
    }

    .type.directory::before {
      background: var(--folder);
    }

    .size,
    .modified {
      font-variant-numeric: tabular-nums;
    }

    .modified {
      white-space: nowrap;
    }

    .empty {
      padding: 48px 18px;
      color: var(--muted);
      text-align: center;
    }

    @media (max-width: 760px) {
      main {
        width: min(100% - 20px, 680px);
        padding-top: 24px;
      }

      .masthead,
      .toolbar {
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }

      .sortbar {
        grid-template-columns: 1fr;
      }

      .sortlabel {
        grid-column: auto;
      }

      .sort-options {
        grid-template-columns: repeat(2, 1fr);
      }

      .row,
      .header {
        grid-template-columns: 1fr;
        gap: 8px;
        align-items: start;
      }

      .header {
        display: none;
      }

      .row {
        padding: 12px;
      }

      .name {
        align-items: start;
      }

      .meta::before {
        content: attr(data-label);
        display: inline-block;
        min-width: 74px;
        color: var(--faint);
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
      }
    }
  </style>
</head>
<body>
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

  <script>
    const directoryEntries = ${payload};
    const parentHref = ${parentHref ? JSON.stringify(parentHref) : "null"};
  </script>
  <script>
    const listing = document.querySelector("#listing");
    const search = document.querySelector("#search");
    const sortButtons = Array.from(document.querySelectorAll("[data-sort]"));
    const direction = document.querySelector("#direction");
    const stats = document.querySelector("#stats");
    let ascending = true;
    let sortKey = "name";

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    function formatSize(size) {
      if (size === null) return "-";
      const units = ["B", "KB", "MB", "GB", "TB"];
      let value = size;
      let unit = 0;
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
      }
      const digits = unit === 0 || value >= 10 ? 0 : 1;
      return value.toFixed(digits) + " " + units[unit];
    }

    function formatDate(value) {
      return dateFormatter.format(new Date(value));
    }

    function compare(a, b, key) {
      if (key === "size") return (a.size ?? -1) - (b.size ?? -1);
      if (key === "modifiedAt") return new Date(a.modifiedAt) - new Date(b.modifiedAt);
      if (key === "kind") {
        const kindCompare = collator.compare(a.kind, b.kind);
        return kindCompare || collator.compare(a.name, b.name);
      }
      return collator.compare(a.name, b.name);
    }

    function visibleEntries() {
      const query = search.value.trim().toLowerCase();
      return directoryEntries
        .filter((entry) => entry.name.toLowerCase().includes(query))
        .sort((a, b) => {
          const result = compare(a, b, sortKey);
          return ascending ? result : -result;
        });
    }

    function render() {
      const entries = visibleEntries();
      const rows = [];

      if (parentHref) {
        rows.push(rowTemplate({
          name: "..",
          href: parentHref,
          kind: "directory",
          size: null,
          modifiedAt: new Date().toISOString()
        }, true));
      }

      rows.push(...entries.map((entry) => rowTemplate(entry, false)));
      listing.innerHTML = rows.length
        ? rows.join("")
        : '<div class="empty">' + (search.value.trim() ? 'No matches in this folder' : 'This folder is empty') + '</div>';

      const folderCount = entries.filter((entry) => entry.kind === "directory").length;
      const fileCount = entries.length - folderCount;
      stats.textContent = folderCount + " folders / " + fileCount + " files";
    }

    function rowTemplate(entry, isParent) {
      const iconClass = entry.kind === "directory" ? "folder" : "file";
      const type = isParent ? "Parent" : entry.kind;
      const modified = isParent ? "-" : formatDate(entry.modifiedAt);

      return '<a class="row" href="' + escapeAttribute(entry.href) + '">' +
        '<div class="name"><span class="icon ' + iconClass + '" aria-hidden="true"></span><span class="filename">' + escapeHtml(entry.name) + '</span></div>' +
        '<div class="meta" data-label="Type"><span class="type ' + escapeAttribute(entry.kind) + '">' + escapeHtml(type) + '</span></div>' +
        '<div class="meta size" data-label="Size">' + formatSize(entry.size) + '</div>' +
        '<div class="meta modified" data-label="Modified">' + escapeHtml(modified) + '</div>' +
      '</a>';
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function escapeAttribute(value) {
      return escapeHtml(value);
    }

    search.addEventListener("input", render);
    sortButtons.forEach((button) => {
      button.addEventListener("click", () => {
        sortKey = button.dataset.sort;
        sortButtons.forEach((option) => {
          option.setAttribute("aria-pressed", String(option === button));
        });
        render();
      });
    });
    direction.addEventListener("click", () => {
      ascending = !ascending;
      direction.textContent = ascending ? "Asc" : "Desc";
      render();
    });

    render();
  </script>
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
