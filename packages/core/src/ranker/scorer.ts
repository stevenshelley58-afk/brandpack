import type { QualityScore } from '../types/outputs';

export interface RankCandidate {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RankedCandidate extends RankCandidate {
  score: QualityScore & { brand_fit: number };
}

export interface ScoreConfig {
  banned_phrases?: string[];
  weights?: Partial<{
    clarity: number;
    proof: number;
    emotion: number;
    brand_fit: number;
  }>;
}

const DEFAULT_WEIGHTS = {
  clarity: 0.3,
  proof: 0.3,
  emotion: 0.2,
  brand_fit: 0.2,
} as const;

export function scoreCandidates(
  candidates: RankCandidate[],
  config: ScoreConfig = {},
): RankedCandidate[] {
  const weights = { ...DEFAULT_WEIGHTS, ...config.weights };
  const normalized = normalizeWeights(weights);
  const results = candidates.map((candidate) => {
    const clarity = scoreClarity(candidate.text);
    const proof = scoreProof(candidate.text);
    const emotion = scoreEmotion(candidate.text);
    const brandFit = scoreBrandFit(candidate.text);
    const base =
      clarity * normalized.clarity +
      proof * normalized.proof +
      emotion * normalized.emotion +
      brandFit * normalized.brand_fit;

    const slopPenalty = config.banned_phrases
      ? slopPenaltyScore(candidate.text, config.banned_phrases)
      : 0;

    const total = Math.max(0, Math.min(100, Math.round(base - slopPenalty)));

    const quality: QualityScore & { brand_fit: number } = {
      total,
      clarity,
      proof_alignment: proof,
      emotion,
      originality: 100 - slopPenalty,
      brand_fit: brandFit,
    };

    return {
      ...candidate,
      score: quality,
    };
  });

  return results.sort((a, b) => b.score.total - a.score.total);
}

function normalizeWeights(weights: ScoreConfig['weights'] & typeof DEFAULT_WEIGHTS) {
  const sum =
    (weights?.clarity ?? 0) +
    (weights?.proof ?? 0) +
    (weights?.emotion ?? 0) +
    (weights?.brand_fit ?? 0);
  if (sum === 0) {
    return DEFAULT_WEIGHTS;
  }

  return {
    clarity: (weights.clarity ?? 0) / sum,
    proof: (weights.proof ?? 0) / sum,
    emotion: (weights.emotion ?? 0) / sum,
    brand_fit: (weights.brand_fit ?? 0) / sum,
  };
}

function scoreClarity(text: string): number {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return 0;

  const averageLength = sentences.reduce((sum, sentence) => {
    return sum + sentence.split(/\s+/).filter(Boolean).length;
  }, 0) / sentences.length;

  // Reward sentences around 12-18 words, penalize extremes.
  const optimalRange = 15;
  const variance = Math.abs(averageLength - optimalRange);
  const clarity = Math.max(0, 100 - variance * 5);
  return Math.round(clarity);
}

function scoreProof(text: string): number {
  const matches = text.match(/\d+/g) ?? [];
  const hasSpecifics =
    /%|x|k|m|b|case study|customers|clients|ROI|revenue|metric/i.test(text);
  const score = Math.min(100, matches.length * 10 + (hasSpecifics ? 30 : 0));
  return Math.round(Math.min(100, score));
}

function scoreEmotion(text: string): number {
  const emotionWords = [
    'imagine',
    'struggle',
    'frustrated',
    'excited',
    'delighted',
    'confidence',
    'fear',
    'finally',
    'unlock',
    'transform',
  ];
  const hits = emotionWords.filter((word) =>
    new RegExp(`\\b${word}\\b`, 'i').test(text),
  );
  return Math.min(100, hits.length * 12);
}

function scoreBrandFit(text: string): number {
  const personaSignals = [
    'for marketers',
    'for developers',
    'for founders',
    'for product teams',
    'for startup',
  ];
  const contextSignals = [
    'onboarding',
    'workflow',
    'compliance',
    'security',
    'automation',
    'ai',
  ];

  const personaHits = personaSignals.filter((signal) =>
    new RegExp(signal, 'i').test(text),
  ).length;
  const contextHits = contextSignals.filter((signal) =>
    new RegExp(signal, 'i').test(text),
  ).length;

  return Math.min(100, personaHits * 20 + contextHits * 12);
}

function slopPenaltyScore(text: string, banned: string[]): number {
  const lower = text.toLowerCase();
  let penalty = 0;
  for (const phrase of banned) {
    if (lower.includes(phrase.toLowerCase())) {
      penalty += 15;
    }
  }
  return Math.min(60, penalty);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
