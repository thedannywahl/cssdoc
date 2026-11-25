# What is cssdoc?

cssdoc turns your CSS and the comments beside it into documentation, editor hints, and lint checks.
Use it to explain how someone should use a component and which parts of its CSS they can customize.

[Document your first component](/guide/getting-started) or [try the Playground](/guide/playground).

## How it reads your CSS

Write a `/** … */` comment above a component's CSS. Use `@component` to name it and an optional `@summary` to
explain what it does. cssdoc reads the CSS syntax tree to find facts such as which modifiers the
component defines and which custom properties it uses. Your comments explain when to use those
modifiers or what changing those properties will do.

## What you can do with it

- [Generate documentation](/guide/emitters) from your stylesheet.
- [Export to other tools](/guide/generators), such as editors and design token pipelines.
- [Check your docs with a linter](/guide/linting) or [get hints in your editor](/guide/editor).
- [Document embedded CSS](/guide/embedded-css), such as styles in a Vue file or a tagged template.

Each workflow uses the same parsed model. See [Packages](/guide/packages) when you need to choose
what to install.
