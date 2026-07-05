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

type CalloutKind = "info" | "ok" | "warning" | "danger";

const CALLOUT_KIND_ALIASES: Record<string, CalloutKind> = {
  info: "info",
  note: "info",
  tip: "ok",
  ok: "ok",
  success: "ok",
  check: "ok",
  warn: "warning",
  warning: "warning",
  caution: "warning",
  danger: "danger",
  error: "danger",
  fail: "danger"
};

type ParsedCallout = {
  kind: CalloutKind;
  title: string | undefined;
  tokens: Tokens.Blockquote["tokens"];
};

function parseCallout(token: Tokens.Blockquote): ParsedCallout | undefined {
  const firstToken = token.tokens[0];
  if (!firstToken || firstToken.type !== "paragraph") return undefined;

  const match = firstToken.text.match(/^\[!([a-z]+)\][ \t]*(.*?)(?:\n|$)/i);
  if (!match) return undefined;

  const kind = CALLOUT_KIND_ALIASES[match[1].toLowerCase()];
  if (!kind) return undefined;

  const title = match[2].trim() || undefined;
  const markerLength = match[0].length;
  const paragraph = firstToken as Tokens.Paragraph;
  const paragraphText = paragraph.text.slice(markerLength);

  const inlineTokens = paragraph.tokens.map((inlineToken, index) => {
    if (index !== 0 || inlineToken.type !== "text") return inlineToken;

    const text = inlineToken.text.startsWith(match[0])
      ? inlineToken.text.slice(markerLength)
      : inlineToken.text.replace(/^\[![a-z]+\][ \t]*(.*?)(?:\n|$)/i, "");

    return { ...inlineToken, raw: text, text };
  }).filter((inlineToken) => inlineToken.type !== "text" || inlineToken.text.length > 0);

  const nextTokens = inlineTokens.length === 0 && paragraphText.length === 0
    ? token.tokens.slice(1)
    : [{ ...paragraph, raw: paragraphText, text: paragraphText, tokens: inlineTokens }, ...token.tokens.slice(1)];

  return { kind, title, tokens: nextTokens };
}

function renderCalloutTitle(title: string): string {
  return `<div class="callout-title">${escapeHtml(title)}</div>`;
}

function normalizeLooseHeadingLinks(markdown: string): string {
  return markdown.replace(/(!?\[[^\]\n]+\]\()#([^)#\n]+?)(\))/g, (_match, prefix: string, heading: string, suffix: string) => {
    return `${prefix}#${encodeURIComponent(decodeURIComponentSafe(heading))}${suffix}`;
  });
}

