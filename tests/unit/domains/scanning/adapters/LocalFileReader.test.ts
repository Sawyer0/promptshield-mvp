import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { LocalFileReader } from '../../../../../src/domains/scanning/adapters/LocalFileReader';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LocalFileReader', () => {
  let fileReader: LocalFileReader;
  let tempDir: string;

  beforeEach(() => {
    fileReader = new LocalFileReader();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptshield-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('readFile', () => {
    test('should read text file successfully', async () => {
      const content = 'Hello, World!';
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });

    test('should read JSON file successfully', async () => {
      const content = '{"name": "test", "value": 42}';
      const filePath = path.join(tempDir, 'test.json');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });

    test('should read YAML file successfully', async () => {
      const content = 'name: test\nvalue: 42';
      const filePath = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });

    test('should handle empty files', async () => {
      const filePath = path.join(tempDir, 'empty.txt');
      fs.writeFileSync(filePath, '', 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('');
      }
    });

    test('should handle files with special characters', async () => {
      const content =
        'Special chars: äöüñéèà\nTabs:\t\t\t\nQuotes: "Hello" \'World\'';
      const filePath = path.join(tempDir, 'special.txt');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });

    test('should handle large files', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      const filePath = path.join(tempDir, 'large.txt');
      fs.writeFileSync(filePath, largeContent, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(largeContent);
        expect(result.value.length).toBe(1024 * 1024);
      }
    });

    test('should handle files with special characters in name', async () => {
      const content = 'test content';
      const filePath = path.join(
        tempDir,
        'file with spaces & symbols (test).txt'
      );
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });
  });

  describe('error handling', () => {
    test('should handle non-existent file', async () => {
      const filePath = path.join(tempDir, 'does-not-exist.txt');

      const result = await fileReader.readFile(filePath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('ENOENT');
        expect(result.error.message).toContain('does-not-exist.txt');
      }
    });

    test('should handle permission denied', async () => {
      // Create a file and remove read permissions (Unix-like systems)
      const filePath = path.join(tempDir, 'no-permission.txt');
      fs.writeFileSync(filePath, 'content', 'utf8');

      try {
        fs.chmodSync(filePath, 0o000); // Remove all permissions

        const result = await fileReader.readFile(filePath);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('EACCES');
        }
      } finally {
        // Restore permissions for cleanup
        try {
          fs.chmodSync(filePath, 0o644);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    test('should handle directory instead of file', async () => {
      const dirPath = path.join(tempDir, 'subdirectory');
      fs.mkdirSync(dirPath);

      const result = await fileReader.readFile(dirPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('EISDIR');
      }
    });

    test('should handle invalid path characters', async () => {
      // Test with path containing null character (invalid on most systems)
      const invalidPath = path.join(tempDir, 'invalid\x00file.txt');

      const result = await fileReader.readFile(invalidPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBeDefined();
      }
    });

    test('should handle very long file paths', async () => {
      // Create a very long path that exceeds typical OS limits
      const longName = 'a'.repeat(300);
      const longPath = path.join(tempDir, longName + '.txt');

      const result = await fileReader.readFile(longPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBeDefined();
      }
    });
  });

  describe('path handling', () => {
    test('should handle relative paths', async () => {
      const content = 'relative path content';
      const filePath = path.join(tempDir, 'relative.txt');
      fs.writeFileSync(filePath, content, 'utf8');

      // Change to temp directory and use relative path
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        const result = await fileReader.readFile('./relative.txt');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(content);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    test('should handle absolute paths', async () => {
      const content = 'absolute path content';
      const filePath = path.join(tempDir, 'absolute.txt');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });

    test('should normalize path separators', async () => {
      const content = 'normalized path content';
      const filePath = path.join(tempDir, 'subdir', 'file.txt');
      const subdir = path.dirname(filePath);

      fs.mkdirSync(subdir, { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');

      // Use different path separator format
      const mixedPath = filePath.split(path.sep).join('/');
      const result = await fileReader.readFile(mixedPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });
  });

  describe('file types', () => {
    test('should read NDJSON files', async () => {
      const content = '{"line": 1}\n{"line": 2}\n{"line": 3}';
      const filePath = path.join(tempDir, 'data.ndjson');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });

    test('should read CSV files', async () => {
      const content = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
      const filePath = path.join(tempDir, 'data.csv');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });

    test('should read configuration files', async () => {
      const content = '[database]\nhost = localhost\nport = 5432';
      const filePath = path.join(tempDir, 'config.ini');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });

    test('should read files without extension', async () => {
      const content = 'File without extension';
      const filePath = path.join(tempDir, 'README');
      fs.writeFileSync(filePath, content, 'utf8');

      const result = await fileReader.readFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(content);
      }
    });
  });

  describe('performance', () => {
    test('should read multiple files efficiently', async () => {
      const files = [];
      const content = 'test content for performance test';

      // Create multiple test files
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(tempDir, `file${i}.txt`);
        fs.writeFileSync(filePath, `${content} ${i}`, 'utf8');
        files.push(filePath);
      }

      const startTime = Date.now();

      // Read all files
      const results = await Promise.all(
        files.map((file) => fileReader.readFile(file))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All should succeed
      results.forEach((result: any) => {
        expect(result.isOk()).toBe(true);
      });

      // Should complete within reasonable time (adjust based on system)
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle concurrent file reads', async () => {
      const content = 'concurrent test content';
      const filePath = path.join(tempDir, 'concurrent.txt');
      fs.writeFileSync(filePath, content, 'utf8');

      // Read the same file multiple times concurrently
      const promises = Array.from({ length: 10 }, () =>
        fileReader.readFile(filePath)
      );

      const results = await Promise.all(promises);

      // All should succeed with same content
      results.forEach((result: any) => {
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(content);
        }
      });
    });
  });
});
