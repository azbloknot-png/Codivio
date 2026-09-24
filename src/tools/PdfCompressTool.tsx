import { useCallback, useState, type ChangeEvent } from "react";
import { AlertTriangle, Check, Download, Info, Upload } from "lucide-react";
import { compressPdfFile, PdfCompressError, type PdfCompressResult } from "../lib/pdf-engine";
import { downloadBytesAsFile } from "../lib/download-file";
import { formatFileSize } from "../lib/format";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import { validatePdfFile } from "../../shared/pdf";
import type { PdfFileInput } from "../../shared/pdf";

/**
 * Phase 5.4 — the third real PDF tool, built on the same Phase 5.1
 * architecture and Phase 5.2/5.3 pattern as PdfMergeTool.tsx/PdfSplitTool.tsx:
 * entirely client-side, lazy-loaded from ToolPage.tsx so `pdf-lib` never
 * reaches the main bundle or the other tool pages.
 *
 * Compression results are inherently unpredictable (unlike Merge/Split,
 * which are deterministic): src/lib/pdf-engine.ts#compressPdfFile never
 * promises a fixed percentage and never returns a file larger than the
 * original. When nothing genuinely shrinks, this UI honestly says so and
 * still offers the (untouched) file for download — never a fake success.
 */

const TOOL_SLUG = "pdf-compress";

function outputFilename(originalName: string): string {
  const base = originalName.replace(/\.pdf$/i, "");
  return `${base}-compressed.pdf`;
}

function PdfCompressTool() {
  const [file, setFile] = useState<PdfFileInput | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [isCompressing, setIsCompressing] = useState(false);
  const [compressErrors, setCompressErrors] = useState<string[]>([]);
  const [result, setResult] = useState<PdfCompressResult | null>(null);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;

    setFile(null);
    setFileErrors([]);
    setCompressErrors([]);
    setResult(null);

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const fileInput: PdfFileInput = { name: selected.name, size: selected.size, bytes };

    // The same shared/pdf/validate.ts check every PDF tool uses — never a
    // bespoke per-tool check. The real, authoritative parse happens inside
    // compressPdfFile itself once the user presses "Compress".
    const basicErrors = validatePdfFile(fileInput);
    if (basicErrors.length > 0) {
      setFileErrors(basicErrors.map((error) => error.message));
      return;
    }

    setFile(fileInput);
    trackToolStart(TOOL_SLUG);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setIsCompressing(true);
    setCompressErrors([]);
    setResult(null);
    try {
      const compressResult = await compressPdfFile(file);
      setResult(compressResult);
      trackToolComplete(TOOL_SLUG);
    } catch (error) {
      if (error instanceof PdfCompressError) {
        setCompressErrors(error.errors.map((item) => item.message));
      } else {
        setCompressErrors(["Something went wrong while compressing the PDF. Please try again."]);
      }
    } finally {
      setIsCompressing(false);
    }
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!file || !result) return;
    downloadBytesAsFile(result.bytes, outputFilename(file.name), "application/pdf");
    trackDownload(TOOL_SLUG, "pdf");
  }, [file, result]);

  const reductionPercent =
    result && result.reduced ? Math.round((1 - result.outputSize / result.originalSize) * 100) : null;

  return (
    <div className="pdf-compress">
      <div className="pdf-split-upload">
        <label className="primary-button pdf-split-upload-label" htmlFor="pdf-compress-file-input">
          <Upload size={16} aria-hidden="true" />
          Choose a PDF file
        </label>
        <input
          id="pdf-compress-file-input"
          className="pdf-split-file-input"
          type="file"
          accept="application/pdf"
          onChange={(event) => void handleFileSelected(event)}
        />
        <p className="pdf-merge-hint">
          Select a PDF file to compress. Results vary by content — scanned or photo-heavy PDFs typically shrink the
          most; already-optimized or text-only PDFs may see little or no change.
        </p>
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

      {file && (
        <>
          <p className="pdf-split-page-count">
            &quot;{file.name}&quot; — original size: {formatFileSize(file.size)}
          </p>
          <div className="pdf-merge-actions">
            <button type="button" className="primary-button" onClick={() => void handleCompress()} disabled={isCompressing}>
              {isCompressing ? "Compressing…" : "Compress PDF"}
            </button>
          </div>
        </>
      )}

      {compressErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {compressErrors.map((message) => (
            <p key={message}>
              <AlertTriangle size={14} aria-hidden="true" /> {message}
            </p>
          ))}
        </div>
      )}

      {result && (
        <div className="pdf-merge-result">
          {result.reduced ? (
            <p className="pdf-merge-result-label">
              <Check size={16} aria-hidden="true" />
              Reduced from {formatFileSize(result.originalSize)} to {formatFileSize(result.outputSize)} (
              {reductionPercent}% smaller).
            </p>
          ) : (
            <p className="pdf-merge-result-label">
              <Info size={16} aria-hidden="true" />
              This PDF is already efficiently compressed — no further reduction was possible. The original file is
              ready to download unchanged.
            </p>
          )}
          <button type="button" className="primary-button" onClick={handleDownload}>
            <Download size={16} aria-hidden="true" />
            Download {result.reduced ? "compressed" : "original"} PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default PdfCompressTool;
