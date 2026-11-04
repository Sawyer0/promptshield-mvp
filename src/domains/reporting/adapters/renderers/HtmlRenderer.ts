import { Renderer } from '../../core/ports/Renderer';
import { Report } from '../../core/entities/Report';
import { Result, ok, err } from '../../../../shared/types/Result';
import { ViolationUtils } from '../../../../shared/types/Violation';
import { ScanMetricsUtils } from '../../../../shared/types/ScanMetrics';
import { PACKAGE_VERSION } from '../../../../shared/packageResources';

/**
 * HTML format renderer
 */
export class HtmlRenderer implements Renderer {
  async render(report: Report): Promise<Result<string, Error>> {
    try {
      const violations = report.getFilteredViolations();
      const summary = ViolationUtils.createSummary(violations);
      const metrics = report.scanResult.metrics;

      let output = '';

      // HTML Header
      output += '<!DOCTYPE html>\n';
      output += '<html lang="en">\n';
      output += '<head>\n';
      output += '  <meta charset="UTF-8">\n';
      output +=
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
      output += '  <title>PromptShield Scan Report</title>\n';
      output += '  <style>\n';
      output += this.getStyles();
      output += '  </style>\n';
      output += '</head>\n';
      output += '<body>\n';

      // Header
      output += '  <div class="header">\n';
      output += '    <h1>🛡️ PromptShield Scan Report</h1>\n';
      output += `    <p class="timestamp">Generated at ${new Date().toISOString()}</p>\n`;
      output += '  </div>\n';

      // Summary section
      output += '  <div class="summary">\n';
      output += '    <h2>📊 Summary</h2>\n';
      output += '    <div class="summary-grid">\n';
      output += `      <div class="summary-item">\n`;
      output += `        <span class="label">Total Violations:</span>\n`;
      output += `        <span class="value ${summary.total > 0 ? 'violations' : 'no-violations'}">${summary.total}</span>\n`;
      output += `      </div>\n`;
      output += `      <div class="summary-item">\n`;
      output += `        <span class="label">Objects Scanned:</span>\n`;
      output += `        <span class="value">${metrics.objectsScanned}</span>\n`;
      output += `      </div>\n`;
      output += `      <div class="summary-item">\n`;
      output += `        <span class="label">Processing Time:</span>\n`;
      output += `        <span class="value">${ScanMetricsUtils.formatProcessingTime(metrics.processingTime)}</span>\n`;
      output += `      </div>\n`;
      output += `      <div class="summary-item">\n`;
      output += `        <span class="label">Memory Usage:</span>\n`;
      output += `        <span class="value">${ScanMetricsUtils.formatMemoryUsage(metrics.memoryUsage)}</span>\n`;
      output += `      </div>\n`;
      output += '    </div>\n';
      output += '  </div>\n';

      // Severity breakdown
      if (summary.total > 0) {
        output += '  <div class="severity-breakdown">\n';
        output += '    <h2>🚨 Severity Breakdown</h2>\n';
        output += '    <div class="severity-grid">\n';

        for (const [severity, count] of Object.entries(summary.bySeverity)) {
          const emoji = this.getSeverityEmoji(severity);
          output += `      <div class="severity-item ${severity.toLowerCase()}">\n`;
          output += `        <span class="severity-label">${emoji} ${severity}</span>\n`;
          output += `        <span class="severity-count">${count}</span>\n`;
          output += `      </div>\n`;
        }

        output += '    </div>\n';
        output += '  </div>\n';
      }

      // Violations
      if (violations.length > 0) {
        output += '  <div class="violations">\n';
        output += '    <h2>🔍 Violations</h2>\n';

        for (const violation of violations) {
          const emoji = this.getSeverityEmoji(violation.severity);
          output += `    <div class="violation ${violation.severity.toLowerCase()}">\n`;
          output += `      <div class="violation-header">\n`;
          output += `        <h3>${emoji} ${this.escapeHtml(violation.ruleId)}</h3>\n`;
          output += `        <div class="violation-meta">\n`;
          output += `          <span class="severity ${violation.severity.toLowerCase()}">${violation.severity}</span>\n`;
          output += `          <span class="category">${violation.category}</span>\n`;
          output += `        </div>\n`;
          output += `      </div>\n`;
          output += `      <div class="violation-body">\n`;
          output += `        <p class="description">${this.escapeHtml(violation.ruleDescription)}</p>\n`;
          output += `        <p class="message"><strong>Message:</strong> ${this.escapeHtml(violation.message)}</p>\n`;

          if (violation.field) {
            output += `        <p class="field"><strong>Field:</strong> ${this.escapeHtml(violation.field)}</p>\n`;
          }

          if (violation.context) {
            output += `        <div class="context">\n`;
            output += `          <strong>Context:</strong>\n`;
            output += `          <pre><code>${this.escapeHtml(violation.context.match)}</code></pre>\n`;
            output += `        </div>\n`;
          }

          if (violation.position) {
            output += `        <p class="position"><strong>Position:</strong> ${violation.position.start}-${violation.position.end}</p>\n`;
          }

          output += `      </div>\n`;
          output += `    </div>\n`;
        }

        output += '  </div>\n';
      } else {
        output += '  <div class="no-violations">\n';
        output += '    <h2>✅ No Violations Found</h2>\n';
        output +=
          '    <p>No safety violations detected in the scanned content.</p>\n';
        output += '  </div>\n';
      }

      // Footer
      output += '  <div class="footer">\n';
      output += `    <p>Generated by PromptShield v${PACKAGE_VERSION}</p>\n`;
      output += '  </div>\n';
      output += '</body>\n';
      output += '</html>\n';

      return ok(output);
    } catch (error) {
      return err(new Error(`Failed to render HTML report: ${error}`));
    }
  }

