// ============================================================
// ThesisForge Intelligence — Algorithm 6: Completeness Scorer
// Weighted rubric per template, scored 0–100.
// Shows what matters most and what's worth filling in next.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { CompletenessResult, RubricItem } from './types';
import type { ThesisData, ThesisType } from '@/lib/thesis-types';
import { countWords } from './structureAnalyzer';

/**
 * Weighted rubric per template type.
 * Higher weight = more impact on the final score.
 * All templates share the same base rubric; PhD could add extras.
 */
const COMPLETENESS_RUBRIC: Record<
  ThesisType,
  Array<{ field: string; weight: number; label: string }>
> = {
  bachelor: [
    { field: 'metadata.title', weight: 10, label: 'Title' },
    { field: 'metadata.author', weight: 8, label: 'Author name' },
    { field: 'metadata.year', weight: 4, label: 'Year' },
    { field: 'metadata.university', weight: 4, label: 'Institution' },
    { field: 'metadata.supervisor', weight: 3, label: 'Supervisor' },
    { field: 'abstract', weight: 8, label: 'Abstract' },
    { field: 'chapters.length>0', weight: 15, label: 'At least one chapter' },
    { field: 'chapters.allHaveContent', weight: 12, label: 'All chapters have content' },
    { field: 'references.length>=3', weight: 10, label: 'At least 3 references' },
    { field: 'references.allValid', weight: 8, label: 'All references complete' },
    { field: 'options.citationStyle', weight: 3, label: 'Citation style selected' },
    { field: 'options.fontSize', weight: 2, label: 'Font size set' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set' },
    { field: 'keywords.length>0', weight: 4, label: 'Keywords filled' },
    { field: 'abstract_words>=150', weight: 7, label: 'Abstract ≥ 150 words' },
  ],
  master: [
    { field: 'metadata.title', weight: 10, label: 'Title' },
    { field: 'metadata.author', weight: 8, label: 'Author name' },
    { field: 'metadata.year', weight: 3, label: 'Year' },
    { field: 'metadata.university', weight: 4, label: 'Institution' },
    { field: 'metadata.supervisor', weight: 3, label: 'Supervisor' },
    { field: 'abstract', weight: 7, label: 'Abstract' },
    { field: 'chapters.length>0', weight: 14, label: 'At least one chapter' },
    { field: 'chapters.allHaveContent', weight: 12, label: 'All chapters have content' },
    { field: 'references.length>=5', weight: 10, label: 'At least 5 references' },
    { field: 'references.allValid', weight: 8, label: 'All references complete' },
    { field: 'options.citationStyle', weight: 3, label: 'Citation style selected' },
    { field: 'options.fontSize', weight: 2, label: 'Font size set' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set' },
    { field: 'keywords.length>0', weight: 4, label: 'Keywords filled' },
    { field: 'abstract_words>=250', weight: 7, label: 'Abstract ≥ 250 words' },
  ],
  phd: [
    { field: 'metadata.title', weight: 8, label: 'Title' },
    { field: 'metadata.author', weight: 6, label: 'Author name' },
    { field: 'metadata.year', weight: 2, label: 'Year' },
    { field: 'metadata.university', weight: 3, label: 'Institution' },
    { field: 'metadata.supervisor', weight: 2, label: 'Supervisor' },
    { field: 'abstract', weight: 6, label: 'Abstract' },
    { field: 'chapters.length>0', weight: 12, label: 'At least one chapter' },
    { field: 'chapters.allHaveContent', weight: 14, label: 'All chapters have content' },
    { field: 'references.length>=10', weight: 12, label: 'At least 10 references' },
    { field: 'references.allValid', weight: 10, label: 'All references complete' },
    { field: 'options.citationStyle', weight: 3, label: 'Citation style selected' },
    { field: 'options.fontSize', weight: 2, label: 'Font size set' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set' },
    { field: 'keywords.length>0', weight: 4, label: 'Keywords filled' },
    { field: 'abstract_words>=350', weight: 7, label: 'Abstract ≥ 350 words' },
  ],
  report: [
    { field: 'metadata.title', weight: 10, label: 'Title' },
    { field: 'metadata.author', weight: 8, label: 'Author name' },
    { field: 'metadata.year', weight: 4, label: 'Year' },
    { field: 'metadata.university', weight: 3, label: 'Institution' },
    { field: 'abstract', weight: 6, label: 'Abstract' },
    { field: 'chapters.length>0', weight: 16, label: 'At least one chapter' },
    { field: 'chapters.allHaveContent', weight: 14, label: 'All chapters have content' },
    { field: 'references.length>=3', weight: 10, label: 'At least 3 references' },
    { field: 'references.allValid', weight: 8, label: 'All references complete' },
    { field: 'options.citationStyle', weight: 3, label: 'Citation style selected' },
    { field: 'options.fontSize', weight: 2, label: 'Font size set' },
    { field: 'options.lineSpacing', weight: 2, label: 'Line spacing set' },
    { field: 'keywords.length>0', weight: 5, label: 'Keywords filled' },
    { field: 'abstract_words>=100', weight: 9, label: 'Abstract ≥ 100 words' },
  ],
};

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
  if (field === 'chapters.length>0') {
    const chapters = getIn(data, 'chapters') as unknown[] | undefined;
    return !!(chapters && chapters.length > 0);
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

  // Simple path check — is the value non-empty?
  const value = getIn(data, field);
  if (typeof value === 'string') return value.trim() !== '';
  return value !== undefined && value !== null;
}

/**
 * Score thesis completeness using a weighted rubric.
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

  return {
    score: Math.round(ratio * 100),
    earned,
    possible,
    breakdown,
    level:
      ratio >= 0.9
        ? 'ready'
        : ratio >= 0.7
          ? 'almost'
          : ratio >= 0.4
            ? 'in-progress'
            : 'early',
  };
}
