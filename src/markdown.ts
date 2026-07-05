import { Marked, type Tokens } from "marked";
import markedFootnote from "marked-footnote";
import { bundledLanguages, createHighlighter, type Highlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { escapeHtml } from "./escape";
import { FAVICON_HREF, FAVICON_PNG_HREF } from "./favicon";
import { MARKDOWN_STYLES } from "./markdown-styles";
import { THEME_INIT_SCRIPT, THEME_TOGGLE_HTML, THEME_TOKENS } from "./theme";

// Two Shiki themes on the same warm spectrum as the page: a light "paper" theme and
// a warm-dark theme. We render with both (defaultColor:false) so code blocks carry
// --shiki-light/--shiki-dark and re-light with the global toggle. Scopes are broad —
// cohesive warmth over editor-exact fidelity.
const LIGHT_THEME_NAME = "paper-light";
const DARK_THEME_NAME = "paper-dark";

const PAPER_LIGHT = {
  name: LIGHT_THEME_NAME,
  type: "light" as const,
  colors: { "editor.background": "#f7f2ea", "editor.foreground": "#4a443c" },
  settings: [
    { settings: { foreground: "#4a443c", background: "#f7f2ea" } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#a89b88", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control", "modifier", "variable.language"], settings: { foreground: "#b0402c" } },
    { scope: ["string", "string.quoted", "punctuation.definition.string", "constant.character"], settings: { foreground: "#5f7a3e" } },
    { scope: ["constant.numeric", "constant.language", "constant", "keyword.other.unit"], settings: { foreground: "#9a6b1f" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call", "entity.name.method"], settings: { foreground: "#8a5a2b" } },
    { scope: ["entity.name.type", "support.type", "support.class", "entity.name.class", "entity.other.inherited-class"], settings: { foreground: "#8a5a2b" } },
    { scope: ["entity.name.tag", "punctuation.definition.tag"], settings: { foreground: "#b0402c" } },
    { scope: ["entity.other.attribute-name", "support.type.property-name"], settings: { foreground: "#9a6b1f" } },
    { scope: ["keyword.operator", "punctuation.separator", "punctuation.terminator"], settings: { foreground: "#8a8177" } },
    { scope: ["markup.heading", "markup.bold"], settings: { foreground: "#b0402c", fontStyle: "bold" } },
    { scope: ["markup.inserted"], settings: { foreground: "#5f7a3e" } },
    { scope: ["markup.deleted"], settings: { foreground: "#b0402c" } }
  ]
};

const PAPER_DARK = {
  name: DARK_THEME_NAME,
  type: "dark" as const,
  colors: { "editor.background": "#201b15", "editor.foreground": "#d8ccbb" },
  settings: [
    { settings: { foreground: "#d8ccbb", background: "#201b15" } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#8a7f6d", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control", "modifier", "variable.language"], settings: { foreground: "#e8996a" } },
    { scope: ["string", "string.quoted", "punctuation.definition.string", "constant.character"], settings: { foreground: "#a9bd77" } },
    { scope: ["constant.numeric", "constant.language", "constant", "keyword.other.unit"], settings: { foreground: "#e0b055" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call", "entity.name.method"], settings: { foreground: "#e0a35e" } },
    { scope: ["entity.name.type", "support.type", "support.class", "entity.name.class", "entity.other.inherited-class"], settings: { foreground: "#e0a35e" } },
    { scope: ["entity.name.tag", "punctuation.definition.tag"], settings: { foreground: "#e8996a" } },
    { scope: ["entity.other.attribute-name", "support.type.property-name"], settings: { foreground: "#e0b055" } },
    { scope: ["keyword.operator", "punctuation.separator", "punctuation.terminator"], settings: { foreground: "#b3a894" } },
    { scope: ["markup.heading", "markup.bold"], settings: { foreground: "#e8996a", fontStyle: "bold" } },
    { scope: ["markup.inserted"], settings: { foreground: "#a9bd77" } },
    { scope: ["markup.deleted"], settings: { foreground: "#e8996a" } }
  ]
};

// A small hot set is preloaded when the highlighter first spins up; everything
// else is imported on demand the first time a fenced block requests it, so we
// don't pay to parse ~200 grammars for a document that only uses one.
const PRELOADED_LANGS = ["javascript", "typescript", "tsx", "json", "bash", "html", "css", "markdown"];

let highlighterPromise: Promise<Highlighter> | null = null;

// Created lazily and reused for the process lifetime: the WASM-free JS engine plus
// grammar parsing cost is paid once, on the first markdown request, never at boot.
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [PAPER_LIGHT, PAPER_DARK],
      langs: PRELOADED_LANGS,
      engine: createJavaScriptRegexEngine()
    });
  }
  return highlighterPromise;
}

function normalizeLang(lang: string | undefined): string {
  return (lang ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

// Best-effort load of a grammar. Unknown languages and load failures are swallowed
// so an exotic fence degrades to a plain (still themed) code block instead of a 500.
async function ensureLanguage(highlighter: Highlighter, lang: string | undefined, attempted: Set<string>): Promise<void> {
  const key = normalizeLang(lang);
  if (!key || attempted.has(key) || highlighter.getLoadedLanguages().includes(key)) return;

  attempted.add(key);
  if (!(key in bundledLanguages)) return;

  try {
    await highlighter.loadLanguage(key as keyof typeof bundledLanguages);
  } catch {
    // Grammar failed to load — the block will fall back to plaintext highlighting.
  }
}

function highlightBlock(highlighter: Highlighter, code: string, lang: string | undefined): string {
  const key = normalizeLang(lang);
  const useLang = key && highlighter.getLoadedLanguages().includes(key) ? key : "text";

  try {
    // Dual-theme output: spans carry --shiki-light and --shiki-dark, and the page CSS
    // picks per mode. defaultColor:false means Shiki applies neither inline, so nothing
    // fights the toggle.
    return highlighter.codeToHtml(code, {
      lang: useLang,
      themes: { light: LIGHT_THEME_NAME, dark: DARK_THEME_NAME },
      defaultColor: false
    });
  } catch {
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

type RenderOptions = {
  markdown: string;
  // Fallback document title (typically the file name) used when the markdown has
  // no leading level-1 heading to borrow from.
  fallbackTitle: string;
};

export async function renderMarkdownPage({ markdown, fallbackTitle }: RenderOptions): Promise<string> {
  const highlighter = await getHighlighter();
  const attempted = new Set<string>();

  // A fresh Marked instance per render keeps configuration local — no shared global
  // state to leak highlighter closures between concurrent requests.
  const marked = new Marked({
    gfm: true,
    breaks: false,
    async: true,
    // walkTokens runs before rendering, so we load every needed grammar up front and
    // the synchronous code renderer below can highlight without awaiting.
    walkTokens: async (token) => {
      if (token.type === "code") await ensureLanguage(highlighter, (token as Tokens.Code).lang, attempted);
    },
    renderer: {
      code(token: Tokens.Code): string {
        return highlightBlock(highlighter, token.text, token.lang);
      }
    }
  // GFM proper has no footnotes; this extension adds the [^ref] syntax and emits a
  // .footnotes section (styled in markdown-styles.ts).
  }).use(markedFootnote());

  const body = (await marked.parse(markdown)) as string;
  const title = deriveTitle(markdown) ?? fallbackTitle;
  return pageTemplate(title, body);
}

// Prefer the document's own first level-1 heading as the browser title; it reads
// better than a file name and is what a reader expects in their tab/history.
function deriveTitle(markdown: string): string | undefined {
  const match = markdown.match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/m);
  if (!match) return undefined;
  const cleaned = match[1]
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
  return cleaned || undefined;
}

function pageTemplate(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/png" sizes="32x32" href="${FAVICON_PNG_HREF}">
  <link rel="icon" type="image/svg+xml" href="${FAVICON_HREF}">
  <script>${THEME_INIT_SCRIPT}</script>
  <style>${THEME_TOKENS}${MARKDOWN_STYLES}</style>
</head>
<body>
  <div class="progress" aria-hidden="true"></div>
  ${THEME_TOGGLE_HTML}
  <main class="doc">
    <article class="markdown">${body}</article>
    <footer class="doc-footer">Rendered by <a href="/">static-serve</a></footer>
  </main>
  <script>addEventListener("load", () => document.body.classList.add("ready"));</script>
</body>
</html>`;
}
