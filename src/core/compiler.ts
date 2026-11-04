/**
 * Rule compiler: validates rules and prepares them for the RuleEngine.
 *
 * Compiled rules are backed by the same Rule entity the CLI builds from YAML,
 * so the library and the CLI match text identically.
 */

import { Rule as MatcherRule } from '../domains/rules/core/entities/Rule';
import {
  Category,
  CompiledRule,
  Rule,
  RuleCompilationError,
  RulePack,
  Severity,
} from './types';

const SEVERITIES: readonly Severity[] = ['low', 'medium', 'high', 'critical'];
const CATEGORIES: readonly Category[] = [
  'pii',
  'bias',
  'hallucination',
  'security',
  'compliance',
  'parse',
  'internal',
  'custom',
];

/** Matcher entities behind each CompiledRule handed out by this module. */
const matcherRules = new WeakMap<CompiledRule, MatcherRule>();

/**
 * Returns the matcher entity behind a compiled rule.
 * @internal Used by RuleEngine; not part of the public API.
 */
export function getMatcherRule(compiled: CompiledRule): MatcherRule {
  const rule = matcherRules.get(compiled);
  if (!rule) {
    throw new RuleCompilationError(
      `Rule '${compiled.id}' was not created by compileRule() or compileRulePack()`,
      compiled.id
    );
  }
  return rule;
}

/**
 * Validate a single enabled rule and compile it for the engine.
 * @throws RuleCompilationError if the rule is disabled or invalid
 */
export function compileRule(rule: Rule): CompiledRule {
  const id = typeof rule?.id === 'string' ? rule.id : '';

  if (rule?.enabled === false) {
    throw new RuleCompilationError(
      `Attempted to compile disabled rule '${id}'`,
      id
    );
  }
  if (rule.severity !== undefined && !SEVERITIES.includes(rule.severity)) {
    throw new RuleCompilationError(
      `Rule '${id}' has invalid severity '${rule.severity}' (expected ${SEVERITIES.join(', ')})`,
      id
    );
  }
  if (rule.category !== undefined && !CATEGORIES.includes(rule.category)) {
    throw new RuleCompilationError(
      `Rule '${id}' has invalid category '${rule.category}' (expected ${CATEGORIES.join(', ')})`,
      id
    );
  }

  let matcherRule: MatcherRule;
  try {
    matcherRule = MatcherRule.fromYaml(rule);
  } catch (error) {
    throw new RuleCompilationError(
      `Invalid rule '${id}': ${error instanceof Error ? error.message : String(error)}`,
      id
    );
  }

  const compiled: CompiledRule = Object.freeze({
    id: matcherRule.id,
    description: matcherRule.description,
    severity: matcherRule.severity,
    category: matcherRule.category,
  });
  matcherRules.set(compiled, matcherRule);
  return compiled;
}

/**
 * Compile every enabled rule in a RulePack. Disabled rules are skipped.
 * @throws RuleCompilationError listing every invalid or duplicate rule
 */
export function compileRulePack(rulePack: RulePack): CompiledRule[] {
  if (!rulePack || !Array.isArray(rulePack.rules)) {
    throw new RuleCompilationError('RulePack must have a rules array');
  }

  const compiled: CompiledRule[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const rule of rulePack.rules) {
    if (rule?.id && seenIds.has(rule.id)) {
      errors.push(`Duplicate rule id '${rule.id}'`);
      continue;
    }
    if (rule?.id) seenIds.add(rule.id);
    if (rule?.enabled === false) continue;

    try {
      compiled.push(compileRule(rule));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) {
    throw new RuleCompilationError(
      `Failed to compile ${errors.length} rule(s) from RulePack '${rulePack.name}':\n${errors.join('\n')}`
    );
  }

  return compiled;
}

/** Compile several RulePacks into one list of rules. */
export function compileRulePacks(rulePacks: RulePack[]): CompiledRule[] {
  return rulePacks.flatMap((pack) => compileRulePack(pack));
}
