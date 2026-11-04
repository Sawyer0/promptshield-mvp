import { describe, test, expect } from '@jest/globals';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  FileSystemError,
  RuleExecutionError,
  ConfigurationError,
  ProcessingError,
  TimeoutError,
  MemoryError,
} from '../../../../src/infrastructure/errors/DomainError';

describe('DomainError hierarchy', () => {
  test('ValidationError carries the individual errors', () => {
    const error = new ValidationError('Validation failed', ['a', 'b']);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.errors).toEqual(['a', 'b']);
    expect(error.stack).toContain('ValidationError');
  });

  test('ValidationError defaults to no individual errors', () => {
    expect(new ValidationError('x').errors).toEqual([]);
  });

  test.each([
    [
      new NotFoundError('RulePack', 'pii.yaml'),
      'NOT_FOUND',
      404,
      'RulePack not found: pii.yaml',
    ],
    [
      new FileSystemError('read', '/tmp/x'),
      'FILE_SYSTEM_ERROR',
      500,
      'File system error during read: /tmp/x',
    ],
    [
      new RuleExecutionError('email', 'bad regex'),
      'RULE_EXECUTION_ERROR',
      500,
      'Rule execution failed for email: bad regex',
    ],
    [
      new ConfigurationError('missing rulepack'),
      'CONFIGURATION_ERROR',
      400,
      'Configuration error: missing rulepack',
    ],
    [
      new ProcessingError('bad input'),
      'PROCESSING_ERROR',
      500,
      'Processing error: bad input',
    ],
    [
      new TimeoutError('scan', 30),
      'TIMEOUT_ERROR',
      408,
      'Operation scan timed out after 30 seconds',
    ],
    [
      new MemoryError(80, 95),
      'MEMORY_ERROR',
      507,
      'Memory usage (95%) exceeded threshold (80%)',
    ],
  ])('%p has code, status and message', (error, code, status, message) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(status);
    expect(error.message).toBe(message);
  });

  test('keeps the underlying cause', () => {
    const cause = new Error('ENOENT');
    const error = new FileSystemError('read', '/missing', cause);

    expect(error.cause).toBe(cause);
  });
});
