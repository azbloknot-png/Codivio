import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, Download, FileText, Trash2, Upload } from "lucide-react";
import { mergePdfFiles, PdfMergeError, type PdfMergeResult } from "../lib/pdf-engine";
import { downloadBytesAsFile } from "../lib/download-file";
import { formatFileSize } from "../lib/format";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import { validatePdfFile, MAX_PDF_FILES_PER_MERGE, MIN_PDF_FILES_PER_MERGE } from "../../shared/pdf";
import type { PdfFileInput } from "../../shared/pdf";

/**
 * Phase 5.2 — the first real PDF tool UI, built on the Phase 5.2 shared PDF
 * engine (src/lib/pdf-engine.ts#mergePdfFiles). Loaded via a dedicated lazy
 * chunk from ToolPage.tsx (only when slug === "pdf-merge") so the `pdf-lib`
 * dependency never reaches the other 33 tool pages or the main bundle —
 * mirrors the exact Phase 4.2 QR Code Generator isolation pattern.
 *
 * Everything happens entirely client-side: files are read via the browser
 * File API, merged in memory by pdf-lib, and handed back to the browser's
 * own download mechanism. No file is ever uploaded, logged, or sent
 * anywhere — matching the "Privacy-focused" / "In-browser by design" claim
 * ToolPage.tsx already makes sitewide, and Phase 5.1's architecture
 * decision that no Phase 5 operation currently in scope needs a server.
 *
 * Scope: merge only — no split/compress/convert here (later sub-phases).
 */

interface PdfMergeFileEntry extends PdfFileInput {
  id: string;
}

const TOOL_SLUG = "pdf-merge";

function PdfMergeTool() {
  const [files, setFiles] = useState<PdfMergeFileEntry[]>([]);
  const [selectionErrors, setSelectionErrors] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeErrors, setMergeErrors] = useState<string[]>([]);
  const [result, setResult] = useState<PdfMergeResult | null>(null);

  const hasStartedRef = useRef(false);
  const nextIdRef = useRef(0);

  const handleFilesSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    // Allows re-selecting the exact same file again later (e.g. after
    // removing it from the list) — the input's own value must be cleared,
    // otherwise a second identical selection fires no change event at all.
    event.target.value = "";
    if (selected.length === 0) return;

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      trackToolStart(TOOL_SLUG);
    }

    setResult(null);
    setMergeErrors([]);

    const newErrors: string[] = [];
    const accepted: PdfMergeFileEntry[] = [];

    for (const file of selected) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fileInput: PdfFileInput = { name: file.name, size: file.size, bytes };
      const errors = validatePdfFile(fileInput);
      if (errors.length > 0) {
        newErrors.push(...errors.map((error) => error.message));
        continue;
      }
      nextIdRef.current += 1;
      accepted.push({ ...fileInput, id: `pdf-${nextIdRef.current}` });
    }

    setFiles((current) => {
      const combined = [...current, ...accepted];
      if (combined.length > MAX_PDF_FILES_PER_MERGE) {
        newErrors.push(
          `A maximum of ${MAX_PDF_FILES_PER_MERGE} files can be merged at once — the extra files were not added.`,
        );
        setSelectionErrors(newErrors);
        return combined.slice(0, MAX_PDF_FILES_PER_MERGE);
      }
      setSelectionErrors(newErrors);
      return combined;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
    setResult(null);
  }, []);

  const moveFile = useCallback((id: string, direction: -1 | 1) => {
    setFiles((current) => {
      const index = current.findIndex((file) => file.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setResult(null);
  }, []);

  const handleMerge = useCallback(async () => {
    setIsMerging(true);
    setMergeErrors([]);
    setResult(null);
    try {
      const merged = await mergePdfFiles(files);
      setResult(merged);
      trackToolComplete(TOOL_SLUG);
    } catch (error) {
      if (error instanceof PdfMergeError) {
        setMergeErrors(error.errors.map((item) => item.message));
      } else {
        setMergeErrors(["Something went wrong while merging the PDF files. Please try again."]);
      }
    } finally {
      setIsMerging(false);
    }
  }, [files]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    downloadBytesAsFile(result.bytes, "codivio-merged.pdf", "application/pdf");
    trackDownload(TOOL_SLUG, "pdf");
  }, [result]);

  const canMerge = files.length >= MIN_PDF_FILES_PER_MERGE && !isMerging;

  return (
    <div className="pdf-merge">
      <div className="pdf-merge-upload">
        <label className="primary-button pdf-merge-upload-label" htmlFor="pdf-merge-file-input">
          <Upload size={16} aria-hidden="true" />
          Add PDF files
        </label>
        <input
          id="pdf-merge-file-input"
          className="pdf-merge-file-input"
          type="file"
          accept="application/pdf"
          multiple
          onChange={(event) => void handleFilesSelected(event)}
        />
        <p className="pdf-merge-hint">
          Select 2 or more PDF files (up to {MAX_PDF_FILES_PER_MERGE}) to combine into one document, in the order you
          choose.
        </p>
      </div>

      {selectionErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {selectionErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="pdf-merge-file-list" aria-label="Files to merge, in order">
          {files.map((file, index) => (
            <li key={file.id} className="pdf-merge-file-row">
              <FileText size={18} aria-hidden="true" className="pdf-merge-file-icon" />
              <span className="pdf-merge-file-name">{file.name}</span>
              <span className="pdf-merge-file-size">{formatFileSize(file.size)}</span>
              <span className="pdf-merge-file-actions">
                <button
                  type="button"
                  aria-label={`Move ${file.name} up`}
                  onClick={() => moveFile(file.id, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${file.name} down`}
                  onClick={() => moveFile(file.id, 1)}
                  disabled={index === files.length - 1}
                >
                  <ArrowDown size={15} aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file.id)}>
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="pdf-merge-actions">
        <button type="button" className="primary-button" onClick={() => void handleMerge()} disabled={!canMerge}>
          {isMerging ? "Merging…" : "Merge PDFs"}
        </button>
        {files.length > 0 && files.length < MIN_PDF_FILES_PER_MERGE && (
          <p className="pdf-merge-hint">Add at least {MIN_PDF_FILES_PER_MERGE} files to merge.</p>
        )}
      </div>

      {mergeErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {mergeErrors.map((message) => (
            <p key={message}>
              <AlertTriangle size={14} aria-hidden="true" /> {message}
            </p>
          ))}
        </div>
      )}

      {result && (
        <div className="pdf-merge-result">
          <p className="pdf-merge-result-label">
            <Check size={16} aria-hidden="true" />
            Merged {files.length} files into one PDF ({result.pageCount} pages,{" "}
            {formatFileSize(result.bytes.length)}).
          </p>
          <button type="button" className="primary-button" onClick={handleDownload}>
            <Download size={16} aria-hidden="true" />
            Download merged PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default PdfMergeTool;
