// ============================================================
// ThesisForge — Main LaTeX Editor Shell
// Orchestrates Monaco editor, toolbar, sidebar, diagnostics,
// file tabs, and status bar into a VS Code-like IDE experience.
//
// FIX: Cursor tracking, stale closures, debounce stability,
//      requestIdleCallback polyfill, lint/sim dedup.
// FIX: Mobile-responsive sidebar (Sheet overlay), preview (fullscreen),
//      toolbar overflow, status bar truncation, editor font scaling.
// ============================================================

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useEditorStore } from '../../../lib/editor-store';
import { useIsMobile } from '../../../hooks/use-mobile';
import { EditorToolbar } from './EditorToolbar';
import { FileTabs } from './FileTabs';
import { EditorSidebar } from './EditorSidebar';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { EditorStatusBar } from './EditorStatusBar';
import { PDFPreviewPanel } from './PDFPreviewPanel';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { registerLatexLanguage } from './useMonaco';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../../ui/sheet';
import { cn } from '../../../lib/utils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../../ui/resizable';

// ── Interfaces matching the real module outputs ──────────────
interface LintIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  id: string;
}

interface LintResult {
  all: LintIssue[];
}

interface SimError {
  code: string;
  message: string;
  location?: string;
}

interface SimResult {
  errors: SimError[];
  warnings: SimError[];
}

interface ExpertIssue {
  severity: string;
  category: string;
  title: string;
  detail: string;
  id: string;
  line?: number;
}

interface ExpertResult {
  criticalFixes: ExpertIssue[];
}

// ── Lazy module loaders (replaces fragile require() calls) ──────────
// FIX: require() at module scope fails silently during Next.js code-splitting.
// Use async dynamic import() with lazy caching instead. The fallback
// functions are used until the real modules load successfully.

let lintLatex = (tex: string): LintResult => ({ all: [] });
let simulateCompilation = (tex: string, bib: string): SimResult => ({ errors: [], warnings: [] });
let analyzeLatexExpert = (tex: string, bib: string): ExpertResult => ({ criticalFixes: [] });

// Track loading state to avoid redundant imports
let modulesLoaded = false;
let modulesLoading = false;

async function loadEditorModules(): Promise<void> {
  if (modulesLoaded || modulesLoading) return;
  modulesLoading = true;

  try {
    const [lintMod, simMod, expertMod] = await Promise.all([
      import('../../../core/linter').catch(() => null),
      import('../../../core/compilation-simulator').catch(() => null),
      import('../../../intelligence/latexExpertAnalyzer').catch(() => null),
    ]);

    if (lintMod?.lintLatex) {
      lintLatex = lintMod.lintLatex;
    } else {
      console.warn('[editor] linter module unavailable, using fallback.');
    }

    if (simMod?.simulateCompilation) {
      const realSim = simMod.simulateCompilation;
      // Wrap real simulateCompilation to normalize output to SimResult shape
      simulateCompilation = (tex: string, bib: string): SimResult => {
        try {
          const result = realSim(tex, bib) as any;
          return {
            errors: result.errors ?? [],
            warnings: result.warnings ?? [],
          };
        } catch {
          return { errors: [], warnings: [] };
        }
      };
    } else {
      console.warn('[editor] compilation-simulator unavailable, using fallback.');
    }

    if (expertMod?.analyzeLatexExpert) {
      const realExpert = expertMod.analyzeLatexExpert;
      analyzeLatexExpert = (tex: string, bib: string): ExpertResult => {
        try {
          const result = realExpert(tex, bib) as any;
          return { criticalFixes: result.criticalFixes ?? [] };
        } catch {
          return { criticalFixes: [] };
        }
      };
    } else {
      console.warn('[editor] latexExpertAnalyzer unavailable, using fallback.');
    }

    modulesLoaded = true;
  } catch (err) {
    console.warn('[editor] Failed to load editor modules:', err);
  } finally {
    modulesLoading = false;
  }
}

// ── Code that can crash ──────────────────────────────────────
const SAFE_LANGUAGE_MAP: Record<string, string> = {
  'main.tex':       'latex',
  'references.bib': 'bibtex',
  'readme.md':      'markdown',
};

function safeLanguage(file: string): string {
  const lang = SAFE_LANGUAGE_MAP[file] || 'plaintext';
  // bibtex is registered in registerLatexLanguage() via useMonaco.ts,
  // which runs in beforeMount — safe to return here.
  return lang;
}

