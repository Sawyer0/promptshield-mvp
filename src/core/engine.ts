/**
 * Rule Engine - Pure, side-effect-free execution engine
 * Environment-agnostic core that processes text and emits violation metadata
 */

import {
  ViolationNode,
  ScanResult,
  CompiledStrategy,
  CompiledRegexStrategy,
  CompiledKeywordStrategy,
  EngineConfig,
} from './types.js';

/**
 * Extract context around a match position
 * @param text - The full text
 * @param start - Start position of match
 * @param end - End position of match
 * @param contextLength - Number of characters to include on each side
 * @returns Context string
 */
function extractContext(
  text: string,
  start: number,
  end: number,
  contextLength: number
): string {
  const contextStart = Math.max(0, start - contextLength);
  const contextEnd = Math.min(text.length, end + contextLength);

  let context = text.slice(contextStart, contextEnd);

  // Add ellipsis if context is truncated
  if (contextStart > 0) {
    context = '...' + context;
  }
  if (contextEnd < text.length) {
    context = context + '...';
  }

  return context;
}

/**
 * Compute line and column number from character offset
 * @param text - The full text
 * @param offset - Character offset
 * @returns Object with line and column numbers (1-indexed)
 */
function computeLineColumn(
  text: string,
  offset: number
): { line: number; column: number } {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Apply a regex strategy to text and yield violations
 * @param text - The text to scan
 * @param strategy - Compiled regex strategy
 * @param config - Engine configuration
 * @returns Array of violation nodes
 */
function applyRegexStrategy(
  text: string,
  strategy: CompiledRegexStrategy,
  config: EngineConfig
): ViolationNode[] {
  const violations: ViolationNode[] = [];
  const { rule, regex, violationType } = strategy;
  const contextLength = config.contextLength ?? 100;

  // Reset regex state
  regex.lastIndex = 0;

  let match: RegExpExecArray | null;

  // Find all matches using exec in a loop (O(n) complexity)
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const matchText = match[0];

    // Apply custom validator if present
    if (rule.validator && !rule.validator(text, matchText)) {
      continue;
    }

    // Build message with {match} placeholder replacement
    const message = rule.message.replace('{match}', matchText);

    // Create violation node
    const violation: ViolationNode = {
      ruleId: rule.id,
      ruleName: rule.name,
      type: violationType,
      severity: rule.severity,
      start,
      end,
      matchText,
      context: extractContext(text, start, end, contextLength),
      message,
      suggestion: rule.suggestion,
      tags: rule.tags,
    };

    // Optionally compute line/column (adds overhead)
    if (config.computeLineNumbers) {
      const { line, column } = computeLineColumn(text, start);
      violation.line = line;
      violation.column = column;
    }

    violations.push(violation);

    // Check max violations limit
    if (config.maxViolations && violations.length >= config.maxViolations) {
      break;
    }
  }

  return violations;
}

/**
 * Apply a keyword strategy to text and yield violations
 * @param text - The text to scan
 * @param strategy - Compiled keyword strategy
 * @param config - Engine configuration
 * @returns Array of violation nodes
 */
function applyKeywordStrategy(
  text: string,
  strategy: CompiledKeywordStrategy,
  config: EngineConfig
): ViolationNode[] {
  const violations: ViolationNode[] = [];
  const { rule, keywords, caseSensitive, violationType } = strategy;
  const contextLength = config.contextLength ?? 100;

  const searchText = caseSensitive ? text : text.toLowerCase();

  for (const keyword of keywords) {
    const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
    let startIndex = 0;

    // Find all occurrences of this keyword
    while (true) {
      const index = searchText.indexOf(searchKeyword, startIndex);

      if (index === -1) {
        break;
      }

      const start = index;
      const end = start + keyword.length;
      const matchText = text.slice(start, end);

      // Apply custom validator if present
      if (rule.validator && !rule.validator(text, matchText)) {
        startIndex = end;
        continue;
      }

      // Build message with {match} placeholder replacement
      const message = rule.message.replace('{match}', matchText);

      // Create violation node
      const violation: ViolationNode = {
        ruleId: rule.id,
        ruleName: rule.name,
        type: violationType,
        severity: rule.severity,
        start,
        end,
        matchText,
        context: extractContext(text, start, end, contextLength),
        message,
        suggestion: rule.suggestion,
        tags: rule.tags,
      };

      // Optionally compute line/column
      if (config.computeLineNumbers) {
        const { line, column } = computeLineColumn(text, start);
        violation.line = line;
        violation.column = column;
      }

      violations.push(violation);

      // Check max violations limit
      if (config.maxViolations && violations.length >= config.maxViolations) {
        return violations;
      }

      // Move to next position
      startIndex = end;
    }
  }

  return violations;
}

/**
 * RuleEngine - Pure core engine for scanning text against compiled rules
 */
export class RuleEngine {
  private strategies: CompiledStrategy[];
  private config: EngineConfig;

  /**
   * Create a new RuleEngine instance
   * @param strategies - Array of compiled strategies
   * @param config - Engine configuration
   */
  constructor(strategies: CompiledStrategy[], config: EngineConfig = {}) {
    this.strategies = strategies;
    this.config = {
      contextLength: 100,
      computeLineNumbers: true,
      maxViolations: undefined,
      ...config,
    };
  }

  /**
   * Scan text and return violations
   * This is the main O(n) scanning pipeline
   * @param text - Text to scan
   * @param metadata - Optional metadata to attach to result
   * @returns Scan result with violations
   */
  scan(text: string, metadata?: Record<string, unknown>): ScanResult {
    const violations: ViolationNode[] = [];
    const timestamp = new Date();

    // Apply each strategy to the text
    for (const strategy of this.strategies) {
      let strategyViolations: ViolationNode[];

      if ('regex' in strategy) {
        strategyViolations = applyRegexStrategy(text, strategy, this.config);
      } else {
        strategyViolations = applyKeywordStrategy(text, strategy, this.config);
      }

      violations.push(...strategyViolations);

      // Check max violations limit
      if (
        this.config.maxViolations &&
        violations.length >= this.config.maxViolations
      ) {
        break;
      }
    }

    // Sort violations by position for better reporting
    violations.sort((a, b) => a.start - b.start);

    return {
      text,
      violations,
      violationCount: violations.length,
      timestamp,
      metadata,
    };
  }

  /**
   * Scan multiple texts in sequence
   * @param texts - Array of texts to scan
   * @returns Array of scan results
   */
  scanMultiple(texts: string[]): ScanResult[] {
    return texts.map((text) => this.scan(text));
  }

  /**
   * Get the number of active strategies in this engine
   * @returns Strategy count
   */
  getStrategyCount(): number {
    return this.strategies.length;
  }

  /**
   * Update engine configuration
   * @param config - New configuration to merge
   */
  updateConfig(config: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
