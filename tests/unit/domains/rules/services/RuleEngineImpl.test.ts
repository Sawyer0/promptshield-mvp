import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { DefaultRuleEngine } from '../../../../../src/domains/rules/core/services/RuleEngineImpl';
import {
  RuleRepository,
  RuleMatcher,
} from '../../../../../src/domains/rules/core/ports/RuleEngine';
import { ok } from '../../../../../src/shared/types/Result';
import { createRule, createRulePack } from '../../../../helpers/testFactories';

describe('DefaultRuleEngine', () => {
  let engine: DefaultRuleEngine;
  let mockRepository: jest.Mocked<RuleRepository>;
  let mockMatcher: jest.Mocked<RuleMatcher>;

  beforeEach(() => {
    mockRepository = {
      loadFromYaml: jest.fn<RuleRepository['loadFromYaml']>(),
      saveToYaml: jest.fn<RuleRepository['saveToYaml']>(),
    };
    mockMatcher = {
      match: jest.fn<RuleMatcher['match']>(),
      matchAll: jest.fn<RuleMatcher['matchAll']>(),
    };
    engine = new DefaultRuleEngine(mockRepository, mockMatcher);
  });

  describe('loadRulePack', () => {
    test('should load rulepack from repository', async () => {
      const rulePack = createRulePack();
      mockRepository.loadFromYaml.mockResolvedValue(ok(rulePack));

      const result = await engine.loadRulePack('path/to/rulepack.yaml');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(rulePack);
      }
    });

    test('should return error if path is empty', async () => {
      const result = await engine.loadRulePack('');
      expect(result.isErr()).toBe(true);
    });
  });

  describe('applyRules', () => {
    test('should apply rules and return violations', async () => {
      const rules = [createRule()];
      const fields = { content: 'test content' };
      const mockMatch = {
        matched: true,
        position: { start: 0, end: 4, line: 1, column: 1 },
        context: { before: '', match: 'test', after: ' content' },
        pattern: 'test',
      };

      mockMatcher.matchAll.mockReturnValue(new Map([[rules[0], [mockMatch]]]));

      const result = await engine.applyRules(fields, rules, { index: 3 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].ruleId).toBe(rules[0].id);
        expect(result.value[0].field).toBe('content');
        expect(result.value[0].objectIndex).toBe(3);
        expect(result.value[0].position).toEqual(mockMatch.position);
      }
    });

    test('passes only enabled rules to the matcher and skips empty fields', async () => {
      const enabled = createRule({ id: 'on' });
      const disabled = createRule({ id: 'off', enabled: false });
      mockMatcher.matchAll.mockReturnValue(new Map());

      await engine.applyRules({ prompt: 'hi', response: '' }, [
        enabled,
        disabled,
      ]);

      expect(mockMatcher.matchAll).toHaveBeenCalledTimes(1);
      expect(mockMatcher.matchAll).toHaveBeenCalledWith('hi', [enabled]);
    });
  });
});
