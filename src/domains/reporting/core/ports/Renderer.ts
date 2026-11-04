import { Result } from '../../../../shared/types/Result';
import { Report } from '../entities/Report';

export interface Renderer {
  render(report: Report): Promise<Result<string, Error>>;

  getFormat(): string;

  supportsStreaming(): boolean;
}

export interface StreamingRenderer extends Renderer {
  renderStream(
    report: Report,
    onChunk: (chunk: string) => Promise<void>
  ): Promise<Result<void, Error>>;
}

export interface FileWriter {
  writeFile(
    path: string,
    content: string,
    options?: WriteOptions
  ): Promise<Result<void, Error>>;

  createWriteStream(
    path: string,
    options?: WriteOptions
  ): Result<NodeJS.WritableStream, Error>;
}

export interface WriteOptions {
  encoding?: BufferEncoding;
}

export interface ReportService {
  generateReport(report: Report): Promise<Result<string, Error>>;

  writeReport(report: Report, outputPath: string): Promise<Result<void, Error>>;

  getAvailableFormats(): string[];
}
