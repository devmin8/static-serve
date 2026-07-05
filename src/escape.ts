// Shared HTML escaping used by every server-rendered page. Kept in one module so
// the directory listing and the markdown renderer can't drift apart on how they
// neutralize untrusted text (file names, headings, titles).
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
