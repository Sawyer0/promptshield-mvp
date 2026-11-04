import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  ValidationResultBuilder,
  ValidationResult,
  ValidationError,
} from '../../../../../src/domains/validation/core/entities/ValidationResult';

describe('ValidationResult', () => {
  describe('ValidationResultBuilder', () => {
    let builder: ValidationResultBuilder;

    beforeEach(() => {
      builder = new ValidationResultBuilder('test.yaml', 'rulepack');
    });

    describe('addError', () => {
      test('should add error with all fields', () => {
        builder.addError('field', 'Error message', 'ERROR_CODE', 10, 5);
        const result = builder.build();

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toEqual({
          field: 'field',
          message: 'Error message',
          code: 'ERROR_CODE',
          severity: 'error',
          line: 10,
          column: 5,
        });
      });

      test('should add error without line/column', () => {
        builder.addError('field', 'Error message', 'ERROR_CODE');
        const result = builder.build();

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].line).toBeUndefined();
        expect(result.errors[0].column).toBeUndefined();
      });

      test('should support method chaining', () => {
        const result = builder
          .addError('field1', 'Error 1', 'CODE1')
          .addError('field2', 'Error 2', 'CODE2')
          .build();

        expect(result.errors).toHaveLength(2);
      });
    });

    describe('addWarning', () => {
      test('should add warning with all fields', () => {
        builder.addWarning('field', 'Warning message', 'WARN_CODE', 20, 10);
        const result = builder.build();

        expect(result.isValid).toBe(true); // Warnings don't affect validity
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toEqual({
          field: 'field',
          message: 'Warning message',
          code: 'WARN_CODE',
          severity: 'warning',
          line: 20,
          column: 10,
        });
      });

      test('should not affect validity', () => {
        builder.addWarning('field', 'Warning', 'WARN');
        const result = builder.build();

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('build', () => {
      test('should create valid result with no errors', () => {
        const result = builder.build();

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
        expect(result.target).toBe('test.yaml');
        expect(result.validationType).toBe('rulepack');
      });

      test('should create invalid result with errors', () => {
        builder.addError('field', 'Error', 'CODE');
        const result = builder.build();

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
      });

      test('should handle mixed errors and warnings', () => {
        builder
          .addError('error-field', 'Error message', 'ERROR')
          .addWarning('warn-field', 'Warning message', 'WARN');

        const result = builder.build();

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.warnings).toHaveLength(1);
      });

      test('should create immutable copies of arrays', () => {
        builder.addError('field', 'Error', 'CODE');
        const result1 = builder.build();
        const result2 = builder.build();

        expect(result1.errors).not.toBe(result2.errors);
        expect(result1.errors).toEqual(result2.errors);
      });
    });

    describe('validation types', () => {
      test('should support different validation types', () => {
        const rulepackBuilder = new ValidationResultBuilder(
          'test.yaml',
          'rulepack'
        );
        const inputBuilder = new ValidationResultBuilder(
          'test.json',
          'input-file'
        );
        const configBuilder = new ValidationResultBuilder(
          'config.json',
          'config'
        );

        expect(rulepackBuilder.build().validationType).toBe('rulepack');
        expect(inputBuilder.build().validationType).toBe('input-file');
        expect(configBuilder.build().validationType).toBe('config');
      });
    });
  });

  describe('ValidationError interface', () => {
    test('should have correct shape', () => {
      const error: ValidationError = {
        field: 'test',
        message: 'Test error',
        code: 'TEST_CODE',
        severity: 'error',
        line: 10,
        column: 5,
      };

      expect(error.field).toBe('test');
      expect(error.severity).toBe('error');
    });
  });

  describe('ValidationResult interface', () => {
    test('should have correct shape', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        target: 'test.yaml',
        validationType: 'rulepack',
      };

      expect(result.isValid).toBe(true);
      expect(result.validationType).toBe('rulepack');
    });
  });
});
