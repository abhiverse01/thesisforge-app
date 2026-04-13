// ============================================================
// ThesisForge Smart Import — Confidence Scorer
// Computes per-field confidence scores for import review.
// ============================================================

import type { ImportConfidence } from './types';

export function scoreConfidence(data: {
  metadata: Record<string, unknown>;
  chapters: Array<{ body: string }>;
  references: Array<unknown>;
}): ImportConfidence {
  const m = data.metadata;

  const metaScores: Record<string, number> = {
    title: m.title ? (String(m.title).length > 10 ? 0.9 : 0.6) : 0,
    author: m.author ? (String(m.author).includes(' ') ? 0.9 : 0.6) : 0,
    institution: m.institution ? 0.8 : 0,
    supervisor: m.supervisor ? 0.75 : 0,
    year: m.year ? (/^\d{4}$/.test(String(m.year)) ? 0.95 : 0.4) : 0,
    abstract: m.abstract ? (String(m.abstract).length > 100 ? 0.85 : 0.5) : 0,
    keywords: Array.isArray(m.keywords) && m.keywords.length > 0 ? 0.8 : 0,
    department: m.department ? 0.7 : 0,
  };

  const chapterScore =
    data.chapters.length > 0
      ? (Math.min(1, data.chapters.length / 5) * 0.8 +
          (data.chapters.every((c) => c.body.length > 200) ? 0.2 : 0))
      : 0;

  const refScore =
    data.references.length > 0
      ? (Math.min(1, data.references.length / 10) * 0.7 +
          (data.references.every((r: unknown) => {
            const ref = r as Record<string, unknown>;
            return ref.title || ref.author;
          })
            ? 0.3
            : 0))
      : 0;

  const metaValues = Object.values(metaScores);
  const overallMeta = metaValues.reduce((a, b) => a + b, 0) / metaValues.length;
  const overall = overallMeta * 0.5 + chapterScore * 0.3 + refScore * 0.2;

  return {
    overall: Math.round(overall * 100) / 100,
    metadata: metaScores,
    chapters: Math.round(chapterScore * 100) / 100,
    references: Math.round(refScore * 100) / 100,
  };
}
