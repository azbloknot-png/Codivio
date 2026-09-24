import { useCallback, useState, type ChangeEvent } from "react";
import { AlertTriangle, Check, Download, Info, Upload } from "lucide-react";
import { convertPdfToWord, PdfToWordError, type PdfToWordResult } from "../lib/pdf-to-word-engine";
import { downloadBytesAsFile } from "../lib/download-file";
import { formatFileSize } from "../lib/format";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import { validatePdfFile } from "../../shared/pdf";
import type { PdfFileInput } from "../../shared/pdf";

/**
 * Phase 5.5 — the fourth real PDF tool. Deliberately its own lazy chunk,
 * separate from every other PDF tool: it imports src/lib/pdf-to-word-engine.ts
 * (pdfjs-dist + docx), never src/lib/pdf-engine.ts (pdf-lib) — see that
 * engine file's own header comment for why the two are kept isolated. This
 * means Merge/Split/Compress never download this tool's much heavier
 * payload, and this tool never downloads pdf-lib.
 *
 * Honest product scope, per the approved Phase 5.5 authorization: this
 * extracts real text from a PDF into a real, valid .docx using a disclosed,
 * best-effort heuristic — it is explicitly NOT a full-fidelity "PDF to Word
 * converter." It never claims exact layout, table, or image preservation,
 * and never generates an empty/fake-success .docx for a scanned PDF — that
 * case is honestly refused with an explanation instead.
 */

const TOOL_SLUG = "pdf-to-word";

function outputFilename(originalName: string): string {
  const base = originalName.replace(/\.pdf$/i, "");
  return `${base}.docx`;
}

function PdfToWordTool() {
  const [file, setFile] = useState<PdfFileInput | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [isConverting, setIsConverting] = useState(false);
  const [conversionErrors, setConversionErrors] = useState<string[]>([]);
  const [noExtractableText, setNoExtractableText] = useState<string | null>(null);
  const [result, setResult] = useState<PdfToWordResult | null>(null);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;

    setFile(null);
    setFileErrors([]);
    setConversionErrors([]);
    setNoExtractableText(null);
    setResult(null);

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const fileInput: PdfFileInput = { name: selected.name, size: selected.size, bytes };

    // The same shared/pdf/validate.ts check every PDF tool uses — never a
    // bespoke per-tool check. The real, authoritative parse happens inside
    // convertPdfToWord itself once the user presses "Convert".
    const basicErrors = validatePdfFile(fileInput);
    if (basicErrors.length > 0) {
      setFileErrors(basicErrors.map((error) => error.message));
      return;
    }

    setFile(fileInput);
    trackToolStart(TOOL_SLUG);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setIsConverting(true);
    setConversionErrors([]);
    setNoExtractableText(null);
    setResult(null);
    try {
      const conversionResult = await convertPdfToWord(file);
      setResult(conversionResult);
      trackToolComplete(TOOL_SLUG);
    } catch (error) {
      if (error instanceof PdfToWordError) {
        const scannedError = error.errors.find((item) => item.code === "no_extractable_text");
        if (scannedError) {
          // A real, honest, expected-in-some-cases outcome — not a "something
          // went wrong" failure — so it gets its own info-styled message,
          // never a fabricated success and never a generic red alert.
          setNoExtractableText(scannedError.message);
        } else {
          setConversionErrors(error.errors.map((item) => item.message));
        }
      } else {
        setConversionErrors(["Something went wrong while converting the PDF. Please try again."]);
      }
    } finally {
      setIsConverting(false);
    }
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!file || !result) return;
    downloadBytesAsFile(
      result.bytes,
      outputFilename(file.name),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    trackDownload(TOOL_SLUG, "docx");
  }, [file, result]);

  return (
    <div className="pdf-to-word">
      <div className="pdf-split-upload">
        <label className="primary-button pdf-split-upload-label" htmlFor="pdf-to-word-file-input">
          <Upload size={16} aria-hidden="true" />
          Choose a PDF file
        </label>
        <input
          id="pdf-to-word-file-input"
          className="pdf-split-file-input"
          type="file"
          accept="application/pdf"
          onChange={(event) => void handleFileSelected(event)}
        />
        <p className="pdf-merge-hint">
          Extract text from a PDF into an editable Word document. This does not preserve exact layout, tables, or
          images, and does not support scanned/image-only PDFs.
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
            &quot;{file.name}&quot; — {formatFileSize(file.size)}
          </p>
          <div className="pdf-merge-actions">
            <button type="button" className="primary-button" onClick={() => void handleConvert()} disabled={isConverting}>
              {isConverting ? "Converting…" : "Convert to Word"}
            </button>
          </div>
        </>
      )}

      {conversionErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {conversionErrors.map((message) => (
            <p key={message}>
              <AlertTriangle size={14} aria-hidden="true" /> {message}
            </p>
          ))}
        </div>
      )}

      {noExtractableText && (
        <div className="pdf-merge-result" role="alert">
          <p className="pdf-merge-result-label">
            <Info size={16} aria-hidden="true" />
            {noExtractableText}
          </p>
        </div>
      )}

      {result && (
        <div className="pdf-merge-result">
          <p className="pdf-merge-result-label">
            <Check size={16} aria-hidden="true" />
            Text extracted from {result.pageCount} {result.pageCount === 1 ? "page" : "pages"} into a real, editable
            Word document.
          </p>
          <button type="button" className="primary-button" onClick={handleDownload}>
            <Download size={16} aria-hidden="true" />
            Download Word document
          </button>
        </div>
      )}
    </div>
  );
}

export default PdfToWordTool;
