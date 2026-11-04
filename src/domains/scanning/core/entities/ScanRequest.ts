import { ScanConfig } from '../../../../shared/types/ScanConfig';

/**
 * Represents a scan request with input data and configuration
 */
export class ScanRequest {
  constructor(
    public readonly input: string,
    public readonly config: ScanConfig,
    public readonly timestamp: Date = new Date()
  ) {}

  static create(input: string, config: Partial<ScanConfig> = {}): ScanRequest {
    const defaultConfig: ScanConfig = {
      rulepack: '',
      outputFormat: 'markdown',
      severity: ['low', 'medium', 'high', 'critical'],
      category: [],
      fields: ['prompt', 'response'],
      maxObjects: undefined,
      maxDepth: 4,
      scanEntireObject: false,
      ndjsonMode: false,
      streamingThreshold: 1000,
      quiet: false,
      verbose: false,
      debug: false,
      ...config,
    };

    return new ScanRequest(input, defaultConfig);
  }
}
