// ============================================================
// ThesisForge Worker — LaTeX Generation (Background Thread)
// Moves heavy AST build + serialize off the main thread.
// Used by the useLatexWorker hook for non-blocking export.
// ============================================================

import { buildAST } from '../core/ast-builder';
import { serializeToString } from '../core/serializer';
import { generateBibFromThesisReferences } from '../core/bib';
import type { ThesisData } from '@/lib/thesis-types';

export interface GeneratePayload {
  thesisData: ThesisData;
}

export interface GenerateResult {
  tex: string;
  bib: string;
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'GENERATE') {
    try {
      const { thesisData } = payload as GeneratePayload;
      const ast  = buildAST(thesisData);
      const tex  = serializeToString(ast);
      const bib  = generateBibFromThesisReferences(thesisData.references || []);

      self.postMessage({
        type: 'GENERATE_RESULT',
        payload: { tex, bib } as GenerateResult,
      });
    } catch (err: any) {
      self.postMessage({
        type: 'GENERATE_ERROR',
        error: err.message,
      });
    }
  }
};
