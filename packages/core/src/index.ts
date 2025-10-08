/**
 * Brand Pack Core Package
 * 
 * Main entry point for core functionality
 */

// Export all types
export * from './types';

// Config utilities
export {
  getEffectiveConfig,
  resolveEffectiveConfig,
  type EffectiveConfigOptions,
  type EffectiveConfigResult,
  type EffectiveConfigResolveOptions,
} from './config';

export {
  crawlSite,
  type CrawlOptions,
  type CrawlPage,
  type CrawlResult,
} from './scraper';

export {
  compressKernel,
  type KernelInput,
  type KernelPayload,
  type KernelSource,
  type KernelStore,
  type KernelRecord,
} from './kernel';

export {
  scoreCandidates,
  type RankCandidate,
  type RankedCandidate,
  type ScoreConfig,
} from './ranker';

export {
  detectSlop,
  applySlopPenalty,
  type SlopCheckOptions,
  type SlopFlag,
} from './ranker';
// export * from './scraper';
// export * from './kernel';
// export * from './runner';
// export * from './ranker';
