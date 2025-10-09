import type {
  AdapterResponse,
  ImageAdapter,
  ImageBrief,
  ImageConfig,
  AdapterImageResult as ImageResult,
  LLMAdapter,
  LLMSpec,
  TokenUsage,
} from '@brandpack/core';

function now() {
  return Date.now();
}

function usageFromSpec(spec: LLMSpec): TokenUsage {
  const promptTokens = Math.ceil(
    (spec.system_prompt.length + spec.user_prompt.length) / 4,
  );
  return {
    prompt_tokens: promptTokens,
    completion_tokens: 32,
    total_tokens: promptTokens + 32,
  };
}

export class NoopLLMAdapter implements LLMAdapter {
  readonly provider = 'noop-llm';

  async execute(spec: LLMSpec): Promise<AdapterResponse> {
    const start = now();
    const usage = usageFromSpec(spec);
    
    // Generate appropriate mock data based on task_id and response_format
    let output: string[];
    
    if (spec.response_format === 'json' || spec.response_format === 'structured') {
      output = [this.generateMockJSON(spec.task_id)];
    } else {
      output = [`[noop::${spec.task_id}] TEXT response placeholder`];
    }

    return {
      outputs: output,
      usage,
      provider: this.provider,
      model: 'noop-llm-v1',
      cost_usd: 0,
      duration_ms: now() - start,
      raw_response: {
        echo: {
          system_prompt: spec.system_prompt,
          user_prompt: spec.user_prompt,
        },
      },
      metadata: {
        finish_reason: 'stop',
        cached: false,
      },
    };
  }
  
  private generateMockJSON(taskId: string): string {
    // Generate realistic mock data based on task type
    if (taskId.includes('ideas')) {
      // Generate 20 mock ideas
      const ideas = Array.from({ length: 20 }, (_, i) => ({
        id: `idea-${String(i + 1).padStart(2, '0')}`,
        headline: `Mock Campaign Idea ${i + 1}`,
        angle: 'Noop mock angle',
        audience: 'Mock target audience',
        format: 'LinkedIn carousel',
        supporting_evidence_keys: ['mock.evidence.1', 'mock.evidence.2'],
      }));
      return JSON.stringify(ideas);
    }
    
    if (taskId.includes('copy')) {
      // Generate 5 copy blocks
      const copy = {
        hook: { content: 'Mock hook', char_count: 9 },
        context: { content: 'Mock context with details', char_count: 25 },
        proof: { content: 'Mock proof point', char_count: 16 },
        objection: { content: 'Mock objection handler', char_count: 22 },
        cta: { content: 'Mock call to action', char_count: 19 },
      };
      return JSON.stringify(copy);
    }
    
    if (taskId.includes('image') || taskId.includes('brief')) {
      // Generate image brief
      const brief = {
        aspect_ratio: '4:5',
        safe_zone_top: 0.15,
        safe_zone_bottom: 0.15,
        visual_direction: 'Mock visual direction for noop test',
        focal_point: 'center',
        copy_overlay_guidance: 'Place text in safe zones',
        evidence_keys: ['mock.evidence.1'],
      };
      return JSON.stringify(brief);
    }
    
    if (taskId.includes('review') || taskId.includes('summarize')) {
      // Generate review summary
      const review = {
        tone: ['professional', 'confident'],
        voice: ['clear', 'concise'],
        proof_points: ['Mock proof 1', 'Mock proof 2'],
        pricing_cues: ['Mock pricing'],
        target_audience: 'Mock audience',
        citations: ['home', 'about'],
      };
      return JSON.stringify(review);
    }
    
    // Default mock JSON
    return JSON.stringify({
      mock: true,
      task_id: taskId,
      message: 'Noop adapter mock response',
    });
  }

  estimateCost(): number {
    return 0;
  }

  validateSpec(spec: LLMSpec) {
    const errors: string[] = [];
    if (!spec.task_id) errors.push('task_id is required');
    if (!spec.user_prompt) errors.push('user_prompt is required');
    return { valid: errors.length === 0, errors };
  }

  getAvailableModels(): string[] {
    return ['noop-llm-v1'];
  }
}

export class NoopImageAdapter implements ImageAdapter {
  readonly provider = 'noop-image';

  async generate(brief: ImageBrief, config: ImageConfig): Promise<ImageResult> {
    const start = now();
    return {
      url: `https://example.com/noop/${brief.id}.png`,
      provider: this.provider,
      model: 'noop-image-v1',
      cost_usd: 0,
      duration_ms: now() - start,
      metadata: {
        resolution: config.resolution,
        aspect_ratio: config.aspect_ratio,
        file_size_kb: 42,
        format: config.format,
        seed: config.seed,
      },
      raw_response: {
        prompt: brief.prompt,
        negative_prompt: brief.negative_prompt,
      },
    };
  }

  estimateCost(): number {
    return 0;
  }

  getAvailableModels(): string[] {
    return ['noop-image-v1'];
  }
}
