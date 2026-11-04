import { describe, test, expect } from '@jest/globals';
import { HtmlRenderer } from '../../../../../src/domains/reporting/adapters/renderers/HtmlRenderer';
import { Report } from '../../../../../src/domains/reporting/core/entities/Report';
import { ScanResult } from '../../../../../src/domains/scanning/core/entities/ScanResult';
import {
  createViolation,
  createScanMetrics,
} from '../../../../helpers/testFactories';
import { OutputFormat } from '../../../../../src/shared/types/ScanConfig';

describe('HtmlRenderer', () => {
  let renderer: HtmlRenderer;

  beforeEach(() => {
    renderer = new HtmlRenderer();
  });

  describe('render', () => {
    test('should render basic HTML report', async () => {
      const violations = [
        createViolation({
          ruleId: 'test-rule',
          message: 'sensitive data found',
          severity: 'high',
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'html' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('<!DOCTYPE html>');
        expect(result.value).toContain('<html lang="en">');
        expect(result.value).toContain('<head>');
        expect(result.value).toContain(
          '<title>PromptShield Scan Report</title>'
        );
        expect(result.value).toContain('<body>');
        expect(result.value).toContain('test-rule');
        expect(result.value).toContain('sensitive data');
      }
    });

    test('should include styling and table structure', async () => {
      const scanResult = new ScanResult(
        [createViolation()],
        createScanMetrics()
      );
      const report = new Report(scanResult, 'html' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('<style>');
        expect(result.value).toContain('body {');
        expect(result.value).toContain('color:');
      }
    });

    test('should escape HTML content properly', async () => {
      const violations = [
        createViolation({
          message: '<script>alert("xss")</script> & "quotes"',
          context: {
            before: '',
            match: '<script>alert("xss")</script>',
            after: '',
          },
        }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'html' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('&lt;script&gt;');
        expect(result.value).toContain('&amp;');
        expect(result.value).toContain('&quot;');
        expect(result.value).not.toContain('<script>alert'); // Should be escaped
      }
    });

    test('should include summary section', async () => {
      const violations = [
        createViolation({ severity: 'high' }),
        createViolation({ severity: 'medium' }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'html' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('📊 Summary');
        expect(result.value).toContain('Total Violations:');
        expect(result.value).toContain('Objects Scanned:');
      }
    });

    test('should include severity breakdown', async () => {
      const violations = [
        createViolation({ severity: 'critical' }),
        createViolation({ severity: 'high' }),
      ];
      const scanResult = new ScanResult(violations, createScanMetrics());
      const report = new Report(scanResult, 'html' as OutputFormat);

      const result = await renderer.render(report);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('🚨 Severity Breakdown');
        expect(result.value).toContain('🔴');
        expect(result.value).toContain('🟠');
      }
    });
  });
});
