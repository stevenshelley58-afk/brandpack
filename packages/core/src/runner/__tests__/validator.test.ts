/**
 * Validator Tests
 * 
 * Tests for output validation functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateIdeas,
  validateCopy,
  validateImageBrief,
  validateTaskOutput,
} from '../validator.js';
import type { PromptsConfig } from '../../types/config.js';

// Mock config with validation rules
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
        system: 'System',
        user_template: 'User',
        variables: [],
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
        system: 'System',
        user_template: 'User',
        variables: [],
        outputs_expected: 5,
      },
      runtime: {
        timeout_ms: 35000,
        max_retries: 1,
        cost_usd_limit: 2.0,
      },
    },
  },
  validation: {
    banned_phrases: ['revolutionary', 'game-changing', 'leverage'],
  },
};

describe('validator', () => {
  describe('validateIdeas', () => {
    it('should pass with exactly 20 valid ideas', () => {
      const ideas = Array.from({ length: 20 }, (_, i) => ({
        headline: `Idea ${i + 1}`,
        angle: 'benefit-focused',
        audience: 'marketers',
        format: 'social',
        supporting_evidence_keys: ['proof.metrics'],
      }));

      const result = validateIdeas(ideas, mockConfig);

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should fail if not exactly 20 ideas', () => {
      const ideas = Array.from({ length: 15 }, (_, i) => ({
        headline: `Idea ${i + 1}`,
        angle: 'benefit-focused',
        audience: 'marketers',
        format: 'social',
        supporting_evidence_keys: ['proof.metrics'],
      }));

      const result = validateIdeas(ideas, mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors[0].includes('Expected exactly 20'));
    });

    it('should fail if ideas is not an array', () => {
      const result = validateIdeas({ notAnArray: true } as any, mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors[0].includes('must be an array'));
    });

    it('should fail if idea missing required fields', () => {
      const ideas = Array.from({ length: 20 }, () => ({
        headline: 'Test',
        // Missing angle, audience, format, supporting_evidence_keys
      }));

      const result = validateIdeas(ideas, mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('missing required field')));
    });

    it('should warn if idea contains banned phrases', () => {
      const ideas = Array.from({ length: 20 }, () => ({
        headline: 'This is a revolutionary game-changing solution',
        angle: 'benefit-focused',
        audience: 'marketers',
        format: 'social',
        supporting_evidence_keys: ['proof.metrics'],
      }));

      const result = validateIdeas(ideas, mockConfig);

      // Should still pass but with warnings
      assert.strictEqual(result.passed, true);
      assert.ok(result.warnings.some(w => w.includes('banned phrases')));
    });

    it('should warn if idea has no evidence keys', () => {
      const ideas = Array.from({ length: 20 }, () => ({
        headline: 'Test',
        angle: 'benefit-focused',
        audience: 'marketers',
        format: 'social',
        supporting_evidence_keys: [],
      }));

      const result = validateIdeas(ideas, mockConfig);

      assert.strictEqual(result.passed, true);
      assert.ok(result.warnings.some(w => w.includes('empty evidence keys')));
    });
  });

  describe('validateCopy', () => {
    it('should pass with valid 5-block copy structure', () => {
      const copy = [
        {
          hook: {
            text: 'This is a compelling hook that grabs attention immediately.',
            character_count: 60,
            evidence_keys: ['proof.metrics'],
          },
          context: {
            text: 'Context provides background and sets up the problem. This section explains why the reader should care about what comes next.',
            character_count: 140,
            evidence_keys: ['audience'],
          },
          proof: {
            text: 'Proof backs up claims with data and testimonials. We helped 10,000+ customers achieve 95% satisfaction rates with our solution.',
            character_count: 145,
            evidence_keys: ['proof.customers', 'proof.metrics'],
          },
          objection: {
            text: 'But what about cost? Actually, our pricing is designed for growing teams, with flexible plans that scale.',
            character_count: 120,
            evidence_keys: ['pricing_cues'],
          },
          cta: {
            text: 'Start your free trial today. No credit card required.',
            character_count: 60,
            evidence_keys: ['pricing_cues.tiers'],
          },
        },
      ];

      const result = validateCopy(copy, mockConfig);

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should fail if not a single-object array', () => {
      const result = validateCopy([], mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors[0].includes('single object'));
    });

    it('should fail if missing required blocks', () => {
      const copy = [
        {
          hook: { text: 'Test', character_count: 4, evidence_keys: [] },
          // Missing context, proof, objection, cta
        },
      ];

      const result = validateCopy(copy, mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('Missing required copy block')));
    });

    it('should fail if block missing text field', () => {
      const copy = [
        {
          hook: { character_count: 4, evidence_keys: [] },
          context: { text: 'Test', character_count: 4, evidence_keys: [] },
          proof: { text: 'Test', character_count: 4, evidence_keys: [] },
          objection: { text: 'Test', character_count: 4, evidence_keys: [] },
          cta: { text: 'Test', character_count: 4, evidence_keys: [] },
        },
      ];

      const result = validateCopy(copy, mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('missing text field')));
    });

    it('should warn if block too short', () => {
      const copy = [
        {
          hook: { text: 'Short', character_count: 5, evidence_keys: [] },
          context: { text: 'X'.repeat(110), character_count: 110, evidence_keys: [] },
          proof: { text: 'X'.repeat(110), character_count: 110, evidence_keys: [] },
          objection: { text: 'X'.repeat(90), character_count: 90, evidence_keys: [] },
          cta: { text: 'X'.repeat(40), character_count: 40, evidence_keys: [] },
        },
      ];

      const result = validateCopy(copy, mockConfig);

      assert.strictEqual(result.passed, true);
      assert.ok(result.warnings.some(w => w.includes('too short')));
    });

    it('should warn if block contains banned phrases', () => {
      const copy = [
        {
          hook: {
            text: 'This revolutionary game-changing solution will leverage your growth.',
            character_count: 68,
            evidence_keys: [],
          },
          context: { text: 'X'.repeat(110), character_count: 110, evidence_keys: [] },
          proof: { text: 'X'.repeat(110), character_count: 110, evidence_keys: [] },
          objection: { text: 'X'.repeat(90), character_count: 90, evidence_keys: [] },
          cta: { text: 'X'.repeat(40), character_count: 40, evidence_keys: [] },
        },
      ];

      const result = validateCopy(copy, mockConfig);

      assert.strictEqual(result.passed, true);
      assert.ok(result.warnings.some(w => w.includes('banned phrases')));
    });
  });

  describe('validateImageBrief', () => {
    it('should pass with valid 4:5 brief and safe zones', () => {
      const brief = [
        {
          aspect_ratio: '4:5',
          safe_zone_top: 0.15,
          safe_zone_bottom: 0.15,
          visual_direction: 'Modern, clean design with brand colors',
          focal_point: 'Center with product hero shot',
          copy_overlay_guidance: 'Place CTA in bottom safe zone',
          evidence_keys: ['products', 'tone'],
        },
      ];

      const result = validateImageBrief(brief, mockConfig);

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should fail if not a single object', () => {
      const result = validateImageBrief([], mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors[0].includes('single object'));
    });

    it('should fail if aspect ratio is not 4:5', () => {
      const brief = [
        {
          aspect_ratio: '16:9',
          safe_zone_top: 0.15,
          safe_zone_bottom: 0.15,
          visual_direction: 'Test',
          focal_point: 'Test',
          copy_overlay_guidance: 'Test',
          evidence_keys: [],
        },
      ];

      const result = validateImageBrief(brief, mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors[0].includes('aspect_ratio must be "4:5"'));
    });

    it('should fail if safe zones < 15%', () => {
      const brief = [
        {
          aspect_ratio: '4:5',
          safe_zone_top: 0.10,
          safe_zone_bottom: 0.10,
          visual_direction: 'Test',
          focal_point: 'Test',
          copy_overlay_guidance: 'Test',
          evidence_keys: [],
        },
      ];

      const result = validateImageBrief(brief, mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('safe_zone_top')));
      assert.ok(result.errors.some(e => e.includes('safe_zone_bottom')));
    });

    it('should fail if missing required fields', () => {
      const brief = [
        {
          aspect_ratio: '4:5',
          safe_zone_top: 0.15,
          safe_zone_bottom: 0.15,
          // Missing visual_direction, focal_point, copy_overlay_guidance
        },
      ];

      const result = validateImageBrief(brief, mockConfig);

      assert.strictEqual(result.passed, false);
      assert.ok(result.errors.some(e => e.includes('Missing required field')));
    });

    it('should warn if no evidence keys', () => {
      const brief = [
        {
          aspect_ratio: '4:5',
          safe_zone_top: 0.15,
          safe_zone_bottom: 0.15,
          visual_direction: 'Test',
          focal_point: 'Test',
          copy_overlay_guidance: 'Test',
          evidence_keys: [],
        },
      ];

      const result = validateImageBrief(brief, mockConfig);

      assert.strictEqual(result.passed, true);
      assert.ok(result.warnings.some(w => w.includes('no evidence keys')));
    });
  });

  describe('validateTaskOutput', () => {
    it('should route to correct validator for ideas', () => {
      const ideas = Array.from({ length: 20 }, () => ({
        headline: 'Test',
        angle: 'benefit',
        audience: 'marketers',
        format: 'social',
        supporting_evidence_keys: ['proof'],
      }));

      const result = validateTaskOutput('ideas.generate', ideas, mockConfig);

      assert.strictEqual(result.passed, true);
    });

    it('should route to correct validator for copy', () => {
      const copy = [
        {
          hook: { text: 'X'.repeat(60), character_count: 60, evidence_keys: [] },
          context: { text: 'X'.repeat(110), character_count: 110, evidence_keys: [] },
          proof: { text: 'X'.repeat(110), character_count: 110, evidence_keys: [] },
          objection: { text: 'X'.repeat(90), character_count: 90, evidence_keys: [] },
          cta: { text: 'X'.repeat(40), character_count: 40, evidence_keys: [] },
        },
      ];

      const result = validateTaskOutput('copy.generate', copy, mockConfig);

      assert.strictEqual(result.passed, true);
    });

    it('should route to correct validator for image brief', () => {
      const brief = [
        {
          aspect_ratio: '4:5',
          safe_zone_top: 0.15,
          safe_zone_bottom: 0.15,
          visual_direction: 'Test',
          focal_point: 'Test',
          copy_overlay_guidance: 'Test',
          evidence_keys: [],
        },
      ];

      const result = validateTaskOutput('image.brief_generate', brief, mockConfig);

      assert.strictEqual(result.passed, true);
    });

    it('should pass for unknown task types', () => {
      const result = validateTaskOutput('unknown.task', [], mockConfig);

      assert.strictEqual(result.passed, true);
      assert.ok(result.warnings.some(w => w.includes('No validator defined')));
    });
  });
});

