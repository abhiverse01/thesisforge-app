// ============================================================
// ThesisForge Core — BibTeX Generator (Engine v3)
// Generates .bib entries with field-level validation and
// field-specific sanitization.
//
// BIBLIOGRAPHY ENGINE SUPERPOWER
// The bibliography is where most student LaTeX breaks.
// Make it unbreakable.
// ============================================================

import type { ThesisReference, ReferenceType } from '@/lib/thesis-types';

export type BibEntryType = 'article' | 'book' | 'inproceedings' | 'techreport' | 'phdthesis' | 'mastersthesis' | 'online' | 'misc' | 'dataset' | 'software';

export interface BibEntrySchema {
  required: string[];
  optional: string[];
}

export interface BibFieldDef {
  name: string;
  label: string;
  bibField: string;
  placeholder: string;
  required: boolean;
}

// ============================================================
// Entry Schema — Required and optional fields per type
// ============================================================

export const ENTRY_SCHEMAS: Record<BibEntryType, BibEntrySchema> = {
  article: {
    required: ['author', 'title', 'journal', 'year'],
    optional: ['volume', 'number', 'pages', 'doi', 'url', 'month', 'note'],
  },
  book: {
    required: ['author', 'title', 'publisher', 'year'],
    optional: ['edition', 'isbn', 'address', 'volume', 'series', 'month', 'note'],
  },
  inproceedings: {
    required: ['author', 'title', 'booktitle', 'year'],
    optional: ['pages', 'organization', 'publisher', 'doi', 'url', 'month', 'note'],
  },
  techreport: {
    required: ['author', 'title', 'institution', 'year'],
    optional: ['type', 'number', 'address', 'month', 'url', 'note'],
  },
  phdthesis: {
    required: ['author', 'title', 'school', 'year', 'type'],
    optional: ['address', 'month', 'url', 'note'],
  },
  mastersthesis: {
    required: ['author', 'title', 'school', 'year', 'type'],
    optional: ['address', 'month', 'url', 'note'],
  },
  online: {
    required: ['author', 'title', 'url', 'year', 'urldate'],
    optional: ['organization', 'month', 'note', 'version'],
  },
  misc: {
    required: ['author', 'title', 'year'],
    optional: ['howpublished', 'url', 'note', 'urldate', 'month'],
  },
  dataset: {
    required: ['author', 'title', 'year'],
    optional: ['version', 'url', 'doi', 'institution', 'date', 'note'],
  },
  software: {
    required: ['author', 'title', 'year', 'url'],
    optional: ['version', 'doi', 'license', 'note'],
  },
};

// ============================================================
// Field Definitions — For UI rendering per reference type
// ============================================================

const COMMON_FIELDS: BibFieldDef[] = [
  { name: 'authors', label: 'Author(s)', bibField: 'author', placeholder: 'Last, First and Last2, First2', required: true },
  { name: 'title', label: 'Title', bibField: 'title', placeholder: 'Title of the work', required: true },
  { name: 'year', label: 'Year', bibField: 'year', placeholder: '2024', required: true },
  { name: 'doi', label: 'DOI', bibField: 'doi', placeholder: '10.1234/example', required: false },
  { name: 'url', label: 'URL', bibField: 'url', placeholder: 'https://...', required: false },
  { name: 'note', label: 'Note', bibField: 'note', placeholder: 'Additional information', required: false },
  { name: 'month', label: 'Month', bibField: 'month', placeholder: 'January', required: false },
];

