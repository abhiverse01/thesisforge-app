// ============================================================
// ThesisForge Intelligence — Algorithm 6: Completeness Scorer
// Weighted rubric per template, scored 0–100.
// Shows what matters most and what's worth filling in next.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { CompletenessResult, RubricItem, SubScores, RadarDataPoint } from './types';
import type { ThesisData, ThesisType } from '@/lib/thesis-types';
import { countWords } from './structureAnalyzer';

/**
 * Weighted rubric per template type.
 * Higher weight = more impact on the final score.
 * Each template has different weights reflecting their specific requirements.
 * PhD has stricter requirements than Bachelor's.
 */
const COMPLETENESS_RUBRIC: Record<
  ThesisType,
  Array<{ field: string; weight: number; label: string; category: 'metadata' | 'content' | 'references' | 'formatting' | 'advanced' }>
> = {
  bachelor: [
    { field: 'metadata.title', weight: 10, label: 'Title', category: 'metadata' },
    { field: 'metadata.author', weight: 8, label: 'Author name', category: 'metadata' },
    { field: 'metadata.year', weight: 4, label: 'Year', category: 'metadata' },
    { field: 'metadata.university', weight: 4, label: 'Institution', category: 'metadata' },
    { field: 'metadata.supervisor', weight: 3, label: 'Supervisor', category: 'metadata' },
    { field: 'abstract', weight: 8, label: 'Abstract', category: 'content' },
    { field: 'chapters.length>0', weight: 15, label: 'At least one chapter', category: 'content' },
    { field: 'chapters.allHaveContent', weight: 12, label: 'All chapters have content', category: 'content' },
    { field: 'references.length>=3', weight: 10, label: 'At least 3 references', category: 'references' },
    { field: 'references.allValid', weight: 8, label: 'All references complete', category: 'references' },
    { field: 'options.citationStyle', weight: 3, label: 'Citation style selected', category: 'formatting' },
    { field: 'options.fontSize', weight: 2, label: 'Font size set', category: 'formatting' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set', category: 'formatting' },
    { field: 'keywords.length>0', weight: 4, label: 'Keywords filled', category: 'advanced' },
    { field: 'abstract_words>=150', weight: 7, label: 'Abstract ≥ 150 words', category: 'advanced' },
  ],
  master: [
    { field: 'metadata.title', weight: 10, label: 'Title', category: 'metadata' },
    { field: 'metadata.author', weight: 8, label: 'Author name', category: 'metadata' },
    { field: 'metadata.year', weight: 3, label: 'Year', category: 'metadata' },
    { field: 'metadata.university', weight: 4, label: 'Institution', category: 'metadata' },
    { field: 'metadata.supervisor', weight: 3, label: 'Supervisor', category: 'metadata' },
    { field: 'abstract', weight: 7, label: 'Abstract', category: 'content' },
    { field: 'chapters.length>0', weight: 14, label: 'At least one chapter', category: 'content' },
    { field: 'chapters.allHaveContent', weight: 12, label: 'All chapters have content', category: 'content' },
    { field: 'references.length>=5', weight: 10, label: 'At least 5 references', category: 'references' },
    { field: 'references.allValid', weight: 8, label: 'All references complete', category: 'references' },
    { field: 'options.citationStyle', weight: 3, label: 'Citation style selected', category: 'formatting' },
    { field: 'options.fontSize', weight: 2, label: 'Font size set', category: 'formatting' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set', category: 'formatting' },
    { field: 'keywords.length>0', weight: 4, label: 'Keywords filled', category: 'advanced' },
    { field: 'abstract_words>=250', weight: 7, label: 'Abstract ≥ 250 words', category: 'advanced' },
  ],
  phd: [
    { field: 'metadata.title', weight: 8, label: 'Title', category: 'metadata' },
    { field: 'metadata.author', weight: 6, label: 'Author name', category: 'metadata' },
    { field: 'metadata.year', weight: 2, label: 'Year', category: 'metadata' },
    { field: 'metadata.university', weight: 3, label: 'Institution', category: 'metadata' },
    { field: 'metadata.supervisor', weight: 2, label: 'Supervisor', category: 'metadata' },
    { field: 'abstract', weight: 6, label: 'Abstract', category: 'content' },
    { field: 'chapters.length>0', weight: 12, label: 'At least one chapter', category: 'content' },
    { field: 'chapters.allHaveContent', weight: 14, label: 'All chapters have content', category: 'content' },
    { field: 'references.length>=10', weight: 12, label: 'At least 10 references', category: 'references' },
    { field: 'references.allValid', weight: 10, label: 'All references complete', category: 'references' },
    { field: 'options.citationStyle', weight: 3, label: 'Citation style selected', category: 'formatting' },
    { field: 'options.fontSize', weight: 2, label: 'Font size set', category: 'formatting' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set', category: 'formatting' },
    { field: 'keywords.length>0', weight: 4, label: 'Keywords filled', category: 'advanced' },
    { field: 'abstract_words>=350', weight: 7, label: 'Abstract ≥ 350 words', category: 'advanced' },
  ],
  report: [
    { field: 'metadata.title', weight: 10, label: 'Title', category: 'metadata' },
    { field: 'metadata.author', weight: 8, label: 'Author name', category: 'metadata' },
    { field: 'metadata.year', weight: 4, label: 'Year', category: 'metadata' },
    { field: 'metadata.university', weight: 3, label: 'Institution', category: 'metadata' },
    { field: 'abstract', weight: 6, label: 'Abstract', category: 'content' },
    { field: 'chapters.length>0', weight: 16, label: 'At least one chapter', category: 'content' },
    { field: 'chapters.allHaveContent', weight: 14, label: 'All chapters have content', category: 'content' },
    { field: 'references.length>=3', weight: 10, label: 'At least 3 references', category: 'references' },
    { field: 'references.allValid', weight: 8, label: 'All references complete', category: 'references' },
    { field: 'options.citationStyle', weight: 3, label: 'Citation style selected', category: 'formatting' },
    { field: 'options.fontSize', weight: 2, label: 'Font size set', category: 'formatting' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set', category: 'formatting' },
    { field: 'keywords.length>0', weight: 5, label: 'Keywords filled', category: 'advanced' },
    { field: 'abstract_words>=100', weight: 9, label: 'Abstract ≥ 100 words', category: 'advanced' },
  ],
  conference: [
    { field: 'metadata.title', weight: 10, label: 'Title', category: 'metadata' },
    { field: 'metadata.author', weight: 9, label: 'Author name', category: 'metadata' },
    { field: 'metadata.university', weight: 3, label: 'Institution', category: 'metadata' },
    { field: 'metadata.submissionDate', weight: 4, label: 'Submission date', category: 'metadata' },
    { field: 'abstract', weight: 8, label: 'Abstract', category: 'content' },
    { field: 'chapters.length>=5', weight: 14, label: 'All 5 sections present', category: 'content' },
    { field: 'chapters.allHaveContent', weight: 13, label: 'All sections have content', category: 'content' },
    { field: 'references.length>=5', weight: 10, label: 'At least 5 references', category: 'references' },
    { field: 'references.allValid', weight: 7, label: 'All references complete', category: 'references' },
    { field: 'options.citationStyle', weight: 4, label: 'Citation style (IEEE)', category: 'formatting' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set', category: 'formatting' },
    { field: 'keywords.length>0', weight: 6, label: 'Keywords filled', category: 'advanced' },
    { field: 'abstract_words>=200', weight: 8, label: 'Abstract ≥ 200 words', category: 'advanced' },
  ],
};

/**
 * Abstract quality check elements.
 */
const ABSTRACT_ELEMENTS = [
  { pattern: /problem|objective|aim|purpose|goal/i, label: 'problem statement' },
  { pattern: /method|approach|technique|design|procedure/i, label: 'methodology' },
  { pattern: /result|finding|outcome|perform/i, label: 'results' },
  { pattern: /conclu|implication|significance|contribute/i, label: 'conclusion' },
  { pattern: /background|context|literature|previous/i, label: 'context' },
];

/**
 * Conclusion completeness elements.
 */
const CONCLUSION_ELEMENTS = [
  { pattern: /summar|review|recap/i, label: 'summary' },
  { pattern: /implication|impact|significance/i, label: 'implications' },
  { pattern: /limitation|constraint|shortcoming/i, label: 'limitations' },
  { pattern: /future|next step|further research/i, label: 'future work' },
];

/**
 * Get a nested value from an object using dot-notation path.
 */
function getIn(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Check if a reference is valid (has required fields: author, title, year).
 */
function isReferenceValid(ref: Record<string, unknown>): boolean {
  return !!(
    ref.authors &&
    typeof ref.authors === 'string' &&
    ref.authors.trim() &&
    ref.title &&
    typeof ref.title === 'string' &&
    ref.title.trim() &&
    ref.year &&
    typeof ref.year === 'string' &&
    ref.year.trim()
  );
}

/**
 * Evaluate a single rubric field against thesis data.
 */
function evaluateField(field: string, data: Record<string, unknown>): boolean {
  // Handle special compound conditions
  if (field === 'chapters.length>0' || field.startsWith('chapters.length>=')) {
    const minCount = field.startsWith('chapters.length>=')
      ? parseInt(field.split('>=')[1])
      : 1;
    const chapters = getIn(data, 'chapters') as unknown[] | undefined;
    return !!(chapters && chapters.length >= minCount);
  }
  if (field === 'chapters.allHaveContent') {
    const chapters = getIn(data, 'chapters') as Array<{ content: string; subSections: Array<{ content: string }> }> | undefined;
    if (!chapters || chapters.length === 0) return false;
    return chapters.every((ch) => countWords(ch.content) > 30);
  }
  if (field.startsWith('references.length>=')) {
    const minCount = parseInt(field.split('>=')[1]);
    const refs = getIn(data, 'references') as unknown[] | undefined;
    return !!(refs && refs.length >= minCount);
  }
  if (field === 'references.allValid') {
    const refs = getIn(data, 'references') as Record<string, unknown>[] | undefined;
    if (!refs || refs.length === 0) return false;
    return refs.every((r) => isReferenceValid(r));
  }
  if (field.startsWith('abstract_words>=')) {
    const minWords = parseInt(field.split('>=')[1]);
    const abstract = getIn(data, 'abstract') as string | undefined;
    return countWords(abstract) >= minWords;
  }
  if (field === 'options.citationStyle') {
    const style = getIn(data, 'options.citationStyle') as string | undefined;
    return !!style;
  }
  if (field === 'options.fontSize') {
    const size = getIn(data, 'options.fontSize') as string | undefined;
    return !!size;
  }
  if (field === 'options.lineSpacing') {
    const spacing = getIn(data, 'options.lineSpacing') as string | undefined;
    return !!spacing;
  }
  if (field === 'keywords.length>0') {
    const keywords = getIn(data, 'keywords') as unknown[] | undefined;
    return !!(keywords && keywords.length > 0);
  }
  if (field === 'references.hasDoi') {
    const refs = getIn(data, 'references') as Array<Record<string, unknown>> | undefined;
    if (!refs || refs.length === 0) return false;
    // At least half of references should have DOIs for a conference paper
    const doiCount = refs.filter((r) => r.doi && typeof r.doi === 'string' && r.doi.trim()).length;
    return doiCount >= Math.ceil(refs.length / 2);
  }

  // Simple path check — is the value non-empty?
  const value = getIn(data, field);
  if (typeof value === 'string') return value.trim() !== '';
  return value !== undefined && value !== null;
}

/**
 * Count abstract quality elements present in the text.
 * Checks for: problem statement, methodology, results, conclusion, context.
 */
function countAbstractElements(abstract: string): number {
  if (!abstract) return 0;
  let count = 0;
  for (const elem of ABSTRACT_ELEMENTS) {
    if (elem.pattern.test(abstract)) count++;
  }
  return count;
}

/**
 * Count conclusion completeness elements.
 * Checks for: summary, implications, limitations, future work.
 */
function countConclusionElements(chapters: Array<{ title: string; content: string; subSections: Array<{ content: string }> }>): number {
  // Find the conclusion chapter
  const conclusionChapter = chapters.find((ch) =>
    /conclu|summary|future/i.test(ch.title)
  );
  if (!conclusionChapter) return 0;

  const fullText = [
    conclusionChapter.content || '',
    ...(conclusionChapter.subSections || []).map((ss) => ss.content || ''),
  ].join(' ');

  let count = 0;
  for (const elem of CONCLUSION_ELEMENTS) {
    if (elem.pattern.test(fullText)) count++;
  }
  return count;
}

/**
 * Compute citation coverage per chapter.
 * Returns the percentage of chapters that contain at least one \cite command.
 */
function computeCitationCoverage(
  chapters: Array<{ content: string; subSections?: Array<{ content: string }> }>
): number {
  if (chapters.length === 0) return 0;
  const citationPattern = /\\cite(?:p|t|author|year|alp|num)?\{/;
  let chaptersWithCitations = 0;
  for (const ch of chapters) {
    const fullText = [ch.content || '', ...(ch.subSections || []).map((ss) => ss.content || '')].join(' ');
    if (citationPattern.test(fullText)) {
      chaptersWithCitations++;
    }
  }
  return Math.round((chaptersWithCitations / chapters.length) * 100);
}

/**
 * Compute average subsection depth across chapters.
 */
function computeSubsectionDepth(
  chapters: Array<{ subSections?: Array<{ content: string; subSections?: Array<{ content: string }> }> }>
): number {
  if (chapters.length === 0) return 0;
  let totalDepth = 0;
  for (const ch of chapters) {
    const ssCount = (ch.subSections || []).length;
    totalDepth += ssCount;
  }
  return Math.round((totalDepth / chapters.length) * 10) / 10;
}

/**
 * Compute keyword-content alignment score.
 * Checks how many user keywords appear in the thesis content.
 */
function computeKeywordAlignment(
  keywords: string[],
  chapters: Array<{ content: string; subSections?: Array<{ content: string }> }>
): number {
  if (keywords.length === 0) return 1.0; // No keywords = perfect (nothing to misalign)

  const allContent = chapters
    .map((ch) => [ch.content || '', ...(ch.subSections || []).map((ss) => ss.content || '')].join(' ').toLowerCase())
    .join(' ');

  let matchCount = 0;
  for (const kw of keywords) {
    if (allContent.includes(kw.toLowerCase())) {
      matchCount++;
    }
  }
  return Math.round((matchCount / keywords.length) * 100) / 100;
}

/**
 * Score thesis completeness using a weighted rubric.
 *
 * Features:
 * - Per-template weighted rubrics (PhD has different weights than Bachelor's)
 * - Sub-scores: metadata, content, references, formatting, advanced
 * - Radar data for chart display
 * - New dimensions: citation coverage, abstract quality, conclusion completeness,
 *   subsection depth, keyword-content alignment
 *
 * Edge cases:
 * - null data → returns score 0
 * - Empty thesis → returns score 0 with all items unachieved
 * - Partially filled → proportional score
 *
 * Performance budget: < 1ms per call
 */
export function scoreCompleteness(
  wizardData: ThesisData | null,
  templateId: ThesisType
): CompletenessResult {
  const rubric = COMPLETENESS_RUBRIC[templateId] || COMPLETENESS_RUBRIC.bachelor;
  let earned = 0;
  let possible = 0;
  const breakdown: RubricItem[] = [];

  // Convert ThesisData to a plain object for getIn to work
  const data = wizardData
    ? {
        metadata: wizardData.metadata,
        abstract: wizardData.abstract,
        keywords: wizardData.keywords,
        chapters: wizardData.chapters,
        references: wizardData.references,
        options: wizardData.options,
      }
    : {};

  for (const item of rubric) {
    const achieved = evaluateField(item.field, data as Record<string, unknown>);
    if (achieved) earned += item.weight;
    possible += item.weight;
    breakdown.push({ ...item, achieved });
  }

  const ratio = possible > 0 ? earned / possible : 0;

  // Find the single highest-value incomplete item for the "next action" pointer
  const nextAction = breakdown
    .filter(item => !item.achieved)
    .sort((a, b) => b.weight - a.weight)[0] || null;

  // --- Compute sub-scores ---
  const subScores = computeSubScores(rubric, breakdown, data, wizardData);

  // --- Compute radar data ---
  const radarData: RadarDataPoint[] = [
    { axis: 'Metadata', value: subScores.metadata },
    { axis: 'Content', value: subScores.content },
    { axis: 'References', value: subScores.references },
    { axis: 'Formatting', value: subScores.formatting },
    { axis: 'Advanced', value: subScores.advanced },
  ];

  return {
    score: Math.round(ratio * 100),
    earned,
    possible,
    breakdown,
    nextAction: nextAction ? {
      field: nextAction.field,
      label: nextAction.label,
      weight: nextAction.weight,
      action: `Next: ${nextAction.label} (+${nextAction.weight} pts)`,
    } : null,
    level:
      ratio >= 0.9
        ? 'ready'
        : ratio >= 0.7
          ? 'almost'
          : ratio >= 0.4
            ? 'in-progress'
            : 'early',
    subScores,
    radarData,
  };
}

/**
 * Compute 5 sub-scores based on rubric categories and advanced dimensions.
 */
function computeSubScores(
  rubric: Array<{ field: string; weight: number; label: string; category: 'metadata' | 'content' | 'references' | 'formatting' | 'advanced' }>,
  breakdown: RubricItem[],
  data: Record<string, unknown>,
  wizardData: ThesisData | null
): SubScores {
  // Group rubric items by category
  const categoryScores: Record<string, { earned: number; possible: number }> = {
    metadata: { earned: 0, possible: 0 },
    content: { earned: 0, possible: 0 },
    references: { earned: 0, possible: 0 },
    formatting: { earned: 0, possible: 0 },
    advanced: { earned: 0, possible: 0 },
  };

  for (let i = 0; i < rubric.length; i++) {
    const item = rubric[i];
    const achieved = breakdown[i]?.achieved ?? false;
    const cat = item.category;
    categoryScores[cat].possible += item.weight;
    if (achieved) categoryScores[cat].earned += item.weight;
  }

  // Compute advanced sub-score with additional dimensions
  let advancedBonus = 0;
  let advancedPossible = 0;

  if (wizardData) {
    // Abstract quality (5 elements, worth up to 20 bonus)
    const abstractElements = countAbstractElements(wizardData.abstract);
    advancedBonus += (abstractElements / 5) * 20;
    advancedPossible += 20;

    // Conclusion completeness (4 elements, worth up to 15 bonus)
    const conclusionElements = countConclusionElements(
      wizardData.chapters.map((ch) => ({
        title: ch.title,
        content: ch.content,
        subSections: ch.subSections,
      }))
    );
    advancedBonus += (conclusionElements / 4) * 15;
    advancedPossible += 15;

    // Citation coverage per chapter (0-100%, worth up to 15 bonus)
    const citationCoverage = computeCitationCoverage(
      wizardData.chapters.map((ch) => ({
        content: ch.content,
        subSections: ch.subSections,
      }))
    );
    advancedBonus += (citationCoverage / 100) * 15;
    advancedPossible += 15;

    // Subsection depth (0-3 avg subsections per chapter is good, worth up to 10 bonus)
    const depth = computeSubsectionDepth(
      wizardData.chapters.map((ch) => ({
        subSections: ch.subSections,
      }))
    );
    const depthScore = Math.min(depth / 3, 1);
    advancedBonus += depthScore * 10;
    advancedPossible += 10;

    // Keyword-content alignment (0-1, worth up to 10 bonus)
    const keywordAlignment = computeKeywordAlignment(wizardData.keywords, wizardData.chapters);
    advancedBonus += keywordAlignment * 10;
    advancedPossible += 10;
  }

  // Compute final sub-scores as percentages (0-100)
  const computePct = (earned: number, possible: number): number => {
    if (possible === 0) return 0;
    return Math.round((earned / possible) * 100);
  };

  // Merge base advanced score with bonus
  const baseAdvanced = categoryScores.advanced;
  const mergedAdvancedEarned = baseAdvanced.earned + advancedBonus;
  const mergedAdvancedPossible = baseAdvanced.possible + advancedPossible;

  return {
    metadata: computePct(categoryScores.metadata.earned, categoryScores.metadata.possible),
    content: computePct(categoryScores.content.earned, categoryScores.content.possible),
    references: computePct(categoryScores.references.earned, categoryScores.references.possible),
    formatting: computePct(categoryScores.formatting.earned, categoryScores.formatting.possible),
    advanced: computePct(mergedAdvancedEarned, mergedAdvancedPossible),
  };
}
