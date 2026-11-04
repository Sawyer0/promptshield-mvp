import { describe, test, expect } from '@jest/globals';
import { ScanMetrics } from '../../../../src/shared/types/ScanMetrics';
import { createScanMetrics } from '../../../helpers/testFactories';

describe('ScanMetrics', () => {
  describe('creation', () => {
    test('should create metrics with default values', () => {
      const metrics = createScanMetrics();

      expect(metrics.objectsScanned).toBe(10);
      expect(metrics.processingTime).toBe(100);
      expect(metrics.memoryUsage).toBe(1024 * 1024);
      expect(metrics.rulesApplied).toBe(5);
      expect(metrics.streamingUsed).toBe(false);
    });

    test('should create metrics with custom values', () => {
      const metrics = createScanMetrics({
        objectsScanned: 1000,
        processingTime: 5000,
        memoryUsage: 50 * 1024 * 1024,
        rulesApplied: 25,
        streamingUsed: true,
      });

      expect(metrics.objectsScanned).toBe(1000);
      expect(metrics.processingTime).toBe(5000);
      expect(metrics.memoryUsage).toBe(50 * 1024 * 1024);
      expect(metrics.rulesApplied).toBe(25);
      expect(metrics.streamingUsed).toBe(true);
    });
  });

  describe('processing metrics', () => {
    test('should track objects scanned', () => {
      const metrics = createScanMetrics({ objectsScanned: 500 });
      expect(metrics.objectsScanned).toBe(500);
    });

    test('should track processing time in milliseconds', () => {
      const metrics = createScanMetrics({ processingTime: 3500 });
      expect(metrics.processingTime).toBe(3500);
    });

    test('should calculate processing rate', () => {
      const metrics = createScanMetrics({
        objectsScanned: 1000,
        processingTime: 2000, // 2 seconds
      });

      const objectsPerSecond =
        metrics.objectsScanned / (metrics.processingTime / 1000);
      expect(objectsPerSecond).toBe(500);
    });
  });

  describe('memory metrics', () => {
    test('should track memory usage in bytes', () => {
      const metrics = createScanMetrics({
        memoryUsage: 100 * 1024 * 1024, // 100MB
      });

      expect(metrics.memoryUsage).toBe(100 * 1024 * 1024);
    });

    test('should handle memory usage calculations', () => {
      const metrics = createScanMetrics({
        memoryUsage: 50 * 1024 * 1024, // 50MB
        objectsScanned: 1000,
      });

      const memoryPerObject = metrics.memoryUsage / metrics.objectsScanned;
      expect(memoryPerObject).toBeCloseTo((50 * 1024 * 1024) / 1000, 1); // ~51KB per object
    });
  });

  describe('rule metrics', () => {
    test('should track rules applied', () => {
      const metrics = createScanMetrics({ rulesApplied: 15 });
      expect(metrics.rulesApplied).toBe(15);
    });

    test('should calculate rule efficiency', () => {
      const metrics = createScanMetrics({
        rulesApplied: 10,
        objectsScanned: 100,
        processingTime: 1000,
      });

      const rulesPerObject = metrics.rulesApplied / metrics.objectsScanned;
      const rulesPerSecond =
        metrics.rulesApplied / (metrics.processingTime / 1000);

      expect(rulesPerObject).toBe(0.1);
      expect(rulesPerSecond).toBe(10);
    });
  });

  describe('streaming metrics', () => {
    test('should track streaming usage', () => {
      const streamingMetrics = createScanMetrics({ streamingUsed: true });
      const nonStreamingMetrics = createScanMetrics({ streamingUsed: false });

      expect(streamingMetrics.streamingUsed).toBe(true);
      expect(nonStreamingMetrics.streamingUsed).toBe(false);
    });

    test('should indicate processing mode', () => {
      const metrics = createScanMetrics({
        streamingUsed: true,
        memoryUsage: 10 * 1024 * 1024, // Lower memory usage expected with streaming
        objectsScanned: 10000,
      });

      expect(metrics.streamingUsed).toBe(true);
      expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Should use less memory
    });
  });

  describe('performance calculations', () => {
    test('should calculate throughput metrics', () => {
      const metrics = createScanMetrics({
        objectsScanned: 2000,
        processingTime: 4000, // 4 seconds
        memoryUsage: 64 * 1024 * 1024, // 64MB
      });

      const throughput = {
        objectsPerSecond:
          metrics.objectsScanned / (metrics.processingTime / 1000),
        memoryPerObject: metrics.memoryUsage / metrics.objectsScanned,
        processingTimePerObject:
          metrics.processingTime / metrics.objectsScanned,
      };

      expect(throughput.objectsPerSecond).toBe(500);
      expect(throughput.memoryPerObject).toBeCloseTo((64 * 1024 * 1024) / 2000, 1); // ~33KB per object
      expect(throughput.processingTimePerObject).toBe(2); // 2ms per object
    });

    test('should calculate efficiency ratios', () => {
      const metrics = createScanMetrics({
        objectsScanned: 1000,
        rulesApplied: 20,
        processingTime: 2000,
        memoryUsage: 40 * 1024 * 1024,
      });

      const efficiency = {
        rulesPerObject: metrics.rulesApplied / metrics.objectsScanned,
        timePerRule: metrics.processingTime / metrics.rulesApplied,
        memoryEfficiency:
          metrics.objectsScanned / (metrics.memoryUsage / (1024 * 1024)),
      };

      expect(efficiency.rulesPerObject).toBe(0.02);
      expect(efficiency.timePerRule).toBe(100); // 100ms per rule
      expect(efficiency.memoryEfficiency).toBe(25); // 25 objects per MB
    });
  });

  describe('comparison metrics', () => {
    test('should compare streaming vs non-streaming performance', () => {
      const streamingMetrics = createScanMetrics({
        objectsScanned: 10000,
        processingTime: 5000,
        memoryUsage: 20 * 1024 * 1024,
        streamingUsed: true,
      });

      const batchMetrics = createScanMetrics({
        objectsScanned: 10000,
        processingTime: 3000,
        memoryUsage: 100 * 1024 * 1024,
        streamingUsed: false,
      });

      // Streaming should use less memory but might take longer
      expect(streamingMetrics.memoryUsage).toBeLessThan(
        batchMetrics.memoryUsage
      );
      expect(streamingMetrics.streamingUsed).toBe(true);
      expect(batchMetrics.streamingUsed).toBe(false);
    });

    test('should compare performance across different scales', () => {
      const smallScale = createScanMetrics({
        objectsScanned: 100,
        processingTime: 500,
        memoryUsage: 5 * 1024 * 1024,
      });

      const largeScale = createScanMetrics({
        objectsScanned: 10000,
        processingTime: 15000,
        memoryUsage: 200 * 1024 * 1024,
      });

      const smallThroughput =
        smallScale.objectsScanned / (smallScale.processingTime / 1000);
      const largeThroughput =
        largeScale.objectsScanned / (largeScale.processingTime / 1000);

      expect(smallThroughput).toBe(200); // 200 objects/second
      expect(largeThroughput).toBeCloseTo(666.67, 1); // ~667 objects/second
    });
  });

  describe('serialization', () => {
    test('should serialize to JSON correctly', () => {
      const metrics = createScanMetrics({
        objectsScanned: 500,
        processingTime: 2500,
        streamingUsed: true,
      });

      const json = JSON.stringify(metrics);
      const parsed = JSON.parse(json);

      expect(parsed.objectsScanned).toBe(500);
      expect(parsed.processingTime).toBe(2500);
      expect(parsed.streamingUsed).toBe(true);
    });

    test('should handle all numeric types', () => {
      const metrics = createScanMetrics({
        objectsScanned: 0,
        processingTime: 0.5,
        memoryUsage: 1.5 * 1024 * 1024,
        rulesApplied: 0,
      });

      const json = JSON.stringify(metrics);
      const parsed = JSON.parse(json);

      expect(parsed.objectsScanned).toBe(0);
      expect(parsed.processingTime).toBe(0.5);
      expect(parsed.memoryUsage).toBe(1.5 * 1024 * 1024);
      expect(parsed.rulesApplied).toBe(0);
    });
  });

  describe('metric validation', () => {
    test('should handle zero values', () => {
      const metrics = createScanMetrics({
        objectsScanned: 0,
        processingTime: 0,
        memoryUsage: 0,
        rulesApplied: 0,
      });

      expect(metrics.objectsScanned).toBe(0);
      expect(metrics.processingTime).toBe(0);
      expect(metrics.memoryUsage).toBe(0);
      expect(metrics.rulesApplied).toBe(0);
    });

    test('should handle large values', () => {
      const metrics = createScanMetrics({
        objectsScanned: 1000000,
        processingTime: 3600000, // 1 hour
        memoryUsage: 8 * 1024 * 1024 * 1024, // 8GB
        rulesApplied: 50000,
      });

      expect(metrics.objectsScanned).toBe(1000000);
      expect(metrics.processingTime).toBe(3600000);
      expect(metrics.memoryUsage).toBe(8 * 1024 * 1024 * 1024);
      expect(metrics.rulesApplied).toBe(50000);
    });
  });

  describe('aggregation', () => {
    test('should support metric aggregation patterns', () => {
      const metrics1 = createScanMetrics({
        objectsScanned: 500,
        processingTime: 1000,
        memoryUsage: 50 * 1024 * 1024,
        rulesApplied: 10,
      });

      const metrics2 = createScanMetrics({
        objectsScanned: 300,
        processingTime: 800,
        memoryUsage: 30 * 1024 * 1024,
        rulesApplied: 10,
      });

      const aggregated = {
        objectsScanned: metrics1.objectsScanned + metrics2.objectsScanned,
        processingTime: metrics1.processingTime + metrics2.processingTime,
        memoryUsage: Math.max(metrics1.memoryUsage, metrics2.memoryUsage),
        rulesApplied: metrics1.rulesApplied,
        streamingUsed: metrics1.streamingUsed || metrics2.streamingUsed,
      };

      expect(aggregated.objectsScanned).toBe(800);
      expect(aggregated.processingTime).toBe(1800);
      expect(aggregated.memoryUsage).toBe(50 * 1024 * 1024);
      expect(aggregated.rulesApplied).toBe(10);
    });
  });
});







