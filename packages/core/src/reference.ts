import {
  ASTERISK_CHAR,
  BACKSLASH_CHAR,
  BRACE_CLOSE_CHAR,
  BRACE_OPEN_CHAR,
  BRACKET_CLOSE_CHAR,
  BRACKET_OPEN_CHAR,
  COLON_CHAR,
  FORWARD_SLASH_CHAR,
  PAREN_CLOSE_CHAR,
  PAREN_OPEN_CHAR,
  POUND_CHAR,
  QUOTE_DOUBLE_CHAR,
  QUOTE_SINGLE_CHAR,
} from "@cssdoc/regex";

import type { CssRecordKind } from "./model.ts";

/** Source or provider lookup scope for a record reference. */
export type ReferenceScope =
  | {
      /** Lookup across the consumer's workspace sources. */
      kind: "workspace";
    }
  | {
      /** Lookup in one workspace source. */
      kind: "source";
      /** Portable key identifying the workspace source. */
      sourceKey: string;
    }
  | {
      /** Lookup in a registered provider's sources. */
      kind: "provider";
      /** Consumer-side identifier of the provider. */
      providerId: string;
      /** Optional portable key restricting the lookup to one provider source. */
      sourceKey?: string;
    };

/** Member types accepted after a record reference. */
export type ReferenceMemberKind =
  | "modifier"
  | "part"
  | "wrapper"
  | "state"
  | "pseudo-element"
  | "csspart"
  | "slot"
  | "property"
  | "token"
  | "function"
  | "keyframes"
  | "layer"
  | "media"
  | "supports"
  | "container"
  | "scope";

/** A source-preserving structured record reference. */
export interface CssDocReference {
  /** Lookup scope, independent of the current machine's file paths. */
  scope: ReferenceScope;
  /** Optional record-kind qualifier. */
  kind?: CssRecordKind;
  /** Canonical record name. */
  name: string;
  /** Optional typed member and its authored CSS subject, including surrounding whitespace. */
  member?: {
    /** Surface type selected by the reference. */
    kind: ReferenceMemberKind;
    /** Authored CSS subject, including surrounding whitespace. */
    subject: string;
  };
}

/** Result of parsing a record reference. */
export type ReferenceParseResult =
  | {
      /** True when the reference framing and identity syntax are valid. */
      ok: true;
      /** Parsed reference with its authored member subject preserved. */
      reference: CssDocReference;
    }
  | {
      /** False when the reference cannot be parsed. */
      ok: false;
      /** Invalid reference syntax, source key, or provider identifier. */
      error: "invalid-reference" | "invalid-source-key" | "invalid-provider-id";
    };

const RECORD_NAME = /^[\w-]+(?:\.[\w-]+)*$/u;
const PROVIDER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const DRIVE_ROOT: RegExp = /^[A-Za-z]:\//u;
const MEMBER_KINDS: readonly ReferenceMemberKind[] = [
  "modifier",
  "part",
  "wrapper",
  "state",
  "pseudo-element",
  "csspart",
  "slot",
  "property",
  "token",
  "function",
  "keyframes",
  "layer",
  "media",
  "supports",
  "container",
  "scope",
];

function sourceKey(text: string): string | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
  if (
    typeof value !== "string" ||
    !value ||
    value.startsWith(FORWARD_SLASH_CHAR) ||
    value.includes(BACKSLASH_CHAR) ||
    DRIVE_ROOT.exec(value) !== null ||
    value.split(FORWARD_SLASH_CHAR).some((part) => !part || part === "." || part === "..")
  ) {
    return undefined;
  }
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return undefined;
  }
  return value;
}

function qualifierEnd(text: string, start: number): number | undefined {
  let quoted = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (escaped) escaped = false;
    else if (char === BACKSLASH_CHAR && quoted) escaped = true;
    else if (char === QUOTE_DOUBLE_CHAR) quoted = !quoted;
    else if (!quoted && char === PAREN_CLOSE_CHAR) return i;
  }
  return undefined;
}

