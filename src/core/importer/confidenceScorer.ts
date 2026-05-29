// ============================================================
// ThesisForge Import — Confidence Scorer v2 (GODMODE)
// Per-field confidence scoring (0–1) for extracted data.
//
// FIX: The old scorer averaged over ALL 17 metadata fields equally.
// This meant that fields like journal, school, publisher, doi, url
// (which are rarely found in thesis PDFs) dragged the average
// down to ~25%, producing "20% confidence" even for good imports.
//
// v2 splits metadata into:
//   - CORE fields (title, author, year, abstract, keywords) — heavily weighted
//   - EXTENDED fields (institution, supervisor, department, faculty) — moderate weight
//   - OPTIONAL fields (subtitle, degree, journal, school, publisher, doi, url) — bonus only
// This ensures that a well-extracted title+author+year+abstract+keywords
// already yields ~70% metadata confidence even without extended fields.
// ============================================================

import type { ImportConfidence, ExtractedMetadata, ExtractedChapter, ExtractedReference } from './types';

// ---- Field Tiers ----
// Core: expected in virtually every thesis (5 fields)
const CORE_FIELDS: (keyof ExtractedMetadata)[] = ['title', 'author', 'year', 'abstract', 'keywords'];
// Extended: common in most theses (4 fields)
const EXTENDED_FIELDS: (keyof ExtractedMetadata)[] = ['institution', 'supervisor', 'department', 'faculty'];
// Optional: only in specific document types (8 fields) — bonus only
const OPTIONAL_FIELDS: (keyof ExtractedMetadata)[] = [
  'subtitle', 'degree', 'degreeAbbrev', 'journal', 'school', 'publisher', 'doi', 'url',
];

/**
 * Score extraction confidence across metadata, chapters, and references.
 * Weighted overall: 50% metadata, 30% chapters, 20% references.
 *
 * Metadata scoring:
 *   - Core average contributes 60% of metadata score
 *   - Extended average contributes 25% of metadata score
 *   - Optional average contributes 15% of metadata score
 *   - Missing optional fields are NOT penalized (they only boost if present)
 */
export function scoreConfidence(data: {
  metadata:   ExtractedMetadata;
  chapters:   ExtractedChapter[];
  references: ExtractedReference[];
}): ImportConfidence {
  const m = data.metadata;

  // ---- Per-field raw scores (unchanged quality logic) ----
  const metaScores: Record<string, number> = {
    title:       m.title       ? (m.title.length > 10 ? 0.9 : 0.6)  : 0,
    author:      m.author      ? (m.author.includes(' ') ? 0.9 : 0.6) : 0,
    institution: m.institution ? 0.8                                  : 0,
    supervisor:  m.supervisor  ? 0.75                                 : 0,
    year:        m.year        ? (/^\d{4}$/.test(m.year) ? 0.95 : 0.4) : 0,
    abstract:    m.abstract    ? (m.abstract.length > 100 ? 0.85 : 0.5) : 0,
    keywords:    m.keywords?.length ? 0.8                              : 0,
    department:  m.department  ? 0.7                                  : 0,
    faculty:     m.faculty     ? 0.7                                  : 0,
    subtitle:    m.subtitle    ? 0.8                                  : 0,
    degree:      m.degree      ? 0.7                                  : 0,
    degreeType:  m.degreeAbbrev? 0.7                                  : 0,
    journal:     m.journal     ? 0.8                                  : 0,
    school:      m.school      ? 0.7                                  : 0,
    publisher:   m.publisher   ? 0.7                                  : 0,
    doi:         m.doi         ? 0.9                                  : 0,
    url:         m.url         ? 0.8                                  : 0,
  };

  // ---- Field quality penalties (unchanged) ----
  if (metaScores.title > 0 && m.title) {
    if (m.title.length < 8) metaScores.title -= 0.2;
    if (/^\d/.test(m.title)) metaScores.title -= 0.15;
  }
  if (metaScores.author > 0 && m.author) {
    if (!m.author.includes(' ')) metaScores.author -= 0.2;
    if (/\d/.test(m.author)) metaScores.author -= 0.15;
  }
  if (metaScores.abstract > 0 && m.abstract) {
    if (m.abstract.split(' ').length < 30) metaScores.abstract -= 0.2;
  }

  // ---- Tiered metadata scoring ----
  // Core fields: average of core fields found (missing core fields penalize)
  const coreValues = CORE_FIELDS.map(f => metaScores[f as string] ?? 0);
  const coreFound = coreValues.filter(v => v > 0).length;
  const coreAverage = coreFound > 0
    ? coreValues.reduce((a, b) => a + b, 0) / coreFound
    : 0;

  // Extended fields: average of extended fields found (missing not penalized as hard)
  const extValues = EXTENDED_FIELDS.map(f => metaScores[f as string] ?? 0);
  const extFound = extValues.filter(v => v > 0).length;
  const extAverage = extFound > 0
    ? extValues.reduce((a, b) => a + b, 0) / extFound
    : 0;

  // Optional fields: bonus only — average of found optional fields
  const optValues = OPTIONAL_FIELDS.map(f => metaScores[f as string] ?? 0);
  const optFound = optValues.filter(v => v > 0).length;
  const optAverage = optFound > 0
    ? optValues.reduce((a, b) => a + b, 0) / optFound
    : 0;

  // Combine: core 60% + extended 25% + optional 15%
  // But if NO extended/optional found, don't penalize — just use core.
  const overallMeta = coreAverage * 0.60
    + (extFound > 0 ? extAverage * 0.25 : 0)
    + (optFound > 0 ? optAverage * 0.15 : 0)
    // Bonus: finding core fields above threshold lifts the score
    + (coreFound >= 4 ? 0.05 : 0)
    + (coreFound >= 5 ? 0.05 : 0);

  // ---- Chapter scoring ----
  let chapterScore = 0;
  if (data.chapters.length > 0) {
    // Scale: 1 chapter → 0.3, 3 → 0.6, 5+ → 0.8 (gentler curve)
    chapterScore = Math.min(0.8, (data.chapters.length / 5) * 0.8);
    // Body quality bonus: all chapters have substantial content
    const goodBodyChapters = data.chapters.filter(c => c.body.length > 200).length;
    if (goodBodyChapters === data.chapters.length && data.chapters.length > 0) {
      chapterScore += 0.2;
    } else if (goodBodyChapters > 0) {
      chapterScore += 0.1 * (goodBodyChapters / data.chapters.length);
    }
  }

  // ---- Reference scoring ----
  let refScore = 0;
  if (data.references.length > 0) {
    // Scale: 1 ref → 0.2, 5 → 0.35, 10+ → 0.7
    refScore = Math.min(0.7, (data.references.length / 10) * 0.7);
    // Metadata quality bonus
    const goodRefs = data.references.filter(r => r.title || r.author).length;
    refScore += (goodRefs / data.references.length) * 0.3;
  }

  // ---- Overall: weighted combination ----
  const overall = Math.min(1.0, overallMeta * 0.50 + chapterScore * 0.30 + refScore * 0.20);

  return {
    overall:    Math.round(overall * 100) / 100,
    metadata:   metaScores,
    chapters:   Math.round(chapterScore * 100) / 100,
    references: Math.round(refScore * 100) / 100,
  };
}