export const TYPE_SPECIFIC_FIELDS: Record<BibEntryType, BibFieldDef[]> = {
  article: [
    ...COMMON_FIELDS,
    { name: 'journal', label: 'Journal', bibField: 'journal', placeholder: 'Journal Name', required: true },
    { name: 'volume', label: 'Volume', bibField: 'volume', placeholder: '12', required: false },
    { name: 'number', label: 'Number', bibField: 'number', placeholder: '3', required: false },
    { name: 'pages', label: 'Pages', bibField: 'pages', placeholder: '1--15', required: false },
  ],
  book: [
    ...COMMON_FIELDS,
    { name: 'publisher', label: 'Publisher', bibField: 'publisher', placeholder: 'Publisher Name', required: true },
    { name: 'edition', label: 'Edition', bibField: 'edition', placeholder: '3rd', required: false },
    { name: 'isbn', label: 'ISBN', bibField: 'isbn', placeholder: '978-...', required: false },
    { name: 'address', label: 'Address', bibField: 'address', placeholder: 'City, Country', required: false },
  ],
  inproceedings: [
    ...COMMON_FIELDS,
    { name: 'bookTitle', label: 'Book Title', bibField: 'booktitle', placeholder: 'Proceedings of...', required: true },
    { name: 'pages', label: 'Pages', bibField: 'pages', placeholder: '1--15', required: false },
    { name: 'organization', label: 'Organization', bibField: 'organization', placeholder: 'ACM', required: false },
    { name: 'publisher', label: 'Publisher', bibField: 'publisher', placeholder: 'Publisher', required: false },
  ],
  techreport: [
    { name: 'authors', label: 'Author(s)', bibField: 'author', placeholder: 'Last, First', required: true },
    { name: 'title', label: 'Title', bibField: 'title', placeholder: 'Title of the report', required: true },
    { name: 'year', label: 'Year', bibField: 'year', placeholder: '2024', required: true },
    { name: 'institution', label: 'Institution', bibField: 'institution', placeholder: 'MIT', required: true },
    { name: 'type', label: 'Type', bibField: 'type', placeholder: 'Technical Report', required: false },
    { name: 'number', label: 'Number', bibField: 'number', placeholder: 'TR-2024-01', required: false },
    { name: 'address', label: 'Address', bibField: 'address', placeholder: 'City, Country', required: false },
    { name: 'url', label: 'URL', bibField: 'url', placeholder: 'https://...', required: false },
    { name: 'doi', label: 'DOI', bibField: 'doi', placeholder: '10.1234/example', required: false },
    { name: 'note', label: 'Note', bibField: 'note', placeholder: 'Additional info', required: false },
  ],
  phdthesis: [
    { name: 'authors', label: 'Author', bibField: 'author', placeholder: 'Last, First', required: true },
    { name: 'title', label: 'Title', bibField: 'title', placeholder: 'Title of the thesis', required: true },
    { name: 'year', label: 'Year', bibField: 'year', placeholder: '2024', required: true },
    { name: 'school', label: 'School', bibField: 'school', placeholder: 'MIT', required: true },
    { name: 'type', label: 'Degree Type', bibField: 'type', placeholder: "phdthesis", required: true },
    { name: 'address', label: 'Address', bibField: 'address', placeholder: 'City, Country', required: false },
    { name: 'url', label: 'URL', bibField: 'url', placeholder: 'https://...', required: false },
    { name: 'note', label: 'Note', bibField: 'note', placeholder: 'Additional info', required: false },
  ],
  mastersthesis: [
    { name: 'authors', label: 'Author', bibField: 'author', placeholder: 'Last, First', required: true },
    { name: 'title', label: 'Title', bibField: 'title', placeholder: 'Title of the thesis', required: true },
    { name: 'year', label: 'Year', bibField: 'year', placeholder: '2024', required: true },
    { name: 'school', label: 'School', bibField: 'school', placeholder: 'MIT', required: true },
    { name: 'type', label: 'Degree Type', bibField: 'type', placeholder: "mastersthesis", required: true },
    { name: 'address', label: 'Address', bibField: 'address', placeholder: 'City, Country', required: false },
    { name: 'url', label: 'URL', bibField: 'url', placeholder: 'https://...', required: false },
    { name: 'note', label: 'Note', bibField: 'note', placeholder: 'Additional info', required: false },
  ],
  online: [
    { name: 'authors', label: 'Author(s)', bibField: 'author', placeholder: 'Last, First', required: true },
    { name: 'title', label: 'Title', bibField: 'title', placeholder: 'Page Title', required: true },
    { name: 'year', label: 'Year', bibField: 'year', placeholder: '2024', required: true },
    { name: 'url', label: 'URL', bibField: 'url', placeholder: 'https://...', required: true },
    { name: 'accessed', label: 'Access Date', bibField: 'urldate', placeholder: '2024-01-15', required: true },
    { name: 'organization', label: 'Organization', bibField: 'organization', placeholder: 'Wikipedia', required: false },
    { name: 'note', label: 'Note', bibField: 'note', placeholder: 'Additional info', required: false },
  ],
  misc: [
    ...COMMON_FIELDS,
    { name: 'howPublished', label: 'How Published', bibField: 'howpublished', placeholder: 'Self-published', required: false },
  ],
  dataset: [
    ...COMMON_FIELDS,
    { name: 'version', label: 'Version', bibField: 'version', placeholder: '1.0', required: false },
    { name: 'institution', label: 'Institution', bibField: 'institution', placeholder: 'MIT', required: false },
    { name: 'date', label: 'Date', bibField: 'date', placeholder: '2024-01-15', required: false },
  ],
  software: [
    ...COMMON_FIELDS,
    { name: 'version', label: 'Version', bibField: 'version', placeholder: '1.0', required: false },
    { name: 'license', label: 'License', bibField: 'license', placeholder: 'MIT', required: false },
  ],
};

