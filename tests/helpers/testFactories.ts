/**
 * Test factories for creating test data
 */

import { Rule } from '../../src/domains/rules/core/entities/Rule';
import { RulePack } from '../../src/domains/rules/core/entities/RulePack';
import { Violation } from '../../src/shared/types/Violation';
import { ScanConfig } from '../../src/shared/types/ScanConfig';
import { ScanMetrics } from '../../src/shared/types/ScanMetrics';
import { ScanRequest } from '../../src/domains/scanning/core/entities/ScanRequest';
import { ScanContext } from '../../src/domains/scanning/core/entities/ScanContext';
import {
  ValidationResult,
  ValidationError,
} from '../../src/domains/validation/core/entities/ValidationResult';

/**
 * Rule factory
 */
export const createRule = (
  overrides: {
    id?: string;
    description?: string;
    matchRegex?: string[];
    matchKeywords?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?:
      | 'pii'
      | 'bias'
      | 'hallucination'
      | 'security'
      | 'compliance'
      | 'parse'
      | 'internal'
      | 'custom';
    enabled?: boolean;
    caseSensitive?: boolean;
  } = {}
): Rule => {
  return new Rule(
    overrides.id || 'test-rule',
    overrides.description || 'Test rule description',
    overrides.matchRegex || ['test'],
    overrides.matchKeywords || ['test'],
    overrides.severity || 'medium',
    overrides.category || 'custom',
    overrides.enabled !== undefined ? overrides.enabled : true,
    overrides.caseSensitive || false
  );
};

/**
 * RulePack factory
 */
export const createRulePack = (
  overrides: {
    name?: string;
    description?: string;
    rules?: Rule[];
    version?: string;
    lastUpdated?: Date;
  } = {}
): RulePack => {
  const rules = overrides.rules || [createRule()];
  return new RulePack(
    overrides.name || 'Test RulePack',
    overrides.description || 'Test RulePack description',
    rules,
    overrides.version || '1.0.0',
    overrides.lastUpdated || new Date()
  );
};

/**
 * Violation factory
 */
export const createViolation = (overrides?: Partial<Violation>): Violation => ({
  ruleId: 'test-rule',
  ruleName: 'Test Rule',
  ruleDescription: 'Test rule description',
  severity: 'medium',
  category: 'custom',
  message: 'Test violation message',
  field: 'content',
  objectIndex: 0,
  position: {
    start: 0,
    end: 10,
    line: 1,
    column: 1,
  },
  context: {
    before: '',
    match: 'test match',
    after: '',
  },
  metadata: {
    pattern: 'test',
    confidence: 1,
    tags: [],
  },
  ...overrides,
});

/**
 * ScanConfig factory
 */
export const createScanConfig = (
  overrides?: Partial<ScanConfig>
): ScanConfig => ({
  rulepack: 'test-rulepack.yaml',
  outputFormat: 'json',
  outputFile: undefined,
  severity: [],
  category: [],
  maxViolations: 100,
  fields: ['prompt', 'response'],
  scanEntireObject: false,
  maxObjects: 1000,
  maxDepth: 4,
  ndjsonMode: false,
  streamingThreshold: 1000,
  quiet: false,
  verbose: false,
  debug: false,
  noColor: false,
  failOn: undefined,
  ...overrides,
});

/**
 * ScanMetrics factory
 */
export const createScanMetrics = (
  overrides?: Partial<ScanMetrics>
): ScanMetrics => ({
  objectsScanned: 10,
  processingTime: 100,
  memoryUsage: 1024 * 1024,
  rulesApplied: 5,
  streamingUsed: false,
  ...overrides,
});

/**
 * Alias for backward compatibility
 */
export const createMetrics = createScanMetrics;

/**
 * ScanRequest factory
 */
export const createScanRequest = (
  input?: string,
  config?: ScanConfig
): ScanRequest => {
  const defaultInput = input || 'test input content';
  const defaultConfig = config || createScanConfig();
  return new ScanRequest(defaultInput, defaultConfig);
};

/**
 * ScanContext factory
 */
export const createScanContext = (
  config?: Partial<ScanConfig>,
  rulePack?: RulePack
): ScanContext => {
  return new ScanContext(
    createScanConfig(config),
    rulePack || createRulePack()
  );
};

/**
 * ValidationError factory
 */
export const createValidationError = (
  overrides?: Partial<ValidationError>
): ValidationError => ({
  field: 'test-field',
  message: 'Test error message',
  code: 'TEST_ERROR',
  severity: 'error',
  line: undefined,
  column: undefined,
  ...overrides,
});

/**
 * ValidationResult factory
 */
export const createValidationResult = (
  overrides?: Partial<ValidationResult>
): ValidationResult => ({
  isValid: true,
  errors: [],
  warnings: [],
  target: 'test-target',
  validationType: 'rulepack',
  ...overrides,
});
