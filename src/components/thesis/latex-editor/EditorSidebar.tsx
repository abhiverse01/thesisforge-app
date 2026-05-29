// ============================================================
// ThesisForge — Editor Sidebar
// Outline parser + Snippet library + File list tabs
// ENHANCED: More snippet categories, BibTeX button, file type icons
// FIX: Mobile touch-friendly targets, better spacing in overlay mode.
// ============================================================

'use client';

import { useMemo } from 'react';
import { useEditorStore } from '../../../lib/editor-store';
import { useIsMobile } from '../../../hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ScrollArea } from '../../ui/scroll-area';

interface OutlineItem {
  label:  string;
  level:  'chapter' | 'section' | 'subsection' | 'subsubsection';
  line:   number;
  indent: number;
}

function parseOutline(tex: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const lines = tex.split('\n');
  const PATTERNS: Array<[RegExp, OutlineItem['level'], number]> = [
    [/^\\chapter\*?\{([^}]+)\}/,       'chapter',       0],
    [/^\\section\*?\{([^}]+)\}/,        'section',       1],
    [/^\\subsection\*?\{([^}]+)\}/,     'subsection',    2],
    [/^\\subsubsection\*?\{([^}]+)\}/,  'subsubsection', 3],
  ];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    for (const [re, level, indent] of PATTERNS) {
      const m = trimmed.match(re);
      if (m) {
        items.push({ label: m[1], level, line: i + 1, indent });
        break;
      }
    }
  });

  return items;
}

