# Grammar

cssdoc's doc-comment syntax is defined by a formal, RFC-style specification written in
[grammarkdown](https://github.com/rbuckton/grammarkdown), modeled on TSDoc's
[`DeclarationReference.grammarkdown`](https://github.com/microsoft/tsdoc/blob/main/tsdoc/src/beta/DeclarationReference.grammarkdown).
It's organized as a lexical grammar — characters, comment framing, tokens, and names — building toward a
syntactic grammar: the doc comment, its block tags, and the `CssReference` used inside inline `{@link}`
and `{@inheritDoc}` tags.

The grammar is the source of truth for the shape of a doc comment. The runtime parser in `@cssdoc/core`
is hand-written to conform to these productions, and a test validates the spec on every run, so the two
can't drift. grammarkdown is notation and validation only — it doesn't generate a parser.

In the notation, `::` marks a lexical production and `:` a syntactic one. Terminals are in backticks, and
`> …` lines are prose used for character classes and layout-sensitive constructs that sit outside
context-free notation.

<<< @/../packages/core/grammar/CssDoc.grammarkdown{text}
