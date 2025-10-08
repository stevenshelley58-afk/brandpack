"use server";

import ControlConsole from './ControlConsole';
import {
  loadPromptsConfig,
  validateConfig,
  type BrandPackConfig,
} from '@brandpack/core/config';

export default async function ControlPage() {
  const raw = await loadPromptsConfig();
  const result = validateConfig(raw);

  if (!result.valid || !result.config) {
    throw new Error(
      `Invalid prompts configuration: ${result.errors
        .map((err) => `${err.path}: ${err.message}`)
        .join('; ')}`,
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          Control Console
        </h1>
        <p className="text-sm text-gray-600">
          Configure pipeline stages, inspect merge layers, and preview the
          effective configuration in real time.
        </p>
      </header>
      <ControlConsole initialConfig={result.config as BrandPackConfig} />
    </div>
  );
}
