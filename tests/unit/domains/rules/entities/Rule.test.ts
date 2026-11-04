import { describe, test, expect } from '@jest/globals';
import { Rule } from '../../../../../src/domains/rules/core/entities/Rule';

describe('Rule', () => {
  describe('constructor', () => {
    test('should create rule with all parameters', () => {
      const rule = new Rule(
        'test-rule',
        'Test description',
        ['\\btest\\b'],
        ['keyword'],
        'high',
        'security',
        true,
        false
      );

      expect(rule.id).toBe('test-rule');
      expect(rule.description).toBe('Test description');
      expect(rule.matchRegex).toEqual(['\\btest\\b']);
      expect(rule.matchKeywords).toEqual(['keyword']);
      expect(rule.severity).toBe('high');
      expect(rule.category).toBe('security');
      expect(rule.enabled).toBe(true);
      expect(rule.caseSensitive).toBe(false);
    });

    test('should create rule with minimal parameters', () => {
      const rule = new Rule(
        'minimal-rule',
        'Minimal description',
        [],
        ['test']
      );

      expect(rule.id).toBe('minimal-rule');
      expect(rule.description).toBe('Minimal description');
      expect(rule.matchRegex).toEqual([]);
      expect(rule.matchKeywords).toEqual(['test']);
      expect(rule.severity).toBe('medium'); // default
      expect(rule.category).toBe('custom'); // default
      expect(rule.enabled).toBe(true); // default
      expect(rule.caseSensitive).toBe(false); // default
    });

    test('should throw error if ID is empty', () => {
      expect(() => new Rule('', 'desc', [], ['test'])).toThrow(
        'Rule ID is required'
      );
    });

    test('should throw error if description is empty', () => {
      expect(() => new Rule('id', '', [], ['test'])).toThrow(
        'Rule description is required'
      );
    });

    test('should throw error if no patterns are provided', () => {
      expect(() => new Rule('id', 'desc', [], [])).toThrow(
        'Rule must have either match_regex or match_keywords'
      );
    });

    test('should throw error for invalid regex', () => {
      expect(() => new Rule('id', 'desc', ['['], [])).toThrow(
        'Invalid regex pattern: ['
      );
    });
  });

  describe('hasRegexPatterns', () => {
    test('should return true when regex patterns exist', () => {
      const rule = new Rule('test', 'test', ['\\btest\\b'], []);
      expect(rule.hasRegexPatterns()).toBe(true);
    });

    test('should return false when no regex patterns exist', () => {
      const rule = new Rule('test', 'test', [], ['keyword']);
      expect(rule.hasRegexPatterns()).toBe(false);
    });
  });

  describe('hasKeywordPatterns', () => {
    test('should return true when keyword patterns exist', () => {
      const rule = new Rule('test', 'test', [], ['keyword']);
      expect(rule.hasKeywordPatterns()).toBe(true);
    });

    test('should return false when no keyword patterns exist', () => {
      const rule = new Rule('test', 'test', ['\\btest\\b'], []);
      expect(rule.hasKeywordPatterns()).toBe(false);
    });
  });

  describe('pattern detection', () => {
    test('should detect any patterns', () => {
      const rule1 = new Rule('test1', 'test', ['\\btest\\b'], []);
      const rule2 = new Rule('test2', 'test', [], ['keyword']);
      const rule3 = new Rule('test3', 'test', ['\\btest\\b'], ['keyword']);

      expect(rule1.hasRegexPatterns() || rule1.hasKeywordPatterns()).toBe(true);
      expect(rule2.hasRegexPatterns() || rule2.hasKeywordPatterns()).toBe(true);
      expect(rule3.hasRegexPatterns() || rule3.hasKeywordPatterns()).toBe(true);
    });
  });

  describe('getCompiledRegexPatterns', () => {
    test('should return compiled RegEx objects', () => {
      const rule = new Rule('test', 'test', ['test1', 'test2'], []);
      const regexes = rule.getCompiledRegexPatterns();

      expect(regexes).toHaveLength(2);
      expect(regexes[0]).toBeInstanceOf(RegExp);
      expect(regexes[0].source).toBe('test1');
      expect(regexes[1].source).toBe('test2');
    });

    test('should handle case sensitivity', () => {
      const caseInsensitiveRule = new Rule(
        'test',
        'test',
        ['test'],
        [],
        'medium',
        'custom',
        true,
        false
      );
      const caseSensitiveRule = new Rule(
        'test',
        'test',
        ['test'],
        [],
        'medium',
        'custom',
        true,
        true
      );

      expect(caseInsensitiveRule.getCompiledRegexPatterns()[0].flags).toContain(
        'i'
      );
      expect(
        caseSensitiveRule.getCompiledRegexPatterns()[0].flags
      ).not.toContain('i');
    });
  });

  describe('getNormalizedKeywords', () => {
    test('should lowercase keywords when case insensitive', () => {
      const rule = new Rule(
        'test',
        'test',
        [],
        ['KEYWORD', 'MixedCase'],
        'medium',
        'custom',
        true,
        false
      );
      expect(rule.getNormalizedKeywords()).toEqual(['keyword', 'mixedcase']);
    });

    test('should preserve case when case sensitive', () => {
      const rule = new Rule(
        'test',
        'test',
        [],
        ['KEYWORD', 'MixedCase'],
        'medium',
        'custom',
        true,
        true
      );
      expect(rule.getNormalizedKeywords()).toEqual(['KEYWORD', 'MixedCase']);
    });
  });

  describe('YAML conversion', () => {
    test('should convert to YAML data', () => {
      const rule = new Rule(
        'test-id',
        'test-desc',
        ['regex'],
        ['keyword'],
        'high',
        'security',
        true,
        true
      );
      const yaml = rule.toYaml();

      expect(yaml.id).toBe('test-id');
      expect(yaml.description).toBe('test-desc');
      expect(yaml.match_regex).toEqual(['regex']);
      expect(yaml.match_keywords).toEqual(['keyword']);
      expect(yaml.severity).toBe('high');
      expect(yaml.category).toBe('security');
      expect(yaml.enabled).toBe(true);
      expect(yaml.case_sensitive).toBe(true);
    });

    test('should create from YAML data', () => {
      const yamlData = {
        id: 'yaml-id',
        description: 'yaml-desc',
        match_regex: ['regex-pattern'],
        severity: 'critical',
        category: 'pii',
        enabled: false,
      };

      const rule = Rule.fromYaml(yamlData);

      expect(rule.id).toBe('yaml-id');
      expect(rule.description).toBe('yaml-desc');
      expect(rule.matchRegex).toEqual(['regex-pattern']);
      expect(rule.severity).toBe('critical');
      expect(rule.category).toBe('pii');
      expect(rule.enabled).toBe(false);
    });
  });
});
