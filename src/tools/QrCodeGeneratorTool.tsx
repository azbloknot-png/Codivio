import { useEffect, useRef, useState } from "react";
import { Download, Eye, EyeOff } from "lucide-react";
import { generateQrCode, QrGenerationError, type QrGenerateResult, type QrOutputFormat } from "../lib/qr-engine";
import { downloadTextAsFile, triggerDownload } from "../lib/download-file";
import { trackQrGenerate } from "../lib/qr-analytics";
import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";
import { MAX_QR_PAYLOAD_LENGTH, type QrErrorCorrectionLevel, type QrPayload, type QrWifiSecurity } from "../../shared/qr";

/**
 * Phase 4.2 — the first functional tool UI, built on the Phase 4.1 shared
 * QR engine. Loaded via a dedicated lazy chunk from ToolPage.tsx (only when
 * slug === "qr-code-generator") so the `qrcode` dependency never reaches
 * the other 33 tool pages or the main bundle.
 *
 * Phase 4.3 added a Text/URL mode toggle. Phase 4.4 added a third WiFi
 * mode with its own structured fields (SSID/password/security/hidden).
 * Phase 4.5 added a fourth vCard mode (first/last name, organization, job
 * title, phone, email, website) — a second structured payload kind.
 * `generateQrCode` still needs no branching for any of this, since
 * `shared/qr/validate.ts` pre-computes the actual encodable string
 * (`encodedValue`) for every kind.
 *
 * Every mode shares config controls, preview, debounce/stale-request/
 * unmount guards, and error/empty/loading states. WiFi/vCard payload
 * formatting and escaping live in shared/qr/wifi.ts and shared/qr/vcard.ts
 * respectively — not duplicated here.
 *
 * Phase 4.7 added PNG/JPG/SVG download buttons, reusing `generateQrCode`
 * a second time (on demand, at download-click time) with the exact same
 * payload/config the on-screen preview already used — no separate export
 * code path per payload kind, and no new customization controls, since
 * size/margin/error-correction/colors already existed since Phase 4.2.
 *
 * Scope: text/URL/WiFi/vCard payloads only — no Email/SMS/etc. builders,
 * no logo embedding. All generation happens locally; no payload (including
 * WiFi credentials or vCard contact details) is ever logged or sent
 * anywhere, and downloads never touch a server.
 */

type QrInputMode = QrPayload["kind"];

const SIZE_OPTIONS = [200, 256, 320, 400] as const;
const MARGIN_OPTIONS = [0, 2, 4, 8] as const;
const ERROR_CORRECTION_LEVELS: QrErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
const DEBOUNCE_MS = 300;
const TOOL_SLUG = "qr-code-generator";

