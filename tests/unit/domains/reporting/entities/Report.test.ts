import { describe, test, expect } from '@jest/globals';
import { Report } from '../../../../../src/domains/reporting/core/entities/Report';
import { ScanResult } from '../../../../../src/domains/scanning/core/entities/ScanResult';
import {
  createViolation,
  createScanMetrics,
} from '../../../../helpers/testFactories';
import { OutputFormat } from '../../../../../src/shared/types/ScanConfig';

describe('Report', () => {
  test('should create report with violations and metrics', () => {
    const violations = [
      createViolation(),
      createViolation(),
      createViolation(),
    ];
    const metrics = createScanMetrics();
    const scanResult = new ScanResult(violations, metrics);
    const report = new Report(scanResult, 'json' as OutputFormat);

    expect(report.scanResult.violations).toBe(violations);
    expect(report.scanResult.metrics).toBe(metrics);
    expect(report.format).toBe('json');
  });

  test('should get total violation count', () => {
    const violations = [
      createViolation(),
      createViolation(),
      createViolation(),
    ];
    const scanResult = new ScanResult(violations, createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat);

    expect(report.getTotalViolations()).toBe(3);
  });

  test('should handle empty violations', () => {
    const scanResult = new ScanResult([], createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat);

    expect(report.getTotalViolations()).toBe(0);
  });

  test('should filter violations by severity', () => {
    const violations = [
      createViolation({ severity: 'critical' }),
      createViolation({ severity: 'high' }),
      createViolation({ severity: 'critical' }),
    ];
    const scanResult = new ScanResult(violations, createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat);

    const criticalViolations = report.scanResult.getViolationsBySeverity([
      'critical',
    ]);
    expect(criticalViolations).toHaveLength(2);
    expect(
      criticalViolations.every((v: any) => v.severity === 'critical')
    ).toBe(true);
  });

  test('should filter violations by category', () => {
    const violations = [
      createViolation({ category: 'pii' }),
      createViolation({ category: 'security' }),
      createViolation({ category: 'pii' }),
    ];
    const scanResult = new ScanResult(violations, createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat);

    const piiViolations = report.scanResult.getViolationsByCategory(['pii']);
    expect(piiViolations).toHaveLength(2);
    expect(piiViolations.every((v: any) => v.category === 'pii')).toBe(true);
  });

  test('should get severity counts', () => {
    const violations = [
      createViolation({ severity: 'critical' }),
      createViolation({ severity: 'high' }),
      createViolation({ severity: 'critical' }),
      createViolation({ severity: 'medium' }),
    ];
    const scanResult = new ScanResult(violations, createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat);

    const counts = report.scanResult.getViolationCountBySeverity();
    expect(counts.critical).toBe(2);
    expect(counts.high).toBe(1);
    expect(counts.medium).toBe(1);
    expect(counts.low).toBe(0);
  });

  test('should get filtered violations with options', () => {
    const violations = [
      createViolation({ severity: 'critical' }),
      createViolation({ severity: 'high' }),
      createViolation({ severity: 'critical' }),
      createViolation({ severity: 'medium' }),
    ];
    const scanResult = new ScanResult(violations, createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat, {
      severity: ['critical'],
      maxViolations: 1,
    });

    const filteredViolations = report.getFilteredViolations();
    expect(filteredViolations).toHaveLength(1);
    expect(filteredViolations[0].severity).toBe('critical');
  });

  test('should check if should include summary', () => {
    const scanResult = new ScanResult([], createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat);

    expect(report.shouldIncludeSummary()).toBe(true);
  });

  test('should check if should include metrics', () => {
    const scanResult = new ScanResult([], createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat);

    expect(report.shouldIncludeMetrics()).toBe(true);
  });

  test('should handle options that disable summary and metrics', () => {
    const scanResult = new ScanResult([], createScanMetrics());
    const report = new Report(scanResult, 'json' as OutputFormat, {
      includeSummary: false,
      includeMetrics: false,
    });

    expect(report.shouldIncludeSummary()).toBe(false);
    expect(report.shouldIncludeMetrics()).toBe(false);
  });
});
