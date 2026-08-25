# Changelog

All notable changes to the cssdoc packages are recorded here. Entries are generated from
[Conventional Commits](https://www.conventionalcommits.org/) by changelogen at release time
(`vp run release`). All packages share one version.

## v0.14.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.12...v0.14.0)

### 🩹 Fixes

- Pin @types/vscode to version 1.125.0 ([971bd54](https://github.com/thedannywahl/cssdoc/commit/971bd54))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.12

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.11...v0.13.12)

### 🚀 Enhancements

- Add sync-schema script and update build command to include fix option ([523a5a5](https://github.com/thedannywahl/cssdoc/commit/523a5a5))

### 🩹 Fixes

- Remove orphaned scripts/sync-schema.d.ts causing flaky formatting check ([df350b6](https://github.com/thedannywahl/cssdoc/commit/df350b6))
- Update CI workflow to run checks with --fix option for formatting and linting ([788d49b](https://github.com/thedannywahl/cssdoc/commit/788d49b))
- Remove redundant sync-schema.d.ts, revert ineffective --fix workaround ([f71f90f](https://github.com/thedannywahl/cssdoc/commit/f71f90f))
- Ignore scripts/sync-schema.d.ts in oxfmt ([0584053](https://github.com/thedannywahl/cssdoc/commit/0584053))

### 🤖 CI

- Re-run with cleared build cache ([52d71a8](https://github.com/thedannywahl/cssdoc/commit/52d71a8))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.11

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.10...v0.13.11)

### 🏡 Chore

- Update setup-vp action to v1.18.0 in CI workflows ([bbc631d](https://github.com/thedannywahl/cssdoc/commit/bbc631d))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.10

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.9...v0.13.10)

### 🚀 Enhancements

- Add prefix rewriting support for provider base-class names ([b896e8a](https://github.com/thedannywahl/cssdoc/commit/b896e8a))

### 🩹 Fixes

- Add git push command to release process ([4b874c6](https://github.com/thedannywahl/cssdoc/commit/4b874c6))
- Import ProviderRef type for enhanced provider resolution ([2737c66](https://github.com/thedannywahl/cssdoc/commit/2737c66))
- Correct formatting in config documentation and schema description ([8f35c62](https://github.com/thedannywahl/cssdoc/commit/8f35c62))

### 🏡 Chore

- Update dependencies ([a4af218](https://github.com/thedannywahl/cssdoc/commit/a4af218))
- **fmt:** Format package and workspace ([713263f](https://github.com/thedannywahl/cssdoc/commit/713263f))
- Update TypeScript version and add new dependencies ([966ac10](https://github.com/thedannywahl/cssdoc/commit/966ac10))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.9

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.8...v0.13.9)

### 🚀 Enhancements

- Enhance index merging to support non-BEM modifiers ([ce01b60](https://github.com/thedannywahl/cssdoc/commit/ce01b60))

### 💅 Refactors

- Format index merging for improved readability ([e3cb087](https://github.com/thedannywahl/cssdoc/commit/e3cb087))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.8

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.7...v0.13.8)

### 🚀 Enhancements

- Enhance modifier recognition for `&` in @scope ([5aeba50](https://github.com/thedannywahl/cssdoc/commit/5aeba50))

### 🩹 Fixes

- Update scopeName from "documentation.cssdoc" to "text.cssdoc" ([e45b432](https://github.com/thedannywahl/cssdoc/commit/e45b432))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.7

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.6...v0.13.7)

### 🩹 Fixes

- Correct typo in config file names from "csddoc" to "cssdoc" ([674968e](https://github.com/thedannywahl/cssdoc/commit/674968e))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.6

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.5...v0.13.6)

### 🚀 Enhancements

- **provider:** Add options for provider resolution and enhance config discovery ([302aabc](https://github.com/thedannywahl/cssdoc/commit/302aabc))

### 💅 Refactors

- **provider:** Simplify provider path resolution and remove glob expansion logic ([2340fc1](https://github.com/thedannywahl/cssdoc/commit/2340fc1))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.5

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.4...v0.13.5)

### 🚀 Enhancements

- **structure:** Enhance `@component` and `@member` references with cardinality support ([b125d1d](https://github.com/thedannywahl/cssdoc/commit/b125d1d))

### 💅 Refactors

- **tests:** Simplify test case for @component rendering in toMermaid ([e347e96](https://github.com/thedannywahl/cssdoc/commit/e347e96))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.4

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.3...v0.13.4)

### 🚀 Enhancements

- **structure:** Add support for parent-side member declarations ([bc4909a](https://github.com/thedannywahl/cssdoc/commit/bc4909a))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.3

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.2...v0.13.3)

### 🚀 Enhancements

- Streamline publish scripts and improve CI ENV handling ([8593221](https://github.com/thedannywahl/cssdoc/commit/8593221))
- Enhance linting rules for @affects modifiers and update tests ([c5580d9](https://github.com/thedannywahl/cssdoc/commit/c5580d9))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.2

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.1...v0.13.2)

### 🚀 Enhancements

- Add support for alias modifiers with canonical mapping and update related schema ([d7bd8f4](https://github.com/thedannywahl/cssdoc/commit/d7bd8f4))
- Add descriptions to CSSDoc tags for improved editor completions ([8a35af1](https://github.com/thedannywahl/cssdoc/commit/8a35af1))
- Enhance editor support with quick suggestions for various languages ([c26413e](https://github.com/thedannywahl/cssdoc/commit/c26413e))
- **vscode:** Update configurationDefaults for improved quick suggestions in multiple languages ([8646b88](https://github.com/thedannywahl/cssdoc/commit/8646b88))

### 🩹 Fixes

- **vscode:** Pass the OVSX_PAT token explicitly to ovsx publish ([a331a9c](https://github.com/thedannywahl/cssdoc/commit/a331a9c))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.13.0...v0.13.1)

### 🚀 Enhancements

- **tmlanguage:** Highlight dotted @component names ([359d3cc](https://github.com/thedannywahl/cssdoc/commit/359d3cc))
- **spec,core:** Add @members tag ([5a34dd2](https://github.com/thedannywahl/cssdoc/commit/5a34dd2))
- **providers,lint-core,markdown:** Validate and render @members ([44279e9](https://github.com/thedannywahl/cssdoc/commit/44279e9))

### 🩹 Fixes

- **codemirror:** Highlight record names, including dotted ones ([3794e84](https://github.com/thedannywahl/cssdoc/commit/3794e84))
- **core:** Don't flag a memberOf record's own base class as an undocumented part in a parent @scope ([234f422](https://github.com/thedannywahl/cssdoc/commit/234f422))

### 🏡 Chore

- **docs,schema:** Document and schema-sync @members and dotted @memberOf inference ([89e75bf](https://github.com/thedannywahl/cssdoc/commit/89e75bf))
- Fix formatting ([53dd7f0](https://github.com/thedannywahl/cssdoc/commit/53dd7f0))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.13.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.12.0...v0.13.0)

### 🚀 Enhancements

- **core:** Support attribute-reflected cssstate for ARIA/data-* state hooks ([35e4172](https://github.com/thedannywahl/cssdoc/commit/35e4172))
- **structure:** Resolve every alternative in a comma-separated @structure selector list ([40e6641](https://github.com/thedannywahl/cssdoc/commit/40e6641))
- **structure:** Add @memberOf for declared sub-component family membership ([9392ae0](https://github.com/thedannywahl/cssdoc/commit/9392ae0))
- **modifier:** Add @affects inline marker for cross-record modifier effects ([e324a15](https://github.com/thedannywahl/cssdoc/commit/e324a15))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.12.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.11.0...v0.12.0)

### 🚀 Enhancements

- Add global modifier support and precedence model for CSS documentation ([88f5d3c](https://github.com/thedannywahl/cssdoc/commit/88f5d3c))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.11.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.10.2...v0.11.0)

### 🚀 Enhancements

- Enhance documentation tracking for modifiers and parts with line spans ([0db7292](https://github.com/thedannywahl/cssdoc/commit/0db7292))
- Add support for @interaction markers in modifiers, exempting them from CSS checks ([914ac64](https://github.com/thedannywahl/cssdoc/commit/914ac64))
- Add support for @variant blocks in @structure to enhance component documentation ([0f51a24](https://github.com/thedannywahl/cssdoc/commit/0f51a24))
- Mask template literal interpolations in scanClassUsages to preserve static prefixes ([829e834](https://github.com/thedannywahl/cssdoc/commit/829e834))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.10.2

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.10.1...v0.10.2)

### 🚀 Enhancements

- **prose:** Add normalizeProseMarkdown function and update renderEntry to use it ([b9847bb](https://github.com/thedannywahl/cssdoc/commit/b9847bb))

### 🩹 Fixes

- **tests:** Format multiline expectations for remarks and accessibility ([49804a0](https://github.com/thedannywahl/cssdoc/commit/49804a0))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.10.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.10.0...v0.10.1)

### 🚀 Enhancements

- **core:** Add StructureNode.colocated; parse and classify :is() co-location ([3188a17](https://github.com/thedannywahl/cssdoc/commit/3188a17))
- **providers:** Lint and hover for :is() co-located structure nodes ([ec96ecc](https://github.com/thedannywahl/cssdoc/commit/ec96ecc))
- **markdown:** Render :is() co-located nodes in text tree and Subcomponents ([37fb0bf](https://github.com/thedannywahl/cssdoc/commit/37fb0bf))
- **json:** Add colocated property to StructureNode schema ([901d6c2](https://github.com/thedannywahl/cssdoc/commit/901d6c2))

### 📖 Documentation

- **layouts:** Add co-located component section for :is() syntax ([7526f75](https://github.com/thedannywahl/cssdoc/commit/7526f75))
- **layouts:** Clarify co-located component containment and usage of :is() pseudo ([daa2a2e](https://github.com/thedannywahl/cssdoc/commit/daa2a2e))

### 🏡 Chore

- Bump deps ([a60f03b](https://github.com/thedannywahl/cssdoc/commit/a60f03b))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.10.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.9.0...v0.10.0)

### 🚀 Enhancements

- Add coverage directory to .gitignore ([bd82044](https://github.com/thedannywahl/cssdoc/commit/bd82044))
- **core:** Add @layout record kind and implicit structure inference ([b94e6e7](https://github.com/thedannywahl/cssdoc/commit/b94e6e7))
- **providers:** Add layout/structure/element diagnostics ([3f69c6e](https://github.com/thedannywahl/cssdoc/commit/3f69c6e))
- **config:** Add layout kind and new diagnostic rule IDs to schema ([2d6ff70](https://github.com/thedannywahl/cssdoc/commit/2d6ff70))
- **core:** Add custom-media profile syntax and declaration builder ([0aae85c](https://github.com/thedannywahl/cssdoc/commit/0aae85c))
- **syntax:** Add at-rule injection grammar for cssdoc structure refs ([0e0d7f9](https://github.com/thedannywahl/cssdoc/commit/0e0d7f9))
- **spec:** Add @stable modifier tag ([1746a38](https://github.com/thedannywahl/cssdoc/commit/1746a38))
- **markdown:** Add includeAnnotations and includeDecorators render options ([c139421](https://github.com/thedannywahl/cssdoc/commit/c139421))

### 📖 Documentation

- Add layouts guide and update authoring/config/linting docs ([bea8d14](https://github.com/thedannywahl/cssdoc/commit/bea8d14))

### 🏡 Chore

- **examples:** Demonstrate layouts, annotations, refs, decorators, @stable ([9c36191](https://github.com/thedannywahl/cssdoc/commit/9c36191))
- Update pnpm lockfile and workspace config ([4cdb648](https://github.com/thedannywahl/cssdoc/commit/4cdb648))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.9.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.8.1...v0.9.0)

### 🚀 Enhancements

- **core:** Add annotations/refs parsing and decorator lint semantics ([9134f9e](https://github.com/thedannywahl/cssdoc/commit/9134f9e))
- **config:** Add strict rule keys and ruleOptions support ([bf3b542](https://github.com/thedannywahl/cssdoc/commit/bf3b542))
- **emitters:** Render annotations and refs across outputs ([740cdd5](https://github.com/thedannywahl/cssdoc/commit/740cdd5))

### 💅 Refactors

- Clean up code formatting and improve readability in multiple files ([5d7bdf6](https://github.com/thedannywahl/cssdoc/commit/5d7bdf6))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.8.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.8.0...v0.8.1)

### 🚀 Enhancements

- Enhance @part handling for descendant chains and aliasing in parser ([52c1ba1](https://github.com/thedannywahl/cssdoc/commit/52c1ba1))

### 📖 Documentation

- Update authoring guide and grammar for @modifier and @wrapper tags ([d1054e4](https://github.com/thedannywahl/cssdoc/commit/d1054e4))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.8.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.10...v0.8.0)

### 🚀 Enhancements

- **spec,core:** ⚠️  Add @selector tag; deprecate @class as alias ([cacb9c4](https://github.com/thedannywahl/cssdoc/commit/cacb9c4))
- **core,index,providers:** ⚠️  @part accepts non-class selectors with optional alias ([8ee0008](https://github.com/thedannywahl/cssdoc/commit/8ee0008))
- **core,markdown:** ParseStructure handles @scope at-rules as scope-boundary StructureNodes ([7068b00](https://github.com/thedannywahl/cssdoc/commit/7068b00))

### 🩹 Fixes

- Add missing image to README for better visibility ([4a56ee5](https://github.com/thedannywahl/cssdoc/commit/4a56ee5))
- **providers:** Correct name-not-in-css false positive for attribute-selector @part ([b7ddb4d](https://github.com/thedannywahl/cssdoc/commit/b7ddb4d))
- **index:** Recurse into nested CSS rule nodes in scanNodes ([f6e7980](https://github.com/thedannywahl/cssdoc/commit/f6e7980))
- **core:** Recurse into nested CSS rule nodes in collect ([474f372](https://github.com/thedannywahl/cssdoc/commit/474f372))
- **language-server:** Guard createIndex in rebuild() against PostCSS parse errors ([63c7383](https://github.com/thedannywahl/cssdoc/commit/63c7383))

### 💅 Refactors

- **parse:** Improve code readability with consistent formatting ([d4063e1](https://github.com/thedannywahl/cssdoc/commit/d4063e1))

### 📖 Documentation

- Comprehensive docs sweep for @selector, @part, @scope, and CSS nesting ([0234869](https://github.com/thedannywahl/cssdoc/commit/0234869))
- **examples:** Replace pendo-specific example with generic x-banner web component ([c6e35f8](https://github.com/thedannywahl/cssdoc/commit/c6e35f8))

#### ⚠️ Breaking Changes

- **spec,core:** ⚠️  Add @selector tag; deprecate @class as alias ([cacb9c4](https://github.com/thedannywahl/cssdoc/commit/cacb9c4))
- **core,index,providers:** ⚠️  @part accepts non-class selectors with optional alias ([8ee0008](https://github.com/thedannywahl/cssdoc/commit/8ee0008))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.10

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.9...v0.7.10)

### 🩹 Fixes

- **scope:** Correct scopeName to match CSS documentation standards ([4246fa6](https://github.com/thedannywahl/cssdoc/commit/4246fa6))
- Standardize quotes in minimumReleaseAgeExclude section ([a9b5cc2](https://github.com/thedannywahl/cssdoc/commit/a9b5cc2))

### 🏡 Chore

- Update dependencies ([8ed8651](https://github.com/thedannywahl/cssdoc/commit/8ed8651))

### ✅ Tests

- Add regression tests for TSDoc comment handling in CSS projection ([08ac979](https://github.com/thedannywahl/cssdoc/commit/08ac979))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.9

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.8...v0.7.9)

### 🚀 Enhancements

- Enhance modifier name grammar with suffix, chained, and attribute forms ([5719ac7](https://github.com/thedannywahl/cssdoc/commit/5719ac7))
- Enhance Vite configuration to ignore worktree directories in linting and formatting ([dee5e7a](https://github.com/thedannywahl/cssdoc/commit/dee5e7a))
- **markdown:** Group sidebar and index by @group, not only by record kind ([231c242](https://github.com/thedannywahl/cssdoc/commit/231c242))
- **config:** Add render.groups for explicit sidebar group order ([083dfc7](https://github.com/thedannywahl/cssdoc/commit/083dfc7))
- **typedoc:** Forward groups through the emit path ([187cdb5](https://github.com/thedannywahl/cssdoc/commit/187cdb5))

### 🩹 Fixes

- Exclude engineering-log.md from src processing ([87fc762](https://github.com/thedannywahl/cssdoc/commit/87fc762))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.8

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.7...v0.7.8)

### ✅ Tests

- Add tests for TypeScript config command globs handling in diagnostics, hover, and definition ([3f67a3b](https://github.com/thedannywahl/cssdoc/commit/3f67a3b))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.7

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.6...v0.7.7)

### 🩹 Fixes

- **embedded:** Ignore comment-like globs ([d9b839b](https://github.com/thedannywahl/cssdoc/commit/d9b839b))

### 📖 Documentation

- Add AGENTS.md and engineering log ([fc1e890](https://github.com/thedannywahl/cssdoc/commit/fc1e890))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.6

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.5...v0.7.6)

### 🩹 Fixes

- **vscode:** Serialize and debounce client restarts to stop server leak ([f771578](https://github.com/thedannywahl/cssdoc/commit/f771578))
- **core:** Accept upper-case and PascalCase base classes in inference ([47f85bf](https://github.com/thedannywahl/cssdoc/commit/47f85bf))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.5

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.4...v0.7.5)

### 🩹 Fixes

- **render:** Wrap only the marker word in classNames spans, not the prose ([3c24ec8](https://github.com/thedannywahl/cssdoc/commit/3c24ec8))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.4

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.3...v0.7.4)

### 🩹 Fixes

- **parse:** Improve class name resolution for masked prefixes in bare rules ([4d14bb0](https://github.com/thedannywahl/cssdoc/commit/4d14bb0))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.3

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.2...v0.7.3)

### 🩹 Fixes

- **typedoc:** Forward classNames through emitCssApi to the renderer ([747df10](https://github.com/thedannywahl/cssdoc/commit/747df10))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.2

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.1...v0.7.2)

### 🚀 Enhancements

- **render:** Add classNames option for customizable styling of deprecation and release-stage markers ([f9125fe](https://github.com/thedannywahl/cssdoc/commit/f9125fe))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.7.0...v0.7.1)

### 🚀 Enhancements

- **schema:** Enhance JSON schema structure and add sync script for consistency ([736eb0e](https://github.com/thedannywahl/cssdoc/commit/736eb0e))

### 🏡 Chore

- Update dependencies in pnpm-workspace.yaml ([d0dd182](https://github.com/thedannywahl/cssdoc/commit/d0dd182))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.7.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.6.1...v0.7.0)

### 🚀 Enhancements

- **config:** Providers field + resolveProviders (cross-provider consumption, phase 1) ([fa86349](https://github.com/thedannywahl/cssdoc/commit/fa86349))
- **language-server,lint-core,plugins:** Consume providers in lint + hover (phase 2) ([9f36457](https://github.com/thedannywahl/cssdoc/commit/9f36457))
- **markdown:** Cross-link provider components in generated docs (phase 3) ([4a939a3](https://github.com/thedannywahl/cssdoc/commit/4a939a3))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.6.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.6.0...v0.6.1)

### 🩹 Fixes

- **core,providers:** Render @wrapper prose in the mermaid diagram and the hover ([78735f9](https://github.com/thedannywahl/cssdoc/commit/78735f9))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.6.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.5.4...v0.6.0)

### 🚀 Enhancements

- **index,providers,language-server:** Resolve var() chains + attribute-selector & cross-component hover ([c2cb0aa](https://github.com/thedannywahl/cssdoc/commit/c2cb0aa))
- **core,index,providers,emitters:** Document native pseudo-elements (@pseudo + derivation) ([4ad1d57](https://github.com/thedannywahl/cssdoc/commit/4ad1d57))
- **core,config,providers:** Inline-comment prose, inlineComments mode, and @todo ([8f7f775](https://github.com/thedannywahl/cssdoc/commit/8f7f775))
- **core,providers,emitters:** Optional-ancestor wrappers in @structure (+ @wrapper prose) ([f45040a](https://github.com/thedannywahl/cssdoc/commit/f45040a))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.5.4

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.5.3...v0.5.4)

### 🚀 Enhancements

- **core,providers,markdown:** Markdown @example (prose + fenced code) ([32ab62e](https://github.com/thedannywahl/cssdoc/commit/32ab62e))

### 🩹 Fixes

- **dependencies:** Update postcss version to ^8.5.19 in lockfile and workspace ([21ed041](https://github.com/thedannywahl/cssdoc/commit/21ed041))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.5.3

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.5.2...v0.5.3)

### 🩹 Fixes

- **providers,language-server:** Full hover card on empty sectionOrder; unmask card interpolations ([1c87df9](https://github.com/thedannywahl/cssdoc/commit/1c87df9))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.5.2

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.5.1...v0.5.2)

### 🚀 Enhancements

- **structure:** Mirror the flowchart's classification in the text tree ([1009627](https://github.com/thedannywahl/cssdoc/commit/1009627))
- **config:** Render.structureView to choose text / diagram / both ([6fa6e71](https://github.com/thedannywahl/cssdoc/commit/6fa6e71))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.5.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.5.0...v0.5.1)

### 🚀 Enhancements

- **mermaid:** Render `@structure` as a classified, cardinality-aware flowchart ([df34e2d](https://github.com/thedannywahl/cssdoc/commit/df34e2d))

### 🩹 Fixes

- **providers,language-server:** Recognize cross-file @structure siblings and unmask interpolations ([73b9ec7](https://github.com/thedannywahl/cssdoc/commit/73b9ec7))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.5.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.4.2...v0.5.0)

### 🚀 Enhancements

- **docs:** Add social card and Open Graph/Twitter meta for link unfurling ([9919257](https://github.com/thedannywahl/cssdoc/commit/9919257))
- **docs:** Flesh out meta tags — longer description, Twitter, JSON-LD ([7bf4dcd](https://github.com/thedannywahl/cssdoc/commit/7bf4dcd))
- **core:** Add parse-free @cssdoc/core/lite entry (no postcss) ([321c388](https://github.com/thedannywahl/cssdoc/commit/321c388))
- **providers:** Make name-not-in-css attribute-aware; add * wildcards, exempt deprecated ([70f43cf](https://github.com/thedannywahl/cssdoc/commit/70f43cf))
- **core:** Derive `*` family modifiers from [class*=…] selectors ([1ec0cb3](https://github.com/thedannywahl/cssdoc/commit/1ec0cb3))
- **index:** Resolve concrete usages to `*` family modifiers ([b94b0ec](https://github.com/thedannywahl/cssdoc/commit/b94b0ec))
- **config,markdown,plugins:** Drive docs render + lint from cssdoc.json ([e4e2183](https://github.com/thedannywahl/cssdoc/commit/e4e2183))
- **core:** @structure cardinality (:card) and slot content nodes ([333bb2e](https://github.com/thedannywahl/cssdoc/commit/333bb2e))
- **providers:** Accept sibling components as @structure children ([e28ba80](https://github.com/thedannywahl/cssdoc/commit/e28ba80))
- **markdown:** Render @structure content, cardinality, and a Subcomponents list ([0a4b47a](https://github.com/thedannywahl/cssdoc/commit/0a4b47a))
- **structure:** Add `:opt` and `:more` cardinality shorthands ([ba37525](https://github.com/thedannywahl/cssdoc/commit/ba37525))

### 🩹 Fixes

- **docs:** Add image to Schema.org JSON-LD ([20b2ec5](https://github.com/thedannywahl/cssdoc/commit/20b2ec5))

### 💅 Refactors

- **structure:** Use word pseudos for cardinality (:optional/:many/:one-or-more) ([b078c4e](https://github.com/thedannywahl/cssdoc/commit/b078c4e))

### 📖 Documentation

- **spec:** Document * wildcard families and name-not-in-css matching ([7a65b74](https://github.com/thedannywahl/cssdoc/commit/7a65b74))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.4.2

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.4.1...v0.4.2)

### 🩹 Fixes

- **docs:** Add title to Playground documentation ([61ddc80](https://github.com/thedannywahl/cssdoc/commit/61ddc80))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.4.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.4.0...v0.4.1)

### 🚀 Enhancements

- **providers:** Add a reason suffix to suppression directives ([49f8e6a](https://github.com/thedannywahl/cssdoc/commit/49f8e6a))
- **eslint:** Check dynamic class bindings in valid-class-usage ([90b6ca5](https://github.com/thedannywahl/cssdoc/commit/90b6ca5))
- **hover:** Link property syntaxes to MDN and make section order configurable ([c4c2505](https://github.com/thedannywahl/cssdoc/commit/c4c2505))

### 🩹 Fixes

- **core:** Export CssSource/CssTokenConsumed/CssRelated; fix docs interpolation ([b906ee2](https://github.com/thedannywahl/cssdoc/commit/b906ee2))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.4.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.3.3...v0.4.0)

### 🚀 Enhancements

- **spec:** Add @tokens, @usage, @compat, and @related tags ([592c714](https://github.com/thedannywahl/cssdoc/commit/592c714))
- **core:** ⚠️ Enrich consumed tokens and add usage/compat/related/source ([1911c00](https://github.com/thedannywahl/cssdoc/commit/1911c00))
- **markdown:** Add usage, browser-support, related, and source surfaces ([5a486c2](https://github.com/thedannywahl/cssdoc/commit/5a486c2))
- **json:** ⚠️ Emit consumed tokens as objects; add usage/compat/related/source ([b4529fe](https://github.com/thedannywahl/cssdoc/commit/b4529fe))
- **typedoc:** Thread resolveSource, importSnippet, and sectionOrder options ([c98240f](https://github.com/thedannywahl/cssdoc/commit/c98240f))

### 🩹 Fixes

- **docs:** Render consumed tokens by name in the playground ([6c933e7](https://github.com/thedannywahl/cssdoc/commit/6c933e7))

### 📖 Documentation

- Document the new tags and markdown emitter options ([5b1b195](https://github.com/thedannywahl/cssdoc/commit/5b1b195))

### 🏡 Chore

- **tmlanguage:** Regenerate injection grammar for the new tags ([f30b0a4](https://github.com/thedannywahl/cssdoc/commit/f30b0a4))
- Update postcss and eslint versions to 8.5.17 and 10.7.0 respectively ([8184981](https://github.com/thedannywahl/cssdoc/commit/8184981))

#### ⚠️ Breaking Changes

- **core:** ⚠️ Enrich consumed tokens and add usage/compat/related/source ([1911c00](https://github.com/thedannywahl/cssdoc/commit/1911c00))
- **json:** ⚠️ Emit consumed tokens as objects; add usage/compat/related/source ([b4529fe](https://github.com/thedannywahl/cssdoc/commit/b4529fe))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.3.3

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.3.2...v0.3.3)

### 🩹 Fixes

- Edge cases for VS Code plugin ([ee2aeee](https://github.com/thedannywahl/cssdoc/commit/ee2aeee))
- Update playground instructions for clarity and usability ([157daf9](https://github.com/thedannywahl/cssdoc/commit/157daf9))

### 🏡 Chore

- Update dependencies for CodeMirror packages ([d66d9e2](https://github.com/thedannywahl/cssdoc/commit/d66d9e2))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.3.2

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.3.1...v0.3.2)

### 🏡 Chore

- Add vitepress-plugin-llms to pnpm workspace catalog ([9c70458](https://github.com/thedannywahl/cssdoc/commit/9c70458))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.3.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.3.0...v0.3.1)

### 🩹 Fixes

- Esm calls in VS Code server bundle ([14d885c](https://github.com/thedannywahl/cssdoc/commit/14d885c))
- Add css-tree shim for improved compatibility with bundled builds ([a26c658](https://github.com/thedannywahl/cssdoc/commit/a26c658))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.3.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.2.0...v0.3.0)

### 🚀 Enhancements

- **core:** Allow an array of modifier separators ([6ce8e45](https://github.com/thedannywahl/cssdoc/commit/6ce8e45))
- **lint:** Add configurable name-case rules for class names ([b533e81](https://github.com/thedannywahl/cssdoc/commit/b533e81))
- **language-server:** Per-package cssdoc.json config with live reload ([8597b32](https://github.com/thedannywahl/cssdoc/commit/8597b32))
- Enhance CodeEditor and playground with improved linting rules and configurations ([9762c0c](https://github.com/thedannywahl/cssdoc/commit/9762c0c))
- Add @cssdoc/codemirror extension for highlighting cssdoc tags in CSS comments ([6090d0e](https://github.com/thedannywahl/cssdoc/commit/6090d0e))
- Add grammar specification and validation test for CssDoc ([6ce8f00](https://github.com/thedannywahl/cssdoc/commit/6ce8f00))
- Add support for jsonc configuration files and enhance modifier conventions ([c70693c](https://github.com/thedannywahl/cssdoc/commit/c70693c))
- Refactor HTML generation in presets and add TypeScript configuration ([ddc4972](https://github.com/thedannywahl/cssdoc/commit/ddc4972))
- Enhance CSS documentation with shadow parts and native pseudo-class states ([8d207fb](https://github.com/thedannywahl/cssdoc/commit/8d207fb))
- Enhance modifier and part handling in CSS documentation and diagnostics ([94e9da7](https://github.com/thedannywahl/cssdoc/commit/94e9da7))
- Enhance @structure support with nested CSS and description handling ([2b10772](https://github.com/thedannywahl/cssdoc/commit/2b10772))
- Add support for @structure highlighting in CSS documentation ([59b33e9](https://github.com/thedannywahl/cssdoc/commit/59b33e9))
- Add DEFAULT_STATE_PSEUDO_CLASSES export to index ([3b5e15e](https://github.com/thedannywahl/cssdoc/commit/3b5e15e))
- **embedded:** Add @cssdoc/embedded package for extracting CSS from various sources ([eb9d6de](https://github.com/thedannywahl/cssdoc/commit/eb9d6de))
- Add support for SCSS and Less dialects in cssdoc ([0249f47](https://github.com/thedannywahl/cssdoc/commit/0249f47))
- Add class usage scanning for JSX, Vue, and Svelte templates ([eb3fec6](https://github.com/thedannywahl/cssdoc/commit/eb3fec6))
- Implement cssdoc comment directives for inline suppression and error expectations ([f8c2b22](https://github.com/thedannywahl/cssdoc/commit/f8c2b22))
- Update documentation and package structure for improved clarity and usability ([80c93c8](https://github.com/thedannywahl/cssdoc/commit/80c93c8))

### 🩹 Fixes

- **changelog:** Update version from v0.1.0 to v0.2.0 ([b406332](https://github.com/thedannywahl/cssdoc/commit/b406332))
- **docs:** Publish cssdoc.schema.json to the docs site ([1eafbb0](https://github.com/thedannywahl/cssdoc/commit/1eafbb0))

### 💅 Refactors

- **release-changelog:** Remove unused changelog cleaning logic ([e0afc1f](https://github.com/thedannywahl/cssdoc/commit/e0afc1f))
- Simplify and clarify comments in CssDoc grammar specification ([edbe53c](https://github.com/thedannywahl/cssdoc/commit/edbe53c))

### 📖 Documentation

- Add Example + Playground reference pages ([ea51b15](https://github.com/thedannywahl/cssdoc/commit/ea51b15))

### 📦 Build

- Move root package.json scripts to vite.config.ts tasks ([7101ff2](https://github.com/thedannywahl/cssdoc/commit/7101ff2))

### 🤖 CI

- **release:** Title changelog sections by version, not the compare range ([782bf3e](https://github.com/thedannywahl/cssdoc/commit/782bf3e))
- **release:** Title changelog by version and drop the compare-changes line ([0c0c35e](https://github.com/thedannywahl/cssdoc/commit/0c0c35e))
- Use the setup-vp action instead of pnpm exec ([e20a988](https://github.com/thedannywahl/cssdoc/commit/e20a988))
- **docs:** Deploy docs on a successful release, not on every push ([4224e27](https://github.com/thedannywahl/cssdoc/commit/4224e27))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.2.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.1.0...main)

### 🚀 Enhancements

- **vscode:** Auto-detect documented CSS with include/exclude globs ([a562183](https://github.com/thedannywahl/cssdoc/commit/a562183))
- **core:** ⚠️ Configurable modifier convention ([a705fd3](https://github.com/thedannywahl/cssdoc/commit/a705fd3))

### 📖 Documentation

- Rewrite the VS Code extension README for consumers + add install links ([d40d528](https://github.com/thedannywahl/cssdoc/commit/d40d528))

### 🤖 CI

- **release:** Make extension publishing resilient ([05bf62c](https://github.com/thedannywahl/cssdoc/commit/05bf62c))
- **release:** Switch npm publish to OIDC trusted publishing ([8fe9e9d](https://github.com/thedannywahl/cssdoc/commit/8fe9e9d))

#### ⚠️ Breaking Changes

- **core:** ⚠️ Configurable modifier convention ([a705fd3](https://github.com/thedannywahl/cssdoc/commit/a705fd3))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.1.0

The first public release of cssdoc — TSDoc, for CSS. You write structured `/** … */` doc comments above
your CSS; cssdoc parses those comments _plus the stylesheet itself_ into a serializable model, and a
family of small packages turns that model into documentation, standard-format exports, lint rules, and
editor IntelliSense. The machine facts — base classes, `-modifier` families, parts, registered custom
properties, functions, keyframes, layers, and conditions — are read from the actual selectors and
at-rules, so the docs can't drift from what ships.

### Core

- **`@cssdoc/core`** — the parser and model. An AST-first extractor over doc comments and the PostCSS
  tree, with an expansive, TSDoc-modeled tag vocabulary (record, block, modifier, and inline tags)
  covering the modern CSSOM surface. The doc-comment grammar is defined by a formal grammarkdown spec.
- **`@cssdoc/config`** — loads and validates a `cssdoc.json` (custom tags, `extends` chains), the way
  `@microsoft/tsdoc-config` configures TSDoc.
- **`@cssdoc/index`** — a queryable semantic index over the model, with source spans and a host-agnostic
  usage abstraction shared by the linters and the language server.

### Emitters

- **`@cssdoc/markdown`** — renders the model to Markdown pages plus a sidebar.
- **`@cssdoc/html`** — a standalone HTML reference.
- **`@cssdoc/json`** — the model as JSON, with a JSON Schema.
- **`@cssdoc/llms`** — an `llms.txt`-style digest.

### Standard-format generators

- **`@cssdoc/vscode-custom-data`**, **`@cssdoc/cem`** (Custom Elements Manifest), and **`@cssdoc/dtcg`**
  (W3C Design Tokens) — export the model into the formats other tools already understand.

### Linting

- **`@cssdoc/lint-core`** with **`@cssdoc/stylelint-plugin`** and **`@cssdoc/eslint-plugin`** — one shared
  rule core, two linters. Three kinds of check:
  - doc-comment hygiene (missing summaries, undocumented or drifted modifiers and parts);
  - consumer-side class usage — the classes your HTML and JSX apply, including chained `-modifiers`, are
    validated against the documented surface;
  - registered-property value checks — values are matched against a custom property's `@property`
    `syntax`, flagging a bad `initial-value`, assignment, or `var()` fallback (runtime substitutions and
    CSS-wide keywords are skipped).

### TypeDoc integration

- **`@cssdoc/typedoc`** — a TypeDoc plugin that renders a CSS reference alongside a TypeScript API build
  and merges it into the same sidebar.

### Editor support

- **`@cssdoc/language-server`** — an editor-agnostic LSP server: completions, hover, go-to-definition,
  deprecation quick-fixes, and live diagnostics for CSS documents.
- The **cssdoc VS Code extension** ships the language server and a TextMate injection grammar, published
  to the VS Code Marketplace and Open VSX.

### Syntax highlighting

- **`@cssdoc/tmlanguage`** — a TextMate injection grammar that highlights cssdoc doc-comment tags inside
  CSS comments, the way TSDoc highlights JSDoc.
- **`@cssdoc/grammarkdown-tmlanguage`** — a TextMate grammar for the grammarkdown notation.

### Documentation

- A VitePress documentation site at [cssdoc.dev](https://cssdoc.dev), including a generated API
  reference and the grammar spec.
