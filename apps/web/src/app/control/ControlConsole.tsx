'use client';

import { useMemo, useState } from 'react';
import { resolveEffectiveConfig, mergeConfigLayers } from '@brandpack/core';
import type { BrandPackConfig, PartialConfig } from '@brandpack/core/config';

type TabKey = 'Calls' | 'Scrape' | 'System' | 'Presets';
type FieldKind = 'text' | 'textarea' | 'number' | 'list';

interface FieldDescriptor {
  label: string;
  kind: FieldKind;
  path: (callId: string) => (string | number)[];
  description?: string;
  min?: number;
  max?: number;
  step?: number;
}

interface FieldGroup {
  title: string;
  description?: string;
  fields: FieldDescriptor[];
}

const CALLS = [
  { id: 'scrape.review_summarize', label: 'Scrape - Review Summarize' },
  { id: 'ideas.generate', label: 'Ideas - Generate' },
  { id: 'copy.generate', label: 'Copy - Generate' },
  { id: 'image.brief_generate', label: 'Image - Brief Generate' },
  { id: 'image.asset_generate', label: 'Image - Asset Generate' },
] as const;

const GROUPS: FieldGroup[] = [
  {
    title: 'Prompt',
    fields: [
      {
        label: 'System Prompt',
        kind: 'textarea',
        description: 'Instruction context for the model.',
        path: (id) => ['calls', id, 'prompt', 'system'],
      },
      {
        label: 'User Template',
        kind: 'textarea',
        path: (id) => ['calls', id, 'prompt', 'user_template'],
      },
      {
        label: 'Template Variables',
        kind: 'list',
        description: 'Comma-separated variable names.',
        path: (id) => ['calls', id, 'prompt', 'variables'],
      },
      {
        label: 'Expected Outputs',
        kind: 'number',
        min: 0,
        step: 1,
        path: (id) => ['calls', id, 'prompt', 'outputs_expected'],
      },
    ],
  },
  {
    title: 'Model',
    fields: [
      { label: 'Provider', kind: 'text', path: (id) => ['calls', id, 'model', 'provider'] },
      { label: 'Model Name', kind: 'text', path: (id) => ['calls', id, 'model', 'name'] },
      {
        label: 'Temperature',
        kind: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        description: 'Range 0-1. Higher = more variance.',
        path: (id) => ['calls', id, 'model', 'temperature'],
      },
      {
        label: 'Max Tokens',
        kind: 'number',
        min: 0,
        step: 50,
        path: (id) => ['calls', id, 'model', 'max_tokens'],
      },
    ],
  },
  {
    title: 'Runtime',
    fields: [
      { label: 'Timeout (ms)', kind: 'number', min: 0, step: 100, path: (id) => ['calls', id, 'runtime', 'timeout_ms'] },
      { label: 'Max Retries', kind: 'number', min: 0, step: 1, path: (id) => ['calls', id, 'runtime', 'max_retries'] },
      {
        label: 'Cost Limit (USD)',
        kind: 'number',
        min: 0,
        step: 0.1,
        path: (id) => ['calls', id, 'runtime', 'cost_usd_limit'],
      },
    ],
  },
  {
    title: 'Budgets',
    description: 'Stage-specific caps override global run budgets.',
    fields: [
      { label: 'Max Cost Per Call', kind: 'number', min: 0, step: 0.1, path: (id) => ['budgets', 'per_stage', id, 'max_cost'] },
      { label: 'Max Tokens Per Call', kind: 'number', min: 0, step: 100, path: (id) => ['budgets', 'per_stage', id, 'max_tokens'] },
    ],
  },
];

interface ControlConsoleProps {
  initialConfig: BrandPackConfig;
}

