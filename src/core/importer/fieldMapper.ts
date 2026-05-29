// ============================================================
// ThesisForge Import — Field Mapper
// Maps extracted import data to ThesisData shape for the wizard.
// ============================================================

import type { ImportResult, FieldMapping } from './types';
import type { ThesisData } from '@/lib/thesis-types';

/**
 * Map import result to ThesisData-compatible field mappings.
 * Each mapping has a confidence score; graduated auto-apply logic.
 */
export function mapImportToThesisData(
  result: ImportResult
): { mappings: FieldMapping[]; preview: Partial<ThesisData> } {
  try {

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
      mappings.push({
        field,
        value: String(value),
        confidence,
        source,
        // Graduated auto-apply: high/medium confidence pre-toggled ON, low confidence OFF
        apply:        confidence >= 0.50,
        needsReview:  confidence >= 0.5 && confidence < 0.8,
      } as FieldMapping);
    };

    // Metadata fields — mapped to ThesisMetadata shape
    add('metadata.title',       m.title,       c.metadata.title ?? 0,       'Extracted from document title');
    add('metadata.author',      m.author,      c.metadata.author ?? 0,      'Extracted from author field');
    add('metadata.university',  m.institution, c.metadata.institution ?? 0, 'Extracted from institution');
    add('metadata.supervisor',  m.supervisor,  c.metadata.supervisor ?? 0,  'Extracted from supervisor field');
    // FIX #3: Preserve the actual extracted year, don't overwrite with today's date
    add('metadata.submissionDate', m.year ?? '', c.metadata.year ?? 0, 'Extracted from date');
    add('metadata.abstract',    m.abstract,    c.metadata.abstract ?? 0,    'Extracted from abstract section');
    add('metadata.department',  m.department,  c.metadata.department ?? 0,  'Extracted from department');
    add('metadata.faculty',     m.faculty,     c.metadata.faculty ?? 0,     'Extracted from faculty');
    add('metadata.subtitle',    m.subtitle,    c.metadata.subtitle ?? 0,    'Extracted from subtitle');
    // FIX #5: Map degree fields so template detection is preserved
    add('metadata.degree',      m.degree,      c.metadata.degree ?? 0,      'Extracted from degree field');
    add('metadata.degreeType',  m.degreeAbbrev, c.metadata.degree ?? 0,    'Extracted from degree abbreviation');
    add('metadata.journal',     m.journal,     c.metadata.journal     ?? 0, 'Extracted from journal field');
    add('metadata.school',      m.school,      c.metadata.school      ?? 0, 'Extracted from school field');
    add('metadata.publisher',   m.publisher,   c.metadata.publisher   ?? 0, 'Extracted from publisher field');
    add('metadata.doi',         m.doi,         c.metadata.doi         ?? 0, 'Extracted from DOI field');
    add('metadata.url',         m.url,         c.metadata.url         ?? 0, 'Extracted from URL field');

    // FIX #6: Keywords — store as comma-separated string in mappings, convert to array in preview
    if (m.keywords?.length) {
      add('keywords', m.keywords.join(', '), c.metadata.keywords ?? 0, 'Extracted from keywords section');
    }

    // Build preview object — FIX #4: Initialize metadata scaffold with defaults
    const preview: Partial<ThesisData> = {
      metadata: {
        title: '',
        subtitle: '',
        author: '',
        authorId: '',
        university: '',
        universityLogo: '',
        faculty: '',
        department: '',
        supervisor: '',
        supervisorTitle: '',
        coSupervisor: '',
        coSupervisorTitle: '',
        submissionDate: '',
        graduationDate: '',
        location: '',
        dedication: '',
        acknowledgment: '',
        orcid: '',
        reportNumber: '',
      },
      keywords: [],
      chapters: [],
      references: [],
      appendices: [],
      customCommands: [],
    };

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

    // References — map all fields from ExtractedReference with smarter type detection
    if (result.references.length > 0) {
      (preview as any).references = result.references.map((ref, i) => ({
        id:        `imported-ref-${i}`,
        type:      inferReferenceType(ref),
        authors:   ref.author || '',
        title:     ref.title || '',
        year:      ref.year || '',
        journal:   ref.journal || '',
        bookTitle: ref.booktitle || '',
        volume:    ref.volume || '',
        pages:     ref.pages || '',
        doi:       ref.doi || '',
        url:       ref.url || '',
        publisher: ref.publisher || '',
        school:    ref.school || '',
      }));
    }

    // Custom commands — reconstruct as LaTeX \newcommand declarations
    if (result.newcommands && result.newcommands.length > 0) {
      (preview as any).customCommands = result.newcommands.map((cmd) => {
        const argPart = cmd.numArgs > 0 ? `[${cmd.numArgs}]` : '';
        return `\\${cmd.variant}${cmd.starred ? '*' : ''}{${cmd.name}}${argPart}{${cmd.definition}}`;
      });
    }

    if (result.detectedTemplate) {
      (preview as any).type = result.detectedTemplate;
    }

    return { mappings, preview };

  } catch (err: any) {
    throw new Error(`[fieldMapper] Failed to map import result to thesis data: ${err?.message ?? err}`);
  }
}

/**
 * Infer a BibTeX-compatible reference type from extracted reference fields.
 *
 * Priority-ordered detection:
 * 1. Explicit type from parser (if it looks valid)
 * 2. `school` field → 'thesis' (Master's/PhD thesis)
 * 3. `journal` field → 'article' (journal article)
 * 4. `booktitle` field → 'inproceedings' (conference proceeding)
 * 5. `publisher` with URL/DOI but no journal → 'online'
 * 6. Fallback → 'misc'
 */
function inferReferenceType(ref: {
  type?: string;
  booktitle?: string;
  journal?: string;
  school?: string;
  publisher?: string;
  url?: string;
  doi?: string;
}): string {
  // If the parser already determined a type, respect it if it's a known value
  const knownTypes = new Set([
    'article', 'book', 'inproceedings', 'techreport', 'thesis',
    'online', 'misc', 'dataset', 'software', 'phdthesis', 'mastersthesis',
    'inbook', 'incollection', 'proceedings', 'unpublished',
  ]);
  if (ref.type && knownTypes.has(ref.type.toLowerCase())) {
    // Normalize known BibTeX aliases to our ReferenceType set
    const normalized = ref.type.toLowerCase();
    if (normalized === 'phdthesis' || normalized === 'mastersthesis') return 'thesis';
    if (normalized === 'inbook' || normalized === 'incollection') return 'book';
    if (normalized === 'proceedings') return 'inproceedings';
    if (normalized === 'unpublished') return 'misc';
    return normalized;
  }

  // Infer from field presence
  if (ref.school) return 'thesis';
  if (ref.journal) return 'article';
  if (ref.booktitle) return 'inproceedings';
  if (ref.publisher && (ref.url || ref.doi)) return 'online';
  if (ref.publisher) return 'book';

  return 'misc';
}

function setDeep(obj: any, path: string, value: any) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}
