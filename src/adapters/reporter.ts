/**
 * Reporter Adapter - Formats and displays scan results
 * Uses chalk for terminal colors, implements IReporter interface
 */

import chalk from 'chalk';
import { IReporter, ScanResult, ViolationNode, Severity } from '../core/types';
import { PACKAGE_VERSION } from '../shared/packageResources';

/**
 * Get chalk color function for severity level
 */
function getSeverityColor(severity: Severity): chalk.Chalk {
  switch (severity) {
    case 'critical':
      return chalk.red.bold;
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.blue;
    default:
      return chalk.gray;
  }
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔵';
    default:
      return '⚪';
  }
}

/**
 * Format a violation for display
 */
function formatViolation(violation: ViolationNode, filePath?: string): string {
  const lines: string[] = [];

  // Header with severity and rule
  const severityColor = getSeverityColor(violation.severity);
  const icon = getSeverityIcon(violation.severity);

  const location =
    violation.line && violation.column
      ? `${violation.line}:${violation.column}`
      : `offset ${violation.start}`;

  const fileInfo = filePath ? chalk.cyan(filePath) + ':' : '';

  lines.push(
    `${icon} ${severityColor(violation.severity.toUpperCase())} ${fileInfo}${chalk.gray(location)}`
  );

  // Rule info
  lines.push(
    `  ${chalk.bold(violation.ruleName)} ${chalk.gray(`[${violation.ruleId}]`)}`
  );

  // Message
  lines.push(`  ${violation.message}`);

  // Context
  if (violation.context) {
    const contextLines = violation.context.split('\n');
    contextLines.forEach((line) => {
      lines.push(`  ${chalk.gray('│')} ${line}`);
    });
  }

  return lines.join('\n');
}

/**
 * Node.js CLI reporter implementation
 */
export class NodeReporter implements IReporter {
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Report scan results for a single file
   */
  reportFile(filePath: string, result: ScanResult): void {
    if (result.violationCount === 0) {
      if (this.verbose) {
        console.log(chalk.green(`✓ ${filePath} - No issues found`));
      }
      return;
    }

    console.log('\n' + chalk.bold.underline(filePath));
    console.log(chalk.gray(`Found ${result.violationCount} issue(s)\n`));

    result.violations.forEach((violation, index) => {
      console.log(formatViolation(violation, undefined));

      // Add spacing between violations
      if (index < result.violations.length - 1) {
        console.log('');
      }
    });
  }

  /**
   * Report aggregated results for multiple files
   */
  reportSummary(results: Map<string, ScanResult>): void {
    let totalFiles = 0;
    let filesWithIssues = 0;
    let totalViolations = 0;
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    // Aggregate statistics
    for (const [filePath, result] of results.entries()) {
      totalFiles++;

      if (result.violationCount > 0) {
        filesWithIssues++;
        totalViolations += result.violationCount;

        // Count by severity
        result.violations.forEach((v) => {
          severityCounts[v.severity]++;
        });

        // Report individual file
        this.reportFile(filePath, result);
      } else if (this.verbose) {
        console.log(chalk.green(`✓ ${filePath}`));
      }
    }

    // Print summary
    console.log('\n' + chalk.bold('═'.repeat(60)));
    console.log(chalk.bold('Summary'));
    console.log(chalk.bold('═'.repeat(60)));

    console.log(`${chalk.bold('Files scanned:')} ${totalFiles}`);
    console.log(`${chalk.bold('Files with issues:')} ${filesWithIssues}`);
    console.log(`${chalk.bold('Total violations:')} ${totalViolations}`);

    if (totalViolations > 0) {
      console.log('\n' + chalk.bold('By Severity:'));

      if (severityCounts.critical > 0) {
        console.log(
          `  ${getSeverityIcon('critical')} Critical: ${chalk.red.bold(severityCounts.critical)}`
        );
      }
      if (severityCounts.high > 0) {
        console.log(
          `  ${getSeverityIcon('high')} High:     ${chalk.red(severityCounts.high)}`
        );
      }
      if (severityCounts.medium > 0) {
        console.log(
          `  ${getSeverityIcon('medium')} Medium:   ${chalk.yellow(severityCounts.medium)}`
        );
      }
      if (severityCounts.low > 0) {
        console.log(
          `  ${getSeverityIcon('low')} Low:      ${chalk.blue(severityCounts.low)}`
        );
      }
    }

    console.log(chalk.bold('═'.repeat(60)));

    // Exit code indication
    if (severityCounts.critical > 0 || severityCounts.high > 0) {
      console.log(chalk.red('\n⚠ Critical or high severity issues found!'));
    } else if (totalViolations > 0) {
      console.log(chalk.yellow('\n⚠ Issues found.'));
    } else {
      console.log(chalk.green('\n✓ No issues found.'));
    }
  }

