import {
  ScanEngine,
  ScanOrchestrator as IScanOrchestrator,
  ScanStrategy,
  ScanMetricsCollector,
} from '../ports/ScanEngine';
import { FileReader } from '../ports/FileReader';
import { ContentProcessor, ProcessedContent } from '../ports/ContentProcessor';
import { Result, ok, err } from '../../../../shared/types/Result';
import { ScanRequest } from '../entities/ScanRequest';
import { ScanResult } from '../entities/ScanResult';
import { ScanContext } from '../entities/ScanContext';
import { RuleEngine } from '../../../rules/core/ports/RuleEngine';
import { Violation } from '../../../../shared/types/Violation';
import { ScanMetrics } from '../../../../shared/types/ScanMetrics';

const NDJSON_EXTENSION = /\.(ndjson|jsonl)$/i;

/**
 * Main orchestrator for scan operations
 */
export class DefaultScanOrchestrator implements IScanOrchestrator, ScanEngine {
  constructor(
    private fileReader: FileReader,
    private processors: Map<string, ContentProcessor>,
    private ruleEngine: RuleEngine,
    private strategy: ScanStrategy,
    private metricsCollector: ScanMetricsCollector
  ) {}

  async scan(request: ScanRequest): Promise<Result<ScanResult, Error>> {
    const validationResult = this.validateRequest(request);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    const contextResult = await this.createContext(request);
    if (contextResult.isErr()) {
      return err(contextResult.error);
    }

    const scanResult = await this.orchestrate(
      contextResult.value,
      request.input
    );
    return scanResult;
  }

  validateRequest(request: ScanRequest): Result<void, Error> {
    if (!request.input || request.input.trim() === '') {
      return err(new Error('Input is required'));
    }

    if (!request.config) {
      return err(new Error('Configuration is required'));
    }

    return ok(undefined);
  }

  async createContext(
    request: ScanRequest
  ): Promise<Result<ScanContext, Error>> {
    try {
      const rulePackResult = await this.ruleEngine.loadRulePack(
        request.config.rulepack
      );
      if (rulePackResult.isErr()) {
        return err(rulePackResult.error);
      }

      const context = new ScanContext(request.config, rulePackResult.value);

      return ok(context);
    } catch (error) {
      return err(new Error(`Failed to create scan context: ${error}`));
    }
  }

  async orchestrate(
    context: ScanContext,
    input: string
  ): Promise<Result<ScanResult, Error>> {
    this.metricsCollector.start();

    try {
      const isFile = await this.fileReader.exists(input);
      const isDir = await this.fileReader.isDirectory(input);

      if (isDir) {
        return this.scanDirectory(context, input);
      } else if (isFile) {
        return this.scanFile(context, input);
      } else {
        return this.scanContent(context, input, 'direct');
      }
    } catch (error) {
      return err(new Error(`Scan orchestration failed: ${error}`));
    }
  }

  private async scanDirectory(
    context: ScanContext,
    dirPath: string
  ): Promise<Result<ScanResult, Error>> {
    const filesResult = await this.fileReader.listFiles(dirPath);
    if (filesResult.isErr()) {
      return err(filesResult.error);
    }

    const allViolations: Violation[] = [];
    let totalObjects = 0;

    // Process files concurrently in batches to avoid EMFILE errors
    const CONCURRENCY_LIMIT = 20;
    const files = filesResult.value;

    for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
      const chunk = files.slice(i, i + CONCURRENCY_LIMIT);

      // Process chunk in parallel
      const chunkResults = await Promise.allSettled(
        chunk.map((filePath) => this.scanFile(context, filePath))
      );

      // Aggregate results
      for (const result of chunkResults) {
        if (result.status === 'fulfilled' && result.value.isOk()) {
          allViolations.push(...result.value.value.violations);
          totalObjects += result.value.value.metrics.objectsScanned;
        } else if (result.status === 'rejected') {
          console.error('File scan failed:', result.reason);
        } else if (result.status === 'fulfilled' && result.value.isErr()) {
          console.error('File scan error:', result.value.error);
        }
      }
    }

