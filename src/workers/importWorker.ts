// ============================================================
// ThesisForge Worker — Import Worker (Background Thread)
// Offloads TeX parsing to a background thread so the UI
// remains responsive during large file imports.
// ============================================================

import { parseTeXSource } from '../core/importer/texImporter';

export interface ImportTexPayload {
  text: string;
  fileName: string;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'IMPORT_TEX') {
    try {
      // FIX: Call parseTeXSource directly with the text string.
      // Previously this created a File object from the text, then
      // importTeX(file) called file.text() again — unnecessary roundtrip.
      const { text, fileName } = payload as ImportTexPayload;
      const result = parseTeXSource(text, fileName);
      self.postMessage({ type: 'IMPORT_RESULT', payload: result });
    } catch (err: any) {
      self.postMessage({
        type: 'IMPORT_ERROR',
        error: err?.message ?? String(err),
      });
    }
  }
};
