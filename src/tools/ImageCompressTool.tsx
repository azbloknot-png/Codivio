import { useCallback, useState, type ChangeEvent } from "react";
import { AlertTriangle, Check, Download, Info, Upload } from "lucide-react";
import { compressImage, ImageCompressError, FORMAT_MIME_TYPES, type ImageCompressResult } from "../lib/image-engine";
import { detectImageFormat } from "../../shared/image/format";
import { downloadBytesAsFile } from "../lib/download-file";
import { formatFileSize } from "../lib/format";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import type { ImageFileInput, ImageFormat } from "../../shared/image/types";

/**
 * Phase 6.3 — the second real Image tool, built on the same Phase 6.1
 * shared foundation and Phase 6.2 src/lib/image-engine.ts as Image Resize:
 * entirely client-side, lazy-loaded from ToolPage.tsx so this file never
 * reaches the main bundle or any other tool page.
 *
 * Compression results are inherently unpredictable (unlike Resize, which is
 * deterministic): src/lib/image-engine.ts#compressImage never promises a
 * fixed percentage and never returns a file larger than the original — for
 * PNG input specifically (no lossy quality knob exists in the real Canvas
 * encoding spec), "no reduction possible" is a genuine, expected, honestly
 * reported outcome, never a fabricated success.
 */

const TOOL_SLUG = "image-compress";

function outputFilename(originalName: string, format: ImageFormat): string {
  const base = originalName.replace(/\.[^./]+$/, "");
  const extension = format === "jpeg" ? "jpg" : format;
  return `${base}-compressed.${extension}`;
}

function ImageCompressTool() {
  const [file, setFile] = useState<ImageFileInput | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [isCompressing, setIsCompressing] = useState(false);
  const [compressErrors, setCompressErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImageCompressResult | null>(null);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;

    setFile(null);
    setFileErrors([]);
    setCompressErrors([]);
    setResult(null);

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const fileInput: ImageFileInput = { name: selected.name, size: selected.size, bytes };

    // The same shared/image/format.ts check every Image tool uses — never a
    // bespoke per-tool check. The real, authoritative decode happens inside
    // compressImage itself once the user presses "Compress".
    if (fileInput.size === 0 || fileInput.bytes.length === 0) {
      setFileErrors([`"${fileInput.name}" is empty.`]);
      return;
    }
    if (!detectImageFormat(fileInput.bytes)) {
      setFileErrors([`"${fileInput.name}" does not look like a supported image (JPEG, PNG, or WebP).`]);
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
      const compressResult = await compressImage(file);
      setResult(compressResult);
      trackToolComplete(TOOL_SLUG);
    } catch (error) {
      if (error instanceof ImageCompressError) {
        setCompressErrors([error.message]);
      } else {
        setCompressErrors(["Something went wrong while compressing the image. Please try again."]);
      }
    } finally {
      setIsCompressing(false);
    }
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!file || !result) return;
    downloadBytesAsFile(result.bytes, outputFilename(file.name, result.format), FORMAT_MIME_TYPES[result.format]);
    trackDownload(TOOL_SLUG, result.format);
  }, [file, result]);

  const reductionPercent =
    result && result.reduced ? Math.round((1 - result.outputSize / result.originalSize) * 100) : null;

  return (
    <div className="image-compress">
      <div className="pdf-split-upload">
        <label className="primary-button pdf-split-upload-label" htmlFor="image-compress-file-input">
          <Upload size={16} aria-hidden="true" />
          Choose an image
        </label>
        <input
          id="image-compress-file-input"
          className="pdf-split-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void handleFileSelected(event)}
        />
        <p className="pdf-merge-hint">
          Select a JPEG, PNG, or WebP image to compress. Results vary by content — photos typically shrink the most;
          already-optimized images or PNGs may see little or no change.
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
              {isCompressing ? "Compressing…" : "Compress image"}
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
              This image is already efficiently compressed — no further reduction was possible. The original file is
              ready to download unchanged.
            </p>
          )}
          <button type="button" className="primary-button" onClick={handleDownload}>
            <Download size={16} aria-hidden="true" />
            Download {result.reduced ? "compressed" : "original"} image
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageCompressTool;