function QrCodeGeneratorTool() {
  const [mode, setMode] = useState<QrInputMode>("text");
  const [text, setText] = useState("");

  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState<QrWifiSecurity>("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  const [vcardFirstName, setVcardFirstName] = useState("");
  const [vcardLastName, setVcardLastName] = useState("");
  const [vcardOrganization, setVcardOrganization] = useState("");
  const [vcardJobTitle, setVcardJobTitle] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [vcardWebsite, setVcardWebsite] = useState("");

  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<QrErrorCorrectionLevel>("M");
  const [size, setSize] = useState<number>(256);
  const [margin, setMargin] = useState<number>(4);
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  const [result, setResult] = useState<QrGenerateResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasStartedRef = useRef(false);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const hasContent =
    mode === "wifi"
      ? wifiSsid.trim().length > 0
      : mode === "vcard"
        ? vcardFirstName.trim().length > 0 || vcardLastName.trim().length > 0
        : text.trim().length > 0;

  // Shared by the auto-generation effect below and by the Phase 4.7 export
  // handlers, so a download always encodes exactly what the on-screen
  // preview is currently showing — never a separately-constructed payload.
  function buildPayload(): QrPayload {
    if (mode === "wifi") {
      return { kind: "wifi", ssid: wifiSsid, password: wifiPassword, security: wifiSecurity, hidden: wifiHidden };
    }
    if (mode === "vcard") {
      return {
        kind: "vcard",
        firstName: vcardFirstName,
        lastName: vcardLastName,
        organization: vcardOrganization,
        jobTitle: vcardJobTitle,
        phone: vcardPhone,
        email: vcardEmail,
        website: vcardWebsite,
      };
    }
    return { kind: mode, value: text };
  }

  useEffect(() => {
    if (!hasContent) {
      requestIdRef.current += 1;
      setResult(null);
      setErrors([]);
      setIsGenerating(false);
      return;
    }

    // Phase 3.21 — fires once per mount, the first time the user has
    // entered enough real content to attempt a generation (not on every
    // keystroke/re-render) — the earliest genuine "began using this tool"
    // signal, distinct from tool_open (which fires just from viewing the
    // page) and from tool_complete (a successful result, below).
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      trackToolStart(TOOL_SLUG);
    }

    const requestId = ++requestIdRef.current;
    setIsGenerating(true);
    setExportError(null);

    const payload = buildPayload();

    const timer = setTimeout(() => {
      generateQrCode(payload, { errorCorrectionLevel, size, margin, foregroundColor, backgroundColor })
        .then((generated) => {
          if (!isMountedRef.current || requestIdRef.current !== requestId) return;
          setResult(generated);
          setErrors([]);
          // Phase 4.9 — metadata only (payload.kind is a closed literal
          // union: "text"|"url"|"wifi"|"vcard"), never the actual text/
          // WiFi credentials/vCard fields the user entered.
          trackQrGenerate(payload.kind);
          // Phase 3.21 — the generic, tool-family-agnostic completion
          // signal, fired alongside the QR-specific event above (same
          // cadence: once per successful generation, not just the first).
          trackToolComplete(TOOL_SLUG);
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
  }, [
    mode,
    text,
    wifiSsid,
    wifiPassword,
    wifiSecurity,
    wifiHidden,
    vcardFirstName,
    vcardLastName,
    vcardOrganization,
    vcardJobTitle,
    vcardPhone,
    vcardEmail,
    vcardWebsite,
    hasContent,
    errorCorrectionLevel,
    size,
    margin,
    foregroundColor,
    backgroundColor,
  ]);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_QR_PAYLOAD_LENGTH;
  // Contact name only — never includes phone/email in the accessible alt
  // text, matching the same privacy pattern as WiFi's password exclusion.
  const vcardDisplayName = [vcardFirstName.trim(), vcardLastName.trim()].filter((part) => part.length > 0).join(" ");

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
    setVcardFirstName("");
    setVcardLastName("");
    setVcardOrganization("");
    setVcardJobTitle("");
    setVcardPhone("");
    setVcardEmail("");
    setVcardWebsite("");
    setExportError(null);
  }

  // Phase 4.7 — export. Re-runs generateQrCode on demand with the exact
  // current payload/config (never a stored/duplicated one) so the
  // downloaded file always matches the on-screen preview exactly, for
  // whichever payload kind is currently active — no per-kind export logic.
  async function downloadAs(format: QrOutputFormat) {
    try {
      const exported = await generateQrCode(buildPayload(), {
        errorCorrectionLevel,
        size,
        margin,
        foregroundColor,
        backgroundColor,
      }, format);
      const extension = format === "png-data-url" ? "png" : format === "jpg-data-url" ? "jpg" : "svg";
      const filename = `codivio-qr-${mode}.${extension}`;
      if (exported.format === "svg") {
        downloadTextAsFile(exported.data, filename, "image/svg+xml");
      } else {
        triggerDownload(exported.data, filename);
      }
      setExportError(null);
      // Phase 3.21 — fires only once the file was actually prepared/handed
      // to the browser (inside the try block's success path), never on a
      // failed export (see the catch branch below).
      trackDownload(TOOL_SLUG, format);
    } catch {
      setExportError("Couldn't prepare the download. Please try again.");
    }
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
          <button type="button" className={mode === "vcard" ? "active" : undefined} aria-pressed={mode === "vcard"} onClick={() => selectMode("vcard")}>
            vCard
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
        ) : mode === "vcard" ? (
          <>
            <label className="qr-generator-field" htmlFor="qr-vcard-first-name">
              First name
              <input
                id="qr-vcard-first-name"
                type="text"
                autoComplete="given-name"
                placeholder="Jane"
                value={vcardFirstName}
                onChange={(event) => setVcardFirstName(event.target.value)}
              />
            </label>

            <label className="qr-generator-field" htmlFor="qr-vcard-last-name">
              Last name
              <input
                id="qr-vcard-last-name"
                type="text"
                autoComplete="family-name"
                placeholder="Doe"
                value={vcardLastName}
                onChange={(event) => setVcardLastName(event.target.value)}
              />
            </label>

            <label className="qr-generator-field" htmlFor="qr-vcard-organization">
              Organization (optional)
              <input
                id="qr-vcard-organization"
                type="text"
                autoComplete="organization"
                placeholder="Codivio"
                value={vcardOrganization}
                onChange={(event) => setVcardOrganization(event.target.value)}
              />
            </label>

            <label className="qr-generator-field" htmlFor="qr-vcard-job-title">
              Job title (optional)
              <input
                id="qr-vcard-job-title"
                type="text"
                autoComplete="organization-title"
                placeholder="Product Manager"
                value={vcardJobTitle}
                onChange={(event) => setVcardJobTitle(event.target.value)}
              />
            </label>

            <label className="qr-generator-field" htmlFor="qr-vcard-phone">
              Phone (optional)
              <input
                id="qr-vcard-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 123 4567"
                value={vcardPhone}
                onChange={(event) => setVcardPhone(event.target.value)}
              />
            </label>

            <label className="qr-generator-field" htmlFor="qr-vcard-email">
              Email (optional)
              <input
                id="qr-vcard-email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                value={vcardEmail}
                onChange={(event) => setVcardEmail(event.target.value)}
              />
            </label>

            <label className="qr-generator-field" htmlFor="qr-vcard-website">
              Website (optional)
              <input
                id="qr-vcard-website"
                type="url"
                autoComplete="url"
                placeholder="https://example.com"
                value={vcardWebsite}
                onChange={(event) => setVcardWebsite(event.target.value)}
              />
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
                : mode === "vcard"
                  ? "Enter a first or last name above to generate a contact QR code."
                  : "Enter text or a URL above to generate your QR code."}
            </p>
          </div>
        )}

        {isGenerating && <p className="qr-generator-status">Generating…</p>}

        {!isGenerating && result && errors.length === 0 && (
          <>
            <img
              className="qr-generator-image"
              src={result.data}
              alt={
                mode === "wifi"
                  ? `QR code for Wi-Fi network: ${wifiSsid.trim().slice(0, 120)}`
                  : mode === "vcard"
                    ? `QR code for contact: ${vcardDisplayName.slice(0, 120)}`
                    : mode === "url"
                      ? `QR code linking to: ${text.trim().slice(0, 120)}`
                      : `QR code for: ${text.trim().slice(0, 120)}`
              }
              width={size}
              height={size}
            />

            <div className="qr-generator-export" role="group" aria-label="Download QR code">
              <button type="button" className="primary-button" onClick={() => void downloadAs("png-data-url")}>
                <Download size={16} aria-hidden="true" />
                Download PNG
              </button>
              <button type="button" className="primary-button" onClick={() => void downloadAs("jpg-data-url")}>
                <Download size={16} aria-hidden="true" />
                Download JPG
              </button>
              <button type="button" className="primary-button" onClick={() => void downloadAs("svg")}>
                <Download size={16} aria-hidden="true" />
                Download SVG
              </button>
            </div>

            {exportError && (
              <p className="admin-auth-error qr-generator-export-error" role="alert">
                {exportError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default QrCodeGeneratorTool;