// ============================================================
// Field Mapping
// ============================================================

export const FIELD_NAME_MAP: Record<string, string> = {
  authors: 'author',
  title: 'title',
  journal: 'journal',
  bookTitle: 'booktitle',
  publisher: 'publisher',
  year: 'year',
  volume: 'volume',
  number: 'number',
  pages: 'pages',
  doi: 'doi',
  url: 'url',
  note: 'note',
  edition: 'edition',
  address: 'address',
  school: 'school',
  institution: 'institution',
  howPublished: 'howpublished',
  accessed: 'urldate',
  month: 'month',
  isbn: 'isbn',
  organization: 'organization',
  type: 'type',
  eprint: 'eprint',
  eprintType: 'eprinttype',
  crossRef: 'crossref',
  license: 'license',
  date: 'date',
  version: 'version',
};

// ============================================================
// Citation Style Configuration
// ============================================================

export const CITATION_STYLE_CONFIG: Record<string, { label: string; file: string }> = {
  plainnat:  { label: 'Author-Year (Plain)',      file: 'plainnat' },
  apalike:   { label: 'APA Style',                file: 'apalike' },
  ieeetr:    { label: 'IEEE (Numbered)',           file: 'ieeetr' },
  alpha:     { label: 'Alphabetic Labels',         file: 'alpha' },
  abbrv:     { label: 'Abbreviated Author-Year',  file: 'abbrv' },
  acm:       { label: 'ACM Style',                file: 'acm' },
  chicago:   { label: 'Chicago Style',            file: 'chicago' },
  apa:       { label: 'APA 7th Edition',          file: 'apa' },
  vancouver: { label: 'Vancouver (Medical)',      file: 'vancouver' },
};

// ============================================================
// Validation
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validateReference(
  ref: Record<string, string>,
  type: BibEntryType
): ValidationError[] {
  const schema = ENTRY_SCHEMAS[type];
  if (!schema) {
    return [{ field: '_type', message: `Unknown reference type: ${type}`, severity: 'error' }];
  }

  const errors: ValidationError[] = [];

  for (const field of schema.required) {
    const uiField = Object.entries(FIELD_NAME_MAP).find(([, bib]) => bib === field)?.[0];
    const value = uiField ? ref[uiField] : ref[field];
    if (!value || value.trim() === '') {
      errors.push({
        field: uiField || field,
        message: `"${field}" is required for ${type}.`,
        severity: 'error',
      });
    }
  }

  if (ref.year && !/^\d{4}$/.test(ref.year.trim())) {
    errors.push({ field: 'year', message: 'Year must be a 4-digit number.', severity: 'error' });
  }

  if (ref.url && !/^https?:\/\/.+/i.test(ref.url.trim())) {
    errors.push({ field: 'url', message: 'URL must start with http:// or https://.', severity: 'warning' });
  }

  if (ref.authors && /@.*\./.test(ref.authors.trim()) && !ref.authors.includes(',')) {
    errors.push({ field: 'authors', message: 'Author field looks like an email. Use "Last, First" format.', severity: 'warning' });
  }

  // DOI format validation: must match ^10\.\d{4,9}/.+
  if (ref.doi && ref.doi.trim() !== '') {
    const doiPattern = /^10\.\d{4,9}\/.+/;
    if (!doiPattern.test(ref.doi.trim())) {
      errors.push({
        field: 'doi',
        message: 'DOI format appears invalid. Expected format: 10.XXXX/identifier',
        severity: 'warning',
      });
    }
  }

  return errors;
}

// ============================================================
// Cite Key Generation
// ============================================================

