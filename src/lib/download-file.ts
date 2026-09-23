/**
 * Codivio — generic, tool-agnostic browser file-download utility (Phase 4.7).
 *
 * Deliberately not QR-specific: any future tool needing a client-side
 * "save this as a file" action (e.g. a future PDF/Image tool) can reuse
 * this unchanged, per Phase 4.7's requirement to avoid duplicating export
 * logic per tool. Never touches a server — the file only ever exists in
 * the browser, and is handed to the OS's own download mechanism via a
 * temporary, invisible anchor element.
 */

/** Triggers a browser download for a URL that is already directly
 * downloadable — either a `data:` URL (e.g. a PNG/JPEG data URL) or an
 * object URL created via `URL.createObjectURL`. Does not create or revoke
 * an object URL itself; see `downloadTextAsFile` for that. */
export function triggerDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Downloads arbitrary text content (e.g. SVG markup) as a file, wrapping
 * it in a `Blob` and revoking the resulting object URL shortly after —
 * long enough for the browser to have started the download. */
export function downloadTextAsFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Downloads arbitrary binary content (e.g. a generated PDF's bytes) as a
 * file — the exact same Blob/object-URL lifecycle as downloadTextAsFile,
 * for binary data instead of text (Phase 5.2, the first non-text/non-image
 * consumer this generic utility's own doc comment anticipated). */
export function downloadBytesAsFile(bytes: Uint8Array, filename: string, mimeType: string): void {
  // `Blob`'s type only accepts a Uint8Array backed by a real `ArrayBuffer`
  // (not the broader `ArrayBufferLike`, which also covers `SharedArrayBuffer`)
  // — `new Uint8Array(bytes)` copies into a fresh, guaranteed-`ArrayBuffer`-
  // backed view, satisfying that regardless of what backed the input.
  const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
