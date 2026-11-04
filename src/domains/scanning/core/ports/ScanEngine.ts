import { Result } from '../../../../shared/types/Result';
import { ScanRequest } from '../entities/ScanRequest';
import { ScanResult } from '../entities/ScanResult';
import { ScanContext } from '../entities/ScanContext';

/**
 * Interface for the core scan engine
 */
export interface ScanEngine {
  scan(request: ScanRequest): Promise<Result<ScanResult, Error>>;

  validateRequest(request: ScanRequest): Result<void, Error>;

  createContext(request: ScanRequest): Promise<Result<ScanContext, Error>>;
}

/**
 * Interface for scan strategy
 */
export interface ScanStrategy {
  shouldUseStreaming(contentSize: number, threshold: number): boolean;
}

export interface ScanOrchestrator {
  orchestrate(
    context: ScanContext,
    content: string
  ): Promise<Result<ScanResult, Error>>;
}

export interface ScanMetricsCollector {
  start(): void;

  recordProcessing(itemsProcessed: number): void;

  end(): {
    objectsScanned: number;
    processingTime: number;
    memoryUsage: number;
    rulesApplied: number;
    streamingUsed: boolean;
  };
}
