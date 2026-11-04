import { Result } from '../../../../shared/types/Result';
import { Rule } from '../entities/Rule';
import { RulePack } from '../entities/RulePack';
import { Violation } from '../../../../shared/types/Violation';

export interface RuleEngine {
  loadRulePack(path: string): Promise<Result<RulePack, Error>>;

  validateRulePack(rulePack: RulePack): Result<void, Error>;

  applyRules(
    fields: Record<string, string>,
    rules: Rule[],
    metadata?: Record<string, unknown>
  ): Promise<Result<Violation[], Error>>;

  /**
   * Tests a single rule against content
   */
  testRule(
    content: string,
    rule: Rule
  ): Result<
    {
      matches: boolean;
      positions?: Array<{
        start: number;
        end: number;
        line?: number;
        column?: number;
      }>;
    },
    Error
  >;
}

export interface RuleMatcher {
  /** Matches content against a single rule. */
  match(content: string, rule: Rule): MatchResult[];

  /** Matches content against every enabled rule in one call. */
  matchAll(content: string, rules: Rule[]): Map<Rule, MatchResult[]>;
}

export interface MatchResult {
  matched: boolean;
  position: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  context: {
    before: string;
    match: string;
    after: string;
  };
  pattern?: string;
}

export interface RuleRepository {
  loadFromYaml(path: string): Promise<Result<RulePack, Error>>;

  saveToYaml(path: string, rulePack: RulePack): Promise<Result<void, Error>>;
}
