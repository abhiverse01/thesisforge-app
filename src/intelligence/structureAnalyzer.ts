// ============================================================
// ThesisForge Intelligence — Algorithm 3: Structural Balance Analyzer
// Statistical analysis of word count distribution across chapters
// compared against ideal distribution profiles per template type.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { StructureAnalysis, StructureIssue } from './types';
import type { ThesisChapter, ThesisType } from '@/lib/thesis-types';

/**
 * Ideal word count distribution per thesis type.
 * Percentages of total body word count per section.
 * Based on academic writing guides, not arbitrary values.
 */
const IDEAL_DISTRIBUTION: Record<
  string,
  Record<string, { ideal: number; tolerance: number }>
> = {
  bachelor: {
    introduction: { ideal: 0.1, tolerance: 0.05 },
    background:   { ideal: 0.2, tolerance: 0.08 },
    methodology:  { ideal: 0.2, tolerance: 0.08 },
    results:      { ideal: 0.25, tolerance: 0.1 },
    discussion:   { ideal: 0.15, tolerance: 0.07 },
    conclusion:   { ideal: 0.1, tolerance: 0.05 },
  },
  master: {
    introduction: { ideal: 0.08, tolerance: 0.05 },
    literature:   { ideal: 0.18, tolerance: 0.07 },
    methodology:  { ideal: 0.17, tolerance: 0.07 },
    results:      { ideal: 0.22, tolerance: 0.08 },
    discussion:   { ideal: 0.2, tolerance: 0.08 },
    conclusion:   { ideal: 0.1, tolerance: 0.05 },
  },
  phd: {
    introduction: { ideal: 0.08, tolerance: 0.04 },
    literature:   { ideal: 0.18, tolerance: 0.07 },
    methodology:  { ideal: 0.15, tolerance: 0.06 },
    results:      { ideal: 0.2, tolerance: 0.08 },
    discussion:   { ideal: 0.2, tolerance: 0.08 },
    conclusion:   { ideal: 0.08, tolerance: 0.04 },
  },
  report: {
    introduction: { ideal: 0.15, tolerance: 0.08 },
    methodology:  { ideal: 0.3, tolerance: 0.12 },
    results:      { ideal: 0.35, tolerance: 0.15 },
    conclusion:   { ideal: 0.2, tolerance: 0.1 },
  },
};

/**
 * Count words in a text string.
 * Handles empty/null gracefully.
 */
function countWords(text: string | undefined | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Map a free-form chapter title to a known distribution key.
 * Returns null for unknown/unclassifiable chapters.
 */
function inferChapterKey(title: string): string | null {
  const t = title.toLowerCase();
  if (/intro/i.test(t)) return 'introduction';
  if (/background|related|literature|review/i.test(t)) return 'background';
  if (/method|approach|design/i.test(t)) return 'methodology';
  if (/result|finding|experiment|eval/i.test(t)) return 'results';
  if (/discussion|analysis|interpretation/i.test(t)) return 'discussion';
  if (/conclu|summary|future/i.test(t)) return 'conclusion';
  // For PhD/master, map "literature" separately
  if (/state of the art/i.test(t)) return 'literature';
  return null;
}

/**
 * Compute a balance score (0-100) representing how well the word
 * distribution matches the ideal profile.
 */
function computeBalanceScore(
  wordCounts: Array<{ id: string; title: string; words: number }>,
  total: number,
  profile: Record<string, { ideal: number; tolerance: number }>
): number | null {
  let totalPenalty = 0;
  let counted = 0;

  for (const ch of wordCounts) {
    const key = inferChapterKey(ch.title);
    const norm = profile[key as string];
    if (!norm) continue;

    const actual = ch.words / total;
    const penalty = Math.max(0, Math.abs(actual - norm.ideal) - norm.tolerance);
    totalPenalty += penalty / norm.tolerance;
    counted++;
  }

  if (counted === 0) return null;
  return Math.max(0, Math.round(100 - (totalPenalty / counted) * 100));
}

/**
 * Analyze the structural balance of chapters compared to an ideal distribution.
 *
 * Edge cases:
 * - No chapters → returns null
 * - Total words < 100 → returns null (not enough data)
 * - All chapters with zero content → returns null
 * - Chapters with unclassifiable titles → skipped in analysis
 *
 * Performance budget: < 5ms for up to 20,000 words
 */
export function analyzeStructure(
  chapters: ThesisChapter[],
  templateId: ThesisType
): StructureAnalysis | null {
  if (!chapters || chapters.length === 0) return null;

  const profile = IDEAL_DISTRIBUTION[templateId];
  if (!profile) return null;

  // Count words per chapter (content + all subsections)
  const wordCounts = chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    words:
      countWords(ch.content) +
      (ch.subSections || []).reduce(
        (sum, ss) => sum + countWords(ss.content),
        0
      ),
  }));

  const totalWords = wordCounts.reduce((s, ch) => s + ch.words, 0);
  if (totalWords < 100) return null;

  const issues: StructureIssue[] = [];

  for (const ch of wordCounts) {
    const key = inferChapterKey(ch.title);
    if (!key || !profile[key]) continue;

    const norm = profile[key];
    const actual = ch.words / totalWords;
    const delta = actual - norm.ideal;

    if (Math.abs(delta) > norm.tolerance) {
      issues.push({
        chapterId: ch.id,
        chapterTitle: ch.title,
        actualPct: Math.round(actual * 100),
        idealPct: Math.round(norm.ideal * 100),
        direction: delta > 0 ? 'over' : 'under',
        severity:
          Math.abs(delta) > norm.tolerance * 2 ? 'high' : 'medium',
        words: ch.words,
      });
    }
  }

  return {
    totalWords,
    wordCounts,
    issues,
    suggestions: issues.map(generateBalanceSuggestion),
    balanceScore: computeBalanceScore(wordCounts, totalWords, profile),
  };
}

