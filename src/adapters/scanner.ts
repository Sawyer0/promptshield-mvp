/**
 * Scanner Adapter - Orchestrates file loading and rule engine execution
 * Uses Node.js adapters to load files and coordinate scanning operations
 */

import { glob } from 'glob';
import { RuleEngine } from '../core/engine';
import { ScanResult, RulePack, ConfigurationError } from '../core/types';
import { compileRulePacks } from '../core/compiler';
import {
  BUNDLED_RULEPACKS_DIR,
  resolveRulePackPath,
} from '../shared/packageResources';
import { NodeFileReader } from './fs-loader';

/**
 * Options for the scanner
 */
export interface ScannerOptions {
  /**
   * A RulePack YAML file, a directory of them, or a bundled pack name
   * (prompt-injection, pii, bias, hallucination). Default: every bundled pack.
   */
  rulesPath?: string;

  /** Maximum violations to report per file */
  maxViolations?: number;

  /** Context length to capture around violations */
  contextLength?: number;

  /** Whether to compute line/column positions */
  computeLineNumbers?: boolean;

  /** File patterns to include (glob patterns) */
  include?: string[];

  /** File patterns to exclude (glob patterns) */
  exclude?: string[];
}

/**
 * High-performance scanner that orchestrates file loading and rule engine
 */
export class Scanner {
  private fileReader: NodeFileReader;
  private engine: RuleEngine | null = null;
  private options: ScannerOptions;

  constructor(options: ScannerOptions = {}) {
    this.fileReader = new NodeFileReader();
    this.options = {
      rulesPath: BUNDLED_RULEPACKS_DIR,
      maxViolations: undefined,
      contextLength: 50,
      computeLineNumbers: true,
      include: ['**/*.txt', '**/*.md', '**/*.json'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      ...options,
    };
  }

  /**
   * Initialize the scanner by loading and compiling rules
   * @throws ConfigurationError if rules cannot be loaded
   */
  async initialize(): Promise<void> {
    if (!this.options.rulesPath) {
      throw new ConfigurationError('Rules path not specified');
    }

    const rulesPath =
      resolveRulePackPath(this.options.rulesPath) ?? this.options.rulesPath;

    try {
      const isFile = rulesPath.endsWith('.yaml') || rulesPath.endsWith('.yml');

      let rulePacks: RulePack[];

      if (isFile) {
        // Load single rulepack
        const pack = await this.fileReader.loadRulePack(rulesPath);
        rulePacks = [pack];
      } else {
        // Load all rulepacks from directory
        rulePacks = await this.fileReader.loadRulePacksFromDirectory(rulesPath);
      }

      if (rulePacks.length === 0) {
        throw new ConfigurationError('No rulepacks found');
      }

      const rules = compileRulePacks(rulePacks);

      if (rules.length === 0) {
        throw new ConfigurationError('No enabled rules found in rulepacks');
      }

      // Create rule engine
      this.engine = new RuleEngine(rules, {
        maxViolations: this.options.maxViolations,
        contextLength: this.options.contextLength,
        computeLineNumbers: this.options.computeLineNumbers,
      });
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `Failed to initialize scanner: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Scan a single file
   * @param filePath - Path to the file to scan
   * @returns Scan result with violations
   * @throws Error if engine is not initialized
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    if (!this.engine) {
      throw new Error('Scanner not initialized. Call initialize() first.');
    }

    const content = await this.fileReader.readFile(filePath);
    return this.engine.scan(content, { filePath });
  }

  /**
   * Scan multiple files concurrently
   * @param filePaths - Array of file paths to scan
   * @returns Map of file paths to scan results
   */
  async scanFiles(filePaths: string[]): Promise<Map<string, ScanResult>> {
    if (!this.engine) {
      throw new Error('Scanner not initialized. Call initialize() first.');
    }

    // Read all files concurrently
    const contents = await this.fileReader.readFiles(filePaths);

    // Scan each file
    const results = new Map<string, ScanResult>();

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const content = contents[i];
      const result = this.engine.scan(content, { filePath });
      results.set(filePath, result);
    }

    return results;
  }

  /**
   * Scan files matching glob patterns
   * @param patterns - Glob patterns to match (default: the include option)
   * @returns Map of file paths to scan results
   */
  async scanGlob(
    patterns: string | string[] = this.options.include ?? []
  ): Promise<Map<string, ScanResult>> {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    // Find all matching files
    const files = await glob(patternArray, {
      ignore: this.options.exclude,
      absolute: true,
      nodir: true,
    });

    if (files.length === 0) {
      return new Map();
    }

    return this.scanFiles(files);
  }

  /**
   * Scan text directly (without file I/O)
   * Useful for testing or programmatic use
   * @param text - Text to scan
   * @param metadata - Optional metadata to attach
   * @returns Scan result
   */
  async scanText(
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<ScanResult> {
    if (!this.engine) {
      throw new Error('Scanner not initialized. Call initialize() first.');
    }

    return this.engine.scan(text, metadata);
  }

  /**
   * Get statistics about the scanner
   * @returns Object with scanner stats
   */
  getStats(): { ruleCount: number; options: ScannerOptions } {
    return {
      ruleCount: this.engine?.getRuleCount() ?? 0,
      options: this.options,
    };
  }
}