const SNIPPET_CATEGORIES = [
  {
    label: 'Structure',
    snippets: [
      { label: '\\chapter{}',        insert: '\\chapter{$1}\n\\label{ch:${2:label}}\n$0' },
      { label: '\\section{}',         insert: '\\section{$1}\n\\label{sec:${2:label}}\n$0' },
      { label: '\\subsection{}',      insert: '\\subsection{$1}\n\\label{subsec:${2:label}}\n$0' },
      { label: '\\subsubsection{}',   insert: '\\subsubsection{$1}\n$0' },
      { label: '\\paragraph{}',       insert: '\\paragraph{$1}\n$0' },
      { label: 'abstract env',        insert: '\\begin{abstract}\n  $1\n\\end{abstract}' },
      { label: 'appendix cmd',        insert: '\\appendix' },
      { label: 'titlepage',           insert: '\\begin{titlepage}\n  \\centering\n  $1\n\\end{titlepage}' },
      { label: 'tableofcontents',     insert: '\\tableofcontents' },
    ],
  },
  {
    label: 'Environments',
    snippets: [
      { label: 'figure env',         insert: '\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{figures/$1}\n  \\caption{$2}\n  \\label{fig:$3}\n\\end{figure}' },
      { label: 'table env',          insert: '\\begin{table}[htbp]\n  \\centering\n  \\caption{$1}\n  \\label{tab:$2}\n  \\begin{tabular}{$3}\n    \\toprule\n    $4 \\\\\n    \\midrule\n    $5 \\\\\n    \\bottomrule\n  \\end{tabular}\n\\end{table}' },
      { label: 'equation env',       insert: '\\begin{equation}\n  $1\n  \\label{eq:$2}\n\\end{equation}' },
      { label: 'align env',          insert: '\\begin{align}\n  $1 &= $2 \\\\\n  $3 &= $4\n\\end{align}' },
      { label: 'itemize env',        insert: '\\begin{itemize}\n  \\item $1\n  \\item $2\n\\end{itemize}' },
      { label: 'enumerate env',      insert: '\\begin{enumerate}\n  \\item $1\n  \\item $2\n\\end{enumerate}' },
      { label: 'lstlisting env',     insert: '\\begin{lstlisting}[language=$1,caption=$2]\n$3\n\\end{lstlisting}' },
      { label: 'tabularx env',       insert: '\\begin{table}[htbp]\n  \\centering\n  \\caption{$1}\n  \\label{tab:$2}\n  \\begin{tabularx}{\\textwidth}{$3}\n    \\toprule\n    $4 \\\\\n    \\midrule\n    $5 \\\\\n    \\bottomrule\n  \\end{tabularx}\n\\end{table}' },
      { label: 'longtable env',      insert: '\\begin{longtable}{$1}\n  \\toprule\n  $2 \\\\\n  \\midrule\n  \\endhead\n  $3 \\\\\n  \\bottomrule\n  \\end{longtable}' },
    ],
  },
  {
    label: 'Theorems',
    snippets: [
      { label: 'theorem env',        insert: '\\begin{theorem}[$1]\n  \\label{thm:$2}\n  $3\n\\end{theorem}' },
      { label: 'lemma env',          insert: '\\begin{lemma}[$1]\n  $2\n\\end{lemma}' },
      { label: 'proof env',          insert: '\\begin{proof}\n  $1\n\\end{proof}' },
      { label: 'definition env',     insert: '\\begin{definition}[$1]\n  $2\n\\end{definition}' },
      { label: 'corollary env',      insert: '\\begin{corollary}\n  $1\n\\end{corollary}' },
      { label: 'remark env',         insert: '\\begin{remark}\n  $1\n\\end{remark}' },
      { label: 'example env',        insert: '\\begin{example}\n  $1\n\\end{example}' },
      { label: 'algorithm env',      insert: '\\begin{algorithm}\n  \\caption{$1}\n  \\label{alg:$2}\n  \\begin{algorithmic}[1]\n    $3\n  \\end{algorithmic}\n\\end{algorithm}' },
    ],
  },
  {
    label: 'Math',
    snippets: [
      { label: 'matrix env',         insert: '\\begin{pmatrix}\n  $1 & $2 \\\\\\\\\n  $3 & $4\n\\end{pmatrix}' },
      { label: 'cases env',          insert: '\\begin{cases}\n  $1 & \\text{if } $2 \\\\\\\\\n  $3 & \\text{otherwise}\n\\end{cases}' },
      { label: 'split env',          insert: '\\begin{equation}\n  \\begin{split}\n    $1 &= $2 \\\\\\\\\n         &= $3\n  \\end{split}\n\\end{equation}' },
      { label: 'aligned env',        insert: '\\begin{aligned}\n  $1 &= $2 \\\\\\\\\n  $3 &= $4\n\\end{aligned}' },
      { label: 'gathered env',       insert: '\\begin{gather}\n  $1 \\\\\\\\\n  $2\n\\end{gather}' },
      { label: '\\frac{}{}',         insert: '\\frac{$1}{$2}' },
      { label: '\\sqrt{}',           insert: '\\sqrt{$1}' },
      { label: '\\sum',              insert: '\\sum_{$1}^{$2}' },
      { label: '\\int',              insert: '\\int_{$1}^{$2}' },
      { label: '\\left( \\right)',   insert: '\\left( $1 \\right)' },
      { label: '\\left[ \\right]',   insert: '\\left[ $1 \\right]' },
    ],
  },
  {
    label: 'Formatting',
    snippets: [
      { label: '\\textbf{}',          insert: '\\textbf{$1}' },
      { label: '\\textit{}',          insert: '\\textit{$1}' },
      { label: '\\emph{}',            insert: '\\emph{$1}' },
      { label: '\\texttt{}',          insert: '\\texttt{$1}' },
      { label: '\\underline{}',       insert: '\\underline{$1}' },
      { label: '\\footnote{}',        insert: '\\footnote{$1}' },
      { label: '\\url{}',             insert: '\\url{$1}' },
      { label: '\\href{}{}',          insert: '\\href{$1}{$2}' },
      { label: '\\caption{}',         insert: '\\caption{$1}' },
      { label: '\\centering',         insert: '\\centering' },
      { label: '\\noindent',          insert: '\\noindent' },
      { label: '\\newpage',           insert: '\\newpage' },
      { label: '\\clearpage',         insert: '\\clearpage' },
    ],
  },
  {
    label: 'References',
    snippets: [
      { label: '\\label{}',           insert: '\\label{$1}' },
      { label: '\\ref{}',             insert: '\\ref{$1}' },
      { label: '\\cref{}',            insert: '\\cref{$1}' },
      { label: '\\eqref{}',           insert: '\\eqref{$1}' },
      { label: '\\autoref{}',         insert: '\\autoref{$1}' },
      { label: '\\cite{}',            insert: '\\cite{$1}' },
      { label: '\\citep{}',           insert: '\\citep{$1}' },
      { label: '\\citet{}',           insert: '\\citet{$1}' },
      { label: '\\bibliographystyle', insert: '\\bibliographystyle{$1}' },
    ],
  },
  {
    label: 'Packages',
    snippets: [
      { label: 'common thesis pkgs',  insert: '\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage{lmodern}\n\\usepackage{microtype}\n\\usepackage{geometry}\n\\usepackage{setspace}\n\\usepackage{natbib}\n\\usepackage{graphicx}\n\\usepackage{booktabs}\n\\usepackage{hyperref}\n\\usepackage[nameinlink]{cleveref}' },
      { label: 'amsmath',            insert: '\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage{amsthm}' },
      { label: 'algorithm packages', insert: '\\usepackage{algorithm}\n\\usepackage{algpseudocode}' },
      { label: 'code listings',       insert: '\\usepackage{listings}\n\\lstset{basicstyle=\\ttfamily, breaklines=true}' },
      { label: 'tikz',               insert: '\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta, positioning}' },
      { label: 'siunitx',            insert: '\\usepackage{siunitx}' },
      { label: 'glossaries',         insert: '\\usepackage{glossaries}\n\\makeglossaries' },
    ],
  },
];

