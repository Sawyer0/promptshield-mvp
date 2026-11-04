import { RuleMatcher, MatchResult } from '../ports/RuleEngine';
import { Rule } from '../entities/Rule';

const CONTEXT_SIZE = 50;
const WORD_CHAR = /[\p{L}\p{N}_]/u;

/**
 * Trie node for Aho-Corasick keyword matching
 */
class TrieNode {
  children = new Map<string, TrieNode>();
  fail: TrieNode | null = null;
  output: Array<{ keyword: string; rule: Rule }> = [];
}

interface CompiledRegex {
  rule: Rule;
  regex: RegExp;
}

/**
 * Rule matcher that finds every keyword with a single Aho-Corasick pass per
 * case mode and runs each rule's regex patterns independently, so that
 * overlapping matches from different rules are all reported.
 *
 * Keywords match whole words only: a keyword edge that is a letter, digit or
 * underscore must not touch another word character ("way" does not match
 * inside "takeaways"). Keyword edges that are punctuation, such as
 * "@gmail.com" or "dob:", are not constrained.
 */
export class OptimizedRuleMatcher implements RuleMatcher {
  private caseInsensitiveTrie: TrieNode | null = null;
  private caseSensitiveTrie: TrieNode | null = null;
  private compiledRegexes: CompiledRegex[] = [];
  private compiledRules: Rule[] = [];

  /**
   * Compile rules into matching structures. Called automatically by
   * matchAll() whenever the rule set changes.
   */
  compileRules(rules: Rule[]): void {
    const enabled = rules.filter((rule) => rule.enabled);
    this.compiledRules = [...rules];
    this.caseInsensitiveTrie = buildKeywordTrie(
      enabled.filter((rule) => !rule.caseSensitive)
    );
    this.caseSensitiveTrie = buildKeywordTrie(
      enabled.filter((rule) => rule.caseSensitive)
    );
    this.compiledRegexes = enabled.flatMap((rule) =>
      rule.getCompiledRegexPatterns().map((regex) => ({ rule, regex }))
    );
  }

  /**
   * Match content against a single rule.
   */
  match(content: string, rule: Rule): MatchResult[] {
    const matcher = new OptimizedRuleMatcher();
    return matcher.matchAll(content, [rule]).get(rule) ?? [];
  }

  /**
   * Match content against all enabled rules.
   * Returns a map with an entry (possibly empty) for every enabled rule.
   */
  matchAll(content: string, rules: Rule[]): Map<Rule, MatchResult[]> {
    if (!this.isCompiledFor(rules)) {
      this.compileRules(rules);
    }

    const resultMap = new Map<Rule, MatchResult[]>();
    for (const rule of rules) {
      if (rule.enabled) {
        resultMap.set(rule, []);
      }
    }

    const positions = new PositionIndex(content);
    // Report each span once per rule, even when several patterns hit it
    const seenSpans = new Map<Rule, Set<string>>();
    const record = (
      rule: Rule,
      start: number,
      end: number,
      pattern: string
    ): void => {
      const spans = seenSpans.get(rule) ?? new Set<string>();
      seenSpans.set(rule, spans);
      const key = `${start}:${end}`;
      if (spans.has(key)) return;
      spans.add(key);
      resultMap
        .get(rule)
        ?.push(buildMatch(content, positions, start, end, pattern));
    };

    if (this.caseInsensitiveTrie) {
      matchKeywords(
        content,
        content.toLowerCase(),
        this.caseInsensitiveTrie,
        record
      );
    }
    if (this.caseSensitiveTrie) {
      matchKeywords(content, content, this.caseSensitiveTrie, record);
    }

    for (const { rule, regex } of this.compiledRegexes) {
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(content)) !== null) {
        if (m[0].length === 0) {
          // Skip empty matches so patterns like "a*" cannot loop forever
          regex.lastIndex++;
          continue;
        }
        record(rule, m.index, m.index + m[0].length, regex.source);
      }
    }

    for (const matches of resultMap.values()) {
      matches.sort((a, b) => a.position.start - b.position.start);
    }

    return resultMap;
  }

  private isCompiledFor(rules: Rule[]): boolean {
    return (
      this.compiledRules.length === rules.length &&
      this.compiledRules.every((rule, i) => rule === rules[i])
    );
  }
}

function buildKeywordTrie(rules: Rule[]): TrieNode | null {
  const root = new TrieNode();
  let keywordCount = 0;

  for (const rule of rules) {
    for (const keyword of rule.getNormalizedKeywords()) {
      if (keyword.length === 0) continue;
      let node = root;
      for (const char of keyword) {
        let next = node.children.get(char);
        if (!next) {
          next = new TrieNode();
          node.children.set(char, next);
        }
        node = next;
      }
      node.output.push({ keyword, rule });
      keywordCount++;
    }
  }

  if (keywordCount === 0) {
    return null;
  }

  const queue: TrieNode[] = [];
  for (const child of root.children.values()) {
    child.fail = root;
    queue.push(child);
  }

  while (queue.length > 0) {
    const current = queue.shift() as TrieNode;
    for (const [char, child] of current.children) {
      let fallback = current.fail;
      while (fallback && !fallback.children.has(char)) {
        fallback = fallback.fail;
      }
      child.fail = fallback?.children.get(char) ?? root;
      if (child.fail.output.length > 0) {
        child.output.push(...child.fail.output);
      }
      queue.push(child);
    }
  }

  return root;
}

/**
 * Walk the trie over `searchText` (the content, lower-cased for
 * case-insensitive rules) and report whole-word keyword hits.
 * Iterates by UTF-16 code unit, matching how keywords were inserted, so
 * offsets line up with `content`.
 */
function matchKeywords(
  content: string,
  searchText: string,
  root: TrieNode,
  record: (rule: Rule, start: number, end: number, pattern: string) => void
): void {
  let node = root;

  for (let i = 0; i < searchText.length; i++) {
    const char = searchText[i];
    while (node !== root && !node.children.has(char)) {
      node = node.fail ?? root;
    }
    node = node.children.get(char) ?? root;

    for (const { keyword, rule } of node.output) {
      const start = i - keyword.length + 1;
      const end = i + 1;
      if (isWholeWord(content, start, end)) {
        record(rule, start, end, keyword);
      }
    }
  }
}

function isWholeWord(content: string, start: number, end: number): boolean {
  const first = content[start];
  const last = content[end - 1];
  const before = content[start - 1];
  const after = content[end];

  if (WORD_CHAR.test(first) && before !== undefined && WORD_CHAR.test(before)) {
    return false;
  }
  if (WORD_CHAR.test(last) && after !== undefined && WORD_CHAR.test(after)) {
    return false;
  }
  return true;
}

/**
 * Maps character offsets to 1-based line and column numbers in O(log n).
 */
class PositionIndex {
  private readonly lineStarts: number[] = [0];

  constructor(content: string) {
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  locate(offset: number): { line: number; column: number } {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (this.lineStarts[mid] <= offset) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return { line: low + 1, column: offset - this.lineStarts[low] + 1 };
  }
}

function buildMatch(
  content: string,
  positions: PositionIndex,
  start: number,
  end: number,
  pattern: string
): MatchResult {
  const { line, column } = positions.locate(start);
  return {
    matched: true,
    position: { start, end, line, column },
    context: {
      before: content.substring(Math.max(0, start - CONTEXT_SIZE), start),
      match: content.substring(start, end),
      after: content.substring(
        end,
        Math.min(content.length, end + CONTEXT_SIZE)
      ),
    },
    pattern,
  };
}
