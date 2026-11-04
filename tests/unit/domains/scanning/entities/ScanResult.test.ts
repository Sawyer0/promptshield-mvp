import { describe, test, expect } from '@jest/globals';
import { ScanResult } from '../../../../../src/domains/scanning/core/entities/ScanResult';
import {
  createViolation,
  createScanMetrics,
} from '../../../../helpers/testFactories';

describe('ScanResult', () => {
  describe('constructor', () => {
    test('should create scan result with violations and metrics', () => {
      const violations = [
        createViolation(),
        createViolation({ ruleId: 'rule2' }),
      ];
      const metrics = createScanMetrics();
      const timestamp = new Date('2025-01-01T00:00:00Z');

      const result = new ScanResult(violations, metrics, timestamp);

      expect(result.violations).toBe(violations);
      expect(result.metrics).toBe(metrics);
      expect(result.timestamp).toBe(timestamp);
    });

    test('should use current timestamp by default', () => {
      const beforeTime = new Date();
      const result = new ScanResult([], createScanMetrics());
      const afterTime = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
    });

    test('should handle empty violations array', () => {
      const result = new ScanResult([], createScanMetrics());

      expect(result.violations).toEqual([]);
      expect(result.getTotalViolations()).toBe(0);
    });

    test('should handle large violations array', () => {
      const violations = Array.from({ length: 1000 }, (_, i) =>
        createViolation({ ruleId: `rule-${i}`, objectIndex: i })
      );
      const result = new ScanResult(violations, createScanMetrics());

      expect(result.violations).toHaveLength(1000);
      expect(result.getTotalViolations()).toBe(1000);
    });
  });

  describe('getViolationsBySeverity', () => {
    test('should filter violations by single severity', () => {
      const violations = [
        createViolation({ severity: 'high', ruleId: 'rule1' }),
        createViolation({ severity: 'medium', ruleId: 'rule2' }),
        createViolation({ severity: 'high', ruleId: 'rule3' }),
        createViolation({ severity: 'low', ruleId: 'rule4' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const highSeverity = result.getViolationsBySeverity(['high']);

      expect(highSeverity).toHaveLength(2);
      expect(highSeverity[0].severity).toBe('high');
      expect(highSeverity[1].severity).toBe('high');
      expect(highSeverity[0].ruleId).toBe('rule1');
      expect(highSeverity[1].ruleId).toBe('rule3');
    });

    test('should filter violations by multiple severities', () => {
      const violations = [
        createViolation({ severity: 'critical', ruleId: 'rule1' }),
        createViolation({ severity: 'high', ruleId: 'rule2' }),
        createViolation({ severity: 'medium', ruleId: 'rule3' }),
        createViolation({ severity: 'low', ruleId: 'rule4' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const highAndCritical = result.getViolationsBySeverity([
        'high',
        'critical',
      ]);

      expect(highAndCritical).toHaveLength(2);
      expect(highAndCritical.map((v) => v.severity)).toEqual([
        'critical',
        'high',
      ]);
    });

    test('should return empty array when no violations match severity', () => {
      const violations = [
        createViolation({ severity: 'low' }),
        createViolation({ severity: 'medium' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const critical = result.getViolationsBySeverity(['critical']);

      expect(critical).toEqual([]);
    });

    test('should return empty array when no severities specified', () => {
      const violations = [createViolation({ severity: 'high' })];
      const result = new ScanResult(violations, createScanMetrics());

      const empty = result.getViolationsBySeverity([]);

      expect(empty).toEqual([]);
    });
  });

  describe('getViolationsByCategory', () => {
    test('should filter violations by single category', () => {
      const violations = [
        createViolation({ category: 'pii', ruleId: 'rule1' }),
        createViolation({ category: 'security', ruleId: 'rule2' }),
        createViolation({ category: 'pii', ruleId: 'rule3' }),
        createViolation({ category: 'compliance', ruleId: 'rule4' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const piiViolations = result.getViolationsByCategory(['pii']);

      expect(piiViolations).toHaveLength(2);
      expect(piiViolations[0].category).toBe('pii');
      expect(piiViolations[1].category).toBe('pii');
    });

    test('should filter violations by multiple categories', () => {
      const violations = [
        createViolation({ category: 'pii', ruleId: 'rule1' }),
        createViolation({ category: 'security', ruleId: 'rule2' }),
        createViolation({ category: 'bias', ruleId: 'rule3' }),
        createViolation({ category: 'compliance', ruleId: 'rule4' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const securityAndBias = result.getViolationsByCategory([
        'security',
        'bias',
      ]);

      expect(securityAndBias).toHaveLength(2);
      expect(securityAndBias.map((v) => v.category)).toEqual([
        'security',
        'bias',
      ]);
    });

    test('should return all violations when categories array is empty', () => {
      const violations = [
        createViolation({ category: 'pii' }),
        createViolation({ category: 'security' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const all = result.getViolationsByCategory([]);

      expect(all).toEqual(violations);
    });
  });

  describe('getTotalViolations', () => {
    test('should return correct count for multiple violations', () => {
      const violations = [
        createViolation(),
        createViolation(),
        createViolation(),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      expect(result.getTotalViolations()).toBe(3);
    });

    test('should return zero for empty violations', () => {
      const result = new ScanResult([], createScanMetrics());

      expect(result.getTotalViolations()).toBe(0);
    });
  });

  describe('getViolationCountBySeverity', () => {
    test('should count violations by each severity level', () => {
      const violations = [
        createViolation({ severity: 'critical' }),
        createViolation({ severity: 'critical' }),
        createViolation({ severity: 'high' }),
        createViolation({ severity: 'high' }),
        createViolation({ severity: 'high' }),
        createViolation({ severity: 'medium' }),
        createViolation({ severity: 'low' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const counts = result.getViolationCountBySeverity();

      expect(counts.critical).toBe(2);
      expect(counts.high).toBe(3);
      expect(counts.medium).toBe(1);
      expect(counts.low).toBe(1);
    });

    test('should return zero counts for missing severity levels', () => {
      const violations = [
        createViolation({ severity: 'high' }),
        createViolation({ severity: 'high' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const counts = result.getViolationCountBySeverity();

      expect(counts.critical).toBe(0);
      expect(counts.high).toBe(2);
      expect(counts.medium).toBe(0);
      expect(counts.low).toBe(0);
    });

    test('should handle empty violations array', () => {
      const result = new ScanResult([], createScanMetrics());

      const counts = result.getViolationCountBySeverity();

      expect(counts.critical).toBe(0);
      expect(counts.high).toBe(0);
      expect(counts.medium).toBe(0);
      expect(counts.low).toBe(0);
    });
  });

  describe('shouldFail', () => {
    test('should return true when violation matches fail-on severity', () => {
      const violations = [
        createViolation({ severity: 'high' }),
        createViolation({ severity: 'medium' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      expect(result.shouldFail('high')).toBe(true);
      expect(result.shouldFail('medium')).toBe(true);
    });

    test('should return false when no violations match fail-on severity', () => {
      const violations = [
        createViolation({ severity: 'medium' }),
        createViolation({ severity: 'low' }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      expect(result.shouldFail('critical')).toBe(false);
      expect(result.shouldFail('high')).toBe(false);
    });

    test('should return false when failOnSeverity is undefined', () => {
      const violations = [createViolation({ severity: 'critical' })];
      const result = new ScanResult(violations, createScanMetrics());

      expect(result.shouldFail()).toBe(false);
      expect(result.shouldFail(undefined)).toBe(false);
    });

    test('should return false for empty violations', () => {
      const result = new ScanResult([], createScanMetrics());

      expect(result.shouldFail('critical')).toBe(false);
    });
  });

  describe('empty', () => {
    test('should create empty scan result', () => {
      const emptyResult = ScanResult.empty();

      expect(emptyResult.violations).toEqual([]);
      expect(emptyResult.getTotalViolations()).toBe(0);
      expect(emptyResult.metrics.objectsScanned).toBe(0);
      expect(emptyResult.metrics.processingTime).toBe(0);
      expect(emptyResult.metrics.memoryUsage).toBe(0);
      expect(emptyResult.metrics.rulesApplied).toBe(0);
      expect(emptyResult.metrics.streamingUsed).toBe(false);
      expect(emptyResult.shouldFail('critical')).toBe(false);
    });

    test('should create different instances each time', () => {
      const empty1 = ScanResult.empty();
      const empty2 = ScanResult.empty();

      expect(empty1).not.toBe(empty2);
      expect(empty1.timestamp).not.toBe(empty2.timestamp);
    });
  });

  describe('immutability', () => {
    test('should not allow modification of violations array', () => {
      const originalViolations = [createViolation()];
      const result = new ScanResult(originalViolations, createScanMetrics());

      // Verify readonly access
      expect(result.violations).toBe(originalViolations);
      expect(result.violations).toHaveLength(1);
    });

    test('should not allow modification of metrics', () => {
      const originalMetrics = createScanMetrics({ objectsScanned: 100 });
      const result = new ScanResult([], originalMetrics);

      expect(result.metrics).toBe(originalMetrics);
      expect(result.metrics.objectsScanned).toBe(100);
    });

    test('should not allow modification of timestamp', () => {
      const timestamp = new Date('2025-01-01T00:00:00Z');
      const result = new ScanResult([], createScanMetrics(), timestamp);

      expect(result.timestamp).toBe(timestamp);
    });
  });

  describe('complex scenarios', () => {
    test('should handle mixed severity and category filtering', () => {
      const violations = [
        createViolation({
          severity: 'critical',
          category: 'pii',
          ruleId: 'rule1',
        }),
        createViolation({
          severity: 'high',
          category: 'security',
          ruleId: 'rule2',
        }),
        createViolation({
          severity: 'critical',
          category: 'security',
          ruleId: 'rule3',
        }),
        createViolation({
          severity: 'medium',
          category: 'pii',
          ruleId: 'rule4',
        }),
      ];
      const result = new ScanResult(violations, createScanMetrics());

      const criticalPii = result
        .getViolationsBySeverity(['critical'])
        .filter((v) => ['pii'].includes(v.category));
      const securityHigh = result
        .getViolationsByCategory(['security'])
        .filter((v) => ['high', 'critical'].includes(v.severity));

      expect(criticalPii).toHaveLength(1);
      expect(criticalPii[0].ruleId).toBe('rule1');

      expect(securityHigh).toHaveLength(2);
      expect(securityHigh.map((v) => v.ruleId)).toEqual(['rule2', 'rule3']);
    });

    test('should handle performance metrics correctly', () => {
      const metrics = createScanMetrics({
        objectsScanned: 10000,
        processingTime: 5000,
        memoryUsage: 100 * 1024 * 1024, // 100MB
        rulesApplied: 50,
        streamingUsed: true,
      });
      const result = new ScanResult([], metrics);

      expect(result.metrics.objectsScanned).toBe(10000);
      expect(result.metrics.processingTime).toBe(5000);
      expect(result.metrics.memoryUsage).toBe(100 * 1024 * 1024);
      expect(result.metrics.rulesApplied).toBe(50);
      expect(result.metrics.streamingUsed).toBe(true);
    });

    test('should handle large scale violation analysis', () => {
      const violations = Array.from({ length: 1000 }, (_, i) => {
        const severities = ['low', 'medium', 'high', 'critical'] as const;
        const categories = ['pii', 'security', 'bias', 'compliance'] as const;

        return createViolation({
          ruleId: `rule-${i}`,
          severity: severities[i % 4],
          category: categories[i % 4],
          objectIndex: i,
        });
      });

      const result = new ScanResult(
        violations,
        createScanMetrics({
          objectsScanned: 1000,
          rulesApplied: 100,
        })
      );

      expect(result.getTotalViolations()).toBe(1000);

      const counts = result.getViolationCountBySeverity();
      expect(counts.low).toBe(250);
      expect(counts.medium).toBe(250);
      expect(counts.high).toBe(250);
      expect(counts.critical).toBe(250);

      const piiViolations = result.getViolationsByCategory(['pii']);
      expect(piiViolations).toHaveLength(250);
    });
  });
});
