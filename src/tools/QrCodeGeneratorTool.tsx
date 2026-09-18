import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { generateQrCode, QrGenerationError, type QrGenerateResult } from "../lib/qr-engine";
import { MAX_QR_PAYLOAD_LENGTH, type QrErrorCorrectionLevel, type QrPayload, type QrWifiSecurity } from "../../shared/qr";

/**
 * Phase 4.2 — the first functional tool UI, built on the Phase 4.1 shared
 * QR engine. Loaded via a dedicated lazy chunk from ToolPage.tsx (only when
 * slug === "qr-code-generator") so the `qrcode` dependency never reaches
 * the other 33 tool pages or the main bundle.
 *
 * Phase 4.3 added a Text/URL mode toggle. Phase 4.4 added a third WiFi
 * mode with its own structured fields (SSID/password/security/hidden) —
 * unlike text/url, a WiFi payload has no single "value" the user types
 * directly; `generateQrCode` still needs no branching, since
 * `shared/qr/validate.ts` pre-computes the actual encodable string
 * (`encodedValue`) for every kind, WiFi included.
 *
 * Every mode shares config controls, preview, debounce/stale-request/
 * unmount guards, and error/empty/loading states. WiFi payload formatting
 * and escaping live in shared/qr/wifi.ts — not duplicated here.
 *
 * Scope: text/URL/WiFi payloads only — no vCard/Email/etc. builders, no
 * logo embedding, no download/export UI. All generation happens locally;
 * no payload (including WiFi credentials) is ever logged or sent anywhere.
 */

type QrInputMode = QrPayload["kind"];

const SIZE_OPTIONS = [200, 256, 320, 400] as const;
const MARGIN_OPTIONS = [0, 2, 4, 8] as const;
const ERROR_CORRECTION_LEVELS: QrErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
const DEBOUNCE_MS = 300;

function QrCodeGeneratorTool() {
  const [mode, setMode] = useState<QrInputMode>("text");
  const [text, setText] = useState("");

  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState<QrWifiSecurity>("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);

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

  const hasContent = mode === "wifi" ? wifiSsid.trim().length > 0 : text.trim().length > 0;

  useEffect(() => {
    if (!hasContent) {
      requestIdRef.current += 1;
      setResult(null);
      setErrors([]);
      setIsGenerating(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsGenerating(true);

    const payload: QrPayload =
      mode === "wifi"
        ? { kind: "wifi", ssid: wifiSsid, password: wifiPassword, security: wifiSecurity, hidden: wifiHidden }
        : { kind: mode, value: text };

    const timer = setTimeout(() => {
      generateQrCode(payload, { errorCorrectionLevel, size, margin, foregroundColor, backgroundColor })
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
  }, [mode, text, wifiSsid, wifiPassword, wifiSecurity, wifiHidden, hasContent, errorCorrectionLevel, size, margin, foregroundColor, backgroundColor]);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_QR_PAYLOAD_LENGTH;

  function selectMode(nextMode: QrInputMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    // Clears any lingering result/error from the previous mode rather than
    // showing (e.g.) a stale "invalid URL" message after switching modes.
    setText("");
    setWifiSsid("");
    setWifiPassword("");
    setWifiSecurity("WPA");
    setWifiHidden(false);
    setShowWifiPassword(false);
  }

  return (
    <div className="qr-generator">
      <form className="qr-generator-form" onSubmit={(event) => event.preventDefault()}>
        <div className="category-filter qr-generator-mode-toggle" role="group" aria-label="QR content type">
          <button type="button" className={mode === "text" ? "active" : undefined} aria-pressed={mode === "text"} onClick={() => selectMode("text")}>
            Text
          </button>
          <button type="button" className={mode === "url" ? "active" : undefined} aria-pressed={mode === "url"} onClick={() => selectMode("url")}>
            URL
          </button>
          <button type="button" className={mode === "wifi" ? "active" : undefined} aria-pressed={mode === "wifi"} onClick={() => selectMode("wifi")}>
            WiFi
          </button>
        </div>

        {mode === "wifi" ? (
          <>
            <label className="qr-generator-field" htmlFor="qr-wifi-ssid">
              Network name (SSID)
              <input
                id="qr-wifi-ssid"
                type="text"
                placeholder="My Wi-Fi Network"
                value={wifiSsid}
                onChange={(event) => setWifiSsid(event.target.value)}
              />
            </label>

            <label className="qr-generator-field" htmlFor="qr-wifi-security">
              Security type
              <select
                id="qr-wifi-security"
                value={wifiSecurity}
                onChange={(event) => {
                  const nextSecurity = event.target.value as QrWifiSecurity;
                  setWifiSecurity(nextSecurity);
                  if (nextSecurity === "nopass") setWifiPassword("");
                }}
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None (open network)</option>
              </select>
            </label>

            <label className="qr-generator-field" htmlFor="qr-wifi-password">
              Password
              <div className="qr-generator-password-field">
                <input
                  id="qr-wifi-password"
                  type={showWifiPassword ? "text" : "password"}
                  value={wifiPassword}
                  onChange={(event) => setWifiPassword(event.target.value)}
                  disabled={wifiSecurity === "nopass"}
                  placeholder={wifiSecurity === "nopass" ? "Not required for an open network" : "Enter the Wi-Fi password"}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="qr-generator-password-toggle"
                  onClick={() => setShowWifiPassword((visible) => !visible)}
                  disabled={wifiSecurity === "nopass"}
                  aria-pressed={showWifiPassword}
                  aria-label={showWifiPassword ? "Hide password" : "Show password"}
                >
                  {showWifiPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="qr-generator-checkbox-field">
              <input type="checkbox" checked={wifiHidden} onChange={(event) => setWifiHidden(event.target.checked)} />
              This is a hidden network
            </label>
          </>
        ) : (
          <>
            <label className="qr-generator-field" htmlFor="qr-generator-text">
              {mode === "url" ? "URL" : "Text"}
              {mode === "url" ? (
                <input
                  id="qr-generator-text"
                  type="url"
                  placeholder="https://example.com"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  aria-describedby="qr-generator-char-count"
                />
              ) : (
                <textarea
                  id="qr-generator-text"
                  rows={3}
                  placeholder="Enter text to encode..."
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  aria-describedby="qr-generator-char-count"
                />
              )}
            </label>
            <p
              id="qr-generator-char-count"
              className={isOverLimit ? "qr-generator-char-count is-over-limit" : "qr-generator-char-count"}
            >
              {charCount} / {MAX_QR_PAYLOAD_LENGTH} characters
            </p>
          </>
        )}

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

        {errors.length === 0 && !hasContent && (
          <div className="qr-generator-empty-state">
            <p>
              {mode === "wifi"
                ? "Enter your network name above to generate a Wi-Fi QR code."
                : "Enter text or a URL above to generate your QR code."}
            </p>
          </div>
        )}

        {isGenerating && <p className="qr-generator-status">Generating…</p>}

        {!isGenerating && result && errors.length === 0 && (
          <img
            className="qr-generator-image"
            src={result.data}
            alt={
              mode === "wifi"
                ? `QR code for Wi-Fi network: ${wifiSsid.trim().slice(0, 120)}`
                : mode === "url"
                  ? `QR code linking to: ${text.trim().slice(0, 120)}`
                  : `QR code for: ${text.trim().slice(0, 120)}`
            }
            width={size}
            height={size}
          />
        )}
      </div>
    </div>
  );
}

export default QrCodeGeneratorTool;
