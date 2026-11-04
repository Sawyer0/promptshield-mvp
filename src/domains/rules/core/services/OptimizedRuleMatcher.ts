import { RuleMatcher, MatchResult } from '../ports/RuleEngine';
import { Rule } from '../entities/Rule';

/**
 * Trie node for Aho-Corasick pattern matching
 */
class TrieNode {
  children = new Map<string, TrieNode>();
  fail: TrieNode | null = null;
  output: Array<{ keyword: string; rule: Rule }> = [];
}

/**
 * Optimized rule matcher using Aho-Corasick algorithm for O(n) keyword matching
 * and compound regex for efficient pattern matching
 */
export class OptimizedRuleMatcher implements RuleMatcher {
  private keywordTrie: TrieNode | null = null;
  private csRegex: RegExp | null = null;
  private ciRegex: RegExp | null = null;
  private csRuleMap = new Map<number, Rule>();
  private ciRuleMap = new Map<number, Rule>();
  private compiledRules: Rule[] = [];

  /**
   * Compile all rules into optimized data structures
   * This should be called once with all rules before matching
   */
  compileRules(rules: Rule[]): void {
    this.compiledRules = rules;
    this.keywordTrie = this.buildKeywordTrie(rules);

    // Build Regex matchers
    const csPatterns: string[] = [];
    const ciPatterns: string[] = [];
    this.csRuleMap.clear();
    this.ciRuleMap.clear();

    let csIdx = 0;
    let ciIdx = 0;

    for (const rule of rules) {
      if (!rule.enabled || !rule.hasRegexPatterns()) continue;

      for (const pattern of rule.matchRegex) {
        if (rule.caseSensitive) {
          csPatterns.push(`(${pattern})`);
          this.csRuleMap.set(csIdx++, rule);
        } else {
          ciPatterns.push(`(${pattern})`);
          this.ciRuleMap.set(ciIdx++, rule);
        }
      }
    }

    this.csRegex =
      csPatterns.length > 0 ? new RegExp(csPatterns.join('|'), 'g') : null;
    this.ciRegex =
      ciPatterns.length > 0 ? new RegExp(ciPatterns.join('|'), 'gi') : null;
  }

  /**
   * Match content against a specific rule
   * Note: For optimal performance, use matchAll() instead
   */
  match(content: string, rule: Rule): MatchResult[] {
    const matches: MatchResult[] = [];

    if (rule.hasRegexPatterns()) {
      const patterns = rule.getCompiledRegexPatterns();
      for (const pattern of patterns) {
        let m;
        pattern.lastIndex = 0;
        while ((m = pattern.exec(content)) !== null) {
          const start = m.index;
          const end = start + m[0].length;
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
    }

    if (rule.hasKeywordPatterns()) {
      const keywords = rule.getNormalizedKeywords();
      const searchContent = rule.caseSensitive
        ? content
        : content.toLowerCase();

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
    }

    return matches;
  }

  /**
   * Match content against all compiled rules in a single pass (O(n))
   * This is the preferred method for high performance
   */
  matchAll(content: string, rules: Rule[]): Map<Rule, MatchResult[]> {
    // Recompile if rules changed
    if (this.compiledRules !== rules) {
      this.compileRules(rules);
    }

    const resultMap = new Map<Rule, MatchResult[]>();
    for (const rule of rules) {
      if (rule.enabled) {
        resultMap.set(rule, []);
      }
    }

    // 1. Single pass keyword matching (Aho-Corasick)
    if (this.keywordTrie) {
      this.matchAllKeywords(content, resultMap);
    }

    // 2. Compound Regex matching
    if (this.csRegex) {
      this.matchCompound(content, this.csRegex, this.csRuleMap, resultMap);
    }
    if (this.ciRegex) {
      this.matchCompound(content, this.ciRegex, this.ciRuleMap, resultMap);
    }

    return resultMap;
  }

  private buildKeywordTrie(rules: Rule[]): TrieNode {
    const root = new TrieNode();
    for (const rule of rules) {
      if (!rule.enabled || !rule.hasKeywordPatterns()) continue;

      for (const keyword of rule.getNormalizedKeywords()) {
        let node = root;
        for (const char of keyword) {
          if (!node.children.has(char)) {
            node.children.set(char, new TrieNode());
          }
          node = node.children.get(char)!;
        }
        node.output.push({ keyword, rule });
      }
    }

    const queue: TrieNode[] = [];
    for (const child of root.children.values()) {
      child.fail = root;
      queue.push(child);
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const [char, child] of curr.children) {
        let f = curr.fail;
        while (f && !f.children.has(char)) f = f.fail;
        child.fail = f ? f.children.get(char)! : root;
        if (child.fail.output.length > 0) {
          child.output.push(...child.fail.output);
        }
        queue.push(child);
      }
    }
    return root;
  }

  private matchAllKeywords(
    content: string,
    resultMap: Map<Rule, MatchResult[]>
  ): void {
    if (!this.keywordTrie) return;
    let node = this.keywordTrie;
    const lowerContent = content.toLowerCase();

    for (let i = 0; i < content.length; i++) {
      const char = lowerContent[i];
      while (node !== this.keywordTrie && !node.children.has(char)) {
        node = node.fail || this.keywordTrie;
      }
      if (node.children.has(char)) {
        node = node.children.get(char)!;
      }

      if (node.output.length > 0) {
        for (const { keyword, rule } of node.output) {
          const start = i - keyword.length + 1;
          const end = i + 1;
          const match: MatchResult = {
            matched: true,
            position: {
              start,
              end,
              line: this.getLineNumber(content, start),
              column: this.getColumnNumber(content, start),
            },
            context: this.getContext(content, start, end),
            pattern: keyword,
          };
          resultMap.get(rule)?.push(match);
        }
      }
    }
  }

  private matchCompound(
    content: string,
    regex: RegExp,
    ruleMap: Map<number, Rule>,
    resultMap: Map<Rule, MatchResult[]>
  ): void {
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(content)) !== null) {
      // Find which group matched. Groups start at index 1.
      // Note: We use the first non-undefined group that matches our top-level alternates.
      for (let i = 1; i < m.length; i++) {
        if (m[i] !== undefined) {
          const rule = ruleMap.get(i - 1);
          if (rule) {
            const start = m.index;
            const end = start + m[0].length;
            const matchResult: MatchResult = {
              matched: true,
              position: {
                start,
                end,
                line: this.getLineNumber(content, start),
                column: this.getColumnNumber(content, start),
              },
              context: this.getContext(content, start, end),
              pattern: m[0],
            };
            resultMap.get(rule)?.push(matchResult);
          }
          break; // Found the matching alternate
        }
      }
    }
  }

  private getContext(
    content: string,
    start: number,
    end: number,
    size: number = 50
  ) {
    const bStart = Math.max(0, start - size);
    const aEnd = Math.min(content.length, end + size);
    return {
      before: content.substring(bStart, start),
      match: content.substring(start, end),
      after: content.substring(end, aEnd),
    };
  }

  private getLineNumber(content: string, pos: number): number {
    return content.substring(0, pos).split('\n').length;
  }

  private getColumnNumber(content: string, pos: number): number {
    const lines = content.substring(0, pos).split('\n');
    return lines[lines.length - 1].length + 1;
  }
}
