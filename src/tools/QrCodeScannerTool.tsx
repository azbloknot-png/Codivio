import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, Camera, Check, Copy, ImageOff, RotateCcw, ScanLine, Upload, VideoOff } from "lucide-react";
import { decodeQrFromImageData } from "../lib/qr-scanner-engine";
import { classifyScannedQrContent } from "../../shared/qr";
import { trackQrScan } from "../lib/qr-analytics";
import { trackToolStart, trackToolComplete } from "../lib/tool-analytics";

/**
 * Phase 4.6 — QR Code Scanner. Loaded via its own lazy chunk from
 * ToolPage.tsx (only when slug === "qr-code-scanner"), mirroring the
 * Phase 4.2 QR Code Generator pattern, so the `jsqr` decoding dependency
 * never reaches the other 33 tool pages or the main bundle.
 *
 * Two independent input methods, both decoding entirely client-side via
 * src/lib/qr-scanner-engine.ts (the only file importing `jsqr`):
 *   - Camera: getUserMedia -> <video> -> per-frame <canvas> capture -> decode.
 *   - Upload: a chosen image file -> <canvas> -> decode, once.
 * Decoded content is rendered as plain text only (never
 * dangerouslySetInnerHTML), is never logged, never sent to a server, never
 * placed in a URL/query parameter, and never used to auto-navigate — the
 * user must explicitly copy it. Camera tracks are always stopped on
 * success, on explicit stop/reset, and on unmount.
 *
 * Scope: generic decode + safe display only, per Phase 4.6 — no download/
 * export UI (reserved for Phase 4.7), no automatic action on decoded
 * content (no auto-open link/call/add-contact), no full per-format parsing
 * (see shared/qr/classify.ts for the deliberately minimal, prefix-only
 * content labeling).
 */

type ScannerPhase =
  | "idle"
  | "camera-starting"
  | "camera-active"
  | "camera-denied"
  | "camera-unavailable"
  | "camera-error"
  | "decoding-image"
  | "image-invalid"
  | "no-code-found"
  | "success";

/** Generous cap against a pathologically large upload — not a real QR
 * payload concern (QR codes hold at most a few KB), but a sane limit on
 * the *image file* being decoded. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Very large photos are downscaled before decoding — keeps canvas/memory
 * use bounded regardless of the original photo resolution. */
const MAX_CANVAS_DIMENSION = 1600;
/** Throttles how often a camera frame is actually decoded — decoding every
 * single frame would waste CPU for no scanning-speed benefit. */
const SCAN_INTERVAL_MS = 200;
const TOOL_SLUG = "qr-code-scanner";

