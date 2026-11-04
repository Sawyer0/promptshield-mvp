import { describe, test, expect } from '@jest/globals';
import { Violation } from '../../../../src/shared/types/Violation';

describe('Violation', () => {
  describe('creation', () => {
    test('should create violation with required fields', () => {
      const violation: Violation = {
        ruleId: 'test-rule',
        ruleName: 'Test Rule',
        ruleDescription: 'Test rule description',
        severity: 'medium',
        category: 'custom',
        message: 'Test violation message',
        field: 'content',
        objectIndex: 0,
        context: {
          before: '',
          match: 'test match',
          after: '',
        },
      };

      expect(violation.ruleId).toBe('test-rule');
      expect(violation.severity).toBe('medium');
      expect(violation.category).toBe('custom');
    });

    test('should create violation with position information', () => {
      const violation: Violation = {
        ruleId: 'test-rule',
        ruleName: 'Test Rule',
        ruleDescription: 'Test rule description',
        severity: 'high',
        category: 'pii',
        message: 'Email address found',
        field: 'content',
        objectIndex: 0,
        position: {
          start: 10,
          end: 25,
          line: 2,
          column: 5,
        },
        context: {
          before: 'Hello ',
          match: 'test@example.com',
          after: ' world',
        },
      };

      expect(violation.position?.start).toBe(10);
      expect(violation.position?.end).toBe(25);
      expect(violation.position?.line).toBe(2);
      expect(violation.position?.column).toBe(5);
    });

    test('should create violation with metadata', () => {
      const violation: Violation = {
        ruleId: 'email-rule',
        ruleName: 'Email Detection',
        ruleDescription: 'Detects email addresses',
        severity: 'high',
        category: 'pii',
        message: 'Email address found',
        field: 'content',
        objectIndex: 0,
        context: {
          before: '',
          match: 'test@example.com',
          after: '',
        },
        metadata: {
          pattern: '\\b[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}\\b',
          confidence: 0.95,
          tags: ['email', 'contact'],
        },
      };

      expect(violation.metadata?.pattern).toBe(
        '\\b[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}\\b'
      );
      expect(violation.metadata?.confidence).toBe(0.95);
      expect(violation.metadata?.tags).toEqual(['email', 'contact']);
    });
  });

  describe('severity levels', () => {
    test('should support all severity levels', () => {
      const severities: Violation['severity'][] = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      severities.forEach((severity) => {
        const violation: Violation = {
          ruleId: 'test-rule',
          ruleName: 'Test Rule',
          ruleDescription: 'Test rule description',
          severity,
          category: 'custom',
          message: 'Test violation',
          field: 'content',
          objectIndex: 0,
          context: {
            before: '',
            match: 'test',
            after: '',
          },
        };

        expect(violation.severity).toBe(severity);
      });
    });
  });

  describe('categories', () => {
    test('should support all categories', () => {
      const categories: Violation['category'][] = [
        'pii',
        'bias',
        'hallucination',
        'security',
        'compliance',
        'parse',
        'internal',
        'custom',
      ];

      categories.forEach((category) => {
        const violation: Violation = {
          ruleId: 'test-rule',
          ruleName: 'Test Rule',
          ruleDescription: 'Test rule description',
          severity: 'medium',
          category,
          message: 'Test violation',
          field: 'content',
          objectIndex: 0,
          context: {
            before: '',
            match: 'test',
            after: '',
          },
        };

        expect(violation.category).toBe(category);
      });
    });
  });

  describe('context information', () => {
    test('should provide context around match', () => {
      const violation: Violation = {
        ruleId: 'ssn-rule',
        ruleName: 'SSN Detection',
        ruleDescription: 'Detects social security numbers',
        severity: 'critical',
        category: 'pii',
        message: 'SSN found',
        field: 'content',
        objectIndex: 0,
        position: {
          start: 15,
          end: 30,
          line: 3,
          column: 10,
        },
        context: {
          before: 'My SSN is ',
          match: '123-45-6789',
          after: ' and my name is John',
        },
      };

      expect(violation.context.before).toBe('My SSN is ');
      expect(violation.context.match).toBe('123-45-6789');
      expect(violation.context.after).toBe(' and my name is John');
    });

    test('should calculate match length correctly', () => {
      const violation: Violation = {
        ruleId: 'email-rule',
        ruleName: 'Email Detection',
        ruleDescription: 'Detects email addresses',
        severity: 'high',
        category: 'pii',
        message: 'Email address found',
        field: 'content',
        objectIndex: 0,
        position: {
          start: 10,
          end: 25,
          line: 2,
          column: 5,
        },
        context: {
          before: '',
          match: 'test@example.com',
          after: '',
        },
      };

      if (violation.position) {
        expect(violation.position.end - violation.position.start).toBe(15); // Length of email
      }
    });

    test('should handle line and column information', () => {
      const violation: Violation = {
        ruleId: 'test-rule',
        ruleName: 'Test Rule',
        ruleDescription: 'Test rule description',
        severity: 'medium',
        category: 'custom',
        message: 'Test violation',
        field: 'content',
        objectIndex: 0,
        position: {
          start: 20,
          end: 30,
          line: 3,
          column: 10,
        },
        context: {
          before: '',
          match: 'test',
          after: '',
        },
      };

      if (violation.position) {
        expect(violation.position.line).toBe(3);
        expect(violation.position.column).toBe(10);
      }
    });
  });

  describe('metadata and confidence', () => {
    test('should support confidence levels', () => {
      const highConfidence: Violation = {
        ruleId: 'high-confidence-rule',
        ruleName: 'High Confidence Rule',
        ruleDescription: 'Test rule description',
        severity: 'high',
        category: 'pii',
        message: 'High confidence match',
        field: 'content',
        objectIndex: 0,
        context: {
          before: '',
          match: 'test',
          after: '',
        },
        metadata: {
          pattern: 'test',
          confidence: 0.95,
          tags: ['high-confidence'],
        },
      };

      const lowConfidence: Violation = {
        ruleId: 'low-confidence-rule',
        ruleName: 'Low Confidence Rule',
        ruleDescription: 'Test rule description',
        severity: 'low',
        category: 'custom',
        message: 'Low confidence match',
        field: 'content',
        objectIndex: 0,
        context: {
          before: '',
          match: 'test',
          after: '',
        },
        metadata: {
          pattern: 'test',
          confidence: 0.3,
          tags: ['low-confidence'],
        },
      };

      if (
        highConfidence.metadata?.confidence &&
        lowConfidence.metadata?.confidence
      ) {
        expect(highConfidence.metadata.confidence).toBeGreaterThan(
          lowConfidence.metadata.confidence
        );
        expect(highConfidence.metadata.confidence).toBeLessThanOrEqual(1.0);
        expect(lowConfidence.metadata.confidence).toBeGreaterThanOrEqual(0.0);
      }
    });

    test('should support multiple tags', () => {
      const violation: Violation = {
        ruleId: 'multi-tag-rule',
        ruleName: 'Multi Tag Rule',
        ruleDescription: 'Test rule description',
        severity: 'medium',
        category: 'pii',
        message: 'Multi-tagged violation',
        field: 'content',
        objectIndex: 0,
        context: {
          before: '',
          match: 'test',
          after: '',
        },
        metadata: {
          pattern: 'test',
          confidence: 0.8,
          tags: ['email', 'contact', 'personal', 'pii'],
        },
      };

      if (violation.metadata) {
        expect(violation.metadata.tags).toHaveLength(4);
        expect(violation.metadata.tags).toEqual([
          'email',
          'contact',
          'personal',
          'pii',
        ]);
      }
    });
  });
});
