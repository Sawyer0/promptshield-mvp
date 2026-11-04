import { describe, test, expect } from '@jest/globals';
import { Result, ok, err, Ok, Err } from '../../../../src/shared/types/Result';

describe('Result Type', () => {
  describe('ok function', () => {
    test('should create Ok result', () => {
      const result = ok('success');

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      if (result.isOk()) {
        expect(result.value).toBe('success');
      }
    });

    test('should work with different types', () => {
      const numberResult = ok(42);
      const objectResult = ok({ foo: 'bar' });
      const arrayResult = ok([1, 2, 3]);

      if (numberResult.isOk()) {
        expect(numberResult.value).toBe(42);
      }
      if (objectResult.isOk()) {
        expect(objectResult.value).toEqual({ foo: 'bar' });
      }
      if (arrayResult.isOk()) {
        expect(arrayResult.value).toEqual([1, 2, 3]);
      }
    });

    test('should work with undefined and null', () => {
      const undefinedResult = ok(undefined);
      const nullResult = ok(null);

      if (undefinedResult.isOk()) {
        expect(undefinedResult.value).toBeUndefined();
      }
      if (nullResult.isOk()) {
        expect(nullResult.value).toBeNull();
      }
    });
  });

  describe('err function', () => {
    test('should create Err result', () => {
      const result = err(new Error('failure'));

      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('failure');
      }
    });

    test('should work with custom error types', () => {
      class CustomError extends Error {
        constructor(
          public code: string,
          message: string
        ) {
          super(message);
        }
      }

      const result = err(new CustomError('CUSTOM_ERR', 'Custom error'));

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(CustomError);
        expect(result.error.code).toBe('CUSTOM_ERR');
      }
    });
  });

  describe('Ok class', () => {
    test('should have correct properties', () => {
      const result = new Ok('value');

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      if (result.isOk()) {
        expect(result.value).toBe('value');
      }
    });

    test('should return undefined when accessing error', () => {
      const result = new Ok('value');

      expect((result as any).error).toBeUndefined();
    });
  });

  describe('Err class', () => {
    test('should have correct properties', () => {
      const error = new Error('test error');
      const result = new Err(error);

      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });

    test('should return undefined when accessing value', () => {
      const result = new Err(new Error('error'));

      expect((result as any).value).toBeUndefined();
    });
  });

  describe('Type guards', () => {
    test('should narrow types correctly with isOk()', () => {
      const result: Result<string, Error> = ok('success');

      if (result.isOk()) {
        // TypeScript should know result.value is available here
        expect(result.value).toBe('success');
      } else {
        // This branch should not execute
        expect(true).toBe(false);
      }
    });

    test('should narrow types correctly with isErr()', () => {
      const result: Result<string, Error> = err(new Error('failure'));

      if (result.isErr()) {
        // TypeScript should know result.error is available here
        expect(result.error.message).toBe('failure');
      } else {
        // This branch should not execute
        expect(true).toBe(false);
      }
    });
  });

  describe('Pattern matching', () => {
    test('should handle ok case', () => {
      const result: Result<number, Error> = ok(42);

      const value = result.isOk() ? result.value * 2 : 0;

      expect(value).toBe(84);
    });

    test('should handle err case', () => {
      const result: Result<number, Error> = err(
        new Error('calculation failed')
      );

      const value = result.isOk() ? result.value * 2 : -1;

      expect(value).toBe(-1);
    });
  });

  describe('Real-world usage patterns', () => {
    // Simulating a function that might fail
    function divide(a: number, b: number): Result<number, Error> {
      if (b === 0) {
        return err(new Error('Division by zero'));
      }
      return ok(a / b);
    }

    test('should handle successful operation', () => {
      const result = divide(10, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(5);
      }
    });

    test('should handle failed operation', () => {
      const result = divide(10, 0);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Division by zero');
      }
    });

    test('should chain operations', () => {
      const result1 = divide(20, 2);
      if (result1.isErr()) {
        expect(true).toBe(false); // Should not reach here
        return;
      }

      const result2 = divide(result1.value, 5);

      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(2);
      }
    });
  });
});
