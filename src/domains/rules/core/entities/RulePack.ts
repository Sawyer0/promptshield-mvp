import { Rule, RuleCategory, RuleSeverity } from './Rule';
import { RulePackYamlData } from '../../../../shared/types/YamlData';

/**
 * Represents a collection of rules
 */
export class RulePack {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly rules: Rule[],
    public readonly version: string = '1.0.0',
    public readonly lastUpdated: Date = new Date()
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('RulePack name is required');
    }

    if (!this.description || this.description.trim() === '') {
      throw new Error('RulePack description is required');
    }

    if (this.rules.length === 0) {
      throw new Error('RulePack must have at least one rule');
    }

    // Check for duplicate rule IDs
    const ruleIds = new Set();
    this.rules.forEach((rule) => {
      if (ruleIds.has(rule.id)) {
        throw new Error(`Duplicate rule ID: ${rule.id}`);
      }
      ruleIds.add(rule.id);
    });
  }

  getEnabledRules(): Rule[] {
    return this.rules.filter((rule) => rule.enabled);
  }

  getRulesByCategory(category: RuleCategory): Rule[] {
    return this.rules.filter((rule) => rule.category === category);
  }

  getRulesBySeverity(severity: RuleSeverity): Rule[] {
    return this.rules.filter((rule) => rule.severity === severity);
  }

  getRulesByCategories(categories: RuleCategory[]): Rule[] {
    if (categories.length === 0) return this.rules;
    return this.rules.filter((rule) => categories.includes(rule.category));
  }

  getRulesBySeverities(severities: RuleSeverity[]): Rule[] {
    if (severities.length === 0) return this.rules;
    return this.rules.filter((rule) => severities.includes(rule.severity));
  }

  findRuleById(id: string): Rule | undefined {
    return this.rules.find((rule) => rule.id === id);
  }

  getCategories(): RuleCategory[] {
    const categories = new Set(this.rules.map((rule) => rule.category));
    return Array.from(categories);
  }

  getSeverities(): RuleSeverity[] {
    const severities = new Set(this.rules.map((rule) => rule.severity));
    return Array.from(severities);
  }

  getRuleCountByCategory(): Record<RuleCategory, number> {
    const counts = {} as Record<RuleCategory, number>;
    this.rules.forEach((rule) => {
      counts[rule.category] = (counts[rule.category] || 0) + 1;
    });
    return counts;
  }

  getRuleCountBySeverity(): Record<RuleSeverity, number> {
    const counts = {} as Record<RuleSeverity, number>;
    this.rules.forEach((rule) => {
      counts[rule.severity] = (counts[rule.severity] || 0) + 1;
    });
    return counts;
  }

  static fromYaml(data: unknown): RulePack {
    // Type guard to ensure data has required properties
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid rulepack data: must be an object');
    }

    const rulePackData = data as Record<string, unknown>;

    if (typeof rulePackData.name !== 'string') {
      throw new Error('Invalid rulepack data: name must be a string');
    }

    if (typeof rulePackData.description !== 'string') {
      throw new Error('Invalid rulepack data: description must be a string');
    }

    if (!Array.isArray(rulePackData.rules)) {
      throw new Error('Invalid rulepack data: rules must be an array');
    }

    const rules = rulePackData.rules.map((ruleData: unknown) =>
      Rule.fromYaml(ruleData)
    );

    return new RulePack(
      rulePackData.name,
      rulePackData.description,
      rules,
      typeof rulePackData.version === 'string' ? rulePackData.version : '1.0.0',
      typeof rulePackData.last_updated === 'string'
        ? new Date(rulePackData.last_updated)
        : new Date()
    );
  }

  toYaml(): RulePackYamlData {
    return {
      version: this.version,
      last_updated: this.lastUpdated.toISOString().split('T')[0],
      name: this.name,
      description: this.description,
      rules: this.rules.map((rule) => rule.toYaml()),
    };
  }
}
