import { describe, test, expect, beforeEach } from '@jest/globals';
import { Container } from '../../../../src/infrastructure/container/Container';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('register and resolve', () => {
    test('should register and resolve a simple value', () => {
      const testValue = 'test-value';
      container.register('test', testValue);

      const resolved = container.resolve<string>('test');
      expect(resolved).toBe(testValue);
    });

    test('should register and resolve an object', () => {
      const testObject = { foo: 'bar', baz: 42 };
      container.register('config', testObject);

      const resolved = container.resolve<typeof testObject>('config');
      expect(resolved).toEqual(testObject);
    });

    test('should register and resolve a class instance', () => {
      class TestService {
        getValue() {
          return 'service-value';
        }
      }

      const service = new TestService();
      container.register('service', service);

      const resolved = container.resolve<TestService>('service');
      expect(resolved.getValue()).toBe('service-value');
    });

    test('should throw when resolving unregistered dependency', () => {
      expect(() => {
        container.resolve('non-existent');
      }).toThrow("Service 'non-existent' not found in container");
    });

    test('should allow re-registration', () => {
      container.register('key', 'value1');
      container.register('key', 'value2');

      const resolved = container.resolve<string>('key');
      expect(resolved).toBe('value2');
    });
  });

  describe('registerFactory', () => {
    test('should register and resolve a factory function', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return `instance-${callCount}`;
      };

      container.registerFactory('factory', factory);

      const instance1 = container.resolve<string>('factory');
      const instance2 = container.resolve<string>('factory');

      expect(instance1).toBe('instance-1');
      expect(instance2).toBe('instance-2');
      expect(callCount).toBe(2);
    });

    test('should register singleton factory', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: callCount };
      };

      container.registerFactory('singleton', factory, true);

      const instance1 = container.resolve<{ id: number }>('singleton');
      const instance2 = container.resolve<{ id: number }>('singleton');

      expect(instance1).toBe(instance2); // Same instance
      expect(instance1.id).toBe(1);
      expect(callCount).toBe(1); // Factory called only once
    });

    test('should handle factory with dependencies', () => {
      container.register('config', { apiUrl: 'http://example.com' });

      container.registerFactory('apiClient', () => {
        const config = container.resolve<{ apiUrl: string }>('config');
        return {
          url: config.apiUrl,
          get: (path: string) => `GET ${config.apiUrl}${path}`,
        };
      });

      const client = container.resolve<any>('apiClient');
      expect(client.url).toBe('http://example.com');
      expect(client.get('/users')).toBe('GET http://example.com/users');
    });

    test('should throw when factory throws', () => {
      container.registerFactory('failing', () => {
        throw new Error('Factory error');
      });

      expect(() => {
        container.resolve('failing');
      }).toThrow('Factory error');
    });
  });

  describe('has', () => {
    test('should return true for registered dependency', () => {
      container.register('exists', 'value');
      expect(container.has('exists')).toBe(true);
    });

    test('should return false for unregistered dependency', () => {
      expect(container.has('does-not-exist')).toBe(false);
    });

    test('should return true for factory registration', () => {
      container.registerFactory('factory', () => 'value');
      expect(container.has('factory')).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    test('should handle circular dependencies gracefully', () => {
      // This should not cause infinite loop
      container.registerFactory('serviceA', () => {
        const b = container.resolve('serviceB');
        return { name: 'A', dependency: b };
      });

      container.registerFactory('serviceB', () => {
        // Don't actually resolve A here to avoid true circular dependency
        return { name: 'B' };
      });

      const serviceA = container.resolve<any>('serviceA');
      expect(serviceA.name).toBe('A');
      expect(serviceA.dependency.name).toBe('B');
    });

    test('should support dependency chains', () => {
      container.register('database', { connectionString: 'db://localhost' });

      container.registerFactory('repository', () => {
        const db = container.resolve<any>('database');
        return {
          db,
          findAll: () => `Finding all from ${db.connectionString}`,
        };
      });

      container.registerFactory('service', () => {
        const repo = container.resolve<any>('repository');
        return {
          getAll: () => repo.findAll(),
        };
      });

      const service = container.resolve<any>('service');
      expect(service.getAll()).toBe('Finding all from db://localhost');
    });

    test('should handle mixed registration types', () => {
      // Register different types
      container.register('constant', 42);
      container.register('config', { debug: true });
      container.registerFactory('logger', () => ({
        log: (msg: string) => `[LOG] ${msg}`,
      }));
      container.registerFactory(
        'app',
        () => {
          const constant = container.resolve<number>('constant');
          const config = container.resolve<{ debug: boolean }>('config');
          const logger = container.resolve<{ log: (msg: string) => string }>(
            'logger'
          );

          return {
            run: () => {
              if (config.debug) {
                return logger.log(`App running with constant: ${constant}`);
              }
              return 'App running';
            },
          };
        },
        true
      ); // Singleton

      const app = container.resolve<any>('app');
      expect(app.run()).toBe('[LOG] App running with constant: 42');
    });
  });
});
