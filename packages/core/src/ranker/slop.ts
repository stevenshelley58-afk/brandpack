export interface SlopCheckOptions {
  banned_phrases: string[];
  severity?: 'warn' | 'block';
}

export interface SlopFlag {
  phrase: string;
  index: number;
  severity: 'warn' | 'block';
}

export function detectSlop(
  text: string,
  options: SlopCheckOptions,
): SlopFlag[] {
  const results: SlopFlag[] = [];
  const lower = text.toLowerCase();

  options.banned_phrases.forEach((phrase) => {
    const normalized = phrase.toLowerCase();
    let cursor = 0;
    while (cursor < lower.length) {
      const index = lower.indexOf(normalized, cursor);
      if (index === -1) break;
      results.push({
        phrase,
        index,
        severity: options.severity ?? 'warn',
      });
      cursor = index + normalized.length;
    }
  });

  return results;
}

export function applySlopPenalty(
  text: string,
  banned: string[],
  baseScore: number,
): number {
  const flags = detectSlop(text, { banned_phrases: banned });
  const penalty = Math.min(50, flags.length * 10);
  return Math.max(0, baseScore - penalty);
}
