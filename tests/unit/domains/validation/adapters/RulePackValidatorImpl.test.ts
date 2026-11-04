import { describe, test, expect, beforeEach } from '@jest/globals';
import { RulePackValidatorImpl } from '../../../../../src/domains/validation/adapters/validators/RulePackValidatorImpl';
import { ValidationOptions } from '../../../../../src/domains/validation/core/entities/ValidationOptions';
import { RuleYamlData } from '../../../../../src/shared/types/YamlData';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('RulePackValidatorImpl', () => {
  let validator: RulePackValidatorImpl;
  let tempDir: string;

  beforeEach(() => {
    validator = new RulePackValidatorImpl();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptshield-test-'));
  });

  describe('supports', () => {
    test('should support YAML files', () => {
      const options = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      expect(validator.supports('test.yaml', options)).toBe(true);
      expect(validator.supports('test.yml', options)).toBe(true);
      expect(validator.supports('rules.yaml', options)).toBe(true);
    });

    test('should not support non-YAML files', () => {
      const options = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      expect(validator.supports('test.json', options)).toBe(false);
      expect(validator.supports('test.txt', options)).toBe(false);
      expect(validator.supports('test.xml', options)).toBe(false);
    });
  });

  describe('validate', () => {
    test('should validate valid YAML structure', async () => {
      const filePath = path.join(tempDir, 'valid.yaml');
      const validYaml = `
name: Test RulePack
description: Test rules for validation
version: 1.0.0
rules:
  - id: test-rule-1
    description: Test rule 1
    severity: medium
    category: custom
    match_keywords: [test, example]
    enabled: true
  - id: test-rule-2
    description: Test rule 2
    severity: high
    category: security
    match_regex: [\\bpassword\\b]
    enabled: true
`;
      fs.writeFileSync(filePath, validYaml);

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
        format: 'yaml',
      };
      const result = await validator.validate(filePath, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      }
    });

    test('should detect missing required fields', async () => {
      const filePath = path.join(tempDir, 'invalid.yaml');
      const invalidYaml = `
description: Missing name field
version: 1.0.0
rules:
  - description: Test rule
    severity: medium
    category: custom
`;
      fs.writeFileSync(filePath, invalidYaml);

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
        format: 'yaml',
      };
      const result = await validator.validate(filePath, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors.length).toBeGreaterThan(0);

        const errorMessages = result.value.errors.map((e: any) => e.message);
        // Check that at least one of the required field errors is present
        expect(
          errorMessages.some(
            (msg: any) =>
              msg.includes('name') ||
              msg.includes('description') ||
              msg.includes('version') ||
              msg.includes('rules')
          )
        ).toBe(true);
      }
    });

    test('should detect malformed YAML', async () => {
      const filePath = path.join(tempDir, 'malformed.yaml');
      const malformedYaml = `
name: Test RulePack
description: Test rules
version: 1.0.0
rules:
  - id: test-rule
    description: Test rule
    severity: medium
    category: custom
    match_keywords: [test, example
    enabled: true
`; // Missing closing bracket
      fs.writeFileSync(filePath, malformedYaml);

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
        format: 'yaml',
      };
      const result = await validator.validate(filePath, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
        expect(
          result.value.errors.some((e: any) => e.message.includes('YAML'))
        ).toBe(true);
      }
    });
  });

  describe('validateRulePack', () => {
    test('should validate rulepack structure', async () => {
      const filePath = path.join(tempDir, 'test.yaml');
      const validYaml = `
name: Test RulePack
description: Test rules
version: 1.0.0
rules:
  - id: test-rule
    description: Test rule
    severity: medium
    category: custom
    match_keywords: [test]
    enabled: true
`;
      fs.writeFileSync(filePath, validYaml);

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      const result = await validator.validateRulePack(filePath, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(true);
      }
    });

    test('should detect invalid rule structure', async () => {
      const filePath = path.join(tempDir, 'test.yaml');
      const yamlWithInvalidRule = `
name: Test RulePack
description: Test rules
version: 1.0.0
rules:
  - id: test-rule
    description: Test rule
    severity: invalid-severity
    category: custom
    match_keywords: [test]
    enabled: true
`;
      fs.writeFileSync(filePath, yamlWithInvalidRule);

      const options: ValidationOptions = {
        strict: true,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      const result = await validator.validateRulePack(filePath, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
        expect(
          result.value.errors.some((e: any) => e.message.includes('severity'))
        ).toBe(true);
      }
    });
  });

  describe('validateYamlSyntax', () => {
    test('should validate correct YAML syntax', async () => {
      const validYaml = `
name: Test RulePack
description: Test rules
version: 1.0.0
rules:
  - id: test-rule
    description: Test rule
    severity: medium
    category: custom
    match_keywords: [test]
    enabled: true
`;

      const result = await validator.validateYamlSyntax(validYaml);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('should detect invalid YAML syntax', async () => {
      const invalidYaml = `
name: Test RulePack
description: Test rules
version: 1.0.0
rules:
  - id: test-rule
    description: Test rule
    severity: medium
    category: custom
    match_keywords: [test, example
    enabled: true
`; // Missing closing bracket

      const result = await validator.validateYamlSyntax(invalidYaml);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('YAML syntax error');
      }
    });
  });

  describe('validateRuleSchema', () => {
    test('should validate valid rule schema', async () => {
      const validRule: RuleYamlData = {
        id: 'test-rule',
        description: 'Test rule',
        severity: 'medium',
        category: 'custom',
        match_keywords: ['test'],
        enabled: true,
      };

      const result = await validator.validateRuleSchema(validRule);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('should detect invalid rule schema', async () => {
      const invalidRule = {
        description: 'Test rule',
        severity: 'invalid-severity',
        category: 'custom',
        // Missing required fields
      };

      const result = await validator.validateRuleSchema(
        invalidRule as unknown as RuleYamlData
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Rule must have a valid id');
      }
    });
  });

  describe('validateRegexPatterns', () => {
    test('should validate valid regex patterns', async () => {
      const rules = [
        {
          id: 'email-rule',
          match_regex: ['\\b[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}\\b'],
        },
        {
          id: 'ssn-rule',
          match_regex: ['\\d{3}-\\d{2}-\\d{4}'],
        },
      ];

      const result = await validator.validateRegexPatterns(
        rules as unknown as RuleYamlData[]
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(true);
      }
    });

    test('should detect invalid regex patterns', async () => {
      const rules = [
        {
          id: 'invalid-rule',
          match_regex: ['\\b[invalid-regex\\b'], // Unclosed bracket
        },
      ];

      const result = await validator.validateRegexPatterns(
        rules as unknown as RuleYamlData[]
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
        expect(
          result.value.errors.some((e: any) => e.message.includes('regex'))
        ).toBe(true);
      }
    });
  });
});
