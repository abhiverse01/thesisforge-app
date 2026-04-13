// ============================================================
// ThesisForge Smart Import — Public API
// Entry point: importFile(file) → ImportFileResult
// ============================================================

import { importTeX } from './texImporter';
import { mapImportToThesisData } from './fieldMapper';
import type { ImportResult, FieldMapping, ImportFileResult } from './types';

export type { ImportResult, FieldMapping, ImportFileResult };
export type { ExtractedMetadata, ExtractedChapter, ExtractedReference, ImportConfidence } from './types';

export async function importFile(file: File): Promise<ImportFileResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  let result: ImportResult;

  if (ext === 'tex') {
    result = await importTeX(file);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Upload a .tex file (PDF support coming soon).`);
  }

  const { mappings, preview } = mapImportToThesisData(result);
  return { result, mappings, preview };
}
