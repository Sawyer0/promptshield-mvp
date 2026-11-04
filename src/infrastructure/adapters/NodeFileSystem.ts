import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { IFileSystem } from '../../shared/ports/FileSystem';
import { Result, ok, err } from '../../shared/types/Result';

/**
 * Node.js implementation of the IFileSystem port
 */
export class NodeFileSystem implements IFileSystem {
  async exists(path: string): Promise<boolean> {
    try {
      await fsPromises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  async readFile(path: string): Promise<Result<string, Error>> {
    try {
      const content = await fsPromises.readFile(path, 'utf-8');
      return ok(content);
    } catch (error) {
      return err(new Error(`Failed to read file ${path}: ${error}`));
    }
  }

  async writeFile(path: string, content: string): Promise<Result<void, Error>> {
    try {
      await fsPromises.writeFile(path, content, 'utf-8');
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to write file ${path}: ${error}`));
    }
  }

  async mkdir(path: string, recursive: boolean): Promise<Result<void, Error>> {
    try {
      await fsPromises.mkdir(path, { recursive });
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to create directory ${path}: ${error}`));
    }
  }
}
