export { LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_NATIVE_NAMES, isValidLanguage } from "./languages";
export type { Language } from "./languages";
export type { Translations } from "./types";

import type { Language } from "./languages";
import type { Translations } from "./types";
import { az } from "./az";
import { tr } from "./tr";
import { en } from "./en";

export const TRANSLATIONS: Readonly<Record<Language, Translations>> = { az, tr, en };