  /**
   * Export results in a specific format
   */
  export(results: Map<string, ScanResult>, format: string): string {
    switch (format.toLowerCase()) {
      case 'json':
        return this.exportJSON(results);

      case 'text':
        return this.exportText(results);

      case 'sarif':
        return this.exportSARIF(results);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as JSON
   */
  private exportJSON(results: Map<string, ScanResult>): string {
    const output = {
      version: PACKAGE_VERSION,
      timestamp: new Date().toISOString(),
      results: Array.from(results.entries()).map(([filePath, result]) => ({
        file: filePath,
        violationCount: result.violationCount,
        violations: result.violations.map((v) => ({
          ruleId: v.ruleId,
          ruleName: v.ruleName,
          category: v.category,
          severity: v.severity,
          message: v.message,
          line: v.line,
          column: v.column,
          start: v.start,
          end: v.end,
          matchText: v.matchText,
          context: v.context,
        })),
      })),
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Export as plain text
   */
  private exportText(results: Map<string, ScanResult>): string {
    const lines: string[] = [];

    for (const [filePath, result] of results.entries()) {
      if (result.violationCount === 0) {
        continue;
      }

      lines.push(`\n=== ${filePath} ===`);
      lines.push(`Found ${result.violationCount} issue(s)\n`);

      result.violations.forEach((v) => {
        const location =
          v.line && v.column ? `${v.line}:${v.column}` : `offset ${v.start}`;
        lines.push(`[${v.severity.toUpperCase()}] ${location}`);
        lines.push(`  Rule: ${v.ruleName} (${v.ruleId})`);
        lines.push(`  ${v.message}`);

        lines.push('');
      });
    }

    return lines.join('\n');
  }

  /**
   * Export as SARIF (Static Analysis Results Interchange Format)
   */
  private exportSARIF(results: Map<string, ScanResult>): string {
    const runs = [
      {
        tool: {
          driver: {
            name: 'PromptShield',
            version: PACKAGE_VERSION,
            informationUri: 'https://github.com/Sawyer0/promptshield-mvp',
          },
        },
        results: [] as SarifResult[],
      },
    ];

    for (const [filePath, result] of results.entries()) {
      result.violations.forEach((v) => {
        runs[0].results.push({
          ruleId: v.ruleId,
          level:
            v.severity === 'critical' || v.severity === 'high'
              ? 'error'
              : 'warning',
          message: {
            text: v.message,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: filePath,
                },
                region: {
                  startLine: v.line || 1,
                  startColumn: v.column || 1,
                  charOffset: v.start,
                  charLength: v.end - v.start,
                },
              },
            },
          ],
        });
      });
    }

    return JSON.stringify(
      {
        version: '2.1.0',
        $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
        runs,
      },
      null,
      2
    );
  }
}

/** Minimal SARIF 2.1.0 result shape emitted by exportSARIF. */
interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning';
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn: number;
        charOffset: number;
        charLength: number;
      };
    };
  }>;
}
