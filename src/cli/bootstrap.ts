import { Container } from '../infrastructure/container/Container';
import { ConfigManager } from '../infrastructure/config/ConfigManager';
import { LoggerFactory } from '../infrastructure/logging/Logger';
import { err } from '../shared/types/Result';

// Domain implementations
import { LocalFileReader } from '../domains/scanning/adapters/LocalFileReader';
import { JsonProcessor } from '../domains/scanning/adapters/processors/JsonProcessor';
import { TextProcessor } from '../domains/scanning/adapters/processors/TextProcessor';
import { DefaultScanOrchestrator } from '../domains/scanning/core/services/ScanOrchestrator';
import { YamlRuleRepository } from '../domains/rules/adapters/YamlRuleRepository';
import { DefaultRuleEngine } from '../domains/rules/core/services/RuleEngineImpl';
import { OptimizedRuleMatcher } from '../domains/rules/core/services/OptimizedRuleMatcher';
import { JsonRenderer } from '../domains/reporting/adapters/renderers/JsonRenderer';
import { MarkdownRenderer } from '../domains/reporting/adapters/renderers/MarkdownRenderer';
import { CsvRenderer } from '../domains/reporting/adapters/renderers/CsvRenderer';
import { HtmlRenderer } from '../domains/reporting/adapters/renderers/HtmlRenderer';
import { TableRenderer } from '../domains/reporting/adapters/renderers/TableRenderer';
import { NdjsonRenderer } from '../domains/reporting/adapters/renderers/NdjsonRenderer';
import { ReportServiceImpl } from '../domains/reporting/core/services/ReportServiceImpl';

// Infrastructure adapters
import { NodeFileSystem } from '../infrastructure/adapters/NodeFileSystem';
import { NodePathUtils } from '../infrastructure/adapters/NodePathUtils';

// Validation domain
import { DefaultValidationEngine } from '../domains/validation/core/services/ValidationEngineImpl';
import { RulePackValidatorImpl } from '../domains/validation/adapters/validators/RulePackValidatorImpl';
import { InputFileValidatorImpl } from '../domains/validation/adapters/validators/InputFileValidatorImpl';

// Application handlers
import { ScanCommandHandler } from '../application/commands/scan/ScanCommandHandler';
import { ValidateCommandHandler } from '../application/commands/validate/ValidateCommandHandler';
import { RulePack } from '../domains/rules/core/entities/RulePack';
import {
  Rule,
  RuleSeverity,
  RuleCategory,
} from '../domains/rules/core/entities/Rule';

/**
 * Sets up the dependency injection container
 */
