// ============================================================
// ThesisForge Hook — useLatexWorker
// React hook to offload LaTeX generation to a Web Worker.
// Returns a { generate } function that resolves with { tex, bib }.
// ============================================================

'use client';

import { useRef, useCallback, useEffect } from 'react';

interface GenerateResult {
  tex: string;
  bib: string;
}

export function useLatexWorker() {
  const workerRef = useRef<Worker | null>(null);
  // GODMODE 13: Track pending promise resolvers so we can reject them on worker
  // termination. Without this, if the component unmounts while the worker is
  // processing a GENERATE message, the caller's `await generate(...)` hangs forever
  // — the promise never resolves or rejects because the worker is dead.
  const pendingResolvers = useRef<Array<{ resolve: (value: GenerateResult) => void; reject: (reason?: Error) => void }>>([]);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/latexWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  // Auto-cleanup worker on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        // GODMODE 13: Reject all pending promises before terminating.
        // This prevents callers from hanging if the worker is processing when
        // the component unmounts (e.g., user navigates away during export).
        for (const { reject } of pendingResolvers.current) {
          reject(new Error('Worker terminated — component unmounted'));
        }
        pendingResolvers.current = [];
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const generate = useCallback(
    (thesisData: any): Promise<GenerateResult> => {
      return new Promise((resolve, reject) => {
        const worker = getWorker();

        const entry = { resolve, reject };
        pendingResolvers.current.push(entry);

        const handler = (e: MessageEvent) => {
          if (e.data.type === 'GENERATE_RESULT') {
            worker.removeEventListener('message', handler);
            pendingResolvers.current = pendingResolvers.current.filter(r => r !== entry);
            resolve(e.data.payload);
          }
          if (e.data.type === 'GENERATE_ERROR') {
            worker.removeEventListener('message', handler);
            pendingResolvers.current = pendingResolvers.current.filter(r => r !== entry);
            reject(new Error(e.data.error));
          }
        };

        worker.addEventListener('message', handler);
        worker.postMessage({ type: 'GENERATE', payload: { thesisData } });
      });
    },
    [getWorker]
  );

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return { generate, terminate };
}
