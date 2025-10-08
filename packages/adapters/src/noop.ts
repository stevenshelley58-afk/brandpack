/**
 * No-op Adapter
 * 
 * Mock adapter for testing and development.
 * Returns predefined responses without calling any real API.
 */

import type {
  LLMAdapter,
  LLMSpec,
  AdapterResponse,
  ImageAdapter,
  ImageBrief,
  ImageConfig,
  ImageResult
} from '@brandpack/core';

/**
 * No-op LLM adapter
 * Returns mock responses for testing
 */
export class NoopLLMAdapter implements LLMAdapter {
  readonly provider = 'noop';
  
  /**
   * Execute spec with mock response
   */
  async execute(spec: LLMSpec): Promise<AdapterResponse> {
    const startTime = Date.now();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generate mock response based on task_id
    const output = this.generateMockOutput(spec);
    
    const duration = Date.now() - startTime;
    
    return {
      outputs: [output],
      usage: {
        prompt_tokens: spec.user_prompt.length / 4,
        completion_tokens: output.length / 4,
        total_tokens: (spec.user_prompt.length + output.length) / 4
      },
      provider: 'noop',
      model: 'noop-model-v1',
      cost_usd: 0,
      duration_ms: duration,
      raw_response: {
        mock: true,
        task_id: spec.task_id
      },
      metadata: {
        cached: false,
        finish_reason: 'stop'
      }
    };
  }
  
  /**
   * Estimate cost (always 0 for noop)
   */
  estimateCost(spec: LLMSpec): number {
    return 0;
  }
  
  /**
   * Validate spec (always valid for noop)
   */
  validateSpec(spec: LLMSpec): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }
  
  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return ['noop-model-v1', 'noop-model-v2'];
  }
  
  /**
   * Generate mock output based on task type
   */
  private generateMockOutput(spec: LLMSpec): string {
    switch (spec.task_id) {
      case 'scrape_review':
        return JSON.stringify({
          tone: ['professional', 'data-driven', 'urgent'],
          voice: ['confident', 'technical'],
          style: ['benefit-driven', 'proof-heavy'],
          proof_points: {
            customers: ['10k users', 'Fortune 500 clients'],
            metrics: ['99.9% uptime', '2x faster'],
            certifications: ['SOC2', 'ISO 27001']
          },
          pricing_cues: {
            tiers: ['Starter $99/mo', 'Pro $299/mo'],
            positioning: 'Mid-market premium'
          },
          target_audience: 'B2B SaaS teams, 10-500 employees',
          competitors: ['CompetitorA', 'LegacyTool'],
          unique_angle: 'Only tool with real-time sync',
          messaging_themes: ['speed', 'reliability', 'enterprise-ready']
        });
      
      case 'audience_analysis':
        return JSON.stringify({
          segments: [
            {
              id: 'segment-1',
              name: 'Small Business Owners',
              description: '10-50 employees, limited IT resources',
              pain_points: ['Manual processes', 'No dedicated IT'],
              messaging_angle: 'Easy setup, works out of the box',
              priority: 5
            },
            {
              id: 'segment-2',
              name: 'Enterprise IT Teams',
              description: 'Large organizations, complex requirements',
              pain_points: ['Integration complexity', 'Security concerns'],
              messaging_angle: 'Enterprise-grade security, seamless integration',
              priority: 4
            }
          ]
        });
      
      case 'ideas_generate':
        return JSON.stringify({
          ideas: Array.from({ length: 5 }, (_, i) => ({
            id: `idea-${i + 1}`,
            angle: `Test angle ${i + 1}`,
            hook: `What if your system crashed right now? (${i + 1})`,
            target_emotion: 'urgency',
            proof_point: '99.9% uptime',
            format: 'question'
          }))
        });
      
      case 'copy_generate':
        return JSON.stringify({
          variants: [
            {
              id: 'copy-1a',
              before: {
                headline: 'Your data is at risk.',
                description: 'Stop losing sleep over downtime.'
              },
              after: {
                headline: 'Your data is at risk.',
                description: 'Stop losing sleep over downtime. Our platform delivers 99.9% uptime with automatic backups and real-time sync. Join 10k teams who sleep better at night.'
              }
            }
          ]
        });
      
      case 'image_brief':
        return JSON.stringify({
          briefs: [
            {
              id: 'brief-1',
              prompt: 'A sleek modern office with a laptop displaying a dashboard.',
              negative_prompt: 'cluttered, low quality',
              style: 'product_photography',
              mood: 'confident',
              composition: 'centered'
            }
          ]
        });
      
      default:
        return JSON.stringify({
          message: 'Mock response for ' + spec.task_id,
          data: {}
        });
    }
  }
}

/**
 * No-op Image adapter
 * Returns mock image results for testing
 */
export class NoopImageAdapter implements ImageAdapter {
  readonly provider = 'noop';
  
  /**
   * Generate mock image
   */
  async generate(brief: ImageBrief, config: ImageConfig): Promise<ImageResult> {
    const startTime = Date.now();
    
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const duration = Date.now() - startTime;
    
    // Generate mock image URL
    const mockUrl = `https://via.placeholder.com/1024x1280.png?text=${encodeURIComponent(brief.style)}`;
    
    return {
      url: mockUrl,
      thumbnail_url: `https://via.placeholder.com/256x320.png?text=${encodeURIComponent(brief.style)}`,
      provider: 'noop',
      model: 'noop-image-v1',
      cost_usd: 0,
      duration_ms: duration,
      metadata: {
        resolution: config.resolution,
        aspect_ratio: config.aspect_ratio,
        file_size_kb: 150,
        format: config.format,
        seed: config.seed
      }
    };
  }
  
  /**
   * Estimate cost (always 0 for noop)
   */
  estimateCost(config: ImageConfig): number {
    return 0;
  }
  
  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return ['noop-image-v1'];
  }
}

// Export singleton instances
export const noopLLMAdapter = new NoopLLMAdapter();
export const noopImageAdapter = new NoopImageAdapter();

