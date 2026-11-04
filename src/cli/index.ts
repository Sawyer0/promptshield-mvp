#!/usr/bin/env node

import { Command } from 'commander';
import { Container } from '../infrastructure/container/Container';
import { setupContainer } from './bootstrap';
import {
  ScanCommand,
  ScanCommandOptions,
} from '../application/commands/scan/ScanCommand';
import { ScanCommandHandler } from '../application/commands/scan/ScanCommandHandler';
import { ListCommand } from '../application/commands/list/ListCommand';
import { ListCommandHandler } from '../application/commands/list/ListCommandHandler';
import { InitCommand } from '../application/commands/init/InitCommand';
import { InitCommandHandler } from '../application/commands/init/InitCommandHandler';
import {
  ValidateCommand,
  ValidateCommandOptions,
} from '../application/commands/validate/ValidateCommand';
import { ValidateCommandHandler } from '../application/commands/validate/ValidateCommandHandler';
import { LoggerFactory } from '../infrastructure/logging/Logger';
import {
  PACKAGE_VERSION,
  resolveRulePackPath,
} from '../shared/packageResources';

const program = new Command();
const container = new Container();
const logger = LoggerFactory.getLogger();

// Bootstrap the container with all dependencies
setupContainer(container);

program
  .name('promptshield')
  .description(
    'AI safety scanner for LLM outputs - detect prompt injections, PII leaks, and security issues'
  )
  .version(PACKAGE_VERSION);

// --- Scan Command ---
program
  .command('scan <input>')
  .description('Scan LLM outputs for safety violations using rulepacks')
  .option(
    '-r, --rulepack <path>',
    'RulePack YAML path or bundled name: prompt-injection, pii, bias, hallucination (required)'
  )
  .option(
    '-o, --output <format>',
    'Output format: json, markdown, csv, table, html, ndjson (default: markdown)'
  )
  .option('-f, --output-file <file>', 'Write report to file instead of stdout')

  // Filtering options
  .option(
    '--severity <levels>',
    'Filter by severity: low,medium,high,critical (comma-separated)'
  )
  .option(
    '--category <categories>',
    'Filter by categories: pii,bias,security,compliance (comma-separated)'
  )
  .option('--max-violations <number>', 'Maximum violations to report', parseInt)
  .option('--offset <number>', 'Pagination offset', parseInt)
  .option('--limit <number>', 'Pagination limit', parseInt)

  // Processing options
  .option('--fields <fields>', 'Fields to scan (default: prompt,response)')
  .option('--scan-entire-object', 'Also scan entire object as string')
  .option('--max-objects <number>', 'Maximum objects to process', parseInt)
  .option(
    '--max-depth <number>',
    'Max nested object depth (default: 4)',
    parseInt
  )

  // Performance options
  .option('--ndjson', 'Force NDJSON mode')
  .option(
    '--streaming-threshold <number>',
    'Threshold for streaming mode (default: 1000)',
    parseInt
  )

  // Output control
  .option('-q, --quiet', 'Suppress progress and summary')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--debug', 'Enable debug mode')
  .option('--no-color', 'Disable colored output')
  .option(
    '--fail-on <severity>',
    'Exit with code 1 if any violation is at or above this severity: low, medium, high, critical'
  )
  .action(async (input: string, options: ScanCommandOptions) => {
    try {
      // Handle stdin input
      let actualInput = input;
      let isRawContent = false;
      if (input === '-') {
        isRawContent = true;
        // Read from stdin
        actualInput = await new Promise<string>((resolve, reject) => {
          let data = '';
          process.stdin.setEncoding('utf8');
          process.stdin.on('readable', () => {
            let chunk;
            while (null !== (chunk = process.stdin.read())) {
              data += chunk;
            }
          });
          process.stdin.on('end', () => {
            resolve(data.trim());
          });
          process.stdin.on('error', reject);
        });
      }

      const command = new ScanCommand(
        actualInput,
        { ...options, rulepack: resolveRulePackPath(options.rulepack) },
        isRawContent
      );

      const commandLogger = options.quiet
        ? LoggerFactory.createQuietLogger()
        : LoggerFactory.create({
            level: options.debug ? 'DEBUG' : 'ERROR',
            options: { includeTimestamp: true },
          });

      const handler = new ScanCommandHandler(
        container.resolve('scanEngine'),
        container.resolve('reportService'),
        commandLogger
      );

      const result = await handler.execute(command);

      if (result.isErr()) {
        if (!options.quiet) {
          process.stderr.write(`Error: ${result.error.message}\n`);
        }
        process.exit(1);
      }
    } catch (error) {
      if (!options.quiet) {
        process.stderr.write(`Error: ${(error as Error).message}\n`);
      }
      process.exit(1);
    }
  });

