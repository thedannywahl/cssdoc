/**
 * Encode ASCII punctuation so Markdown renders it as literal text.
 *
 * @param text - Plain text.
 * @returns Markdown-safe text with line endings unchanged.
 */
export function literalMarkdownText(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0)!;
    result +=
      (code >= 33 && code <= 47) ||
      (code >= 58 && code <= 64) ||
      (code >= 91 && code <= 96) ||
      (code >= 123 && code <= 126)
        ? `&#${code};`
        : char;
  }
  return result;
}
