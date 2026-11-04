import { Renderer } from '../../core/ports/Renderer';
import { Report } from '../../core/entities/Report';
import { Result, ok, err } from '../../../../shared/types/Result';
import { ViolationUtils, Violation } from '../../../../shared/types/Violation';
import { ScanMetricsUtils } from '../../../../shared/types/ScanMetrics';
import { PACKAGE_VERSION } from '../../../../shared/packageResources';

/**
 * JSON format renderer
 */
export class JsonRenderer implements Renderer {
  async render(report: Report): Promise<Result<string, Error>> {
    try {
      const violations = report.getFilteredViolations();
      const summary = ViolationUtils.createSummary(violations);
      const metrics = report.scanResult.metrics;

      const output: {
        summary: {
          total_violations: number;
          by_severity: Record<string, number>;
          by_category: Record<string, number>;
        };
        violations: Array<{
          rule_id: string;
          rule_description: string;
          severity: string;
          category: string;
          occurrences: number;
          examples: Array<{
            field: string;
            object_index: number;
            match: string;
            position?: {
              start: number;
              end: number;
              line?: number;
              column?: number;
            };
          }>;
        }>;
        metrics?: {
          objects_scanned: number;
          processing_time_ms: number;
          memory_usage_bytes: number;
          rules_applied: number;
          processing_rate: number;
          average_time_per_object_ms: number;
        };
        metadata?: {
          generated_at: string;
          version: string;
        };
      } = {
        summary: {
          total_violations: summary.total,
          by_severity: summary.bySeverity,
          by_category: summary.byCategory,
        },
        violations: this.groupViolationsForJson(violations),
      };

      // Include metrics if requested
      if (report.shouldIncludeMetrics()) {
        output.metrics = {
          objects_scanned: metrics.objectsScanned,
          processing_time_ms: metrics.processingTime,
          memory_usage_bytes: metrics.memoryUsage,
          rules_applied: metrics.rulesApplied,
          processing_rate: ScanMetricsUtils.calculateProcessingRate(metrics),
          average_time_per_object_ms: metrics.averageTimePerObject ?? 0,
        };
      }

      // Include metadata
      output.metadata = {
        generated_at: new Date().toISOString(),
        version: PACKAGE_VERSION,
      };

      const jsonString = report.options.verbose
        ? JSON.stringify(output, null, 2)
        : JSON.stringify(output);

      return ok(jsonString);
    } catch (error) {
      return err(new Error(`Failed to render JSON report: ${error}`));
    }
  }

  private groupViolationsForJson(violations: Violation[]): Array<{
    rule_id: string;
    rule_description: string;
    severity: string;
    category: string;
    occurrences: number;
    examples: Array<{
      field: string;
      object_index: number;
      match: string;
      position?: {
        start: number;
        end: number;
        line?: number;
        column?: number;
      };
    }>;
  }> {
    const groupedViolations = violations.reduce(
      (groups, violation) => {
        const key = `${violation.ruleId}:${violation.severity}:${violation.category}`;
        if (!groups[key]) {
          groups[key] = {
            rule_id: violation.ruleId,
            rule_description: violation.ruleDescription,
            severity: violation.severity,
            category: violation.category,
            occurrences: 0,
            examples: [],
          };
        }
        groups[key].occurrences++;

        // Add up to 3 examples per rule
        if (groups[key].examples.length < 3) {
          groups[key].examples.push({
            field: violation.field,
            object_index: violation.objectIndex,
            match: violation.context?.match || '',
            position: violation.position,
          });
        }

        return groups;
      },
      {} as Record<
        string,
        {
          rule_id: string;
          rule_description: string;
          severity: string;
          category: string;
          occurrences: number;
          examples: Array<{
            field: string;
            object_index: number;
            match: string;
            position?: {
              start: number;
              end: number;
              line?: number;
              column?: number;
            };
          }>;
        }
      >
    );

    return Object.values(groupedViolations);
  }

  getFormat(): string {
    return 'json';
  }

  supportsStreaming(): boolean {
    return false;
  }
}
