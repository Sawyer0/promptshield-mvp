import { describe, test, expect } from '@jest/globals';
import { RulePack } from '../../../../../src/domains/rules/core/entities/RulePack';
import { createRule } from '../../../../helpers/testFactories';

describe('RulePack', () => {
  const sampleRule = createRule({ id: 'rule1' });
  const sampleRules = [
    createRule({ id: 'rule1', category: 'pii', severity: 'high' }),
    createRule({ id: 'rule2', category: 'security', severity: 'critical' }),
  ];

  describe('constructor', () => {
    test('should create rulepack with all parameters', () => {
      const rules = [createRule({ id: 'rule1' }), createRule({ id: 'rule2' })];
      const lastUpdated = new Date('2024-01-15');

      const rulePack = new RulePack(
        'Test RulePack',
        'Test description',
        rules,
        '1.2.3',
        lastUpdated
      );

      expect(rulePack.name).toBe('Test RulePack');
      expect(rulePack.description).toBe('Test description');
      expect(rulePack.rules).toEqual(rules);
      expect(rulePack.version).toBe('1.2.3');
      expect(rulePack.lastUpdated).toBe(lastUpdated);
    });

    test('should throw error if name is empty', () => {
      expect(() => new RulePack('', 'desc', [sampleRule])).toThrow(
        'RulePack name is required'
      );
    });

    test('should throw error if description is empty', () => {
      expect(() => new RulePack('name', '', [sampleRule])).toThrow(
        'RulePack description is required'
      );
    });

    test('should throw error if rules array is empty', () => {
      expect(() => new RulePack('name', 'desc', [])).toThrow(
        'RulePack must have at least one rule'
      );
    });

    test('should throw error if duplicate rule IDs exist', () => {
      const rules = [createRule({ id: 'dup' }), createRule({ id: 'dup' })];
      expect(() => new RulePack('name', 'desc', rules)).toThrow(
        'Duplicate rule ID: dup'
      );
    });
  });

  describe('rule counting', () => {
    test('should return correct total rule count', () => {
      const rulePack = new RulePack('test', 'test', sampleRules);
      expect(rulePack.rules.length).toBe(2);
    });
  });

  describe('getEnabledRules', () => {
    test('should return only enabled rules', () => {
      const rules = [
        createRule({ id: 'enabled1', enabled: true }),
        createRule({ id: 'disabled1', enabled: false }),
        createRule({ id: 'enabled2', enabled: true }),
      ];
      const rulePack = new RulePack('test', 'test', rules);

      const enabledRules = rulePack.getEnabledRules();

      expect(enabledRules).toHaveLength(2);
      expect(enabledRules.map((r) => r.id)).toEqual(['enabled1', 'enabled2']);
    });
  });

  describe('findRuleById', () => {
    test('should return rule when found', () => {
      const targetRule = createRule({ id: 'target-rule' });
      const rules = [createRule({ id: 'other' }), targetRule];
      const rulePack = new RulePack('test', 'test', rules);

      const result = rulePack.findRuleById('target-rule');

      expect(result).toBe(targetRule);
    });

    test('should return undefined when rule not found', () => {
      const rulePack = new RulePack('test', 'test', [sampleRule]);
      expect(rulePack.findRuleById('nonexistent')).toBeUndefined();
    });
  });

  describe('filtering methods', () => {
    const rules = [
      createRule({ id: 'r1', category: 'pii', severity: 'high' }),
      createRule({ id: 'r2', category: 'security', severity: 'critical' }),
      createRule({ id: 'r3', category: 'pii', severity: 'low' }),
    ];
    const rulePack = new RulePack('test', 'test', rules);

    test('getRulesByCategory', () => {
      expect(rulePack.getRulesByCategory('pii')).toHaveLength(2);
      expect(rulePack.getRulesByCategory('security')).toHaveLength(1);
    });

    test('getRulesBySeverity', () => {
      expect(rulePack.getRulesBySeverity('critical')).toHaveLength(1);
      expect(rulePack.getRulesBySeverity('high')).toHaveLength(1);
    });

    test('getRulesByCategories', () => {
      expect(rulePack.getRulesByCategories(['pii', 'security'])).toHaveLength(
        3
      );
      expect(rulePack.getRulesByCategories(['security'])).toHaveLength(1);
      expect(rulePack.getRulesByCategories([])).toHaveLength(3);
    });

    test('getRulesBySeverities', () => {
      expect(rulePack.getRulesBySeverities(['critical', 'high'])).toHaveLength(
        2
      );
      expect(rulePack.getRulesBySeverities([])).toHaveLength(3);
    });
  });

  describe('metadata and statistics', () => {
    const rules = [
      createRule({ id: 'r1', category: 'pii', severity: 'high' }),
      createRule({ id: 'r2', category: 'security', severity: 'critical' }),
      createRule({ id: 'r3', category: 'pii', severity: 'low' }),
    ];
    const rulePack = new RulePack('test', 'test', rules);

    test('getCategories', () => {
      const categories = rulePack.getCategories();
      expect(categories).toContain('pii');
      expect(categories).toContain('security');
      expect(categories).toHaveLength(2);
    });

    test('getSeverities', () => {
      const severities = rulePack.getSeverities();
      expect(severities).toContain('high');
      expect(severities).toContain('critical');
      expect(severities).toContain('low');
      expect(severities).toHaveLength(3);
    });

    test('getRuleCountByCategory', () => {
      const counts = rulePack.getRuleCountByCategory();
      expect(counts.pii).toBe(2);
      expect(counts.security).toBe(1);
    });

    test('getRuleCountBySeverity', () => {
      const counts = rulePack.getRuleCountBySeverity();
      expect(counts.high).toBe(1);
      expect(counts.critical).toBe(1);
      expect(counts.low).toBe(1);
    });
  });

  describe('YAML conversion', () => {
    test('should convert to YAML data', () => {
      const rulePack = new RulePack('Test Pack', 'Desc', [sampleRule], '2.0.0');
      const yaml = rulePack.toYaml();

      expect(yaml.name).toBe('Test Pack');
      expect(yaml.version).toBe('2.0.0');
      expect(yaml.rules).toHaveLength(1);
      expect(yaml.last_updated).toBeDefined();
    });

    test('should create from YAML data', () => {
      const yamlData = {
        name: 'YAML Pack',
        description: 'YAML Desc',
        version: '1.5.0',
        last_updated: '2023-12-01',
        rules: [
          {
            id: 'r1',
            description: 'desc',
            match_keywords: ['test'],
            category: 'pii',
          },
        ],
      };

      const rulePack = RulePack.fromYaml(yamlData);

      expect(rulePack.name).toBe('YAML Pack');
      expect(rulePack.version).toBe('1.5.0');
      expect(rulePack.rules).toHaveLength(1);
      expect(rulePack.rules[0].id).toBe('r1');
    });
  });
});
