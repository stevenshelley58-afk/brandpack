/**
 * Ranker - Scoring and slop detection for outputs
 */

export {
  scoreCandidates,
  type RankCandidate,
  type RankedCandidate,
  type ScoreConfig,
} from './scorer';

export {
  detectSlop,
  applySlopPenalty,
  type SlopCheckOptions,
  type SlopFlag,
} from './slop';

