// ============================================================
// ThesisForge — Editor Page (/editor)
// Standalone route that loads the full LaTeX editor.
// Supports ?source=wizard to load from wizard state,
// or opens with a starter template for direct use.
//
// ARCHITECTURE: "Always open immediately" pattern.
// The editor NEVER blocks on data loading. It opens with
// STARTER_FILES (or restored sessionStorage session) and
// loads wizard thesis data in the background, replacing
// file contents when ready.
//
// FIX: skipHydration + manual rehydrate prevents SSR hydration
// crash caused by Zustand persist reading sessionStorage.
// FIX: Error boundary catches runtime crashes gracefully.
// FIX: No more infinite loading — editor opens immediately.
// ============================================================

'use client';

import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditorStore, rehydrateEditorStore } from '../../lib/editor-store';
import type { EditorFile } from '../../lib/editor-store';
import { useThesisStore } from '../../lib/thesis-store';
import { wizardToEditorFiles } from '../../core/editor-bridge';

import initMonacoLoader from '@/lib/monaco-setup';
// Call it once before any dynamic import
initMonacoLoader();

function EditorLoadingScreen({ message }: { message?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0F1117]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-primary text-xl font-bold">TF</span>
        </div>
        <p className="text-muted-foreground text-sm">
          {message || 'Loading LaTeX Editor...'}
        </p>
        <div className="w-32 h-1 bg-muted/30 rounded-full mx-auto mt-3 overflow-hidden">
          <div className="h-full bg-primary rounded-full w-1/2 animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

// ── Error Fallback ──────────────────────────────────────────
function EditorErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0F1117] p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" className="text-destructive">
            <path d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Editor failed to load</h2>
        <p className="text-sm text-muted-foreground mb-1">
          An unexpected error occurred while initializing the LaTeX editor.
        </p>
        <p className="text-xs text-muted-foreground/60 font-mono mb-6 max-w-sm mx-auto break-all">
          {error.message}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              try { sessionStorage.removeItem('tf-editor-v1'); } catch {}
              reset();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => {
              try { sessionStorage.removeItem('tf-editor-v1'); } catch {}
              useEditorStore.getState().closeSession();
              window.location.href = '/';
            }}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Error boundary wrapper (class component required) ──────
class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: new Error('Unknown error') };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[editor] Unhandled error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <EditorErrorFallback
          error={this.state.error}
          reset={() => this.setState({ hasError: false, error: new Error('Unknown error') })}
        />
      );
    }
    return this.props.children;
  }
}

// ── Import wrapper: catches chunk‑loading errors ──────────
function LatexEditorWrapper({ className }: { className?: string }) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('../../components/thesis/latex-editor/LatexEditor')
      .then((m) => {
        if (!cancelled) setComponent(() => m.LatexEditor);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    // GODMODE 13: Detect ChunkLoadError from stale deployment — offer hard reload
    // instead of a retry that will fail again with the same stale chunk hash.
    const isChunkError = /Loading (CSS )?chunk|Failed to (load chunk|fetch dynamically imported module)/.test(error.message);
    if (isChunkError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0F1117]">
          <div className="text-center max-w-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">App Updated</h2>
            <p className="text-sm text-muted-foreground">
              A new version was deployed. Reload to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px] min-w-[44px]"
            >
              Reload Now
            </button>
          </div>
        </div>
      );
    }
    return (
      <EditorErrorFallback
        error={error}
        reset={() => {
          setError(null);
          setComponent(null);
        }}
      />
    );
  }

  if (!Component) {
    return <EditorLoadingScreen />;
  }

  return <Component className={className} />;
}

// ── Thesis data loader (background, non-blocking) ──────────
// Loads thesis data from wizard/IndexedDB and replaces editor
// file contents. Runs entirely in the background so the editor
// is already usable while loading.