interface Props {
  tex:          string;
  onJumpToLine: (line: number) => void;
  onInsertSnippet?: (snippet: string) => void;
}

export function EditorSidebar({ tex, onJumpToLine, onInsertSnippet }: Props) {
  const ui           = useEditorStore(s => s.ui);
  const session      = useEditorStore(s => s.session);
  const setUI        = useEditorStore(s => s.setUI);
  const setActiveFile = useEditorStore(s => s.setActiveFile);
  const isMobile     = useIsMobile();
  const outline      = useMemo(() => parseOutline(tex), [tex]);

  const LEVEL_STYLES: Record<OutlineItem['level'], string> = {
    chapter:       'font-medium text-foreground text-xs pl-0',
    section:       'text-muted-foreground text-xs pl-3',
    subsection:    'text-muted-foreground/70 text-[11px] pl-5',
    subsubsection: 'text-muted-foreground/50 text-[10px] pl-7',
  };

  const totalSnippets = SNIPPET_CATEGORIES.reduce((sum, cat) => sum + cat.snippets.length, 0);

  return (
    <div className={`${isMobile ? 'w-full' : 'w-56'} flex-shrink-0 border-r bg-background/50 flex flex-col min-h-0`}>
      <Tabs
        value={ui.sidebarTab}
        onValueChange={v => setUI({ sidebarTab: v as 'outline' | 'snippets' | 'files' })}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="h-8 w-full rounded-none border-b bg-transparent px-1 gap-0">
          <TabsTrigger value="outline"  className="flex-1 text-[10px] h-9 sm:h-6 rounded">Outline</TabsTrigger>
          <TabsTrigger value="snippets" className="flex-1 text-[10px] h-9 sm:h-6 rounded">
            Snippets
            <span className="ml-1 text-[8px] text-muted-foreground/60">{totalSnippets}</span>
          </TabsTrigger>
          <TabsTrigger value="files"    className="flex-1 text-[10px] h-9 sm:h-6 rounded">Files</TabsTrigger>
        </TabsList>

        {/* Document outline */}
        <TabsContent value="outline" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5">
              {outline.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-4 px-2">
                  No sections detected yet. Add \\chapter or \\section commands.
                </p>
              ) : (
                <div className="pb-1 mb-1 border-b border-border/50">
                  <p className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider px-1">
                    {outline.length} section{outline.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {outline.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onJumpToLine(item.line)}
                  className={`w-full text-left truncate py-2 sm:py-0.5 px-2 sm:px-2 rounded hover:bg-muted/50 active:bg-muted/70 transition-colors min-h-[44px] sm:min-h-[28px] ${LEVEL_STYLES[item.level]} ${isMobile ? 'text-xs' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Snippet library */}
        <TabsContent value="snippets" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-3">
              {SNIPPET_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                    {cat.label}
                    <span className="ml-1 text-[8px] font-normal text-muted-foreground/40">{cat.snippets.length}</span>
                  </p>
                  <div className="space-y-0.5">
                    {cat.snippets.map(s => (
                      <button
                        key={s.label}
                        className={`w-full text-left font-mono truncate px-2 py-2 sm:py-0.5 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground active:bg-muted/70 transition-colors min-h-[44px] sm:min-h-[28px] ${isMobile ? 'text-xs' : 'text-[11px]'}`}
                        title={s.insert}
                        onClick={(e) => {
                          e.preventDefault();
                          onInsertSnippet?.(s.insert);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* File list */}
        <TabsContent value="files" className="flex-1 min-h-0 mt-0">
          <div className="p-2 space-y-0.5">
            <p className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider px-1 mb-1">
              Project Files
            </p>
            {(['main.tex', 'references.bib', 'readme.md'] as const).map(f => {
              const isActive = session?.activeFile === f;
              const isDirty = session?.dirty[f];
              const iconColor = f === 'main.tex' ? 'text-green-500'
                : f === 'references.bib' ? 'text-blue-500' : 'text-purple-400';
              const ext = f === 'readme.md' ? 'MD' : f.split('.').pop()?.toUpperCase() || '';

              return (
                <button
                  key={f}
                  className={`w-full text-left font-mono truncate px-2 py-2 sm:py-1.5 rounded transition-colors flex items-center gap-2 min-h-[44px] sm:min-h-0 ${
                    isActive
                      ? 'bg-primary/10 text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 active:bg-muted/70 hover:text-foreground'
                  } ${isMobile ? 'text-xs' : 'text-[11px]'}`}
                  onClick={() => setActiveFile(f)}
                >
                  <span className={`text-[9px] font-bold ${iconColor}`}>{ext}</span>
                  <span className="flex-1 truncate">{f}</span>
                  {isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
