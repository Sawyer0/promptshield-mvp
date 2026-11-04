import { Renderer } from '../../core/ports/Renderer';
import { Report } from '../../core/entities/Report';
import { Result, ok, err } from '../../../../shared/types/Result';
import { ViolationUtils } from '../../../../shared/types/Violation';
import { ScanMetricsUtils } from '../../../../shared/types/ScanMetrics';
import { PACKAGE_VERSION } from '../../../../shared/packageResources';

/**
 * Table format renderer
 */
export class TableRenderer implements Renderer {
  async render(report: Report): Promise<Result<string, Error>> {
    try {
      const violations = report.getFilteredViolations();
      const summary = ViolationUtils.createSummary(violations);
      const metrics = report.scanResult.metrics;

      let output = '';

      // Header
      output +=
        '┌─────────────────────────────────────────────────────────────────────────────────┐\n';
      output +=
        '│                            PromptShield Scan Report                             │\n';
      output +=
        '└─────────────────────────────────────────────────────────────────────────────────┘\n\n';

      // Summary table
      output += '📊 SUMMARY\n';
      output +=
        '┌─────────────────────┬─────────────────────────────────────────────────────────┐\n';
      output +=
        '│ Metric              │ Value                                                   │\n';
      output +=
        '├─────────────────────┼─────────────────────────────────────────────────────────┤\n';
      output += `│ Total Violations    │ ${summary.total.toString().padEnd(55)} │\n`;
      output += `│ Objects Scanned     │ ${metrics.objectsScanned.toString().padEnd(55)} │\n`;
      output += `│ Processing Time     │ ${ScanMetricsUtils.formatProcessingTime(metrics.processingTime).padEnd(55)} │\n`;
      output += `│ Memory Usage        │ ${ScanMetricsUtils.formatMemoryUsage(metrics.memoryUsage).padEnd(55)} │\n`;
      output += `│ Rules Applied       │ ${metrics.rulesApplied.toString().padEnd(55)} │\n`;
      output +=
        '└─────────────────────┴─────────────────────────────────────────────────────────┘\n\n';

      // Severity breakdown
      if (summary.total > 0) {
        output += '🚨 SEVERITY BREAKDOWN\n';
        output +=
          '┌─────────────────────┬─────────────────────────────────────────────────────────┐\n';
        output +=
          '│ Severity            │ Count                                                   │\n';
        output +=
          '├─────────────────────┼─────────────────────────────────────────────────────────┤\n';

        for (const [severity, count] of Object.entries(summary.bySeverity)) {
          const emoji = this.getSeverityEmoji(severity);
          const severityText = `${emoji} ${severity}`;
          output += `│ ${severityText.padEnd(19)} │ ${count.toString().padEnd(55)} │\n`;
        }
        output +=
          '└─────────────────────┴─────────────────────────────────────────────────────────┘\n\n';
      }

      // Violations table
      if (violations.length > 0) {
        output += '🔍 VIOLATIONS\n';
        output +=
          '┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐\n';
        output +=
          '│ Rule ID             │ Severity            │ Category            │ Message             │\n';
        output +=
          '├─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤\n';

        for (const violation of violations) {
          const emoji = this.getSeverityEmoji(violation.severity);
          const ruleId = this.truncateText(violation.ruleId, 19);
          const severity = `${emoji} ${violation.severity}`.padEnd(19);
          const category = this.truncateText(violation.category, 19);
          const message = this.truncateText(violation.message, 19);

          output += `│ ${ruleId} │ ${severity} │ ${category} │ ${message} │\n`;
        }
        output +=
          '└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘\n\n';
      } else {
        output += '✅ NO VIOLATIONS FOUND\n';
        output +=
          '┌─────────────────────────────────────────────────────────────────────────────────┐\n';
        output +=
          '│ No safety violations detected in the scanned content.                           │\n';
        output +=
          '└─────────────────────────────────────────────────────────────────────────────────┘\n\n';
      }

      // Footer
      output += `Generated at ${new Date().toISOString()} by PromptShield v${PACKAGE_VERSION}\n`;

      return ok(output);
    } catch (error) {
      return err(new Error(`Failed to render table report: ${error}`));
    }
  }

  getFormat(): string {
    return 'table';
  }

  supportsStreaming(): boolean {
    return false;
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text.padEnd(maxLength);
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}
