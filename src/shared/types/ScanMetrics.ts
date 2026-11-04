/**
 * Metrics collected during scan operations
 */
export interface ScanMetrics {
  // Processing metrics
  objectsScanned: number;
  processingTime: number; // milliseconds
  memoryUsage: number; // bytes
  rulesApplied: number;

  // Performance metrics
  averageTimePerObject?: number; // milliseconds
  peakMemoryUsage?: number; // bytes

  // File metrics
  fileSize?: number; // bytes
  fileType?: string;

  // Streaming metrics
  streamingUsed: boolean;
  batchesProcessed?: number;

  metadata?: {
    startTime: Date;
    endTime: Date;
    version: string;
    rulepackVersion: string;
  };
}

/**
 * Utility functions for working with scan metrics
 */
export const ScanMetricsUtils = {
  calculateAverageTimePerObject(metrics: ScanMetrics): number {
    if (metrics.objectsScanned === 0) return 0;
    return metrics.processingTime / metrics.objectsScanned;
  },

  formatProcessingTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.floor((milliseconds % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  },

  formatMemoryUsage(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  },

  calculateProcessingRate(metrics: ScanMetrics): number {
    if (metrics.processingTime === 0) return 0;
    return (metrics.objectsScanned / metrics.processingTime) * 1000;
  },

  isMemoryUsageHigh(metrics: ScanMetrics, threshold: number): boolean {
    const totalMemory = process.memoryUsage().heapTotal;
    return metrics.memoryUsage / totalMemory > threshold;
  },

  createSummary(metrics: ScanMetrics): string {
    const items = [
      `${metrics.objectsScanned} objects scanned`,
      `${this.formatProcessingTime(metrics.processingTime)} processing time`,
      `${this.formatMemoryUsage(metrics.memoryUsage)} memory used`,
      `${metrics.rulesApplied} rules applied`,
    ];

    if (metrics.averageTimePerObject) {
      items.push(
        `${this.formatProcessingTime(metrics.averageTimePerObject)} avg per object`
      );
    }

    return items.join(', ');
  },
};