// ── Timeout wrapper for Monaco dynamic import ─────────────────
const MONACO_LOAD_TIMEOUT_MS = 20_000; // 20s – generous for slow networks

function EditorLoadingSkeleton() {
  return (
    <div className="flex-1 bg-[#0F1117] animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-primary text-sm font-bold">TF</span>
        </div>
        <div className="text-muted-foreground/30 text-xs font-mono">
          Loading editor...
        </div>
      </div>
    </div>
  );
}

function MonacoLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 bg-[#0F1117] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" className="text-destructive">
            <path d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Editor failed to load</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Monaco Editor could not be loaded. This may be due to a network issue or ad‑blocker.
          Please try again.
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ── Monaco component with timeout ─────────────────────────────
function MonacoEditorWithTimeout(props: any) {
  const [loadFailed, setLoadFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    timeoutRef.current = setTimeout(() => setLoadFailed(true), MONACO_LOAD_TIMEOUT_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  if (loadFailed) {
    return <MonacoLoadError onRetry={() => { setLoadFailed(false); }} />;
  }

  return (
    <MonacoEditorComponent
      {...props}
      onMount={(editor: any, monaco: any) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        props.onMount(editor, monaco);
      }}
    />
  );
}

const MonacoEditorComponent = dynamic(
  () => import('@monaco-editor/react').then(m => m.default),
  {
    ssr: false,
    loading: () => <EditorLoadingSkeleton />,
  }
);

// ── requestIdleCallback polyfill ──────────────────────────────
// FIXTEN: Mobile polyfill uses 50ms delay instead of 1ms.
// 1ms timeout is effectively synchronous — it blocks the main thread
// during lint/simulation which causes keyboard input lag on mobile.
// 50ms gives the browser breathing room between keystrokes while
// still feeling responsive (human perception threshold is ~100ms).
// GODMODE 13: Removed module-level isMobileDevice capture — it was evaluated
// once at load time and never updated on resize. If a user started on desktop
// and resized to mobile, the rIC polyfill would use 1ms instead of 50ms.
// Now we check window.innerWidth dynamically on every rIC call (negligible
// overhead since rIC fires during idle time, not hot paths).
const rIC = typeof requestIdleCallback !== 'undefined'
  ? requestIdleCallback
  : (cb: () => void) => setTimeout(cb, (typeof window !== 'undefined' && window.innerWidth < 768) ? 50 : 1);

const LINT_OWNER = 'thesisforge-lint';

function stableDebounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, ms);
  }) as T;
  (debounced as any).cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return debounced;
}

interface LatexEditorProps {
  className?: string;
}

