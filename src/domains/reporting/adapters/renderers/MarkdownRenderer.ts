import { Renderer } from '../../core/ports/Renderer';
import { Report } from '../../core/entities/Report';
import { Result, ok, err } from '../../../../shared/types/Result';
import { ViolationUtils, Violation } from '../../../../shared/types/Violation';
import { ScanMetricsUtils } from '../../../../shared/types/ScanMetrics';
import chalk from 'chalk';
import { PACKAGE_VERSION } from '../../../../shared/packageResources';

/**
 * Markdown format renderer
 */
export class MarkdownRenderer implements Renderer {
  async render(report: Report): Promise<Result<string, Error>> {
    try {
      const violations = report.getFilteredViolations();
      const summary = ViolationUtils.createSummary(violations);
      const metrics = report.scanResult.metrics;
      // The styled terminal summary is opt-in: callers set noColor: false
      // only when writing to an interactive terminal. Everything else
      // (files, pipes, library use) gets plain Markdown.
      const useColor = report.options.noColor === false;

      let output = '';

      if (useColor) {
        // Issues found summary
        output += chalk.yellow(`${summary.total} Issues found:\n`);
        if (summary.total > 0) {
          // Count by severity
          const severityCounts = summary.bySeverity;
          if (severityCounts.critical) {
            output += `  ${severityCounts.critical} ${chalk.red('CRITICAL')}\n`;
          }
          if (severityCounts.high) {
            output += `  ${severityCounts.high} ${chalk.yellow('HIGH')}\n`;
          }
          if (severityCounts.medium) {
            output += `  ${severityCounts.medium} ${chalk.blue('MEDIUM')}\n`;
          }
          if (severityCounts.low) {
            output += `  ${severityCounts.low} ${chalk.green('LOW')}\n`;
          }
        }

        // Scanning progress with violations found
        const inputFile = report.options.inputFile || 'input';
        if (summary.total > 0) {
          const progressBar = '█'.repeat(
            Math.min(12, Math.ceil(summary.total / 4))
          );
          output += `Scanning ${inputFile}... ${chalk.green(progressBar)} ${summary.total} violations found\n`;
        } else {
          output += `Scanning ${inputFile}... ${chalk.green('✓')} No violations found\n`;
        }

        // TODO: Support multiple files in the future
        const filesScanned = 1;
        output += `${filesScanned} file scanned, ${summary.total} issues found\n`;
        output += chalk.yellow('PromptShield Scan Report\n');
        output += chalk.gray('=============================\n\n');

        // Stats section
        output +=
          chalk.cyan.bold('📊 Scan Date: ') + new Date().toISOString() + '\n';
        output += chalk.cyan.bold('📁 Files Scanned: ') + filesScanned + '\n';
        output +=
          chalk.cyan.bold('🚨 Total Violations: ') + summary.total + '\n\n';

        // Summary section
        output += chalk.cyan.bold('📊 Summary\n');
        output += chalk.gray('==========\n\n');

        // Severity breakdown
        output += chalk.yellow.bold('Severity Breakdown:\n');
        for (const [severity, count] of Object.entries(summary.bySeverity)) {
          const color = this.getSeverityColor(severity);
          output += `  • ${color(`${severity}: ${count} violations`)}\n`;
        }
        output += '\n';

        // Category breakdown
        output += chalk.yellow.bold('Category Breakdown:\n');
        for (const [category, count] of Object.entries(summary.byCategory)) {
          output += `  • ${chalk.blue(`${category}: ${count} violations`)}\n`;
        }
        output += '\n';

        // Results section
        output += chalk.cyan.bold('📄 Results\n');
        output += chalk.gray('==========\n\n');

        output += chalk.white.bold(`📄 File: ${inputFile}\n\n`);

        if (violations.length > 0) {
          const groupedViolations = violations.reduce(
            (groups, violation) => {
              const key = `${violation.ruleId}:${violation.severity}:${violation.category}`;
              if (!groups[key]) {
                groups[key] = {
                  ruleId: violation.ruleId,
                  severity: violation.severity,
                  category: violation.category,
                  ruleDescription: violation.ruleDescription,
                  violations: [],
                };
              }
              groups[key].violations.push(violation);
              return groups;
            },
            {} as Record<
              string,
              {
                ruleId: string;
                severity: string;
                category: string;
                ruleDescription: string;
                violations: Violation[];
              }
            >
          );

          type GroupedViolation = {
            ruleId: string;
            severity: string;
            category: string;
            ruleDescription: string;
            violations: Violation[];
          };

          for (const group of Object.values(
            groupedViolations
          ) as GroupedViolation[]) {
            const severityColor = this.getSeverityColor(group.severity);
            const severityBracket = severityColor.bold(
              `[${group.severity.toUpperCase()}]`
            );

            output +=
              severityBracket +
              ' ' +
              chalk.white.bold(group.ruleId) +
              ' ' +
              chalk.blue(`(${group.category})`) +
              '\n';
            output += `Rule: ${group.ruleDescription}\n`;
            output += `Occurrences: ${group.violations.length}\n\n`;

            // Show first few examples, don't overwhelm with all matches
            const maxExamples = 3;
            const examples = group.violations.slice(0, maxExamples);
            for (const violation of examples) {
              if (violation.context) {
                output += `  • "${violation.context.match}" [Object ${violation.objectIndex}, field: ${violation.field}]\n`;
              }
            }
            if (group.violations.length > maxExamples) {
              output += `  • ... and ${group.violations.length - maxExamples} more occurrences\n`;
            }
            output += '\n';
          }
        }

        output += chalk.gray(
          'Generated by PromptShield on ' + new Date().toISOString() + '\n'
        );
      } else {
        // Regular markdown format (no colors)
        output += '# PromptShield Scan Report\n\n';
        output += '## Summary\n\n';
        output += `**Total Violations:** ${summary.total}\n\n`;

        if (summary.total > 0) {
          // Severity breakdown
          output += '### By Severity\n\n';
          for (const [severity, count] of Object.entries(summary.bySeverity)) {
            const emoji = this.getSeverityEmoji(severity);
            output += `${emoji} **${severity}:** ${count}\n`;
          }
          output += '\n';

          // Category breakdown
          if (Object.keys(summary.byCategory).length > 0) {
            output += '### By Category\n\n';
            for (const [category, count] of Object.entries(
              summary.byCategory
            )) {
              output += `- **${category}:** ${count}\n`;
            }
            output += '\n';
          }
        }

        // Metrics
        if (report.shouldIncludeMetrics()) {
          output += '## Metrics\n\n';
          output += `- **Objects Scanned:** ${metrics.objectsScanned}\n`;
          output += `- **Processing Time:** ${ScanMetricsUtils.formatProcessingTime(metrics.processingTime)}\n`;
          output += `- **Memory Usage:** ${ScanMetricsUtils.formatMemoryUsage(metrics.memoryUsage)}\n`;
          output += `- **Rules Applied:** ${metrics.rulesApplied}\n`;
          output += `- **Processing Rate:** ${ScanMetricsUtils.calculateProcessingRate(metrics).toFixed(2)} objects/sec\n`;
          if (metrics.streamingUsed) {
            output += `- **Streaming:** Used\n`;
          }
          output += '\n';
        }

        // Violations
        if (violations.length > 0) {
          output += '## Violations\n\n';

          for (const violation of violations) {
            const emoji = this.getSeverityEmoji(violation.severity);
            output += `### ${emoji} ${violation.ruleId}\n\n`;
            output += `**Description:** ${violation.ruleDescription}\n\n`;
            output += `**Severity:** ${violation.severity}\n\n`;
            output += `**Category:** ${violation.category}\n\n`;
            output += `**Message:** ${violation.message}\n\n`;

            if (violation.field) {
              output += `**Field:** ${violation.field}\n\n`;
            }

            if (violation.context) {
              output += `**Context:**\n\`\`\`\n${violation.context.match}\n\`\`\`\n\n`;
            }

            if (violation.position) {
              output += `**Position:** ${violation.position.start}-${violation.position.end}\n\n`;
            }

            output += '---\n\n';
          }
        } else {
          output += '## No Violations Found\n\n';
          output +=
            '✅ No safety violations detected in the scanned content.\n\n';
        }

        output += `*Generated at ${new Date().toISOString()} by PromptShield v${PACKAGE_VERSION}*\n`;
      }

      return ok(output);
    } catch (error) {
      return err(new Error(`Failed to render Markdown report: ${error}`));
    }
  }

  getFormat(): string {
    return 'markdown';
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

  private getSeverityColor(severity: string): chalk.Chalk {
    switch (severity.toLowerCase()) {
      case 'critical':
        return chalk.red;
      case 'high':
        return chalk.yellow;
      case 'medium':
        return chalk.blue;
      case 'low':
        return chalk.green;
      default:
        return chalk.white;
    }
  }
}
