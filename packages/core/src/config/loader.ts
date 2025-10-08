import { promises as fs } from 'node:fs';
import path from 'node:path';

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
let cachedPayload: unknown = null;

const DEFAULT_CONFIG_PATH = path.resolve(
  process.cwd(),
  'data',
  'config',
  'prompts.json',
);

export async function loadPromptsConfig(
  options: LoadConfigOptions = {},
): Promise<unknown> {
  const resolvedPath = path.resolve(options.configPath ?? DEFAULT_CONFIG_PATH);

  if (!options.forceReload && cachedPath === resolvedPath && cachedPayload) {
    return cachedPayload;
  }

  const contents = await fs.readFile(resolvedPath, 'utf-8');
  const parsed = JSON.parse(contents);

  cachedPath = resolvedPath;
  cachedPayload = parsed;

  return parsed;
}
