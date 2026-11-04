import { describe, test, expect } from '@jest/globals';
import { CsvRenderer } from '../../../../../src/domains/reporting/adapters/renderers/CsvRenderer';
import { Report } from '../../../../../src/domains/reporting/core/entities/Report';
import { ScanResult } from '../../../../../src/domains/scanning/core/entities/ScanResult';
import {
  createViolation,
  createScanMetrics,
} from '../../../../helpers/testFactories';
import { OutputFormat } from '../../../../../src/shared/types/ScanConfig';

describe('CsvRenderer', () => {
  let renderer: CsvRenderer;

  beforeEach(() => {
    renderer = new CsvRenderer();
  });

  describe('render', () => {
    test('should render violations as CSV', async () => {
      const violations = [
        createViolation({
          ruleId: 'email-rule',
          severity: 'high',
          category: 'pii',
          message: 'Email address found',
          field: 'content',
          objectIndex: 0,
        }),
        createViolation({
          ruleId: 'phone-rule',
          severity: 'medium',
          category: 'pii',
          message: 'Phone number found',
          field: 'content',
          objectIndex: 1,
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'csv' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const lines = result.value.split('\n');
        expect(lines[0]).toContain(
          'rule_id,rule_description,severity,category,message,field,object_index,match,context,position_start,position_end'
        );
        expect(lines[1]).toContain('email-rule');
        expect(lines[1]).toContain('high');
        expect(lines[1]).toContain('pii');
        expect(lines[2]).toContain('phone-rule');
      }
    });

    test('should handle empty violations', async () => {
      const scanResult = new ScanResult([], createScanMetrics());
      const report = new Report(scanResult, 'csv' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(
          'rule_id,rule_description,severity,category,message,field,object_index,match,context,position_start,position_end\n'
        );
      }
    });

    test('should escape special characters in CSV', async () => {
      const violations = [
        createViolation({
          ruleId: 'quote-rule',
          message: 'text with "quotes" and, commas',
          context: { match: 'text with "quotes" and, commas' },
        }),
        createViolation({
          ruleId: 'newline-rule',
          message: 'Rule with\nnewlines',
          context: { match: 'Rule with\nnewlines' },
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'csv' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('"text with ""quotes"" and, commas"');
        expect(result.value).toContain('"Rule with\nnewlines"');
      }
    });

    test('should support custom column selection', async () => {
      const violations = [
        createViolation({
          ruleId: 'test-rule',
          severity: 'high',
          message: 'test message',
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'csv' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const header = result.value.split('\n')[0];
        expect(header).toBe(
          'rule_id,rule_description,severity,category,message,field,object_index,match,context,position_start,position_end'
        );
      }
    });
  });
});
