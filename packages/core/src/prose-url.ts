import { BACKSLASH_CHAR, FORWARD_SLASH_CHAR } from "@cssdoc/regex";

/**
 * Check whether a decoded Markdown destination is safe for public output.
 *
 * @param value - The decoded destination.
 * @param image - Restrict images to relative or HTTP(S) destinations.
 * @returns Whether the destination is allowed.
 */
export function safeProseUrl(value: string, image = false): boolean {
  if (
    !value ||
    value !== value.trim() ||
    value.startsWith(FORWARD_SLASH_CHAR.repeat(2)) ||
    value.includes(BACKSLASH_CHAR)
  ) {
    return false;
  }
  for (const char of value) {
    const codePoint = char.codePointAt(0)!;
    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) return false;
  }
  try {
    const url = new URL(value, "https://cssdoc.invalid/");
    return (
      url.protocol === "https:" ||
      url.protocol === "http:" ||
      (!image && url.protocol === "mailto:")
    );
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}