function extractContentsHeadingIds(markdown: string): string[] {
  const match = markdown.match(/\*\*Contents\*\*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (!match) return [];

  return [...match[1].matchAll(/\]\(#([^)#\s]+)\)/g)]
    .map((linkMatch) => normalizeHeadingTarget(linkMatch[1]))
    .filter(Boolean);
}

function slugifyHeading(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "section";
}

function githubStyleSlugifyHeading(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/gu, "-")
    .replace(/^-|-$/g, "");

  return slug || "section";
}

function uniqueSlug(base: string, counts: Map<string, number>): string {
  const count = counts.get(base) ?? 0;
  counts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

function registerHeadingTargets(text: string, id: string, targets: Map<string, string>): void {
  const aliases = new Set([
    id,
    text,
    decodeURIComponentSafe(text),
    slugifyHeading(text),
    githubStyleSlugifyHeading(text)
  ]);

  for (const alias of aliases) {
    const normalized = normalizeHeadingTarget(alias);
    if (normalized && !targets.has(normalized)) targets.set(normalized, id);
  }
}

function normalizeHeadingTarget(value: string): string {
  return slugifyHeading(decodeURIComponentSafe(value.replace(/^#/, "")));
}

function normalizeMarkdownHref(href: string, headingTargets: Map<string, string>): string {
  if (href.startsWith("#")) {
    const target = headingTargets.get(normalizeHeadingTarget(href));
    return `#${target ?? normalizeHeadingTarget(href)}`;
  }

  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return href;

  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const [path, query = ""] = pathAndQuery.split("?", 2);
  const normalizedPath = path.replace(/\.(?:md|markdown)$/i, (extension) => `${extension}`);
  const normalizedHash = hash
    ? `#${headingTargets.get(normalizeHeadingTarget(hash)) ?? normalizeHeadingTarget(hash)}`
    : "";
  const normalizedQuery = query ? `?${query}` : "";

  return `${normalizedPath}${normalizedQuery}${normalizedHash}`;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function renderColumnBlocks(html: string): string {
  return html.replace(/<!--\s*columns:start\s*-->([\s\S]*?)<!--\s*columns:end\s*-->/g, (_match, content: string) => {
    const columns = content.split(/<!--\s*column\s*-->/g).map((column) => column.trim()).filter(Boolean);
    if (columns.length === 0) return "";

    return `<div class="md-columns">\n${columns.map((column) => `<div class="md-column">\n${column}\n</div>`).join("\n")}\n</div>`;
  });
}

function renderFlashcardBlocks(html: string): string {
  const withExplicitBlocks = html.replace(
    /<!--\s*flashcards:start\s*-->([\s\S]*?)<!--\s*flashcards:end\s*-->/g,
    (_match, content: string) => renderFlashcards(content)
  );

  return withExplicitBlocks.replace(
    /(<h2\b[^>]*>(?:(?!<\/h2>)[\s\S])*<\/h2>\n?)((?:<p>(?:(?!<\/p>)[\s\S])*<\/p>\n?){4,})/g,
    (match: string, heading: string, paragraphs: string) => {
      if (!/flash\s*cards?/i.test(stripHtml(heading))) return match;
      return `${heading}${renderFlashcards(paragraphs)}`;
    }
  );
}

function renderFlashcards(content: string): string {
  const items = [
    ...content.matchAll(/<p>([\s\S]*?)<\/p>/g),
    ...content.matchAll(/<li>([\s\S]*?)<\/li>/g)
  ].map((item) => item[1].trim()).filter(Boolean);

  if (items.length === 0) return "";

  return `<div class="md-flashcards">\n${items.map((item) => `<div class="md-flashcard">${formatFlashcardItem(item)}</div>`).join("\n")}\n</div>\n`;
}

function formatFlashcardItem(html: string): string {
  if (/^<(?:strong|b)\b/i.test(html.trim())) return html;

  const labelWordCount = inferFlashcardLabelWordCount(stripHtml(html));
  const tokens = html.trim().split(/(\s+)/);
  let words = 0;
  let splitIndex = tokens.length;

  for (let index = 0; index < tokens.length; index += 1) {
    if (!/\s+/.test(tokens[index])) words += 1;
    if (words === labelWordCount) {
      splitIndex = index + 1;
      break;
    }
  }

  const label = tokens.slice(0, splitIndex).join("").trim();
  const rest = tokens.slice(splitIndex).join("").trimStart();

  return rest ? `<strong>${label}</strong> ${rest}` : `<strong>${label}</strong>`;
}

function inferFlashcardLabelWordCount(text: string): number {
  const words = text.trim().split(/\s+/);
  const [first = "", second = ""] = words;

  if (words.length <= 1) return 1;
  if (second.toLowerCase() === "vs") return 3;
  if (/^\d/.test(first)) return 2;
  if (first === "useEffect") return 2;
  if (/^[A-Z]+$/.test(first) && /^[A-Z]+$/.test(second)) return 2;
  if (/^[a-z]/.test(first)) return 2;
  if (["copy", "closure", "falsy", "join", "primitives", "query"].includes(second.toLowerCase())) return 2;

  return 1;
}

function renderChecklistBlocks(html: string): string {
  const withExplicitBlocks = html.replace(
    /<!--\s*checklist:start\s*-->([\s\S]*?)<!--\s*checklist:end\s*-->/g,
    (_match, content: string) => addListClass(content, "md-checklist")
  );

  return withExplicitBlocks.replace(
    /(<h2\b[^>]*>(?:(?!<\/h2>)[\s\S])*<\/h2>\n?)<ul>/g,
    (match: string, heading: string) => {
      if (!/checklist/i.test(stripHtml(heading))) return match;
      return `${heading}<ul class="md-checklist">`;
    }
  );
}

function addListClass(html: string, className: string): string {
  return html.replace(/<ul>/, `<ul class="${className}">`);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function renderSemanticBlocks(html: string): string {
  return renderChecklistBlocks(renderFlashcardBlocks(renderColumnBlocks(html)));
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
  const headingCounts = new Map<string, number>();
  const headingIds = new WeakMap<Tokens.Heading, string>();
  const headingTargets = new Map<string, string>();
  const contentsHeadingIds = extractContentsHeadingIds(markdown);
  let nextContentsHeadingId = 0;

  // A fresh Marked instance per render keeps configuration local — no shared global
  // state to leak highlighter closures between concurrent requests.
  // TODO: raw inline/block HTML passes through unsanitized (fine for local, trusted
  // notes — and relied on for inline <mark>/<kbd>/<sub>/<sup> emphasis). If this ever
  // serves untrusted Markdown, sanitize the output (e.g. DOMPurify) before returning.
  const marked = new Marked({
    gfm: true,
    breaks: false,
    async: true,
    hooks: {
      preprocess(markdown) {
        return normalizeLooseHeadingLinks(markdown);
      }
    },
    // walkTokens runs before rendering, so we load every needed grammar up front and
    // the synchronous code renderer below can highlight without awaiting.
    walkTokens: async (token) => {
      if (token.type === "heading") {
        const heading = token as Tokens.Heading;
        const preferredId = heading.depth === 2 ? contentsHeadingIds[nextContentsHeadingId++] : undefined;
        const id = uniqueSlug(preferredId ?? slugifyHeading(heading.text), headingCounts);
        headingIds.set(heading, id);
        registerHeadingTargets(heading.text, id, headingTargets);
      }

      if (token.type === "code") await ensureLanguage(highlighter, (token as Tokens.Code).lang, attempted);
    },
    renderer: {
      code(token: Tokens.Code): string {
        return highlightBlock(highlighter, token.text, token.lang);
      },
      heading(this: { parser: { parseInline(tokens: Tokens.Heading["tokens"]): string } }, token: Tokens.Heading): string {
        const text = this.parser.parseInline(token.tokens);
        const id = headingIds.get(token) ?? slugifyHeading(token.text);
        return `<h${token.depth} id="${escapeAttribute(id)}">${text}</h${token.depth}>\n`;
      },
      blockquote(this: { parser: { parse(tokens: Tokens.Blockquote["tokens"]): string } }, token: Tokens.Blockquote): string {
        const callout = parseCallout(token);

        if (!callout) {
          return `<blockquote>\n${this.parser.parse(token.tokens)}</blockquote>\n`;
        }

        return `<blockquote class="callout callout-${callout.kind}">\n${callout.title ? renderCalloutTitle(callout.title) : ""}${this.parser.parse(callout.tokens)}</blockquote>\n`;
      },
      link(this: { parser: { parseInline(tokens: Tokens.Link["tokens"]): string } }, token: Tokens.Link): string {
        const text = this.parser.parseInline(token.tokens);
        const href = normalizeMarkdownHref(token.href, headingTargets);
        const title = token.title ? ` title="${escapeAttribute(token.title)}"` : "";
        return `<a href="${escapeAttribute(href)}"${title}>${text}</a>`;
      },
      image(this: { parser: { parseInline(tokens: Tokens.Image["tokens"]): string } }, token: Tokens.Image): string {
        const src = normalizeMarkdownHref(token.href, headingTargets);
        const title = token.title ? ` title="${escapeAttribute(token.title)}"` : "";
        return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(token.text)}"${title}>`;
      }
    }
  // GFM proper has no footnotes; this extension adds the [^ref] syntax and emits a
  // .footnotes section (styled in markdown-styles.ts).
  }).use(markedFootnote());

  const body = renderSemanticBlocks((await marked.parse(markdown)) as string);
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
