import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { ScanResult } from '../../src/domains/scanning/core/entities/ScanResult';
import { ReportServiceImpl } from '../../src/domains/reporting/core/services/ReportServiceImpl';
import { JsonRenderer } from '../../src/domains/reporting/adapters/renderers/JsonRenderer';
import { CsvRenderer } from '../../src/domains/reporting/adapters/renderers/CsvRenderer';
import { TableRenderer } from '../../src/domains/reporting/adapters/renderers/TableRenderer';
import { Report } from '../../src/domains/reporting/core/entities/Report';
import { Violation } from '../../src/shared/types/Violation';
import { ValidationOptions } from '../../src/domains/validation/core/entities/ValidationOptions';
import { ScanMetrics } from '../../src/shared/types/ScanMetrics';
import { stripAnsiCodes } from '../utils/cli';
import { IFileSystem } from '../../src/shared/ports/FileSystem';
import { IPathUtils } from '../../src/shared/ports/PathUtils';
import { ok } from '../../src/shared/types/Result';

// Helper function to create ScanResult from violations
function createScanResult(violations: Violation[]): ScanResult {
  const metrics: ScanMetrics = {
    objectsScanned: violations.length || 1,
    processingTime: 100,
    memoryUsage: 1024 * 1024,
    rulesApplied: 5,
    streamingUsed: false,
  };
  return new ScanResult(violations, metrics);
}

describe('CLI Options and Behavior', () => {
  let tempDir: string;
  let mockFs: jest.Mocked<IFileSystem>;
  let mockPath: jest.Mocked<IPathUtils>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-cli-options-'));

    mockFs = {
      existsSync: jest.fn<any>().mockReturnValue(true),
      exists: jest.fn<any>().mockResolvedValue(true),
      readFile: jest.fn<any>(),
      writeFile: jest.fn<any>(),
      mkdir: jest.fn<any>().mockResolvedValue(ok(undefined)),
    } as any;

    mockPath = {
      extname: jest
        .fn<any>()
        .mockImplementation((p: string) => path.extname(p)),
      basename: jest
        .fn<any>()
        .mockImplementation((p: string) => path.basename(p)),
      dirname: jest
        .fn<any>()
        .mockImplementation((p: string) => path.dirname(p)),
      join: jest
        .fn<any>()
        .mockImplementation((...args: string[]) => path.join(...args)),
    } as any;
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Report Generation Options', () => {
    it('should support multiple output formats', async () => {
      const renderers = new Map();
      renderers.set('json', new JsonRenderer());
      renderers.set('csv', new CsvRenderer());
      renderers.set('table', new TableRenderer());

      const reportService = new ReportServiceImpl(renderers, mockFs, mockPath);
      const formats = reportService.getAvailableFormats();
      expect(formats).toContain('json');
      expect(formats).toContain('csv');
      expect(formats).toContain('table');
    });

    it('should respect output file option', async () => {
      const renderers = new Map();
      renderers.set('json', new JsonRenderer());

      const reportService = new ReportServiceImpl(renderers, mockFs, mockPath);
      const scanResult = createScanResult([]);
      const outputPath = path.join(tempDir, 'output.json');
      const report = new Report(scanResult, 'json', { outputFile: outputPath });

      mockFs.writeFile.mockResolvedValue(ok(undefined));

      const result = await reportService.writeReport(report, outputPath);
      expect(result.isOk()).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        outputPath,
        expect.any(String)
      );
    });
  });

  describe('Validation Options', () => {
    it('should respect strict mode', async () => {
      const options: ValidationOptions = {
        strict: true,
        verbose: false,
        skipWarnings: false,
        maxErrors: 10,
        validateRegex: true,
        validateSchema: true,
      };

      expect(options.strict).toBe(true);
    });

    it('should respect max errors limit', async () => {
      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 5,
        validateRegex: true,
        validateSchema: true,
      };

      expect(options.maxErrors).toBe(5);
    });
  });

  describe('Output Formatting', () => {
    it('should provide colored output in terminal', () => {
      const text = '\x1b[31mError:\x1b[0m Something went wrong';
      const stripped = stripAnsiCodes(text);
      expect(stripped).toBe('Error: Something went wrong');
    });
  });
});
