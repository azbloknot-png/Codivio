export {
  PDF_MAGIC_BYTES,
  PDF_HEADER_SEARCH_WINDOW_BYTES,
  MAX_PDF_FILE_BYTES,
  MAX_PDF_FILES_PER_MERGE,
  MIN_PDF_FILES_PER_MERGE,
  MAX_TOTAL_MERGE_BYTES,
  MAX_SPLIT_OUTPUT_FILES,
  DEFAULT_COMPRESS_JPEG_QUALITY,
  MIN_EXTRACTABLE_TEXT_CHARACTERS,
} from "./types";
export type {
  PdfValidationErrorCode,
  PdfValidationError,
  PdfFileInput,
  PdfMergeValidationResult,
  PdfPageRange,
  PdfPageRangesResult,
} from "./types";

export {
  hasPdfSignature,
  validatePdfFile,
  validatePdfMergeRequest,
  parsePageRanges,
  everyPageRanges,
} from "./validate";