export function generateCiteKey(ref: Record<string, string>): string {
  const sanitize = (s: string): string => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  let authorPart = 'unknown';
  if (ref.authors && ref.authors.trim() !== '') {
    let rawAuthor = ref.authors.trim();

    // Handle "et al." entries: strip "et al." before processing
    rawAuthor = rawAuthor.replace(/\s*et\s+al\.?\s*/gi, '').trim();
    if (rawAuthor === '') rawAuthor = ref.authors.trim();

    // Handle corporate authors in braces: use first word inside braces
    const corporateMatch = rawAuthor.match(/^\{([^}]+)\}/);
    if (corporateMatch) {
      const firstWord = corporateMatch[1].split(/\s+/)[0];
      authorPart = sanitize(firstWord);
    } else {
      const firstAuthor = rawAuthor.split(',')[0].trim();
      const parts = firstAuthor.split(/\s+/);

      // Handle single-name authors (only one word): use the full name
      if (parts.length === 1) {
        authorPart = sanitize(parts[0]);
      } else {
        // Multi-word author: use last word (typically the surname)
        authorPart = sanitize(parts[parts.length - 1] || firstAuthor);
      }
    }
  }

  const yearPart = sanitize(ref.year || 'xxxx');

  // Handle entries with no title: use type as titlePart
  let titlePart = '';
  if (ref.title && ref.title.trim() !== '') {
    const firstWord = ref.title.split(/\s+/)
      .find(w => w.length > 3) || ref.title.split(/\s+/)[0];
    titlePart = sanitize(firstWord).slice(0, 8);
  } else {
    // Fallback: use type as titlePart
    titlePart = sanitize(ref.type || 'untitled').slice(0, 8);
  }

  return `${authorPart}${yearPart}${titlePart}`;
}

// ============================================================
// BibTeX Field Sanitization — Field-Specific Rules
// Each field has unique requirements for proper BibTeX output.
// ============================================================

export function sanitizeBibField(value: string, fieldName: string): string {
  let v = value.trim();
  if (!v) return '';

  // Author/editor: ensure "and" separator, not "&" or ","
  if (fieldName === 'author' || fieldName === 'editor') {
    v = v
      .replace(/\s*&\s*/g, ' and ')
      .replace(/;\s*/g, ' and ');
    // Single entity — protect from BibTeX name parsing
    if (!v.includes(' and ') && !v.includes(',')) {
      v = `{${v}}`;
    }
    return v;
  }

  // Title/booktitle: preserve as-is (BibTeX handles case within {})
  // But protect & and % which are always dangerous
  if (fieldName === 'title' || fieldName === 'booktitle') {
    return v
      .replace(/(?<!\\)&/g, '\\&')
      .replace(/(?<!\\)%(?!\d)/g, '\\%');
  }

  // Pages: normalize dash to en-dash for LaTeX
  if (fieldName === 'pages') {
    return v.replace(/\s*[-\u2013\u2014]+\s*/g, '--');
  }

  // URL/DOI: percent-encode spaces, escape underscores in DOI
  if (fieldName === 'url' || fieldName === 'doi') {
    return v
      .replace(/ /g, '%20');
  }

  // Year: numbers only
  if (fieldName === 'year') {
    return v.replace(/\D/g, '').slice(0, 4);
  }

  // Month: capitalize
  if (fieldName === 'month') {
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
                    'july', 'august', 'september', 'october', 'november', 'december'];
    const lower = v.toLowerCase().trim();
    const idx = months.findIndex(m => lower.startsWith(m.slice(0, 3)));
    return idx >= 0 ? months[idx] : v;
  }

  // General: escape the most dangerous characters
  return v
    .replace(/(?<!\\)&/g, '\\&')
    .replace(/(?<!\\)%(?!\d)/g, '\\%');
}

// ============================================================
// arXiv ID Detection & Eprint Support
// ============================================================

/**
 * Detect arXiv ID from a DOI or eprint field and return the
 * extracted arXiv identifier, or undefined if not an arXiv reference.
 */
function extractArxivId(ref: Record<string, string>): string | undefined {
  const doi = (ref.doi || '').trim();
  const eprint = (ref.eprint || '').trim();

  // Check DOI field for arXiv prefix (e.g. "10.48550/arXiv.2312.12345")
  if (doi && /arXiv/i.test(doi)) {
    const match = doi.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/);
    return match ? match[1] : undefined;
  }

  // Check explicit eprint field for arXiv prefix
  if (eprint && /^arXiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)$/i.test(eprint)) {
    const match = eprint.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
    return match ? match[1] : undefined;
  }

  // Check eprint field for bare arXiv ID
  if (eprint && /^\d{4}\.\d{4,5}(v\d+)?$/i.test(eprint)) {
    return eprint;
  }

  return undefined;
}

// ============================================================
// BibTeX Entry Generation
// Generates compilable .bib with TODO placeholders for missing fields.
// Better to compile with a placeholder than to fail entirely.
// ============================================================

