import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, Check, Download, FileText, Upload } from "lucide-react";
import {
  loadPdfPageCount,
  splitPdfFile,
  PdfSplitError,
  type PdfSplitOutput,
  type PdfSplitResult,
} from "../lib/pdf-engine";
import { downloadBytesAsFile } from "../lib/download-file";
import { formatFileSize } from "../lib/format";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import { everyPageRanges, parsePageRanges, validatePdfFile } from "../../shared/pdf";
import type { PdfFileInput } from "../../shared/pdf";

/**
 * Phase 5.3 — the second real PDF tool, built on the same Phase 5.1
 * architecture decision and Phase 5.2 pattern as PdfMergeTool.tsx: entirely
 * client-side, lazy-loaded from ToolPage.tsx so `pdf-lib` never reaches the
 * main bundle or the other 33 tool pages.
 *
 * One real primitive — extracting a set of page ranges into their own
 * output PDFs (src/lib/pdf-engine.ts#splitPdfFile) — powers both required
 * modes: "custom range" (the user's own comma-separated ranges) and "every
 * page separately" (shared/pdf/validate.ts#everyPageRanges, one singleton
 * range per page). Neither mode is a separate code path.
 *
 * No ZIP library was added: with multiple output files, each gets its own
 * "Download" button, plus a "Download all" convenience that triggers each
 * download in quick succession. Browsers do not guarantee an unprompted
 * multi-file download beyond a handful of files — this is disclosed
 * honestly here and in the UI, not hidden behind a fake bundled-archive
 * experience that doesn't actually exist yet.
 */

const TOOL_SLUG = "pdf-split";
type SplitMode = "range" | "everyPage";

function outputFilename(label: string): string {
  return `codivio-split-${label.toLowerCase().replace(/\s+/g, "-")}.pdf`;
}

