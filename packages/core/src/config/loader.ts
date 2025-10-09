import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PromptsConfig } from '../types/config.js';

export interface LoadConfigOptions {
  /**
   * Optional absolute or relative path to the prompts.json file.
   * Defaults to <repo root>/data/config/prompts.json resolved from cwd.
   */
  configPath?: string;
  /** Forces the loader to bypass the in-memory cache. */
  forceReload?: boolean;
}

let cachedPath: string | null = null;
let cachedPayload: PromptsConfig | null = null;

// Find workspace root by looking for data/config/prompts.json
// In monorepo: workspace root is 2-3 levels up from app
function findWorkspaceRoot(): string {
  let current = process.cwd();
  const maxLevelsUp = 5;
  
  for (let i = 0; i < maxLevelsUp; i++) {
    const configPath = path.join(current, 'data', 'config', 'prompts.json');
    try {
      // Check if file exists synchronously for performance
      require('fs').accessSync(configPath);
      return current;
    } catch {
      // File doesn't exist, try parent directory
      const parent = path.dirname(current);
      if (parent === current) break; // Reached filesystem root
      current = parent;
    }
  }
  
  // Fallback to cwd
  return process.cwd();
}

const DEFAULT_CONFIG_PATH = path.resolve(
  findWorkspaceRoot(),
  'data',
  'config',
  'prompts.json',
);

export async function loadPromptsConfig(
  options: LoadConfigOptions = {},
): Promise<PromptsConfig> {
  const resolvedPath = path.resolve(options.configPath ?? DEFAULT_CONFIG_PATH);

  if (!options.forceReload && cachedPath === resolvedPath && cachedPayload) {
    return cachedPayload;
  }

  const contents = await fs.readFile(resolvedPath, 'utf-8');
  const parsed = JSON.parse(contents) as PromptsConfig;

  cachedPath = resolvedPath;
  cachedPayload = parsed;

  return parsed;
}
