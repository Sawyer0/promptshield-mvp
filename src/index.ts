/**
 * PromptShield - ESLint for AI Safety
 * Main entry point for programmatic API
 */

// Core exports (environment-agnostic)
export {
  // Types
  ViolationNode,
  ScanResult,
  Rule,
  RulePack,
  CompiledStrategy,
  EngineConfig,
  Severity,
  ViolationType,
  RuleType,
  IFileReader,
  IReporter,

  // Errors
  ConfigurationError,
  SchemaValidationError,
  RuleCompilationError,
} from './core/types.js';

export {
  // Compiler
  compileRule,
  compileRulePack,
  compileRulePacks,
} from './core/compiler.js';

export {
  // Engine
  RuleEngine,
} from './core/engine.js';

// Node.js adapter exports
export { NodeFileReader } from './adapters/fs-loader.js';

export { Scanner, ScannerOptions } from './adapters/scanner.js';

export { NodeReporter } from './adapters/reporter.js';
