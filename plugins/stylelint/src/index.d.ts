import stylelint from "stylelint";
/** The rule name; enable it as `"cssdoc/valid-doc-comments": true` (optionally with rule toggles). */
export declare const ruleName = "cssdoc/valid-doc-comments";
export declare const messages: {
    violation: (message: string) => string;
};
export declare const meta: {
    url: string;
};
/** A ready-to-spread config that enables the rule. */
export declare const configs: {
    recommended: {
        plugins: string[];
        rules: {
            "cssdoc/valid-doc-comments": boolean;
        };
    };
};
declare const _default: stylelint.Plugin;
export default _default;
