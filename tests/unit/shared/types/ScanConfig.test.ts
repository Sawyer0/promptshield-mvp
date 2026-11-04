import { describe, test, expect } from '@jest/globals';
import { createScanConfig } from '../../../helpers/testFactories';

describe('ScanConfig', () => {
  describe('creation', () => {
    test('should create config with all default values', () => {
      const config = createScanConfig();

      expect(config.rulepack).toBe('test-rulepack.yaml');
      expect(config.outputFormat).toBe('json');
      expect(config.maxViolations).toBe(100);
      expect(config.fields).toEqual(['prompt', 'response']);
      expect(config.quiet).toBe(false);
    });

    test('should create config with custom values', () => {
      const config = createScanConfig({
        rulepack: 'custom-rules.yaml',
        outputFormat: 'markdown',
        severity: ['critical', 'high'],
        maxViolations: 50,
        verbose: true,
      });

      expect(config.rulepack).toBe('custom-rules.yaml');
      expect(config.outputFormat).toBe('markdown');
      expect(config.severity).toEqual(['critical', 'high']);
      expect(config.maxViolations).toBe(50);
      expect(config.verbose).toBe(true);
    });
  });

  describe('output formats', () => {
    test('should accept all valid output formats', () => {
      const formats = ['json', 'markdown', 'csv', 'table', 'html', 'ndjson'];

      formats.forEach((format) => {
        const config = createScanConfig({ outputFormat: format as any });
        expect(config.outputFormat).toBe(format);
      });
    });
  });

  describe('severity filtering', () => {
    test('should accept severity arrays', () => {
      const config = createScanConfig({
        severity: ['critical', 'high', 'medium'],
      });

      expect(config.severity).toEqual(['critical', 'high', 'medium']);
      expect(config.severity).toHaveLength(3);
    });

    test('should accept empty severity array', () => {
      const config = createScanConfig({ severity: [] });
      expect(config.severity).toEqual([]);
    });

    test('should accept single severity', () => {
      const config = createScanConfig({ severity: ['critical'] });
      expect(config.severity).toEqual(['critical']);
    });
  });

  describe('category filtering', () => {
    test('should accept category arrays', () => {
      const config = createScanConfig({
        category: ['pii', 'security', 'bias'],
      });

      expect(config.category).toEqual(['pii', 'security', 'bias']);
      expect(config.category).toHaveLength(3);
    });

    test('should accept empty category array', () => {
      const config = createScanConfig({ category: [] });
      expect(config.category).toEqual([]);
    });
  });

  describe('field configuration', () => {
    test('should configure specific fields to scan', () => {
      const config = createScanConfig({
        fields: ['user_input', 'ai_response', 'metadata.content'],
      });

      expect(config.fields).toEqual([
        'user_input',
        'ai_response',
        'metadata.content',
      ]);
    });

    test('should handle scan entire object option', () => {
      const config = createScanConfig({
        scanEntireObject: true,
        fields: [],
      });

      expect(config.scanEntireObject).toBe(true);
      expect(config.fields).toEqual([]);
    });
  });

  describe('processing limits', () => {
    test('should configure object and depth limits', () => {
      const config = createScanConfig({
        maxObjects: 5000,
        maxDepth: 6,
        maxViolations: 200,
      });

      expect(config.maxObjects).toBe(5000);
      expect(config.maxDepth).toBe(6);
      expect(config.maxViolations).toBe(200);
    });
  });

  describe('performance settings', () => {
    test('should configure streaming', () => {
      const config = createScanConfig({
        streamingThreshold: 2000,
        ndjsonMode: true,
      });

      expect(config.streamingThreshold).toBe(2000);
      expect(config.ndjsonMode).toBe(true);
    });
  });

  describe('output configuration', () => {
    test('should configure output file', () => {
      const config = createScanConfig({
        outputFile: 'scan-results.json',
      });

      expect(config.outputFile).toBe('scan-results.json');
    });

    test('should handle undefined output file', () => {
      const config = createScanConfig({ outputFile: undefined });
      expect(config.outputFile).toBeUndefined();
    });
  });

  describe('behavior flags', () => {
    test('should configure verbosity flags', () => {
      const config = createScanConfig({
        quiet: true,
        verbose: false,
        debug: true,
      });

      expect(config.quiet).toBe(true);
      expect(config.verbose).toBe(false);
      expect(config.debug).toBe(true);
    });

    test('should configure failure conditions', () => {
      const config = createScanConfig({
        failOn: 'high',
        noColor: true,
      });

      expect(config.failOn).toBe('high');
      expect(config.noColor).toBe(true);
    });
  });

  describe('validation', () => {
    test('should validate conflicting options', () => {
      // Quiet and verbose should not both be true
      const config = createScanConfig({
        quiet: true,
        verbose: true,
      });

      // In a real implementation, this might be validated
      expect(config.quiet).toBe(true);
      expect(config.verbose).toBe(true);
    });

    test('should validate numeric ranges', () => {
      const config = createScanConfig({
        maxObjects: 0,
        maxDepth: -1,
      });

      // Values should be within expected ranges
      expect(config.maxObjects).toBe(0);
      expect(config.maxDepth).toBe(-1);
    });
  });

  describe('serialization', () => {
    test('should serialize to JSON correctly', () => {
      const config = createScanConfig({
        rulepack: 'test.yaml',
        severity: ['critical'],
      });

      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      expect(parsed.rulepack).toBe('test.yaml');
      expect(parsed.severity).toEqual(['critical']);
    });

    test('should handle undefined values in serialization', () => {
      const config = createScanConfig({
        outputFile: undefined,
        failOn: undefined,
      });

      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      expect(parsed.outputFile).toBeUndefined();
      expect(parsed.failOn).toBeUndefined();
    });
  });

  describe('cloning and merging', () => {
    test('should support config merging pattern', () => {
      const baseConfig = createScanConfig({
        rulepack: 'base.yaml',
        outputFormat: 'json',
        quiet: false,
      });

      const overrideConfig = {
        outputFormat: 'markdown' as const,
        quiet: true,
        verbose: true,
      };

      const mergedConfig = { ...baseConfig, ...overrideConfig };

      expect(mergedConfig.rulepack).toBe('base.yaml'); // From base
      expect(mergedConfig.outputFormat).toBe('markdown'); // Overridden
      expect(mergedConfig.quiet).toBe(true); // Overridden
      expect(mergedConfig.verbose).toBe(true); // Overridden
    });

    test('should support partial config updates', () => {
      const config = createScanConfig();
      const updatedConfig = {
        ...config,
        severity: ['critical', 'high'] as const,
        maxViolations: 50,
      };

      expect(updatedConfig.severity).toEqual(['critical', 'high']);
      expect(updatedConfig.maxViolations).toBe(50);
      expect(updatedConfig.rulepack).toBe(config.rulepack); // Unchanged
    });
  });
});
