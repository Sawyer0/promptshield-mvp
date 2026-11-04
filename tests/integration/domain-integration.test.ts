import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import path from 'path';
import { DefaultScanOrchestrator } from '../../src/domains/scanning/core/services/ScanOrchestrator';
import { ScanRequest } from '../../src/domains/scanning/core/entities/ScanRequest';
import { LocalFileReader } from '../../src/domains/scanning/adapters/LocalFileReader';
import { JsonProcessor } from '../../src/domains/scanning/adapters/processors/JsonProcessor';
import { TextProcessor } from '../../src/domains/scanning/adapters/processors/TextProcessor';
import { DefaultRuleEngine } from '../../src/domains/rules/core/services/RuleEngineImpl';
import { Rule } from '../../src/domains/rules/core/entities/Rule';
import { RulePack } from '../../src/domains/rules/core/entities/RulePack';
import { YamlRuleRepository } from '../../src/domains/rules/adapters/YamlRuleRepository';
import { OptimizedRuleMatcher } from '../../src/domains/rules/core/services/OptimizedRuleMatcher';
import { createScanConfig } from '../helpers/testFactories';
import { ok } from '../../src/shared/types/Result';

describe('Domain Integration', () => {
  let scanOrchestrator: DefaultScanOrchestrator;
  let ruleEngine: DefaultRuleEngine;
  let ruleRepository: YamlRuleRepository;

  beforeEach(() => {
    const fileReader = new LocalFileReader();
    const processors = new Map();
    processors.set('json', new JsonProcessor());
    processors.set('text', new TextProcessor());

    ruleRepository = new YamlRuleRepository();
    const matcher = new OptimizedRuleMatcher();
    ruleEngine = new DefaultRuleEngine(ruleRepository, matcher);

    const strategy = {
      shouldUseStreaming: () => false,
      shouldUseParallelProcessing: () => false,
      getOptimalBatchSize: () => 10,
    };

    const metricsCollector = {
      start: jest.fn(),
      recordProcessing: jest.fn(),
      end: jest.fn().mockReturnValue({
        objectsScanned: 1,
        processingTime: 100,
        memoryUsage: 1024,
        rulesApplied: 5,
        streamingUsed: false,
      }),
    };

    scanOrchestrator = new DefaultScanOrchestrator(
      fileReader,
      processors,
      ruleEngine,
      strategy,
      metricsCollector as any
    );
  });

  it('should detect violations in a real file using real rules', async () => {
    const inputFile = path.join(process.cwd(), 'tests/fixtures/sample.txt');
    const rulepackFile = path.join(process.cwd(), 'rulepacks/pii.yaml');

    const scanRequest = new ScanRequest(
      inputFile,
      createScanConfig({
        rulepack: rulepackFile,
        outputFormat: 'json',
      })
    );

    const result = await scanOrchestrator.scan(scanRequest);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.violations.length).toBeGreaterThan(0);

      // Verify Aho-Corasick matched something (e.g. Email or Phone)
      const piiMatch = result.value.violations.some(
        (v) => v.category === 'pii'
      );
      expect(piiMatch).toBe(true);
    }
  });

  it('should handle JSON files correctly', async () => {
    const inputFile = path.join(process.cwd(), 'tests/fixtures/sample.json');
    const rulepackFile = path.join(process.cwd(), 'rulepacks/pii.yaml');

    const scanRequest = new ScanRequest(
      inputFile,
      createScanConfig({
        rulepack: rulepackFile,
        fields: ['prompt', 'response'],
      })
    );

    const result = await scanOrchestrator.scan(scanRequest);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.metrics.objectsScanned).toBeGreaterThan(0);
    }
  });
});
