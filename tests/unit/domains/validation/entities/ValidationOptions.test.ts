import { describe, test, expect } from '@jest/globals';
import {
  ValidationOptions,
  ValidationOptionsBuilder,
} from '../../../../../src/domains/validation/core/entities/ValidationOptions';

describe('ValidationOptions', () => {
  describe('ValidationOptionsBuilder', () => {
    test('should provide default options', () => {
      const defaults = ValidationOptionsBuilder.default();

      expect(defaults).toEqual({
        strict: false,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
      });
    });

    test('should build with default values', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder.build();

      expect(options).toEqual(ValidationOptionsBuilder.default());
    });

    test('should override strict option', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder.strict(true).build();

      expect(options.strict).toBe(true);
      expect(options.verbose).toBe(false); // Other options remain default
    });

    test('should override verbose option', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder.verbose(true).build();

      expect(options.verbose).toBe(true);
      expect(options.strict).toBe(false); // Other options remain default
    });

    test('should override skipWarnings option', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder.skipWarnings(true).build();

      expect(options.skipWarnings).toBe(true);
    });

    test('should override maxErrors option', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder.maxErrors(50).build();

      expect(options.maxErrors).toBe(50);
    });

    test('should set format option', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder.format('json').build();

      expect(options.format).toBe('json');
    });

    test('should support method chaining', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder
        .strict(true)
        .verbose(true)
        .skipWarnings(true)
        .maxErrors(50)
        .format('yaml')
        .build();

      expect(options).toEqual({
        strict: true,
        verbose: true,
        skipWarnings: true,
        maxErrors: 50,
        validateRegex: true,
        validateSchema: true,
        format: 'yaml',
      });
    });

    test('should handle default values for strict() and verbose()', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder
        .strict() // No argument = true
        .verbose() // No argument = true
        .build();

      expect(options.strict).toBe(true);
      expect(options.verbose).toBe(true);
    });

    test('should allow format to be undefined', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder.build();

      expect(options.format).toBeUndefined();
    });

    test('should merge partial options with defaults', () => {
      const builder = new ValidationOptionsBuilder();
      const options = builder.strict(true).build();

      // Check that only strict was changed
      expect(options.strict).toBe(true);
      expect(options.verbose).toBe(false);
      expect(options.skipWarnings).toBe(false);
      expect(options.maxErrors).toBe(100);
      expect(options.validateRegex).toBe(true);
      expect(options.validateSchema).toBe(true);
    });
  });

  describe('ValidationOptions interface', () => {
    test('should have correct shape', () => {
      const options: ValidationOptions = {
        strict: true,
        verbose: false,
        skipWarnings: false,
        maxErrors: 100,
        validateRegex: true,
        validateSchema: true,
        format: 'json',
      };

      expect(options.strict).toBe(true);
      expect(options.format).toBe('json');
    });

    test('should support all format types', () => {
      const formats: Array<ValidationOptions['format']> = [
        'json',
        'ndjson',
        'yaml',
        'txt',
        undefined,
      ];

      formats.forEach((format) => {
        const options: ValidationOptions = {
          strict: false,
          verbose: false,
          skipWarnings: false,
          maxErrors: 100,
          validateRegex: true,
          validateSchema: true,
          format,
        };

        expect(options.format).toBe(format);
      });
    });
  });
});
