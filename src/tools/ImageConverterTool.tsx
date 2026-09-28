import { useCallback, useState, type ChangeEvent } from "react";
import { AlertTriangle, Check, Download, Upload } from "lucide-react";
import {
  convertImage,
  shouldCompositeWhiteBackground,
  ImageConvertError,
  FORMAT_MIME_TYPES,
  type ImageConvertResult,
} from "../lib/image-engine";
import { detectImageFormat } from "../../shared/image/format";
import { downloadBytesAsFile } from "../lib/download-file";
import { formatFileSize } from "../lib/format";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import type { ImageFileInput, ImageFormat } from "../../shared/image/types";

/**
 * Phase 6.4 — the third real Image tool, built on the same Phase 6.1 shared
 * foundation and Phase 6.2/6.3 src/lib/image-engine.ts as Resize/Compress:
 * entirely client-side, lazy-loaded from ToolPage.tsx so this file never
 * reaches the main bundle or any other tool page.
 *
 * Scope: the generic "image-converter" tool only — a single source file,
 * any of JPEG/PNG/WebP to a different one of the three. Never dimensions
 * (Resize's job), never a quality control (Compress's job), never a claim
 * of metadata/EXIF preservation (the Canvas pipeline has none to preserve).
 * The three dedicated single-purpose registry tools (jpg-to-png,
 * png-to-jpg, webp-converter) are explicitly out of this sub-phase's scope
 * and remain "coming soon".
 */

const TOOL_SLUG = "image-converter";

const CONVERTIBLE_FORMATS: ImageFormat[] = ["jpeg", "png", "webp"];
const FORMAT_LABELS: Record<ImageFormat, string> = { jpeg: "JPG", png: "PNG", webp: "WebP" };
const FORMAT_EXTENSIONS: Record<ImageFormat, string> = { jpeg: "jpg", png: "png", webp: "webp" };

function outputFilename(originalName: string, format: ImageFormat): string {
  const base = originalName.replace(/\.[^./]+$/, "");
  return `${base}.${FORMAT_EXTENSIONS[format]}`;
}

function ImageConverterTool() {
  const [file, setFile] = useState<ImageFileInput | null>(null);
  const [sourceFormat, setSourceFormat] = useState<ImageFormat | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [targetFormat, setTargetFormat] = useState<ImageFormat | "">("");

  const [isConverting, setIsConverting] = useState(false);
  const [convertErrors, setConvertErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImageConvertResult | null>(null);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;

    setFile(null);
    setSourceFormat(null);
    setFileErrors([]);
    setTargetFormat("");
    setConvertErrors([]);
    setResult(null);

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const fileInput: ImageFileInput = { name: selected.name, size: selected.size, bytes };

    // The same shared/image/format.ts check every Image tool uses — never a
    // bespoke per-tool check. The real, authoritative decode happens inside
    // convertImage itself once the user presses "Convert".
    if (fileInput.size === 0 || fileInput.bytes.length === 0) {
      setFileErrors([`"${fileInput.name}" is empty.`]);
      return;
    }
    const detected = detectImageFormat(fileInput.bytes);
    if (!detected) {
      setFileErrors([`"${fileInput.name}" does not look like a supported image (JPEG, PNG, or WebP).`]);
      return;
    }

    setFile(fileInput);
    setSourceFormat(detected);
    trackToolStart(TOOL_SLUG);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file || !targetFormat) return;

    setIsConverting(true);
    setConvertErrors([]);
    setResult(null);
    try {
      const convertResult = await convertImage(file, targetFormat);
      setResult(convertResult);
      trackToolComplete(TOOL_SLUG);
    } catch (error) {
      if (error instanceof ImageConvertError) {
        setConvertErrors([error.message]);
      } else {
        setConvertErrors(["Something went wrong while converting the image. Please try again."]);
      }
    } finally {
      setIsConverting(false);
    }
  }, [file, targetFormat]);

  const handleDownload = useCallback(() => {
    if (!file || !result) return;
    downloadBytesAsFile(result.bytes, outputFilename(file.name, result.format), FORMAT_MIME_TYPES[result.format]);
    trackDownload(TOOL_SLUG, result.format);
  }, [file, result]);

  const availableTargetFormats = sourceFormat ? CONVERTIBLE_FORMATS.filter((format) => format !== sourceFormat) : [];

  return (
    <div className="image-converter">
      <div className="pdf-split-upload">
        <label className="primary-button pdf-split-upload-label" htmlFor="image-converter-file-input">
          <Upload size={16} aria-hidden="true" />
          Choose an image
        </label>
        <input
          id="image-converter-file-input"
          className="pdf-split-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void handleFileSelected(event)}
        />
        <p className="pdf-merge-hint">
          Select a JPEG, PNG, or WebP image, then choose a different format to convert it to.
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

      {file && sourceFormat && (
        <>
          <p className="pdf-split-page-count">
            &quot;{file.name}&quot; — {FORMAT_LABELS[sourceFormat]}, {formatFileSize(file.size)}
          </p>

          <label className="qr-generator-field" htmlFor="image-converter-target-format">
            Convert to
            <select
              id="image-converter-target-format"
              value={targetFormat}
              onChange={(event) => setTargetFormat(event.target.value as ImageFormat)}
            >
              <option value="">Choose a format</option>
              {availableTargetFormats.map((format) => (
                <option key={format} value={format}>
                  {FORMAT_LABELS[format]}
                </option>
              ))}
            </select>
          </label>

          {targetFormat && shouldCompositeWhiteBackground(targetFormat) && (
            <p className="pdf-merge-hint">
              Converting to JPG replaces transparency with a white background, since JPG does not support
              transparency.
            </p>
          )}

          <div className="pdf-merge-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleConvert()}
              disabled={!targetFormat || isConverting}
            >
              {isConverting ? "Converting…" : "Convert image"}
            </button>
          </div>
        </>
      )}

      {convertErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {convertErrors.map((message) => (
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
            Converted from {FORMAT_LABELS[result.sourceFormat]} to {FORMAT_LABELS[result.format]} (
            {formatFileSize(result.bytes.length)}).
          </p>
          <button type="button" className="primary-button" onClick={handleDownload}>
            <Download size={16} aria-hidden="true" />
            Download converted image
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageConverterTool;