function useBackgroundThesisLoader(source: string | null) {
  const updateFile = useEditorStore(s => s.updateFile);
  const openSession = useEditorStore(s => s.openSession);
  const loadedRef = useRef(false);
  // GODMODE 13: Cancellation flag for async IIFE — prevents stale setState
  // when user navigates away from /editor before background load completes.
  // Without this, openSession() can update store on a component that
  // already unmounted, causing React warnings and potential state corruption.
  const cancelledRef = useRef(false);

  const loadThesisInBackground = useCallback(() => {
    if (loadedRef.current || source !== 'wizard') return;
    loadedRef.current = true;
    cancelledRef.current = false;

    const draftId = '__current__';

    (async () => {
      try {
        // GODMODE 13: Early exit if component unmounted during async load
        if (cancelledRef.current) return;

        // 1. Check Zustand store first (fast, synchronous for SPA nav)
        let thesisData = useThesisStore.getState().thesis;

        if (!thesisData || (!thesisData.metadata?.title && !thesisData.chapters?.length)) {
          // 2. Try IndexedDB
          try {
            const { loadDraft } = await import('@/core/persistence');
            const draft = await loadDraft();
            if (draft?.thesis && (draft.thesis.metadata?.title || draft.thesis.chapters?.length)) {
              thesisData = draft.thesis;
              // Populate the thesis store for consistency
              useThesisStore.setState({
                thesis: draft.thesis,
                selectedTemplate: draft.templateId,
                _hydrated: true,
              });
            }
          } catch (e) {
            console.warn('[editor] IndexedDB load failed:', e);
          }
        }

        if (!thesisData || (!thesisData.metadata?.title && !thesisData.chapters?.length)) {
          // 3. Wait for store hydration (SPA navigation from wizard)
          const storeData = await new Promise<{ thesis: any } | null>((resolve) => {
            const current = useThesisStore.getState().thesis;
            if (current && (current.metadata?.title || current.chapters?.length)) {
              resolve({ thesis: current });
              return;
            }

            const unsub = useThesisStore.subscribe((state) => {
              const thesis = state.thesis;
              if (thesis?.metadata?.title || thesis?.chapters?.length) {
                unsub();
                resolve({ thesis });
              }
            });

            setTimeout(() => {
              unsub();
              resolve(null);
            }, 4000);
          });

          if (storeData?.thesis) {
            thesisData = storeData.thesis;
          }
        }

        if (!thesisData || (!thesisData.metadata?.title && !thesisData.chapters?.length)) {
          console.info('[editor] No thesis data available — editor opened with starter template');
          return;
        }

        // Generate LaTeX files from thesis data
        console.info('[editor] Generating LaTeX from thesis data:', thesisData.metadata?.title || '(untitled)');
        const { files } = await wizardToEditorFiles(thesisData, draftId);

        // GODMODE 13: Check cancellation BEFORE calling openSession.
        // Previously the check was after openSession(), meaning the store
        // mutation fired unconditionally even if the component had unmounted.
        if (cancelledRef.current) return;

        // Replace editor contents without disrupting the session
        // Use openSession to set a proper wizard session
        useEditorStore.getState().openSession(files, 'wizard', draftId);
        // GODMODE 13: Guard against stale setState after unmount
        if (cancelledRef.current) return;
        console.info('[editor] Thesis data loaded successfully');
      } catch (err) {
        console.error('[editor] Background thesis load failed:', err);
        // Editor is already open with starter files — no action needed
      }
    })();
  }, [source, openSession, updateFile]);

  useEffect(() => {
    // Slight delay to let the editor fully mount first
    const timer = setTimeout(loadThesisInBackground, 100);
    // GODMODE 13: Set cancelled flag on unmount to prevent stale setState
    // from the background async IIFE that may still be running.
    return () => {
      clearTimeout(timer);
      cancelledRef.current = true;
    };
  }, [loadThesisInBackground]);
}

