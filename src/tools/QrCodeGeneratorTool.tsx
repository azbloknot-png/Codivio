import { useEffect, useRef, useState } from "react";
import { generateQrCode, QrGenerationError, type QrGenerateResult } from "../lib/qr-engine";
import { MAX_QR_PAYLOAD_LENGTH, type QrErrorCorrectionLevel } from "../../shared/qr";

/**
 * Phase 4.2 — the first functional tool UI, built on the Phase 4.1 shared
 * QR engine. Loaded via a dedicated lazy chunk from ToolPage.tsx (only when
 * slug === "qr-code-generator") so the `qrcode` dependency never reaches
 * the other 33 tool pages or the main bundle.
 *
 * Scope: generic text/URL payload only (matches shared/qr's Phase 4.1
 * scope) — no vCard/WiFi/Email/etc. builders, no logo embedding, no
 * download/export UI. All generation happens locally; the payload value is
 * never logged or sent anywhere.
 */

const SIZE_OPTIONS = [200, 256, 320, 400] as const;
const MARGIN_OPTIONS = [0, 2, 4, 8] as const;
const ERROR_CORRECTION_LEVELS: QrErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
const DEBOUNCE_MS = 300;

function QrCodeGeneratorTool() {
  const [text, setText] = useState("");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<QrErrorCorrectionLevel>("M");
  const [size, setSize] = useState<number>(256);
  const [margin, setMargin] = useState<number>(4);
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  const [result, setResult] = useState<QrGenerateResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      requestIdRef.current += 1;
      setResult(null);
      setErrors([]);
      setIsGenerating(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsGenerating(true);

    const timer = setTimeout(() => {
      generateQrCode({ kind: "text", value: text }, { errorCorrectionLevel, size, margin, foregroundColor, backgroundColor })
        .then((generated) => {
          if (!isMountedRef.current || requestIdRef.current !== requestId) return;
          setResult(generated);
          setErrors([]);
        })
        .catch((error: unknown) => {
          if (!isMountedRef.current || requestIdRef.current !== requestId) return;
          setResult(null);
          if (error instanceof QrGenerationError) {
            setErrors(error.errors.map((item) => item.message));
          } else {
            setErrors(["Something went wrong while generating the QR code. Please try again."]);
          }
        })
        .finally(() => {
          if (isMountedRef.current && requestIdRef.current === requestId) setIsGenerating(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [text, errorCorrectionLevel, size, margin, foregroundColor, backgroundColor]);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_QR_PAYLOAD_LENGTH;

  return (
    <div className="qr-generator">
      <form className="qr-generator-form" onSubmit={(event) => event.preventDefault()}>
        <label className="qr-generator-field" htmlFor="qr-generator-text">
          Text or URL
          <textarea
            id="qr-generator-text"
            rows={3}
            placeholder="Enter text or a URL to encode..."
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-describedby="qr-generator-char-count"
          />
        </label>
        <p
          id="qr-generator-char-count"
          className={isOverLimit ? "qr-generator-char-count is-over-limit" : "qr-generator-char-count"}
        >
          {charCount} / {MAX_QR_PAYLOAD_LENGTH} characters
        </p>

        <div className="qr-generator-config">
          <label className="qr-generator-field" htmlFor="qr-generator-ec-level">
            Error correction
            <select
              id="qr-generator-ec-level"
              value={errorCorrectionLevel}
              onChange={(event) => setErrorCorrectionLevel(event.target.value as QrErrorCorrectionLevel)}
            >
              {ERROR_CORRECTION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label className="qr-generator-field" htmlFor="qr-generator-size">
            Size
            <select id="qr-generator-size" value={size} onChange={(event) => setSize(Number(event.target.value))}>
              {SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}px
                </option>
              ))}
            </select>
          </label>

          <label className="qr-generator-field" htmlFor="qr-generator-margin">
            Margin
            <select
              id="qr-generator-margin"
              value={margin}
              onChange={(event) => setMargin(Number(event.target.value))}
            >
              {MARGIN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="qr-generator-field" htmlFor="qr-generator-fg-color">
            Foreground color
            <input
              id="qr-generator-fg-color"
              type="color"
              value={foregroundColor}
              onChange={(event) => setForegroundColor(event.target.value)}
            />
          </label>

          <label className="qr-generator-field" htmlFor="qr-generator-bg-color">
            Background color
            <input
              id="qr-generator-bg-color"
              type="color"
              value={backgroundColor}
              onChange={(event) => setBackgroundColor(event.target.value)}
            />
          </label>
        </div>
      </form>

      <div className="qr-generator-preview">
        {errors.length > 0 && (
          <div className="admin-auth-error qr-generator-error" role="alert">
            {errors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

        {errors.length === 0 && text.trim().length === 0 && (
          <div className="qr-generator-empty-state">
            <p>Enter text or a URL above to generate your QR code.</p>
          </div>
        )}

        {isGenerating && <p className="qr-generator-status">Generating…</p>}

        {!isGenerating && result && errors.length === 0 && (
          <img
            className="qr-generator-image"
            src={result.data}
            alt={`QR code for: ${text.trim().slice(0, 120)}`}
            width={size}
            height={size}
          />
        )}
      </div>
    </div>
  );
}

export default QrCodeGeneratorTool;
