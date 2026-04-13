// ============================================================
// ThesisForge Smart Import — PDF Importer (Stub)
// Full PDF support requires pdfjs-dist (npm install pdfjs-dist).
// This stub provides the interface for future integration.
// ============================================================

import type { ImportResult } from './types';

export async function importPDF(file: File): Promise<ImportResult> {
  throw new Error(
    'PDF import requires the pdfjs-dist package. Install it with: bun add pdfjs-dist. For now, please convert your PDF to .tex and try again.'
  );
}
