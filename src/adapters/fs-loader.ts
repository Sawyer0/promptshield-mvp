/**
 * File System Loader - Node.js adapter for loading files and rulepacks
 * Isolates Node.js dependencies (fs, js-yaml) from core engine
 */

import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { IFileReader, RulePack, SchemaValidationError } from '../core/types';

/**
 * Check the structure of a parsed RulePack. Rule contents (patterns,
 * severities, categories) are validated by compileRulePack().
 * @throws SchemaValidationError if the structure is invalid
 */
function validateRulePack(data: unknown): asserts data is RulePack {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SchemaValidationError('RulePack must be a YAML mapping');
  }

  const pack = data as Record<string, unknown>;

  if (typeof pack.name !== 'string' || pack.name.trim() === '') {
    throw new SchemaValidationError('Missing or invalid field: name');
  }
  if (typeof pack.description !== 'string') {
    throw new SchemaValidationError('Missing or invalid field: description');
  }
  if (!Array.isArray(pack.rules)) {
    throw new SchemaValidationError(
      'Missing or invalid field: rules (must be a list)'
    );
  }

  pack.rules.forEach((rule: unknown, i: number) => {
    if (!rule || typeof rule !== 'object') {
      throw new SchemaValidationError(`Rule at index ${i} is not a mapping`);
    }
    const r = rule as Record<string, unknown>;
    if (typeof r.id !== 'string') {
      throw new SchemaValidationError(
        `Rule at index ${i}: missing or invalid field 'id'`
      );
    }
    if (typeof r.description !== 'string') {
      throw new SchemaValidationError(
        `Rule '${r.id}': missing or invalid field 'description'`
      );
    }
  });
}

/**
 * Node.js implementation of file reading operations
 */
export class NodeFileReader implements IFileReader {
  /**
   * Read a single file as text
   * @param filePath - Path to the file
   * @returns Promise resolving to file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read file '${filePath}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Read multiple files concurrently using Promise.all
   * @param paths - Array of file paths
   * @returns Promise resolving to array of file contents
   */
  async readFiles(paths: string[]): Promise<string[]> {
    return Promise.all(paths.map((p) => this.readFile(p)));
  }

  /**
   * Load and parse a YAML rulepack file with strict validation
   * @param filePath - Path to the YAML file
   * @returns Promise resolving to parsed and validated RulePack
   * @throws SchemaValidationError if the rulepack format is invalid
   */
  async loadRulePack(filePath: string): Promise<RulePack> {
    try {
      const content = await this.readFile(filePath);
      const data = yaml.load(content);

      // Validate schema
      validateRulePack(data);

      return data;
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        throw new SchemaValidationError(
          `Invalid rulepack format in '${filePath}': ${error.message}`,
          error.details
        );
      }
      throw new Error(
        `Failed to load rulepack from '${filePath}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if a file exists
   * @param filePath - Path to check
   * @returns Promise resolving to boolean
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load all rulepacks from a directory
   * @param dirPath - Path to directory containing YAML files
   * @returns Promise resolving to array of RulePacks
   */
  async loadRulePacksFromDirectory(dirPath: string): Promise<RulePack[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const yamlFiles = entries
        .filter(
          (entry) =>
            entry.isFile() &&
            (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))
        )
        .map((entry) => path.join(dirPath, entry.name));

      // Load all rulepacks concurrently
      const packs = await Promise.all(
        yamlFiles.map((file) => this.loadRulePack(file))
      );

      return packs;
    } catch (error) {
      throw new Error(
        `Failed to load rulepacks from directory '${dirPath}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
