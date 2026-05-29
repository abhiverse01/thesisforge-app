// ============================================================
// ThesisForge — Diagnostics Panel
// Bottom panel showing lint errors, warnings, and simulation results.
// FIX: Removed duplicate simulation error rendering — diagnostics
// are now merged upstream in LatexEditor.tsx.
// FIX: Mobile-responsive height and touch-friendly interaction.
// ============================================================

'use client';

import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '../../../hooks/use-mobile';
import type { Diagnostic, SimulationState } from '../../../lib/editor-store';
import { ScrollArea } from '../../ui/scroll-area';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';

interface Props {
  diagnostics:  Diagnostic[];
  simulation:   SimulationState;
  onJumpToLine: (line: number) => void;
  /** When true (rendered inside Sheet), expanded state uses flex-1 instead of fixed height */
  fullHeight?: boolean;
}

const SEV_ICON = {
  error:   <AlertCircle   className="w-3.5 h-3.5 text-destructive flex-shrink-0" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
  info:    <Info          className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />,
};

export function DiagnosticsPanel({ diagnostics, simulation, onJumpToLine, fullHeight }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const isMobile = useIsMobile();

  const errors   = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');
  const infos    = diagnostics.filter(d => d.severity === 'info');

  const filteredDiagnostics = filter === 'all'
    ? diagnostics
    : diagnostics.filter(d => d.severity === filter);

  // Mobile: smaller expanded height, desktop: larger
  // When fullHeight (Sheet context), use flex-1 to fill container
  const expandedHeight = fullHeight
    ? 'flex-1 min-h-0'
    : (isMobile ? 'h-40 sm:h-48' : 'h-48');

  return (
    <div className={cn(
      "border-t bg-background/95 flex-shrink-0 transition-all duration-200",
      collapsed ? (isMobile ? "min-h-[44px]" : "h-8") : expandedHeight
    )}>
      {/* Panel header */}
      <div
        className="min-h-[44px] sm:min-h-0 sm:h-8 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 border-b cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="text-xs font-medium">Diagnostics</span>

        {/* Count badges */}
        {diagnostics.length > 0 && (
          <div className="flex items-center gap-1">
            {errors.length > 0 && (
              <Badge
                variant="destructive"
                className={cn("text-[10px] px-1.5 min-h-[44px] sm:min-h-0 sm:h-5 rounded-sm cursor-pointer flex items-center justify-center", filter === 'error' && 'ring-1 ring-destructive ring-offset-1')}
                onClick={(e) => { e.stopPropagation(); setFilter(filter === 'error' ? 'all' : 'error'); }}
              >
                {errors.length}
              </Badge>
            )}
            {warnings.length > 0 && (
              <Badge
                className={cn("text-[10px] px-1.5 min-h-[44px] sm:min-h-0 sm:h-5 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 cursor-pointer flex items-center justify-center", filter === 'warning' && 'ring-1 ring-amber-500 ring-offset-1')}
                onClick={(e) => { e.stopPropagation(); setFilter(filter === 'warning' ? 'all' : 'warning'); }}
              >
                {warnings.length}
              </Badge>
            )}
            {infos.length > 0 && (
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 min-h-[44px] sm:min-h-0 sm:h-5 rounded-sm cursor-pointer flex items-center justify-center", filter === 'info' && 'ring-1 ring-primary ring-offset-1')}
                onClick={(e) => { e.stopPropagation(); setFilter(filter === 'info' ? 'all' : 'info'); }}
              >
                {infos.length}
              </Badge>
            )}
          </div>
        )}

        {diagnostics.length === 0 && !simulation.running && simulation.lastRun && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            All checks passed
          </span>
        )}

        {diagnostics.length === 0 && !simulation.running && !simulation.lastRun && (
          <span className="text-[10px] text-muted-foreground">No issues</span>
        )}

        {simulation.running && (
          <span className="text-[10px] text-muted-foreground animate-pulse">Running simulation...</span>
        )}

        {/* Source counts */}
        {diagnostics.length > 0 && (
          <div className="flex items-center gap-1 ml-1 text-[10px] text-muted-foreground">
            {diagnostics.filter(d => d.source === 'lint').length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-muted/50 min-h-[20px] flex items-center">Lint</span>
            )}
            {diagnostics.filter(d => d.source === 'simulator').length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-muted/50 min-h-[20px] flex items-center">Sim</span>
            )}
            {diagnostics.filter(d => d.source === 'expert').length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium min-h-[20px] flex items-center">Expert</span>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 text-muted-foreground">
          {filter !== 'all' && (
            <button
              onClick={(e) => { e.stopPropagation(); setFilter('all'); }}
              className="text-[9px] hover:text-foreground transition-colors px-1 min-h-[44px] sm:min-h-0 flex items-center"
            >
              Clear filter
            </button>
          )}
          {collapsed
            ? <ChevronUp   className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />
          }
        </div>
      </div>

      {/* Panel body */}
      {!collapsed && (
        <ScrollArea className="h-[calc(100%-44px)] sm:h-[calc(100%-2rem)]">
          {filteredDiagnostics.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
              {filter !== 'all'
                ? `No ${filter} issues found`
                : simulation.lastRun
                  ? 'Compilation simulation passed'
                  : 'Run Lint or Compile to see diagnostics'
              }
            </div>
          ) : (
            <div className="p-1 space-y-px">
              {filteredDiagnostics.map(d => {
                const isExpert = d.source === 'expert';
                return (
                  <button
                    key={d.id}
                    onClick={() => d.line && onJumpToLine(d.line)}
                    className={cn(
                      "w-full text-left flex items-start gap-2 px-2 sm:px-3 py-1.5 sm:py-1 rounded text-xs transition-colors min-h-[44px] sm:min-h-0",
                      "hover:bg-muted/40 active:bg-muted/60",
                      !d.line && "cursor-default",
                      isExpert && "bg-primary/[0.03] hover:bg-primary/[0.06]",
                    )}
                  >
                    {SEV_ICON[d.severity]}
                    <span className="flex-1 leading-relaxed truncate">{d.message}</span>
                    {d.line && (
                      <span className="text-muted-foreground text-[10px] flex-shrink-0 font-mono">
                        L{d.line}
                      </span>
                    )}
                    {d.rule && (
                      <span className="text-muted-foreground/50 text-[10px] flex-shrink-0 font-mono max-w-[80px] truncate"
                        title={d.rule}>
                        [{d.rule}]
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