/**
 * Dynamic per-field confidence scoring.
 * Scores based on extraction source, extraction method, and value quality.
 * Returns 0-1, where 1.0 = very confident, 0.0 = no value.
 */
export function scoreFieldConfidence(
  field: string,
  value: string | undefined,
  context: { source: 'pdf' | 'tex' | 'docx' | 'md' | 'txt'; extractedBy: string }
): number {
  if (!value?.trim()) return 0;

  // Source-specific reliability boosts
  const sourceBoost: Record<string, number> = {
    tex:  0.15,
    docx: 0.10,
    md:   0.05,
    pdf:  0,
    txt:  -0.05,
  };

  // Specific extraction methods have known reliability
  const methodBoost: Record<string, number> = {
    'hypersetup.pdftitle':   0.95,
    'hypersetup.pdfauthor':  0.95,
    '\\title{}':             0.90,
    '\\author{}':            0.90,
    'abstract environment':  0.85,
    'chapter heading':       0.80,
    'bibtex entry':          0.90,
    'pdf-text-pattern':      0.65,
    'pdf-heuristic':         0.50,
    'docx-core-xml':         0.90,
    'docx-heading-style':    0.85,
    'docx-toc-xml':          0.80,
    'md-frontmatter':        0.90,
    'md-heading':            0.85,
  };

  let base = methodBoost[context.extractedBy] ?? 0.60;

  // Value quality adjustments based on field type
  const qualityPenalties: Record<string, (v: string) => number> = {
    title:    (v) => v.length < 10 ? -0.2 : v.length > 200 ? -0.1 : 0,
    author:   (v) => !v.includes(' ') ? -0.2 : 0,
    year:     (v) => !/^\d{4}$/.test(v) ? -0.4 : 0,
    abstract: (v) => v.split(' ').length < 30 ? -0.25 : 0,
    keywords: (v) => v.split(',').length < 2 ? -0.15 : 0,
  };

  const penalty = qualityPenalties[field]?.(value) ?? 0;

  return Math.max(0, Math.min(1, base + (sourceBoost[context.source] ?? 0) + penalty));
}

/** Source format multipliers — applied to base confidence scores */
export const SOURCE_FORMAT_BOOST: Record<string, number> = {
  tex:      1.10,
  md:       1.05,
  docx:     1.00,
  pdf:      0.95,
  txt:      0.85,
};

/**
 * Apply source format boost to confidence scores.
 * Called after scoreConfidence() to adjust per the import source format.
 */
export function applySourceBoost(
  scores: Record<string, number>,
  sourceFormat: string
): Record<string, number> {
  const mult = SOURCE_FORMAT_BOOST[sourceFormat] ?? 1.0;
  return Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, Math.min(1.0, v * mult)])
  );
}
