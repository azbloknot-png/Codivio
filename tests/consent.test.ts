import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acceptAllPreferences,
  buildConsent,
  readConsent,
  rejectOptionalPreferences,
  writeConsent,
} from "../src/lib/consent";

/**
 * Cookie Consent foundation — src/lib/consent.ts. One appropriate test per
 * topic: buildConsent/acceptAllPreferences/rejectOptionalPreferences are
 * pure and tested directly (real logic, not structural greps);
 * readConsent/writeConsent additionally get one real round-trip test using
 * a stubbed localStorage (vi.stubGlobal — Node has no localStorage by
 * default, confirmed empirically; no jsdom exists in this project, see
 * tests/analytics.test.ts's own note on the same limitation), plus a
 * without-storage safety check matching every other frontend-lib test in
 * this suite.
 */

describe("buildConsent", () => {
  it("always forces advertising/preferences to false, regardless of what's requested", () => {
    const consent = buildConsent({ analytics: true, advertising: true, preferences: true });
    expect(consent).toEqual({ version: 1, decided: true, analytics: true, advertising: false, preferences: false });
  });

  it("defaults analytics to false when not explicitly true", () => {
    expect(buildConsent({}).analytics).toBe(false);
    expect(buildConsent({ analytics: false }).analytics).toBe(false);
  });
});

describe("acceptAllPreferences / rejectOptionalPreferences", () => {
  it("Accept All grants analytics (the only real optional category today)", () => {
    expect(acceptAllPreferences()).toEqual({ analytics: true, advertising: false, preferences: false });
  });

  it("Reject Optional grants nothing optional", () => {
    expect(rejectOptionalPreferences()).toEqual({ analytics: false, advertising: false, preferences: false });
  });
});

describe("readConsent / writeConsent — without storage", () => {
  it("readConsent returns null and writeConsent still returns a valid record when window/localStorage is unavailable", () => {
    expect(typeof window).toBe("undefined");
    expect(readConsent()).toBeNull();
    expect(writeConsent(acceptAllPreferences())).toEqual({
      version: 1,
      decided: true,
      analytics: true,
      advertising: false,
      preferences: false,
    });
  });
});

describe("readConsent / writeConsent — with a stubbed localStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubLocalStorage() {
    const store = new Map<string, string>();
    const fakeLocalStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    vi.stubGlobal("window", { localStorage: fakeLocalStorage });
    return fakeLocalStorage;
  }

  it("round-trips a real decision through storage", () => {
    stubLocalStorage();
    expect(readConsent()).toBeNull();

    const written = writeConsent(rejectOptionalPreferences());
    expect(written.decided).toBe(true);
    expect(written.analytics).toBe(false);

    const readBack = readConsent();
    expect(readBack).toEqual(written);
  });

  it("treats a record from an incompatible schema version as never decided", () => {
    const storage = stubLocalStorage();
    storage.setItem("codivio_cookie_consent", JSON.stringify({ version: 999, decided: true, analytics: true }));
    expect(readConsent()).toBeNull();
  });

  it("degrades to null on malformed JSON rather than throwing", () => {
    const storage = stubLocalStorage();
    storage.setItem("codivio_cookie_consent", "{not valid json");
    expect(() => readConsent()).not.toThrow();
    expect(readConsent()).toBeNull();
  });
});
