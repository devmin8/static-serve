// Client-side behaviour for the directory listing: search, sort, and rendering the
// rows from the JSON payload the server inlines. Also intercepts clicks on markdown
// files to show a route loader while the server renders them. Shipped as a string
// and inlined into the page; it runs in the browser, not in Bun.
export const DIRECTORY_CLIENT = `
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


    const routeLoader = document.querySelector("#route-loader");
    const routeLoaderFile = routeLoader.querySelector(".route-loader__file");

    function isMarkdownHref(href) {
      try {
        return /\.(md|markdown)$/i.test(new URL(href, location.href).pathname);
      } catch {
        return false;
      }
    }

    // Markdown pages render on demand, so a click can wait on a cold server render or
    // on the browser parsing a large rendered document. Show the loader immediately,
    // then force two paint frames before navigating — otherwise a fast response can
    // commit the next page before the overlay is ever drawn, and the wait looks stuck.
    listing.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a.row");
      if (!link || !isMarkdownHref(link.href)) return;

      event.preventDefault();
      routeLoaderFile.textContent = decodeURIComponent(link.href.split("/").pop() || "");
      routeLoader.classList.add("show");
      requestAnimationFrame(() => requestAnimationFrame(() => { location.href = link.href; }));
    });

    // Returning via back/forward (bfcache) can restore this page with the loader
    // still up; hide it so the listing isn't stuck behind the overlay.
    addEventListener("pageshow", () => routeLoader.classList.remove("show"));
`;
