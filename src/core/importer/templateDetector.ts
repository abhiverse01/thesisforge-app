// ============================================================
// ThesisForge Import — Template Detector
// Infers thesis type from extracted content using heuristics.
// ============================================================

import type { ExtractedMetadata, ExtractedChapter } from './types';

/**
 * Detect the thesis template type from metadata and chapter content.
 * Uses degree keywords first, then falls back to word count + structure analysis.
 */
export function detectTemplate(
  metadata: ExtractedMetadata,
  chapters: ExtractedChapter[]
): 'bachelor' | 'master' | 'phd' | 'report' | null {

  const degree = metadata.degreeAbbrev || metadata.degree || '';
  const totalWords = chapters.reduce((s, ch) => s + ch.body.split(' ').length, 0);
  const hasLitReview = chapters.some(ch =>
    /literature|related work|background/i.test(ch.title)
  );

  // Direct degree keyword match
  if (/phd|doctor|doctoral/i.test(degree)) return 'phd';
  if (/master|msc|meng|ma\b/i.test(degree)) return 'master';
  if (/bachelor|bsc|beng|ba\b/i.test(degree)) return 'bachelor';

  // Infer from structure heuristics
  if (totalWords > 40000 && hasLitReview) return 'phd';
  if (totalWords > 15000 && hasLitReview) return 'master';
  if (totalWords > 5000)  return 'bachelor';
  return 'report';
}
