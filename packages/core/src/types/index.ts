/**
 * Brand Pack Core Types
 * 
 * Central export for all type definitions
 */

// Spec types
export type { LLMSpec, ResponseFormat } from './spec';
export { SpecBuilder, validateSpec } from './spec';

// Adapter types
export type {
  LLMAdapter,
  AdapterResponse,
  TokenUsage,
  ImageAdapter,
  ImageBrief,
  ImageConfig,
  ImageResult,
  ProviderPricing
} from './adapter';
export { AdapterError, AdapterErrorCode, calculateCost } from './adapter';

// Config types
export type {
  Config,
  GlobalConfig,
  CallConfig,
  ImageCallConfig,
  PromptConfig,
  ModelConfig,
  ValidationConfig,
  BudgetConfig,
  LoggingConfig,
  AdvancedConfig,
  ScraperConfig,
  GlobalValidationConfig,
  GlobalBudgetConfig,
  Preset,
  ConfigOverride,
  EffectiveConfig,
  ConfigValidationError,
  DeepPartial,
  MergeOptions
} from './config';
export { DEFAULT_MERGE_OPTIONS } from './config';

// Kernel types
export type {
  BrandKernel,
  BrandSnapshot,
  AudienceSegment,
  AudienceAnalysis,
  ProofPoints,
  PricingCues,
  ScrapedPage,
  ScrapeResult,
  ScrapeCache,
  CompressionOptions,
  KernelValidation
} from './kernel';
export { validateKernel, createMinimalKernel } from './kernel';

// Output types
export type {
  Idea,
  QualityScore,
  IdeasResult,
  CopyVariant,
  CopySet,
  CopyResult,
  BriefSet,
  BriefResult,
  GeneratedImage,
  ImageResult,
  ArtifactType,
  Artifact,
  Run,
  RunStage,
  RunStatus,
  AuditLogEntry,
  ExportPack,
  ExportManifest,
  RankingCriteria,
  DedupeResult,
  OutputValidation
} from './outputs';
export { DEFAULT_RANKING_CRITERIA, validateCopy } from './outputs';

