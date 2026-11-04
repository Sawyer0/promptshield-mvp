import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { YamlRuleRepository } from '../../../../../src/domains/rules/adapters/YamlRuleRepository';
import { Rule } from '../../../../../src/domains/rules/core/entities/Rule';
import { RulePack } from '../../../../../src/domains/rules/core/entities/RulePack';

describe('YamlRuleRepository', () => {
  const repository = new YamlRuleRepository();
  let tempDir: string;

  const write = (name: string, content: string): string => {
    const file = path.join(tempDir, name);
    fs.writeFileSync(file, content);
    return file;
  };

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptshield-repo-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('loads a valid RulePack', async () => {
    const file = write(
      'valid.yaml',
      [
        'name: Test Pack',
        'description: For tests',
        "version: '2.0.0'",
        'rules:',
        '  - id: email',
        '    description: Email address',
        "    match_regex: ['[\\w.]+@[\\w.]+']",
        '    severity: high',
        '    category: pii',
        '  - id: secret-word',
        '    description: Secret word',
        "    match_keywords: ['swordfish']",
        '    enabled: false',
      ].join('\n')
    );

    const result = await repository.loadFromYaml(file);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('Test Pack');
      expect(result.value.version).toBe('2.0.0');
      expect(result.value.rules.map((r) => r.id)).toEqual([
        'email',
        'secret-word',
      ]);
      expect(result.value.getEnabledRules().map((r) => r.id)).toEqual([
        'email',
      ]);
    }
  });

  test('reports a missing file', async () => {
    const result = await repository.loadFromYaml(
      path.join(tempDir, 'missing.yaml')
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('RulePack file not found');
    }
  });

  test('reports an empty file', async () => {
    const result = await repository.loadFromYaml(write('empty.yaml', ''));

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Empty or invalid YAML');
    }
  });

  test('reports malformed YAML', async () => {
    const result = await repository.loadFromYaml(
      write('broken.yaml', 'name: [unclosed\n')
    );

    expect(result.isErr()).toBe(true);
  });

  test('rejects a RulePack with duplicate rule ids', async () => {
    const file = write(
      'dupes.yaml',
      [
        'name: Dupes',
        'description: Duplicate ids',
        'rules:',
        '  - id: a',
        '    description: First',
        "    match_keywords: ['x']",
        '  - id: a',
        '    description: Second',
        "    match_keywords: ['y']",
      ].join('\n')
    );

    const result = await repository.loadFromYaml(file);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Duplicate rule ID: a');
    }
  });

  test('saves a RulePack that loads back with the same rules', async () => {
    const pack = new RulePack('Round Trip', 'Saved and loaded', [
      new Rule('ssn', 'SSN', ['\\b\\d{3}-\\d{2}-\\d{4}\\b'], [], 'high', 'pii'),
      new Rule('dan', 'DAN', [], ['do anything now'], 'critical', 'security'),
    ]);
    const file = path.join(tempDir, 'nested', 'saved.yaml');

    const saveResult = await repository.saveToYaml(file, pack);
    expect(saveResult.isOk()).toBe(true);

    const loaded = await repository.loadFromYaml(file);
    expect(loaded.isOk()).toBe(true);
    if (loaded.isOk()) {
      expect(loaded.value.rules.map((r) => r.toYaml())).toEqual(
        pack.rules.map((r) => r.toYaml())
      );
    }
  });
});
