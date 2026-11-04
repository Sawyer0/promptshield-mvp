import { Violation } from '../../../../shared/types/Violation';
import { ScanMetrics } from '../../../../shared/types/ScanMetrics';

/**
 * Represents the result of a scan operation
 */
const SEVERITY_RANK = ['low', 'medium', 'high', 'critical'];

export class ScanResult {
  constructor(
    public readonly violations: Violation[],
    public readonly metrics: ScanMetrics,
    public readonly timestamp: Date = new Date()
  ) {}

  getViolationsBySeverity(severity: string[]): Violation[] {
    return this.violations.filter((v) => severity.includes(v.severity));
  }

  getViolationsByCategory(categories: string[]): Violation[] {
    if (categories.length === 0) return this.violations;
    return this.violations.filter((v) => categories.includes(v.category));
  }

  getTotalViolations(): number {
    return this.violations.length;
  }

  getViolationCountBySeverity(): Record<string, number> {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    this.violations.forEach((v) => {
      if (v.severity in counts) {
        counts[v.severity as keyof typeof counts]++;
      }
    });
    return counts;
  }

  /**
   * True when any violation is at or above the given severity, so
   * --fail-on high also fails on critical findings.
   */
  shouldFail(failOnSeverity?: string): boolean {
    if (!failOnSeverity) return false;
    const threshold = SEVERITY_RANK.indexOf(failOnSeverity);
    if (threshold === -1) return false;
    return this.violations.some(
      (v) => SEVERITY_RANK.indexOf(v.severity) >= threshold
    );
  }

  static empty(): ScanResult {
    return new ScanResult([], {
      objectsScanned: 0,
      processingTime: 0,
      memoryUsage: 0,
      rulesApplied: 0,
      streamingUsed: false,
    });
  }
}
