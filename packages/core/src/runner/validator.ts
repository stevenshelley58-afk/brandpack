/**
 * Output Validator - Validation gates for task outputs
 * 
 * Enforces rules from PROJECT_SPEC.md:
 * - Ideas: exactly 20 outputs
 * - Copy: 5 blocks with length constraints
 * - Image: 4:5 aspect ratio with safe zones
 * - Banned phrase detection
 * - Evidence citation checks
 */

import type { PromptsConfig } from '../types/config.js';
import { detectSlop } from '../ranker/slop.js';

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate ideas.generate outputs
 * 
 * Requirements:
 * - Exactly 20 ideas
 * - Each has: headline, angle, audience, format, supporting_evidence_keys
 * - No banned phrases
 */
export function validateIdeas(
  outputs: unknown[],
  config: PromptsConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check count
  const callConfig = config.calls['ideas.generate'];
  const expectedCount = callConfig?.prompt.outputs_expected || 20;
  
  if (!Array.isArray(outputs)) {
    errors.push('Ideas output must be an array');
    return { passed: false, errors, warnings };
  }
  
  if (outputs.length !== expectedCount) {
    errors.push(`Expected exactly ${expectedCount} ideas, got ${outputs.length}`);
  }
  
  // Validate each idea structure
  const requiredFields = ['headline', 'angle', 'audience', 'format', 'supporting_evidence_keys'];
  
  outputs.forEach((idea, index) => {
    if (typeof idea !== 'object' || idea === null) {
      errors.push(`Idea ${index + 1} is not an object`);
      return;
    }
    
    const ideaObj = idea as Record<string, unknown>;
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!(field in ideaObj)) {
        errors.push(`Idea ${index + 1} missing required field: ${field}`);
      }
    });
    
    // Check evidence keys
    if (!Array.isArray(ideaObj.supporting_evidence_keys)) {
      warnings.push(`Idea ${index + 1} has no evidence keys array`);
    } else if (ideaObj.supporting_evidence_keys.length === 0) {
      warnings.push(`Idea ${index + 1} has empty evidence keys`);
    }
    
    // Check for banned phrases
    const headline = String(ideaObj.headline || '');
    const slopCheck = detectSlop(headline, {
      banned_phrases: config.validation?.banned_phrases || [],
      severity: 'warn',
    });
    
    if (slopCheck.length > 0) {
      warnings.push(`Idea ${index + 1} contains banned phrases: ${slopCheck.map(s => s.phrase).join(', ')}`);
    }
  });
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate copy.generate outputs
 * 
 * Requirements:
 * - 5 blocks: hook, context, proof, objection, cta
 * - Each block has character count within min/max
 * - Evidence keys cited
 * - No banned phrases
 * - Narrative continuity (checked via continuity flag)
 */
