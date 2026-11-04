/**
 * Public types for the PromptShield library API.
 *
 * Rule and RulePack mirror the RulePack YAML format the CLI reads, so a pack
 * loaded from disk or written inline in code behaves the same either way.
 */

/** Severity levels for rule violations. */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** Rule categories understood by the bundled RulePacks and the CLI. */
export type Category =
  | 'pii'
  | 'bias'
  | 'hallucination'
  | 'security'
  | 'compliance'
  | 'parse'
  | 'internal'
  | 'custom';

/** A single rule, in the same shape as a rule in a RulePack YAML file. */
export interface Rule {
  /** Unique identifier for the rule within its pack. */
  id: string;

  /** What the rule detects; used as the violation message. */
  description: string;

  /** Regular expressions to match (JavaScript syntax). */
  match_regex?: string[];

  /** Keywords to match as whole words. */
  match_keywords?: string[];

  /** Defaults to 'medium'. */
  severity?: Severity;

  /** Defaults to 'custom'. */
  category?: Category;

  /** Defaults to true. Disabled rules are skipped when compiling a pack. */
  enabled?: boolean;

  /** Defaults to false. */
  case_sensitive?: boolean;
}

/** A collection of rules, in the same shape as a RulePack YAML file. */
export interface RulePack {
  name: string;
  description: string;
  version?: string;
  last_updated?: string;
  rules: Rule[];
}

/**
 * A validated rule ready for the engine. Create one with compileRule() or
 * compileRulePack(); the fields are read-only metadata about the rule.
 */
export interface CompiledRule {
  readonly id: string;
  readonly description: string;
  readonly severity: Severity;
  readonly category: Category;
}

/** A detected violation. The scanned text is never modified. */
export interface ViolationNode {
  /** Identifier of the rule that matched. */
  ruleId: string;

  /** Display name of the rule (its id, as in CLI reports). */
  ruleName: string;

  /** The rule's description. */
  message: string;

  category: Category;
  severity: Severity;

  /** Zero-based offset where the match starts. */
  start: number;

  /** Zero-based offset where the match ends (exclusive). */
  end: number;

  /** 1-based line of the match start (omitted when computeLineNumbers is false). */
  line?: number;

  /** 1-based column of the match start (omitted when computeLineNumbers is false). */
  column?: number;

  /** The text that matched. */
  matchText: string;

  /** The match with up to contextLength characters on each side. */
  context: string;
}

/** Result of scanning one text. */
export interface ScanResult {
  /** The text that was scanned. */
  text: string;

  /** Violations ordered by position. */
  violations: ViolationNode[];

  violationCount: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Options for RuleEngine. */
export interface EngineConfig {
  /** Characters of context on each side of a match. Default: 50. */
  contextLength?: number;

  /** Include line and column on each violation. Default: true. */
  computeLineNumbers?: boolean;

  /** Stop after this many violations per scan. Default: unlimited. */
  maxViolations?: number;
}

/** File access used by the Scanner (implemented by NodeFileReader). */
export interface IFileReader {
  readFile(path: string): Promise<string>;
  readFiles(paths: string[]): Promise<string[]>;
  loadRulePack(path: string): Promise<RulePack>;
  exists(path: string): Promise<boolean>;
}

/** Output of scan results (implemented by NodeReporter). */
export interface IReporter {
  reportFile(filePath: string, result: ScanResult): void;
  reportSummary(results: Map<string, ScanResult>): void;
  export(results: Map<string, ScanResult>, format: string): string;
}

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
