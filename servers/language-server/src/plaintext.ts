import { MarkdownExit, type Token } from "markdown-exit";

const markdown = new MarkdownExit();

const inlineText = (tokens: readonly Token[]): string => {
  let text = "";
  const links: (string | null)[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "text":
      case "code_inline":
      case "html_inline":
        text += token.content;
        break;
      case "image":
        text += token.children ? inlineText(token.children) : token.content;
        break;
      case "softbreak":
      case "hardbreak":
        text += "\n";
        break;
      case "link_open":
        links.push(token.attrGet("href"));
        break;
      case "link_close": {
        const href = links.pop();
        if (href) text += ` (${href})`;
        break;
      }
      default:
        break;
    }
  }
  return text;
};

/** Render Markdown for LSP clients that support only plain text. */
export function hoverPlaintext(source: string): string {
  let result = "";
  for (const token of markdown.parse(source)) {
    switch (token.type) {
      case "inline":
        result += inlineText(token.children ?? []);
        break;
      case "list_item_open":
        result += "- ";
        break;
      case "list_item_close":
        result += "\n";
        break;
      case "paragraph_close":
        if (!token.hidden) result += "\n\n";
        break;
      case "heading_close":
      case "bullet_list_close":
      case "ordered_list_close":
        result += "\n";
        break;
      case "fence":
      case "code_block":
      case "html_block":
        result += `${token.content}\n`;
        break;
      case "hr":
        result += "\n";
        break;
      default:
        break;
    }
  }
  return result.trim();
}
