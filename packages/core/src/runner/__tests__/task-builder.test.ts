/**
 * Task Builder Tests
 * 
 * Tests for buildSpec functions that create LLMSpecs from config
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildIdeasGenerateSpec,
  buildCopyGenerateSpec,
  buildImageBriefSpec,
  getCallConfig,
} from '../task-builder.js';
import type { PromptsConfig } from '../../types/config.js';
import type { KernelPayload } from '../../kernel/compressor.js';

// Mock config matching actual prompts.json structure
const mockConfig: PromptsConfig = {
  version: '2.0.0',
  updated_at: '2025-01-01T00:00:00Z',
  global: {
    provider: 'anthropic',
    log_level: 'info',
    cache_enabled: true,
  },
  calls: {
    'ideas.generate': {
      model: {
        provider: 'anthropic',
        name: 'claude-3-5-sonnet-20241022',
        temperature: 0.9,
        max_tokens: 3500,
      },
      prompt: {
        system: 'You are a creative strategist.',
        user_template: 'Brand kernel:\n{kernel}\n\nProduce 20 ideas.',
        variables: ['kernel'],
        outputs_expected: 20,
      },
      runtime: {
        timeout_ms: 30000,
        max_retries: 1,
        cost_usd_limit: 1.5,
      },
    },
    'copy.generate': {
      model: {
        provider: 'anthropic',
        name: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        max_tokens: 4500,
      },
      prompt: {
        system: 'You are a copywriter.',
        user_template: 'Kernel:\n{kernel}\n\nIdea:\n{idea}\n\nReturn 5 blocks.',
        variables: ['kernel', 'idea'],
        outputs_expected: 5,
      },
      runtime: {
        timeout_ms: 35000,
        max_retries: 1,
        cost_usd_limit: 2.0,
      },
    },
    'image.brief_generate': {
      model: {
        provider: 'openai',
        name: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 1200,
      },
      prompt: {
        system: 'You are an art director.',
        user_template: 'Kernel:\n{kernel}\n\nIdea:\n{idea}\n\nReturn brief.',
        variables: ['kernel', 'idea'],
        outputs_expected: 1,
      },
      runtime: {
        timeout_ms: 25000,
        max_retries: 1,
        cost_usd_limit: 0.75,
      },
    },
  },
};

// Mock kernel
const mockKernel: KernelPayload = {
  domain: 'example.com',
  content_hash: 'abc123',
  products: ['Product A', 'Product B'],
  tone: ['professional', 'friendly'],
  audience: 'marketers',
  proof_points: {
    customers: ['10,000+ customers'],
    metrics: ['95% satisfaction'],
    certifications: ['SOC 2'],
  },
  pricing_cues: {
    tiers: ['Free', 'Pro', 'Enterprise'],
    positioning: 'for growing teams',
  },
  competitors_implied: [],
  unique_angle: 'Only platform with X',
  compressed_kb: 1.8,
  citations: {},
  created_at: '2025-01-01T00:00:00Z',
};

// Mock idea
const mockIdea = {
  headline: 'Test Campaign',
  angle: 'benefit-focused',
  audience: 'marketers',
  format: 'social',
  supporting_evidence_keys: ['proof.metrics'],
};

describe('task-builder', () => {
  describe('buildIdeasGenerateSpec', () => {
    it('should create valid spec for ideas generation', () => {
      const spec = buildIdeasGenerateSpec(mockConfig, mockKernel, 'test-run-123');

      assert.strictEqual(spec.task_id, 'ideas.generate');
      assert.strictEqual(spec.system_prompt, 'You are a creative strategist.');
      assert.ok(spec.user_prompt.includes('example.com'));
      assert.ok(spec.user_prompt.includes('Product A'));
      assert.strictEqual(spec.response_format, 'json');
      assert.strictEqual(spec.constraints.max_tokens, 3500);
      assert.strictEqual(spec.constraints.temperature, 0.9);
      assert.strictEqual(spec.metadata?.run_id, 'test-run-123');
      assert.strictEqual(spec.metadata?.domain, 'example.com');
    });

    it('should interpolate kernel into user prompt', () => {
      const spec = buildIdeasGenerateSpec(mockConfig, mockKernel);

      assert.ok(spec.user_prompt.includes('example.com'));
      assert.ok(spec.user_prompt.includes('"products"'));
      assert.ok(spec.user_prompt.includes('"tone"'));
    });

    it('should throw if call config is missing', () => {
      const badConfig = { ...mockConfig, calls: {} };

      assert.throws(
        () => buildIdeasGenerateSpec(badConfig, mockKernel),
        /ideas.generate not found/
      );
    });
  });

  describe('buildCopyGenerateSpec', () => {
    it('should create valid spec for copy generation', () => {
      const spec = buildCopyGenerateSpec(mockConfig, mockKernel, mockIdea, 'test-run-456');

      assert.strictEqual(spec.task_id, 'copy.generate');
      assert.strictEqual(spec.system_prompt, 'You are a copywriter.');
      assert.ok(spec.user_prompt.includes('example.com'));
      assert.ok(spec.user_prompt.includes('Test Campaign'));
      assert.strictEqual(spec.response_format, 'json');
      assert.strictEqual(spec.constraints.max_tokens, 4500);
      assert.strictEqual(spec.constraints.temperature, 0.7);
      assert.strictEqual(spec.metadata?.run_id, 'test-run-456');
    });

    it('should interpolate both kernel and idea', () => {
      const spec = buildCopyGenerateSpec(mockConfig, mockKernel, mockIdea);

      assert.ok(spec.user_prompt.includes('example.com'));
      assert.ok(spec.user_prompt.includes('Test Campaign'));
      assert.ok(spec.user_prompt.includes('benefit-focused'));
    });
  });

  describe('buildImageBriefSpec', () => {
    it('should create valid spec for image brief', () => {
      const spec = buildImageBriefSpec(mockConfig, mockKernel, mockIdea, 'test-run-789');

      assert.strictEqual(spec.task_id, 'image.brief_generate');
      assert.strictEqual(spec.system_prompt, 'You are an art director.');
      assert.ok(spec.user_prompt.includes('example.com'));
      assert.ok(spec.user_prompt.includes('Test Campaign'));
      assert.strictEqual(spec.response_format, 'json');
      assert.strictEqual(spec.constraints.max_tokens, 1200);
      assert.strictEqual(spec.constraints.temperature, 0.8);
      assert.strictEqual(spec.metadata?.run_id, 'test-run-789');
    });
  });

  describe('getCallConfig', () => {
    it('should return config for a valid call', () => {
      const config = getCallConfig(mockConfig, 'ideas.generate');

      assert.strictEqual(config.provider, 'anthropic');
      assert.strictEqual(config.model, 'claude-3-5-sonnet-20241022');
      assert.deepStrictEqual(config.runtime, {
        timeout_ms: 30000,
        max_retries: 1,
        cost_usd_limit: 1.5,
      });
    });

    it('should throw if call not found', () => {
      assert.throws(
        () => getCallConfig(mockConfig, 'invalid.call'),
        /invalid.call not found/
      );
    });

    it('should return correct provider for each call', () => {
      const ideasConfig = getCallConfig(mockConfig, 'ideas.generate');
      const imageConfig = getCallConfig(mockConfig, 'image.brief_generate');

      assert.strictEqual(ideasConfig.provider, 'anthropic');
      assert.strictEqual(imageConfig.provider, 'openai');
    });
  });
});

