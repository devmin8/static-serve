// Warm "paper" brand mark matching the theme (theme.ts): espresso tile, amber folder
// outline, gold divider. The PNG below is a 32x32 raster of this same SVG, kept in
// sync so the tab icon reads consistently across SVG-capable and older browsers.
const FAVICON_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACPTkDJAAADFElEQVRYCe1XS0wTURQ9M+3Q32AFahPAXwlCUhNxAdEQ/CSGsEBWutClkroxxMQYt7L3F8MOAy5caKILI2oAY2JJJFEwkYUmKKEVQWI/ChQK7UDr3Mq0w9CHBS114U2amXffuefcd/vmzVwuLhuWLRgIoLPjNp739MDj8SAcnlOm/uhqNlvgcDhQ39CAs80uFNlsST5OSeDpky5cvNCC2dnZ5GQ2bkRRxI1bbWg83pSgTyRA4ueaz2RDj8nZ3nEnkQQX8PvjtQeqs75ybSZUif7Xg9DZigpa+9xu7XzWx9FoFAajAbr4otTq9/uzLphOIDQTAle+e2f8b+32dCJr+ejp0P9O3CBwOFIporRQgI7nVvB5/FG8eB9a4VvPgLT1awVUFhtw7XQp7FuEtLCYfIRIi3H0DW/80eVK7EXJg0itYpRX/qDFkRAf8UUxMDoPKZaCFlv1qN8rIhyJwdU5hpFvEXV4xvfMChyWy04rJ/Hzdyeh0l5BTklcl6vU9W466V+SwRPfJbjlykSkVNJJgOqGmQD952S0cpb4zd4gSgsEOEsMcB1NHa8Kv29GwqV7ExieZFeHmYCy4dRlV4iVq7QEXHnkQ1NVPqDan4K8WWvKTCi35yX20Mk2D7MSzATyBB6S0QRnBY9TJrOimfYqabw07vsK5NsMKLSb0LDPisdvpzSoX0NmAmW7rJAsFjgr6Zc2NiMnJVO337b+BEY/T+NguYih8QiGvixkJKYFVe0womq7Ad6x1AbVYpgViEoxCAvz+PBxCvf72QRaQvVYqLWi2rYVxMUynjWxWf7/Cfy7FZiTz3iybaJuw9tBiVW40hExKzA4Gk7gjzlF1O0xQ89ErqYl7KEKMyiWbGCZazVSPkBZb0MCX26040RNQbq4jH0P3/zA1Wc+Jl6XbzG3smZffZpDaH5JfuHkQTTy4DnVgc8Kkv30NhwPSuhwB9D+MrgGUq5Arj/JeOpYcmWkzVO7lCsj7Zw3Jjw1itSrbbaRJmknnm5qFKlXo3Yp20YaSl9IWsnumAZKe97b3Q2v17sp7flP1XAfGdE28HwAAAAASUVORK5CYII=";

export const FAVICON_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
  '<rect width="64" height="64" rx="14" fill="#1a1613"/>',
  '<path d="M15 23a6 6 0 0 1 6-6h9l5 6h8a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H21a6 6 0 0 1-6-6V23Z" fill="#28221b" stroke="#e3963a" stroke-width="4"/>',
  '<path d="M15 29h34" stroke="#d9a94e" stroke-width="4" stroke-linecap="round"/>',
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