export function generateBibEntry(
  ref: Record<string, string>,
  type: BibEntryType
): string {
  const key = generateCiteKey(ref);
  const schema = ENTRY_SCHEMAS[type];
  if (!schema) return '';

  const allFields = [...new Set([...schema.required, ...schema.optional])];

  const fields: string[] = [];

  // Detect arXiv ID and auto-set eprint fields
  const arxivId = extractArxivId(ref);

  for (const bibField of allFields) {
    const uiField = Object.entries(FIELD_NAME_MAP).find(([, bib]) => bib === bibField)?.[0];
    const value = uiField ? ref[uiField] : ref[bibField];

    if (value && value.trim()) {
      const sanitized = sanitizeBibField(value.trim(), bibField);
      const pad = ' '.repeat(Math.max(0, 14 - bibField.length));
      fields.push(`  ${bibField}${pad} = {${sanitized}}`);
    } else if (schema.required.includes(bibField)) {
      // Required field missing — add TODO placeholder
      const pad = ' '.repeat(Math.max(0, 14 - bibField.length));
      fields.push(`  ${bibField}${pad} = {TODO: Add ${bibField}}`);
    }
  }

  // Add arXiv eprint fields if detected
  if (arxivId) {
    fields.push(`  eprint          = {${arxivId}}`);
    fields.push(`  eprinttype      = {arXiv}`);
  }

  // Add crossref field if set
  const crossRef = ref.crossRef;
  if (crossRef && crossRef.trim()) {
    fields.push(`  crossref        = {${crossRef.trim()}}`);
  }

  const bibType = type === 'phdthesis' ? 'phdthesis' :
                  type === 'mastersthesis' ? 'mastersthesis' : type;

  return `@${bibType}{${key},\n${fields.join(',\n')}\n}`;
}

/**
 * Generate the complete .bib file content.
 */
export function generateBibFile(
  references: Array<{ type: BibEntryType; fields: Record<string, string> }>
): string {
  // Header comment
  const entries = references.map(ref => generateBibEntry(ref.fields, ref.type));
  return entries.join('\n\n') + '\n';
}

// ============================================================
// Convenience: Generate .bib from ThesisReference[]
// ============================================================

export function generateBibFromThesisReferences(references: ThesisReference[]): string {
  return generateBibFile(
    references.map(ref => {
      // Map app-level ReferenceType to BibEntryType.
      // 'thesis' in the app always maps to 'phdthesis' for BibTeX output.
      // 'techreport' maps directly (same name in both type systems).
      const bibType: BibEntryType =
        ref.type === 'thesis' ? 'phdthesis' :
        ref.type === 'techreport' ? 'techreport' :
        ref.type as BibEntryType;

      // Map institution: for techreport, use the publisher field.
      // For dataset, use the institution field if available.
      // For all other types, leave empty (not applicable).
      const institution = ref.type === 'techreport' ? (ref.publisher || '') :
                          ref.type === 'dataset' ? (ref.publisher || '') : '';

      return {
        type: bibType,
        fields: {
          authors: ref.authors || '',
          title: ref.title || '',
          journal: ref.journal || '',
          bookTitle: ref.bookTitle || '',
          publisher: ref.publisher || '',
          year: ref.year || '',
          volume: ref.volume || '',
          number: ref.number || '',
          pages: ref.pages || '',
          doi: ref.doi || '',
          url: ref.url || '',
          note: ref.note || '',
          edition: ref.edition || '',
          address: ref.address || '',
          school: ref.school || '',
          institution: institution,
          howPublished: ref.howPublished || '',
          accessed: ref.accessed || '',
          month: '',
          isbn: '',
          organization: '',
          type: '',
          eprint: ref.eprint || '',
          eprintType: ref.eprintType || '',
          crossRef: ref.crossRef || '',
          license: '',
          date: '',
          version: '',
        },
      };
    })
  );
}

// ============================================================
// Bibliography Health Scoring
// ============================================================

export interface BibliographyHealth {
  score: number; // 0-100
  completenessScore: number;
  noDuplicates: boolean;
  noTodoPlaceholders: boolean;
  doiPresence: number; // % of journal articles with DOI
  urlValidity: number; // % of entries with valid URLs
  fieldCompleteness: number; // % of required fields filled
  issues: string[];
}

/**
 * Compute a health score for a bibliography (0–100).
 * Checks completeness, duplicates, DOI coverage, URL validity,
 * and TODO placeholder detection.
 */
