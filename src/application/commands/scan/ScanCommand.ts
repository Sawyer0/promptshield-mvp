import { ScanConfig, OutputFormat } from '../../../shared/types/ScanConfig';

/**
 * Scan command data transfer object
 */
export class ScanCommand {
  constructor(
    public readonly input: string,
    public readonly options: ScanCommandOptions,
    public readonly isRawContent: boolean = false
  ) {}

  /**
   * Converts command options to scan configuration
   */
  toScanConfig(): ScanConfig {
    return {
      rulepack: this.options.rulepack || '',
      outputFormat: (this.options.output || 'markdown') as OutputFormat,
      outputFile: this.options.outputFile,

      // Filtering
      severity: this.parseSeverity(this.options.severity),
      category: this.parseCategory(this.options.category),
      maxViolations: this.options.maxViolations,
      offset: this.options.offset,
      limit: this.options.limit,

      // Processing
      fields: this.parseFields(this.options.fields),
      scanEntireObject: this.options.scanEntireObject || false,
      maxObjects: this.options.maxObjects,
      maxDepth: this.options.maxDepth || 4,
      schema: this.options.schema,

      // Performance
      ndjsonMode: this.options.ndjson || false,
      streamingThreshold: this.options.streamingThreshold || 1000,
      parallel: this.parseParallel(this.options.parallel),
      batchSize: this.options.batchSize || 10,
      timeout: this.options.timeout || 300,
      memoryWarningThreshold: this.options.memoryWarningThreshold || 0.8,

      // Compression
      compress: this.options.compress,
      compressionLevel: this.options.compressionLevel,

      // Output control
      quiet: this.options.quiet || false,
      verbose: this.options.verbose || false,
      debug: this.options.debug || false,
      // commander maps --no-color to `color: false`
      noColor: this.options.noColor ?? this.options.color === false,
      strict: this.options.strict || false,
      failOn: this.options.failOn,
    };
  }

  private parseSeverity(severity?: string): string[] {
    if (!severity) return ['low', 'medium', 'high', 'critical'];
    return severity.split(',').map((s) => s.trim());
  }

  private parseCategory(category?: string): string[] {
    if (!category) return [];
    return category.split(',').map((c) => c.trim());
  }

  private parseFields(fields?: string): string[] {
    if (!fields) return ['prompt', 'response', 'content'];
    return fields.split(',').map((f) => f.trim());
  }

  private parseParallel(parallel?: boolean | string): boolean | number {
    if (parallel === false || parallel === undefined) return false;
    if (parallel === true) return true;
    const num = parseInt(parallel, 10);
    return isNaN(num) ? true : num;
  }
}

/**
 * Scan command options from CLI
 */
export interface ScanCommandOptions {
  // Core options
  rulepack?: string;
  output?: string;
  outputFile?: string;

  // Filtering
  severity?: string;
  category?: string;
  maxViolations?: number;
  offset?: number;
  limit?: number;

  // Processing
  fields?: string;
  scanEntireObject?: boolean;
  maxObjects?: number;
  maxDepth?: number;
  schema?: string;

  // Performance
  ndjson?: boolean;
  streamingThreshold?: number;
  parallel?: boolean | string;
  batchSize?: number;
  timeout?: number;
  memoryWarningThreshold?: number;

  // Compression
  compress?: 'gzip' | 'deflate';
  compressionLevel?: number;

  // Output control
  quiet?: boolean;
  verbose?: boolean;
  debug?: boolean;
  noColor?: boolean;
  color?: boolean;
  strict?: boolean;
  failOn?: string;
}
