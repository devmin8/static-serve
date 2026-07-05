# Markdown Authoring Guide

Use this guide when writing Markdown intended for `static-serve`. The renderer is
generic: authors write predictable semantic Markdown, and the server turns those
patterns into the same compact article style used by the `.reference` interview
prep documents.

This guide is the contract. If an agent follows it, the output should render as a
polished article without custom HTML.

## Semantic Vocabulary

Choose the semantic shape before writing content:

- **Kicker**: one plain line before the `#` title.
- **Title**: one `#`.
- **Lede**: first paragraph after the title.
- **Source/context**: optional second paragraph after the lede.
- **Contents**: `**Contents**` paragraph with links to following `##` sections.
- **Section**: `##`.
- **Section note**: italic paragraph immediately after `##`.
- **Compact row / Q&A**: `###` followed by one paragraph.
- **Callout**: `[!info]`, `[!ok]`, `[!warning]`, `[!danger]` blockquote.
- **Soundbite**: plain `>` blockquote.
- **Columns**: `<!-- columns:start -->`, `<!-- column -->`, `<!-- columns:end -->`.
- **Flashcards**: `<!-- flashcards:start -->` block or a `## ... Flashcards` section.
- **Checklist**: `<!-- checklist:start -->` block or a `## ... Checklist` section.
- **Comparison**: Markdown table.
- **Code**: fenced block with a language.
- **Footnote**: `[^ref]` marker with a matching `[^ref]:` definition.
- **Inline emphasis**: bold, italic, `code`, `~~strike~~`, plus small inline
  `<mark>`, `<kbd>`, `<sub>`, `<sup>` tags. See _Inline Emphasis_ below.
- **Closing note**: final plain paragraph.

Do not invent visual classes in Markdown. Pick the closest semantic shape from
this list.

## Document Shape

Use this order for long-form prep notes:

```md
Kicker · Short Context

# Document title

One concise lede paragraph that explains the document.

Optional source/context paragraph. Keep it short.

> [!info] First high-signal note
> One or two sentences with the central framing.

**Contents**
[First section](#first) · [Second section](#second) · [API](#api)

## First Section

_Optional section note._

Section body...
```

The line before the first `#` renders as the small uppercase kicker. The first
paragraph after `#` renders as the lede. A second plain paragraph after the lede
renders as muted source/context text. Keep that source/context line link-free —
if it contains a link it loses the muted styling and reads as a normal paragraph.

## Contents Links

Use a `**Contents**` paragraph for table-of-contents links:

```md
**Contents**
[A little history](#history) · [The real why](#why) · [The API](#api)

## A Little History

## The Real Why

## The API
```

Important: the renderer assigns those `#history`, `#why`, `#api` ids to the
following `##` headings in order. Keep the links and `##` sections in the same
order. If there is no `**Contents**` block, heading ids are generated from the
heading text.

Use short lowercase ids. Prefer `#api`, `#react`, `#state`, `#dayof` over long
generated slugs.

## Sections

Use `##` for major sections.

Use an italic paragraph immediately after `##` for the small muted section note:

```md
## The Real Why

_Strip the jargon — what actually forces this architecture._
```

Wrap the whole line in a single `_..._`. The section-note styling only applies
when italics span the entire paragraph — mixing plain and italic text in that
first line drops it back to a normal paragraph.

Use `###` plus one paragraph for compact Q&A or layer rows:

```md
### What triggers a re-render?

State change, props change, parent re-render, or context value change.
```

Avoid using `###` as a decorative divider. In this renderer, `### + paragraph`
is styled as a compact row with a soft separator.

## Inline Emphasis

These are the expressive inline tools. Reach for them inside sentences to shape
emphasis; do not overuse them, or the emphasis stops meaning anything.

Pure Markdown, use freely:

- `**bold**` — the load-bearing term in a sentence. Renders in full text colour.
- `_italic_` — a lighter aside or a coined term. (Also used structurally for
  section notes, so a whole-line italic right after `##` becomes a section note.)
