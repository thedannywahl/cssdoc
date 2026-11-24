/**
 * @cssdoc/regex/fixtures/index
 *
 * Central export point for all pattern fixtures.
 * Fixtures are organized by tier and serve as executable documentation for each pattern.
 *
 * @module
 */

export type { PatternFixture, PassingCase, FailingCase } from "./types.js";

// Tier 0: Character Classes
export {
  alphaFixtures,
  alphaLowerFixtures,
  alphaUpperFixtures,
  digitFixtures,
  dashFixtures,
  doubleDashFixtures,
  dotFixtures,
  colonFixtures,
  spaceTabFixtures,
  braceOpenFixtures,
  braceCloseFixtures,
  parenOpenFixtures,
  parenCloseFixtures,
} from "./tier-0/character-classes.fixtures.js";

// Tier 1: CSS Spec
export {
  cssIdentifierFixtures,
  cssPropertyNameFixtures,
  cssFunctionFixtures,
  cssNumberFixtures,
  cssPercentageFixtures,
  cssDimensionFixtures,
  cssHashColorFixtures,
} from "./tier-1/core-css.fixtures.js";

// Tier 2: CssDoc Grammar
export {
  cssdocIdentifierFixtures,
  cssdocRecordNameFixtures,
  cssdocModifierSuffixFixtures,
  cssdocModifierChainedFixtures,
  cssdocTagFixtures,
  cssdocStructureClassFixtures,
} from "./tier-2/core-cssdoc.fixtures.js";

/**
 * Get all fixtures across all tiers as a flat array.
 * This is used by test runners to iterate over all fixtures.
 */
export async function getAllFixtures() {
  const tier0 = await import("./tier-0/character-classes.fixtures.js");
  const tier1 = await import("./tier-1/core-css.fixtures.js");
  const tier2 = await import("./tier-2/core-cssdoc.fixtures.js");

  const all: any[] = [];

  // Collect Tier 0
  all.push(
    tier0.alphaFixtures,
    tier0.alphaLowerFixtures,
    tier0.alphaUpperFixtures,
    tier0.digitFixtures,
    tier0.dashFixtures,
    tier0.doubleDashFixtures,
    tier0.dotFixtures,
    tier0.colonFixtures,
    tier0.spaceTabFixtures,
    tier0.braceOpenFixtures,
    tier0.braceCloseFixtures,
    tier0.parenOpenFixtures,
    tier0.parenCloseFixtures,
  );

  // Collect Tier 1
  all.push(
    tier1.cssIdentifierFixtures,
    tier1.cssPropertyNameFixtures,
    tier1.cssFunctionFixtures,
    tier1.cssNumberFixtures,
    tier1.cssPercentageFixtures,
    tier1.cssDimensionFixtures,
    tier1.cssHashColorFixtures,
  );

  // Collect Tier 2
  all.push(
    tier2.cssdocIdentifierFixtures,
    tier2.cssdocRecordNameFixtures,
    tier2.cssdocModifierSuffixFixtures,
    tier2.cssdocModifierChainedFixtures,
    tier2.cssdocTagFixtures,
    tier2.cssdocStructureClassFixtures,
  );

  return all;
}
