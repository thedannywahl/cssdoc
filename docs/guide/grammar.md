---
aside: false
---

# Formal grammar

cssdoc's doc-comment syntax is defined by a formal, RFC-style specification written in
[grammarkdown](https://github.com/rbuckton/grammarkdown).
It's organized as a lexical grammar — characters, comment framing, tokens, and names — building toward a
syntactic grammar: the doc comment, its block tags, and the `CssReference` used inside inline `{@link}`
and `{@inheritDoc}` tags.

The grammar lives in `@cssdoc/spec` (alongside the canonical tag vocabulary) and is the source of truth
for the shape of a doc comment. The runtime parser in `@cssdoc/core` is hand-written; tests check the
grammar's validity and standard tag coverage alongside parser behavior. The parser also tolerates
malformed input and accepts unframed comment bodies, so parsing a string isn't a syntax-validity check.
grammarkdown is notation and validation only — it doesn't generate a parser.

The [pattern reference](./patterns) connects grammar productions to the regex patterns that implement
or approximate them.

## Entry points

- [DocComment](#production-doccomment) defines the comment's outer shape.
- [BlockTag](#production-blocktag) lists the productions for block and record tags.
- [CssReference](#production-cssreference) defines targets for inline references.
- [StructureTag](#production-structuretag) starts the grammar for authored DOM trees.

## Productions

<<< @/../packages/spec/grammar/CssDoc.grammarkdown{grammarkdown}
