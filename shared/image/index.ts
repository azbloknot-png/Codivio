export {
  JPEG_MAGIC_BYTES,
  PNG_MAGIC_BYTES,
  WEBP_RIFF_MAGIC_BYTES,
  WEBP_FORMAT_MAGIC_BYTES,
  WEBP_FORMAT_TAG_OFFSET,
} from "./types";
export type { ImageFormat, ImageFileInput } from "./types";

export { detectImageFormat } from "./format";

export { validateImageFileInput, validateImageDimensions, MAX_IMAGE_FILE_BYTES, MAX_IMAGE_DIMENSION_PX } from "./validate";
export type { ImageValidationErrorCode, ImageValidationError, ImageValidationResult, ImageDimensionValidationResult } from "./validate";
