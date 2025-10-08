import { createHash } from 'node:crypto';

export interface KernelSource {
  url: string;
  content: string;
}

export interface KernelInput {
  domain: string;
  sources: KernelSource[];
}

export interface KernelPayload {
  domain: string;
  content_hash: string;
  products: string[];
  tone: string[];
  audience: string;
  proof_points: {
    customers: string[];
    metrics: string[];
    certifications: string[];
  };
  pricing_cues: {
    tiers: string[];
    positioning: string;
  };
  competitors_implied: string[];
  unique_angle: string;
  compressed_kb: number;
  citations: Record<string, string>;
  created_at: string;
}

const MAX_KERNEL_BYTES = 2 * 1024;

const PRODUCT_PATTERNS = [
  /plans?:/i,
  /features?:/i,
  /what we (?:offer|do)/i,
  /solution/i,
  /product/i,
  /platform/i,
  /service/i,
];

const PRICING_PATTERNS = [
  /\$\d+/g,
  /per (?:month|user|seat|year)/i,
  /starting at/i,
  /free trial/i,
];

const METRIC_PATTERN = /\b\d{1,3}(?:[,.\d]{0,4})\s?(?:%|x|k|m|b)\b/i;
const CERT_PATTERN =
  /\b(?:SOC\s?2|ISO\s?\d{4,5}|HIPAA|GDPR|FedRAMP|PCI-DSS|CSA Star)\b/i;
const CUSTOMER_PATTERN =
  /\b(?:customers|clients|teams|companies)\b.*?\b\d{2,}\b/i;
const COMPETITOR_PATTERN = /\b(?:vs\.?|alternatives?|compared to)\b/i;

export function compressKernel(input: KernelInput): KernelPayload {
  if (input.sources.length === 0) {
    throw new Error('Kernel compression requires at least one source.');
  }

  const citations: Record<string, string> = {};
  const aggregated = aggregateContent(input.sources);
  const hash = createHash('sha256');
  input.sources.forEach((source) => hash.update(source.content));
  const contentHash = hash.digest('hex');

  const products = extractSections(
    aggregated,
    PRODUCT_PATTERNS,
    'products',
    citations,
  );
  const pricingCues = extractPricing(aggregated, citations);
  const tone = extractTone(aggregated, citations);
  const audience = extractAudience(aggregated, citations);
  const proofPoints = extractProofPoints(aggregated, citations);
  const competitors = extractCompetitors(aggregated, citations);
  const uniqueAngle = deriveUniqueAngle(
    aggregated,
    products,
    proofPoints,
    citations,
  );

  let kernel: KernelPayload = {
    domain: input.domain,
    content_hash: contentHash,
    products,
    tone,
    audience,
    proof_points: proofPoints,
    pricing_cues: pricingCues,
    competitors_implied: competitors,
    unique_angle: uniqueAngle,
    compressed_kb: 0,
    citations,
    created_at: new Date().toISOString(),
  };

  kernel = enforceSizeLimit(kernel);

  const bytes = Buffer.byteLength(JSON.stringify(kernel), 'utf-8');
  kernel.compressed_kb = Number((bytes / 1024).toFixed(3));

  return kernel;
}

export interface KernelRecord {
  domain: string;
  content_hash: string;
  kernel: KernelPayload;
}

export interface KernelStore {
  save(record: KernelRecord): Promise<void>;
}

function aggregateContent(sources: KernelSource[]) {
  return sources.map((source) => ({
    url: source.url,
    lines: splitLines(source.content),
  }));
}

function splitLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractSections(
  aggregated: ReturnType<typeof aggregateContent>,
  patterns: RegExp[],
  citationKey: string,
  citations: Record<string, string>,
): string[] {
  const hits = new Set<string>();
  for (const entry of aggregated) {
    for (const line of entry.lines) {
      if (patterns.some((pattern) => pattern.test(line))) {
        hits.add(normalizeSentence(line));
        citations[citationKey] = entry.url;
      }
      if (hits.size >= 6) break;
    }
    if (hits.size >= 6) break;
  }
  return Array.from(hits).slice(0, 6);
}

function extractPricing(
  aggregated: ReturnType<typeof aggregateContent>,
  citations: Record<string, string>,
) {
  const tiers = new Set<string>();
  let positioning = '';

  for (const entry of aggregated) {
    for (const line of entry.lines) {
      if (PRICING_PATTERNS.some((pattern) => pattern.test(line))) {
        tiers.add(normalizeSentence(line));
        citations['pricing_cues'] = entry.url;
      }
      if (!positioning && /(?:for|designed for)\s+(?:small|mid|enterprise)/i.test(line)) {
        positioning = normalizeSentence(line);
        citations['pricing_positioning'] = entry.url;
      }
    }
    if (tiers.size >= 5) break;
  }

  return {
    tiers: Array.from(tiers).slice(0, 5),
    positioning,
  };
}

