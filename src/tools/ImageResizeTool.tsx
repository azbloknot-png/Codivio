import { useCallback, useState, type ChangeEvent } from "react";
import { AlertTriangle, Check, Download, ImageIcon, Upload } from "lucide-react";
import {
  computeLockedDimensions,
  getImageDimensions,
  resizeImage,
  ImageResizeError,
  FORMAT_MIME_TYPES,
  type ImageResizeResult,
} from "../lib/image-engine";
import { downloadBytesAsFile } from "../lib/download-file";
import { formatFileSize } from "../lib/format";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import type { ImageFileInput, ImageFormat } from "../../shared/image/types";

/**
 * Phase 6.2 — the first real Image tool, built on the Phase 6.1 shared
 * foundation (shared/image/) and the new src/lib/image-engine.ts. Lazy-
 * loaded from ToolPage.tsx exactly like every PDF/QR tool, so this file
 * never reaches the main bundle or any other tool page.
 *
 * Entirely client-side: the selected image is read via the browser File
 * API, resized in memory via Canvas APIs, and handed back to the browser's
 * own download mechanism. No file is ever uploaded, logged, or sent
 * anywhere.
 *
 * Scope: resize to an exact target width/height only. No format
 * conversion, no quality/compression control, no crop, no rotate, no batch
 * input — those belong to later, separately-authorized sub-phases.
 */

const TOOL_SLUG = "image-resize";

const FORMAT_EXTENSIONS: Record<ImageFormat, string> = { jpeg: "jpg", png: "png", webp: "webp" };

function outputFilename(originalName: string, format: ImageFormat): string {
  const base = originalName.replace(/\.[^./]+$/, "");
  return `${base}-resized.${FORMAT_EXTENSIONS[format]}`;
}

function ImageResizeTool() {
  const [file, setFile] = useState<ImageFileInput | null>(null);
  const [sourceDimensions, setSourceDimensions] = useState<{ width: number; height: number } | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const [isResizing, setIsResizing] = useState(false);
  const [resizeErrors, setResizeErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImageResizeResult | null>(null);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;

    setFile(null);
    setSourceDimensions(null);
    setFileErrors([]);
    setResizeErrors([]);
    setResult(null);
    setWidth("");
    setHeight("");

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const fileInput: ImageFileInput = { name: selected.name, size: selected.size, bytes };

    try {
      const dimensions = await getImageDimensions(fileInput);
      setFile(fileInput);
      setSourceDimensions({ width: dimensions.width, height: dimensions.height });
      setWidth(String(dimensions.width));
      setHeight(String(dimensions.height));
      trackToolStart(TOOL_SLUG);
    } catch (error) {
      if (error instanceof ImageResizeError) {
        setFileErrors([error.message]);
      } else {
        setFileErrors(["Something went wrong while reading this image. Please try again."]);
      }
    }
  }, []);

  const handleWidthChange = useCallback(
    (value: string) => {
      setWidth(value);
      const numeric = Number(value);
      if (lockAspectRatio && sourceDimensions && value.trim() !== "" && Number.isFinite(numeric) && numeric > 0) {
        const next = computeLockedDimensions(sourceDimensions.width, sourceDimensions.height, "width", numeric);
        setHeight(String(next.height));
      }
    },
    [lockAspectRatio, sourceDimensions],
  );

  const handleHeightChange = useCallback(
    (value: string) => {
      setHeight(value);
      const numeric = Number(value);
      if (lockAspectRatio && sourceDimensions && value.trim() !== "" && Number.isFinite(numeric) && numeric > 0) {
        const next = computeLockedDimensions(sourceDimensions.width, sourceDimensions.height, "height", numeric);
        setWidth(String(next.width));
      }
    },
    [lockAspectRatio, sourceDimensions],
  );

  const handleResize = useCallback(async () => {
    if (!file) return;
    const targetWidth = Math.round(Number(width));
    const targetHeight = Math.round(Number(height));

    setIsResizing(true);
    setResizeErrors([]);
    setResult(null);
    try {
      const resizeResult = await resizeImage(file, targetWidth, targetHeight);
      setResult(resizeResult);
      trackToolComplete(TOOL_SLUG);
    } catch (error) {
      if (error instanceof ImageResizeError) {
        setResizeErrors([error.message]);
      } else {
        setResizeErrors(["Something went wrong while resizing the image. Please try again."]);
      }
    } finally {
      setIsResizing(false);
    }
  }, [file, width, height]);

  const handleDownload = useCallback(() => {
    if (!file || !result) return;
    downloadBytesAsFile(result.bytes, outputFilename(file.name, result.format), FORMAT_MIME_TYPES[result.format]);
    trackDownload(TOOL_SLUG, result.format);
  }, [file, result]);

  const widthNumber = Number(width);
  const heightNumber = Number(height);
  const canResize =
    !!file &&
    !isResizing &&
    width.trim() !== "" &&
    height.trim() !== "" &&
    Number.isInteger(widthNumber) &&
    Number.isInteger(heightNumber) &&
    widthNumber > 0 &&
    heightNumber > 0;

  return (
    <div className="image-resize">
      <div className="pdf-split-upload">
        <label className="primary-button pdf-split-upload-label" htmlFor="image-resize-file-input">
          <Upload size={16} aria-hidden="true" />
          Choose an image
        </label>
        <input
          id="image-resize-file-input"
          className="pdf-split-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void handleFileSelected(event)}
        />
        <p className="pdf-merge-hint">Select a JPEG, PNG, or WebP image to resize to exact pixel dimensions.</p>
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

      {file && sourceDimensions && (
        <>
          <p className="pdf-split-page-count">
            <ImageIcon size={16} aria-hidden="true" />
            &quot;{file.name}&quot; — {sourceDimensions.width}×{sourceDimensions.height}px, {formatFileSize(file.size)}
          </p>

          <div className="image-resize-dimensions">
            <label className="qr-generator-field" htmlFor="image-resize-width">
              Width (px)
              <input
                id="image-resize-width"
                type="number"
                min={1}
                step={1}
                value={width}
                onChange={(event) => handleWidthChange(event.target.value)}
              />
            </label>
            <label className="qr-generator-field" htmlFor="image-resize-height">
              Height (px)
              <input
                id="image-resize-height"
                type="number"
                min={1}
                step={1}
                value={height}
                onChange={(event) => handleHeightChange(event.target.value)}
              />
            </label>
          </div>

          <label className="image-resize-lock">
            <input
              type="checkbox"
              checked={lockAspectRatio}
              onChange={(event) => setLockAspectRatio(event.target.checked)}
            />
            Lock aspect ratio
          </label>

          <div className="pdf-merge-actions">
            <button type="button" className="primary-button" onClick={() => void handleResize()} disabled={!canResize}>
              {isResizing ? "Resizing…" : "Resize image"}
            </button>
          </div>
        </>
      )}

      {resizeErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {resizeErrors.map((message) => (
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
            Resized to {result.width}×{result.height}px ({formatFileSize(result.bytes.length)}).
          </p>
          <button type="button" className="primary-button" onClick={handleDownload}>
            <Download size={16} aria-hidden="true" />
            Download resized image
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageResizeTool;
