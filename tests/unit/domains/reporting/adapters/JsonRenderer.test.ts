import { describe, test, expect } from '@jest/globals';
import { JsonRenderer } from '../../../../../src/domains/reporting/adapters/renderers/JsonRenderer';
import { Report } from '../../../../../src/domains/reporting/core/entities/Report';
import { ScanResult } from '../../../../../src/domains/scanning/core/entities/ScanResult';
import {
  createViolation,
  createScanMetrics,
} from '../../../../helpers/testFactories';
import { OutputFormat } from '../../../../../src/shared/types/ScanConfig';

describe('JsonRenderer', () => {
  let renderer: JsonRenderer;

  beforeEach(() => {
    renderer = new JsonRenderer();
  });

  describe('render', () => {
    test('should render report as JSON string', async () => {
      const violations = [
        createViolation({ ruleId: 'test-rule', severity: 'high' }),
      ];
      const metrics = createScanMetrics({ objectsScanned: 10 });
      const scanResult = new ScanResult(violations, metrics);
      const report = new Report(scanResult, 'json' as OutputFormat, {
        includeSummary: true,
      });

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const jsonOutput = JSON.parse(result.value);
        expect(jsonOutput.violations).toHaveLength(1);
        expect(jsonOutput.violations[0].rule_id).toBe('test-rule');
        expect(jsonOutput.metrics.objects_scanned).toBe(10);
      }
    });

    test('should handle empty violations', async () => {
      const scanResult = new ScanResult([], createScanMetrics());
      const report = new Report(scanResult, 'json' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const jsonOutput = JSON.parse(result.value);
        expect(jsonOutput.violations).toEqual([]);
      }
    });

    test('should include summary when requested', async () => {
      const violations = [
        createViolation({ severity: 'critical', category: 'pii' }),
        createViolation({ severity: 'high', category: 'security' }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'json' as OutputFormat, {
        includeSummary: true,
      });

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const jsonOutput = JSON.parse(result.value);
        expect(jsonOutput.summary).toBeDefined();
        expect(jsonOutput.summary.total_violations).toBe(2);
        expect(jsonOutput.summary.by_severity.critical).toBe(1);
        expect(jsonOutput.summary.by_category.pii).toBe(1);
      }
    });

    test('should format with pretty printing when requested', async () => {
      const scanResult = new ScanResult(
        [createViolation()],
        createScanMetrics()
      );
      const report = new Report(scanResult, 'json' as OutputFormat, {
        verbose: true,
      });

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('\n  '); // Should contain indentation
      }
    });
  });

  describe('error handling', () => {
    test('should return an error result when rendering throws', async () => {
      const scanResult = new ScanResult([], createScanMetrics());
      const report = new Report(scanResult, 'json' as OutputFormat);

      jest.spyOn(report, 'getFilteredViolations').mockImplementation(() => {
        throw new Error('boom');
      });

      const result = await renderer.render(report);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to render JSON report');
      }
    });
  });
});