function extractTone(
  aggregated: ReturnType<typeof aggregateContent>,
  citations: Record<string, string>,
): string[] {
  const candidates = new Map<string, number>();
  const adjectives = [
    'professional',
    'friendly',
    'expert',
    'playful',
    'bold',
    'analytical',
    'innovative',
    'trusted',
    'human',
    'approachable',
  ];

  for (const entry of aggregated) {
    for (const line of entry.lines) {
      for (const word of adjectives) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(line)) {
          candidates.set(word, (candidates.get(word) ?? 0) + 1);
          citations[`tone.${word}`] = entry.url;
        }
      }
    }
  }

  return Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 5);
}

function extractAudience(
  aggregated: ReturnType<typeof aggregateContent>,
  citations: Record<string, string>,
): string {
  for (const entry of aggregated) {
    for (const line of entry.lines) {
      if (/for\s+(?:[A-Z][a-z]+\s?){1,4}(?:teams|companies|founders|marketers|developers)/i.test(line)) {
        citations['audience'] = entry.url;
        return normalizeSentence(line);
      }
    }
  }
  return 'Not specified';
}

function extractProofPoints(
  aggregated: ReturnType<typeof aggregateContent>,
  citations: Record<string, string>,
) {
  const customers = new Set<string>();
  const metrics = new Set<string>();
  const certifications = new Set<string>();

  for (const entry of aggregated) {
    for (const line of entry.lines) {
      if (CUSTOMER_PATTERN.test(line)) {
        customers.add(normalizeSentence(line));
        citations['proof_points.customers'] = entry.url;
      }
      if (METRIC_PATTERN.test(line)) {
        metrics.add(normalizeSentence(line));
        citations['proof_points.metrics'] = entry.url;
      }
      if (CERT_PATTERN.test(line)) {
        certifications.add(normalizeSentence(line));
        citations['proof_points.certifications'] = entry.url;
      }
    }
  }

  return {
    customers: Array.from(customers).slice(0, 5),
    metrics: Array.from(metrics).slice(0, 5),
    certifications: Array.from(certifications).slice(0, 5),
  };
}

function extractCompetitors(
  aggregated: ReturnType<typeof aggregateContent>,
  citations: Record<string, string>,
): string[] {
  const competitors = new Set<string>();
  for (const entry of aggregated) {
    for (const line of entry.lines) {
      if (COMPETITOR_PATTERN.test(line)) {
        const snippet = normalizeSentence(line);
        if (snippet.length > 0) {
          competitors.add(snippet);
          citations['competitors_implied'] = entry.url;
        }
      }
    }
  }
  return Array.from(competitors).slice(0, 5);
}

function deriveUniqueAngle(
  aggregated: ReturnType<typeof aggregateContent>,
  products: string[],
  proofPoints: KernelPayload['proof_points'],
  citations: Record<string, string>,
): string {
  for (const entry of aggregated) {
    for (const line of entry.lines) {
      if (/only\s+(?:platform|tool|solution)/i.test(line)) {
        citations['unique_angle'] = entry.url;
        return normalizeSentence(line);
      }
    }
  }

  const fallback =
    products[0] ??
    proofPoints.metrics[0] ??
    proofPoints.customers[0] ??
    'Distinctive positioning not detected';
  citations['unique_angle'] ??= aggregated[0]?.url ?? '';
  return fallback;
}

function normalizeSentence(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function enforceSizeLimit(kernel: KernelPayload): KernelPayload {
  let json = JSON.stringify(kernel);
  if (Buffer.byteLength(json, 'utf-8') <= MAX_KERNEL_BYTES) {
    return kernel;
  }

  const trimmed = { ...kernel };
  trimmed.products = trimmed.products.slice(0, 5);
  trimmed.tone = trimmed.tone.slice(0, 5);
  trimmed.proof_points = {
    customers: trimmed.proof_points.customers.slice(0, 3),
    metrics: trimmed.proof_points.metrics.slice(0, 3),
    certifications: trimmed.proof_points.certifications.slice(0, 3),
  };
  trimmed.pricing_cues = {
    tiers: trimmed.pricing_cues.tiers.slice(0, 3),
    positioning: trimmed.pricing_cues.positioning,
  };
  trimmed.competitors_implied = trimmed.competitors_implied.slice(0, 3);
  trimmed.unique_angle = trimmed.unique_angle.slice(0, 160);

  json = JSON.stringify(trimmed);
  if (Buffer.byteLength(json, 'utf-8') <= MAX_KERNEL_BYTES) {
    return trimmed;
  }

  const minimal = {
    ...trimmed,
    products: trimmed.products.slice(0, 3),
    tone: trimmed.tone.slice(0, 3),
    proof_points: {
      customers: trimmed.proof_points.customers.slice(0, 2),
      metrics: trimmed.proof_points.metrics.slice(0, 2),
      certifications: trimmed.proof_points.certifications.slice(0, 1),
    },
    pricing_cues: {
      tiers: trimmed.pricing_cues.tiers.slice(0, 2),
      positioning: trimmed.pricing_cues.positioning.slice(0, 120),
    },
    competitors_implied: trimmed.competitors_implied.slice(0, 2),
    unique_angle: trimmed.unique_angle.slice(0, 120),
  };

  return minimal;
}
