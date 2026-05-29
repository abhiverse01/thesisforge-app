// ============================================================
// ThesisForge — Editor Status Bar
// Bottom status bar showing cursor position, language, pages,
// word count, compile status, encoding, and line endings.
// ENHANCED: Compile status indicator, encoding display,
//          smarter word count, LaTeX-aware character stats.
// FIX: Mobile-responsive — essential info only on small screens.
// ============================================================

'use client';

import { useMemo, useState } from 'react';
import { useEditorStore } from '../../../lib/editor-store';
import { useIsMobile } from '../../../hooks/use-mobile';
import { cn } from '../../../lib/utils';

const FILE_LANGUAGE: Record<string, string> = {
  'main.tex':       'LaTeX',
  'references.bib': 'BibTeX',
  'readme.md':      'Markdown',
};

const FILE_ENCODING: Record<string, string> = {
  'main.tex':       'UTF-8',
  'references.bib': 'UTF-8',
  'readme.md':      'UTF-8',
};

export function EditorStatusBar() {
  const session     = useEditorStore(s => s.session);
  const ui          = useEditorStore(s => s.ui);
  const simulation  = useEditorStore(s => s.simulation);
  const diagnostics = useEditorStore(s => s.diagnostics);
  const isMobile    = useIsMobile();
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'compact' | 'detailed'>('compact');
  const errorCount  = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  // Derived values (safe defaults when session is null — must be before early return)
  const activeFile = session?.activeFile ?? 'main.tex';
  const cursor    = session?.cursors[activeFile];
  const language  = FILE_LANGUAGE[activeFile] ?? 'Text';
  const encoding  = FILE_ENCODING[activeFile] ?? 'UTF-8';
  const isDirty   = session ? session.dirty[activeFile] : false;
  const content   = session?.files[activeFile] ?? '';
  const charCount = content.length;
  const lineCount = content.split('\n').length;

  // Smart word count: strip LaTeX commands, comments, and special chars
  const wordCount = useMemo(() => {
    const stripped = content
      .replace(/%[^\n]*/g, '')                                        // remove comments
      .replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])*(\{[^{}]*\})*/g, '')     // remove \command{arg}[opt]
      .replace(/[\\{}[\]$&_^~]/g, ' ')                               // clean remaining special chars
      .replace(/\\\\/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped ? stripped.split(/\s+/).filter(Boolean).length : 0;
  }, [content]);

  // Selection-aware stats (when cursor data has selection info)
  const cursorDisplay = useMemo(() => {
    if (!cursor) return null;
    return `Ln ${cursor.line}, Col ${cursor.column}`;
  }, [cursor]);

  // Compile status indicator
  const compileStatus = useMemo(() => {
    if (simulation.running) {
      return { icon: '⟳', label: 'Compiling...', color: 'text-blue-400' };
    }
    if (simulation.lastRun === null) {
      return null;
    }
    if (errorCount > 0) {
      return { icon: '✕', label: `${errorCount} error${errorCount > 1 ? 's' : ''}`, color: 'text-red-400' };
    }
    if (warningCount > 0) {
      return { icon: '⚠', label: `${warningCount} warning${warningCount > 1 ? 's' : ''}`, color: 'text-amber-400' };
    }
    return { icon: '✓', label: 'Passed', color: 'text-emerald-400' };
  }, [simulation, errorCount, warningCount]);

  // Time since last compile
  const lastCompileTime = useMemo(() => {
    if (!simulation.lastRun) return null;
    const diff = Date.now() - simulation.lastRun;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }, [simulation.lastRun]);

  if (!session) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 border-t bg-primary text-primary-foreground text-[10px] flex-shrink-0 select-none overflow-hidden",
        isMobile ? "min-h-[max(44px,calc(1.5rem+env(safe-area-inset-bottom,0px)))] pb-[env(safe-area-inset-bottom,0px)]" : "h-6"
      )}
      onClick={isMobile ? () => setMobileDisplayMode(m => m === 'compact' ? 'detailed' : 'compact') : undefined}
      role={isMobile ? 'button' : undefined}
      tabIndex={isMobile ? 0 : undefined}
      // GODMODE 13: Add keyboard activation for mobile toggle (a11y).
      // role="button" + tabIndex={0} without onKeyDown is an a11y violation.
      onKeyDown={isMobile ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setMobileDisplayMode(m => m === 'compact' ? 'detailed' : 'compact');
        }
      } : undefined}
    >
      {/* Compile status — always visible */}
      {compileStatus && (
        <span className={`flex items-center gap-1 flex-shrink-0 ${compileStatus.color}`}>
          <span>{compileStatus.icon}</span>
          {!isMobile && <span className="font-medium">{compileStatus.label}</span>}
        </span>
      )}

      {/* Estimated pages — hidden on mobile */}
      {!isMobile && simulation.estimatedPages > 0 && (
        <span className="opacity-70 flex-shrink-0">~{simulation.estimatedPages} pages</span>
      )}

      <div className="flex-1" />

      {/* Dirty indicator — always visible */}
      {isDirty && (
        <span className="opacity-60 font-medium flex-shrink-0" title="Unsaved changes">●</span>
      )}

      {/* Cursor position — always visible */}
      {cursorDisplay && (
        <span className="font-mono tabular-nums opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0">
          {cursorDisplay}
        </span>
      )}

      {/* Desktop-only stats */}
      {!isMobile ? (
        <>
          <span className="opacity-30 flex-shrink-0">|</span>
          <span className="tabular-nums opacity-60 font-mono hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0" title="Word count (LaTeX commands excluded)">
            {wordCount.toLocaleString()} words
          </span>
          <span className="tabular-nums opacity-45 font-mono flex-shrink-0" title="Line count">
            {lineCount} lines
          </span>
          <span className="tabular-nums opacity-40 font-mono flex-shrink-0" title="Character count">
            {charCount.toLocaleString()} chars
          </span>
          <span className="opacity-30 flex-shrink-0">|</span>
          <span className="opacity-40 flex-shrink-0">{encoding}</span>
          <span className="opacity-40 flex-shrink-0">{ui.fontSize}pt</span>
        </>
      ) : (
        /* Mobile: compact or detailed mode, tap to toggle */
        <>
          {mobileDisplayMode === 'detailed' && (
            <>
              <span className="opacity-30 flex-shrink-0">|</span>
              <span className="tabular-nums opacity-60 font-mono flex-shrink-0">
                {wordCount.toLocaleString()}w
              </span>
              <span className="tabular-nums opacity-50 font-mono flex-shrink-0">
                {lineCount}ln
              </span>
              <span className="tabular-nums opacity-40 font-mono flex-shrink-0">
                {charCount.toLocaleString()}ch
              </span>
            </>
          )}
          {/* Subtle tap indicator */}
          <span className="opacity-25 flex-shrink-0 text-[8px]" title="Tap to toggle stats">⋯</span>
        </>
      )}

      {/* Language — always visible (rightmost) */}
      <span className="font-medium opacity-80 flex-shrink-0">{language}</span>
    </div>
  );
}