export function computeBibliographyHealth(references: ThesisReference[]): BibliographyHealth {
  const issues: string[] = [];

  if (references.length === 0) {
    return {
      score: 0,
      completenessScore: 0,
      noDuplicates: true,
      noTodoPlaceholders: true,
      doiPresence: 0,
      urlValidity: 0,
      fieldCompleteness: 0,
      issues: ['No references in bibliography.'],
    };
  }

  // ── Duplicate detection ──
  const seenKeys = new Set<string>();
  const keys: string[] = [];
  for (const ref of references) {
    const key = generateCiteKey({
      authors: ref.authors,
      year: ref.year,
      title: ref.title,
      type: ref.type,
    });
    keys.push(key);
    if (seenKeys.has(key)) {
      issues.push(`Duplicate cite key detected: "${key}"`);
    }
    seenKeys.add(key);
  }
  const noDuplicates = seenKeys.size === references.length;

  // ── TODO placeholder detection ──
  let todoCount = 0;
  for (const ref of references) {
    const fields = [
      ref.authors, ref.title, ref.year, ref.journal, ref.bookTitle,
      ref.publisher, ref.school, ref.doi, ref.url, ref.note,
    ];
    for (const field of fields) {
      if (field && /TODO/i.test(field)) {
        todoCount++;
        break;
      }
    }
  }
  const noTodoPlaceholders = todoCount === 0;
  if (!noTodoPlaceholders) {
    issues.push(`${todoCount} reference(s) contain TODO placeholders.`);
  }

  // ── DOI presence for journal articles ──
  const journalArticles = references.filter(r => r.type === 'article');
  const journalWithDoi = journalArticles.filter(r => r.doi && r.doi.trim() !== '');
  const doiPresence = journalArticles.length > 0
    ? Math.round((journalWithDoi.length / journalArticles.length) * 100)
    : 100; // Not applicable → perfect score

  if (journalArticles.length > 0 && doiPresence < 80) {
    issues.push(`${doiPresence}% of journal articles have DOIs (target: 80%+).`);
  }

  // ── URL validity ──
  const entriesWithUrl = references.filter(r => r.url && r.url.trim() !== '');
  const validUrlCount = entriesWithUrl.filter(r => /^https?:\/\/.+/i.test(r.url || '')).length;
  const urlValidity = entriesWithUrl.length > 0
    ? Math.round((validUrlCount / entriesWithUrl.length) * 100)
    : 100;

  if (entriesWithUrl.length > 0 && urlValidity < 100) {
    issues.push(`${entriesWithUrl.length - validUrlCount} URL(s) appear invalid.`);
  }

  // ── Field completeness ──
  let totalRequired = 0;
  let filledRequired = 0;
  for (const ref of references) {
    const refType = ref.type as ReferenceType;
    const bibType: BibEntryType =
      refType === 'thesis' ? 'phdthesis' :
      refType as BibEntryType;
    const schema = ENTRY_SCHEMAS[bibType];
    if (!schema) continue;
    for (const field of schema.required) {
      totalRequired++;
      const fieldMap: Record<string, string | undefined> = {
        author: ref.authors,
        title: ref.title,
        year: ref.year,
        journal: ref.journal,
        publisher: ref.publisher,
        booktitle: ref.bookTitle,
        school: ref.school,
        institution: ref.publisher,
        url: ref.url,
        urldate: ref.accessed,
      };
      const value = fieldMap[field];
      if (value && value.trim() !== '' && !/TODO/i.test(value)) {
        filledRequired++;
      }
    }
  }
  const fieldCompleteness = totalRequired > 0
    ? Math.round((filledRequired / totalRequired) * 100)
    : 100;

  if (fieldCompleteness < 100) {
    issues.push(`${totalRequired - filledRequired} required field(s) are missing or incomplete.`);
  }

  // ── Completeness score (weighted composite) ──
  const duplicatePenalty = noDuplicates ? 0 : 15;
  const todoPenalty = noTodoPlaceholders ? 0 : 10;
  const completenessScore = Math.max(0, 100 - duplicatePenalty - todoPenalty - Math.round((100 - fieldCompleteness) * 0.3));

  // ── Overall score ──
  const score = Math.max(0, Math.min(100, Math.round(
    completenessScore * 0.4 +
    fieldCompleteness * 0.3 +
    doiPresence * 0.15 +
    urlValidity * 0.15
  )));

  return {
    score,
    completenessScore,
    noDuplicates,
    noTodoPlaceholders,
    doiPresence,
    urlValidity,
    fieldCompleteness,
    issues,
  };
}
