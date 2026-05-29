// ============================================================
// ThesisForge — Editor Toolbar
// Top toolbar: compile, export, lint, settings, navigation
// FIX: Proper error toasts, snapshot save integration.
// ============================================================

'use client';

import { useRouter } from 'next/navigation';
import { useEditorStore } from '../../../lib/editor-store';
import { useIsMobile } from '../../../hooks/use-mobile';
import { exportEditorZip } from '../../../core/editor-bridge';
import { createSnapshot } from '../../../core/persistence';
import { notify } from '../../../lib/toasts';
import {
  Play, Download, RefreshCw, ArrowLeft, Settings2,
  PanelLeftOpen, PanelBottomOpen, Wand2, Save, Eye,
  Keyboard, MoreHorizontal, X,
} from 'lucide-react';
import { Button } from '../../ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '../../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { Separator } from '../../ui/separator';
import { Badge } from '../../ui/badge';
import { Slider } from '../../ui/slider';
import { toast } from 'sonner';
import { useRef } from 'react';

interface Props {
  onSimulate: () => void;
  onLint:     () => void;
}

export function EditorToolbar({ onSimulate, onLint }: Props) {
  const router      = useRouter();
  const isMobile    = useIsMobile();
  const session     = useEditorStore(s => s.session);
  const ui          = useEditorStore(s => s.ui);
  const simulation  = useEditorStore(s => s.simulation);
  const diagnostics = useEditorStore(s => s.diagnostics);
  const setUI       = useEditorStore(s => s.setUI);
  const toggleSidebar     = useEditorStore(s => s.toggleSidebar);
  const toggleDiagnostics = useEditorStore(s => s.toggleDiagnostics);
  const togglePreview     = useEditorStore(s => s.togglePreview);

  const errorCount   = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  // GODMODE 13: Export double-fire guard — prevents duplicate ZIP generation
  // when user double-clicks Export on slow connections.
  const exportingRef = useRef(false);

  const handleExport = async () => {
    if (!session) return;
    if (exportingRef.current) return;
    exportingRef.current = true;
    try {
      const title = (session.files['main.tex']
        .match(/\\title\{([^}]+)\}/)?.[1]
        || session.files['readme.md']
          .match(/^# (.+)$/m)?.[1]
        || 'thesis'
      ).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

      await exportEditorZip(
        session.files['main.tex'],
        session.files['references.bib'],
        session.files['readme.md'],
        `${title}.zip`
      );
      notify.exported(`${title}.zip`);
    } catch (e: any) {
      console.error('[toolbar] Export failed:', e);
      toast.error('Export failed', {
        description: e?.message || 'Failed to create ZIP file',
        duration: 5000,
      });
    } finally {
      exportingRef.current = false;
    }
  };

  const handleSaveSnapshot = async () => {
    if (!session) return;
    try {
      // Save snapshot via persistence layer (not raw localStorage)
      const texContent = session.files['main.tex'];
      // Build a minimal ThesisData for the snapshot from the editor files
      // Since the editor works with raw files, we save the tex content as a snapshot label
      const title = texContent.match(/\\title\{([^}]+)\}/)?.[1] || 'Untitled';
      await createSnapshot(
        {
          type: 'bachelor',
          metadata: {
            title, subtitle: '', author: '', authorId: '',
            university: '', universityLogo: '', faculty: '', department: '',
            supervisor: '', supervisorTitle: 'Prof.', coSupervisor: '',
            coSupervisorTitle: 'Dr.', submissionDate: new Date().toISOString().split('T')[0],
            graduationDate: '', location: '', dedication: '', acknowledgment: '',
            orcid: '', reportNumber: '',
          },
          abstract: '',
          keywords: [],
          chapters: [{ id: 'ch-1', number: 1, title: 'Editor Content', content: texContent, subSections: [] }],
          references: [],
          appendices: [],
          customCommands: [],
          options: { fontSize: '12pt', paperSize: 'a4paper', lineSpacing: 'onehalf', marginSize: 'normal', includeDedication: false, includeAcknowledgment: true, includeAppendices: false, includeListings: false, includeGlossary: false, citationStyle: 'apa', figureNumbering: 'continuous', tableNumbering: 'continuous', tocDepth: 3 },
        },
        `Editor snapshot: ${title}`,
        'editor'
      );
      notify.saved();
    } catch (e: any) {
      toast.error('Snapshot failed', {
        description: e?.message || 'Failed to save snapshot',
      });
    }
  };

  return (
    <TooltipProvider delayDuration={isMobile ? Number.POSITIVE_INFINITY : 300}>
      {/* FIX: min-h-12 instead of h-12 — safe-area-inset-top padding (up to 47px on iPhone X+)
           must not be constrained by a fixed 48px height. min-h-12 allows the toolbar to
           grow to h-12 + safe-area-inset-top, ensuring toolbar content is never crushed
           to ~1px on notched devices. flex-shrink-0 prevents flex from collapsing it. */}
      <div className="min-h-12 h-auto flex items-center gap-1 px-2 sm:px-3 border-b bg-background/95 backdrop-blur-sm flex-shrink-0 overflow-x-auto scrollbar-none pt-[max(0px,env(safe-area-inset-top,0px))]">
        {/* Back to wizard */}
        {/* GODMODE 6: min-h-[44px] ensures touch target on mobile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-11 min-w-[44px] gap-1.5 text-xs flex-shrink-0"
              onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Wizard</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to wizard</TooltipContent>
        </Tooltip>

        {/* Logo — hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-1.5 px-1 sm:px-2 flex-shrink-0">
          <span className="text-xs font-semibold tracking-tight">
            Thesis<span className="text-primary">Forge</span>
          </span>
          <Badge variant="secondary" className="text-[10px] px-1 h-4 hidden sm:inline-flex">Editor</Badge>
        </div>

        <Separator orientation="vertical" className="h-5 mx-0.5 sm:mx-1 flex-shrink-0" />

        {/* ── Mobile: compact actions dropdown ── */}
        {isMobile ? (
          <>
            {/* Compile — always visible on mobile */}
            {/* GODMODE 6: h-11 w-11 (44px) meets WCAG minimum touch target size */}
            <Button
              variant="default"
              size="icon"
              className="h-11 w-11 flex-shrink-0"
              onClick={onSimulate}
              disabled={simulation.running}
            >
              {simulation.running
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Play className="w-4 h-4" />
              }
            </Button>

            {/* Sidebar toggle — always visible on mobile for easy access */}
            <Button
              variant={ui.sidebarOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
              onClick={toggleSidebar}
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>

            {/* Diagnostics quick badge (error count) */}
            {errorCount > 0 && (
              <Badge variant="destructive" role="button" tabIndex={0} className="text-[10px] px-1.5 min-h-[44px] min-w-[44px] rounded-sm flex-shrink-0 cursor-pointer"
                onClick={toggleDiagnostics}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDiagnostics(); } }}>
                {errorCount}
              </Badge>
            )}
            {warningCount > 0 && errorCount === 0 && (
              <Badge role="button" tabIndex={0} className="text-[10px] px-1.5 min-h-[44px] min-w-[44px] rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex-shrink-0 cursor-pointer"
                onClick={toggleDiagnostics}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDiagnostics(); } }}>
                {warningCount}
              </Badge>
            )}

            <div className="flex-1" />

            {/* More menu — mobile overflow */}
            {/* GODMODE 6: h-11 w-11 (44px) touch target */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 flex-shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Editor Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLint} className="gap-2">
                  <Wand2 className="w-3.5 h-3.5" /> Lint
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} className="gap-2">
                  <Download className="w-3.5 h-3.5" /> Export ZIP
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSaveSnapshot} disabled={!session} className="gap-2">
                  <Save className="w-3.5 h-3.5" /> Save Snapshot
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Panels</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={ui.sidebarOpen}
                  onCheckedChange={() => toggleSidebar()}
                  className="gap-2"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5" /> Sidebar
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={ui.diagnosticsOpen}
                  onCheckedChange={() => toggleDiagnostics()}
                  className="gap-2"
                >
                  <PanelBottomOpen className="w-3.5 h-3.5" /> Diagnostics
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={ui.previewOpen}
                  onCheckedChange={() => togglePreview()}
                  className="gap-2"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setUI({ shortcutsOpen: true })} className="gap-2">
                  <Keyboard className="w-3.5 h-3.5" /> Keyboard Shortcuts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Settings</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={ui.wordWrap}
                  onCheckedChange={v => setUI({ wordWrap: v })}
                >
                  Word wrap
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={ui.compileOnSave}
                  onCheckedChange={v => setUI({ compileOnSave: v })}
                >
                  Compile on save
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-muted-foreground">Font Size</span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">{ui.fontSize}pt</span>
                  </div>
                  <Slider
                    value={[ui.fontSize]}
                    onValueChange={(v) => setUI({ fontSize: v[0] })}
                    min={12}
                    max={20}
                    step={1}
                    className="w-full px-1"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            {/* ── Desktop: full toolbar ── */}
            {/* Compile */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 gap-1.5 text-xs flex-shrink-0"
                  onClick={onSimulate}
                  disabled={simulation.running}
                >
                  {simulation.running
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Play className="w-3.5 h-3.5" />
                  }
                  <span className="hidden md:inline">
                    {simulation.running ? 'Compiling...' : 'Compile'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Run compilation simulation (Ctrl+Enter)
              </TooltipContent>
            </Tooltip>

            {/* Lint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs flex-shrink-0"
                  onClick={onLint}>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Lint</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Run lint checks (Ctrl+S)</TooltipContent>
            </Tooltip>

            {/* Export */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs flex-shrink-0"
                  onClick={handleExport}>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Export ZIP</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download .tex + .bib as ZIP</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5 mx-1 flex-shrink-0" />

            {/* Sidebar toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={ui.sidebarOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={toggleSidebar}
                >
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle sidebar (Ctrl+B)</TooltipContent>
            </Tooltip>

            {/* Diagnostics toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={ui.diagnosticsOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={toggleDiagnostics}
                >
                  <PanelBottomOpen className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle diagnostics panel</TooltipContent>
            </Tooltip>

            {/* Preview toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={ui.previewOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={togglePreview}
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle preview panel (Ctrl+P)</TooltipContent>
            </Tooltip>

            {/* Keyboard shortcuts */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => setUI({ shortcutsOpen: true })}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
            </Tooltip>

            {/* Diagnostics badge */}
            {(errorCount > 0 || warningCount > 0) && (
              <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 h-4 rounded-sm">
                    {errorCount} error{errorCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="text-[10px] px-1.5 h-4 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    {warningCount} warning{warningCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex-1" />

            {/* Save snapshot */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={handleSaveSnapshot}
                  disabled={!session}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save snapshot to browser</TooltipContent>
            </Tooltip>

            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuCheckboxItem
                  checked={ui.wordWrap}
                  onCheckedChange={v => setUI({ wordWrap: v })}
                >
                  Word wrap
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={ui.minimap}
                  onCheckedChange={v => setUI({ minimap: v })}
                >
                  Minimap
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={ui.compileOnSave}
                  onCheckedChange={v => setUI({ compileOnSave: v })}
                >
                  Compile on save
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-muted-foreground">Font Size</span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">{ui.fontSize}pt</span>
                  </div>
                  <Slider
                    value={[ui.fontSize]}
                    onValueChange={(v) => setUI({ fontSize: v[0] })}
                    min={12}
                    max={20}
                    step={1}
                    className="w-full px-1"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
