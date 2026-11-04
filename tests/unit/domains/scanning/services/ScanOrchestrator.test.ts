import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { DefaultScanOrchestrator } from '../../../../../src/domains/scanning/core/services/ScanOrchestrator';
import { ScanRequest } from '../../../../../src/domains/scanning/core/entities/ScanRequest';
import { ok } from '../../../../../src/shared/types/Result';
import {
  createScanConfig,
  createRulePack,
} from '../../../../helpers/testFactories';

describe('DefaultScanOrchestrator', () => {
  let orchestrator: DefaultScanOrchestrator;
  let mockFileReader: any;
  let mockProcessors: Map<string, any>;
  let mockRuleEngine: any;
  let mockStrategy: any;
  let mockMetricsCollector: any;

  beforeEach(() => {
    mockFileReader = {
      exists: (jest.fn() as any).mockResolvedValue(true),
      readFile: (jest.fn() as any).mockResolvedValue(ok('test content')),
      findFiles: (jest.fn() as any).mockResolvedValue(
        ok(['file1.json', 'file2.json'])
      ),
      isDirectory: (jest.fn() as any).mockResolvedValue(false),
      getFileSize: (jest.fn() as any).mockResolvedValue(ok(100)),
    };

    const mockProcessor = {
      canProcess: (jest.fn() as any).mockReturnValue(true),
      process: (jest.fn() as any).mockResolvedValue(
        ok([{ data: { content: 'test' } }])
      ),
      shouldUseStreaming: (jest.fn() as any).mockReturnValue(false),
      processStream: (jest.fn() as any).mockResolvedValue(ok(undefined)),
    };

    mockProcessors = new Map();
    mockProcessors.set('json', mockProcessor);

    mockRuleEngine = {
      loadRulePack: (jest.fn() as any).mockResolvedValue(ok(createRulePack())),
      applyRules: (jest.fn() as any).mockResolvedValue(ok([])),
    };

    mockStrategy = {
      shouldUseStreaming: (jest.fn() as any).mockReturnValue(false),
      shouldUseParallelProcessing: (jest.fn() as any).mockReturnValue(false),
      getOptimalBatchSize: (jest.fn() as any).mockReturnValue(10),
    };

    mockMetricsCollector = {
      start: jest.fn(),
      recordProcessing: jest.fn(),
      end: (jest.fn() as any).mockReturnValue({
        objectsScanned: 0,
        processingTime: 0,
        memoryUsage: 0,
        rulesApplied: 0,
        streamingUsed: false,
      }),
    };

    orchestrator = new DefaultScanOrchestrator(
      mockFileReader,
      mockProcessors,
      mockRuleEngine,
      mockStrategy,
      mockMetricsCollector
    );
  });

  describe('scan', () => {
    test('should perform a simple scan successfully', async () => {
      const request = new ScanRequest('test.json', createScanConfig());
      const violations: any[] = [];
      mockRuleEngine.applyRules.mockResolvedValue(ok(violations));

      const result = await orchestrator.scan(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.violations).toEqual(violations);
      }
    });

    test('should handle validation errors', async () => {
      const request = new ScanRequest('', createScanConfig()); // Empty input

      const result = await orchestrator.scan(request);

      expect(result.isErr()).toBe(true);
    });

    test('should use streaming for large files when strategy suggests', async () => {
      const request = new ScanRequest('large.json', createScanConfig());
      mockStrategy.shouldUseStreaming.mockReturnValue(true);
      mockProcessors.get('json').shouldUseStreaming.mockReturnValue(true);

      const result = await orchestrator.scan(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metrics.streamingUsed).toBe(true);
      }
    });
  });

  describe('validateRequest', () => {
    test('should return error if input is empty', () => {
      const request = new ScanRequest('', createScanConfig());
      const result = orchestrator.validateRequest(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Input is required');
      }
    });

    test('should return error if config is missing', () => {
      const request = new ScanRequest('input', null as any);
      const result = orchestrator.validateRequest(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Configuration is required');
      }
    });
  });
});