function QrCodeScannerTool() {
  const [phase, setPhase] = useState<ScannerPhase>("idle");
  const [decodedText, setDecodedText] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "unavailable">("idle");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasStartedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastAttemptRef = useRef(0);
  const isMountedRef = useRef(true);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Phase 3.21 — fires once per mount, the first time the user makes a real
  // attempt to scan (camera or upload) — distinct from tool_open (just
  // viewing the page) and tool_complete (a successful decode, below).
  const markStarted = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    trackToolStart(TOOL_SLUG);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const now = performance.now();
    if (now - lastAttemptRef.current < SCAN_INTERVAL_MS) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    lastAttemptRef.current = now;

    const rawWidth = video.videoWidth;
    const rawHeight = video.videoHeight;
    const ctx = rawWidth && rawHeight ? canvas.getContext("2d", { willReadFrequently: true }) : null;
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Phase 4.8 — mirrors the same downscale cap already applied to the
    // upload path: the `getUserMedia` call below only requests an *ideal*
    // resolution, which a device is free to ignore, so this is real
    // defense-in-depth against an unbounded per-frame canvas/decode cost.
    const scale = Math.min(1, MAX_CANVAS_DIMENSION / Math.max(rawWidth, rawHeight));
    const width = Math.max(1, Math.round(rawWidth * scale));
    const height = Math.max(1, Math.round(rawHeight * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const result = decodeQrFromImageData(imageData);

    if (result && isMountedRef.current) {
      stopCamera();
      setDecodedText(result.data);
      setCopyState("idle");
      setPhase("success");
      // Phase 4.9 — metadata only (the classified content *kind*, e.g.
      // "url"/"wifi"/"text"), never the decoded text itself.
      trackQrScan(classifyScannedQrContent(result.data).kind);
      // Phase 3.21 — the generic, tool-family-agnostic completion signal,
      // fired alongside the QR-specific event above.
      trackToolComplete(TOOL_SLUG);
      return;
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    markStarted();
    setPhase("camera-starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("camera-unavailable");
      return;
    }

    try {
      // Phase 4.8 — request a reasonable resolution rather than whatever
      // maximum a device might otherwise default to; `ideal` is advisory
      // (never causes an OverconstrainedError like `min`/`max`/`exact`
      // would on a lower-resolution device), so this is a preference, not
      // a hard requirement. The scanFrame downscale cap below still applies
      // regardless, since a device is free to ignore this hint.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      lastAttemptRef.current = 0;
      setPhase("camera-active");
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPhase("camera-denied");
      } else if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
        setPhase("camera-unavailable");
      } else {
        setPhase("camera-error");
      }
    }
  }, [scanFrame, markStarted]);

  const stopScan = useCallback(() => {
    stopCamera();
    setPhase("idle");
  }, [stopCamera]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhase("image-invalid");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setPhase("image-invalid");
      return;
    }

    markStarted();
    setPhase("decoding-image");
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (!isMountedRef.current) return;

      const canvas = canvasRef.current;
      const { naturalWidth, naturalHeight } = image;
      if (!canvas || naturalWidth === 0 || naturalHeight === 0) {
        setPhase("image-invalid");
        return;
      }

      const scale = Math.min(1, MAX_CANVAS_DIMENSION / Math.max(naturalWidth, naturalHeight));
      const width = Math.max(1, Math.round(naturalWidth * scale));
      const height = Math.max(1, Math.round(naturalHeight * scale));
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setPhase("image-invalid");
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const result = decodeQrFromImageData(imageData);

      if (result) {
        setDecodedText(result.data);
        setCopyState("idle");
        setPhase("success");
        // Phase 4.9 — metadata only, see the matching comment in the
        // camera-path success branch above.
        trackQrScan(classifyScannedQrContent(result.data).kind);
        // Phase 3.21 — see the matching comment in the camera-path success
        // branch above.
        trackToolComplete(TOOL_SLUG);
      } else {
        setPhase("no-code-found");
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      if (isMountedRef.current) setPhase("image-invalid");
    };
    image.src = objectUrl;
  }, [markStarted]);

  const reset = useCallback(() => {
    stopCamera();
    setDecodedText(null);
    setCopyState("idle");
    setPhase("idle");
  }, [stopCamera]);

  const copyResult = useCallback(async () => {
    if (!decodedText) return;
    if (!navigator.clipboard?.writeText) {
      setCopyState("unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(decodedText);
      setCopyState("copied");
    } catch {
      setCopyState("unavailable");
    }
  }, [decodedText]);

  const classification = decodedText ? classifyScannedQrContent(decodedText) : null;
  const isCameraVisible = phase === "camera-starting" || phase === "camera-active";

  return (
    <div className="qr-scanner">
      <div className="qr-scanner-panel">
        <video
          ref={videoRef}
          className={isCameraVisible ? "qr-scanner-video" : "qr-scanner-video is-hidden"}
          aria-label="Live camera preview"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="qr-scanner-canvas" aria-hidden="true" />

        {phase === "idle" && (
          <div className="qr-scanner-empty-state">
            <ScanLine size={28} aria-hidden="true" />
            <p>Scan a QR code with your camera, or upload an image that contains one.</p>
            <div className="qr-scanner-actions">
              <button type="button" className="primary-button" onClick={() => void startCamera()}>
                <Camera size={16} aria-hidden="true" />
                Scan with camera
              </button>
              <label className="primary-button qr-scanner-upload-label" htmlFor="qr-scanner-file-input">
                <Upload size={16} aria-hidden="true" />
                Upload an image
              </label>
              <input
                id="qr-scanner-file-input"
                className="qr-scanner-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {phase === "camera-starting" && (
          <p className="qr-scanner-status" role="status">
            Requesting camera access…
          </p>
        )}

        {phase === "camera-active" && (
          <div className="qr-scanner-active-controls">
            <p className="qr-scanner-status" role="status">
              Point your camera at a QR code…
            </p>
            <button type="button" className="primary-button" onClick={stopScan}>
              Stop
            </button>
          </div>
        )}

        {phase === "decoding-image" && (
          <p className="qr-scanner-status" role="status">
            Reading the uploaded image…
          </p>
        )}

        {phase === "camera-denied" && (
          <div className="admin-auth-error qr-scanner-error" role="alert">
            <VideoOff size={18} aria-hidden="true" />
            <p>Camera access was denied. You can allow camera access in your browser settings, or upload an image instead.</p>
            <button type="button" className="primary-button" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {phase === "camera-unavailable" && (
          <div className="admin-auth-error qr-scanner-error" role="alert">
            <VideoOff size={18} aria-hidden="true" />
            <p>No camera is available on this device or browser. Upload an image instead.</p>
            <button type="button" className="primary-button" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Back
            </button>
          </div>
        )}

        {phase === "camera-error" && (
          <div className="admin-auth-error qr-scanner-error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>Something went wrong while starting the camera. Please try again, or upload an image instead.</p>
            <button type="button" className="primary-button" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {phase === "image-invalid" && (
          <div className="admin-auth-error qr-scanner-error" role="alert">
            <ImageOff size={18} aria-hidden="true" />
            <p>That file couldn't be read as an image. Please choose a valid image file.</p>
            <button type="button" className="primary-button" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {phase === "no-code-found" && (
          <div className="admin-auth-error qr-scanner-error" role="alert">
            <ScanLine size={18} aria-hidden="true" />
            <p>No QR code was found in that image. Try a clearer or closer image.</p>
            <button type="button" className="primary-button" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {phase === "success" && decodedText && (
          <div className="qr-scanner-result">
            <p className="qr-scanner-result-label">
              <Check size={16} aria-hidden="true" />
              Detected: {classification?.label ?? "Text"}
            </p>
            <p className="qr-scanner-result-text">{decodedText}</p>
            <div className="qr-scanner-actions">
              <button type="button" className="primary-button" onClick={() => void copyResult()}>
                <Copy size={16} aria-hidden="true" />
                {copyState === "copied" ? "Copied!" : "Copy"}
              </button>
              <button type="button" className="primary-button" onClick={reset}>
                <RotateCcw size={16} aria-hidden="true" />
                Scan again
              </button>
            </div>
            {copyState === "unavailable" && (
              <p className="qr-scanner-copy-note">Copying isn't supported in this browser — select and copy the text above manually.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QrCodeScannerTool;
