// ============================================================
// ThesisForge Smart Import — Template Detector
// Infers the thesis template type from content metadata.
// ============================================================

import type { ExtractedMetadata, ExtractedChapter } from './types';

export function detectTemplate(
  metadata: Record<string, unknown>,
  chapters: ExtractedChapter[]
): 'bachelor' | 'master' | 'phd' | 'report' | null {
  const degree = String(metadata.degreeAbbrev || metadata.degree || '');
  const totalWords = chapters.reduce((s, ch) => s + ch.body.split(' ').length, 0);
  const hasLitReview = chapters.some((ch) =>
    /literature|related work|background/i.test(ch.title)
  );

  if (/phd|doctor|doctoral/i.test(degree)) return 'phd';
  if (/master|msc|meng|ma\b/i.test(degree)) return 'master';
  if (/bachelor|bsc|beng|ba\b/i.test(degree)) return 'bachelor';

  if (totalWords > 40000 && hasLitReview) return 'phd';
  if (totalWords > 15000 && hasLitReview) return 'master';
  if (totalWords > 5000) return 'bachelor';
  return 'report';
}
