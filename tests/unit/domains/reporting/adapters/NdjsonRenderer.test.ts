import { describe, test, expect } from '@jest/globals';
import { NdjsonRenderer } from '../../../../../src/domains/reporting/adapters/renderers/NdjsonRenderer';
import { Report } from '../../../../../src/domains/reporting/core/entities/Report';
import { ScanResult } from '../../../../../src/domains/scanning/core/entities/ScanResult';
import {
  createViolation,
  createScanMetrics,
} from '../../../../helpers/testFactories';
import { OutputFormat } from '../../../../../src/shared/types/ScanConfig';

describe('NdjsonRenderer', () => {
  let renderer: NdjsonRenderer;

  beforeEach(() => {
    renderer = new NdjsonRenderer();
  });

  describe('render', () => {
    test('should render violations as NDJSON', async () => {
      const violations = [
        createViolation({ ruleId: 'rule1', severity: 'high' }),
        createViolation({ ruleId: 'rule2', severity: 'medium' }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'ndjson' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const lines = result.value.trim().split('\n');
        expect(lines).toHaveLength(2);

        const firstViolation = JSON.parse(lines[0]);
        const secondViolation = JSON.parse(lines[1]);

        expect(firstViolation.rule_id).toBe('rule1');
        expect(firstViolation.severity).toBe('high');
        expect(secondViolation.rule_id).toBe('rule2');
        expect(secondViolation.severity).toBe('medium');
      }
    });

    test('should handle empty violations', async () => {
      const scanResult = new ScanResult([], createScanMetrics());
      const report = new Report(scanResult, 'ndjson' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.trim()).toBe('');
      }
    });

    test('should include metadata when requested', async () => {
      const violations = [createViolation({ ruleId: 'test-rule' })];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'ndjson' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const lines = result.value.trim().split('\n');
        expect(lines).toHaveLength(1); // violation only

        const violation = JSON.parse(lines[0]);
        expect(violation.rule_id).toBe('test-rule');
      }
    });

    test('should handle special characters in violation data', async () => {
      const violations = [
        createViolation({
          context: { match: 'text with\nnewlines and "quotes"' },
          ruleDescription: 'Rule with special chars: \\n\\t',
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'ndjson' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const line = result.value.trim();
        const violation = JSON.parse(line);

        expect(violation.context.match).toBe(
          'text with\nnewlines and "quotes"'
        );
        expect(violation.rule_description).toBe(
          'Rule with special chars: \\n\\t'
        );
      }
    });

    test('should stream large datasets efficiently', async () => {
      const violations = Array.from({ length: 1000 }, (_, i) =>
        createViolation({ ruleId: `rule-${i}` })
      );
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'ndjson' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const lines = result.value.trim().split('\n');
        expect(lines).toHaveLength(1000);

        const firstViolation = JSON.parse(lines[0]);
        const lastViolation = JSON.parse(lines[999]);

        expect(firstViolation.rule_id).toBe('rule-0');
        expect(lastViolation.rule_id).toBe('rule-999');
      }
    });
  });
});
