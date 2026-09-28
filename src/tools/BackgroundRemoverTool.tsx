import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { AlertTriangle, Check, Download, Upload } from "lucide-react";
import {
  removeBackground,
  BackgroundRemoverError,
  type BackgroundRemoverOutputFormat,
  type BackgroundRemoverResult,
} from "../lib/background-remover-engine";
import { detectImageFormat } from "../../shared/image/format";
import { downloadBytesAsFile } from "../lib/download-file";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import type { ImageFileInput } from "../../shared/image/types";

/**
 * Phase 6.5 — Background Remover. Entirely client-side, lazy-loaded from
 * ToolPage.tsx so this file (and the heavier MediaPipe runtime it triggers)
 * never reaches the main bundle or any other tool page.
 *
 * SCOPE, HONESTLY DISCLOSED: this removes backgrounds from photos of
 * people/subjects (MediaPipe's Selfie Segmenter model family) — it is not
 * a general arbitrary-object background remover, and this component must
 * never claim otherwise. Never a quality control, never a manual mask
 * editor, never a claim of metadata/EXIF preservation (the Canvas pipeline
 * has none to preserve, same as Convert).
 *
 * NOT FULLY OFFLINE, DISCLOSED HONESTLY: the underlying engine fetches a
 * ~11.2 MB WASM runtime and a ~244 KB model from third-party CDNs on first
 * use of this specific tool — see src/lib/background-remover-engine.ts's
 * header comment for the exact, measured figures and hosts. The user's own
 * photo is never uploaded anywhere; only these two static, non-user-data
 * assets are fetched.
 */

const TOOL_SLUG = "background-remover";

function outputFilename(originalName: string, format: BackgroundRemoverOutputFormat): string {
  const base = originalName.replace(/\.[^./]+$/, "");
  return `${base}-no-background.${format}`;
}

function BackgroundRemoverTool() {
  const [file, setFile] = useState<ImageFileInput | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [outputFormat, setOutputFormat] = useState<BackgroundRemoverOutputFormat>("png");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processErrors, setProcessErrors] = useState<string[]>([]);
  const [result, setResult] = useState<BackgroundRemoverResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // The preview is a per-result object URL, not a data URL, so it must be
  // explicitly revoked when a new result replaces it or the component
  // unmounts — otherwise each attempt would leak browser memory.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;

    setFile(null);
    setFileErrors([]);
    setProcessErrors([]);
    setResult(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });

    const bytes = new Uint8Array(await selected.arrayBuffer());
    const fileInput: ImageFileInput = { name: selected.name, size: selected.size, bytes };

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

  const handleRemoveBackground = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setProcessErrors([]);
    setResult(null);
    try {
      const removeResult = await removeBackground(file, outputFormat);
      setResult(removeResult);
      const blob = new Blob([new Uint8Array(removeResult.bytes)], { type: `image/${removeResult.format}` });
      setPreviewUrl(URL.createObjectURL(blob));
      trackToolComplete(TOOL_SLUG);
    } catch (error) {
      if (error instanceof BackgroundRemoverError) {
        setProcessErrors([error.message]);
      } else {
        setProcessErrors(["Something went wrong while removing the background. Please try again."]);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [file, outputFormat]);

  const handleDownload = useCallback(() => {
    if (!file || !result) return;
    downloadBytesAsFile(result.bytes, outputFilename(file.name, result.format), `image/${result.format}`);
    trackDownload(TOOL_SLUG, result.format);
  }, [file, result]);

  return (
    <div className="background-remover">
      <p className="pdf-merge-hint">
        Removes the background from photos of people, leaving a transparent PNG or WebP cutout. Optimized for
        portraits and subject photos — not a general tool for removing backgrounds from arbitrary objects or scenes.
      </p>

      <div className="pdf-split-upload">
        <label className="primary-button pdf-split-upload-label" htmlFor="background-remover-file-input">
          <Upload size={16} aria-hidden="true" />
          Choose a photo
        </label>
        <input
          id="background-remover-file-input"
          className="pdf-split-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void handleFileSelected(event)}
        />
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
          <p className="pdf-split-page-count">&quot;{file.name}&quot; selected.</p>
          <div className="qr-generator-field">
            <label htmlFor="background-remover-format">Output format</label>
            <select
              id="background-remover-format"
              value={outputFormat}
              onChange={(event) => setOutputFormat(event.target.value as BackgroundRemoverOutputFormat)}
            >
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div className="pdf-merge-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleRemoveBackground()}
              disabled={isProcessing}
            >
              {isProcessing ? "Removing background…" : "Remove background"}
            </button>
          </div>
        </>
      )}

      {processErrors.length > 0 && (
        <div className="admin-auth-error pdf-merge-error" role="alert">
          {processErrors.map((message) => (
            <p key={message}>
              <AlertTriangle size={14} aria-hidden="true" /> {message}
            </p>
          ))}
        </div>
      )}

      {result && previewUrl && (
        <div className="pdf-merge-result">
          <p className="pdf-merge-result-label">
            <Check size={16} aria-hidden="true" />
            Background removed ({result.format.toUpperCase()}, {result.width}×{result.height}).
          </p>
          <img className="background-remover-preview" src={previewUrl} alt="Preview of the image with its background removed" />
          <button type="button" className="primary-button" onClick={handleDownload}>
            <Download size={16} aria-hidden="true" />
            Download {result.format.toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );
}

export default BackgroundRemoverTool;