    const baseMetrics = this.metricsCollector.end();
    const metrics: ScanMetrics = {
      ...baseMetrics,
      objectsScanned: totalObjects,
      streamingUsed: false,
    };

    return ok(new ScanResult(allViolations, metrics));
  }

  private async scanFile(
    baseContext: ScanContext,
    filePath: string
  ): Promise<Result<ScanResult, Error>> {
    // .ndjson/.jsonl files are line-delimited even without --ndjson
    const context =
      NDJSON_EXTENSION.test(filePath) && !baseContext.isNdjsonMode()
        ? new ScanContext(
            { ...baseContext.config, ndjsonMode: true },
            baseContext.rulePack,
            baseContext.startTime
          )
        : baseContext;

    const contentResult = await this.fileReader.readFile(filePath);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    const sizeResult = await this.fileReader.getFileSize(filePath);
    const fileSize = sizeResult.isOk() ? sizeResult.value : 0;

    const processor = this.findProcessor(filePath);
    if (!processor) {
      return err(new Error(`No processor found for file: ${filePath}`));
    }

    const useStreaming = this.strategy.shouldUseStreaming(
      fileSize,
      context.getStreamingThreshold()
    );

    if (useStreaming && 'processStream' in processor) {
      return this.scanWithStreaming(
        context,
        contentResult.value,
        processor as ContentProcessor & {
          processStream: (
            content: string,
            context: ScanContext,
            callback: (item: ProcessedContent) => Promise<void>
          ) => Promise<Result<void, Error>>;
        }
      );
    } else {
      return this.scanContent(context, contentResult.value, filePath);
    }
  }

  private async scanContent(
    context: ScanContext,
    content: string,
    source: string
  ): Promise<Result<ScanResult, Error>> {
    const processor = this.findProcessor(source) || this.processors.get('text');
    if (!processor) {
      return err(new Error(`No processor found for content`));
    }

    const processedResult = await processor.process(content, context);
    if (processedResult.isErr()) {
      return err(processedResult.error);
    }

    const violations: Violation[] = [];
    const enabledRules = context.rulePack.getEnabledRules();

    for (const item of processedResult.value) {
      const itemViolations = await this.ruleEngine.applyRules(
        item.fields,
        enabledRules,
        item.metadata
      );

      if (itemViolations.isOk()) {
        violations.push(...itemViolations.value);
      }
    }

    const baseMetrics = this.metricsCollector.end();
    const metrics: ScanMetrics = {
      ...baseMetrics,
      objectsScanned: processedResult.value.length,
      rulesApplied: enabledRules.length,
      streamingUsed: false,
    };

    return ok(new ScanResult(violations, metrics));
  }

  private async scanWithStreaming(
    context: ScanContext,
    content: string,
    processor: ContentProcessor & {
      processStream: (
        content: string,
        context: ScanContext,
        callback: (item: ProcessedContent) => Promise<void>
      ) => Promise<Result<void, Error>>;
    }
  ): Promise<Result<ScanResult, Error>> {
    const violations: Violation[] = [];
    const enabledRules = context.rulePack.getEnabledRules();
    let itemCount = 0;

    const result = await processor.processStream(
      content,
      context,
      async (item: ProcessedContent) => {
        const itemViolations = await this.ruleEngine.applyRules(
          item.fields,
          enabledRules,
          item.metadata
        );

        if (itemViolations.isOk()) {
          violations.push(...itemViolations.value);
        }

        itemCount++;
        this.metricsCollector.recordProcessing(itemCount);
      }
    );

    if (result.isErr()) {
      return err(result.error);
    }

    const baseMetrics = this.metricsCollector.end();
    const metrics: ScanMetrics = {
      ...baseMetrics,
      objectsScanned: itemCount,
      rulesApplied: enabledRules.length,
      streamingUsed: true,
    };

    return ok(new ScanResult(violations, metrics));
  }

  private findProcessor(filePath: string): ContentProcessor | undefined {
    for (const [, processor] of this.processors) {
      if (processor.canProcess(filePath)) {
        return processor;
      }
    }
    return undefined;
  }
}