function memberReference(text: string): CssDocReference["member"] | undefined {
  const open = text.indexOf(PAREN_OPEN_CHAR);
  if (open < 1) return undefined;
  const kind = MEMBER_KINDS.find((item) => item === text.slice(0, open));
  if (!kind) return undefined;
  const stack = [PAREN_OPEN_CHAR];
  let quote: string | undefined;
  let comment = false;
  let escaped = false;
  for (let i = open + 1; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (comment) {
      if (char === ASTERISK_CHAR && next === FORWARD_SLASH_CHAR) {
        comment = false;
        i++;
      }
    } else if (escaped) escaped = false;
    else if (char === BACKSLASH_CHAR) escaped = true;
    else if (quote) {
      if (char === quote) quote = undefined;
    } else if (char === QUOTE_SINGLE_CHAR || char === QUOTE_DOUBLE_CHAR) quote = char;
    else if (char === FORWARD_SLASH_CHAR && next === ASTERISK_CHAR) {
      comment = true;
      i++;
    } else if (char === PAREN_OPEN_CHAR || char === BRACKET_OPEN_CHAR || char === BRACE_OPEN_CHAR) {
      stack.push(char);
    } else if (
      char === PAREN_CLOSE_CHAR ||
      char === BRACKET_CLOSE_CHAR ||
      char === BRACE_CLOSE_CHAR
    ) {
      const expected =
        char === PAREN_CLOSE_CHAR
          ? PAREN_OPEN_CHAR
          : char === BRACKET_CLOSE_CHAR
            ? BRACKET_OPEN_CHAR
            : BRACE_OPEN_CHAR;
      if (stack.pop() !== expected) return undefined;
      if (stack.length === 0) {
        const subject = text.slice(open + 1, i);
        if (i !== text.length - 1 || (!subject.trim() && kind !== "slot" && kind !== "scope")) {
          return undefined;
        }
        return { kind, subject };
      }
    }
  }
  return undefined;
}

/**
 * Parse the shared record-reference shape, retaining member subjects for CSS-aware matching.
 *
 * This checks reference framing and identity syntax, not the CSS grammar of a member subject.
 *
 * @param input - Authored reference target.
 * @returns A structured reference or an explicit syntax error.
 */
export function parseReference(input: string): ReferenceParseResult {
  let text = input.trim();
  let scope: ReferenceScope = { kind: "workspace" };
  const sourcePrefix = `source${PAREN_OPEN_CHAR}`;
  const providerPrefix = `provider${PAREN_OPEN_CHAR}`;
  if (text.startsWith(sourcePrefix) || text.startsWith(providerPrefix)) {
    const provider = text.startsWith(providerPrefix);
    const prefix = provider ? providerPrefix : sourcePrefix;
    const close = qualifierEnd(text, prefix.length);
    if (close === undefined || text.slice(close + 1, close + 3) !== COLON_CHAR.repeat(2)) {
      return { ok: false, error: "invalid-reference" };
    }
    const argument = text.slice(prefix.length, close).trim();
    if (provider) {
      const comma = argument.indexOf(",");
      const id = (comma === -1 ? argument : argument.slice(0, comma)).trim();
      if (!PROVIDER_ID.test(id)) return { ok: false, error: "invalid-provider-id" };
      if (comma === -1) scope = { kind: "provider", providerId: id };
      else {
        const key = sourceKey(argument.slice(comma + 1).trim());
        if (key === undefined) return { ok: false, error: "invalid-source-key" };
        scope = { kind: "provider", providerId: id, sourceKey: key };
      }
    } else {
      const key = sourceKey(argument);
      if (key === undefined) return { ok: false, error: "invalid-source-key" };
      scope = { kind: "source", sourceKey: key };
    }
    text = text.slice(close + 3);
  }
  const hash = text.indexOf(POUND_CHAR);
  const record = hash === -1 ? text : text.slice(0, hash);
  const colon = record.indexOf(COLON_CHAR);
  const name = colon === -1 ? record : record.slice(colon + 1);
  const rawKind = colon === -1 ? undefined : record.slice(0, colon);
  if (
    !RECORD_NAME.test(name) ||
    (rawKind !== undefined &&
      rawKind !== "component" &&
      rawKind !== "utility" &&
      rawKind !== "declaration") ||
    (scope.kind !== "workspace" && rawKind === undefined)
  ) {
    return { ok: false, error: "invalid-reference" };
  }
  const member = hash === -1 ? undefined : memberReference(text.slice(hash + 1));
  if (hash !== -1 && !member) return { ok: false, error: "invalid-reference" };
  return {
    ok: true,
    reference: {
      scope,
      ...(rawKind === undefined ? {} : { kind: rawKind }),
      name,
      ...(member ? { member } : {}),
    },
  };
}