export default function ControlConsole({ initialConfig }: ControlConsoleProps) {
  const [tab, setTab] = useState<TabKey>('Calls');
  const [expanded, setExpanded] = useState<Set<string>>(new Set([CALLS[0].id]));
  const [previewCall, setPreviewCall] = useState<string>(CALLS[0].id);
  const [baseConfig, setBaseConfig] = useState(initialConfig);
  const [draftOverrides, setDraftOverrides] = useState<PartialConfig>({});
  const [appliedOverrides, setAppliedOverrides] = useState<PartialConfig>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const presetNames = Object.keys(initialConfig.presets ?? {});
  const [selectedPreset, setSelectedPreset] = useState<string | ''>(
    presetNames[0] ?? '',
  );

  const combinedOverrides = useMemo(
    () => mergePartials(appliedOverrides, draftOverrides),
    [appliedOverrides, draftOverrides],
  );

  const effectiveByCall = useMemo(() => {
    const map: Record<string, ReturnType<typeof resolveEffectiveConfig>> = {};
    for (const call of CALLS) {
      map[call.id] = resolveEffectiveConfig(baseConfig, call.id, {
        overrides: combinedOverrides,
        preset: selectedPreset || undefined,
      });
    }
    return map;
  }, [baseConfig, combinedOverrides, selectedPreset]);

  const handleFieldChange = (
    path: (string | number)[],
    kind: FieldKind,
    raw: string,
  ) => {
    const parsed = parseInput(kind, raw);
    if (parsed === undefined) {
      return;
    }
    setDraftOverrides((prev) => setPartialValue(prev, path, parsed));
  };

  const applyCallOverrides = (callId: string, label: string) => {
    const slice = extractCallPartial(draftOverrides, callId);
    if (isPartialEmpty(slice)) {
      setFeedback(`No pending edits for ${label}.`);
      return;
    }
    setAppliedOverrides((prev) => mergePartials(prev, slice));
    setDraftOverrides((prev) => clearCallPartial(prev, callId));
    setFeedback(`Overrides applied for ${label} (mock store).`);
  };

  const saveCallOverrides = (callId: string, label: string) => {
    const pending = mergePartials(
      extractCallPartial(appliedOverrides, callId),
      extractCallPartial(draftOverrides, callId),
    );
    if (isPartialEmpty(pending)) {
      setFeedback(`No changes to persist for ${label}.`);
      return;
    }
    const nextConfig = mergeConfigLayers({
      fallback: baseConfig,
      base: baseConfig,
      override: pending,
    });
    setBaseConfig(nextConfig);
    setAppliedOverrides((prev) => clearCallPartial(prev, callId));
    setDraftOverrides((prev) => clearCallPartial(prev, callId));
    setFeedback(`${label} defaults saved (mock prompts.json).`);
  };

  const renderCallsTab = () => (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="space-y-4">
        {CALLS.map((call) => {
          const open = expanded.has(call.id);
          const merged = effectiveByCall[call.id]?.merged ?? baseConfig;
          return (
            <section
              key={call.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => {
                  const next = new Set(expanded);
                  if (open) {
                    next.delete(call.id);
                  } else {
                    next.add(call.id);
                  }
                  setExpanded(next);
                  setPreviewCall(call.id);
                }}
              >
                <span>{call.label}</span>
                <span className="text-xs uppercase tracking-wide text-gray-500">
                  {open ? 'Hide' : 'Show'}
                </span>
              </button>
              {open ? (
                <div className="space-y-5 border-t border-gray-200 px-4 py-5">
                  {GROUPS.map((group) => (
                    <div key={`${call.id}-${group.title}`} className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">
                          {group.title}
                        </h3>
                        {group.description ? (
                          <p className="text-xs text-gray-500">{group.description}</p>
                        ) : null}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {group.fields.map((field) => {
                          const path = field.path(call.id);
                          const live = getValueByPath(merged, path);
                          const value = formatValue(field.kind, live);
                          const warning = getWarning(field, live);
                          return (
                            <div key={path.join('.')} className="space-y-1">
                              <label className="text-xs font-medium text-gray-700">
                                {field.label}
                              </label>
                              {renderInput({
                                field,
                                value,
                                onChange: (next) => handleFieldChange(path, field.kind, next),
                              })}
                              {warning ? (
                                <p className="text-xs text-amber-600">{warning}</p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => applyCallOverrides(call.id, call.label)}
                    >
                      Apply to This Run
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => saveCallOverrides(call.id, call.label)}
                    >
                      Save as Default
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <aside className="sticky top-24 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Effective Config
              </h2>
              <p className="text-xs text-gray-500">
                Fallback → prompts → preset → overrides
              </p>
            </div>
            {presetNames.length > 0 ? (
              <select
                value={selectedPreset}
                onChange={(event) => setSelectedPreset(event.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              >
                {presetNames.map((name) => (
                  <option key={name} value={name}>
                    Preset: {name}
                  </option>
                ))}
                <option value="">Preset: none</option>
              </select>
            ) : null}
          </div>
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Call
              </span>
              <select
                value={previewCall}
                onChange={(event) => setPreviewCall(event.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              >
                {CALLS.map((call) => (
                  <option key={call.id} value={call.id}>
                    {call.label}
                  </option>
                ))}
              </select>
            </div>
            <pre className="max-h-[28rem] overflow-auto rounded bg-gray-900 px-3 py-2 text-xs text-gray-100">
              {JSON.stringify(effectiveByCall[previewCall]?.call ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </aside>
    </div>
  );

  const renderScrapeTab = () => {
    const crawl =
      effectiveByCall['scrape.review_summarize']?.call.runtime?.crawl;
    return (
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-gray-900">Crawl Caps</h2>
          <p className="text-sm text-gray-600">
            These values enforce the 6-page / 300 KB limits and concurrency
            guardrails from the product spec.
          </p>
        </header>
        <dl className="grid gap-4 sm:grid-cols-2">
          {crawl
            ? Object.entries(crawl).map(([key, value]) => (
                <div key={key} className="rounded-md bg-gray-50 p-4">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {String(value)}
                  </dd>
                </div>
              ))
            : null}
        </dl>
        <p className="text-xs text-gray-500">
          Runtime overrides for this stage can be edited from the Calls tab.
        </p>
      </section>
    );
  };

  const renderSystemTab = () => (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-gray-900">System Defaults</h2>
        <p className="text-sm text-gray-600">
          Global provider, caching, and validation controls sourced from prompts.json.
        </p>
      </header>
      <dl className="grid gap-4 sm:grid-cols-2">
        <InfoRow label="Default Provider" value={baseConfig.global.provider} />
        <InfoRow label="Log Level" value={baseConfig.global.log_level} />
        <InfoRow
          label="Cache Enabled"
          value={String(baseConfig.global.cache_enabled)}
        />
        <InfoRow
          label="Min Characters"
          value={String(baseConfig.validation.length.min_chars)}
        />
        <InfoRow
          label="Max Characters"
          value={String(baseConfig.validation.length.max_chars)}
        />
      </dl>
      <p className="text-xs text-gray-500">
        Global overrides will be wired into this panel when write APIs are ready.
      </p>
    </section>
  );

  const renderPresetsTab = () => (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-gray-900">Presets</h2>
        <p className="text-sm text-gray-600">
          Fast, balanced, and full presets map configuration layers onto the Effective Config preview.
        </p>
      </header>
      <ul className="space-y-3">
        {presetNames.length === 0 ? (
          <li className="rounded border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
            No presets defined in prompts.json.
          </li>
        ) : (
          presetNames.map((name) => (
            <li
              key={name}
              className="flex items-start justify-between gap-4 rounded border border-gray-200 px-4 py-3"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
                <p className="text-xs text-gray-500">
                  {baseConfig.presets[name]?.description}
                </p>
              </div>
              <button
                type="button"
                className={`rounded-md px-3 py-2 text-xs font-medium ${
                  selectedPreset === name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() =>
                  setSelectedPreset((prev) => (prev === name ? '' : name))
                }
              >
                {selectedPreset === name ? 'Selected' : 'Preview'}
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );

  return (
    <div className="space-y-6">
      {feedback ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {feedback}
        </div>
      ) : null}
      <nav className="flex gap-3">
        {(['Calls', 'Scrape', 'System', 'Presets'] as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              tab === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {key}
          </button>
        ))}
      </nav>
      {tab === 'Calls' ? renderCallsTab() : null}
      {tab === 'Scrape' ? renderScrapeTab() : null}
      {tab === 'System' ? renderSystemTab() : null}
      {tab === 'Presets' ? renderPresetsTab() : null}
    </div>
  );
}

function renderInput({
  field,
  value,
  onChange,
}: {
  field: FieldDescriptor;
  value: string;
  onChange: (next: string) => void;
}) {
  if (field.kind === 'textarea') {
    return (
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
    );
  }
  const type = field.kind === 'number' ? 'number' : 'text';
  return (
    <input
      type={type}
      value={value}
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
    />
  );
}

function parseInput(kind: FieldKind, raw: string): unknown {
  if (kind === 'number') {
    if (raw.trim() === '') return undefined;
    const value = Number(raw);
    return Number.isNaN(value) ? undefined : value;
  }
  if (kind === 'list') {
    return raw
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
  }
  return raw;
}

function formatValue(kind: FieldKind, value: unknown): string {
  if (value === undefined || value === null) return '';
  if (kind === 'list' && Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  return String(value);
}

function getWarning(field: FieldDescriptor, value: unknown): string | null {
  if (typeof value !== 'number') return null;
  if (value < 0) return 'Value cannot be negative.';
  if (
    field.path('').slice(-1)[0] === 'temperature' &&
    (value < 0 || value > 1)
  ) {
    return 'Temperature must stay within 0-1.';
  }
  return null;
}

function getValueByPath(target: unknown, path: (string | number)[]) {
  return path.reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== 'object') return undefined;
    return (acc as Record<string | number, unknown>)[key];
  }, target);
}

function setPartialValue(
  partial: PartialConfig,
  path: (string | number)[],
  value: unknown,
): PartialConfig {
  return deepSet(partial, path, value) as PartialConfig;
}

function deepSet(
  target: unknown,
  path: (string | number)[],
  value: unknown,
): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const base =
    typeof target === 'object' && target !== null ? { ...(target as any) } : {};
  base[head] = deepSet(base[head], rest, value);
  return base;
}

function mergePartials(
  base: PartialConfig,
  patch: PartialConfig,
): PartialConfig {
  return deepMerge(base, patch) as PartialConfig;
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return structuredCloneOrSelf(base);
  if (
    typeof patch !== 'object' ||
    patch === null ||
    Array.isArray(patch)
  ) {
    return structuredCloneOrSelf(patch);
  }
  const source =
    typeof base === 'object' && base !== null ? base : {};
  const result: Record<string | number, unknown> = {
    ...(source as Record<string | number, unknown>),
  };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = deepMerge((source as any)[key], value);
  }
  return result;
}

function structuredCloneOrSelf<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    return Array.isArray(value)
      ? ([...value] as T)
      : ({ ...(value as Record<string, unknown>) } as T);
  }
  return value;
}

function extractCallPartial(
  partial: PartialConfig,
  callId: string,
): PartialConfig {
  const slice: PartialConfig = {};
  if (partial.calls?.[callId]) {
    slice.calls = { [callId]: partial.calls[callId] } as PartialConfig['calls'];
  }
  if (partial.budgets?.per_stage?.[callId]) {
    slice.budgets = {
      per_stage: {
        [callId]: partial.budgets.per_stage[callId],
      },
    } as PartialConfig['budgets'];
  }
  return slice;
}

function clearCallPartial(
  partial: PartialConfig,
  callId: string,
): PartialConfig {
  const next: PartialConfig = structuredCloneOrSelf(partial);
  if (next.calls?.[callId]) {
    delete next.calls[callId];
    if (next.calls && Object.keys(next.calls).length === 0) {
      delete next.calls;
    }
  }
  if (next.budgets?.per_stage?.[callId]) {
    delete next.budgets.per_stage[callId];
    if (Object.keys(next.budgets.per_stage).length === 0) {
      delete next.budgets.per_stage;
    }
    if (next.budgets && Object.keys(next.budgets).length === 0) {
      delete next.budgets;
    }
  }
  return next;
}

function isPartialEmpty(partial: PartialConfig): boolean {
  return Object.keys(partial).length === 0;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-4">
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}
