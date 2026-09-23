export {
  PDF_MAGIC_BYTES,
  MAX_PDF_FILE_BYTES,
  MAX_PDF_FILES_PER_MERGE,
  MIN_PDF_FILES_PER_MERGE,
  MAX_TOTAL_MERGE_BYTES,
} from "./types";
export type { PdfValidationErrorCode, PdfValidationError, PdfFileInput, PdfMergeValidationResult } from "./types";

export { hasPdfSignature, validatePdfFile, validatePdfMergeRequest } from "./validate";