// ── Main editor content ─────────────────────────────────────
function EditorContent() {
  const params       = useSearchParams();
  const source       = params.get('source');
  const openSession  = useEditorStore(s => s.openSession);
  const session      = useEditorStore(s => s.session);
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);

  // Phase 1: Rehydrate editor store from sessionStorage, then signal ready
  useEffect(() => {
    rehydrateEditorStore();
    // Use a double-rAF to ensure React has committed the DOM
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true));
    });
  }, []);

  // Phase 2: Ensure editor session exists — NEVER BLOCK
  useEffect(() => {
    if (!ready) return;
    // Prevent double initialization
    if (initializedRef.current) return;
    initializedRef.current = true;

    const currentState = useEditorStore.getState();

    // If rehydration restored a session from sessionStorage, use it
    if (currentState.session) {
      console.info('[editor] Restored session from storage:', currentState.session.source);
      return;
    }

    // Open editor immediately with STARTER_FILES — no blocking
    // If source=wizard, the background loader will replace files shortly
    console.info('[editor] Opening editor with', source === 'wizard' ? 'starter template (loading thesis in background)' : 'starter template');
    openSession(STARTER_FILES, 'direct');
  }, [ready]);

  // Phase 3: Background thesis loader (wizard source only)
  useBackgroundThesisLoader(source);

  if (!ready) {
    return <EditorLoadingScreen />;
  }

  // FIXSEVENTEEN: Removed className="flex-1" — parent layout now wraps in flex-1
  // container, so flex-1 here would be redundant and could double-apply.
  // The editor component's own className||"flex-1" handles sizing.
  return <LatexEditorWrapper />;
}

export default function EditorPage() {
  return (
    <EditorErrorBoundary>
      {/* FIXSEVENTEEN: Suspense fallback must also fill the flex-1 container.
           Without h-full, the fallback skeleton (bg-[#0F1117]) would collapse to 0
           height on mobile, showing nothing until the editor loads. */}
      <Suspense fallback={<div className="flex-1 h-full"><EditorLoadingScreen /></div>}>
        <EditorContent />
      </Suspense>
    </EditorErrorBoundary>
  );
}

const STARTER_FILES = {
  'main.tex': `\\documentclass[12pt,a4paper]{report}

% ── Packages ────────────────────────────────────────────────────────
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{geometry}
\\usepackage{microtype}
\\usepackage{setspace}
\\usepackage{natbib}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{hyperref}
\\usepackage[nameinlink]{cleveref}

% ── Configuration ───────────────────────────────────────────────────
\\geometry{a4paper, top=25mm, bottom=25mm, left=30mm, right=25mm}
\\onehalfspacing

\\hypersetup{
  pdftitle    = {My Thesis},
  pdfauthor   = {Author Name},
  colorlinks  = true,
  linkcolor   = NavyBlue,
  citecolor   = ForestGreen,
  urlcolor    = RoyalBlue
}

% ── Document ─────────────────────────────────────────────────────────
\\begin{document}

\\begin{titlepage}
  \\centering
  \\vspace*{2cm}
  {\\Huge\\bfseries My Thesis Title\\par}
  \\vspace{1cm}
  {\\Large Author Name\\par}
  \\vfill
  {\\large University Name \\textperiodcentered{} 2024\\par}
\\end{titlepage}

\\tableofcontents

\\chapter{Introduction}
\\label{ch:introduction}

Write your introduction here.

\\chapter{Background}
\\label{ch:background}

Review the literature here.

\\bibliographystyle{plainnat}
\\bibliography{references}

\\end{document}
`,

  'references.bib': `@article{example2024,
  author  = {Author, A. and Second, B.},
  title   = {An Example Article Title},
  journal = {Journal of Examples},
  year    = {2024},
  volume  = {1},
  number  = {1},
  pages   = {1--10},
  doi     = {10.0000/example}
}
`,

  'readme.md': `# My Thesis

## Compilation

### Quick (Overleaf)
Upload this folder as a ZIP to overleaf.com.

### Local
\`\`\`bash
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
\`\`\`

## Files
- \`main.tex\`        — Main thesis document
- \`references.bib\`  — Bibliography database
- \`figures/\`        — Place figure files here

Generated by ThesisForge
`,
};
