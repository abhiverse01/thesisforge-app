// ============================================================
// ThesisForge Import — Template Detector
// Infers thesis type from extracted content using heuristics.
// ============================================================

import type { ExtractedMetadata, ExtractedChapter } from './types';

/**
 * Detect the thesis template type from metadata and chapter content.
 * Uses degree keywords first, then falls back to word count + structure analysis.
 *
 * Enhancement rules:
 * - PhD detection strengthened when chapters have subsections (structured dissertation)
 * - Journal field in metadata → conference paper detection
 * - Fewer than 3 chapters → prefer 'report' type
 */
export function detectTemplate(
  metadata: ExtractedMetadata,
  chapters: ExtractedChapter[]
): 'bachelor' | 'master' | 'phd' | 'report' | 'conference' | null {

  const degree = metadata.degreeAbbrev || metadata.degree || '';
  const totalWords = chapters.reduce((s, ch) => s + ch.body.split(' ').length, 0);
  const hasLitReview = chapters.some(ch =>
    /literature|related work|background/i.test(ch.title)
  );

  // Check if chapters have substantive subsections (multi-level structure)
  const hasChaptersWithSubsections = chapters.some(
    (ch) => ch.subsections.length > 0 && ch.subsections.some((ss) => ss.body.trim().length > 20)
  );

  // Direct degree keyword match
  if (/phd|doctor|doctoral/i.test(degree)) {
    // Strengthen PhD detection when structured with subsections
    if (hasChaptersWithSubsections) return 'phd';
    // Even without subsections, explicit PhD degree is strong signal
    return 'phd';
  }
  if (/master|msc|meng|ma\b/i.test(degree)) return 'master';
  if (/bachelor|bsc|beng|ba\b/i.test(degree)) return 'bachelor';

  // Conference paper detection — enhanced with journal field check
  const titleLower = (metadata.title || '').toLowerCase();
  const isConference = /conference|proceedings|symposium|workshop/i.test(titleLower)
    || /conference|proceedings|symposium|workshop/i.test(metadata.degree || '')
    || !!metadata.journal;  // Journal field suggests article/conference paper
  if (isConference && totalWords < 15000) return 'conference';

  // Fewer than 3 detected chapters → prefer 'report' type
  if (chapters.length < 3) return 'report';

  // Infer from structure heuristics
  if (totalWords > 40000 && hasLitReview) return 'phd';
  if (totalWords > 15000 && hasLitReview) return 'master';
  if (totalWords > 5000)  return 'bachelor';
  return 'report';
}
