import { describe, test, expect, beforeEach } from '@jest/globals';
import { TextProcessor } from '../../../../../src/domains/scanning/adapters/processors/TextProcessor';
import { createScanContext } from '../../../../helpers/testFactories';

describe('TextProcessor', () => {
  let processor: TextProcessor;

  beforeEach(() => {
    processor = new TextProcessor();
  });

  describe('canProcess', () => {
    test('should handle text files', () => {
      expect(processor.canProcess('test.txt')).toBe(true);
      expect(processor.canProcess('readme.md')).toBe(true);
      expect(processor.canProcess('app.log')).toBe(true);
      expect(processor.canProcess('notes.text')).toBe(true);
    });

    test('should not handle non-text files', () => {
      expect(processor.canProcess('test.json')).toBe(false);
      expect(processor.canProcess('image.png')).toBe(false);
      expect(processor.canProcess('')).toBe(false);
    });

    test('should be case-insensitive', () => {
      expect(processor.canProcess('README.MD')).toBe(true);
      expect(processor.canProcess('LOG.TEXT')).toBe(true);
    });
  });

  describe('process', () => {
    test('should process simple text as single item', async () => {
      const input = 'This is a simple text message';
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const items = result.value;
        expect(items).toHaveLength(1);
        expect(items[0].fields.content).toBe(input);
        expect(items[0].metadata.type).toBe('text');
      }
    });

    test('should handle empty text', async () => {
      const input = '';
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const items = result.value;
        expect(items).toHaveLength(1);
        expect(items[0].fields.content).toBe('');
      }
    });

    test('should handle special characters', async () => {
      const input = 'Text with emojis 🚀🎉 and unicode café naïve 中文';
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const items = result.value;
        expect(items[0].fields.content).toBe(input);
      }
    });
  });

  describe('processWithChunking', () => {
    test('should split large text into chunks', async () => {
      const largeText = 'Line of text\n'.repeat(1000); // Many lines to force chunking
      const context = createScanContext();

      const result = await processor.processWithChunking(largeText, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const items = result.value;
        expect(items.length).toBeGreaterThan(1);
      }
    });

    test('should respect maxObjects when chunking', async () => {
      const largeText = 'Line of text\n'.repeat(1000);
      const context = createScanContext({
        maxObjects: 2,
      });

      const result = await processor.processWithChunking(largeText, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const items = result.value;
        expect(items).toHaveLength(2);
      }
    });
  });
});
