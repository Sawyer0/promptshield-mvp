import { ReportService, Renderer } from '../ports/Renderer';
import { Report } from '../entities/Report';
import { Result, ok, err } from '../../../../shared/types/Result';
import { IFileSystem } from '../../../../shared/ports/FileSystem';
import { IPathUtils } from '../../../../shared/ports/PathUtils';

/**
 * Default implementation of ReportService
 */
export class ReportServiceImpl implements ReportService {
  private renderers: Map<string, Renderer>;

  constructor(
    renderers: Map<string, Renderer>,
    private fs: IFileSystem,
    private pathUtils: IPathUtils
  ) {
    this.renderers = renderers;
  }

  async generateReport(report: Report): Promise<Result<string, Error>> {
    const renderer = this.renderers.get(report.format);
    if (!renderer) {
      return err(new Error(`No renderer found for format: ${report.format}`));
    }

    try {
      const result = await renderer.render(report);
      return result;
    } catch (error) {
      return err(new Error(`Failed to generate report: ${error}`));
    }
  }

  async writeReport(
    report: Report,
    outputPath: string
  ): Promise<Result<void, Error>> {
    try {
      const contentResult = await this.generateReport(report);
      if (contentResult.isErr()) {
        return err(contentResult.error);
      }

      const dir = this.pathUtils.dirname(outputPath);
      const dirExists = await this.fs.exists(dir);
      if (!dirExists) {
        const mkdirResult = await this.fs.mkdir(dir, true);
        if (mkdirResult.isErr()) {
          return err(mkdirResult.error);
        }
      }

      // Write to file
      const writeResult = await this.fs.writeFile(
        outputPath,
        contentResult.value
      );
      if (writeResult.isErr()) {
        return err(writeResult.error);
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(`Failed to write report to ${outputPath}: ${error}`)
      );
    }
  }

  getAvailableFormats(): string[] {
    return Array.from(this.renderers.keys());
  }
}
