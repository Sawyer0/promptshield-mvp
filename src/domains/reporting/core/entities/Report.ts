import { ScanResult } from '../../../scanning/core/entities/ScanResult';
import { OutputFormat } from '../../../../shared/types/ScanConfig';

/**
 * Represents a report to be generated
 */
export class Report {
  constructor(
    public readonly scanResult: ScanResult,
    public readonly format: OutputFormat,
    public readonly options: ReportOptions = {}
  ) {}

  getTotalViolations(): number {
    return this.scanResult.getTotalViolations();
  }

  shouldIncludeSummary(): boolean {
    return this.options.includeSummary !== false;
  }

  shouldIncludeMetrics(): boolean {
    return this.options.includeMetrics !== false;
  }

  getFilteredViolations() {
    let violations = this.scanResult.violations;

    if (this.options.severity && this.options.severity.length > 0) {
      violations = this.scanResult.getViolationsBySeverity(
        this.options.severity
      );
    }

    if (this.options.category && this.options.category.length > 0) {
      violations = this.scanResult.getViolationsByCategory(
        this.options.category
      );
    }

    if (this.options.maxViolations) {
      violations = violations.slice(0, this.options.maxViolations);
    }

    if (this.options.offset) {
      violations = violations.slice(this.options.offset);
    }

    if (this.options.limit) {
      violations = violations.slice(0, this.options.limit);
    }

    return violations;
  }
}

/**
 * Options for report generation
 */
export interface ReportOptions {
  // Filtering options
  severity?: string[];
  category?: string[];
  maxViolations?: number;
  offset?: number;
  limit?: number;

  // Display options
  includeSummary?: boolean;
  includeMetrics?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  noColor?: boolean;

  // Output options
  outputFile?: string;

  // Input information
  inputFile?: string;
}

export interface ReportMetadata {
  generatedAt: Date;
  format: OutputFormat;
  violationCount: number;
  scanDuration: number;
  version: string;
}
