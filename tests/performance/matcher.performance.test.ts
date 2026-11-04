import { describe, test } from '@jest/globals';
import { OptimizedRuleMatcher } from '../../src/domains/rules/core/services/OptimizedRuleMatcher';
import { Rule } from '../../src/domains/rules/core/entities/Rule';

describe('Matcher Performance Benchmark', () => {
  const matcher = new OptimizedRuleMatcher();

  const createRules = (count: number): Rule[] => {
    return Array.from({ length: count }, (_, i) => {
      return new Rule(
        `rule-${i}`,
        `Description for rule ${i}`,
        [`pattern-${i}-\\d+`, `random-${i}-regex`], // Regex patterns
        [`keyword${i}`, `key${i}`], // Keywords
        'medium',
        'security',
        true, // enabled
        false // caseSensitive
      );
    });
  };

  const generateContent = (sizeKb: number): string => {
    const base =
      'This is some random content with keywords and patterns like pattern-5-123 and keyword10. ';
    return base.repeat((sizeKb * 1024) / base.length);
  };

  const benchmark = (ruleCount: number, contentSizeKb: number) => {
    const rules = createRules(ruleCount);
    const content = generateContent(contentSizeKb);

    // Warm up
    matcher.compileRules(rules);
    matcher.matchAll(content, rules);

    const start = performance.now();
    const iterations = 10;
    for (let i = 0; i < iterations; i++) {
      matcher.matchAll(content, rules);
    }
    const end = performance.now();
    const avgTime = (end - start) / iterations;

    console.log(
      `Rules: ${ruleCount.toString().padEnd(5)} | Content: ${contentSizeKb.toString().padEnd(5)} KB | Avg Time: ${avgTime.toFixed(4)} ms`
    );
    return avgTime;
  };

  test('Benchmark: Rule Count Scaling (Content fixed at 100KB)', () => {
    console.log('\n--- Rule Count Scaling (Content: 100KB) ---');
    benchmark(10, 100);
    benchmark(50, 100);
    benchmark(100, 100);
    benchmark(250, 100);
    benchmark(500, 100);
  });

  test('Benchmark: Content Size Scaling (Rules fixed at 100)', () => {
    console.log('\n--- Content Size Scaling (Rules: 100) ---');
    benchmark(100, 10);
    benchmark(100, 50);
    benchmark(100, 100);
    benchmark(100, 250);
    benchmark(100, 500);
  });
});
