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

      // Check if matcher supports optimized batch matching
      if (
        'matchAll' in this.matcher &&
        typeof this.matcher.matchAll === 'function'
      ) {
        // Use optimized O(n) single-pass matching
        for (const [fieldName, fieldValue] of Object.entries(fields)) {
          if (!fieldValue) continue;

          const matchResults = this.matcher.matchAll(
            fieldValue,
            rules.filter((r) => r.enabled)
          );

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
      } else {
        // Fallback to sequential matching for backward compatibility
        for (const rule of rules) {
          if (!rule.enabled) continue;

          for (const [fieldName, fieldValue] of Object.entries(fields)) {
            if (!fieldValue) continue;

            const matches = this.matcher.match(fieldValue, rule);

            for (const match of matches) {
              if (match.matched) {
                violations.push(
                  this.createViolation(rule, fieldName, match, metadata)
                );
              }
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

/**
 * Default implementation of rule matcher
 */
export class DefaultRuleMatcher implements RuleMatcher {
  match(content: string, rule: Rule): MatchResult[] {
    const matches: MatchResult[] = [];

    if (rule.hasRegexPatterns()) {
      const regexMatches = this.matchRegexPatterns(content, rule);
      matches.push(...regexMatches);
    }

    if (rule.hasKeywordPatterns()) {
      const keywordMatches = this.matchKeywordPatterns(content, rule);
      matches.push(...keywordMatches);
    }

    return matches;
  }

  private matchRegexPatterns(content: string, rule: Rule): MatchResult[] {
    const matches: MatchResult[] = [];
    const patterns = rule.getCompiledRegexPatterns();

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        matches.push({
          matched: true,
          position: {
            start,
            end,
            line: this.getLineNumber(content, start),
            column: this.getColumnNumber(content, start),
          },
          context: this.getContext(content, start, end),
          pattern: pattern.source,
        });
      }
    }

    return matches;
  }

  private matchKeywordPatterns(content: string, rule: Rule): MatchResult[] {
    const matches: MatchResult[] = [];
    const keywords = rule.getNormalizedKeywords();
    const searchContent = rule.caseSensitive ? content : content.toLowerCase();

    for (const keyword of keywords) {
      let index = 0;
      while ((index = searchContent.indexOf(keyword, index)) !== -1) {
        const start = index;
        const end = start + keyword.length;

        matches.push({
          matched: true,
          position: {
            start,
            end,
            line: this.getLineNumber(content, start),
            column: this.getColumnNumber(content, start),
          },
          context: this.getContext(content, start, end),
          pattern: keyword,
        });

        index = end;
      }
    }

    return matches;
  }

  private getContext(
    content: string,
    start: number,
    end: number,
    contextSize: number = 50
  ): {
    before: string;
    match: string;
    after: string;
  } {
    const beforeStart = Math.max(0, start - contextSize);
    const afterEnd = Math.min(content.length, end + contextSize);

    return {
      before: content.substring(beforeStart, start),
      match: content.substring(start, end),
      after: content.substring(end, afterEnd),
    };
  }

  private getLineNumber(content: string, position: number): number {
    const lines = content.substring(0, position).split('\n');
    return lines.length;
  }

  private getColumnNumber(content: string, position: number): number {
    const lines = content.substring(0, position).split('\n');
    const lastLine = lines[lines.length - 1];
    return lastLine.length + 1;
  }
}
