// ============================================================
// ThesisForge — File Tabs Component
// Shows main.tex / references.bib / README.md tabs above editor
// FIX: Mobile touch-friendly targets, hide scrollbar, min-width.
// ============================================================

'use client';

import { useEditorStore } from '../../../lib/editor-store';
import { useIsMobile } from '../../../hooks/use-mobile';
import { cn } from '../../../lib/utils';
import type { EditorFile } from '../../../lib/editor-store';

const TAB_LABELS: Record<EditorFile, { label: string; icon: string }> = {
  'main.tex':       { label: 'main.tex',        icon: 'tex'  },
  'references.bib': { label: 'references.bib',  icon: 'bib'  },
  'readme.md':      { label: 'README.md',        icon: 'md'   },
};

const ICON_COLOR: Record<string, string> = {
  tex:  'text-green-500',
  bib:  'text-blue-500',
  md:   'text-purple-400',
};

export function FileTabs() {
  const session   = useEditorStore(s => s.session);
  const setActive = useEditorStore(s => s.setActiveFile);
  const isMobile  = useIsMobile();

  if (!session) return null;

  return (
    <div className="flex items-end h-11 sm:h-9 border-b bg-muted/20 flex-shrink-0 overflow-x-auto scrollbar-none">
      {(Object.entries(TAB_LABELS) as Array<[EditorFile, { label: string; icon: string }]>)
        .map(([file, { label, icon }]) => {
          const active = session.activeFile === file;
          const dirty  = session.dirty[file];

          return (
            <button
              key={file}
              onClick={() => setActive(file)}
              className={cn(
                "flex items-center gap-1.5 h-full text-[11px] font-mono",
                "border-r border-transparent transition-colors relative flex-shrink-0",
                isMobile ? "px-4 min-w-[68px]" : "px-3",
                active
                  ? "bg-background text-foreground border-r-border"
                  : "text-muted-foreground hover:text-foreground active:text-foreground hover:bg-background/50 active:bg-background/70"
              )}
            >
              {active && (
                <span className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
              )}
              <span className={cn("text-[9px] font-bold", ICON_COLOR[icon])}>
                {icon.toUpperCase()}
              </span>
              <span className={isMobile ? 'hidden' : ''}>{label}</span>
              {dirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              )}
            </button>
          );
        })}
    </div>
  );
}
