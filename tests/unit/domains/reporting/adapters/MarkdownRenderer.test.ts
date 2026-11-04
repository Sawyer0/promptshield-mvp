import { describe, test, expect } from '@jest/globals';
import { MarkdownRenderer } from '../../../../../src/domains/reporting/adapters/renderers/MarkdownRenderer';
import { Report } from '../../../../../src/domains/reporting/core/entities/Report';
import { ScanResult } from '../../../../../src/domains/scanning/core/entities/ScanResult';
import {
  createViolation,
  createScanMetrics,
} from '../../../../helpers/testFactories';
import { OutputFormat } from '../../../../../src/shared/types/ScanConfig';

describe('MarkdownRenderer', () => {
  let renderer: MarkdownRenderer;

  beforeEach(() => {
    renderer = new MarkdownRenderer();
  });

  describe('render', () => {
    test('should render basic markdown report', async () => {
      const violations = [
        createViolation({
          ruleId: 'email-rule',
          severity: 'high',
          message: 'Email address found',
          context: { match: 'test@example.com' },
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'markdown' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('# PromptShield Scan Report');
        expect(result.value).toContain('## Summary');
        expect(result.value).toContain('test@example.com');
        expect(result.value).toContain('email-rule');
      }
    });

    test('should handle empty violations gracefully', async () => {
      const scanResult = new ScanResult([], createScanMetrics());
      const report = new Report(scanResult, 'markdown' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('✅ No safety violations detected');
      }
    });

    test('should group by severity when requested', async () => {
      const violations = [
        createViolation({ severity: 'critical', category: 'pii' }),
        createViolation({ severity: 'critical', category: 'security' }),
        createViolation({ severity: 'high', category: 'bias' }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'markdown' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('🔴 **critical:** 2');
        expect(result.value).toContain('🟠 **high:** 1');
      }
    });

    test('should include summary when requested', async () => {
      const violations = [
        createViolation({ severity: 'high' }),
        createViolation({ severity: 'medium' }),
      ];
      const metrics = createScanMetrics({
        objectsScanned: 100,
        processingTime: 1500,
      });
      const scanResult = new ScanResult(violations, metrics);
      const report = new Report(scanResult, 'markdown' as OutputFormat, {
        includeSummary: true,
      });

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('## Summary');
        expect(result.value).toContain('100'); // objects scanned
        expect(result.value).toContain('1.5s'); // processing time
      }
    });
  });
});
