/**
 * Brand Kernel Types
 * 
 * The "kernel" is a compressed representation of a brand's website,
 * containing only the essential information needed for ad generation.
 * Target size: ≤2KB
 */

/**
 * Proof points categorized by type
 */
export interface ProofPoints {
  customers: string[];
  metrics: string[];
  certifications: string[];
}

/**
 * Pricing information
 */
export interface PricingCues {
  tiers: string[];
  positioning: string;
}

/**
 * Brand Kernel - compressed brand data
 */
export interface BrandKernel {
  /**
   * Domain this kernel was generated from
   */
  domain: string;
  
  /**
   * Content hash for cache invalidation
   */
  content_hash: string;
  
  /**
   * Products or services offered
   */
  products: string[];
  
  /**
   * Tone of voice (adjectives)
   * Examples: ["professional", "technical", "urgent"]
   */
  tone: string[];
  
  /**
   * Target audience description
   */
  audience: string;
  
  /**
   * Proof points (social proof, metrics, certifications)
   */
  proof_points: ProofPoints;
  
  /**
   * Pricing signals
   */
  pricing_cues: PricingCues;
  
  /**
   * Competitors (mentioned or implied)
   */
  competitors_implied: string[];
  
  /**
   * Unique angle / key differentiator
   */
  unique_angle: string;
  
  /**
   * Actual size of this kernel in KB
   */
  compressed_kb: number;
  
  /**
   * Citations: where each piece of info was found
   * Maps field name to page path(s)
   */
  citations: {
    [key: string]: string;
  };
  
  /**
   * When this kernel was created
   */
  created_at: string;
}

/**
 * Brand Snapshot - LLM-analyzed brand understanding
 */
export interface BrandSnapshot {
  /**
   * Tone descriptors
   */
  tone: string[];
  
  /**
   * Voice characteristics
   */
  voice: string[];
  
  /**
   * Style/messaging patterns
   */
  style: string[];
  
  /**
   * Categorized proof points
   */
  proof_points: ProofPoints;
  
  /**
   * Pricing information
   */
  pricing_cues: PricingCues;
  
  /**
   * Target audience description
   */
  target_audience: string;
  
  /**
   * Identified or implied competitors
   */
  competitors: string[];
  
  /**
   * Unique value proposition
   */
  unique_angle: string;
  
  /**
   * Common messaging themes
   */
  messaging_themes: string[];
}

/**
 * Audience segment
 */
export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  pain_points: string[];
  messaging_angle: string;
  priority: number;
}

/**
 * Audience analysis result
 */
export interface AudienceAnalysis {
  segments: AudienceSegment[];
}

/**
 * Scraped page data (before compression)
 */
export interface ScrapedPage {
  url: string;
  title: string;
  meta_description?: string;
  h1?: string;
  content_type: 'homepage' | 'about' | 'products' | 'pricing' | 'other';
  text_content: string;
  images: string[];
  links: string[];
  structured_data?: Record<string, unknown>;
}

/**
 * Scrape result
 */
export interface ScrapeResult {
  domain: string;
  pages: ScrapedPage[];
  total_pages: number;
  duration_ms: number;
  content_hash: string;
  etag?: string;
  last_modified?: string;
}

/**
 * Scrape cache entry
 */
export interface ScrapeCache {
  id: string;
  domain: string;
  content_hash: string;
  etag?: string;
  last_modified?: string;
  raw_html_url: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Kernel compression options
 */
export interface CompressionOptions {
  /**
   * Target maximum size in KB
   */
  max_kb: number;
  
  /**
   * Compression strategy
   */
  strategy: 'aggressive' | 'balanced' | 'minimal';
  
  /**
   * Whether to include citations
   */
  include_citations: boolean;
}

/**
 * Kernel validation result
 */
export interface KernelValidation {
  valid: boolean;
  size_kb: number;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a kernel
 */
export function validateKernel(
  kernel: BrandKernel,
  maxKb: number = 2
): KernelValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  if (!kernel.domain) errors.push('domain is required');
  if (!kernel.content_hash) errors.push('content_hash is required');
  if (!kernel.products || kernel.products.length === 0) {
    warnings.push('no products found');
  }
  if (!kernel.tone || kernel.tone.length === 0) {
    warnings.push('no tone descriptors found');
  }
  
  // Check size
  const json = JSON.stringify(kernel);
  const sizeKb = new Blob([json]).size / 1024;
  
  if (sizeKb > maxKb) {
    errors.push(`kernel size (${sizeKb.toFixed(2)}KB) exceeds limit (${maxKb}KB)`);
  }
  
  // Verify compressed_kb matches actual size
  if (Math.abs(kernel.compressed_kb - sizeKb) > 0.1) {
    warnings.push('compressed_kb field does not match actual size');
  }
  
  return {
    valid: errors.length === 0,
    size_kb: sizeKb,
    errors,
    warnings
  };
}

/**
 * Create a minimal kernel from scraped data
 */
export function createMinimalKernel(scrape: ScrapeResult): BrandKernel {
  const homepage = scrape.pages.find(p => p.content_type === 'homepage');
  
  return {
    domain: scrape.domain,
    content_hash: scrape.content_hash,
    products: [],
    tone: [],
    audience: 'Unknown',
    proof_points: {
      customers: [],
      metrics: [],
      certifications: []
    },
    pricing_cues: {
      tiers: [],
      positioning: 'Unknown'
    },
    competitors_implied: [],
    unique_angle: '',
    compressed_kb: 0, // Will be calculated
    citations: {
      homepage: homepage?.url || '/'
    },
    created_at: new Date().toISOString()
  };
}