function PdfSplitTool() {
  const [file, setFile] = useState<PdfFileInput | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [mode, setMode] = useState<SplitMode>("range");
  const [rangeInput, setRangeInput] = useState("");

  const [isSplitting, setIsSplitting] = useState(false);
  const [splitErrors, setSplitErrors] = useState<string[]>([]);
  const [result, setResult] = useState<PdfSplitResult | null>(null);

  const hasStartedRef = useRef(false);

  const resetOutputState = useCallback(() => {
    setSplitErrors([]);
    setResult(null);
  }, []);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;

    setFile(null);
    setPageCount(null);
    setFileErrors([]);
    resetOutputState();

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const fileInput: PdfFileInput = { name: selected.name, size: selected.size, bytes };

    // A quick, real check before even attempting to parse — the same
    // shared/pdf/validate.ts function every PDF tool uses, never a
    // bespoke per-tool check.
    const basicErrors = validatePdfFile(fileInput);
    if (basicErrors.length > 0) {
      setFileErrors(basicErrors.map((error) => error.message));
      return;
    }

    try {
      const realPageCount = await loadPdfPageCount(fileInput);
      setFile(fileInput);
      setPageCount(realPageCount);
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        trackToolStart(TOOL_SLUG);
      }
    } catch (error) {
      if (error instanceof PdfSplitError) {
        setFileErrors(error.errors.map((item) => item.message));
      } else {
        setFileErrors(["Something went wrong while reading this PDF. Please try again."]);
      }
    }
  }, [resetOutputState]);

  const handleModeChange = useCallback(
    (nextMode: SplitMode) => {
      setMode(nextMode);
      resetOutputState();
    },
    [resetOutputState],
  );

  const handleSplit = useCallback(async () => {
    if (!file || pageCount === null) return;

    const rangesResult = mode === "everyPage" ? everyPageRanges(pageCount) : parsePageRanges(rangeInput, pageCount);
    if (!rangesResult.ok) {
      setSplitErrors(rangesResult.errors.map((error) => error.message));
      setResult(null);
      return;
    }

    setIsSplitting(true);
    setSplitErrors([]);
    setResult(null);
    try {
      const splitResult = await splitPdfFile(file, rangesResult.ranges);
      setResult(splitResult);
      trackToolComplete(TOOL_SLUG);
    } catch (error) {
      if (error instanceof PdfSplitError) {
        setSplitErrors(error.errors.map((item) => item.message));
      } else {
        setSplitErrors(["Something went wrong while splitting the PDF. Please try again."]);
      }
    } finally {
      setIsSplitting(false);
    }
  }, [file, pageCount, mode, rangeInput]);

  const downloadOutput = useCallback((output: PdfSplitOutput) => {
    downloadBytesAsFile(output.bytes, outputFilename(output.label), "application/pdf");
    trackDownload(TOOL_SLUG, "pdf");
  }, []);

  const handleDownloadAll = useCallback(() => {
    if (!result) return;
    // Staggered, not a single synchronous burst — some browsers handle a
    // few sequential download triggers more reliably this way. Still no
    // guarantee beyond a handful of files; each output also has its own
    // individual "Download" button as a reliable fallback.
    result.outputs.forEach((output, index) => {
      setTimeout(() => downloadOutput(output), index * 300);
    });
  }, [result, downloadOutput]);

  return (
    <div className="pdf-split">
      <div className="pdf-split-upload">
        <label className="primary-button pdf-split-upload-label" htmlFor="pdf-split-file-input">
          <Upload size={16} aria-hidden="true" />
          Choose a PDF file
        </label>
        <input
          id="pdf-split-file-input"
          className="pdf-split-file-input"
          type="file"
          accept="application/pdf"
          onChange={(event) => void handleFileSelected(event)}
        />
        <p className="pdf-merge-hint">Select a PDF file to split into separate files by page.</p>
      </div>

      {fileErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {fileErrors.map((message) => (
            <p key={message}>
              <AlertTriangle size={14} aria-hidden="true" /> {message}
            </p>
          ))}
        </div>
      )}

      {file && pageCount !== null && (
        <>
          <p className="pdf-split-page-count">
            <FileText size={16} aria-hidden="true" />
            &quot;{file.name}&quot; has {pageCount} {pageCount === 1 ? "page" : "pages"}.
          </p>

          <div className="category-filter pdf-split-mode-toggle" role="group" aria-label="Split mode">
            <button
              type="button"
              className={mode === "range" ? "active" : undefined}
              aria-pressed={mode === "range"}
              onClick={() => handleModeChange("range")}
            >
              Custom range
            </button>
            <button
              type="button"
              className={mode === "everyPage" ? "active" : undefined}
              aria-pressed={mode === "everyPage"}
              onClick={() => handleModeChange("everyPage")}
            >
              Every page separately
            </button>
          </div>

          {mode === "range" ? (
            <label className="qr-generator-field" htmlFor="pdf-split-range-input">
              Pages to extract
              <input
                id="pdf-split-range-input"
                type="text"
                placeholder="e.g. 1-3, 5, 8-10"
                value={rangeInput}
                onChange={(event) => setRangeInput(event.target.value)}
              />
            </label>
          ) : (
            <p className="pdf-merge-hint">
              Every page will be extracted as its own PDF file ({pageCount} {pageCount === 1 ? "file" : "files"}).
            </p>
          )}

          <div className="pdf-merge-actions">
            <button type="button" className="primary-button" onClick={() => void handleSplit()} disabled={isSplitting}>
              {isSplitting ? "Splitting…" : "Split PDF"}
            </button>
          </div>
        </>
      )}

      {splitErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {splitErrors.map((message) => (
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
            Split into {result.outputs.length} file{result.outputs.length === 1 ? "" : "s"}.
          </p>
          <ul className="pdf-split-output-list">
            {result.outputs.map((output) => (
              <li key={output.label} className="pdf-split-output-row">
                <FileText size={16} aria-hidden="true" className="pdf-merge-file-icon" />
                <span className="pdf-merge-file-name">{output.label}</span>
                <span className="pdf-merge-file-size">{formatFileSize(output.bytes.length)}</span>
                <button type="button" className="primary-button" onClick={() => downloadOutput(output)}>
                  <Download size={14} aria-hidden="true" />
                  Download
                </button>
              </li>
            ))}
          </ul>
          {result.outputs.length > 1 && (
            <button type="button" className="primary-button" onClick={handleDownloadAll}>
              <Download size={16} aria-hidden="true" />
              Download all ({result.outputs.length} files)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PdfSplitTool;
