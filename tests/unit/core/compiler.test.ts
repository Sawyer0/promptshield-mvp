import { describe, test, expect } from '@jest/globals';
import {
  compileRule,
  compileRulePack,
  compileRulePacks,
  RuleCompilationError,
  Rule,
  RulePack,
} from '../../../src';

const emailRule: Rule = {
  id: 'email',
  description: 'Email address',
  match_regex: ['[\\w.]+@[\\w.]+\\.\\w+'],
  severity: 'high',
  category: 'pii',
};

const pack = (rules: Rule[], name = 'test-pack'): RulePack => ({
  name,
  description: 'Test pack',
  rules,
});

describe('compileRule', () => {
  test('returns the rule metadata', () => {
    expect(compileRule(emailRule)).toEqual({
      id: 'email',
      description: 'Email address',
      severity: 'high',
      category: 'pii',
    });
  });

  test('applies the YAML defaults for severity and category', () => {
    const compiled = compileRule({
      id: 'kw',
      description: 'Keyword',
      match_keywords: ['secret'],
    });
    expect(compiled.severity).toBe('medium');
    expect(compiled.category).toBe('custom');
  });

  test('returns a frozen object', () => {
    expect(Object.isFrozen(compileRule(emailRule))).toBe(true);
  });

  test('rejects a disabled rule', () => {
    expect(() => compileRule({ ...emailRule, enabled: false })).toThrow(
      RuleCompilationError
    );
  });

  test('rejects a rule without patterns', () => {
    expect(() => compileRule({ id: 'empty', description: 'Nothing' })).toThrow(
      /match_regex or match_keywords/
    );
  });

  test('rejects an invalid regex and names the rule', () => {
    try {
      compileRule({ ...emailRule, match_regex: ['(unclosed'] });
      throw new Error('expected compileRule to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(RuleCompilationError);
      expect((error as RuleCompilationError).ruleId).toBe('email');
      expect((error as Error).message).toMatch(/Invalid regex pattern/);
    }
  });

  test('rejects an unknown severity', () => {
    expect(() =>
      compileRule({ ...emailRule, severity: 'urgent' as never })
    ).toThrow(/invalid severity 'urgent'/);
  });

  test('rejects an unknown category', () => {
    expect(() =>
      compileRule({ ...emailRule, category: 'spam' as never })
    ).toThrow(/invalid category 'spam'/);
  });
});

describe('compileRulePack', () => {
  test('compiles enabled rules and skips disabled ones', () => {
    const compiled = compileRulePack(
      pack([
        emailRule,
        {
          id: 'off',
          description: 'Off',
          match_keywords: ['x'],
          enabled: false,
        },
      ])
    );
    expect(compiled.map((r) => r.id)).toEqual(['email']);
  });

  test('reports every invalid rule at once', () => {
    expect(() =>
      compileRulePack(
        pack([
          { id: 'a', description: 'A', match_regex: ['('] },
          { id: 'b', description: 'B' },
          emailRule,
        ])
      )
    ).toThrow(/Failed to compile 2 rule\(s\) from RulePack 'test-pack'/);
  });

  test('rejects duplicate rule ids', () => {
    expect(() => compileRulePack(pack([emailRule, emailRule]))).toThrow(
      /Duplicate rule id 'email'/
    );
  });

  test('rejects a pack without a rules array', () => {
    expect(() => compileRulePack({} as RulePack)).toThrow(
      /must have a rules array/
    );
  });
});

describe('compileRulePacks', () => {
  test('flattens rules from several packs in order', () => {
    const compiled = compileRulePacks([
      pack([emailRule], 'one'),
      pack(
        [{ id: 'kw', description: 'Keyword', match_keywords: ['secret'] }],
        'two'
      ),
    ]);
    expect(compiled.map((r) => r.id)).toEqual(['email', 'kw']);
  });
});