export function validateCopy(
  outputs: unknown[],
  config: PromptsConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Copy should return a single object with 5 blocks
  if (!Array.isArray(outputs) || outputs.length !== 1) {
    errors.push('Copy output must be a single object with 5 blocks');
    return { passed: false, errors, warnings };
  }
  
  const copyOutput = outputs[0] as Record<string, unknown>;
  const requiredBlocks = ['hook', 'context', 'proof', 'objection', 'cta'];
  
  // Check all blocks exist
  requiredBlocks.forEach(blockName => {
    if (!(blockName in copyOutput)) {
      errors.push(`Missing required copy block: ${blockName}`);
    }
  });
  
  if (errors.length > 0) {
    return { passed: false, errors, warnings };
  }
  
  // Validate each block
  requiredBlocks.forEach(blockName => {
    const block = copyOutput[blockName] as Record<string, unknown>;
    
    if (typeof block !== 'object' || block === null) {
      errors.push(`Block ${blockName} is not an object`);
      return;
    }
    
    // Check for text content
    if (!('text' in block) || typeof block.text !== 'string') {
      errors.push(`Block ${blockName} missing text field`);
      return;
    }
    
    const text = block.text as string;
    const charCount = text.length;
    
    // Length validation (basic ranges from spec)
    const lengthRanges: Record<string, { min: number; max: number }> = {
      hook: { min: 50, max: 200 },
      context: { min: 100, max: 400 },
      proof: { min: 100, max: 500 },
      objection: { min: 80, max: 350 },
      cta: { min: 30, max: 150 },
    };
    
    const range = lengthRanges[blockName];
    if (range) {
      if (charCount < range.min) {
        warnings.push(`Block ${blockName} too short: ${charCount} chars (min: ${range.min})`);
      }
      if (charCount > range.max) {
        warnings.push(`Block ${blockName} too long: ${charCount} chars (max: ${range.max})`);
      }
    }
    
    // Check for evidence keys
    if (!Array.isArray(block.evidence_keys) || block.evidence_keys.length === 0) {
      warnings.push(`Block ${blockName} has no evidence keys`);
    }
    
    // Banned phrase check
    const slopCheck = detectSlop(text, {
      banned_phrases: config.validation?.banned_phrases || [],
      severity: 'warn',
    });
    
    if (slopCheck.length > 0) {
      warnings.push(`Block ${blockName} contains banned phrases: ${slopCheck.map(s => s.phrase).join(', ')}`);
    }
  });
  
  // Check for continuity flag if present
  if ('continuity_flag' in copyOutput && copyOutput.continuity_flag === true) {
    warnings.push('Narrative continuity flag triggered - blocks may not flow together');
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate image.brief_generate outputs
 * 
 * Requirements:
 * - aspect_ratio = "4:5"
 * - safe_zone_top >= 0.15
 * - safe_zone_bottom >= 0.15
 * - Has evidence keys
 */
export function validateImageBrief(
  outputs: unknown[],
  _config: PromptsConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(outputs) || outputs.length !== 1) {
    errors.push('Image brief output must be a single object');
    return { passed: false, errors, warnings };
  }
  
  const brief = outputs[0] as Record<string, unknown>;
  
  // Check aspect ratio
  if (brief.aspect_ratio !== '4:5') {
    errors.push(`aspect_ratio must be "4:5", got "${brief.aspect_ratio}"`);
  }
  
  // Check safe zones
  const safeZoneTop = Number(brief.safe_zone_top);
  const safeZoneBottom = Number(brief.safe_zone_bottom);
  
  if (isNaN(safeZoneTop) || safeZoneTop < 0.15) {
    errors.push(`safe_zone_top must be >= 0.15, got ${safeZoneTop}`);
  }
  
  if (isNaN(safeZoneBottom) || safeZoneBottom < 0.15) {
    errors.push(`safe_zone_bottom must be >= 0.15, got ${safeZoneBottom}`);
  }
  
  // Check required fields
  const requiredFields = ['visual_direction', 'focal_point', 'copy_overlay_guidance'];
  requiredFields.forEach(field => {
    if (!(field in brief)) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Check evidence keys
  if (!Array.isArray(brief.evidence_keys) || brief.evidence_keys.length === 0) {
    warnings.push('Image brief has no evidence keys');
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Main validator router - selects the right validator for a task
 */
export function validateTaskOutput(
  taskId: string,
  outputs: unknown[],
  config: PromptsConfig
): ValidationResult {
  switch (taskId) {
    case 'ideas.generate':
      return validateIdeas(outputs, config);
    
    case 'copy.generate':
      return validateCopy(outputs, config);
    
    case 'image.brief_generate':
      return validateImageBrief(outputs, config);
    
    case 'scrape.review_summarize':
      return validateReview(outputs, config);
    
    default:
      return {
        passed: true,
        errors: [],
        warnings: [`No validator defined for task: ${taskId}`],
      };
  }
}

/**
 * Validate review output
 */
export function validateReview(
  outputs: unknown[],
  _config: PromptsConfig,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (outputs.length !== 1) {
    errors.push(`Expected 1 review, got ${outputs.length}`);
    return { passed: false, errors, warnings };
  }

  const review = outputs[0];
  if (typeof review !== 'object' || review === null) {
    errors.push('Review must be an object');
    return { passed: false, errors, warnings };
  }

  const r = review as Record<string, unknown>;
  const requiredFields = ['tone', 'voice', 'proof_points', 'pricing_cues', 'target_audience', 'citations'];
  for (const field of requiredFields) {
    if (!(field in r)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (r.tone && !Array.isArray(r.tone)) errors.push('tone must be an array');
  if (r.voice && !Array.isArray(r.voice)) errors.push('voice must be an array');
  if (r.proof_points && !Array.isArray(r.proof_points)) errors.push('proof_points must be an array');
  if (r.pricing_cues && !Array.isArray(r.pricing_cues)) errors.push('pricing_cues must be an array');
  if (r.citations && !Array.isArray(r.citations)) errors.push('citations must be an array');
  if (r.target_audience && typeof r.target_audience !== 'string') errors.push('target_audience must be a string');

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

