// ============================================================
// ThesisForge — Editor Store (Zustand)
// Isolated state domain for the LaTeX editor.
// Does NOT modify thesis-store.ts.
// ============================================================

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';

export type EditorFile = 'main.tex' | 'references.bib' | 'readme.md';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  id:       string;
  severity: DiagnosticSeverity;
  message:  string;
  line?:    number;
  column?:  number;
  source:   'lint' | 'simulator' | 'expert' | 'contract';
  rule?:    string;
}

export interface SimulationState {
  running:         boolean;
  lastRun:         number | null;
  result:          any | null;
  estimatedPages:  number;
}

export interface EditorSession {
  files:         Record<EditorFile, string>;
  activeFile:    EditorFile;
  cursors:       Record<EditorFile, { line: number; column: number }>;
  dirty:         Record<EditorFile, boolean>;
  source:        'wizard' | 'direct' | 'import' | null;
  wizardDraftId: string | null;
  lastSaved:     number | null;
}

export interface EditorUIState {
  sidebarOpen:      boolean;
  sidebarTab:       'outline' | 'snippets' | 'files';
  diagnosticsOpen:  boolean;
  compileOpen:      boolean;
  previewOpen:      boolean;
  wordWrap:         boolean;
  minimap:          boolean;
  fontSize:         number;
  theme:            'auto' | 'light' | 'dark';
  compileOnSave:    boolean;
  shortcutsOpen:     boolean;
}

interface EditorStore {
  session:     EditorSession | null;
  ui:          EditorUIState;
  diagnostics: Diagnostic[];
  simulation:  SimulationState;

  // Session lifecycle
  openSession:   (files: Partial<Record<EditorFile, string>>, source: EditorSession['source'], draftId?: string) => void;
  closeSession:  () => void;

  // File operations
  setActiveFile: (file: EditorFile) => void;
  updateFile:    (file: EditorFile, content: string) => void;
  updateCursor:  (file: EditorFile, line: number, col: number) => void;

  // Diagnostics
  setDiagnostics:  (diags: Diagnostic[]) => void;
  clearDiagnostics: () => void;

  // Simulation
  startSimulation:       () => void;
  setSimulationResult:   (result: any, pages: number) => void;

  // File import from external files
  importFiles: (files: Partial<Record<EditorFile, string>>, source: EditorSession['source']) => void;

  // UI
  setUI:               (patch: Partial<EditorUIState>) => void;
  toggleSidebar:       () => void;
  toggleDiagnostics:   () => void;
  toggleCompilePanel:  () => void;
  togglePreview:       () => void;
}

const DEFAULT_UI: EditorUIState = {
  sidebarOpen:     true,
  sidebarTab:      'outline',
  diagnosticsOpen: true,
  compileOpen:     false,
  previewOpen:     false,
  wordWrap:        false,
  minimap:         false,
  fontSize:        14,
  theme:           'auto',
  compileOnSave:   true,
  shortcutsOpen:    false,
};

