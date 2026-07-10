---
aside: false
---

# Playground

Pick a **convention preset** to load a valid example bundle — component CSS, its `cssdoc.json`, and
sample consumer HTML — then edit any panel. The resolved model and lint findings update live, run
entirely in your browser with the same parser and linter cssdoc uses everywhere; nothing is sent
anywhere.

The editable `cssdoc.json` drives everything below it: its `modifierConvention` (BEM `.tabs--x`,
rscss `.tabs.-x`, bare `.tabs.x`), its `rules` severities, and its `naming` case. Change a rule to
`off`/`warn`/`error` and watch the findings shift.

<CssdocPlayground />

See the [Example](/guide/example) for a guided tour of this component, or
[Configuration](/guide/config) to tune conventions and rule severities.
