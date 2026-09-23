/**
 * Codivio — small, generic display-formatting helpers (Phase 5.3).
 *
 * Extracted from src/tools/PdfMergeTool.tsx once a second real consumer
 * (src/tools/PdfSplitTool.tsx) needed the exact same file-size formatting —
 * kept here rather than duplicated a second time, matching this project's
 * existing "don't keep two copies of the same small logic" discipline.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
