// ============================================================
// ThesisForge Import — Public API
// importFile(file) → ImportFileResult
// Routes .pdf → pdfImporter, .tex → texImporter, .docx → docxImporter,
// .md → markdownImporter, .txt → txtImporter.
// ============================================================

import { importPDF } from './pdfImporter';
import { importTeX } from './texImporter';
import { importDOCX } from './docxImporter';
import { importMarkdown } from './markdownImporter';
import { importTXT } from './txtImporter';
import { mapImportToThesisData } from './fieldMapper';
import type { ImportResult, FieldMapping } from './types';
import type { ThesisData } from '@/lib/thesis-types';

export type { ImportResult, FieldMapping };

export type ImportFileResult = {
  result:   ImportResult;
  mappings: FieldMapping[];
  preview:  Partial<ThesisData>;
};

/** All file extensions accepted for thesis import (not project JSON). */
export const SUPPORTED_IMPORT_EXTENSIONS = ['pdf', 'tex', 'docx', 'md', 'txt'] as const;
export type SupportedExtension = (typeof SUPPORTED_IMPORT_EXTENSIONS)[number];

/**
 * Import a thesis file and map extracted data to ThesisData fields.
 * Supported formats: .pdf, .tex, .docx, .md, .txt
 * Throws on unsupported file types.
 */
export async function importFile(file: File): Promise<ImportFileResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  let result: ImportResult;

  switch (ext) {
    case 'pdf':
      result = await importPDF(file);
      break;
    case 'tex':
      result = await importTeX(file);
      break;
    case 'docx':
    case 'doc':
      result = await importDOCX(file);
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

  const { mappings, preview } = mapImportToThesisData(result);
  return { result, mappings, preview };
}
