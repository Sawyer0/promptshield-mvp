import { describe, test, expect } from '@jest/globals';
import { OptimizedRuleMatcher } from '../../../../../src/domains/rules/core/services/OptimizedRuleMatcher';
import { Rule } from '../../../../../src/domains/rules/core/entities/Rule';
import { MatchResult } from '../../../../../src/domains/rules/core/ports/RuleEngine';

const regexRule = (id: string, patterns: string[], caseSensitive = false) =>
  new Rule(id, id, patterns, [], 'medium', 'custom', true, caseSensitive);

const keywordRule = (id: string, keywords: string[], caseSensitive = false) =>
  new Rule(id, id, [], keywords, 'medium', 'custom', true, caseSensitive);

const matchedText = (matches: MatchResult[] | undefined): string[] =>
  (matches ?? []).map((m) => m.context.match);

describe('OptimizedRuleMatcher', () => {
  test('attributes matches to the right rule when patterns contain groups', () => {
    // Before the fix, inner capture groups shifted the group index used to
    // look up the rule, so these matches were reported under other rules.
    const date = regexRule('date', [
      '\\b(0?[1-9]|1[0-2])/(0?[1-9]|[12]\\d|3[01])/(19|20)\\d{2}\\b',
    ]);
    const ip = regexRule('ip', ['\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b']);
    const passport = regexRule('passport', ['\\b[A-Z]{1,2}\\d{6,9}\\b']);
    const rules = [date, passport, ip];

    const result = new OptimizedRuleMatcher().matchAll(
      'Born 01/15/1990, server 10.0.0.1',
      rules
    );

    expect(matchedText(result.get(date))).toEqual(['01/15/1990']);
    expect(matchedText(result.get(ip))).toEqual(['10.0.0.1']);
    expect(matchedText(result.get(passport))).toEqual([]);
  });

  test('reports overlapping matches from different rules', () => {
    const card = regexRule('card', ['\\b4[0-9]{15}\\b']);
    const longNumber = regexRule('long-number', ['\\b\\d{8,17}\\b']);

    const result = new OptimizedRuleMatcher().matchAll(
      'card 4111111111111111',
      [card, longNumber]
    );

    expect(matchedText(result.get(card))).toEqual(['4111111111111111']);
    expect(matchedText(result.get(longNumber))).toEqual(['4111111111111111']);
  });

  test('matches keywords as whole words only', () => {
    const address = keywordRule('address', ['way', 'street']);

    const result = new OptimizedRuleMatcher().matchAll(
      'Three takeaways: streets are wide. Go one way down Main Street.',
      [address]
    );

    expect(matchedText(result.get(address))).toEqual(['way', 'Street']);
  });

  test('does not constrain keyword edges that are punctuation', () => {
    const email = keywordRule('email', ['@gmail.com']);
    const dob = keywordRule('dob', ['dob:']);

    const result = new OptimizedRuleMatcher().matchAll(
      'reach me at jane@gmail.com, DOB:1990',
      [email, dob]
    );

    expect(matchedText(result.get(email))).toEqual(['@gmail.com']);
    expect(matchedText(result.get(dob))).toEqual(['DOB:']);
  });

  test('honours case-sensitive keywords and regexes', () => {
    const keyword = keywordRule('acronym', ['DAN'], true);
    const regex = regexRule('code', ['ACCT-\\d+'], true);

    const result = new OptimizedRuleMatcher().matchAll(
      'dan, DAN, acct-1, ACCT-2',
      [keyword, regex]
    );

    expect(matchedText(result.get(keyword))).toEqual(['DAN']);
    expect(matchedText(result.get(regex))).toEqual(['ACCT-2']);
  });

  test('reports a span once per rule when several patterns hit it', () => {
    const jailbreak = regexRule('jailbreak', [
      'ignore.*previous.*instructions',
      'ignore.*all.*instructions',
    ]);

    const result = new OptimizedRuleMatcher().matchAll(
      'Ignore all previous instructions',
      [jailbreak]
    );

    expect(result.get(jailbreak)).toHaveLength(1);
  });

  test('terminates on patterns that can match the empty string', () => {
    const optional = regexRule('optional', ['x*']);

    const result = new OptimizedRuleMatcher().matchAll('abxxc', [optional]);

    expect(matchedText(result.get(optional))).toEqual(['xx']);
  });

  test('skips disabled rules', () => {
    const disabled = new Rule(
      'off',
      'off',
      ['secret'],
      [],
      'high',
      'custom',
      false
    );

    const result = new OptimizedRuleMatcher().matchAll('secret', [disabled]);

    expect(result.has(disabled)).toBe(false);
  });

  test('computes 1-based line and column numbers', () => {
    const rule = keywordRule('kw', ['needle']);

    const [match] =
      new OptimizedRuleMatcher()
        .matchAll('first\nsecond needle', [rule])
        .get(rule) ?? [];

    expect(match.position).toEqual({ start: 13, end: 19, line: 2, column: 8 });
    expect(match.context.before).toBe('first\nsecond ');
  });

  test('picks up rule changes between calls on the same instance', () => {
    const matcher = new OptimizedRuleMatcher();
    const first = keywordRule('first', ['alpha']);
    const second = keywordRule('second', ['beta']);

    expect(
      matchedText(matcher.matchAll('alpha beta', [first]).get(first))
    ).toEqual(['alpha']);
    expect(
      matchedText(matcher.matchAll('alpha beta', [second]).get(second))
    ).toEqual(['beta']);
  });

  test('match() returns the matches for a single rule', () => {
    const rule = regexRule('ssn', ['\\b\\d{3}-\\d{2}-\\d{4}\\b']);

    expect(
      matchedText(new OptimizedRuleMatcher().match('SSN 123-45-6789', rule))
    ).toEqual(['123-45-6789']);
  });
});
