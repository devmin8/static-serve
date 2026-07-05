const FAVICON_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAXUlEQVR4nGPg4OT+P5CYYdQBoyEwGgKDPgTCj2/Di0cdQLMQIBT0pGKyHCAuKU/QYJAaQpgiB1ADD10H5NX8pwoedcDQTQOjDhgNgQGtC+iFRx0wGgKjIcAw0NkQALi6ijKv91cbAAAAAElFTkSuQmCC";

export const FAVICON_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
  '<rect width="64" height="64" rx="14" fill="#08090b"/>',
  '<path d="M15 23a6 6 0 0 1 6-6h9l5 6h8a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H21a6 6 0 0 1-6-6V23Z" fill="#17191f" stroke="#57c7b6" stroke-width="4"/>',
  '<path d="M15 29h34" stroke="#6e7cff" stroke-width="4" stroke-linecap="round"/>',
  "</svg>"
].join("");

export const FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`;
export const FAVICON_PNG_HREF = `data:image/png;base64,${FAVICON_PNG_BASE64}`;

const FAVICON_PNG_BYTES: Uint8Array<ArrayBuffer> = Uint8Array.from(
  atob(FAVICON_PNG_BASE64),
  (char) => char.charCodeAt(0)
);

export const DEFAULT_FAVICON_ICO_BYTES = createIcoFromPng(FAVICON_PNG_BYTES, 32, 32);

function createIcoFromPng(png: Uint8Array<ArrayBuffer>, width: number, height: number): Uint8Array<ArrayBuffer> {
  const headerSize = 22;
  const bytes = new Uint8Array(headerSize + png.length);
  const view = new DataView(bytes.buffer);

  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  bytes[6] = width === 256 ? 0 : width;
  bytes[7] = height === 256 ? 0 : height;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, png.length, true);
  view.setUint32(18, headerSize, true);
  bytes.set(png, headerSize);

  return bytes;
}
