import { describe, test, expect, beforeEach } from '@jest/globals';
import { InputFileValidatorImpl } from '../../../../../src/domains/validation/adapters/validators/InputFileValidatorImpl';
import { ValidationOptions } from '../../../../../src/domains/validation/core/entities/ValidationOptions';
import { createValidationResult } from '../../../../helpers/testFactories';
import * as fs from 'fs';
import * as path from 'path';

describe('InputFileValidatorImpl', () => {
  let validator: InputFileValidatorImpl;
  let tempDir: string;

  beforeEach(() => {
    validator = new InputFileValidatorImpl();
    tempDir = fs.mkdtempSync(
      path.join(require('os').tmpdir(), 'promptshield-test-')
    );
  });

  describe('supports', () => {
    test('should support JSON files', () => {
      const options = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      expect(validator.supports('data.json', options)).toBe(true);
      expect(validator.supports('test.json', options)).toBe(true);
    });

    test('should support NDJSON files', () => {
      const options = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      expect(validator.supports('data.ndjson', options)).toBe(true);
      expect(validator.supports('stream.ndjson', options)).toBe(true);
    });

    test('should support text files', () => {
      const options = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      expect(validator.supports('content.txt', options)).toBe(true);
      expect(validator.supports('data.txt', options)).toBe(true);
    });

    test('should not support unsupported files', () => {
      const options = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      expect(validator.supports('image.png', options)).toBe(false);
      expect(validator.supports('document.pdf', options)).toBe(false);
      expect(validator.supports('archive.zip', options)).toBe(false);
    });
  });

  describe('validate', () => {
    test('should validate valid JSON file', async () => {
      const filePath = path.join(tempDir, 'valid.json');
      fs.writeFileSync(filePath, '{"name": "test", "value": 42}');

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
        format: 'json',
      };
      const result = await validator.validate(filePath, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      }
    });

    test('should reject malformed JSON', async () => {
      const filePath = path.join(tempDir, 'malformed.json');
      fs.writeFileSync(filePath, '{"name": "test", "value": 42,}'); // Extra comma

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
        format: 'json',
      };
      const result = await validator.validate(filePath, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
        expect(
          result.value.errors.some((e: any) => e.message.includes('JSON'))
        ).toBe(true);
      }
    });
  });

  describe('validateFileExists', () => {
    test('should validate file exists', async () => {
      const filePath = path.join(tempDir, 'exists.txt');
      fs.writeFileSync(filePath, 'test content');

      const result = await validator.validateFileExists(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      const result = await validator.validateFileExists(filePath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('File not found');
      }
    });
  });

  describe('validateFileFormat', () => {
    test('should validate JSON format', async () => {
      const filePath = path.join(tempDir, 'test.json');
      fs.writeFileSync(filePath, '{"test": "data"}');

      const result = await validator.validateFileFormat(filePath, 'json');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('should validate text format', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'plain text content');

      const result = await validator.validateFileFormat(filePath, 'txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('validateJsonStructure', () => {
    test('should validate valid JSON structure', async () => {
      const validJson = '{"name": "test", "value": 42}';

      const result = await validator.validateJsonStructure(validJson);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('should reject invalid JSON structure', async () => {
      const invalidJson = '{"name": "test", "value": 42,}'; // Extra comma

      const result = await validator.validateJsonStructure(invalidJson);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid JSON structure');
      }
    });
  });

  describe('validateFileReadability', () => {
    test('should validate readable file', async () => {
      const filePath = path.join(tempDir, 'readable.txt');
      fs.writeFileSync(filePath, 'test content');

      const result = await validator.validateFileReadability(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      const result = await validator.validateFileReadability(filePath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('File is not readable');
      }
    });
  });
});
