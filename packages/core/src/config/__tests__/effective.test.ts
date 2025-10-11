import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeConfigLayers,
  DEFAULT_FALLBACK_CONFIG,
} from '../merger';
import {
  resolveEffectiveConfig,
} from '../effective-core';
import type {
  BrandPackConfig,
  PartialConfig,
} from '../validator';

test('mergeConfigLayers respects precedence, deep merge, array replace, null ignored', () => {
  const fallback = clone(DEFAULT_FALLBACK_CONFIG);
  fallback.global.provider = 'fallback';
  fallback.global.cache_ttl_seconds = { scrape: 10, llm: 10, image: 10 };
  fallback.banned_phrases = ['fallback'];

  const base = createBaseConfig();
  base.global.cache_ttl_seconds = { scrape: 20, llm: 20, image: 20 };
  base.banned_phrases = ['base'];
  base.calls['ideas.generate'].prompt.variables = ['base'];

  const preset = ({
    global: {
      log_level: 'debug',
      cache_ttl_seconds: { llm: 30 } as any,
    },
    banned_phrases: ['preset'],
    calls: {
      'ideas.generate': {
        model: { temperature: 0.7 } as any,
      },
    },
  }) as PartialConfig;

  const override = ({
    global: {
      provider: 'override',
      log_level: null as any,
      cache_ttl_seconds: { image: 40 } as any,
    },
    banned_phrases: ['override'],
    calls: {
      'ideas.generate': {
        model: { temperature: 0.9 } as any,
        prompt: { variables: ['override'] } as any,
      },
    },
  }) as PartialConfig;

  const result = mergeConfigLayers({
    fallback,
    base,
    preset,
    override,
  });

  assert.equal(result.global.provider, 'override', 'override wins provider');
  assert.equal(result.global.log_level, 'debug', 'null override ignored so preset remains');
  assert.deepEqual(
    result.global.cache_ttl_seconds,
    { scrape: 20, llm: 30, image: 40 },
    'objects merge while numbers override',
  );
  assert.deepEqual(result.banned_phrases, ['override'], 'arrays replace rather than merge');
  assert.equal(
    result.calls['ideas.generate'].model.temperature,
    0.9,
    'deep merge updates nested scalar',
  );
  assert.deepEqual(
    result.calls['ideas.generate'].prompt.variables,
    ['override'],
    'array replacement inside nested object',
  );
});

test('resolveEffectiveConfig produces expected call config for preset and overrides', () => {
  const config = createBaseConfig();
  config.presets = {
    balanced: {
      description: 'Balanced choice',
      overrides: {
        global: {
          log_level: 'debug',
        } as any,
        calls: {
          'ideas.generate': {
            prompt: { outputs_expected: 25 } as any,
          },
        },
      } as PartialConfig,
    },
  };

  const overrides = ({
    calls: {
      'ideas.generate': {
        model: { temperature: 0.85 } as any,
        prompt: { variables: ['final'] } as any,
      },
    },
  }) as PartialConfig;

  const result = resolveEffectiveConfig(config, 'ideas.generate', {
    preset: 'balanced',
    overrides,
  });

  assert.equal(result.global.log_level, 'debug', 'preset applied');
  assert.equal(result.call.model.temperature, 0.85, 'override applied to call model');
  assert.deepEqual(result.call.prompt.variables, ['final'], 'override replaces array');
  assert.equal(result.call.prompt.outputs_expected, 25, 'preset override merged into prompt');
  assert.strictEqual(result.layers.preset, config.presets.balanced.overrides, 'preset layer reported');
  assert.strictEqual(result.layers.override, overrides, 'override layer reported');
});

function createBaseConfig(): BrandPackConfig {
  return {
    version: '1.0.0',
    updated_at: '2025-01-15T00:00:00Z',
    global: {
      provider: 'anthropic',
      log_level: 'info',
      cache_enabled: true,
      cache_ttl_seconds: {
        scrape: 60,
        llm: 60,
        image: 60,
      },
    },
    calls: {
      'ideas.generate': {
        model: {
          provider: 'anthropic',
          name: 'claude',
          temperature: 0.6,
          max_tokens: 2000,
        },
        prompt: {
          system: 'system prompt',
          user_template: 'user prompt',
          variables: ['base'],
          outputs_expected: 20,
        },
        runtime: {
          timeout_ms: 10000,
          max_retries: 1,
          cost_usd_limit: 1,
        },
      },
    },
    validation: {
      length: {
        min_chars: 50,
        max_chars: 300,
      },
      continuity: {
        enabled: true,
        thresholds: {
          tone_shift: 0.3,
          fact_drift: 0.2,
        },
      },
      evidence_policy: {
        required_for: ['ideas'],
        allow_empty: false,
      },
    },
    budgets: {
      max_cost_per_run: 5,
      max_tokens_per_run: 5000,
      alert_threshold_usd: 4,
      per_stage: {
        'ideas.generate': {
          max_cost: 1,
          max_tokens: 2000,
        },
      },
    },
    presets: {},
    banned_phrases: [],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