- `` `code` `` — identifiers, filenames, config keys, exact values.
- `~~strike~~` — retracted, outdated, or "not this" text (GFM strikethrough).

Small inline HTML tags, the one allowed exception to the no-raw-HTML rule:

- `<mark>highlight</mark>` — the single phrase you most want the eye to land on.
  Use at most once or twice per section; it is the loudest inline signal.
- `<kbd>Ctrl</kbd>` — a keyboard key or shortcut.
- `<sub>x</sub>` / `<sup>2</sup>` — subscript and superscript.

```md
Micro-frontends **solve an organizational problem** — the signal is the
<mark>org chart, not the bundle size</mark>. Toggle it with <kbd>Cmd</kbd>+<kbd>K</kbd>.
Prefer `singleton: true`; the ~~one-copy-per-remote~~ default duplicates React.
```

The ban in _What Not To Write_ is on large raw HTML blocks and layout hacks.
These few inline tags are fine because the stylesheet themes them (`mark`, `kbd`,
`sub`, `sup`, `del`) and they carry semantic emphasis, not layout.

## Callouts

Use callouts for boxed, high-signal notes. The marker controls the semantic
treatment.

```md
> [!info] The one-line truth
> Micro-frontends solve an organizational problem, not a performance problem.

> [!ok] Deploy != release
> Ship code dark behind a feature flag.

> [!warning] Caveat
> This adds coordination cost.

> [!danger] Do not do this
> Do not split ownership without a platform team.
```

Supported aliases:

- `info`, `note`
- `ok`, `tip`, `success`, `check`
- `warning`, `warn`, `caution`
- `danger`, `error`, `fail`

Use callouts sparingly: one framing callout near the top, then only where the
reader needs a caveat, verdict, or memorable rule.

## Quotes And Soundbites

Use normal blockquotes for spoken answers, interview scripts, and soundbites.
These render as quote-style blocks, not colored boxes.

```md
> **The why:** "Micro-frontends are an organizational scaling tool, not a
> performance fix."
```

Do not use `[!info]` callouts for every soundbite. Use plain `>` unless the
content is a boxed note.

## Columns

Use columns only for paired content: two-day plans, side-by-side APIs, or
parallel tradeoffs. Columns stay inside the article width; large code blocks
scroll horizontally when needed.

````md
<!-- columns:start -->

### Webpack / Rspack — `@module-federation/enhanced`

```js
new ModuleFederationPlugin({
  name: "shell",
});
```

<!-- column -->

### Vite — `@module-federation/vite`

```js
federation({
  name: "shell",
});
```

<!-- columns:end -->
````

Use exactly two panes — one `<!-- column -->` divider between a start and end
marker. The grid is hard-locked to two columns, so a third pane wraps and breaks
the layout. If you need three-way content, use a table or stacked sections.

Keep column content self-contained. Do not nest `columns` blocks inside other
`columns` blocks. Do not use columns for ordinary prose.

## Flashcards

Use flashcards for dense recall items, quick interview drills, glossary cards,
or memory prompts. They render as a compact two-column scan list.

Best form:

```md
<!-- flashcards:start -->

**7 primitives** string, number, boolean, null, undefined, symbol, bigint.

**React Query** server state; Redux client state.

**ACID** Atomic, Consistent, Isolated, Durable.

<!-- flashcards:end -->
```

For a whole section, this also works — but only with **four or more** cards. The
section form auto-converts a `## ... Flashcards` heading followed by four or more
paragraphs; with fewer, the cards render as ordinary paragraphs. When you have
one to three cards, use the explicit `<!-- flashcards:start -->` block instead,
which has no minimum.

```md
## Rapid Flashcards

**7 primitives** string, number, boolean, null, undefined, symbol, bigint.

**React Query** server state; Redux client state.

**ACID** Atomic, Consistent, Isolated, Durable.

**Closure** a function plus the scope it captured.
```

Always bold the recall label first, then write the answer in plain text. If an
older note omits bold labels, the renderer makes a best-effort guess, but new
Markdown should be explicit.

