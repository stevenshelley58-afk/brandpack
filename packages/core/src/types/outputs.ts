/**
 * Output Types
 * 
 * Types for all generated artifacts: ideas, copy, images, exports
 */

/**
 * Marketing idea / campaign angle
 */
export interface Idea {
  id: string;
  rank: number;
  angle: string;
  hook: string;
  target_emotion: string;
  target_segment?: string;
  proof_point: string;
  format: 'question' | 'statement' | 'challenge' | 'story';
  score: QualityScore;
  displayed: boolean;
}

/**
 * Quality score breakdown
 */
export interface QualityScore {
  total: number;
  clarity: number;
  proof_alignment: number;
  emotion: number;
  originality: number;
}

/**
 * Ideas generation result
 */
export interface IdeasResult {
  ideas: Idea[];
  metadata: {
    total_generated: number;
    displayed: number;
    dedupe_removed: number;
    avg_similarity: number;
  };
}

/**
 * Ad copy (before/after format)
 */
export interface CopyVariant {
  id: string;
  before: {
    headline: string;
    description: string;
    char_count: {
      headline: number;
      description: number;
    };
  };
  after: {
    headline: string;
    description: string;
    char_count: {
      headline: number;
      description: number;
    };
  };
  score: QualityScore;
  flags: {
    has_banned_phrases: boolean;
    over_length: boolean;
    missing_proof: boolean;
  };
}

/**
 * Copy set for one idea
 */
export interface CopySet {
  idea_id: string;
  variants: CopyVariant[];
}

/**
 * Copy generation result
 */
export interface CopyResult {
  copy_sets: CopySet[];
}

/**
 * Image generation brief
 */
export interface ImageBrief {
  id: string;
  copy_id: string;
  prompt: string;
  negative_prompt: string;
  style: 'product_photography' | 'lifestyle' | 'abstract' | 'illustration' | 'data_viz';
  mood: string;
  composition: string;
  aspect_ratio: '4:5' | '1:1' | '16:9';
  estimated_cost: number;
}

/**
 * Brief set for one copy variant
 */
export interface BriefSet {
  copy_id: string;
  briefs: ImageBrief[];
}

/**
 * Image brief generation result
 */
export interface BriefResult {
  brief_sets: BriefSet[];
}

/**
 * Generated image
 */
export interface GeneratedImage {
  brief_id: string;
  image_id: string;
  url: string;
  thumbnail_url: string;
  metadata: {
    provider: string;
    model: string;
    resolution: string;
    aspect_ratio: string;
    file_size_kb: number;
    format: 'png' | 'jpg' | 'webp';
  };
  cost_usd: number;
  duration_ms: number;
}

/**
 * Image generation result
 */
export interface ImageResult {
  images: GeneratedImage[];
  total_cost: number;
  failed: Array<{
    brief_id: string;
    error: string;
  }>;
}

/**
 * Artifact type in database
 */
export type ArtifactType =
  | 'kernel'
  | 'snapshot'
  | 'audience'
  | 'idea'
  | 'copy'
  | 'image_brief'
  | 'image'
  | 'export';

/**
 * Generic artifact stored in database
 */
export interface Artifact {
  id: string;
  run_id: string;
  type: ArtifactType;
  content: unknown;
  ranking_score?: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Run (pipeline execution)
 */
export type RunStage =
  | 'scrape'
  | 'review'
  | 'audience'
  | 'ideas'
  | 'copy'
  | 'image_brief'
  | 'image_render'
  | 'export'
  | 'completed'
  | 'failed';

export type RunStatus = 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface Run {
  id: string;
  user_id: string;
  domain: string;
  stage: RunStage;
  status: RunStatus;
  config_snapshot: Record<string, unknown>;
  error_message?: string;
  total_cost_usd: number;
  total_duration_ms: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  run_id: string;
  call_type: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  duration_ms: number;
  cache_hit: boolean;
  error_message?: string;
  request_hash: string;
  created_at: string;
}

/**
 * Export pack content
 */
export interface ExportPack {
  export_id: string;
  download_url: string;
  filename: string;
  file_size_kb: number;
  contents: {
    copy_files: number;
    image_files: number;
    manifest: boolean;
  };
  expires_at: string;
}

/**
 * Export manifest (included in ZIP)
 */
export interface ExportManifest {
  domain: string;
  run_id: string;
  exported_at: string;
  config_used: Record<string, unknown>;
  selections: {
    ideas: string[];
    copy: string[];
    images: string[];
  };
  scores: {
    [artifact_id: string]: QualityScore;
  };
  costs: {
    total_usd: number;
    breakdown: {
      scrape: number;
      review: number;
      ideas: number;
      copy: number;
      images: number;
    };
  };
}

/**
 * Ranking criteria
 */
export interface RankingCriteria {
  clarity: number;       // Weight 0-1
  proof: number;         // Weight 0-1
  emotion: number;       // Weight 0-1
  originality: number;   // Weight 0-1
}

/**
 * Default ranking criteria
 */
export const DEFAULT_RANKING_CRITERIA: RankingCriteria = {
  clarity: 0.30,
  proof: 0.25,
  emotion: 0.25,
  originality: 0.20
};

/**
 * Dedupe result
 */
export interface DedupeResult {
  kept: string[];
  removed: string[];
  similarity_matrix: {
    [id1: string]: {
      [id2: string]: number;
    };
  };
}

/**
 * Validation result for outputs
 */
export interface OutputValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate copy output
 */
export function validateCopy(
  copy: CopyVariant,
  constraints: {
    before: { headline_max: number; description_max: number };
    after: { headline_max: number; description_max: number };
  }
): OutputValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check before
  if (copy.before.char_count.headline > constraints.before.headline_max) {
    errors.push(
      `Before headline too long: ${copy.before.char_count.headline} > ${constraints.before.headline_max}`
    );
  }
  if (copy.before.char_count.description > constraints.before.description_max) {
    errors.push(
      `Before description too long: ${copy.before.char_count.description} > ${constraints.before.description_max}`
    );
  }
  
  // Check after
  if (copy.after.char_count.headline > constraints.after.headline_max) {
    errors.push(
      `After headline too long: ${copy.after.char_count.headline} > ${constraints.after.headline_max}`
    );
  }
  if (copy.after.char_count.description > constraints.after.description_max) {
    errors.push(
      `After description too long: ${copy.after.char_count.description} > ${constraints.after.description_max}`
    );
  }
  
  // Check headline consistency
  if (copy.before.headline !== copy.after.headline) {
    warnings.push('Before and after headlines should match');
  }
  
  // Check flags
  if (copy.flags.has_banned_phrases) {
    warnings.push('Contains banned phrases (AI slop detected)');
  }
  if (copy.flags.missing_proof) {
    warnings.push('Missing proof points from brand');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

