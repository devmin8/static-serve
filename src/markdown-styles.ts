// The stylesheet for a rendered markdown document, covering every element marked can
// emit — headings, lists, tables, blockquotes, code, task lists, rules, images,
// definition lists, footnotes — plus the load-in animation and top progress bar.
// Colour/type come from the shared token layer (theme.ts); this file is component
// styling only, so it re-lights automatically with the global light/dark toggle.
export const MARKDOWN_STYLES = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 17px;
  line-height: 1.62;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Thin top progress bar: fills while the browser parses the (often large,
   syntax-highlighted) document, then fades once everything is ready. */
.progress {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10;
  width: 100%;
  height: 2px;
  background: transparent;
}
.progress::before {
  display: block;
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, var(--accent), var(--amber));
  animation: progress-fill 900ms ease-out forwards;
  content: "";
}
body.ready .progress { opacity: 0; transition: opacity 300ms ease 120ms; }
@keyframes progress-fill {
  0% { width: 0; }
  60% { width: 82%; }
  100% { width: 100%; }
}

/* Content eases in so a cold, freshly rendered page doesn't snap into view. */
.doc {
  max-width: 760px;
  margin: 0 auto;
  padding: 60px 26px 128px;
  opacity: 0;
  transform: translateY(6px);
  animation: doc-in 420ms cubic-bezier(0.2, 0.7, 0.2, 1) 40ms forwards;
}
@keyframes doc-in {
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .doc { animation: none; opacity: 1; transform: none; }
  .progress::before { animation: none; width: 100%; }
}

.markdown > :first-child { margin-top: 0; }

h1, h2, h3, h4, h5, h6 {
  color: var(--text);
  font-weight: 600;
  line-height: 1.18;
  letter-spacing: -0.015em;
  scroll-margin-top: 24px;
}
h1 { font-size: 33px; margin: 0 0 16px; letter-spacing: -0.02em; }
h2 { font-size: 23px; margin: 58px 0 6px; padding-top: 30px; border-top: 1px solid var(--line); }
h3 { font-size: 17.5px; margin: 30px 0 8px; }
h4 { font-size: 15.5px; margin: 24px 0 6px; }
h5 { font-size: 14px; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-soft); }
h6 { font-size: 13px; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }

p { margin: 12px 0; }
b, strong { font-weight: 600; color: var(--text); }
em, i { font-style: italic; }
del, s { color: var(--muted); text-decoration-thickness: 1px; }
mark { background: var(--amber-soft); color: var(--text); padding: 0 3px; border-radius: 3px; }
small { font-size: 0.82em; color: var(--muted); }
sub, sup { font-size: 0.72em; }

a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--accent-line);
  transition: border-color 120ms ease, color 120ms ease;
}
a:hover { border-bottom-color: var(--accent); }

hr {
  height: 0;
  margin: 40px 0;
  border: 0;
  border-top: 1px solid var(--line);
}

ul, ol { margin: 12px 0; padding-left: 24px; }
li { margin: 7px 0; color: var(--text-soft); }
li::marker { color: var(--muted); }
li b, li strong { color: var(--text); }
li > ul, li > ol { margin: 6px 0; }

/* GFM task lists — swap the native checkbox for a themed marker. */
li:has(> input[type="checkbox"]) { list-style: none; margin-left: -22px; }
input[type="checkbox"] {
  appearance: none;
  width: 15px;
  height: 15px;
  margin: 0 8px 0 0;
  vertical-align: -2px;
  border: 1.5px solid var(--line-strong);
  border-radius: 4px;
  background: var(--surface);
}
input[type="checkbox"]:checked {
  border-color: var(--green);
  background: var(--green);
}
input[type="checkbox"]:checked::after {
  display: block;
  margin: 1px 0 0 4px;
  width: 4px;
  height: 8px;
  /* Check drawn in the page background colour so it contrasts with the green fill
     in both modes (cream on dark-green, espresso on light-olive). */
  border: solid var(--bg);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  content: "";
}

blockquote {
  margin: 24px 0;
  padding: 14px 20px;
  border-left: 3px solid var(--accent);
  border-radius: 0 10px 10px 0;
  background: var(--accent-soft);
  color: var(--text-soft);
  font-size: 15.5px;
}
blockquote p { margin: 8px 0; }
blockquote > :first-child { margin-top: 0; }
blockquote > :last-child { margin-bottom: 0; }

/* Inline code. Fenced blocks are emitted by Shiki as <pre class="shiki">. */
code {
  font-family: var(--font-mono);
  font-size: 0.82em;
  background: var(--code-bg);
  color: var(--code-ink);
  padding: 1px 6px;
  border-radius: 5px;
}
pre {
  margin: 16px 0;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow-x: auto;
  background: var(--code-bg);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  tab-size: 2;
}
pre code {
  padding: 0;
  background: none;
  font-size: inherit;
  color: inherit;
}
/* Shiki dual-theme output: every span carries both --shiki-light and --shiki-dark
   (defaultColor:false), so we pick the right one per mode. The container background
   comes from --code-bg (a token), so the block re-lights with the toggle too. */
pre.shiki { background: var(--code-bg) !important; }
pre.shiki code { display: block; }
.shiki, .shiki span { color: var(--shiki-light); }
:root[data-theme="dark"] .shiki, :root[data-theme="dark"] .shiki span { color: var(--shiki-dark); }

kbd {
  font-family: var(--font-mono);
  font-size: 0.78em;
  color: var(--text);
  background: var(--surface);
  padding: 2px 7px;
  border: 1px solid var(--line-strong);
  border-bottom-width: 2px;
  border-radius: 6px;
}

table {
  width: 100%;
  margin: 18px 0;
  border-collapse: collapse;
  font-size: 14.5px;
  display: block;
  overflow-x: auto;
}
th, td {
  padding: 10px 13px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--line);
}
th { color: var(--text); font-weight: 600; border-bottom: 1.5px solid var(--line); }
td { color: var(--text-soft); }
td code, th code { font-size: 0.82em; }
tbody tr:hover { background: var(--line-soft); }

img {
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border-radius: 10px;
  border: 1px solid var(--line);
}
figure { margin: 20px 0; }
figcaption { margin-top: 8px; color: var(--muted); font-size: 14px; text-align: center; }

dl { margin: 16px 0; }
dt { font-weight: 600; color: var(--text); margin-top: 12px; }
dd { margin: 4px 0 0 20px; color: var(--text-soft); }

/* Footnotes (via marked-footnote). The extension emits a visually-hidden section
   heading — sr-only keeps it for screen readers without rendering a big h2. */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.footnotes { margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 14.5px; color: var(--muted); }
.footnotes ol { padding-left: 18px; }
.footnotes li { color: var(--muted); }
.footnotes p { margin: 6px 0; }
sup a, [data-footnote-ref], [data-footnote-backref] { border: none; font-weight: 500; }

.doc-footer {
  margin-top: 64px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 13.5px;
  font-family: var(--font-mono);
}
.doc-footer a { color: var(--muted); border: none; }
.doc-footer a:hover { color: var(--accent); }

@media (max-width: 640px) {
  body { font-size: 16px; }
  .doc { padding: 40px 20px 96px; }
  h1 { font-size: 28px; }
  h2 { font-size: 21px; }
}
`;
