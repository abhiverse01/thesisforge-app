// ============================================================
// ThesisForge Import — Public API
// importFile(file) → ImportFileResult
// Routes .pdf → pdfImporter, .tex → texImporter, .docx → docxImporter,
// .md → markdownImporter, .txt → txtImporter.
// ============================================================

import { importPDF } from './pdfImporter';
import { importTeX } from './texImporter';
import { parseTeXSource } from './texImporter';
import { importDOCX } from './docxImporter';
import { importMarkdown } from './markdownImporter';
import { importTXT } from './txtImporter';
import { mapImportToThesisData } from './fieldMapper';
import { deduplicateReferences, classifyReferenceType } from './contentIntelligence';
import type { ImportResult, ImportSource, FieldMapping } from './types';
import type { ThesisData } from '@/lib/thesis-types';

export type { ImportResult, FieldMapping };

export type ImportFileResult = {
  result:   ImportResult;
  mappings: FieldMapping[];
  preview:  Partial<ThesisData>;
};

/** Per-format maximum file sizes for import. */
const MAX_FILE_SIZE: Record<string, number> = {
  pdf:      50 * 1024 * 1024,   // 50 MB
  docx:     50 * 1024 * 1024,   // 50 MB
  doc:      50 * 1024 * 1024,   // 50 MB
  tex:      10 * 1024 * 1024,   // 10 MB
  bib:      10 * 1024 * 1024,   // 10 MB
  md:       10 * 1024 * 1024,   // 10 MB
  markdown: 10 * 1024 * 1024,   // 10 MB
  txt:      10 * 1024 * 1024,   // 10 MB
  text:     10 * 1024 * 1024,   // 10 MB
};

/** Default max size for unknown extensions (50 MB). */
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/** All file extensions accepted for thesis import (not project JSON). */
export const SUPPORTED_IMPORT_EXTENSIONS = ['pdf', 'tex', 'docx', 'doc', 'md', 'txt'] as const;
export type SupportedExtension = (typeof SUPPORTED_IMPORT_EXTENSIONS)[number];

/**
 * Import a thesis file and map extracted data to ThesisData fields.
 * Supported formats: .pdf, .tex, .docx, .md, .txt
 * Throws on unsupported file types.
 */
export async function importFile(file: File): Promise<ImportFileResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  // Handle no-extension files properly
  if (!ext) {
    throw new Error(
      'Cannot determine file type — file has no extension. Supported formats: .pdf, .tex, .docx, .md, .txt'
    );
  }

  // Per-format file size validation
  const maxSize = MAX_FILE_SIZE[ext] ?? DEFAULT_MAX_FILE_SIZE;
  if (file.size > maxSize) {
    const result: ImportResult = {
      source: ext as ImportSource,
      fileName: file.name,
      metadata: {},
      chapters: [],
      references: [],
      newcommands: [],
      detectedTemplate: null,
      confidence: { metadata: {}, chapters: 0, references: 0, overall: 0 },
      warnings: [`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size for .${ext} files is ${maxSize / (1024 * 1024)} MB.`],
      parseErrors: [],
    };
    const { mappings, preview } = mapImportToThesisData(result);
    return { result, mappings, preview };
  }

  let result: ImportResult;

  try {
    switch (ext) {
      case 'pdf':
        result = await importPDF(file);
        break;

      case 'tex':
        // CRITICAL FIX: Use main-thread parsing directly.
        // The previous implementation tried a Web Worker (importWorker.ts) which
        // fails under Turbopack (Next.js 16 default bundler) because Turbopack
        // cannot properly bundle transitive imports into worker scripts.
        // Main-thread parseTeXSource is synchronous and fast enough for thesis files.
        // The Web Worker approach can be re-enabled when Turbopack gains proper
        // worker bundling support.
        try {
          const text = await file.text();
          result = parseTeXSource(text, file.name);
        } catch (texErr: any) {
          // Fallback: try the File-based path (re-reads file, but guaranteed to work)
          console.warn('[importFile] Direct parseTeXSource failed, falling back to importTeX:', texErr?.message);
          result = await importTeX(file);
        }
        break;

      case 'docx':
        result = await importDOCX(file);
        break;

      case 'doc':
        // .doc files are binary — warn user and attempt DOCX parsing
        // (some .doc files are actually .docx in disguise)
        try {
          result = await importDOCX(file);
        } catch (docErr: any) {
          throw new Error(
            `Failed to import "${file.name}": .doc (legacy Word) format is not fully supported. ` +
            `Please convert it to .docx or .pdf and try again. Details: ${docErr?.message || 'Unknown error'}`,
            { cause: docErr }
          );
        }
        break;

      case 'md':
      case 'markdown':
        result = await importMarkdown(file);
        break;

      case 'txt':
      case 'text':
        result = await importTXT(file);
        break;

      default:
        throw new Error(
          `Unsupported file type: .${ext}. Supported formats: .pdf, .tex, .docx, .md, .txt`
        );
    }
  } catch (err: any) {
    // CRITICAL FIX: Re-throw errors instead of silently converting to empty results.
    // The previous pattern masked ALL import failures as "success with no data",
    // making it appear that .tex/.pdf/.docx imports were broken.
    // Now errors propagate to page.tsx which shows a proper toast notification.
    const msg = err?.message ?? 'Unknown error';
    console.error(`[importFile] Import failed for "${file.name}":`, err);
    throw new Error(`Failed to import "${file.name}": ${msg}`, { cause: err });
  }

  const { mappings, preview } = mapImportToThesisData(result);

  // GODMODE: Deduplicate and classify references across all formats
  if (result.references.length > 1) {
    result.references = deduplicateReferences(result.references);
  }
  result.references = result.references.map(ref => ({
    ...ref,
    type: classifyReferenceType(ref),
  }));

  // Apply source format boost to confidence scores
  // NOTE: PDF boost is 0.95 (not 0.92) — modern PDF text extraction is very good.
  const sourceBoost: Record<string, number> = { pdf: 0.95, tex: 1.10, md: 1.05, docx: 1.00, txt: 0.85 };
  const mult = sourceBoost[ext] ?? 1.0;
  result.confidence = {
    ...result.confidence,
    metadata: Object.fromEntries(
      Object.entries(result.confidence.metadata).map(([k, v]) => [k, Math.min(1.0, (v as number) * mult)])
    ),
    overall: Math.min(1.0, result.confidence.overall * mult),
  };

  return { result, mappings, preview };
}
