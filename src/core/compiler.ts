/**
 * Rule Compiler - Pure functions for compiling rules into optimized execution strategies
 * Environment-agnostic, no Node.js dependencies
 */

import {
  Rule,
  RulePack,
  CompiledStrategy,
  CompiledRegexStrategy,
  CompiledKeywordStrategy,
  ViolationType,
  RuleCompilationError,
} from './types.js';

/**
 * Infer violation type from rule tags
 * @param tags - Array of tags from the rule
 * @returns Inferred violation type
 */
function inferViolationType(tags: string[]): ViolationType {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  if (
    tagSet.has('pii') ||
    tagSet.has('email') ||
    tagSet.has('phone') ||
    tagSet.has('ssn')
  ) {
    return 'pii';
  }
  if (tagSet.has('bias') || tagSet.has('discrimination')) {
    return 'bias';
  }
  if (tagSet.has('hallucination') || tagSet.has('factual')) {
    return 'hallucination';
  }

  return 'other';
}

/**
 * Compile a regex rule into an optimized strategy
 * @param rule - The rule to compile
 * @returns Compiled regex strategy
 * @throws RuleCompilationError if the regex pattern is invalid
 */
function compileRegexRule(rule: Rule): CompiledRegexStrategy {
  if (!rule.pattern) {
    throw new RuleCompilationError(
      `Rule '${rule.id}' is of type 'regex' but has no pattern`,
      rule.id
    );
  }

  try {
    // Compile with global flag for finding all matches
    // Use 'u' flag for proper Unicode support
    const regex = new RegExp(rule.pattern, 'gu');

    return {
      rule,
      regex,
      violationType: inferViolationType(rule.tags),
    };
  } catch (error) {
    throw new RuleCompilationError(
      `Failed to compile regex pattern for rule '${rule.id}': ${error instanceof Error ? error.message : String(error)}`,
      rule.id
    );
  }
}

/**
 * Compile a keyword rule into an optimized strategy
 * @param rule - The rule to compile
 * @returns Compiled keyword strategy
 * @throws RuleCompilationError if the keyword pattern is invalid
 */
function compileKeywordRule(rule: Rule): CompiledKeywordStrategy {
  if (!rule.pattern) {
    throw new RuleCompilationError(
      `Rule '${rule.id}' is of type 'keyword' but has no pattern`,
      rule.id
    );
  }

  // Split pattern by commas or pipes and normalize
  const keywords = rule.pattern
    .split(/[,|]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keywords.length === 0) {
    throw new RuleCompilationError(
      `Rule '${rule.id}' has no valid keywords in pattern`,
      rule.id
    );
  }

  return {
    rule,
    keywords,
    caseSensitive: false, // Default to case-insensitive
    violationType: inferViolationType(rule.tags),
  };
}

/**
 * Compile a single rule into an execution strategy
 * @param rule - The rule to compile
 * @returns Compiled strategy
 * @throws RuleCompilationError if compilation fails
 */
export function compileRule(rule: Rule): CompiledStrategy {
  if (!rule.enabled) {
    throw new RuleCompilationError(
      `Attempted to compile disabled rule '${rule.id}'`,
      rule.id
    );
  }

  switch (rule.type) {
    case 'regex':
      return compileRegexRule(rule);

    case 'keyword':
      return compileKeywordRule(rule);

    case 'custom':
      // Custom rules require a validator function
      if (!rule.validator) {
        throw new RuleCompilationError(
          `Rule '${rule.id}' is of type 'custom' but has no validator function`,
          rule.id
        );
      }
      // For now, treat custom rules as regex with a wildcard pattern
      // The validator will be applied during execution
      return {
        rule,
        regex: /.+/gu, // Match anything, validator will filter
        violationType: inferViolationType(rule.tags),
      };

    default:
      throw new RuleCompilationError(
        `Unknown rule type '${rule.type}' for rule '${rule.id}'`,
        rule.id
      );
  }
}

/**
 * Compile all enabled rules from a rulepack
 * @param rulePack - The rulepack to compile
 * @returns Array of compiled strategies
 */
export function compileRulePack(rulePack: RulePack): CompiledStrategy[] {
  const strategies: CompiledStrategy[] = [];
  const errors: RuleCompilationError[] = [];

  for (const rule of rulePack.rules) {
    // Skip disabled rules
    if (!rule.enabled) {
      continue;
    }

    try {
      const strategy = compileRule(rule);
      strategies.push(strategy);
    } catch (error) {
      if (error instanceof RuleCompilationError) {
        errors.push(error);
      } else {
        errors.push(
          new RuleCompilationError(
            `Unexpected error compiling rule '${rule.id}': ${error instanceof Error ? error.message : String(error)}`,
            rule.id
          )
        );
      }
    }
  }

  // If any rules failed to compile, throw an aggregate error
  if (errors.length > 0) {
    const errorMessages = errors.map((e) => e.message).join('\n');
    throw new RuleCompilationError(
      `Failed to compile ${errors.length} rule(s) from rulepack '${rulePack.name}':\n${errorMessages}`
    );
  }

  return strategies;
}

/**
 * Compile multiple rulepacks into a flat array of strategies
 * @param rulePacks - Array of rulepacks to compile
 * @returns Array of compiled strategies
 */
export function compileRulePacks(rulePacks: RulePack[]): CompiledStrategy[] {
  const allStrategies: CompiledStrategy[] = [];

  for (const pack of rulePacks) {
    const strategies = compileRulePack(pack);
    allStrategies.push(...strategies);
  }

  return allStrategies;
}
