import { RuleEngine, RuleMatcher, MatchResult } from '../ports/RuleEngine';
import { RuleRepository } from '../ports/RuleEngine';
import { Result, ok, err } from '../../../../shared/types/Result';
import { Rule } from '../entities/Rule';
import { RulePack } from '../entities/RulePack';
import { Violation } from '../../../../shared/types/Violation';

/**
 * Default implementation of the rule engine
 */
export class DefaultRuleEngine implements RuleEngine {
  constructor(
    private repository: RuleRepository,
    private matcher: RuleMatcher
  ) {}

  async loadRulePack(path: string): Promise<Result<RulePack, Error>> {
    try {
      if (!path || path.trim() === '') {
        return err(new Error('Rulepack path is required'));
      }

      const result = await this.repository.loadFromYaml(path);

      if (result.isErr()) {
        return err(result.error);
      }

      const validationResult = this.validateRulePack(result.value);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      return ok(result.value);
    } catch (error) {
      return err(new Error(`Failed to load rulepack: ${error}`));
    }
  }

  validateRulePack(rulePack: RulePack): Result<void, Error> {
    try {
      if (rulePack.getEnabledRules().length === 0) {
        return err(new Error('RulePack has no enabled rules'));
      }

      return ok(undefined);
    } catch (error) {
      return err(new Error(`RulePack validation failed: ${error}`));
    }
  }

  async applyRules(
    fields: Record<string, string>,
    rules: Rule[],
    metadata?: Record<string, unknown>
  ): Promise<Result<Violation[], Error>> {
    try {
      const violations: Violation[] = [];
      const enabledRules = rules.filter((rule) => rule.enabled);

      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        if (!fieldValue) continue;

        const matchResults = this.matcher.matchAll(fieldValue, enabledRules);
        for (const [rule, matches] of matchResults) {
          for (const match of matches) {
            if (match.matched) {
              violations.push(
                this.createViolation(rule, fieldName, match, metadata)
              );
            }
          }
        }
      }

      return ok(violations);
    } catch (error) {
      return err(new Error(`Failed to apply rules: ${error}`));
    }
  }

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
  > {
    try {
      const matches = this.matcher.match(content, rule);

      return ok({
        matches: matches.some((m) => m.matched),
        positions: matches.filter((m) => m.matched).map((m) => m.position),
      });
    } catch (error) {
      return err(new Error(`Failed to test rule: ${error}`));
    }
  }

  private createViolation(
    rule: Rule,
    field: string,
    match: MatchResult,
    metadata?: Record<string, unknown>
  ): Violation {
    return {
      ruleId: rule.id,
      ruleName: rule.id, // Using ID as name for now
      ruleDescription: rule.description,
      severity: rule.severity,
      category: rule.category,
      message: `${rule.description} found in ${field}`,
      field,
      objectIndex: (metadata?.index as number) ?? 0,
      position: match.position,
      context: match.context,
      metadata: {
        pattern: match.pattern,
        confidence: 1.0,
        tags: [],
      },
    };
  }
}
