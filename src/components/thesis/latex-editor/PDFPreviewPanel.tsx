// ============================================================
// ThesisForge — PDF Preview Panel
// Renders a live preview of thesis data (wizard mode) or
// a structural outline of .tex content (tex mode).
// ============================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { useThesisStore } from '@/lib/thesis-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { renderThesisToHTML, renderTexOutline } from '@/core/preview-renderer';
import { Button } from '@/components/ui/button';
import { RefreshCw, Maximize2, FileText } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type PreviewMode = 'wizard' | 'tex';

export function PDFPreviewPanel() {
  const [mode, setMode] = useState<PreviewMode>('wizard');
  const [previewHTML, setPreviewHTML] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // GODMODE 13: Use reactive hook instead of window.innerWidth at render time.
  // The old code read window.innerWidth directly during render — not reactive to
  // resize, and causes hydration mismatch if SSR/CSR disagree.
  const isMobile = useIsMobile();

  // Get thesis data from thesis store (for wizard mode)
  const thesis = useThesisStore(s => s.thesis);

  // Get editor session (for tex mode)
  const session = useEditorStore(s => s.session);

  // ── Build preview HTML from thesis store data ──────────────
  const wizardHTML = useMemo(() => {
    if (!thesis) {
      return `<!DOCTYPE html>
<html><head><style>
  body { display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,sans-serif;background:#f9fafb;color:#9ca3af; }
</style></head><body>
  <div style="text-align:center;">
    <div style="font-size:2rem;margin-bottom:12px;opacity:0.4;">📄</div>
    <div style="font-size:0.9rem;">No thesis data available</div>
    <div style="font-size:0.75rem;margin-top:4px;opacity:0.6;">Create a thesis in the wizard to preview it</div>
  </div>
</body></html>`;
    }
    return renderThesisToHTML(thesis, {
      fontSize: thesis.options.fontSize === '10pt' ? '10pt'
        : thesis.options.fontSize === '11pt' ? '11pt'
        : '12pt',
      lineSpacing: thesis.options.lineSpacing,
      paperSize: thesis.options.paperSize === 'a4paper' ? 'a4' : 'letter',
    });
  }, [thesis]);

  // ── Build tex outline HTML ─────────────────────────────────
  const texHTML = useMemo(() => {
    if (!session) {
      return `<!DOCTYPE html>
<html><head><style>
  body { display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,sans-serif;background:#f9fafb;color:#9ca3af; }
</style></head><body>
  <div style="text-align:center;">
    <div style="font-size:2rem;margin-bottom:12px;opacity:0.4;">📄</div>
    <div style="font-size:0.9rem;">No editor session</div>
  </div>
</body></html>`;
    }
    const tex = session.files['main.tex'];
    return `<!DOCTYPE html>
<html><head>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: #f9fafb; }
  body { font-family: system-ui, -apple-system, sans-serif; }
</style>
</head><body>
${renderTexOutline(tex)}
</body></html>`;
  }, [session]);

  // ── Debounced preview update ───────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const update = () => {
      setPreviewHTML(mode === 'wizard' ? wizardHTML : texHTML);
    };

    // Debounce by 1.2s
    timer = setTimeout(update, 1200);

    // Immediate first render
    update();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mode, wizardHTML, texHTML]);

  // ── Write to iframe srcdoc ─────────────────────────────────
  useEffect(() => {
    if (iframeRef.current && previewHTML) {
      iframeRef.current.srcdoc = previewHTML;
    }
  }, [previewHTML]);

  // ── Refresh handler ────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = '';
      // Force re-render
      requestAnimationFrame(() => {
        if (iframeRef.current && previewHTML) {
          iframeRef.current.srcdoc = previewHTML;
        }
      });
    }
  }, [previewHTML]);

  // ── Open in new tab ────────────────────────────────────────
  const handleOpenNewTab = useCallback(() => {
    if (!previewHTML) return;
    const blob = new Blob([previewHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [previewHTML]);

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] dark:bg-[#1a1a1a]">
      {/* ── Preview toolbar ── */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
        <TooltipProvider delayDuration={isMobile ? 0 : 300}>
          {/* Mode toggle */}
          <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`min-h-[44px] px-3 text-xs rounded-sm transition-colors sm:min-h-0 sm:px-2 sm:py-0.5 ${
                    mode === 'wizard'
                      ? 'bg-background shadow-sm text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMode('wizard')}
                >
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span className="hidden lg:inline">Preview</span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="hidden sm:block">Full rendered preview from wizard data</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`min-h-[44px] px-3 text-xs rounded-sm transition-colors sm:min-h-0 sm:px-2 sm:py-0.5 ${
                    mode === 'tex'
                      ? 'bg-background shadow-sm text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMode('tex')}
                >
                  <span className="flex items-center gap-1">
                    {/* GODMODE 16 FIX: Replaced raw {'{ }'} text with stacked braces
                       icon. Previous version used font-mono text inside w-3 h-3 (12px)
                       container — text overflowed causing '}' to hang outside the button.
                       FIXSEVENTEEN: GODMODE 16 used text-[9px] in w-3.5 h-3.5 (14px) container.
                       Two lines at 9px = 18px total, overflowing the 14px container by 4px.
                       Fixed: text-[7px] in w-4 h-4 (16px) container. Two lines at 7px = 14px
                       total, fitting exactly. Slight padding from leading-none gives clean fit. */}
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 3L2 8l3 5" />
                    <path d="M11 3l3 5-3 5" />
                  </svg>
                    <span className="hidden lg:inline">Outline</span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="hidden sm:block">Document structure outline from .tex content</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1" />

          {/* Refresh */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-6 sm:w-6"
                onClick={handleRefresh}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="hidden sm:block">Refresh preview</TooltipContent>
          </Tooltip>

          {/* Open in new tab */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-6 sm:w-6"
                onClick={handleOpenNewTab}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="hidden sm:block">Open in new tab</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* ── Preview iframe ── */}
      {/* FIX: Added min-h-[300px] to prevent iframe collapsing to 0px
           inside Sheet overlay on mobile where parent flex-1 may not
           resolve to a definite height. */}
      <div className="flex-1 overflow-auto min-h-[300px]">
        <iframe
          ref={iframeRef}
          sandbox="allow-same-origin"
          className="w-full h-full min-h-[300px] border-0"
          title="Thesis Preview"
          style={{
            background: mode === 'wizard' ? '#e5e7eb' : '#f9fafb',
          }}
        />
      </div>
    </div>
  );
}
