/** Committed, repo-root-relative paths that must mirror {@link cssDocSchema}, byte-for-byte. */
export declare const SCHEMA_TARGETS: readonly ["packages/config/cssdoc.schema.json", "servers/vscode/schemas/cssdoc.schema.json", "schemas/cssdoc.schema.json"];
/** The canonical bytes every target must contain (2-space JSON + trailing newline). */
export declare const SCHEMA_JSON: string;
/** Return the targets whose on-disk bytes differ from the source (missing files count as drifted). */
export declare function findSchemaDrift(): string[];