export function LatexEditorInner({ className }: LatexEditorProps) {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const session = useEditorStore(s => s.session);
  const ui = useEditorStore(s => s.ui);
  const diagnostics = useEditorStore(s => s.diagnostics);
  const simulation = useEditorStore(s => s.simulation);

  const updateFile = useEditorStore(s => s.updateFile);
  const updateCursor = useEditorStore(s => s.updateCursor);
  const setDiagnostics = useEditorStore(s => s.setDiagnostics);
  const startSimulation = useEditorStore(s => s.startSimulation);
  const setSimResult = useEditorStore(s => s.setSimulationResult);
  const setUI = useEditorStore(s => s.setUI);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const prevMobileRef = useRef<boolean | undefined>(undefined);

  // GODMODE FIX: Close sidebar + preview when switching to mobile.
  // Handles both: (a) desktop→mobile resize transitions, AND
  // (b) initial mobile load where prevMobileRef.current is undefined.
  // Previous code only handled case (a), missing case (b) which caused
  // the Sheet overlay to cover the entire editor on mobile load.
  useEffect(() => {
    if (isMobile && (prevMobileRef.current === undefined || !prevMobileRef.current)) {
      setUI({ sidebarOpen: false, previewOpen: false, diagnosticsOpen: false });
    }
    prevMobileRef.current = isMobile;
  }, [isMobile, setUI]);

  // Load editor intelligence modules lazily on first mount
  useEffect(() => {
    loadEditorModules();
  }, []);

  const monacoTheme = ui.theme === 'auto'
    ? (resolvedTheme === 'dark' ? 'tf-dark' : 'tf-light')
    : ui.theme === 'dark' ? 'tf-dark' : 'tf-light';

  const effectiveFontSize = isMobile
    ? Math.max(12, Math.min(ui.fontSize - 2, 16))
    : ui.fontSize;

  // ── Register custom themes and language on Monaco mount ──────
  const handleEditorWillMount = useCallback((monaco: any) => {
    monacoRef.current = monaco;
    try {
      registerLatexLanguage(monaco);
    } catch (err) {
      console.error('[editor] Failed to register LaTeX language:', err);
      // Don't rethrow — the editor can still work with plaintext
    }

    try {
      monaco.editor.defineTheme('tf-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
          { token: 'type', foreground: '4EC9B0' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'string.math', foreground: 'B5CEA8' },
          { token: 'string.escape', foreground: 'D7BA7D' },
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'keyword.operator', foreground: 'D4D4D4' },
          { token: 'attribute.name', foreground: '9CDCFE' },
          { token: 'delimiter.curly', foreground: 'FFD700' },
          { token: 'delimiter.bracket', foreground: 'DA70D6' },
          { token: 'delimiter.paren', foreground: 'FFD700' },
        ],
        colors: {
          'editor.background': '#0F1117',
          'editor.lineHighlightBackground': '#1A1F2E',
          'editorCursor.foreground': '#7C85FF',
          'editor.selectionBackground': '#264F78',
          'editorLineNumber.foreground': '#3C4166',
          'editorLineNumber.activeForeground': '#7C85FF',
          'editorWidget.background': '#161B22',
          'editorWidget.border': '#30363D',
          'editorSuggestWidget.background': '#161B22',
          'editorSuggestWidget.border': '#30363D',
          'editorSuggestWidget.selectedBackground': '#264F78',
          'list.activeSelectionBackground': '#264F78',
          'list.hoverBackground': '#1A1F2E',
        },
      });

      monaco.editor.defineTheme('tf-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '7B1FE0', fontStyle: 'bold' },
          { token: 'type', foreground: '0070C1' },
          { token: 'string', foreground: 'A31515' },
          { token: 'string.math', foreground: '098658' },
          { token: 'string.escape', foreground: '0070C1' },
          { token: 'comment', foreground: '008000', fontStyle: 'italic' },
          { token: 'attribute.name', foreground: '0070C1' },
          { token: 'delimiter.curly', foreground: '8B6914' },
        ],
        colors: {
          'editor.background': '#FAFAFA',
          'editor.lineHighlightBackground': '#F0F3FF',
          'editorCursor.foreground': '#5B4FE0',
          'editorWidget.background': '#F5F5F5',
          'editorWidget.border': '#E0E0E0',
        },
      });
    } catch (err) {
      console.error('[editor] Failed to define themes:', err);
    }
  }, []);

  // ── Lint runner (stable) ────────────────────────────────────
  const triggerLint = useCallback(() => {
    const state = useEditorStore.getState();
    const sessionData = state.session;
    if (!sessionData) return;
    const tex = sessionData.files['main.tex'];
    try {
      const lintResult = lintLatex(tex);
      const diags = lintResult.all.map((r: any, i: number) => ({
        id: `lint-${i}`,
        severity: r.severity as 'error' | 'warning' | 'info',
        message: r.message,
        line: r.line,
        source: 'lint' as const,
        rule: r.id,
      }));
      state.setDiagnostics(diags);
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (editor && monaco) {
        const model = editor.getModel();
        if (model) {
          const markers = diags
            .filter((d: any) => d.line != null)
            .map((d: any) => ({
              severity: d.severity === 'error' ? monaco.MarkerSeverity.Error
                : d.severity === 'warning' ? monaco.MarkerSeverity.Warning
                : monaco.MarkerSeverity.Info,
              message: d.message,
              startLineNumber: d.line!,
              startColumn: 1,
              endLineNumber: d.line!,
              endColumn: model.getLineLength(d.line!) + 1,
              source: 'ThesisForge Lint',
            }));
          monaco.editor.setModelMarkers(model, LINT_OWNER, markers);
        }
      }
    } catch (err) {
      console.error('[editor] Lint runner error:', err);
    }
  }, []);

  // ── Simulation runner (stable) ─────────────────────────────
  const runSimulation = useCallback(() => {
    const state = useEditorStore.getState();
    const sessionData = state.session;
    if (!sessionData) return;
    state.startSimulation();
    const tex = sessionData.files['main.tex'];
    const bib = sessionData.files['references.bib'];
    rIC(() => {
      try {
        const result = simulateCompilation(tex, bib);
        const expertResult = analyzeLatexExpert(tex, bib);
        const simDiags = [
          ...result.errors.map((e: any, i: number) => ({
            id: `sim-e-${i}`,
            severity: 'error' as const,
            message: `${e.code}: ${e.message}`,
            source: 'simulator' as const,
            rule: e.code,
            line: e.location ? parseInt(String(e.location).replace(/\D/g, ''), 10) || undefined : undefined,
          })),
          ...result.warnings.map((w: any, i: number) => ({
            id: `sim-w-${i}`,
            severity: 'warning' as const,
            message: `${w.code}: ${w.message}`,
            source: 'simulator' as const,
            rule: w.code,
            line: w.location ? parseInt(String(w.location).replace(/\D/g, ''), 10) || undefined : undefined,
          })),
        ];
        const expertDiags = expertResult.criticalFixes.map((issue, i) => ({
          id: `expert-${i}`,
          severity: (issue.severity === 'critical' ? 'error' : issue.severity === 'major' ? 'error' : 'warning') as 'error' | 'warning' | 'info',
          message: `[${issue.category}] ${issue.title}: ${issue.detail}`,
          source: 'expert' as const,
          rule: issue.id,
          line: issue.line,
        }));
        const lintResult = lintLatex(tex);
        const lintDiags = lintResult.all.map((r, i) => ({
          id: `lint-${i}`,
          severity: r.severity as 'error' | 'warning' | 'info',
          message: r.message,
          line: r.line,
          source: 'lint' as const,
          rule: r.id,
        }));
        state.setDiagnostics([...simDiags, ...expertDiags, ...lintDiags]);
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (editor && monaco) {
          const model = editor.getModel();
          if (model) {
            const allDiags = [...simDiags, ...expertDiags, ...lintDiags];
            const markers = allDiags
              .filter(d => d.line != null)
              .map(d => ({
                severity: d.severity === 'error' ? monaco.MarkerSeverity.Error
                  : d.severity === 'warning' ? monaco.MarkerSeverity.Warning
                  : monaco.MarkerSeverity.Info,
                message: d.message,
                startLineNumber: d.line!,
                startColumn: 1,
                endLineNumber: d.line!,
                endColumn: model.getLineLength(d.line!) + 1,
                source: d.source === 'simulator' ? 'Simulator' : d.source === 'expert' ? 'Expert Analysis' : 'ThesisForge Lint',
              }));
            monaco.editor.setModelMarkers(model, LINT_OWNER, markers);
          }
        }
        const pages = Math.ceil((tex.match(/\b\w+\b/g)?.length ?? 0) / 300);
        state.setSimulationResult(result, pages);
      } catch (e) {
        console.error('[editor] simulation error', e);
        state.setSimulationResult(null, 0);
      }
    });
  }, []);

  // eslint-disable-next-line react-hooks/refs -- stableDebounce creates a closure, not a ref access
  const debouncedLint = useMemo(() => stableDebounce(triggerLint, 800), [triggerLint]);

  // ── Editor mount ─────────────────────────────────────────────
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    try {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runSimulation());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, (e: any) => {
        e?.preventDefault?.();
        triggerLint();
        const { ui } = useEditorStore.getState();
        if (ui.compileOnSave) runSimulation();
      });
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => useEditorStore.getState().toggleSidebar());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => useEditorStore.getState().toggleDiagnostics());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => useEditorStore.getState().togglePreview());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backslash, () => useEditorStore.getState().toggleSidebar());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM, () => {
        const { ui, setUI } = useEditorStore.getState();
        setUI({ minimap: !ui.minimap });
      });
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyW, () => {
        const { ui, setUI } = useEditorStore.getState();
        setUI({ wordWrap: !ui.wordWrap });
      });
      editor.addCommand(monaco.KeyCode.Slash, () => {
        const pos = editor.getPosition();
        const sel = editor.getSelection();
        if (sel && !sel.isEmpty()) return;
        if (pos && pos.column === 1 && pos.lineNumber === 1) {
          useEditorStore.getState().setUI({ shortcutsOpen: true });
        }
      });
      editor.onDidChangeCursorPosition((e: any) => {
        const pos = e.position;
        const state = useEditorStore.getState();
        if (state.session) {
          state.updateCursor(state.session.activeFile, pos.lineNumber, pos.column);
        }
      });
    } catch (err) {
      console.error('[editor] Error during editor initialization:', err);
    }

    // FIXTEN: Store timer ref for cleanup — prevents stale triggerLint on unmount.
    // If component unmounts within 200ms, the old code would fire triggerLint
    // against a disposed editor reference. While React 18 ignores setState on
    // unmounted components, the callback still wastes CPU cycles.
    const mountLintTimer = setTimeout(() => triggerLint(), 200);
    return () => { clearTimeout(mountLintTimer); };
  }, [triggerLint, runSimulation]);

  // ── Language switching on tab change ───────────────────────
  const prevActiveFileRef = useRef<string>(session?.activeFile ?? 'main.tex');
  useEffect(() => {
    if (!session || !editorRef.current || !monacoRef.current) return;
    if (session.activeFile === prevActiveFileRef.current) return;
    prevActiveFileRef.current = session.activeFile;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;
    const newLang = safeLanguage(session.activeFile);
    monaco.editor.setModelLanguage(model, newLang);
    const storeContent = useEditorStore.getState().session?.files[session.activeFile] ?? '';
    if (model.getValue() !== storeContent) {
      model.setValue(storeContent);
    }
    monaco.editor.setModelMarkers(model, LINT_OWNER, []);
    if (session.activeFile === 'main.tex') {
      // FIXTEN: Same timer cleanup pattern as mount lint timer above.
      const switchLintTimer = setTimeout(() => triggerLint(), 100);
      return () => { clearTimeout(switchLintTimer); };
    }
  }, [session?.activeFile, session, triggerLint]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    const state = useEditorStore.getState();
    if (!state.session || value === undefined) return;
    state.updateFile(state.session.activeFile, value);
    debouncedLint();
  }, [debouncedLint]);

  useEffect(() => {
    return () => {
      if ((debouncedLint as any).cancel) (debouncedLint as any).cancel();
    };
  }, [debouncedLint]);

  // ResizeObserver: Ensure Monaco re-layouts when container dimensions change.
  // @monaco-editor/react has internal resize detection, but it can miss edge cases:
  // - iOS keyboard open/close (root switches from flow → fixed positioning)
  // - Sheet overlay open/close (parent dimensions change)
  // - Orientation change on mobile
  // - Browser resize on desktop
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    let resizeTimeout: ReturnType<typeof setTimeout>;

    const observer = new ResizeObserver(() => {
      // Debounce layout calls to avoid excessive redraws during animation
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        try { editor.layout(); } catch {}
      }, 50);
    });

    // Observe the editor's direct parent — the container with absolute inset-0 or flex-1
    const container = editor.getDomNode()?.parentElement;
    if (container) observer.observe(container);

    return () => {
      clearTimeout(resizeTimeout);
      observer.disconnect();
    };
  }, []); // Run once after editor mounts

  // GODMODE 8: Calculate effective font size for mobile.
  // On very small screens (< 375px), reduce font further for better readability.
  // FIX: Use state + resize listener instead of static window.innerWidth check,
  // so the font size adapts when the device rotates or the browser resizes.
  const [verySmallScreen, setVerySmallScreen] = useState(false);
  useEffect(() => {
    if (!isMobile) { setVerySmallScreen(false); return; }
    const check = () => setVerySmallScreen(window.innerWidth < 375);
    check();
    const mql = window.matchMedia('(max-width: 374px)');
    mql.addEventListener('change', check);
    return () => mql.removeEventListener('change', check);
  }, [isMobile]);
  const mobileFontSize = verySmallScreen ? Math.max(11, effectiveFontSize - 1) : effectiveFontSize;

  // GODMODE 13 FIX: Handle iOS Safari visualViewport for on-screen keyboard.
  // When the keyboard opens, 100dvh does NOT update on iOS Safari — the editor
  // container stays at full viewport height, pushing content behind the keyboard.
  // visualViewport.height gives the actual visible area. We store it in a ref
  // and apply it as an inline style height so the editor container properly
  // shrinks to the visible area above the keyboard.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [vvHeight, setVvHeight] = useState<number | null>(null);
  const vvHeightRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      const diff = window.innerHeight - vv.height;
      // If viewport shrunk by > 100px, keyboard is likely open
      const isOpen = diff > 100;
      setKeyboardOpen(isOpen);
      // GODMODE 13: Store the actual visible height so we can apply it
      // to the editor container. On iOS, fixed inset-0 uses the layout
      // viewport (full screen), not the visual viewport (above keyboard).
      vvHeightRef.current = vv.height;
      setVvHeight(vv.height);
    };
    // Initialize with current viewport height
    vvHeightRef.current = vv.height;
    setVvHeight(vv.height);
    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, [isMobile]);

  // All hooks must be called before any conditional returns (rules-of-hooks)
  const mainTexContent = session?.files['main.tex'] ?? '';

  const handleJumpToLine = useCallback((line: number) => {
    editorRef.current?.revealLineInCenter(line);
    editorRef.current?.setPosition({ lineNumber: line, column: 1 });
    editorRef.current?.focus();
    if (isMobile) setUI({ sidebarOpen: false });
  }, [isMobile, setUI]);

  const handleInsertSnippet = useCallback((snippet: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const position = editor.getPosition();
    editor.executeEdits('thesisforge-snippet', [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      },
      text: snippet,
      forceMoveMarkers: true,
    }]);
    editor.focus();
    if (isMobile) setUI({ sidebarOpen: false });
  }, [isMobile, setUI]);

  // FIXSEVENTEEN: Extract Monaco editor options to useMemo.
  // The inline options object was recreated on every render, causing Monaco to
  // call editor.updateOptions() on every keystroke-triggered re-render.
  // useMemo ensures stable reference — Monaco's shallow-equal check passes,
  // eliminating unnecessary option diffing. Key dependencies: isMobile,
  // mobileFontSize, ui.wordWrap, ui.minimap, ui.fontSize (all the values
  // that change the options object shape).
  const monacoOptions = useMemo(() => ({
    fontSize: mobileFontSize,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontLigatures: !isMobile,
    wordWrap: isMobile ? 'on' as const : (ui.wordWrap ? 'on' as const : 'off' as const),
    minimap: { enabled: !isMobile && ui.minimap },
    rulers: isMobile ? [] as const : [80, 120] as const,
    renderWhitespace: isMobile ? 'none' as const : 'boundary' as const,
    guides: {
      bracketPairs: true,
      bracketPairsHorizontal: true,
      indentation: true,
    },
    suggest: {
      snippetsPreventQuickSuggestions: false,
      showWords: false,
    },
    quickSuggestions: isMobile ? { other: false, comments: false, strings: false } as const : { other: true, comments: false, strings: false } as const,
    parameterHints: { enabled: !isMobile },
    suggestOnTriggerCharacters: !isMobile,
    acceptSuggestionOnEnter: isMobile ? 'off' as const : 'on' as const,
    autoIndent: isMobile ? 'full' as const : 'advanced' as const,
    padding: { top: isMobile ? 8 : 12, bottom: isMobile ? 8 : 12 },
    scrollBeyondLastLine: false,
    smoothScrolling: !isMobile,
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: isMobile ? 'off' as const : 'on' as const,
    renderLineHighlight: 'gutter' as const,
    occurrencesHighlight: 'singleFile' as const,
    selectionHighlight: true,
    codeLens: false,
    folding: true,
    foldingStrategy: 'indentation' as const,
    showFoldingControls: isMobile ? 'always' as const : 'mouseover' as const,
    colorDecorators: false,
    formatOnPaste: false,
    formatOnType: false,
    tabSize: 2,
    insertSpaces: true,
    trimAutoWhitespace: true,
    glyphMargin: !isMobile,
    overviewRulerBorder: !isMobile,
    hideCursorInOverviewRuler: isMobile,
    renderLineHighlightOnlyWhenFocus: isMobile,
    lineNumbersMinChars: isMobile ? 3 : 4,
    lineNumbers: isMobile ? 'off' as const : 'on' as const,
  }), [isMobile, mobileFontSize, ui.wordWrap, ui.minimap, ui.fontSize]);

  const sidebarContent = useMemo(() => (
    <EditorSidebar
      tex={mainTexContent}
      onJumpToLine={handleJumpToLine}
      onInsertSnippet={handleInsertSnippet}
    />
  ), [mainTexContent, handleJumpToLine, handleInsertSnippet]);

  const handleDiagJump = useCallback((line: number) => {
    editorRef.current?.revealLineInCenter(line);
    editorRef.current?.setPosition({ lineNumber: line, column: 1 });
    editorRef.current?.focus();
    if (isMobile) setUI({ diagnosticsOpen: false });
  }, [isMobile, setUI]);

  if (!session) {
    return <EditorEmptyState />;
  }

    // GODMODE 7: Removed paddingTop safe-area from root — EditorToolbar already applies
    // pt-[max(0px,env(safe-area-inset-top))] in its own className. Having both caused
    // ~44px of double safe-area padding on iPhone X+ devices.
  return (
    <>
    {/* FIXELEVEN: keyboard overlay z-30 (not z-50) to avoid Sheet portal conflicts */}
    {/* GODMODE 13: When keyboard is open on iOS, fixed inset-0 uses the layout viewport
        (full screen height), but the keyboard covers the bottom portion. We override the
        height with visualViewport.height so the editor container matches the visible area. */}
    <div
      // GODMODE 16 FIX: Removed `isMobile && !keyboardOpen && "h-dvh"`.
      // ROOT CAUSE: Parent layout (editor/layout.tsx) already constrains to h-dvh
      // with flex flex-col. The child's redundant h-dvh overrides flex-1, making
      // the child exactly 100dvh while parent content area is 100dvh minus
      // pt-[safe-area-inset-top]. The ~47px overflow is clipped by parent's
      // overflow-hidden, cutting the editor to the top half on iPhone X+.
      // flex-1 alone correctly fills remaining space without exceeding parent.
      className={cn(
        "relative flex flex-col bg-background overflow-hidden min-h-0",
        className || "flex-1",
        isMobile && keyboardOpen && "fixed left-0 right-0 top-0 z-30"
      )}
      style={isMobile && keyboardOpen && vvHeight ? { height: `${vvHeight}px` } : undefined}
    >
      <EditorToolbar onSimulate={runSimulation} onLint={triggerLint} />
      {/* GODMODE 16 FIX: Replace static 50/50 split with ResizablePanelGroup.
           Users can now drag the resizer handle between editor and preview panes.
           Mobile still uses Sheet overlays (unchanged below). */}
      {!isMobile ? (
        <ResizablePanelGroup key={`rpg-${ui.sidebarOpen}-${ui.previewOpen}`} direction="horizontal" className="flex flex-1 min-h-0 overflow-hidden">
          {ui.sidebarOpen && (
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full overflow-auto">{sidebarContent}</div>
            </ResizablePanel>
          )}
          {ui.sidebarOpen && (
            <ResizableHandle withHandle className="bg-border hover:bg-primary/30 transition-colors" />
          )}
          <ResizablePanel defaultSize={ui.previewOpen ? 50 : 100} minSize={30}>
            <div className="flex flex-col h-full min-h-0 overflow-hidden">
              <FileTabs />
              <div className={`flex-1 min-h-0 ${isMobile ? 'touch-manipulation' : ''}`}>
                <MonacoEditorWithTimeout
                  height="100%"
                  language={safeLanguage(session.activeFile)}
                  value={session.files[session.activeFile]}
                  theme={monacoTheme}
                  beforeMount={handleEditorWillMount}
                  onMount={handleEditorDidMount}
                  onChange={handleEditorChange}
                  options={monacoOptions}
                />
              </div>
              {ui.diagnosticsOpen && (
                <DiagnosticsPanel
                  diagnostics={diagnostics}
                  simulation={simulation}
                  onJumpToLine={handleDiagJump}
                  fullHeight
                />
              )}
            </div>
          </ResizablePanel>
          {ui.previewOpen && (
            <ResizableHandle withHandle className="bg-border hover:bg-primary/30 transition-colors" />
          )}
          {ui.previewOpen && (
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full flex flex-col min-h-0">
                <PDFPreviewPanel />
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <FileTabs />
          <MobileEditorNotice />
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <div className={`absolute inset-0 ${isMobile ? 'touch-manipulation' : ''}`}>
              <MonacoEditorWithTimeout
                height="100%"
                language={safeLanguage(session.activeFile)}
                value={session.files[session.activeFile]}
                theme={monacoTheme}
                beforeMount={handleEditorWillMount}
                onMount={handleEditorDidMount}
                onChange={handleEditorChange}
                options={monacoOptions}
              />
            </div>
          </div>
          <MobileLatexShortcuts onInsertSnippet={handleInsertSnippet} />
        </div>
      )}
      <EditorStatusBar />
      {isMobile && (
        <Sheet open={ui.sidebarOpen} onOpenChange={(open) => setUI({ sidebarOpen: open })}>
          <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0 overscroll-y-contain">
            <SheetHeader className="sr-only">
              <SheetTitle>Editor Sidebar</SheetTitle>
              <SheetDescription>Document outline, snippets, and files</SheetDescription>
            </SheetHeader>
            <div className="absolute inset-0 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      )}
      {isMobile && ui.diagnosticsOpen && (
        <Sheet open={ui.diagnosticsOpen} onOpenChange={(open) => setUI({ diagnosticsOpen: open })}>
          <SheetContent side="bottom" className="h-[65dvh] max-h-[65dvh] p-0 overscroll-y-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            <SheetHeader className="sr-only">
              <SheetTitle>Diagnostics</SheetTitle>
              <SheetDescription>Lint errors, warnings, and compilation results</SheetDescription>
            </SheetHeader>
            <div className="h-full flex flex-col overflow-hidden">
              <DiagnosticsPanel
                diagnostics={diagnostics}
                simulation={simulation}
                onJumpToLine={handleDiagJump}
                fullHeight
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
      {isMobile && ui.previewOpen && (
        <Sheet open={ui.previewOpen} onOpenChange={(open) => setUI({ previewOpen: open })}>
          <SheetContent side="right" className="w-[95vw] sm:max-w-[95vw] p-0 overscroll-y-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            <SheetHeader className="sr-only">
              <SheetTitle>Preview</SheetTitle>
              <SheetDescription>Document preview</SheetDescription>
            </SheetHeader>
            <div className="h-full flex flex-col overflow-hidden">
              <PDFPreviewPanel />
            </div>
          </SheetContent>
        </Sheet>
      )}
      <KeyboardShortcutsPanel />
    </div>
    </>
  );
}

// ── Mobile Editor Notice ─────────────────────────────────────
// Shows once on mobile, dismissed via localStorage. Non-blocking info banner.
function MobileEditorNotice() {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    try {
      const dismissed = localStorage.getItem('tf-mobile-editor-notice-dismissed');
      if (dismissed === 'true') return;
    } catch {}
    // Small delay so editor renders first
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [isMobile]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem('tf-mobile-editor-notice-dismissed', 'true'); } catch {}
  }, []);

  if (!visible) return null;

  return (
    <div className="mx-2 mt-1 mb-0 px-3 py-2 bg-primary/5 border border-primary/15 rounded-lg flex items-start gap-2 text-xs text-muted-foreground animate-[tf-mobile-fade_0.3s_ease-out]">
      <span className="mt-0.5 flex-shrink-0 text-primary text-sm">ℹ</span>
      <p className="flex-1 leading-relaxed">
        For the best editing experience, try ThesisForge on desktop. The mobile editor supports viewing and basic edits.
      </p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss notice"
      >
        ✕
      </button>
    </div>
  );
}

// ── Mobile LaTeX Shortcuts Bar ───────────────────────────────
// Sticky bar with most-used LaTeX shortcuts for mobile editing.
function MobileLatexShortcuts({ onInsertSnippet }: { onInsertSnippet: (snippet: string) => void }) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  const shortcuts = [
    { label: '\\textbf{}', snippet: '\\textbf{}', offset: -1 },
    { label: '\\textit{}', snippet: '\\textit{}', offset: -1 },
    { label: '\\cite{}', snippet: '\\cite{}', offset: -1 },
    { label: '\\ref{}', snippet: '\\ref{}', offset: -1 },
    { label: '\\begin{}', snippet: '\\begin{}\n\t\n\\end{}', offset: -9 },
    { label: 'More', snippet: '' },
  ];

  return (
    <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-1 py-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
      {shortcuts.map((s, i) => (
        <button
          key={i}
          onClick={() => {
            if (s.snippet) onInsertSnippet(s.snippet);
          }}
          className="min-h-[36px] px-2.5 py-1 text-[11px] font-mono whitespace-nowrap rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all flex-shrink-0"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function EditorEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-1">No file open</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Open a file from the sidebar, or load your thesis from the wizard using the toolbar above.
        </p>
      </div>
    </div>
  );
}


class LatexEditorErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('[LatexEditor] render error:', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0F1117] p-8">
          <div className="text-center max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-2">Editor crashed</h2>
            <p className="text-sm text-muted-foreground mb-4">An unexpected error occurred. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap the real LatexEditor
export function LatexEditor(props: LatexEditorProps) {
  return (
    <LatexEditorErrorBoundary>
      <LatexEditorInner {...props} />
    </LatexEditorErrorBoundary>
  );
}
