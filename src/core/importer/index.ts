// ============================================================
// ThesisForge Import — Public API
// importFile(file) → ImportFileResult
// Routes .pdf → pdfImporter, .tex → texImporter.
// ============================================================

import { importPDF } from './pdfImporter';
import { importTeX } from './texImporter';
import { mapImportToThesisData } from './fieldMapper';
import type { ImportResult, FieldMapping } from './types';
import type { ThesisData } from '@/lib/thesis-types';

export type { ImportResult, FieldMapping };

export type ImportFileResult = {
  result:   ImportResult;
  mappings: FieldMapping[];
  preview:  Partial<ThesisData>;
};

/**
 * Import a .pdf or .tex file and map extracted data to ThesisData fields.
 * Throws on unsupported file types.
 */
export async function importFile(file: File): Promise<ImportFileResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  let result: ImportResult;

  if (ext === 'pdf') {
    result = await importPDF(file);
  } else if (ext === 'tex') {
    result = await importTeX(file);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Upload a .pdf or .tex file.`);
  }

  const { mappings, preview } = mapImportToThesisData(result);
  return { result, mappings, preview };
}
