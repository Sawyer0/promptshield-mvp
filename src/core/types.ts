/**
 * Core domain models and interfaces for PromptShield
 * These types are environment-agnostic and can be used in any JavaScript runtime
 */

/**
 * Severity levels for rule violations
 */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Violation category types
 */
export type ViolationType = 'pii' | 'bias' | 'hallucination' | 'other';

/**
 * Rule matching strategy types
 */
export type RuleType = 'regex' | 'keyword' | 'custom';

/**
 * AST-like metadata node for a detected violation
 * Non-destructive: contains exact position and context without modifying original text
 */
export interface ViolationNode {
  /** Unique identifier for the rule that triggered this violation */
  ruleId: string;

  /** Human-readable name of the rule */
  ruleName: string;

  /** Category of the violation */
  type: ViolationType;

  /** Severity level of the violation */
  severity: Severity;

  /** Zero-indexed character offset where the match starts */
  start: number;

  /** Zero-indexed character offset where the match ends (exclusive) */
  end: number;

  /** The actual text that matched the rule */
  matchText: string;

  /** Surrounding text context for reporting (e.g., ±50 chars) */
  context: string;

  /** Human-readable message describing the violation */
  message: string;

  /** Optional suggestion for fixing the violation */
  suggestion?: string;

  /** Tags for categorization and filtering */
  tags: string[];

  /** Line number where the violation occurs (1-indexed, computed by adapters) */
  line?: number;

  /** Column number where the violation occurs (1-indexed, computed by adapters) */
  column?: number;
}

/**
 * Result of scanning a single text input
 */
export interface ScanResult {
  /** The original text that was scanned */
  text: string;

  /** Array of violations found in the text */
  violations: ViolationNode[];

  /** Total number of violations found */
  violationCount: number;

  /** Timestamp when the scan was performed */
  timestamp: Date;

  /** Optional metadata about the scan source */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for a single rule
 */
export interface Rule {
  /** Unique identifier for the rule */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what the rule detects */
  description: string;

  /** Severity level */
  severity: Severity;

  /** Whether the rule is enabled */
  enabled: boolean;

  /** Type of matching strategy */
  type: RuleType;

  /** Pattern for regex or keyword rules */
  pattern?: string;

  /** Message template (supports {match} placeholder) */
  message: string;

  /** Tags for categorization */
  tags: string[];

  /** Optional suggestion for remediation */
  suggestion?: string;

  /** Optional custom validation function */
  validator?: (text: string, match: string) => boolean;
}

/**
 * A collection of related rules (loaded from a YAML file)
 */
export interface RulePack {
  /** Schema version for the rulepack format */
  schema_version: string;

  /** Version of this specific rulepack */
  version: string;

  /** Last updated date */
  last_updated: string;

  /** Human-readable name */
  name: string;

  /** Description of the rulepack's purpose */
  description: string;

  /** Array of rules in this pack */
  rules: Rule[];
}

/**
 * Compiled regex strategy for optimized matching
 */
export interface CompiledRegexStrategy {
  /** The rule this strategy is for */
  rule: Rule;

  /** Pre-compiled RegExp with global flag for finding all matches */
  regex: RegExp;

  /** Violation type derived from rule tags */
  violationType: ViolationType;
}

/**
 * Compiled keyword strategy for optimized matching
 */
export interface CompiledKeywordStrategy {
  /** The rule this strategy is for */
  rule: Rule;

  /** Normalized keywords to search for */
  keywords: string[];

  /** Whether matching should be case-sensitive */
  caseSensitive: boolean;

  /** Violation type derived from rule tags */
  violationType: ViolationType;
}

/**
 * Union type of all compiled strategies
 */
export type CompiledStrategy = CompiledRegexStrategy | CompiledKeywordStrategy;

/**
 * Configuration for the rule engine
 */
export interface EngineConfig {
  /** Maximum context length to capture around violations (default: 100 chars) */
  contextLength?: number;

  /** Whether to compute line/column positions (adds overhead) */
  computeLineNumbers?: boolean;

  /** Maximum violations to report (default: unlimited) */
  maxViolations?: number;
}

/**
 * Interface for file reading operations (implemented by adapters)
 */
export interface IFileReader {
  /**
   * Read a single file as text
   * @param path - Path to the file
   * @returns Promise resolving to file content
   */
  readFile(path: string): Promise<string>;

  /**
   * Read multiple files concurrently
   * @param paths - Array of file paths
   * @returns Promise resolving to array of file contents
   */
  readFiles(paths: string[]): Promise<string[]>;

  /**
   * Load and parse a YAML rulepack file
   * @param path - Path to the YAML file
   * @returns Promise resolving to parsed RulePack
   */
  loadRulePack(path: string): Promise<RulePack>;

  /**
   * Check if a file exists
   * @param path - Path to check
   * @returns Promise resolving to boolean
   */
  exists(path: string): Promise<boolean>;
}

/**
 * Interface for reporting scan results (implemented by adapters)
 */
export interface IReporter {
  /**
   * Report scan results for a single file
   * @param filePath - Path to the scanned file
   * @param result - Scan result containing violations
   */
  reportFile(filePath: string, result: ScanResult): void;

  /**
   * Report aggregated results for multiple files
   * @param results - Map of file paths to scan results
   */
  reportSummary(results: Map<string, ScanResult>): void;

  /**
   * Export results in a specific format
   * @param results - Map of file paths to scan results
   * @param format - Output format (json, text, etc.)
   * @returns Formatted output string
   */
  export(results: Map<string, ScanResult>, format: string): string;
}

/**
 * Custom error types for domain-specific errors
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

export class RuleCompilationError extends Error {
  constructor(
    message: string,
    public ruleId?: string
  ) {
    super(message);
    this.name = 'RuleCompilationError';
  }
}