## Checklists

Use checklists for day-of actions, launch checks, prep checks, review passes, or
other completion-oriented lists. They render as a clean unnumbered checklist.

```md
## Day-Of Checklist

- Re-read the callouts once.
- Warm up by answering three questions aloud.
- Keep the editor ready for a live task.
```

The list must follow the `## ... Checklist` heading directly. An intro paragraph
between the heading and the bullets stops the auto-styling — put any lead-in text
before the heading, or use the explicit block below.

For a checklist that is not under a checklist heading, use an explicit block:

```md
<!-- checklist:start -->

- Verify links.
- Verify headings.
- Verify code blocks.

<!-- checklist:end -->
```

## Code

Use fenced code blocks with a language:

````md
```js
const Cart = lazy(() => import("cart/Widget"));
```
````

Prefer the most specific language available: `js`, `ts`, `tsx`, `sql`, `yaml`,
`bash`, `json`, `html`, `css`, `text`.

Keep code indentation exactly as authored. The renderer handles horizontal
scrolling for long lines.

## Footnotes

Use footnotes for asides and citations that would break the flow inline. They
render as a small superscript link and a muted list at the bottom of the page.

```md
Module Federation shipped in Webpack 5.[^mf]

[^mf]: Released 2020; the runtime was later extracted into MF 2.0.
```

Put the `[^ref]:` definitions anywhere in the document; the renderer collects
them into a single footnotes section at the end. Keep the reference names short.

## Tables

Use normal Markdown tables for compact comparisons.

```md
| Strategy | Best for | Tradeoff |
| --- | --- | --- |
| Trunk-based | Mature CI + flags | Demands discipline |
```

Tables should compare things. Do not use tables for layout.

## Lists

Use bullets for grouped points and ordered lists for sequences.

```md
- **Release bottleneck** — one team's bad deploy blocks everyone.
- **Ownership conflict** — unclear ownership slows changes.
```

Bold the label, then explain the point in plain text. This maps cleanly to the
reference article style.

## Final Note

End long prep documents with one final paragraph. It renders as the muted closing
note.

```md
You've done the real thing already — this is a refresh, not a first encounter.
```

Do not make the final note a callout unless it is truly a warning or rule.

## What Not To Write

- Do not paste large raw HTML blocks (small inline `<mark>`/`<kbd>`/`<sub>`/`<sup>`
  tags are the only exception — see _Inline Emphasis_).
- Do not use visual class names or color words in Markdown.
- Do not lean on `<mark>` for more than a phrase or two per section.
- Do not manually add heading HTML ids; use `**Contents**` links for custom ids.
- Do not use columns to make the whole page wider.
- Do not use callouts for ordinary quoted speech.
- Do not use `###` headings for decorative spacing.
- Do not write flashcards as a long ordinary bullet list when the goal is recall.
- Do not write completion steps as normal prose when a checklist is clearer.
- Do not omit languages from fenced code blocks unless the content is plain text.

## Quick Checklist

- Kicker line before `#` when the document needs context.
- One `#` title.
- One concise lede paragraph.
- Optional source/context paragraph.
- One `**Contents**` block for long documents, with ids matching `##` order.
- `##` for major sections.
- Italic paragraph after `##` for section notes.
- `### + paragraph` for Q&A/layer rows.
- Bold/italic/`code`/`~~strike~~` plus sparing `<mark>`/`<kbd>` for inline emphasis.
- `[!info]`, `[!ok]`, `[!warning]`, `[!danger]` only for boxed notes.
- Plain `>` for quotes and soundbites.
- `<!-- columns:start -->` only for genuine paired content — exactly two panes.
- `<!-- flashcards:start -->` for dense recall cards (or a `## ...Flashcards`
  section with four or more cards).
- `<!-- checklist:start -->` for completion lists outside checklist sections.
- `[^ref]` footnotes for asides and citations.
- Fenced code blocks include languages.
- One final closing paragraph.