// --- List Command ---
program
  .command('list')
  .description('List rules in a RulePack')
  .option(
    '-r, --rulepack <path>',
    'RulePack YAML path or bundled name: prompt-injection, pii, bias, hallucination (required)'
  )
  .option('--category <category>', 'Filter by category')
  .option('--severity <severity>', 'Filter by severity')
  .option('--enabled-only', 'Show only enabled rules')
  .action(
    async (options: {
      rulepack?: string;
      category?: string;
      severity?: string;
      enabledOnly?: boolean;
    }) => {
      try {
        const command = new ListCommand({
          ...options,
          rulepack: resolveRulePackPath(options.rulepack),
        });
        const handler =
          container.resolve<ListCommandHandler>('listCommandHandler');

        const result = await handler.execute(command);

        if (result.isErr()) {
          logger.error('List failed', result.error);
          process.exit(1);
        }
      } catch (error) {
        logger.error('Unexpected error', error as Error);
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    }
  );

// --- Init Command ---
program
  .command('init <filename>')
  .description('Initialize a new RulePack YAML file with example structure')
  .option('-n, --name <name>', 'RulePack name')
  .option('-d, --description <description>', 'RulePack description')
  .option('-t, --template <template>', 'Template to use: basic, pii, security')
  .option('--force', 'Overwrite existing file')
  .option('-v, --verbose', 'Show detailed information')
  .option('-q, --quiet', 'Suppress output messages')
  .action(
    async (
      filename: string,
      options: {
        name?: string;
        description?: string;
        template?: string;
        force?: boolean;
        verbose?: boolean;
        quiet?: boolean;
      }
    ) => {
      try {
        const command = new InitCommand(filename, options);
        const handler =
          container.resolve<InitCommandHandler>('initCommandHandler');

        const result = await handler.execute(command);

        if (result.isErr()) {
          logger.error('Init failed', result.error);
          process.exit(1);
        }
      } catch (error) {
        logger.error('Unexpected error', error as Error);
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    }
  );

// --- Validate Command ---
program
  .command('validate <target>')
  .description('Validate RulePacks and input files')
  .option('--strict', 'Enable strict validation mode')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--skip-warnings', 'Skip warnings in output')
  .option('--max-errors <number>', 'Maximum errors to report', parseInt)
  .option('--format <format>', 'Expected file format: json, ndjson, yaml, txt')
  .option(
    '--output <format>',
    'Output format: json, table, summary (default: table)'
  )
  .option('--batch', 'Enable batch validation mode')
  .action(async (target: string, options: ValidateCommandOptions) => {
    try {
      const command = new ValidateCommand(target, options);
      const handler = container.resolve<ValidateCommandHandler>(
        'validateCommandHandler'
      );

      const result = await handler.execute(command);

      if (result.isErr()) {
        logger.error('Validate failed', result.error);
        process.exit(1);
      }

      // Exit with error code if validation failed
      if (!result.value.isValid) {
        process.exit(1);
      }
    } catch (error) {
      logger.error('Unexpected error', error as Error);
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
