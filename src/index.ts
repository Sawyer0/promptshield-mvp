/**
 * PromptShield library API.
 *
 * Compile rules with compileRulePack(), scan text with RuleEngine, or scan
 * files with Scanner. Matching is shared with the promptshield CLI.
 */

export type {
  Category,
  CompiledRule,
  EngineConfig,
  IFileReader,
  IReporter,
  Rule,
  RulePack,
  ScanResult,
  Severity,
  ViolationNode,
} from './core/types';

export {
  ConfigurationError,
  RuleCompilationError,
  SchemaValidationError,
} from './core/types';

export {
  compileRule,
  compileRulePack,
  compileRulePacks,
} from './core/compiler';

export { RuleEngine } from './core/engine';

export { NodeFileReader } from './adapters/fs-loader';
export { NodeReporter } from './adapters/reporter';
export { Scanner } from './adapters/scanner';
export type { ScannerOptions } from './adapters/scanner';

export {
  BUNDLED_RULEPACKS,
  BUNDLED_RULEPACKS_DIR,
  PACKAGE_VERSION,
} from './shared/packageResources';
