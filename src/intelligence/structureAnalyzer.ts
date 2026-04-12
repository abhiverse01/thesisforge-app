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
 * IMRAD section keys expected in order for IMRAD-compliant templates.
 */
const IMRAD_SECTIONS = ['introduction', 'methodology', 'results', 'discussion'];

/**
 * Academic norms for specific chapter percentage ranges per template type.
 * Used for chapter imbalance detection beyond the tolerance-based approach.
 */
const ACADEMIC_NORMS: Record<string, Record<string, { min: number; max: number; label: string }>> = {
  master: {
    literature: { min: 0.15, max: 0.25, label: 'Literature Review' },
  },
  phd: {
    literature: { min: 0.15, max: 0.25, label: 'Literature Review' },
  },
};

/**
 * Count words in a text string.
 * Handles empty/null gracefully.
 */
export function countWords(text: string | undefined | null): number {
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
 * Compute IMRAD compliance score (0-100) for templates that follow IMRAD.
 * Checks presence and correct order of: Introduction, Methods, Results, Discussion.
 *
 * Scoring:
 * - Each present section: +20 points (max 80 for all 4)
 * - Correct order bonus: +10
 * - All 4 present and in order: +10 bonus = 100
 */
function computeImradScore(
  chapters: Array<{ id: string; title: string; words: number }>
): number {
  const sectionKeys = chapters.map((ch) => inferChapterKey(ch.title));
  const foundIndices: Map<string, number> = new Map();

  for (let i = 0; i < sectionKeys.length; i++) {
    const key = sectionKeys[i];
    if (key && IMRAD_SECTIONS.includes(key) && !foundIndices.has(key)) {
      foundIndices.set(key, i);
    }
  }

  let score = 0;

  // Presence scoring: 20 points per present section
  for (const section of IMRAD_SECTIONS) {
    if (foundIndices.has(section)) {
      score += 20;
    }
  }

  // Order scoring: check that sections appear in IMRAD order
  const foundOrder = IMRAD_SECTIONS.filter((s) => foundIndices.has(s));
  let isCorrectOrder = true;
  let lastIndex = -1;
  for (const section of foundOrder) {
    const idx = foundIndices.get(section)!;
    if (idx <= lastIndex) {
      isCorrectOrder = false;
      break;
    }
    lastIndex = idx;
  }

  if (isCorrectOrder && foundOrder.length >= 2) {
    score += 10;
  }

  // All 4 present and correctly ordered: full bonus
  if (foundOrder.length === 4 && isCorrectOrder) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Detect dense paragraphs — runs of > 5 consecutive paragraphs without
 * subsection breaks within a chapter.
 *
 * A "paragraph" is defined as text between blank lines in the chapter content.
 * Subsection content is considered a subsection break.
 */
function detectDenseParagraphs(chapters: ThesisChapter[]): StructureAnalysis['denseParagraphs'] {
  const result: StructureAnalysis['denseParagraphs'] = [];
  const DENSE_THRESHOLD = 5;

  for (const ch of chapters) {
    const content = ch.content || '';
    if (!content.trim()) continue;

    // Split into paragraphs by double newline
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => countWords(p) > 10); // only count substantial paragraphs

    // If the chapter has subsections, the main content paragraphs are less concerning
    // Check for runs of consecutive paragraphs without subsection breaks
    if (paragraphs.length > DENSE_THRESHOLD) {
      // Find runs of > 5 paragraphs
      for (let start = 0; start <= paragraphs.length - DENSE_THRESHOLD; start++) {
        const run = paragraphs.slice(start, start + DENSE_THRESHOLD);
        if (run.length >= DENSE_THRESHOLD) {
          const runWordCount = run.reduce((sum, p) => sum + countWords(p), 0);
          result.push({
            chapterId: ch.id,
            chapterTitle: ch.title,
            paragraphIndex: start,
            wordCount: runWordCount,
          });
          break; // One warning per chapter is enough
        }
      }
    }
  }

  return result;
}

/**
 * Detect chapters with percentage outside academic norms.
 * This catches issues that tolerance-based checks might miss.
 */
function detectAcademicNormIssues(
  wordCounts: Array<{ id: string; title: string; words: number }>,
  totalWords: number,
  templateId: ThesisType
): StructureIssue[] {
  const norms = ACADEMIC_NORMS[templateId];
  if (!norms) return [];

  const issues: StructureIssue[] = [];

  for (const ch of wordCounts) {
    const key = inferChapterKey(ch.title);
    if (!key || !norms[key]) continue;

    const norm = norms[key];
    const actual = ch.words / totalWords;

    if (actual < norm.min) {
      issues.push({
        chapterId: ch.id,
        chapterTitle: ch.title,
        actualPct: Math.round(actual * 100),
        idealPct: Math.round(((norm.min + norm.max) / 2) * 100),
        direction: 'under',
        severity: 'medium',
        words: ch.words,
      });
    } else if (actual > norm.max) {
      issues.push({
        chapterId: ch.id,
        chapterTitle: ch.title,
        actualPct: Math.round(actual * 100),
        idealPct: Math.round(((norm.min + norm.max) / 2) * 100),
        direction: 'over',
        severity: 'medium',
        words: ch.words,
      });
    }
  }

  return issues;
}

/**
 * Analyze the structural balance of chapters compared to an ideal distribution.
 *
 * Features:
 * - IMRAD compliance scoring for bachelor/report templates
 * - Chapter imbalance detection by academic norms
 * - Dense paragraph detection (> 5 consecutive paragraphs without subsection breaks)
 * - imradScore: number (0-100) in output
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

  // Add academic norm issues (e.g., lit review 15-25% for Master's)
  const normIssues = detectAcademicNormIssues(wordCounts, totalWords, templateId);
  // Deduplicate: only add norm issues that aren't already flagged
  const existingKeys = new Set(issues.map((i) => i.chapterId));
  for (const ni of normIssues) {
    if (!existingKeys.has(ni.chapterId)) {
      issues.push(ni);
    }
  }

  // Compute IMRAD score
  const imradScore = computeImradScore(wordCounts);

  // Detect dense paragraphs
  const denseParagraphs = detectDenseParagraphs(chapters);

  // Build suggestions
  const suggestions: string[] = [
    ...issues.map(generateBalanceSuggestion),
    ...generateDenseParagraphSuggestions(denseParagraphs),
    ...generateImradSuggestions(imradScore, templateId),
  ];

  return {
    totalWords,
    wordCounts,
    issues,
    suggestions,
    balanceScore: computeBalanceScore(wordCounts, totalWords, profile),
    imradScore,
    denseParagraphs,
  };
}

/**
 * Generate suggestions for dense paragraphs.
 */
function generateDenseParagraphSuggestions(
  denseParagraphs: StructureAnalysis['denseParagraphs']
): string[] {
  return denseParagraphs.map((dp) =>
    `"${dp.chapterTitle}" has a block of 5+ paragraphs (${dp.wordCount} words) without subsection breaks. Consider adding subsection headings to improve readability.`
  );
}

/**
 * Generate suggestions based on IMRAD score.
 */
function generateImradSuggestions(imradScore: number, templateId: ThesisType): string[] {
  const suggestions: string[] = [];
  if (imradScore < 60) {
    suggestions.push(
      'Your thesis structure has low IMRAD compliance. Ensure chapters follow: Introduction → Methods → Results → Discussion order.'
    );
  } else if (imradScore < 100 && imradScore >= 60) {
    suggestions.push(
      'Consider improving IMRAD structure. All four sections (Introduction, Methods, Results, Discussion) should be present and in order.'
    );
  }
  return suggestions;
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