export function setupContainer(container: Container): void {
  // Infrastructure
  container.register('configManager', ConfigManager.getInstance());
  container.register(
    'logger',
    LoggerFactory.create({
      level: process.env.LOG_LEVEL || 'WARN',
      options: {
        includeTimestamp: true,
        includeStackTrace: process.env.NODE_ENV === 'development',
      },
    })
  );

  // Platform adapters (Node.js implementations)
  container.register('fileSystem', new NodeFileSystem());
  container.register('pathUtils', new NodePathUtils());

  const configManager = container.resolve<ConfigManager>('configManager');
  configManager.loadFromEnvironment();

  // File system
  container.register('fileReader', new LocalFileReader());

  // Content processors
  const processors = new Map();
  processors.set('json', new JsonProcessor());
  processors.set('text', new TextProcessor());
  container.register('contentProcessors', processors);

  // Rule engine
  container.registerFactory(
    'ruleRepository',
    () => new YamlRuleRepository('rulepacks'),
    true
  );

  container.registerFactory(
    'ruleMatcher',
    () => new OptimizedRuleMatcher(),
    true
  );

  container.registerFactory(
    'ruleEngine',
    () =>
      new DefaultRuleEngine(
        container.resolve('ruleRepository'),
        container.resolve('ruleMatcher')
      ),
    true
  );

  // Scan engine
  container.registerFactory(
    'scanStrategy',
    () => ({
      shouldUseStreaming: (size: number, threshold: number) =>
        size > threshold * 1024 * 1024,
      shouldUseParallelProcessing: (
        count: number,
        context: { config: { parallel?: boolean }; getBatchSize: () => number }
      ) => context.config.parallel && count > context.getBatchSize(),
      getOptimalBatchSize: (
        count: number,
        context: { getBatchSize: () => number }
      ) => Math.min(context.getBatchSize(), Math.ceil(count / 4)),
    }),
    true
  );

  container.registerFactory('metricsCollector', () => {
    let startTime: number;
    let objectCount = 0;
    let memoryUsage = 0;
    let streamingUsed = false;

    return {
      start: () => {
        startTime = Date.now();
        objectCount = 0;
        memoryUsage = process.memoryUsage().heapUsed;
        streamingUsed = false;
      },
      recordProcessing: (items: number) => {
        objectCount = items;
        // In Node.js environment, we track peak heap usage
        memoryUsage = Math.max(memoryUsage, process.memoryUsage().heapUsed);
      },
      setStreamingUsed: (used: boolean) => {
        streamingUsed = used;
      },
      end: () => ({
        objectsScanned: objectCount,
        processingTime: Date.now() - startTime,
        memoryUsage: memoryUsage,
        rulesApplied: 0,
        streamingUsed: streamingUsed,
      }),
    };
  });

  container.registerFactory(
    'scanEngine',
    () =>
      new DefaultScanOrchestrator(
        container.resolve('fileReader'),
        container.resolve('contentProcessors'),
        container.resolve('ruleEngine'),
        container.resolve('scanStrategy'),
        container.resolve('metricsCollector')
      ),
    true
  );

  // Report renderers
  const renderers = new Map();
  renderers.set('json', new JsonRenderer());
  renderers.set('markdown', new MarkdownRenderer());
  renderers.set('csv', new CsvRenderer());
  renderers.set('html', new HtmlRenderer());
  renderers.set('table', new TableRenderer());
  renderers.set('ndjson', new NdjsonRenderer());
  container.register('renderers', renderers);

  // Report service
  container.registerFactory(
    'reportService',
    () =>
      new ReportServiceImpl(
        renderers,
        container.resolve('fileSystem'),
        container.resolve('pathUtils')
      ),
    true
  );

  // Validation engine
  container.registerFactory(
    'validationEngine',
    () => {
      const validationEngine = new DefaultValidationEngine(
        container.resolve('fileSystem'),
        container.resolve('pathUtils')
      );

      // Register validators
      validationEngine.registerValidator(
        'rulepack',
        new RulePackValidatorImpl()
      );
      validationEngine.registerValidator(
        'input-file',
        new InputFileValidatorImpl()
      );

      return validationEngine;
    },
    true
  );

  // Command handlers
  container.registerFactory(
    'scanCommandHandler',
    () =>
      new ScanCommandHandler(
        container.resolve('scanEngine'),
        container.resolve('reportService'),
        container.resolve('logger')
      ),
    true
  );

  container.registerFactory(
    'validateCommandHandler',
    () =>
      new ValidateCommandHandler(
        container.resolve('validationEngine'),
        container.resolve('logger')
      ),
    true
  );

  // List command handler
  container.registerFactory(
    'listCommandHandler',
    () => ({
      execute: async (command: {
        options: {
          rulepack?: string;
          category?: string;
          severity?: string;
          enabledOnly?: boolean;
        };
      }) => {
        const ruleEngine = container.resolve<DefaultRuleEngine>('ruleEngine');
        // Repository is available but not used in current implementation

        try {
          if (!command.options.rulepack) {
            return err(new Error('Rulepack path is required (use --rulepack)'));
          }

          const result = await ruleEngine.loadRulePack(
            command.options.rulepack
          );
          if (result.isErr()) return result;
          const rulepacks = [result.value];

          // Display rulepacks and rules
          for (const rulepack of rulepacks) {
            console.log(`\nRulePack: ${rulepack.name}`);
            console.log(`Description: ${rulepack.description}`);
            console.log(`Version: ${rulepack.version}`);
            console.log(`Rules: ${rulepack.rules.length}\n`);

            let rules = rulepack.rules;

            // Apply filters
            if (command.options.category) {
              rules = rules.filter(
                (r: { category: string }) =>
                  r.category === command.options.category
              );
            }
            if (command.options.severity) {
              rules = rules.filter(
                (r: { severity: string }) =>
                  r.severity === command.options.severity
              );
            }
            if (command.options.enabledOnly) {
              rules = rules.filter((r: { enabled: boolean }) => r.enabled);
            }

            for (const rule of rules) {
              console.log(`  - ${rule.id}: ${rule.description}`);
              console.log(
                `    Severity: ${rule.severity}, Category: ${rule.category}, Enabled: ${rule.enabled}`
              );
            }
          }

          return { isOk: (): boolean => true, isErr: (): boolean => false };
        } catch (error) {
          return { isErr: (): boolean => true, error };
        }
      },
    }),
    true
  );

  // Init command handler
  container.registerFactory(
    'initCommandHandler',
    () => ({
      execute: async (command: {
        filename: string;
        options: {
          name?: string;
          description?: string;
          template?: string;
          quiet?: boolean;
          verbose?: boolean;
        };
      }) => {
        const repository =
          container.resolve<YamlRuleRepository>('ruleRepository');

        try {
          let rulePack: RulePack;

          const templateName = command.options.template || 'basic';

          if (templateName === 'pii') {
            const rules = [
              new Rule(
                'email_addresses',
                'Detects email addresses in text',
                ['[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'],
                [],
                'high' as RuleSeverity,
                'pii' as RuleCategory,
                true,
                false
              ),
              new Rule(
                'phone_numbers',
                'Detects common phone number formats',
                [
                  '\\+?\\d{1,4}?[-.\\s]?\\(?\\d{1,3}?\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}',
                ],
                [],
                'medium' as RuleSeverity,
                'pii' as RuleCategory,
                true,
                false
              ),
            ];

            rulePack = new RulePack(
              command.options.name || 'PII Detection',
              command.options.description ||
                'RulePack for detecting personal identifying information',
              rules,
              '1.0.0',
              new Date()
            );
          } else if (templateName === 'security') {
            const rules = [
              new Rule(
                'prompt_injection',
                'Detects common prompt injection patterns',
                [
                  'ignore previous instructions',
                  'system prompt',
                  'you are now',
                  'instead of',
                ],
                [],
                'critical' as RuleSeverity,
                'security' as RuleCategory,
                true,
                false
              ),
            ];

            rulePack = new RulePack(
              command.options.name || 'Security Rules',
              command.options.description ||
                'RulePack for detecting security-related prompt attacks',
              rules,
              '1.0.0',
              new Date()
            );
          } else {
            // Default basic template
            const exampleRule = new Rule(
              'example_rule',
              'Example rule description',
              ['pattern\\d+'], // Example regex pattern
              ['keyword1', 'keyword2'], // Example keywords
              'medium' as RuleSeverity,
              'custom' as RuleCategory,
              true, // enabled
              false // case_sensitive
            );

            rulePack = new RulePack(
              command.options.name || 'My RulePack',
              command.options.description || 'Custom rules for prompt safety',
              [exampleRule],
              '1.0.0',
              new Date()
            );
          }

          const result = await repository.saveToYaml(
            command.filename,
            rulePack
          );

          if (result.isOk() && !command.options.quiet) {
            console.log(`\nCreated RulePack: ${command.filename}`);
            console.log('\nNext steps:');
            console.log('1. Edit the file to add your custom rules');
            console.log(
              '2. Validate it: promptshield validate --rulepack ' +
                command.filename
            );
            console.log(
              '3. Use it: promptshield scan <input> --rulepack ' +
                command.filename
            );

            if (command.options.verbose) {
              console.log('\nRulePack structure:');
              console.log('- name: Your rulepack name');
              console.log('- description: What this rulepack detects');
              console.log('- rules: Array of detection rules');
              console.log('  - id: Unique identifier');
              console.log('  - description: What this rule detects');
              console.log('  - match_regex: Array of regex patterns');
              console.log('  - match_keywords: Array of keywords to match');
              console.log('  - severity: low, medium, high, or critical');
              console.log('  - category: Rule category (e.g., pii, security)');
              console.log('  - enabled: true or false');
            }
          }

          return result;
        } catch (error) {
          return { isErr: (): boolean => true, error };
        }
      },
    }),
    true
  );
}
