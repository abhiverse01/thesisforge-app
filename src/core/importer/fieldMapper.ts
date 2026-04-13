// ============================================================
// ThesisForge Smart Import — Field Mapper
// Maps extracted import data to ThesisData-compatible fields.
// ============================================================

import type { ImportResult, FieldMapping } from './types';

export function mapImportToThesisData(
  result: ImportResult
): { mappings: FieldMapping[]; preview: Record<string, unknown> } {
  const mappings: FieldMapping[] = [];
  const m = result.metadata;
  const c = result.confidence;

  const add = (field: string, value: unknown, confidence: number, source: string) => {
    if (value === undefined || value === null || value === '') return;
    mappings.push({ field, value: String(value), confidence, source, apply: confidence >= 0.5 });
  };

  add('metadata.title', m.title, c.metadata.title || 0, 'Extracted from document title');
  add('metadata.author', m.author, c.metadata.author || 0, 'Extracted from author field');
  add('metadata.university', m.institution || m.university, c.metadata.institution || 0, 'Extracted from institution');
  add('metadata.supervisor', m.supervisor, c.metadata.supervisor || 0, 'Extracted from supervisor field');
  add('metadata.submissionDate', m.year, c.metadata.year || 0, 'Extracted from date');
  add('metadata.abstract', m.abstract, c.metadata.abstract || 0, 'Extracted from abstract section');
  add('metadata.department', m.department, c.metadata.department || 0, 'Extracted from department');
  add('metadata.faculty', m.faculty, c.metadata.faculty || 0, 'Extracted from faculty');
  if (Array.isArray(m.keywords) && m.keywords.length > 0) {
    add('metadata.keywords', m.keywords.join(', '), c.metadata.keywords || 0, 'Extracted from keywords section');
  }

  const preview: Record<string, unknown> = {};
  const appliedMappings = mappings.filter((mp) => mp.apply);
  for (const mp of appliedMappings) {
    const parts = mp.field.split('.');
    let current: Record<string, unknown> = preview;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = mp.value;
  }

  if (result.chapters.length > 0) {
    (preview as Record<string, unknown>).chapters = result.chapters.map((ch, i) => ({
      id: ch.id || `imported-ch-${i}`,
      title: ch.title,
      content: ch.body,
      subSections: ch.subsections.map((sub, j) => ({
        id: `sub-${i}-${j}`,
        title: sub.title,
        content: sub.body,
      })),
    }));
  }

  if (result.references.length > 0) {
    (preview as Record<string, unknown>).references = result.references.map((ref, i) => ({
      id: `imported-ref-${i}`,
      type: ref.type || 'misc',
      authors: ref.author || '',
      title: ref.title || '',
      year: ref.year || '',
      journal: ref.journal || '',
      bookTitle: ref.booktitle || '',
      volume: ref.volume || '',
      pages: ref.pages || '',
      doi: ref.doi || '',
      url: ref.url || '',
    }));
  }

  if (result.detectedTemplate) {
    (preview as Record<string, unknown>).templateType = result.detectedTemplate;
  }

  return { mappings, preview };
}
