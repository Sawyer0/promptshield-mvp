import { describe, test, expect, beforeEach } from '@jest/globals';
import { JsonProcessor } from '../../../../../src/domains/scanning/adapters/processors/JsonProcessor';
import {
  createScanConfig,
  createScanContext,
} from '../../../../helpers/testFactories';

describe('JsonProcessor', () => {
  let processor: JsonProcessor;

  beforeEach(() => {
    processor = new JsonProcessor();
  });

  describe('canProcess', () => {
    test('should handle JSON files', () => {
      expect(processor.canProcess('test.json')).toBe(true);
      expect(processor.canProcess('data.NDJSON')).toBe(true);
      expect(processor.canProcess('logs.jsonl')).toBe(true);
    });

    test('should not handle non-JSON files', () => {
      expect(processor.canProcess('test.txt')).toBe(false);
      expect(processor.canProcess('image.png')).toBe(false);
      expect(processor.canProcess('document.pdf')).toBe(false);
      expect(processor.canProcess('')).toBe(false);
    });

    test('should be case-insensitive', () => {
      expect(processor.canProcess('TEST.JSON')).toBe(true);
      expect(processor.canProcess('Data.NdJson')).toBe(true);
    });
  });

  describe('process - JSON Objects', () => {
    test('should process simple JSON object', async () => {
      const input = '{"prompt": "test", "response": "answer"}';
      const context = createScanContext({
        fields: ['prompt', 'response'],
      });

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(1);
        expect(objects[0].fields.prompt).toBe('test');
        expect(objects[0].fields.response).toBe('answer');
      }
    });

    test('should process nested JSON object', async () => {
      const input = JSON.stringify({
        conversation: {
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
        },
        metadata: { timestamp: '2025-01-01' },
      });
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(1);
        expect((objects[0].data as any).conversation.messages).toHaveLength(2);
        expect((objects[0].data as any).metadata.timestamp).toBe('2025-01-01');
      }
    });

    test('should process JSON array of objects', async () => {
      const input = JSON.stringify([
        { id: 1, text: 'First item' },
        { id: 2, text: 'Second item' },
        { id: 3, text: 'Third item' },
      ]);
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(3);
        expect((objects[0].data as any).id).toBe(1);
        expect((objects[1].data as any).text).toBe('Second item');
        expect((objects[2].data as any).id).toBe(3);
      }
    });

    test('should process empty JSON object', async () => {
      const input = '{}';
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(1);
      }
    });

    test('should process empty JSON array', async () => {
      const input = '[]';
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(0);
      }
    });
  });

  describe('process - NDJSON', () => {
    test('should process NDJSON with multiple lines', async () => {
      const input =
        '{"id": 1, "text": "First"}\n{"id": 2, "text": "Second"}\n{"id": 3, "text": "Third"}';
      const context = createScanContext({
        ndjsonMode: true,
      });

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(3);
        expect((objects[0].data as any).id).toBe(1);
        expect((objects[1].data as any).text).toBe('Second');
        expect((objects[2].data as any).id).toBe(3);
      }
    });

    test('should process NDJSON with empty lines', async () => {
      const input = '{"id": 1}\n\n{"id": 2}\n\n\n{"id": 3}';
      const context = createScanContext({
        ndjsonMode: true,
      });

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(3);
        expect(objects.map((o: any) => o.data.id)).toEqual([1, 2, 3]);
      }
    });

    test('should process NDJSON with whitespace', async () => {
      const input = '  {"id": 1}  \n\t{"id": 2}\t\n   {"id": 3}   ';
      const context = createScanContext({
        ndjsonMode: true,
      });

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(3);
      }
    });

    test('should handle single line NDJSON', async () => {
      const input = '{"single": "line"}';
      const context = createScanContext({
        ndjsonMode: true,
      });

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(1);
        expect(objects[0].data).toEqual({ single: 'line' });
      }
    });
  });

  describe('field filtering', () => {
    test('should extract specified fields only', async () => {
      const input = JSON.stringify([
        { id: 1, prompt: 'Hello', response: 'Hi', metadata: { time: '10:00' } },
        {
          id: 2,
          prompt: 'How are you?',
          response: 'Good',
          metadata: { time: '10:01' },
        },
      ]);
      const context = createScanContext({
        fields: ['prompt', 'response'],
      });

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(2);
        expect(objects[0].fields).toEqual({ prompt: 'Hello', response: 'Hi' });
        expect(objects[1].fields).toEqual({
          prompt: 'How are you?',
          response: 'Good',
        });
      }
    });

    test('should scan entire object when scanEntireObject is true', async () => {
      const input = JSON.stringify([
        { prompt: 'Hello', response: 'Hi', metadata: { important: 'data' } },
      ]);
      const context = createScanContext({
        fields: ['prompt', 'response'],
        scanEntireObject: true,
      });

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect(objects).toHaveLength(1);
        expect(objects[0].fields.prompt).toBe('Hello');
        expect(objects[0].fields.response).toBe('Hi');
        expect(objects[0].fields._entire_object).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    test('should handle invalid JSON syntax', async () => {
      const input = '{"invalid": json}';
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to parse JSON');
      }
    });

    test('should handle truncated JSON', async () => {
      const input = '{"incomplete":';
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Unexpected end');
      }
    });
  });

  describe('data types', () => {
    test('should preserve different JSON data types', async () => {
      const input = JSON.stringify({
        string: 'text',
        number: 42,
        float: 3.14,
        boolean: true,
        null_value: null,
        array: [1, 2, 3],
        object: { nested: 'value' },
      });
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect((objects[0].data as any).string).toBe('text');
        expect((objects[0].data as any).number).toBe(42);
        expect((objects[0].data as any).float).toBe(3.14);
        expect((objects[0].data as any).boolean).toBe(true);
        expect((objects[0].data as any).null_value).toBeNull();
        expect(Array.isArray((objects[0].data as any).array)).toBe(true);
        expect(typeof (objects[0].data as any).object).toBe('object');
      }
    });

    test('should handle unicode and special characters', async () => {
      const input = JSON.stringify({
        unicode: '🚀 Unicode test: café, naïve, 中文, 日本語',
        escaped: 'Line 1\nLine 2\tTabbed',
        quotes: 'Single \' and double " quotes',
      });
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect((objects[0].data as any).unicode).toContain('🚀');
        expect((objects[0].data as any).escaped).toContain('\n');
        expect((objects[0].data as any).quotes).toContain("'");
      }
    });

    test('should handle very long strings', async () => {
      const longString = 'x'.repeat(10000);
      const input = JSON.stringify({ long_field: longString });
      const context = createScanContext();

      const result = await processor.process(input, context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const objects = result.value;
        expect((objects[0].data as any).long_field).toHaveLength(10000);
      }
    });
  });
});
