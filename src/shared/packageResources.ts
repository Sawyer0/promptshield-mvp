import * as fs from 'fs';
import * as path from 'path';

/**
 * Root of the installed @dawans/promptshield package.
 * Resolves from both src/shared (ts-jest) and dist/shared (built CLI).
 */
const PACKAGE_ROOT = path.join(__dirname, '..', '..');

/**
 * Version from package.json, so the CLI and reports never drift from the
 * published version.
 */
export const PACKAGE_VERSION: string = readPackageVersion();

/** Directory holding the RulePacks shipped with the package. */
export const BUNDLED_RULEPACKS_DIR = path.join(PACKAGE_ROOT, 'rulepacks');

/** Names of the RulePacks shipped in the package's rulepacks/ directory. */
export const BUNDLED_RULEPACKS = [
  'prompt-injection',
  'pii',
  'bias',
  'hallucination',
] as const;

/**
 * Resolves a --rulepack value. An existing path is returned unchanged; a
 * bundled RulePack name such as "pii" resolves to the copy shipped with the
 * package, so `promptshield scan file.txt -r pii` works after a global install.
 */
export function resolveRulePackPath(
  value: string | undefined
): string | undefined {
  if (!value || fs.existsSync(value)) {
    return value;
  }
  const name = value.replace(/\.ya?ml$/, '');
  if ((BUNDLED_RULEPACKS as readonly string[]).includes(name)) {
    const bundled = path.join(BUNDLED_RULEPACKS_DIR, `${name}.yaml`);
    if (fs.existsSync(bundled)) {
      return bundled;
    }
  }
  return value;
}

function readPackageVersion(): string {
  try {
    const manifestPath = path.join(PACKAGE_ROOT, 'package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      version?: unknown;
    };
    return typeof manifest.version === 'string' ? manifest.version : 'unknown';
  } catch {
    return 'unknown';
  }
}
