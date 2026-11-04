import { describe, test, expect } from '@jest/globals';
import { TableRenderer } from '../../../../../src/domains/reporting/adapters/renderers/TableRenderer';
import { Report } from '../../../../../src/domains/reporting/core/entities/Report';
import { ScanResult } from '../../../../../src/domains/scanning/core/entities/ScanResult';
import {
  createViolation,
  createScanMetrics,
} from '../../../../helpers/testFactories';
import { OutputFormat } from '../../../../../src/shared/types/ScanConfig';

describe('TableRenderer', () => {
  let renderer: TableRenderer;

  beforeEach(() => {
    renderer = new TableRenderer();
  });

  describe('render', () => {
    test('should render violations as formatted table', async () => {
      const violations = [
        createViolation({
          ruleId: 'email-rule',
          severity: 'high',
          message: 'Email address found',
          context: { match: 'test@example.com' },
        }),
        createViolation({
          ruleId: 'phone-rule',
          severity: 'medium',
          message: 'Phone number found',
          context: { match: '555-1234' },
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'table' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('email-rule');
        expect(result.value).toContain('phone-rule');
        expect(result.value).toContain('Email address found');
        expect(result.value).toContain('Phone number found');
      }
    });

    test('should handle empty violations gracefully', async () => {
      const scanResult = new ScanResult([], createScanMetrics());
      const report = new Report(scanResult, 'table' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('✅ NO VIOLATIONS FOUND');
      }
    });

    test('should respect max width constraints', async () => {
      const violations = [
        createViolation({
          ruleId: 'very-long-rule-id-that-exceeds-width',
          message:
            'This is a very long message that should be truncated when max width is set',
          context: { match: 'very long match text' },
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'table' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const lines = result.value.split('\n');
        expect(lines.some((line: string) => line.includes('...'))).toBe(true); // Should contain truncation
      }
    });

    test('should support colorized output', async () => {
      const violations = [
        createViolation({ severity: 'critical' }),
        createViolation({ severity: 'high' }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'table' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('🔴 critical');
        expect(result.value).toContain('🟠 high');
      }
    });
  });
});
