import { describe, test, expect } from '@jest/globals';
import { ScanContext } from '../../../../../src/domains/scanning/core/entities/ScanContext';
import {
  createScanConfig,
  createScanContext,
  createRulePack,
} from '../../../../helpers/testFactories';

describe('ScanContext', () => {
  describe('constructor', () => {
    test('should create scan context with config and rulepack', () => {
      const config = createScanConfig();
      const rulePack = createRulePack();
      const startTime = new Date('2025-01-01T00:00:00Z');

      const context = new ScanContext(config, rulePack, startTime);

      expect(context.config).toBe(config);
      expect(context.rulePack).toBe(rulePack);
      expect(context.startTime).toBe(startTime);
    });

    test('should use current time as default start time', () => {
      const beforeTime = new Date();
      const context = createScanContext();
      const afterTime = new Date();

      expect(context.startTime.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(context.startTime.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
    });
  });

  describe('getFieldsToScan', () => {
    test('should return configured fields when specified', () => {
      const config = createScanConfig({
        fields: ['prompt', 'response', 'metadata'],
      });
      const context = new ScanContext(config, createRulePack());

      const fields = context.getFieldsToScan();

      expect(fields).toEqual(['prompt', 'response', 'metadata']);
    });

    test('should return default fields when not specified', () => {
      const config = createScanConfig({ fields: [] });
      const context = new ScanContext(config, createRulePack());

      const fields = context.getFieldsToScan();

      expect(fields).toEqual(['prompt', 'response']);
    });

    test('should handle undefined fields', () => {
      const config = createScanConfig();
      // Remove fields property to test fallback
      delete (config as any).fields;
      const context = new ScanContext(config, createRulePack());

      const fields = context.getFieldsToScan();

      expect(fields).toEqual(['prompt', 'response']);
    });
  });

  describe('shouldScanEntireObject', () => {
    test('should return true when scanEntireObject is enabled', () => {
      const config = createScanConfig({ scanEntireObject: true });
      const context = new ScanContext(config, createRulePack());

      expect(context.shouldScanEntireObject()).toBe(true);
    });

    test('should return false when scanEntireObject is disabled', () => {
      const config = createScanConfig({ scanEntireObject: false });
      const context = new ScanContext(config, createRulePack());

      expect(context.shouldScanEntireObject()).toBe(false);
    });

    test('should return false when scanEntireObject is undefined', () => {
      const config = createScanConfig();
      delete (config as any).scanEntireObject;
      const context = new ScanContext(config, createRulePack());

      expect(context.shouldScanEntireObject()).toBe(false);
    });
  });

  describe('getMaxDepth', () => {
    test('should return configured max depth', () => {
      const config = createScanConfig({ maxDepth: 10 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getMaxDepth()).toBe(10);
    });

    test('should return default max depth when not specified', () => {
      const config = createScanConfig({ maxDepth: 0 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getMaxDepth()).toBe(4);
    });

    test('should handle undefined max depth', () => {
      const config = createScanConfig();
      delete (config as any).maxDepth;
      const context = new ScanContext(config, createRulePack());

      expect(context.getMaxDepth()).toBe(4);
    });
  });

  describe('getMaxObjects', () => {
    test('should return configured max objects', () => {
      const config = createScanConfig({ maxObjects: 500 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getMaxObjects()).toBe(500);
    });

    test('should return undefined when not specified', () => {
      const config = createScanConfig();
      delete (config as any).maxObjects;
      const context = new ScanContext(config, createRulePack());

      expect(context.getMaxObjects()).toBeUndefined();
    });
  });

  describe('isNdjsonMode', () => {
    test('should return true when NDJSON mode is enabled', () => {
      const config = createScanConfig({ ndjsonMode: true });
      const context = new ScanContext(config, createRulePack());

      expect(context.isNdjsonMode()).toBe(true);
    });

    test('should return false when NDJSON mode is disabled', () => {
      const config = createScanConfig({ ndjsonMode: false });
      const context = new ScanContext(config, createRulePack());

      expect(context.isNdjsonMode()).toBe(false);
    });

    test('should return false when NDJSON mode is undefined', () => {
      const config = createScanConfig();
      delete (config as any).ndjsonMode;
      const context = new ScanContext(config, createRulePack());

      expect(context.isNdjsonMode()).toBe(false);
    });
  });

  describe('getStreamingThreshold', () => {
    test('should return configured streaming threshold', () => {
      const config = createScanConfig({ streamingThreshold: 2000 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getStreamingThreshold()).toBe(2000);
    });

    test('should return default threshold when not specified', () => {
      const config = createScanConfig({ streamingThreshold: 0 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getStreamingThreshold()).toBe(1000);
    });

    test('should handle undefined streaming threshold', () => {
      const config = createScanConfig();
      delete (config as any).streamingThreshold;
      const context = new ScanContext(config, createRulePack());

      expect(context.getStreamingThreshold()).toBe(1000);
    });
  });

  describe('isParallelProcessing', () => {
    test('should return true when parallel is true', () => {
      const config = createScanConfig({ parallel: true });
      const context = new ScanContext(config, createRulePack());

      expect(context.isParallelProcessing()).toBe(true);
    });

    test('should return true when parallel is a number', () => {
      const config = createScanConfig({ parallel: 4 });
      const context = new ScanContext(config, createRulePack());

      expect(context.isParallelProcessing()).toBe(true);
    });

    test('should return false when parallel is false', () => {
      const config = createScanConfig({ parallel: false });
      const context = new ScanContext(config, createRulePack());

      expect(context.isParallelProcessing()).toBe(false);
    });

    test('should return true when parallel is undefined (default)', () => {
      const config = createScanConfig();
      delete (config as any).parallel;
      const context = new ScanContext(config, createRulePack());

      expect(context.isParallelProcessing()).toBe(true);
    });
  });

  describe('getBatchSize', () => {
    test('should return configured batch size', () => {
      const config = createScanConfig({ batchSize: 25 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getBatchSize()).toBe(25);
    });

    test('should return default batch size when not specified', () => {
      const config = createScanConfig({ batchSize: 0 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getBatchSize()).toBe(10);
    });

    test('should handle undefined batch size', () => {
      const config = createScanConfig();
      delete (config as any).batchSize;
      const context = new ScanContext(config, createRulePack());

      expect(context.getBatchSize()).toBe(10);
    });
  });

  describe('getTimeout', () => {
    test('should return configured timeout', () => {
      const config = createScanConfig({ timeout: 600 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getTimeout()).toBe(600);
    });

    test('should return default timeout when not specified', () => {
      const config = createScanConfig({ timeout: 0 });
      const context = new ScanContext(config, createRulePack());

      expect(context.getTimeout()).toBe(300);
    });

    test('should handle undefined timeout', () => {
      const config = createScanConfig();
      delete (config as any).timeout;
      const context = new ScanContext(config, createRulePack());

      expect(context.getTimeout()).toBe(300);
    });
  });

  describe('getElapsedTime', () => {
    test('should return elapsed time since start', async () => {
      const startTime = new Date();
      const context = new ScanContext(
        createScanConfig(),
        createRulePack(),
        startTime
      );

      // Wait a small amount
      await new Promise((resolve) => setTimeout(resolve, 10));

      const elapsed = context.getElapsedTime();

      expect(elapsed).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(1000); // Should be less than 1 second
    });

    test('should calculate elapsed time correctly with specific start time', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const context = new ScanContext(
        createScanConfig(),
        createRulePack(),
        startTime
      );

      // Mock Date.now to return a specific time
      const originalNow = Date.now;
      Date.now = jest.fn(() => new Date('2025-01-01T00:00:05Z').getTime());

      const elapsed = context.getElapsedTime();

      expect(elapsed).toBe(5000); // 5 seconds

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('immutability', () => {
    test('should not allow modification of config', () => {
      const config = createScanConfig();
      const context = new ScanContext(config, createRulePack());

      expect(context.config).toBe(config);
    });

    test('should not allow modification of rulePack', () => {
      const rulePack = createRulePack();
      const context = new ScanContext(createScanConfig(), rulePack);

      expect(context.rulePack).toBe(rulePack);
    });

    test('should not allow modification of startTime', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const context = new ScanContext(
        createScanConfig(),
        createRulePack(),
        startTime
      );

      expect(context.startTime).toBe(startTime);
    });
  });

  describe('integration scenarios', () => {
    test('should work with streaming configuration', () => {
      const config = createScanConfig({
        ndjsonMode: true,
        streamingThreshold: 500,
        parallel: true,
        batchSize: 20,
      });
      const context = new ScanContext(config, createRulePack());

      expect(context.isNdjsonMode()).toBe(true);
      expect(context.getStreamingThreshold()).toBe(500);
      expect(context.isParallelProcessing()).toBe(true);
      expect(context.getBatchSize()).toBe(20);
    });

    test('should work with performance optimization settings', () => {
      const config = createScanConfig({
        parallel: 8,
        batchSize: 50,
        timeout: 900,
        maxObjects: 10000,
        maxDepth: 6,
      });
      const context = new ScanContext(config, createRulePack());

      expect(context.isParallelProcessing()).toBe(true);
      expect(context.getBatchSize()).toBe(50);
      expect(context.getTimeout()).toBe(900);
      expect(context.getMaxObjects()).toBe(10000);
      expect(context.getMaxDepth()).toBe(6);
    });

    test('should work with field scanning configuration', () => {
      const config = createScanConfig({
        fields: ['prompt', 'response', 'metadata', 'context'],
        scanEntireObject: true,
        maxDepth: 8,
      });
      const context = new ScanContext(config, createRulePack());

      expect(context.getFieldsToScan()).toEqual([
        'prompt',
        'response',
        'metadata',
        'context',
      ]);
      expect(context.shouldScanEntireObject()).toBe(true);
      expect(context.getMaxDepth()).toBe(8);
    });

    test('should handle minimal configuration with defaults', () => {
      const config = createScanConfig({
        rulepack: 'minimal.yaml',
        outputFormat: 'json',
      });
      const context = new ScanContext(config, createRulePack());

      expect(context.getFieldsToScan()).toEqual(['prompt', 'response']);
      expect(context.shouldScanEntireObject()).toBe(false);
      expect(context.getMaxDepth()).toBe(4);
      expect(context.getStreamingThreshold()).toBe(1000);
      expect(context.getBatchSize()).toBe(10);
      expect(context.getTimeout()).toBe(300);
    });
  });
});
