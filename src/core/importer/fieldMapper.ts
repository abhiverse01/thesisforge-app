// ============================================================
// ThesisForge Import — Field Mapper
// Maps extracted import data to ThesisData shape for the wizard.
// ============================================================

import type { ImportResult, FieldMapping } from './types';
import type { ThesisData } from '@/lib/thesis-types';

/**
 * Map import result to ThesisData-compatible field mappings.
 * Each mapping has a confidence score; apply: true if confidence >= 0.5.
 */
export function mapImportToThesisData(
  result: ImportResult
): { mappings: FieldMapping[]; preview: Partial<ThesisData> } {

  const mappings: FieldMapping[] = [];
  const m = result.metadata;
  const c = result.confidence;

  const add = (
    field: string,
    value: any,
    confidence: number,
    source: string
  ) => {
    if (value === undefined || value === null || value === '') return;
    mappings.push({ field, value: String(value), confidence, source, apply: confidence >= 0.5 });
  };

  // Metadata fields
  add('metadata.title',       m.title,       c.metadata.title ?? 0,       'Extracted from document title');
  add('metadata.author',      m.author,      c.metadata.author ?? 0,      'Extracted from author field');
  add('metadata.university',  m.institution, c.metadata.institution ?? 0, 'Extracted from institution');
  add('metadata.supervisor',  m.supervisor,  c.metadata.supervisor ?? 0,  'Extracted from supervisor field');
  add('metadata.year',        m.year?.length === 4 ? new Date().toISOString().split('T')[0] : '', c.metadata.year ?? 0, 'Extracted from date');
  add('metadata.abstract',    m.abstract,    c.metadata.abstract ?? 0,    'Extracted from abstract section');
  add('metadata.department',  m.department,  c.metadata.department ?? 0,  'Extracted from department');
  add('metadata.faculty',     m.faculty,     c.metadata.faculty ?? 0,     'Extracted from faculty');
  add('metadata.subtitle',    m.subtitle,    c.metadata.subtitle ?? 0,    'Extracted from subtitle');

  if (m.keywords?.length) {
    add('keywords', m.keywords.join(', '), c.metadata.keywords ?? 0, 'Extracted from keywords section');
  }

  // Build preview object
  const preview: Partial<ThesisData> = {};

  const appliedMappings = mappings.filter(mp => mp.apply);
  for (const mp of appliedMappings) {
    setDeep(preview, mp.field, mp.value);
  }

  // Chapters
  if (result.chapters.length > 0) {
    (preview as any).chapters = result.chapters.map((ch, i) => ({
      id:          `imported-ch-${i}`,
      number:      i + 1,
      title:       ch.title,
      content:     ch.body,
      subSections: ch.subsections.map((sub, j) => ({
        id:    `imported-sub-${i}-${j}`,
        title: sub.title,
        content: sub.body,
      })),
    }));
  }

  // References
  if (result.references.length > 0) {
    (preview as any).references = result.references.map((ref, i) => ({
      id:        `imported-ref-${i}`,
      type:      'misc',
      authors:   ref.author || '',
      title:     ref.title || '',
      year:      ref.year || '',
      journal:   ref.journal || '',
      bookTitle: ref.booktitle || '',
      volume:    ref.volume || '',
      pages:     ref.pages || '',
      doi:       ref.doi || '',
      url:       ref.url || '',
    }));
  }

  if (result.detectedTemplate) {
    (preview as any).type = result.detectedTemplate;
  }

  return { mappings, preview };
}

function setDeep(obj: any, path: string, value: any) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}