export const useEditorStore = create<EditorStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      session:     null,
      ui:          DEFAULT_UI,
      diagnostics: [],
      simulation:  { running: false, lastRun: null, result: null, estimatedPages: 0 },

      // ── File import ─────────────────────────────────────────
      importFiles: (files: Partial<Record<EditorFile, string>>, source: EditorSession['source']) => {
        const state = get();
        state.openSession(files, source);
      },

      openSession: (files, source, draftId) => {
        set({
          session: {
            files: {
              'main.tex':       files['main.tex']       ?? '',
              'references.bib': files['references.bib'] ?? '',
              'readme.md':      files['readme.md']      ?? '',
            },
            activeFile:    'main.tex',
            cursors:       {
              'main.tex':       { line: 1, column: 1 },
              'references.bib': { line: 1, column: 1 },
              'readme.md':      { line: 1, column: 1 },
            },
            dirty:         { 'main.tex': false, 'references.bib': false, 'readme.md': false },
            source,
            wizardDraftId: draftId ?? null,
            lastSaved:     null,
          },
          diagnostics: [],
          simulation: { running: false, lastRun: null, result: null, estimatedPages: 0 },
        });
      },

      closeSession: () => set({ session: null, diagnostics: [] }),

      setActiveFile: (file) =>
        set(s => ({ session: s.session ? { ...s.session, activeFile: file } : null })),

      updateFile: (file, content) =>
        set(s => {
          if (!s.session) return {};
          return {
            session: {
              ...s.session,
              files: { ...s.session.files, [file]: content },
              dirty:  { ...s.session.dirty,  [file]: true },
            },
          };
        }),

      updateCursor: (file, line, col) =>
        set(s => {
          if (!s.session) return {};
          return {
            session: {
              ...s.session,
              cursors: { ...s.session.cursors, [file]: { line, column: col } },
            },
          };
        }),

      setDiagnostics: (diags) => set({ diagnostics: diags }),
      clearDiagnostics: () => set({ diagnostics: [] }),

      startSimulation: () =>
        set(s => ({ simulation: { ...s.simulation, running: true } })),

      setSimulationResult: (result, pages) =>
        set({ simulation: { running: false, lastRun: Date.now(), result, estimatedPages: pages } }),

      setUI: (patch) => set(s => ({ ui: { ...s.ui, ...patch } })),
      toggleSidebar:      () => set(s => ({ ui: { ...s.ui, sidebarOpen:     !s.ui.sidebarOpen     } })),
      toggleDiagnostics:  () => set(s => ({ ui: { ...s.ui, diagnosticsOpen: !s.ui.diagnosticsOpen } })),
      toggleCompilePanel: () => set(s => ({ ui: { ...s.ui, compileOpen:     !s.ui.compileOpen     } })),
      togglePreview:      () => set(s => ({ ui: { ...s.ui, previewOpen:     !s.ui.previewOpen     } })),
    })),
    {
      name: 'tf-editor-v1',
      version: 1,
      // FIX: skipHydration prevents SSR ↔ client hydration mismatch.
      // Without this, Zustand reads sessionStorage during mount, producing
      // different state than the SSR render → React crashes with
      // "a client-side exception has occurred".
      skipHydration: true,
      storage: createJSONStorage(() => {
        try {
          // Only use sessionStorage on the client
          if (typeof window === 'undefined') {
            return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
          }
          return sessionStorage;
        } catch {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
      }),
      // FIX: Handle corrupted sessionStorage gracefully — nuke bad data
      // instead of crashing the entire editor on mount.
      // onRehydrateStorage returns a callback invoked AFTER rehydration.
      // AUDIT(fix19): Mobile UI correction moved HERE (after rehydration)
      // instead of in rehydrateEditorStore(). Previously the mobile fix
      // ran immediately after calling rehydrate(), but rehydrate() is async
      // (microtask). The subsequent getState() got pre-rehydrated defaults,
      // and setState applied the mobile fix — only for rehydration to
      // overwrite it on the next microtask with persisted desktop values.
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.warn('[editor-store] Rehydration failed — clearing corrupted sessionStorage:', error);
            try { sessionStorage.removeItem('tf-editor-v1'); } catch { /* ignore */ }
          }
          // AUDIT(fix19): Apply mobile UI correction AFTER rehydration
          // completes, so it cannot be overwritten by the async merge.
          try {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              const state = useEditorStore.getState();
              if (state.ui.sidebarOpen || state.ui.diagnosticsOpen || state.ui.previewOpen) {
                useEditorStore.setState({
                  ui: {
                    ...state.ui,
                    sidebarOpen: false,
                    diagnosticsOpen: false,
                    previewOpen: false,
                  },
                });
              }
            }
          } catch { /* ignore non-critical */ }
        };
      },
      // Migration: future schema changes can be handled here.
      // v0 (unversioned) → v1: no structural change, just version stamp.
      migrate(persisted: any, version: number) {
        // Always return a valid state shape regardless of stored version
        if (!persisted || typeof persisted !== 'object') return persisted;
        // Ensure session.files always has all three keys
        if (persisted.session?.files) {
          const files = persisted.session.files;
          if (typeof files === 'object' && files !== null) {
            persisted.session.files = {
              'main.tex':       typeof files['main.tex'] === 'string' ? files['main.tex'] : '',
              'references.bib': typeof files['references.bib'] === 'string' ? files['references.bib'] : '',
              'readme.md':      typeof files['readme.md'] === 'string' ? files['readme.md'] : '',
            };
          }
        }
        return persisted;
      },
      partialize: (s) => ({
        session: s.session ? {
          files:         s.session.files,
          activeFile:    s.session.activeFile,
          source:        s.session.source,
          wizardDraftId: s.session.wizardDraftId,
          cursors:   { 'main.tex': { line: 1, column: 1 }, 'references.bib': { line: 1, column: 1 }, 'readme.md': { line: 1, column: 1 } },
          dirty:     { 'main.tex': false, 'references.bib': false, 'readme.md': false },
          lastSaved: null,
        } : null,
        ui: s.ui,
      }),
    }
  )
);

// ── Helper: rehydrate the persisted store (call once in useEffect) ──
// FIX: Wrap in try/catch so corrupted sessionStorage never crashes the editor.
// The onRehydrateStorageError handler above also catches deserialization
// errors, but this guards against any other unexpected throw.
export function rehydrateEditorStore(): void {
  if (typeof window !== 'undefined') {
    try {
      useEditorStore.persist.rehydrate();
    } catch (err) {
      console.warn('[editor-store] rehydrate() threw — clearing sessionStorage:', err);
      try { sessionStorage.removeItem('tf-editor-v1'); } catch { /* ignore */ }
    }
    // AUDIT(fix19): Mobile UI fix moved to onRehydrateStorage callback
    // (see above) to prevent the async rehydration microtask from
    // overwriting the correction with persisted desktop values.
  }
}

/**
 * Check if rehydration has completed.
 * Useful for components that need to wait for persisted state.
 */
export function isEditorStoreHydrated(): boolean {
  return useEditorStore.persist.hasHydrated();
}
