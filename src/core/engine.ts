/**
 * RuleEngine: scans text against compiled rules and returns violations.
 *
 * Matching is delegated to OptimizedRuleMatcher, the matcher the CLI uses,
 * so `promptshield scan` and the library report the same matches.
 */

import { OptimizedRuleMatcher } from '../domains/rules/core/services/OptimizedRuleMatcher';
import { Rule as MatcherRule } from '../domains/rules/core/entities/Rule';
import { getMatcherRule } from './compiler';
import { CompiledRule, EngineConfig, ScanResult, ViolationNode } from './types';

const DEFAULT_CONTEXT_LENGTH = 50;

export class RuleEngine {
  private readonly rules: CompiledRule[];
  private readonly matcherRules: MatcherRule[];
  private readonly matcher = new OptimizedRuleMatcher();
  private config: Required<Omit<EngineConfig, 'maxViolations'>> &
    Pick<EngineConfig, 'maxViolations'>;

  /**
   * @param rules - Rules from compileRule() or compileRulePack()
   * @param config - Engine options
   */
  constructor(rules: CompiledRule[], config: EngineConfig = {}) {
    this.rules = [...rules];
    this.matcherRules = this.rules.map(getMatcherRule);
    this.config = {
      contextLength: DEFAULT_CONTEXT_LENGTH,
      computeLineNumbers: true,
      ...config,
    };
  }

  /** Scan one text and return its violations, ordered by position. */
  scan(text: string, metadata?: Record<string, unknown>): ScanResult {
    const matches = this.matcher.matchAll(text, this.matcherRules);
    const violations: ViolationNode[] = [];

    this.rules.forEach((rule, i) => {
      for (const match of matches.get(this.matcherRules[i]) ?? []) {
        const { start, end, line, column } = match.position;
        const violation: ViolationNode = {
          ruleId: rule.id,
          ruleName: rule.id,
          message: rule.description,
          category: rule.category,
          severity: rule.severity,
          start,
          end,
          matchText: text.slice(start, end),
          context: this.extractContext(text, start, end),
        };
        if (this.config.computeLineNumbers) {
          violation.line = line;
          violation.column = column;
        }
        violations.push(violation);
      }
    });

    violations.sort(
      (a, b) => a.start - b.start || a.ruleId.localeCompare(b.ruleId)
    );
    const { maxViolations } = this.config;
    const limited =
      maxViolations && maxViolations > 0
        ? violations.slice(0, maxViolations)
        : violations;

    return {
      text,
      violations: limited,
      violationCount: limited.length,
      timestamp: new Date(),
      metadata,
    };
  }

  /** Scan several texts. */
  scanMultiple(texts: string[]): ScanResult[] {
    return texts.map((text) => this.scan(text));
  }

  /** Number of rules this engine applies. */
  getRuleCount(): number {
    return this.rules.length;
  }

  /** Merge new options into the engine configuration. */
  updateConfig(config: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private extractContext(text: string, start: number, end: number): string {
    const length = Math.max(0, this.config.contextLength);
    const from = Math.max(0, start - length);
    const to = Math.min(text.length, end + length);
    return (
      (from > 0 ? '...' : '') +
      text.slice(from, to) +
      (to < text.length ? '...' : '')
    );
  }
}