/**
 * Generate a concrete, actionable suggestion for a structure issue.
 * Returns a human-readable string specific to the flagged chapter.
 */
function generateBalanceSuggestion(issue: StructureIssue): string {
  const t = issue.chapterTitle.toLowerCase();

  if (issue.direction === 'over' && /intro/i.test(t)) {
    return `"${issue.chapterTitle}" is ${issue.actualPct}% of your thesis (ideal: ~${issue.idealPct}%). Consider moving some background material to a dedicated Literature Review chapter.`;
  }
  if (issue.direction === 'under' && /intro/i.test(t)) {
    return `"${issue.chapterTitle}" is only ${issue.actualPct}% of your thesis (ideal: ~${issue.idealPct}%). Your introduction should frame the problem clearly — add context about why this research matters.`;
  }
  if (issue.direction === 'over' && /result|finding/i.test(t)) {
    return `"${issue.chapterTitle}" is ${issue.actualPct}% (ideal: ~${issue.idealPct}%). Consider splitting into two chapters or moving supplementary data to appendices.`;
  }
  if (issue.direction === 'under' && /result/i.test(t)) {
    return `"${issue.chapterTitle}" is only ${issue.actualPct}% (ideal: ~${issue.idealPct}%). Add more detailed findings, tables, and figures to strengthen this section.`;
  }
  if (issue.direction === 'over' && /method/i.test(t)) {
    return `"${issue.chapterTitle}" is ${issue.actualPct}% (ideal: ~${issue.idealPct}%). Consider moving detailed procedures to appendices or a supplementary methods section.`;
  }
  if (issue.direction === 'under' && /method/i.test(t)) {
    return `"${issue.chapterTitle}" is only ${issue.actualPct}% (ideal: ~${issue.idealPct}%). Provide more detail on your research design, tools, and data collection methods.`;
  }
  if (issue.direction === 'over' && /conclu|summary/i.test(t)) {
    return `"${issue.chapterTitle}" is ${issue.actualPct}% (ideal: ~${issue.idealPct}%). Move implications and future work suggestions here, keep only the summary.`;
  }
  if (issue.direction === 'under' && /conclu|summary/i.test(t)) {
    return `"${issue.chapterTitle}" is only ${issue.actualPct}% (ideal: ~${issue.idealPct}%). Add implications, limitations, and future research directions.`;
  }
  if (issue.direction === 'over' && /discussion|analysis/i.test(t)) {
    return `"${issue.chapterTitle}" is ${issue.actualPct}% (ideal: ~${issue.idealPct}%). Move detailed statistical analysis to the results chapter.`;
  }
  if (issue.direction === 'under' && /discussion|analysis/i.test(t)) {
    return `"${issue.chapterTitle}" is only ${issue.actualPct}% (ideal: ~${issue.idealPct}%). Add deeper interpretation of your findings and connect them back to the literature.`;
  }

  // Generic fallback
  if (issue.direction === 'over') {
    return `"${issue.chapterTitle}" is ${issue.actualPct}% of your thesis (ideal: ~${issue.idealPct}%). Consider trimming or reorganizing this section.`;
  }
  return `"${issue.chapterTitle}" is only ${issue.actualPct}% of your thesis (ideal: ~${issue.idealPct}%). Consider expanding this section with more detail.`;
}

/** Re-export countWords for use by other algorithms */
export { countWords };
