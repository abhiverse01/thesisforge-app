// ============================================================
// ThesisForge Intelligence — Algorithm 2: Fuzzy Duplicate Detector
// Jaro-Winkler similarity on title + author with tuned threshold.
// Detects references added twice with slightly different spellings.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { DuplicatePair, MergeSuggestion } from './types';
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
 * Multi-field weighted scoring:
 * - title (0.4) + authors (0.3) + year (0.2) + venue (0.1)
 * - DOI-based exact deduplication as fast-path (score 1.0, reason "Identical DOI")
 * - arXiv-based exact deduplication (score 1.0, reason "Identical arXiv ID")
 *
 * Returns both duplicate pairs and merge suggestions.
 *
 * Edge cases:
 * - Empty array → returns [], []
 * - Single reference → returns [], []
 * - Identical entries → returns pair with score 1.0
 * - References with no title → skipped (can't compare meaningfully)
 *
 * Performance budget: < 8ms for up to 50 references
 */
export function detectDuplicates(
  references: ThesisReference[]
): DuplicatePair[] {
  const { duplicates } = detectDuplicatesWithMerge(references);
  return duplicates;
}

/**
 * Detect duplicates and generate merge suggestions.
 * Enhanced version with multi-field scoring and merge target recommendations.
 *
 * Pure function: references in → { duplicates, mergeSuggestions } out.
 */
export function detectDuplicatesWithMerge(
  references: ThesisReference[]
): { duplicates: DuplicatePair[]; mergeSuggestions: MergeSuggestion[] } {
  if (!references || references.length < 2) {
    return { duplicates: [], mergeSuggestions: [] };
  }

  const duplicates: DuplicatePair[] = [];
  const mergeSuggestions: MergeSuggestion[] = [];

  for (let i = 0; i < references.length; i++) {
    for (let j = i + 1; j < references.length; j++) {
      const a = references[i];
      const b = references[j];

      // Skip if both lack titles — can't compare meaningfully
      if (!a.title?.trim() && !b.title?.trim()) continue;

      // DOI exact match overrides everything — fast path
      if (a.doi && b.doi && a.doi.trim() === b.doi.trim()) {
        const pair: DuplicatePair = {
          indexA: i,
          indexB: j,
          score: 1.0,
          reason: 'Identical DOI',
        };
        duplicates.push(pair);

        // Suggest merging into the more complete entry
        const target = pickMergeTarget(a, b, i, j);
        mergeSuggestions.push({
          indexA: i,
          indexB: j,
          score: 1.0,
          suggestedTarget: target,
          reason: 'Identical DOI',
        });
        continue;
      }

      // arXiv exact match — fast path
      if (
        a.eprint && b.eprint &&
        a.eprint.replace(/v\d+$/, '') === b.eprint.replace(/v\d+$/, '')
      ) {
        const pair: DuplicatePair = {
          indexA: i,
          indexB: j,
          score: 1.0,
          reason: 'Identical arXiv ID',
        };
        duplicates.push(pair);

        const target = pickMergeTarget(a, b, i, j);
        mergeSuggestions.push({
          indexA: i,
          indexB: j,
          score: 1.0,
          suggestedTarget: target,
          reason: 'Identical arXiv ID',
        });
        continue;
      }

      // Multi-field weighted similarity
      const titleSim = jaroWinkler(
        normalizeForComparison(a.title || ''),
        normalizeForComparison(b.title || '')
      );
      const authorSim = jaroWinkler(
        normalizeForComparison(a.authors || ''),
        normalizeForComparison(b.authors || '')
      );

      // Year comparison: exact match = 1.0, off-by-1 = 0.5, else = 0.0
      let yearSim = 0;
      const yearA = (a.year || '').trim();
      const yearB = (b.year || '').trim();
      if (yearA && yearB) {
        if (yearA === yearB) {
          yearSim = 1.0;
        } else {
          const diff = Math.abs(parseInt(yearA) - parseInt(yearB));
          if (diff === 1) yearSim = 0.5;
        }
      }

      // Venue comparison: journal or bookTitle
      const venueA = (a.journal || a.bookTitle || '').toLowerCase();
      const venueB = (b.journal || b.bookTitle || '').toLowerCase();
      const venueSim = (venueA && venueB)
        ? jaroWinkler(venueA, venueB)
        : 0;

      // Weighted combination: title(0.4) + authors(0.3) + year(0.2) + venue(0.1)
      const combinedScore =
        titleSim * 0.4 +
        authorSim * 0.3 +
        yearSim * 0.2 +
        venueSim * 0.1;

      if (combinedScore > DUPLICATE_THRESHOLD) {
        let reason: string;
        if (titleSim > 0.92 && authorSim > 0.85) {
          reason = 'Near-identical titles and authors';
        } else if (titleSim > 0.92) {
          reason = 'Near-identical titles';
        } else if (authorSim > 0.85 && yearSim > 0.5) {
          reason = 'Similar authors and year';
        } else {
          reason = 'Similar title and author';
        }

        const pair: DuplicatePair = {
          indexA: i,
          indexB: j,
          score: Math.round(combinedScore * 100) / 100,
          reason,
        };
        duplicates.push(pair);

        // Suggest merge target: pick the more complete entry
        const target = pickMergeTarget(a, b, i, j);
        mergeSuggestions.push({
          indexA: i,
          indexB: j,
          score: Math.round(combinedScore * 100) / 100,
          suggestedTarget: target,
          reason,
        });
      }
    }
  }

  return { duplicates, mergeSuggestions };
}

/**
 * Pick the better merge target between two references.
 * Prefers the entry with more non-empty fields.
 * Returns the index of the suggested target.
 */
function pickMergeTarget(a: ThesisReference, b: ThesisReference, indexA: number, indexB: number): number {
  const fieldsToCheck: Array<keyof ThesisReference> = [
    'doi', 'url', 'authors', 'title', 'journal', 'bookTitle',
    'publisher', 'year', 'volume', 'number', 'pages', 'school',
    'eprint',
  ];

  let scoreA = 0;
  let scoreB = 0;
  for (const field of fieldsToCheck) {
    const valA = a[field];
    const valB = b[field];
    if (valA && typeof valA === 'string' && valA.trim()) scoreA++;
    if (valB && typeof valB === 'string' && valB.trim()) scoreB++;
  }

  return scoreA >= scoreB ? indexA : indexB;
}
