import { ScanConfig } from '../../../../shared/types/ScanConfig';
import { RulePack } from '../../../rules/core/entities/RulePack';

/**
 * Represents the context for a scan operation
 */
export class ScanContext {
  constructor(
    public readonly config: ScanConfig,
    public readonly rulePack: RulePack,
    public readonly startTime: Date = new Date()
  ) {}

  getFieldsToScan(): string[] {
    return this.config.fields && this.config.fields.length > 0
      ? this.config.fields
      : ['prompt', 'response'];
  }

  shouldScanEntireObject(): boolean {
    return this.config.scanEntireObject || false;
  }

  getMaxDepth(): number {
    return this.config.maxDepth || 4;
  }

  getMaxObjects(): number | undefined {
    return this.config.maxObjects;
  }

  isNdjsonMode(): boolean {
    return this.config.ndjsonMode || false;
  }

  getStreamingThreshold(): number {
    return this.config.streamingThreshold || 1000;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime.getTime();
  }
}
