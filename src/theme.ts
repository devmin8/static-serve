// The single source of truth for colour, type, and elevation across BOTH surfaces
// (the directory listing and rendered markdown). One warm spectrum expressed at two
// lightnesses: light is the cream "paper" theme, dark is a warm espresso — siblings,
// not two unrelated palettes. Every component stylesheet consumes these semantic
// tokens, so a single global toggle re-lights the whole app coherently.
//
// Eye-comfort choices baked in: no glare-white light bg, no near-black + pure-white
// dark (avoids halation), warm hues to cut blue light, amber accent tuned per mode
// to stay above WCAG AA on its background.
export const THEME_TOKENS = `
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
  color-scheme: light;
  --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Warm light — the cream paper surface. */
  --bg: #fbf9f5;
  --surface: #ffffff;
  --surface-2: #fdfbf7;
  --surface-soft: #f3eee4;
  --text: #2c2925;
  --text-soft: #4f4a43;
  --muted: #8a8177;
  --faint: #a89e91;
  --line: #ece5da;
  --line-soft: #f2ede4;
  --line-strong: #ddd2c3;
  --accent: #c0492f;
  --accent-strong: #9d3925;
  --accent-soft: #faf0ea;
  --accent-line: #efcdbf;
  --accent-ring: rgba(192, 73, 47, 0.24);
  --quote-bg: transparent;
  --quote-border: #efcdbf;
  --quote-text: #4f4a43;
  --danger: #b0402c;
  --danger-soft: rgba(176, 64, 44, 0.11);
  --focus: #c0492f;
  --focus-ring: rgba(192, 73, 47, 0.3);
  --amber: #b8791f;
  --amber-soft: #fdf6e9;
  --green: #5f7a3e;
  --green-soft: #f1f4ea;
  --folder: #8a6d2b;
  --folder-soft: rgba(138, 109, 43, 0.1);
  --row-hover: #f6f1e8;
  --header-bg: #f6f1e8;
  --code-bg: #f7f2ea;
  --code-ink: #4a443c;
  --sel: #f6e6cf;
  --shadow: 0 18px 44px rgba(72, 52, 26, 0.1), 0 1px 0 rgba(255, 255, 255, 0.6) inset;
  --shadow-soft: 0 10px 26px rgba(72, 52, 26, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset;
  --shadow-control: 0 1px 2px rgba(72, 52, 26, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04) inset;
  --overlay: rgba(26, 22, 19, 0.6);
}

:root[data-theme="dark"] {
  color-scheme: dark;

  /* Warm dark — espresso, not cold navy; off-white text, not pure white. */
  --bg: #1a1613;
  --surface: #221d18;
  --surface-2: #28221b;
  --surface-soft: #302820;
  --text: #ece4d8;
  --text-soft: #c7bcac;
  --muted: #a3988a;
  --faint: #7a7062;
  --line: rgba(240, 228, 210, 0.1);
  --line-soft: rgba(240, 228, 210, 0.055);
  --line-strong: rgba(240, 228, 210, 0.17);
  --accent: #e3963a;
  --accent-strong: #f2ad5a;
  --accent-soft: rgba(227, 150, 58, 0.15);
  --accent-line: rgba(227, 150, 58, 0.38);
  --accent-ring: rgba(227, 150, 58, 0.3);
  --quote-bg: rgba(227, 150, 58, 0.15);
  --quote-border: #e3963a;
  --quote-text: #c7bcac;
  --danger: #e8996a;
  --danger-soft: rgba(232, 153, 106, 0.13);
  --focus: #f0a94e;
  --focus-ring: rgba(227, 150, 58, 0.45);
  --amber: #e3963a;
  --amber-soft: rgba(227, 150, 58, 0.13);
  --green: #9fb56c;
  --green-soft: rgba(159, 181, 108, 0.15);
  --folder: #d9a94e;
  --folder-soft: rgba(217, 169, 78, 0.14);
  --row-hover: rgba(240, 228, 210, 0.045);
  --header-bg: rgba(0, 0, 0, 0.22);
  --code-bg: #201b15;
  --code-ink: #d8ccbb;
  --sel: rgba(227, 150, 58, 0.3);
  --shadow: 0 18px 48px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255, 240, 220, 0.05) inset;
  --shadow-soft: 0 10px 28px rgba(0, 0, 0, 0.32), 0 1px 0 rgba(255, 240, 220, 0.045) inset;
  --shadow-control: 0 1px 2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 240, 220, 0.05) inset;
  --overlay: rgba(0, 0, 0, 0.58);
}

::selection { background: var(--sel); }

/* Floating theme toggle, shared by both surfaces. */
.theme-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--text-soft);
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}
.theme-toggle:hover { color: var(--accent); border-color: var(--accent-line); }
.theme-toggle:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring), var(--shadow-soft); }
.theme-toggle svg { width: 18px; height: 18px; display: block; }
.theme-toggle .icon-sun { display: none; }
.theme-toggle .icon-moon { display: block; }
:root[data-theme="dark"] .theme-toggle .icon-moon { display: none; }
:root[data-theme="dark"] .theme-toggle .icon-sun { display: block; }
`;

// Rendered once per page, near the top of the toggle-able chrome. The two icons are
// swapped by CSS on the active theme (moon in light → click to go dark; sun in dark).
export const THEME_TOGGLE_HTML = `<button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle color theme" aria-pressed="false">
  <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
  <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
</button>`;

// Inlined in <head> so it runs before first paint (no theme flash). Resolves the
// active theme from an explicit stored choice, else the OS preference, applies it,
// keeps following the OS live until the user makes an explicit choice, and wires the
// toggle. The stored key is shared, so a choice on one surface carries to the other.
export const THEME_INIT_SCRIPT = `(function () {
  var KEY = "static-serve-theme";
  var root = document.documentElement;
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function apply(theme) { root.dataset.theme = theme; }
  apply(stored() || (mq.matches ? "dark" : "light"));
  mq.addEventListener("change", function (e) { if (!stored()) apply(e.matches ? "dark" : "light"); });
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    function sync() {
      var isDark = root.dataset.theme === "dark";
      btn.setAttribute("aria-pressed", String(isDark));
      btn.title = isDark ? "Switch to light theme" : "Switch to dark theme";
    }
    sync();
    btn.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      sync();
    });
  });
})();`;
