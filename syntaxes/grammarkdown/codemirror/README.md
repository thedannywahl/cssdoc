# @cssdoc/grammarkdown-codemirror

A [CodeMirror 6](https://codemirror.net) highlighter for grammarkdown, the grammar notation used by
cssdoc. It uses the patterns in [`@cssdoc/grammarkdown-tmlanguage`](../tmlanguage).

## Install

```sh
npm add @cssdoc/grammarkdown-codemirror codemirror
```

## Use

```ts
import { grammarkdownHighlight } from "@cssdoc/grammarkdown-codemirror";
import { EditorView, basicSetup } from "codemirror";

new EditorView({
  extensions: [basicSetup, grammarkdownHighlight()],
  parent: document.body,
});
```

The extension highlights grammar documents without another language extension. It supplies light and
dark base themes; override tokens using `.cm-grammarkdown-<kind>` classes.

| Kind                                       | Examples                         |
| ------------------------------------------ | -------------------------------- |
| `production`, `nonterminal`                | `Source` in `Source : Item`      |
| `parameter`, `punct`, `operator`           | `[Yield]`, `:`, `?`              |
| `terminal`, `character-class`, `codepoint` | `` `if` ``, `<letter>`, `U+0041` |
| `keyword`, `directive`                     | `one of`, `@define`              |
| `comment`, `prose`                         | `// comment`, `> prose`          |

`tokenizeGrammarkdown(text)` also returns token kinds and offsets without creating an editor.
