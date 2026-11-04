import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  ConsoleLogger,
  LoggerFactory,
  LogLevel,
  NoOpLogger,
} from '../../../../src/infrastructure/logging/Logger';

describe('Logger', () => {
  let written: string[];
  let stderrSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    written = [];
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        written.push(String(chunk));
        return true;
      });
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  describe('ConsoleLogger', () => {
    test('writes level, message and context to stderr', () => {
      new ConsoleLogger(LogLevel.INFO).info('Scan started', { file: 'a.json' });

      expect(written).toHaveLength(1);
      expect(written[0]).toContain('[INFO] Scan started');
      expect(written[0]).toContain('{"file":"a.json"}');
    });

    test('drops messages below its level', () => {
      const logger = new ConsoleLogger(LogLevel.WARN);
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(written.map((line) => line.match(/\[(\w+)\]/)?.[1])).toEqual([
        'WARN',
        'ERROR',
      ]);
    });

    test('adds the stack trace only when asked to', () => {
      const error = new Error('boom');

      new ConsoleLogger(LogLevel.ERROR).error('failed', error);
      expect(written).toHaveLength(1);

      written = [];
      new ConsoleLogger(LogLevel.ERROR, { includeStackTrace: true }).error(
        'failed',
        error
      );
      expect(written).toHaveLength(2);
      expect(written[1]).toContain('Error: boom');
    });
  });

  describe('LoggerFactory', () => {
    test.each([
      ['DEBUG', 4],
      ['info', 3],
      ['WARN', 2],
      ['error', 1],
      [undefined, 3],
    ])('level %p logs %p of 4 messages', (level, expected) => {
      const logger = LoggerFactory.create({ level });
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(written).toHaveLength(expected);
    });

    test('getLogger returns a shared instance', () => {
      expect(LoggerFactory.getLogger()).toBe(LoggerFactory.getLogger());
    });

    test('quiet logger writes nothing', () => {
      const logger = LoggerFactory.createQuietLogger();
      expect(logger).toBeInstanceOf(NoOpLogger);

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e', new Error('x'));

      expect(written).toHaveLength(0);
    });
  });
});