  getFormat(): string {
    return 'html';
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

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getStyles(): string {
    return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 10px;
      margin-bottom: 2rem;
      text-align: center;
    }

    .header h1 {
      margin: 0;
      font-size: 2.5rem;
    }

    .timestamp {
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .summary, .severity-breakdown, .violations, .no-violations {
      background: white;
      border-radius: 10px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .label {
      font-weight: 600;
      color: #666;
    }

    .value {
      font-weight: 700;
      font-size: 1.2rem;
    }

    .value.violations {
      color: #dc3545;
    }

    .value.no-violations {
      color: #28a745;
    }

    .severity-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .severity-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid;
    }

    .severity-item.critical {
      background: #fff5f5;
      border-left-color: #dc3545;
    }

    .severity-item.high {
      background: #fff8e1;
      border-left-color: #fd7e14;
    }

    .severity-item.medium {
      background: #fffbf0;
      border-left-color: #ffc107;
    }

    .severity-item.low {
      background: #f8fff8;
      border-left-color: #28a745;
    }

    .severity-count {
      font-weight: 700;
      font-size: 1.5rem;
    }

    .violation {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 1rem;
      border-left: 4px solid;
    }

    .violation.critical {
      border-left-color: #dc3545;
    }

    .violation.high {
      border-left-color: #fd7e14;
    }

    .violation.medium {
      border-left-color: #ffc107;
    }

    .violation.low {
      border-left-color: #28a745;
    }

    .violation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    .violation-header h3 {
      margin: 0;
      font-size: 1.2rem;
    }

    .violation-meta {
      display: flex;
      gap: 0.5rem;
    }

    .severity, .category {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity.critical {
      background: #dc3545;
      color: white;
    }

    .severity.high {
      background: #fd7e14;
      color: white;
    }

    .severity.medium {
      background: #ffc107;
      color: black;
    }

    .severity.low {
      background: #28a745;
      color: white;
    }

    .category {
      background: #6c757d;
      color: white;
    }

    .violation-body {
      padding: 1rem;
    }

    .violation-body p {
      margin: 0.5rem 0;
    }

    .description {
      font-style: italic;
      color: #666;
    }

    .context pre {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 0.5rem 0;
    }

    .no-violations {
      text-align: center;
      padding: 3rem;
    }

    .no-violations h2 {
      color: #28a745;
      margin-bottom: 1rem;
    }

    .footer {
      text-align: center;
      color: #666;
      margin-top: 2rem;
    }

    @media (max-width: 768px) {
      .summary-grid, .severity-grid {
        grid-template-columns: 1fr;
      }

      .violation-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
    `;
  }
}
