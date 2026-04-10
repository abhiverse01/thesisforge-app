// ============================================================
// ThesisForge Intelligence — Algorithm 2: Fuzzy Duplicate Detector
// Jaro-Winkler similarity on title + author with tuned threshold.
// Detects references added twice with slightly different spellings.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { DuplicatePair } from './types';
import type { ThesisReference } from '@/lib/thesis-types';

/** Threshold for considering two references duplicates. Tuned conservatively. */
const DUPLICATE_THRESHOLD = 0.88;

/**
 * Jaro-Winkler similarity — O(n*m) but n,m < 200 for typical titles.
 * Returns a value between 0 and 1.
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Normalize a string for comparison:
 * lowercase, strip punctuation, remove stopwords, collapse whitespace.
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(a|an|the|of|in|for|and|or|is|are|to|on|at|by|with)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect duplicate references using Jaro-Winkler similarity.
 *
 * Edge cases:
 * - Empty array → returns []
 * - Single reference → returns []
 * - Identical entries → returns pair with score 1.0
 * - References with no title → skipped (can't compare meaningfully)
 *
 * Performance budget: < 8ms for up to 50 references
 */
export function detectDuplicates(references: ThesisReference[]): DuplicatePair[] {
  if (!references || references.length < 2) return [];

  const duplicates: DuplicatePair[] = [];

  for (let i = 0; i < references.length; i++) {
    for (let j = i + 1; j < references.length; j++) {
      const a = references[i];
      const b = references[j];

      // Skip if both lack titles — can't compare meaningfully
      if (!a.title?.trim() && !b.title?.trim()) continue;

      // DOI exact match overrides everything
      const doiMatch = a.doi && b.doi && a.doi.trim() === b.doi.trim();

      const titleSim = jaroWinkler(
        normalizeForComparison(a.title || ''),
        normalizeForComparison(b.title || '')
      );
      const authorSim = jaroWinkler(
        normalizeForComparison(a.authors || ''),
        normalizeForComparison(b.authors || '')
      );

      const combinedScore = doiMatch
        ? 1.0
        : titleSim * 0.6 + authorSim * 0.4;

      if (combinedScore > DUPLICATE_THRESHOLD) {
        duplicates.push({
          indexA: i,
          indexB: j,
          score: Math.round(combinedScore * 100) / 100,
          reason: doiMatch
            ? 'Identical DOI'
            : titleSim > 0.92
              ? 'Near-identical titles'
              : 'Similar title and author',
        });
      }
    }
  }

  return duplicates;
}
