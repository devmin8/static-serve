// The directory-listing stylesheet. Colour and type come from the shared token layer
// (theme.ts); this file is component styling only, so the listing re-lights with the
// global light/dark toggle. Includes the route loader shown when a markdown file is
// clicked and rendered on the server.
export const DIRECTORY_STYLES = `
    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
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
      background: var(--surface-2);
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
      background: var(--surface-2);
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
      box-shadow: 0 0 0 2px var(--focus-ring), var(--shadow-control);
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
      box-shadow: var(--shadow-soft), inset 0 0 0 1px var(--accent-ring);
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
      box-shadow: var(--shadow-soft), inset 0 0 0 1px var(--accent-ring);
    }

    .panel {
      overflow: hidden;
      border-radius: 8px;
      background: var(--surface-2);
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
      background: var(--header-bg);
      font-size: 0.7rem;
      font-weight: 580;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 -1px 0 var(--line-soft) inset;
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
      background: var(--row-hover);
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
      background: var(--folder-soft);
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
      background: var(--accent-soft);
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

    /* Route loader: shown while a clicked markdown file renders on the server. */
    .route-loader {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(26, 22, 19, 0.6);
      backdrop-filter: blur(3px);
    }
    /* Shown instantly (no fade) so the forced paint before navigation is visible. */
    .route-loader.show { display: flex; }
    .route-loader__card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      padding: 26px 30px;
      border-radius: 12px;
      background: var(--surface-2);
      box-shadow: var(--shadow);
    }
    .route-loader__spinner {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid var(--line-strong);
      border-top-color: var(--accent);
      animation: route-spin 0.7s linear infinite;
    }
    @keyframes route-spin { to { transform: rotate(360deg); } }
    .route-loader__label {
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: 0.84rem;
    }
    .route-loader__file { margin-left: 6px; color: var(--text); }
    @media (prefers-reduced-motion: reduce) {
      .route-loader__spinner { animation-duration: 1.4s; }
    }
`;
