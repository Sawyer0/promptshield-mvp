import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { DefaultValidationEngine } from '../../../../../src/domains/validation/core/services/ValidationEngineImpl';
import { ValidationOptions } from '../../../../../src/domains/validation/core/entities/ValidationOptions';
import { InputFileValidatorImpl } from '../../../../../src/domains/validation/adapters/validators/InputFileValidatorImpl';
import { RulePackValidatorImpl } from '../../../../../src/domains/validation/adapters/validators/RulePackValidatorImpl';
import { createValidationResult } from '../../../../helpers/testFactories';
import { IFileSystem } from '../../../../../src/shared/ports/FileSystem';
import { IPathUtils } from '../../../../../src/shared/ports/PathUtils';

describe('DefaultValidationEngine', () => {
  let engine: DefaultValidationEngine;
  let inputFileValidator: InputFileValidatorImpl;
  let rulePackValidator: RulePackValidatorImpl;
  let mockFileSystem: jest.Mocked<IFileSystem>;
  let mockPathUtils: jest.Mocked<IPathUtils>;

  beforeEach(() => {
    mockFileSystem = {
      existsSync: jest.fn<any>(),
      exists: jest.fn<any>(),
      readFile: jest.fn<any>(),
      writeFile: jest.fn<any>(),
      mkdir: jest.fn<any>(),
    } as any;

    mockPathUtils = {
      extname: jest.fn<any>().mockReturnValue(''),
      basename: jest.fn<any>().mockReturnValue(''),
      dirname: jest.fn<any>().mockReturnValue(''),
      join: jest
        .fn<any>()
        .mockImplementation((...args: any[]) => args.join('/')),
    } as any;

    inputFileValidator = new InputFileValidatorImpl();
    rulePackValidator = new RulePackValidatorImpl();
    engine = new DefaultValidationEngine(mockFileSystem, mockPathUtils);
    engine.registerValidator('input-file', inputFileValidator);
    engine.registerValidator('rulepack', rulePackValidator);
  });

  describe('validate', () => {
    test('should validate input file successfully', async () => {
      const filePath = 'test.json';
      const expectedResult = createValidationResult({ isValid: true });

      // Mock file system
      mockFileSystem.existsSync.mockReturnValue(true);
      mockPathUtils.extname.mockReturnValue('.json');
      mockPathUtils.basename.mockReturnValue('test.json');

      // Mock the validator to return expected result
      jest.spyOn(inputFileValidator, 'validate').mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
        value: expectedResult,
      } as any);

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
        format: 'json',
      };
      const result = await engine.validate(filePath, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(expectedResult);
      }
    });

    test('should return error for unknown validation type', async () => {
      const filePath = 'test.unknown';
      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };

      // Mock file system to return false (file not found)
      mockFileSystem.existsSync.mockReturnValue(false);

      const result = await engine.validate(filePath, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'No validator found for type: unknown'
        );
      }
    });

    test('should return error when validator does not support target', async () => {
      const filePath = 'test.txt';
      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };

      // Mock file system
      mockFileSystem.existsSync.mockReturnValue(true);
      mockPathUtils.extname.mockReturnValue('.txt');
      mockPathUtils.basename.mockReturnValue('test.txt');

      // Mock supports to return false
      jest.spyOn(inputFileValidator, 'supports').mockReturnValue(false);

      const result = await engine.validate(filePath, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Validator does not support target'
        );
      }
    });

    test('should propagate validation errors', async () => {
      const filePath = 'test.json';
      const error = new Error('Validation failed');

      // Mock file system
      mockFileSystem.existsSync.mockReturnValue(true);
      mockPathUtils.extname.mockReturnValue('.json');
      mockPathUtils.basename.mockReturnValue('test.json');

      // Mock the validator to return error
      jest.spyOn(inputFileValidator, 'validate').mockResolvedValue({
        isOk: () => false,
        isErr: () => true,
        error,
      } as any);

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
        format: 'json',
      };
      const result = await engine.validate(filePath, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('validateBatch', () => {
    test('should validate multiple files successfully', async () => {
      const filePaths = ['test1.json', 'test2.yaml'];
      const expectedResults = [
        createValidationResult({ isValid: true }),
        createValidationResult({ isValid: false }),
      ];

      // Mock file system
      mockFileSystem.existsSync.mockReturnValue(true);
      mockPathUtils.extname.mockImplementation((p: any) =>
        p.endsWith('.json') ? '.json' : '.yaml'
      );
      mockPathUtils.basename.mockImplementation((p: any) => p);

      // Mock validators to return expected results
      jest.spyOn(inputFileValidator, 'validate').mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
        value: expectedResults[0],
      } as any);
      jest.spyOn(rulePackValidator, 'validate').mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
        value: expectedResults[1],
      } as any);

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      const result = await engine.validateBatch(filePaths, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
      }
    });

    test('should return error when any validation fails', async () => {
      const filePaths = ['test1.json', 'test2.yaml'];
      const error = new Error('Validation failed');

      // Mock file system
      mockFileSystem.existsSync.mockReturnValue(true);
      mockPathUtils.extname.mockImplementation((p: any) =>
        p.endsWith('.json') ? '.json' : '.yaml'
      );
      mockPathUtils.basename.mockImplementation((p: any) => p);

      // Mock first validation to succeed, second to fail
      jest.spyOn(inputFileValidator, 'validate').mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
        value: createValidationResult({ isValid: true }),
      } as any);
      jest.spyOn(rulePackValidator, 'validate').mockResolvedValue({
        isOk: () => false,
        isErr: () => true,
        error,
      } as any);

      const options: ValidationOptions = {
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      };
      const result = await engine.validateBatch(filePaths, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('getSupportedTypes', () => {
    test('should return registered validator types', () => {
      const types = engine.getSupportedTypes();
      expect(types).toContain('input-file');
      expect(types).toContain('rulepack');
    });
  });
});
