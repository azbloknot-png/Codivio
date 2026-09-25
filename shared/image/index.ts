export {
  JPEG_MAGIC_BYTES,
  PNG_MAGIC_BYTES,
  WEBP_RIFF_MAGIC_BYTES,
  WEBP_FORMAT_MAGIC_BYTES,
  WEBP_FORMAT_TAG_OFFSET,
} from "./types";
export type { ImageFormat, ImageFileInput } from "./types";

export { detectImageFormat } from "./format";
