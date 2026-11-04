import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { RuleRepository } from '../core/ports/RuleEngine';
import { Result, ok, err } from '../../../shared/types/Result';
import { RulePack } from '../core/entities/RulePack';

/**
 * YAML-based rule repository implementation
 */
export class YamlRuleRepository implements RuleRepository {
  async loadFromYaml(filePath: string): Promise<Result<RulePack, Error>> {
    try {
      if (!fs.existsSync(filePath)) {
        return err(new Error(`RulePack file not found: ${filePath}`));
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');

      const data = yaml.load(content) as Record<string, unknown>;

      if (!data) {
        return err(new Error('Empty or invalid YAML file'));
      }

      try {
        const rulePack = RulePack.fromYaml(data);
        return ok(rulePack);
      } catch (validationError) {
        return err(new Error(`Invalid RulePack format: ${validationError}`));
      }
    } catch (error) {
      return err(new Error(`Failed to load RulePack from YAML: ${error}`));
    }
  }

  async saveToYaml(
    filePath: string,
    rulePack: RulePack
  ): Promise<Result<void, Error>> {
    try {
      const yamlData = rulePack.toYaml();

      const yamlContent = yaml.dump(yamlData, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      // Write to file
      await fs.promises.writeFile(filePath, yamlContent, 'utf-8');

      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to save RulePack to YAML: ${error}`));
    }
  }
}
