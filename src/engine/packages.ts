// ============================================================
// ThesisForge Engine — Layer 1: Package System
// The package system is the foundation. Wrong packages, wrong order,
// or missing options cause cryptic LaTeX errors students cannot debug.
// ============================================================

import type { ThesisData, ThesisType } from '@/lib/thesis-types';

// ============================================================
// Package Manifest — The Law of Load Order
// ============================================================

export interface PackageEntry {
  pkg: string;
  opts: string[];
  purpose: string;
  /** Conditional flag — only include if condition is met */
  conditional?: 'hasCode' | 'hasMath' | 'isReport' | 'isTwoSided';
}

/**
 * Canonical package manifest.
 * Every package ThesisForge uses, with exact options and load order.
 * Order matters. Some packages must load before others.
 */
const PACKAGE_MANIFEST: PackageEntry[] = [
  // ── Encoding & fonts (must load first) ────────────────────────
  { pkg: 'inputenc',    opts: ['utf8'],                    purpose: 'UTF-8 input encoding' },
  { pkg: 'fontenc',     opts: ['T1'],                      purpose: 'Font encoding for proper hyphenation' },
  { pkg: 'lmodern',     opts: [],                          purpose: 'Latin Modern fonts — better PDF output than CM' },

  // ── Language ─────────────────────────────────────────────────
  { pkg: 'babel',       opts: ['english'],                 purpose: 'English language support and hyphenation' },

  // ── Page geometry ────────────────────────────────────────────
  { pkg: 'geometry',    opts: [],                          purpose: 'Page dimensions — options set via \\geometry{}' },

  // ── Typography ───────────────────────────────────────────────
  { pkg: 'microtype',   opts: ['final', 'tracking=true', 'kerning=true'], purpose: 'Micro-typography: protrusion, expansion' },
  { pkg: 'setspace',    opts: [],                          purpose: 'Line spacing commands (\\onehalfspacing, \\doublespacing)' },
  { pkg: 'parskip',     opts: ['parfill'],                 purpose: 'Paragraph spacing — only for report template', conditional: 'isReport' },
  { pkg: 'ragged2e',    opts: [],                          purpose: 'Better ragged-right justification' },

  // ── Mathematics ──────────────────────────────────────────────
  { pkg: 'amsmath',     opts: [],                          purpose: 'AMS math environments' },
  { pkg: 'amssymb',     opts: [],                          purpose: 'AMS symbols' },
  { pkg: 'amsthm',      opts: [],                          purpose: 'Theorem environments', conditional: 'isReport' },
  { pkg: 'mathtools',   opts: [],                          purpose: 'Extensions to amsmath (\\coloneqq, etc.)' },

  // ── Tables ───────────────────────────────────────────────────
  { pkg: 'booktabs',    opts: [],                          purpose: 'Professional table rules: \\toprule, \\midrule, \\bottomrule' },
  { pkg: 'tabularx',    opts: [],                          purpose: 'Tables with auto-width columns' },
  { pkg: 'longtable',   opts: [],                          purpose: 'Multi-page tables' },
  { pkg: 'multirow',    opts: [],                          purpose: 'Multi-row cells' },
  { pkg: 'array',       opts: [],                          purpose: 'Enhanced column types in tabular' },

  // ── Figures ──────────────────────────────────────────────────
  { pkg: 'graphicx',    opts: [],                          purpose: '\\includegraphics' },
  { pkg: 'float',       opts: [],                          purpose: 'H float placement specifier' },
  { pkg: 'subcaption',  opts: [],                          purpose: 'Subfigures within figures' },
  { pkg: 'wrapfig',     opts: [],                          purpose: 'Text-wrapped figures' },

  // ── Code listings ────────────────────────────────────────────
  { pkg: 'listings',    opts: [],                          purpose: 'Code blocks', conditional: 'hasCode' },
  { pkg: 'xcolor',      opts: ['dvipsnames', 'svgnames', 'table'], purpose: 'Extended color support' },

  // ── Lists ────────────────────────────────────────────────────
  { pkg: 'enumitem',    opts: [],                          purpose: 'Customizable list environments' },

  // ── Headers & footers ────────────────────────────────────────
  { pkg: 'fancyhdr',    opts: [],                          purpose: 'Custom headers and footers' },

  // ── Cross-references ─────────────────────────────────────────
  { pkg: 'varioref',    opts: [],                          purpose: 'Smart references: \\vref, \\vpageref' },
  { pkg: 'caption',     opts: ['font=small', 'labelfont=bf'], purpose: 'Caption formatting' },
  { pkg: 'xspace',      opts: [],                          purpose: 'Intelligent space after commands' },

  // ── Counter management ───────────────────────────────────────
  { pkg: 'chngcntr',    opts: [],                          purpose: 'Change counter parent (figure/table per-chapter)' },

  // ── Bibliography ─────────────────────────────────────────────
  { pkg: 'natbib',      opts: ['round', 'colon', 'authoryear'], purpose: 'Author-year citations' },

  // ── PDF features (MUST be second-to-last) ────────────────────
  { pkg: 'hyperref',    opts: [],                          purpose: 'PDF links, metadata — MUST BE SECOND TO LAST' },

  // ── Smart cross-refs (MUST load after hyperref) ──────────────
  { pkg: 'cleveref',    opts: ['nameinlink', 'noabbrev'], purpose: 'Smart cross-refs — MUST LOAD AFTER hyperref' },
];

// ============================================================
// Content Detectors — Scan chapter bodies for content types
// ============================================================

export function detectCodeBlocks(chapters: ThesisData['chapters']): boolean {
  return chapters.some(ch =>
    ch.content && (
      ch.content.includes('```') ||
      ch.content.includes('[code]') ||
      ch.content.includes('\\begin{lstlisting}') ||
      /\bfunction\s+\w+\(/.test(ch.content) ||
      /\bdef\s+\w+\(/.test(ch.content) ||
      /\bclass\s+\w+/.test(ch.content) ||
      /\bimport\s+\{/.test(ch.content) ||
      /\bconst\s+\w+\s*=/.test(ch.content) ||
      /\blet\s+\w+\s*=/.test(ch.content) ||
      /\bvar\s+\w+\s*=/.test(ch.content)
    )
  );
}

export function detectMathContent(chapters: ThesisData['chapters']): boolean {
  return chapters.some(ch =>
    ch.content && (
      /\$[^$]+\$/.test(ch.content) ||
      ch.content.includes('\\[') ||
      ch.content.includes('\\begin{equation}') ||
      ch.content.includes('\\begin{align}') ||
      /\b(equation|theorem|lemma|proof|formula)\b/i.test(ch.content) ||
      /\b(alpha|beta|gamma|delta|sigma|pi|theta)\b/i.test(ch.content)
    )
  );
}

export function detectFigures(chapters: ThesisData['chapters']): boolean {
  return chapters.some(ch =>
    ch.content && (
      ch.content.includes('[figure]') ||
      ch.content.includes('\\includegraphics') ||
      ch.content.includes('\\begin{figure}')
    )
  );
}

export function detectTables(chapters: ThesisData['chapters']): boolean {
  return chapters.some(ch =>
    ch.content && (
      ch.content.includes('[table]') ||
      ch.content.includes('\\begin{table}') ||
      ch.content.includes('\\begin{tabular}')
    )
  );
}

// ============================================================
// Package Resolver — Filter manifest based on document content
// ============================================================

export interface ResolvedPackage {
  name: string;
  options: string[];
  purpose: string;
}

/**
 * Resolve the package list for a given thesis configuration.
 * Filters the canonical manifest based on detected content types
 * and template-specific requirements.
 */
export function resolvePackages(data: ThesisData): ResolvedPackage[] {
  const chapters = data.chapters;
  const hasCode    = detectCodeBlocks(chapters);
  const hasMath    = detectMathContent(chapters);
  const isReport   = data.type === 'report';

  // Add additional packages based on options
  const extraPackages: ResolvedPackage[] = [];

  if (data.options.includeListings && !hasCode) {
    extraPackages.push({ name: 'listings', options: [], purpose: 'Code listings (enabled in options)' });
  }

  if (data.type === 'phd' && data.options.includeGlossary) {
    extraPackages.push(
      { name: 'nomencl', options: [], purpose: 'Nomenclature list (PhD requirement)' },
      { name: 'glossaries', options: [], purpose: 'Glossary support (PhD requirement)' },
    );
  }

  if (data.options.figureNumbering === 'per-chapter' || data.options.tableNumbering === 'per-chapter') {
    extraPackages.push({ name: 'chngcntr', options: [], purpose: 'Counter management for per-chapter numbering' });
  }

  const filtered = PACKAGE_MANIFEST
    .filter(entry => {
      if (entry.conditional === 'hasCode' && !hasCode) return false;
      if (entry.conditional === 'hasMath' && !hasMath) return false;
      if (entry.conditional === 'isReport' && !isReport) return false;
      return true;
    });

  // Convert manifest entries to resolved packages
  const manifestPackages: ResolvedPackage[] = filtered.map(entry => ({
    name: entry.pkg,
    options: [...entry.opts],
    purpose: entry.purpose,
  }));

  // Combine with extra packages
  const allPackages = [...manifestPackages, ...extraPackages];

  // Deduplicate by name
  const seen = new Set<string>();
  return allPackages.filter(pkg => {
    if (seen.has(pkg.name)) return false;
    seen.add(pkg.name);
    return true;
  });
}

// ============================================================
// Package Configuration Block
// After \usepackage declarations, generate a configuration block
// that properly sets up every loaded package.
// ============================================================

/**
 * Build the complete package configuration block for the preamble.
 * This includes geometry, spacing, microtype, hyperref, fancyhdr,
 * natbib, cleveref, and custom commands.
 */
export function buildPackageConfiguration(data: ThesisData): string {
  const lines: string[] = [];
  const m = data.metadata;

  // ── Geometry ─────────────────────────────────────────────────
  const marginMap: Record<string, { top: string; bottom: string; left: string; right: string }> = {
    normal: { top: '25mm', bottom: '25mm', left: '30mm', right: '25mm' },
    narrow: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    wide:   { top: '25mm', bottom: '25mm', left: '40mm', right: '25mm' },
  };
  const margins = marginMap[data.options.marginSize] || marginMap.normal;
  const bindingOffset = data.type === 'phd' || data.type === 'master'
    ? '  bindingoffset=10mm,\n' : '';

  lines.push(`\\geometry{
  paper=${data.options.paperSize},
  top=${margins.top},
  bottom=${margins.bottom},
  left=${margins.left},
  right=${margins.right},
${bindingOffset}  headheight=15pt,
  includeheadfoot
}`);

  // ── Line spacing ─────────────────────────────────────────────
  const spacingCmd: Record<string, string> = {
    single: '',  // default — no command needed
    onehalf: '\\onehalfspacing',
    double: '\\doublespacing',
  };
  const spacing = spacingCmd[data.options.lineSpacing];
  if (spacing) lines.push(spacing);

  // ── Microtype configuration ──────────────────────────────────
  lines.push(`\\microtypesetup{
  protrusion=true,
  expansion=true,
  final,
  verbose=silent
}`);

  // ── Hyperref configuration — rich PDF metadata ───────────────
  const escapedTitle = (m.title || '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_');
  const escapedAuthor = (m.author || '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%');
  const escapedKeywords = (data.keywords.join(', ') || '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%');

  lines.push(`\\hypersetup{
  pdftitle    = {${escapedTitle}},
  pdfauthor   = {${escapedAuthor}},
  pdfsubject  = {${data.type} thesis},
  pdfkeywords = {${escapedKeywords}},
  pdfcreator  = {ThesisForge},
  pdfproducer = {LaTeX with hyperref},
  colorlinks  = true,
  linkcolor   = {NavyBlue},
  citecolor   = {ForestGreen},
  urlcolor    = {RoyalBlue},
  filecolor   = {Maroon},
  bookmarks   = true,
  bookmarksnumbered = true,
  bookmarksopen = false,
  pdfpagemode = UseOutlines,
  plainpages  = false,
  pdfpagelabels = true
}`);

  // ── Headers and footers via fancyhdr ─────────────────────────
  lines.push(`\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small\\nouppercase{\\leftmark}}
\\fancyhead[R]{\\small\\thepage}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0.4pt}
\\fancypagestyle{plain}{
  \\fancyhf{}
  \\fancyfoot[C]{\\small\\thepage}
  \\renewcommand{\\headrulewidth}{0pt}
}`);

  // ── natbib citation style ────────────────────────────────────
  const citationMap: Record<string, string> = {
    apa: 'apalike',
    ieee: 'ieeetr',
    vancouver: 'vancouver',
    chicago: 'chicago',
    harvard: 'plainnat',
  };
  const citStyle = citationMap[data.options.citationStyle] || 'plainnat';
  lines.push(`\\bibliographystyle{${citStyle}}`);

  // ── Cleveref language ────────────────────────────────────────
  lines.push(`\\crefname{figure}{Figure}{Figures}
\\crefname{table}{Table}{Tables}
\\crefname{equation}{Equation}{Equations}
\\crefname{chapter}{Chapter}{Chapters}
\\crefname{section}{Section}{Sections}
\\crefname{appendix}{Appendix}{Appendices}`);

  // ── Counter settings ─────────────────────────────────────────
  if (data.options.figureNumbering === 'per-chapter') {
    lines.push('\\counterwithin{figure}{chapter}');
  }
  if (data.options.tableNumbering === 'per-chapter') {
    lines.push('\\counterwithin{table}{chapter}');
  }

  // ── ToC depth ────────────────────────────────────────────────
  lines.push(`\\setcounter{tocdepth}{${data.options.tocDepth}}`);
  lines.push(`\\setcounter{secdepth}{${data.options.tocDepth}}`);

  // ── Custom commands ──────────────────────────────────────────
  lines.push(`% ── Custom commands ──────────────────────────────────`);
  lines.push(`\\newcommand{\\thesis}{${escapedTitle}}`);
  lines.push(`\\newcommand{\\theauthor}{${escapedAuthor}}`);
  lines.push(`\\newcommand{\\theyear}{${new Date().getFullYear().toString()}}`);
  if (m.university) {
    const escapedInst = m.university
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/&/g, '\\&');
    lines.push(`\\newcommand{\\theinstitution}{${escapedInst}}`);
  }
  // Utility commands
  lines.push(`\\newcommand{\\latex}{\\LaTeX\\xspace}`);
  lines.push(`\\newcommand{\\tex}{\\TeX\\xspace}`);

  // ── Theorem environments (report class only) ─────────────────
  if (data.type !== 'report') {
    lines.push(`% ── Theorem environments ──────────────────────────────`);
    lines.push(`\\newtheorem{theorem}{Theorem}[chapter]`);
    lines.push(`\\newtheorem{lemma}[theorem]{Lemma}`);
    lines.push(`\\newtheorem{proposition}[theorem]{Proposition}`);
    lines.push(`\\newtheorem{corollary}[theorem]{Corollary}`);
    lines.push(`\\newtheorem{definition}{Definition}[chapter]`);
    lines.push(`\\newtheorem{example}{Example}[chapter]`);
    lines.push(`\\newtheorem{remark}{Remark}[chapter]`);
  }

  // ── Code listings configuration ──────────────────────────────
  if (data.options.includeListings || detectCodeBlocks(data.chapters)) {
    lines.push(`% ── Listings configuration ────────────────────────────`);
    lines.push(`\\lstset{
  basicstyle=\\ttfamily\\small,
  breaklines=true,
  frame=single,
  numbers=left,
  numberstyle=\\tiny\\color{gray},
  keywordstyle=\\color{blue},
  commentstyle=\\color{green!50!black},
  stringstyle=\\color{red},
  tabsize=2,
  showstringspaces=false,
  captionpos=b
}`);
  }

  return lines.join('\n\n');
}

// ============================================================
// Build \\usepackage Lines — For preamble generation
// ============================================================

/**
 * Generate \\usepackage lines for all resolved packages.
 */
export function buildUsepackageLines(data: ThesisData): string {
  const packages = resolvePackages(data);

  return packages.map(pkg => {
    if (pkg.options.length === 0) {
      return `\\usepackage{${pkg.name}}`;
    }
    return `\\usepackage[${pkg.options.join(',')}]{${pkg.name}}`;
  }).join('\n');
}

// ============================================================
// System 8: LaTeX Package Intelligence Registry
// A comprehensive registry of LaTeX packages with metadata for
// conflict detection, dependency resolution, and smart suggestions.
// ============================================================

// ── New Types ─────────────────────────────────────────────────

export type CompilerSupport = 'pdflatex' | 'xelatex' | 'lualatex';
export type PackageCategory = 'typography' | 'math' | 'figures' | 'tables' | 'bibliography' | 'layout' | 'code' | 'language' | 'misc';

export interface PackageRegistryEntry {
  name: string;
  description: string;
  category: PackageCategory;
  provides: { commands: string[]; environments: string[]; counters: string[] };
  requires: string[];
  mustLoadAfter: string[];
  mustLoadBefore: string[];
  conflictsWith: string[];
  deprecatedBy?: string;
  compilerSupport: CompilerSupport[];
  overleafSupport: boolean;
  documentationUrl: string;
  commonErrors: { symptom: string; cause: string; fix: string }[];
}

// ── Registry ──────────────────────────────────────────────────

export const LATEX_PACKAGE_REGISTRY: Map<string, PackageRegistryEntry> = new Map([
  // ── Typography (9 packages) ──────────────────────────────────
  [
    'fontspec',
    {
      name: 'fontspec',
      description: 'Advanced font selection for XeLaTeX and LuaLaTeX. Allows system fonts and OpenType features.',
      category: 'typography',
      provides: {
        commands: ['\\setmainfont', '\\setsansfont', '\\setmonofont', '\\newfontfamily', '\\fontspec'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['microtype'],
      conflictsWith: ['inputenc', 'fontenc', 'lmodern'],
      compilerSupport: ['xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/fontspec',
      commonErrors: [
        { symptom: 'Font not found', cause: 'The specified font is not installed on the system or available on Overleaf', fix: 'Use a font available in TeX Live (e.g., TeX Gyre family) or upload .otf/.ttf files' },
        { symptom: 'Package fontspec Error: The font ... cannot be found', cause: 'Font name misspelled or not installed', fix: 'Verify the exact font name using \\setmainfont{<name>} with the correct PostScript name' },
      ],
    },
  ],
  [
    'lmodern',
    {
      name: 'lmodern',
      description: 'Latin Modern fonts — enhanced Computer Modern fonts with proper T1 encoding support.',
      category: 'typography',
      provides: {
        commands: [],
        environments: [],
        counters: [],
      },
      requires: ['fontenc'],
      mustLoadAfter: ['fontenc'],
      mustLoadBefore: [],
      conflictsWith: ['fontspec'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/lm',
      commonErrors: [
        { symptom: 'Warning: Font shape undefined', cause: 'Using T1 encoding without lmodern loaded', fix: 'Load lmodern after fontenc with T1 option' },
      ],
    },
  ],
  [
    'microtype',
    {
      name: 'microtype',
      description: 'Micro-typographic extensions: character protrusion, font expansion, and letter spacing for improved text appearance.',
      category: 'typography',
      provides: {
        commands: ['\\microtypesetup', '\\textls', '\\lsstyle', '\\microtypecontext'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: ['fontenc', 'fontspec'],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/microtype',
      commonErrors: [
        { symptom: 'Some features not available with LuaLaTeX', cause: 'LuaLaTeX microtype support is partial; tracking and kerning work, protrusion may differ', fix: 'Use pdflatex for full microtype support or accept limited features in LuaLaTeX' },
      ],
    },
  ],
  [
    'setspace',
    {
      name: 'setspace',
      description: 'Provides commands for setting line spacing: single, onehalf, and double spacing.',
      category: 'typography',
      provides: {
        commands: ['\\onehalfspacing', '\\doublespacing', '\\singlespacing', '\\setstretch'],
        environments: ['spacing'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/setspace',
      commonErrors: [],
    },
  ],
  [
    'parskip',
    {
      name: 'parskip',
      description: 'Adjusts paragraph separation with space between paragraphs instead of indentation.',
      category: 'typography',
      provides: {
        commands: [],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/parskip',
      commonErrors: [
        { symptom: 'Excessive space before/after lists and floats', cause: 'parskip adds extra parskip around list environments', fix: 'Use parfill option or manually adjust list parameters' },
      ],
    },
  ],
  [
    'ragged2e',
    {
      name: 'ragged2e',
      description: 'Provides improved ragged-right text with better hyphenation than standard raggedright.',
      category: 'typography',
      provides: {
        commands: ['\\raggedright', '\\justifying', '\\Centering', '\\RaggedLeft', '\\RaggedRight'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/ragged2e',
      commonErrors: [],
    },
  ],
  [
    'titlesec',
    {
      name: 'titlesec',
      description: 'Customize sectioning headings: fonts, spacing, numbering style, and format.',
      category: 'typography',
      provides: {
        commands: ['\\titleformat', '\\titlespacing', '\\titlelabel', '\\assignpagestyle'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref'],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/titlesec',
      commonErrors: [
        { symptom: 'Section numbers disappear', cause: 'titlesec may suppress numbers if format string lacks \\thesection', fix: 'Ensure \\thesection (or equivalent) is included in the format argument' },
      ],
    },
  ],
  [
    'enumitem',
    {
      name: 'enumitem',
      description: 'Customize list environments (itemize, enumerate, description) with labels, spacing, and ref formatting.',
      category: 'typography',
      provides: {
        commands: ['\\setitemize', '\\setenumerate', '\\setdescription', '\\newlist', '\\newitemize', '\\newenumerate'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/enumitem',
      commonErrors: [
        { symptom: 'Label too wide', cause: 'Custom label exceeds the available width for the label box', fix: 'Increase labelwidth or shorten the label' },
      ],
    },
  ],
  [
    'xspace',
    {
      name: 'xspace',
      description: 'Intelligent space handling after macros — adds space only when followed by a letter.',
      category: 'typography',
      provides: {
        commands: ['\\xspace'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/xspace',
      commonErrors: [
        { symptom: 'Extra space before punctuation', cause: 'xspace does not handle punctuation correctly', fix: 'Do not use \\xspace before periods, commas, or other punctuation' },
      ],
    },
  ],

  // ── Math (8 packages) ────────────────────────────────────────
  [
    'amsmath',
    {
      name: 'amsmath',
      description: 'The standard AMS math package providing equation environments, matrix environments, and math operators.',
      category: 'math',
      provides: {
        commands: ['\\text', '\\dfrac', '\\tfrac', '\\binom', '\\genfrac', '\\overset', '\\underset', '\\operatorname', '\\DeclareMathOperator', '\\mathclap'],
        environments: ['align', 'align*', 'gather', 'gather*', 'multline', 'multline*', 'equation', 'equation*', 'split', 'cases', 'subequations', 'matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'Vmatrix'],
        counters: ['equation'],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['mathtools', 'amsthm', 'amssymb'],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/amsmath',
      commonErrors: [
        { symptom: 'Misplaced alignment tab character &', cause: 'Using & outside of the proper alignment context or mismatched environments', fix: 'Ensure & is only used inside align, matrix, or tabular environments' },
        { symptom: 'Missing $ inserted', cause: 'Using math commands outside math mode', fix: 'Wrap commands in $...$ or \\[...\\]' },
      ],
    },
  ],
  [
    'amssymb',
    {
      name: 'amssymb',
      description: 'AMS mathematical symbols including extra fonts for symbols, blackboard bold, and Fraktur.',
      category: 'math',
      provides: {
        commands: ['\\mathbb', '\\mathfrak', '\\mathcal', '\\mathscr', '\\mathds', '\\mathring', '\\boxdot', '\\boxplus', '\\boxtimes', '\\iint', '\\iiint', '\\idotsint', '\\Finv', 'Game', '\\Im', '\\Re', '\\aleph', '\\beth'],
        environments: [],
        counters: [],
      },
      requires: ['amsfonts'],
      mustLoadAfter: ['amsmath'],
      mustLoadBefore: [],
      conflictsWith: ['unicode-math'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/amssymb',
      commonErrors: [
        { symptom: 'Too many math alphabets', cause: 'Exceeded the 16 math alphabet limit in pdflatex', fix: 'Reduce the number of \\mathXX commands or switch to XeLaTeX/LuaLaTeX with unicode-math' },
      ],
    },
  ],
  [
    'amsthm',
    {
      name: 'amsthm',
      description: 'Provides theorem, lemma, corollary, proof, and definition environments with numbering.',
      category: 'math',
      provides: {
        commands: ['\\newtheorem', '\\theoremstyle', '\\qedsymbol', '\\qedhere'],
        environments: ['theorem', 'lemma', 'corollary', 'definition', 'example', 'proof', 'remark'],
        counters: ['theorem'],
      },
      requires: [],
      mustLoadAfter: ['amsmath'],
      mustLoadBefore: [],
      conflictsWith: ['ntheorem'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/amsthm',
      commonErrors: [
        { symptom: 'LaTeX Error: LaTeX Error: Command \\theorem already defined', cause: 'Theorem environment already exists (e.g., loaded by another package or class)', fix: 'Check if the document class already defines theorem; use \\newtheorem with a unique name' },
      ],
    },
  ],
  [
    'mathtools',
    {
      name: 'mathtools',
      description: 'Extension of amsmath: adds paired delimiters, coloneqq, cases with text, underbrace/overbrace improvements.',
      category: 'math',
      provides: {
        commands: ['\\coloneqq', '\\eqqcolon', '\\prescript', '\\mathclap', '\\DeclarePairedDelimiter', '\\biggg', '\\bigggg', '\\shortintertext', '\\vdotswithin'],
        environments: ['dcases', 'dcases*', 'rcases', 'rcases*', 'cases*', 'multlined', 'lgathered', 'rgathered', 'spreadlines'],
        counters: [],
      },
      requires: ['amsmath'],
      mustLoadAfter: ['amsmath'],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/mathtools',
      commonErrors: [
        { symptom: 'Undefined control sequence \\coloneqq', cause: 'mathtools loaded but the symbol requires amsfonts or specific math fonts', fix: 'Ensure amssymb is also loaded or use \\mathbin{:=} as fallback' },
      ],
    },
  ],
  [
    'unicode-math',
    {
      name: 'unicode-math',
      description: 'Unicode mathematics support for XeLaTeX and LuaLaTeX. Provides access to OpenType math fonts.',
      category: 'math',
      provides: {
        commands: ['\\setmathfont', '\\setmathfontface', '\\symup', '\\symit', '\\symbf', '\\symcal', '\\symscr', '\\symfrak', '\\symbb'],
        environments: [],
        counters: [],
      },
      requires: ['fontspec'],
      mustLoadAfter: ['fontspec'],
      mustLoadBefore: ['amsmath', 'amssymb'],
      conflictsWith: ['amssymb', 'amsfonts', 'bm'],
      compilerSupport: ['xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/unicode-math',
      commonErrors: [
        { symptom: 'Font ... does not contain required OpenType math tables', cause: 'The specified font is not an OpenType math font', fix: 'Use a math font like Latin Modern Math, XITS Math, or STIX Two Math' },
        { symptom: 'Conflict with amssymb', cause: 'unicode-math conflicts with amssymb loaded before it', fix: 'Remove amssymb when using unicode-math; it provides all AMS symbols' },
      ],
    },
  ],
  [
    'bm',
    {
      name: 'bm',
      description: 'Bold math symbols. Provides \\bm for bold italic math and access to bold versions of all math fonts.',
      category: 'math',
      provides: {
        commands: ['\\bm', '\\boldmath', '\\unboldmath'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: ['unicode-math'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/bm',
      commonErrors: [
        { symptom: 'Font substitution warning', cause: 'No bold version of the math font is available', fix: 'Use a different font or accept the fallback' },
      ],
    },
  ],
  [
    'cancel',
    {
      name: 'cancel',
      description: 'Draw cancellation lines through math expressions for showing strikethrough in equations.',
      category: 'math',
      provides: {
        commands: ['\\cancel', '\\bcancel', '\\xcancel', '\\cancelto'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/cancel',
      commonErrors: [],
    },
  ],
  [
    'siunitx',
    {
      name: 'siunitx',
      description: 'Typeset SI units, numbers, and physical quantities with correct formatting and spacing.',
      category: 'math',
      provides: {
        commands: ['\\si', '\\SI', '\\num', '\\qty', '\\unit', '\\ang', '\\quantity', '\\DeclareSIUnit', '\\DeclareSIQualifier'],
        environments: ['SIunit'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: ['siunitx-v3'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/siunitx',
      commonErrors: [
        { symptom: 'Unexpected input or missing argument', cause: 'Incorrect usage of \\SI{}{} syntax', fix: 'Use \\SI{number}{unit} — first argument is the number, second is the unit string' },
        { symptom: 'siunitx error: "exponent" is not a valid key', cause: 'Using v2 syntax with siunitx v3', fix: 'Check the siunitx version and use the correct syntax for v3 (\\qty replaces \\SI in v3)' },
      ],
    },
  ],

  // ── Figures (6 packages) ─────────────────────────────────────
  [
    'graphicx',
    {
      name: 'graphicx',
      description: 'Extended graphics support with \\includegraphics, graphics path management, and scaling options.',
      category: 'figures',
      provides: {
        commands: ['\\includegraphics', '\\graphicspath', '\\resizebox', '\\scalebox', '\\rotatebox', '\\reflectbox'],
        environments: [],
        counters: [],
      },
      requires: ['graphics'],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/graphicx',
      commonErrors: [
        { symptom: 'File not found', cause: 'Image file not in the search path or wrong extension', fix: 'Check \\graphicspath, use the correct extension (.pdf for pdflatex, .pdf/.png/.jpg for XeLaTeX/LuaLaTeX)' },
        { symptom: 'Cannot determine size of graphic', cause: 'File format not supported or file is corrupted', fix: 'Convert the image to PDF or PNG format' },
      ],
    },
  ],
  [
    'float',
    {
      name: 'float',
      description: 'Provides the H placement specifier for figures and tables that must appear exactly where coded.',
      category: 'figures',
      provides: {
        commands: ['\\newfloat', '\\floatname', '\\floatstyle'],
        environments: ['figure', 'table'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/float',
      commonErrors: [
        { symptom: 'H misplaced', cause: 'Using H specifier in a document class that does not support it', fix: 'Ensure float package is loaded; use \\usepackage{float}' },
      ],
    },
  ],
  [
    'subcaption',
    {
      name: 'subcaption',
      description: 'Subfigure and subtable support within figure and table environments with separate captions.',
      category: 'figures',
      provides: {
        commands: ['\\subcaptionbox', '\\ContinuedFloat'],
        environments: ['subfigure', 'subtable'],
        counters: ['subfigure', 'subtable'],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: ['subfig'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/subcaption',
      commonErrors: [
        { symptom: 'Environment subfigure undefined', cause: 'subfigure environment requires the subcaption package', fix: 'Load subcaption: \\usepackage{subcaption}' },
        { symptom: 'Caption package option conflict', cause: 'Both caption and subcaption loaded with conflicting options', fix: 'Load subcaption without the caption package or use compatible options' },
      ],
    },
  ],
  [
    'subfig',
    {
      name: 'subfig',
      description: 'Alternative subfigure support using the subfloat command. Compatible with caption package.',
      category: 'figures',
      provides: {
        commands: ['\\subfloat', '\\subfigcaption', '\\subfigtopskip', '\\subfigbottomskip'],
        environments: [],
        counters: ['subfigure'],
      },
      requires: ['caption'],
      mustLoadAfter: ['caption'],
      mustLoadBefore: [],
      conflictsWith: ['subcaption'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/subfig',
      commonErrors: [
        { symptom: 'Conflict with subcaption', cause: 'Both subfig and subcaption define similar functionality', fix: 'Use only one: subcaption is recommended for new documents' },
      ],
    },
  ],
  [
    'wrapfig',
    {
      name: 'wrapfig',
      description: 'Allows figures and tables to have text wrapped around them on one side.',
      category: 'figures',
      provides: {
        commands: [],
        environments: ['wrapfigure', 'wraptable'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/wrapfig',
      commonErrors: [
        { symptom: 'Figure overlaps text or goes off the page', cause: 'wrapfig parameters (overhang, width) are incorrect', fix: 'Adjust the width and number of narrow lines; avoid using with very tall figures' },
        { symptom: 'Not working in two-column layout', cause: 'wrapfig has limited support for two-column documents', fix: 'Use cutwin or floatflt packages for two-column layouts' },
      ],
    },
  ],
  [
    'rotating',
    {
      name: 'rotating',
      description: 'Provides sideways figure and table environments for landscape-oriented floats.',
      category: 'figures',
      provides: {
        commands: ['\\rotatebox', '\\turnbox', '\\scalebox'],
        environments: ['sidewaysfigure', 'sidewaystable', 'sideways'],
        counters: [],
      },
      requires: ['graphicx'],
      mustLoadAfter: ['graphicx'],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/rotating',
      commonErrors: [
        { symptom: 'Sideways figure appears on wrong page', cause: 'Float placement issues with sideways environments', fix: 'Use placement specifier [p] or add \\clearpage before the environment' },
      ],
    },
  ],

  // ── Tables (5 packages) ──────────────────────────────────────
  [
    'booktabs',
    {
      name: 'booktabs',
      description: 'Professional-quality table rules: \\toprule, \\midrule, \\bottomrule. Replaces \\hline for publication-quality tables.',
      category: 'tables',
      provides: {
        commands: ['\\toprule', '\\midrule', '\\bottomrule', '\\addlinespace', '\\cmidrule', '\\specialrule', '\\abovetopsep', '\\belowbottomsep'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/booktabs',
      commonErrors: [
        { symptom: 'Misplaced \\noalign', cause: 'Using \\midrule or \\toprule outside of a tabular environment', fix: 'Ensure booktabs commands are only used inside tabular, tabularx, or similar environments' },
      ],
    },
  ],
  [
    'tabularx',
    {
      name: 'tabularx',
      description: 'Tabular environment with an X column type that expands to fill available width.',
      category: 'tables',
      provides: {
        commands: ['\\tabularx', '\\extrarowheight'],
        environments: ['tabularx'],
        counters: [],
      },
      requires: ['array'],
      mustLoadAfter: ['array'],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/tabularx',
      commonErrors: [
        { symptom: 'X column does not expand', cause: 'Tabularx width not specified or is too narrow', fix: 'Set the width argument: \\begin{tabularx}{\\textwidth}{...}' },
        { symptom: 'Argument of tabularx has an extra }', cause: 'Missing or extra braces in the column specification', fix: 'Check that the column specification braces are balanced' },
      ],
    },
  ],
  [
    'longtable',
    {
      name: 'longtable',
      description: 'Tables that can span multiple pages with repeated headers and footers.',
      category: 'tables',
      provides: {
        commands: ['\\LTleft', '\\LTright', '\\LTpre', '\\LTpost', '\\LTcapwidth', '\\LTchunksize'],
        environments: ['longtable'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/longtable',
      commonErrors: [
        { symptom: 'longtable not in 1-column mode', cause: 'longtable cannot be used inside a table float or two-column layout', fix: 'Remove the table float wrapper; use longtable directly. For two-column, use supertabular' },
        { symptom: 'Misplaced \\noalign or \\hline', cause: 'End-of-head, \\endfirsthead, or \\endhead is missing or misplaced', fix: 'Ensure \\endfirsthead and \\endhead are properly defined for repeated headers' },
      ],
    },
  ],
  [
    'multirow',
    {
      name: 'multirow',
      description: 'Creates table cells that span multiple rows with proper vertical alignment.',
      category: 'tables',
      provides: {
        commands: ['\\multirow', '\\multirowbottom', '\\multirowtop', '\\multirowmark'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/multirow',
      commonErrors: [
        { symptom: 'Multirow cell text overflows', cause: 'The specified number of rows is too few for the cell content', fix: 'Increase the row count argument or use \\multirow{3}{*}{...} with more rows' },
      ],
    },
  ],
  [
    'array',
    {
      name: 'array',
      description: 'Extended column types and features for tabular environments: m{width}, >{\\bfseries}, etc.',
      category: 'tables',
      provides: {
        commands: ['\\newcolumntype', '\\extrarowheight', '\\arraybackslash', '\\newarraystretch'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['tabularx'],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/array',
      commonErrors: [],
    },
  ],

  // ── Bibliography (4 packages) ────────────────────────────────
  [
    'natbib',
    {
      name: 'natbib',
      description: 'Flexible citation commands for author-year and numerical citation styles with BibTeX.',
      category: 'bibliography',
      provides: {
        commands: ['\\citet', '\\citep', '\\citealt', '\\citealp', '\\citeauthor', '\\citeyear', '\\citetitle', '\\bibliographystyle'],
        environments: ['thebibliography'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref', 'cleveref'],
      conflictsWith: ['biblatex'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/natbib',
      commonErrors: [
        { symptom: 'Citation undefined', cause: 'The citation key does not exist in the .bib file or BibTeX has not been run', fix: 'Run BibTeX/bibtex to process citations; verify the key exists in your .bib file' },
        { symptom: 'Bibliography not appearing', cause: 'BibTeX not run or \\bibliography{} command missing', fix: 'Run the full compilation cycle: pdflatex → bibtex → pdflatex → pdflatex' },
      ],
    },
  ],
  [
    'biblatex',
    {
      name: 'biblatex',
      description: 'Modern bibliography management with Biber backend. Supports many citation styles and advanced features.',
      category: 'bibliography',
      provides: {
        commands: ['\\printbibliography', '\\autocite', '\\parencite', '\\textcite', '\\footcite', '\\fullcite', '\\addbibresource', '\\DeclareBibliographyDriver', '\\DeclareBibliographyCategory'],
        environments: ['refsection', 'refsegment'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref'],
      conflictsWith: ['natbib'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/biblatex',
      commonErrors: [
        { symptom: 'Empty bibliography', cause: 'Biber not run or \\addbibresource path is wrong', fix: 'Run biber instead of bibtex; check the .bib file path in \\addbibresource' },
        { symptom: 'Undefined citation', cause: 'Citation key not found in the bib resource', fix: 'Verify the key in your .bib file; run biber to process it' },
      ],
    },
  ],
  [
    'csquotes',
    {
      name: 'csquotes',
      description: 'Context-sensitive quotation marks with automatic language-aware opening/closing quotes.',
      category: 'bibliography',
      provides: {
        commands: ['\\enquote', '\\blockquote', '\\foreignquote', '\\hyphenquote', '\\textquote', '\\MakeOuterQuote'],
        environments: ['quote', 'quotation', 'displayquote'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['biblatex'],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/csquotes',
      commonErrors: [
        { symptom: 'Wrong quotation marks for language', cause: 'Language not properly set via babel or polyglossia', fix: 'Load babel or polyglossia with the correct language option before csquotes' },
      ],
    },
  ],
  [
    'biblatex-apa',
    {
      name: 'biblatex-apa',
      description: 'APA 7th edition citation and bibliography style for biblatex.',
      category: 'bibliography',
      provides: {
        commands: [],
        environments: [],
        counters: [],
      },
      requires: ['biblatex'],
      mustLoadAfter: ['biblatex'],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/biblatex-apa',
      commonErrors: [
        { symptom: 'Missing DOI or URL warnings', cause: 'APA style expects DOI/URL fields for online sources', fix: 'Add doi or url fields to your bib entries' },
      ],
    },
  ],

  // ── Layout (6 packages) ──────────────────────────────────────
  [
    'geometry',
    {
      name: 'geometry',
      description: 'Page layout management: margins, paper size, orientation, and binding offset.',
      category: 'layout',
      provides: {
        commands: ['\\geometry', '\\newgeometry', '\\restoregeometry', '\\paperwidth', '\\paperheight'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['fancyhdr', 'hyperref'],
      conflictsWith: ['vmargin', 'analog'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/geometry',
      commonErrors: [
        { symptom: 'Package geometry Error: Bad geometry specification', cause: 'Invalid margin value or syntax error in \\geometry options', fix: 'Check that all margin values use valid units (mm, cm, in) and are separated by commas' },
        { symptom: '\\geometry loaded too late', cause: 'geometry must be loaded early in the preamble', fix: 'Move \\usepackage{geometry} to the top of the preamble, after fontenc/inputenc' },
      ],
    },
  ],
  [
    'fancyhdr',
    {
      name: 'fancyhdr',
      description: 'Customizable headers and footers with per-page-style control.',
      category: 'layout',
      provides: {
        commands: ['\\pagestyle', '\\fancyhead', '\\fancyfoot', '\\fancyhf', '\\fancypagestyle', '\\renewcommand{\\headrulewidth}', '\\leftmark', '\\rightmark', '\\nouppercase'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref'],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/fancyhdr',
      commonErrors: [
        { symptom: 'Header/footer too wide or misaligned', cause: 'Geometry settings changed after fancyhdr initialization', fix: 'Load fancyhdr after geometry; use \\fancyhfoffset for adjustments' },
      ],
    },
  ],
  [
    'tcolorbox',
    {
      name: 'tcolorbox',
      description: 'Highly customizable colored and framed text boxes with many options for styling.',
      category: 'layout',
      provides: {
        commands: ['\\tcbset', '\\newtcolorbox', '\\tcbox', '\\tcbuselibrary', '\\DeclareTColorBox'],
        environments: ['tcolorbox'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/tcolorbox',
      commonErrors: [
        { symptom: 'Missing tikz library', cause: 'tcolorbox depends on TikZ which may not be fully loaded', fix: 'Ensure tikz is available; tcolorbox loads it automatically but some libraries may need manual loading' },
      ],
    },
  ],
  [
    'needspace',
    {
      name: 'needspace',
      description: 'Prevents page breaks within critical sections by checking remaining page space.',
      category: 'layout',
      provides: {
        commands: ['\\needspace'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/needspace',
      commonErrors: [
        { symptom: 'Infinite loop or no effect', cause: 'The requested space exceeds the page height', fix: 'Reduce the space argument to be less than \\textheight' },
      ],
    },
  ],
  [
    'afterpage',
    {
      name: 'afterpage',
      description: 'Execute commands after the current page is finished output.',
      category: 'layout',
      provides: {
        commands: ['\\afterpage', '\\afterpage*'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/afterpage',
      commonErrors: [],
    },
  ],
  [
    'footmisc',
    {
      name: 'footmisc',
      description: 'Enhanced footnote formatting: hanging indent, multiple columns, per-chapter numbering.',
      category: 'layout',
      provides: {
        commands: ['\\footnotemark', '\\footnotetext'],
        environments: [],
        counters: ['footnote'],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref'],
      conflictsWith: ['footnpag', 'fnpct'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/footmisc',
      commonErrors: [
        { symptom: 'Footnotes reset not working', cause: 'Per-chapter reset requires the correct option', fix: 'Use \\usepackage[perpage]{footmisc} or manage counters manually' },
      ],
    },
  ],

  // ── Code (4 packages) ────────────────────────────────────────
  [
    'listings',
    {
      name: 'listings',
      description: 'Typeset source code listings with syntax highlighting, line numbering, and style customization.',
      category: 'code',
      provides: {
        commands: ['\\lstset', '\\lstinline', '\\lstinputlisting', '\\lstnewenvironment', '\\lstdefinestyle', '\\lstdefinelanguage'],
        environments: ['lstlisting'],
        counters: ['lstlisting'],
      },
      requires: ['xcolor'],
      mustLoadAfter: ['xcolor'],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/listings',
      commonErrors: [
        { symptom: 'Unicode characters not supported', cause: 'listings does not handle UTF-8 characters in code by default', fix: 'Use \\lstset{literate=...} to map Unicode chars or switch to minted' },
        { symptom: 'Code too long for page', cause: 'Long code lines overflow the page margin', fix: 'Enable breaklines=true in \\lstset or use \\begin{lstlisting}[breaklines=true]' },
      ],
    },
  ],
  [
    'algorithm2e',
    {
      name: 'algorithm2e',
      description: 'Floating algorithm environments with typeset pseudocode using keyword commands.',
      category: 'code',
      provides: {
        commands: ['\\SetAlgoLined', '\\SetAlgoNoLine', '\\KwIn', '\\KwOut', '\\KwData', '\\KwResult', '\\If', '\\While', '\\For', '\\Return'],
        environments: ['algorithm', 'algorithm*'],
        counters: ['algorithm'],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: ['algorithmicx', 'algpseudocode', 'algorithm'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/algorithm2e',
      commonErrors: [
        { symptom: 'algorithm environment undefined', cause: 'Loading algorithmicx alongside algorithm2e causes conflicts', fix: 'Use only one algorithm package; algorithm2e is more feature-rich' },
      ],
    },
  ],
  [
    'algorithmicx',
    {
      name: 'algorithmicx',
      description: 'Algorithm typesetting framework that separates the floating environment from the typesetting style.',
      category: 'code',
      provides: {
        commands: ['\\algorithmicrequire', '\\algorithmicensure', '\\algorithmicforall', '\\algorithmicreturn'],
        environments: ['algorithmic'],
        counters: ['algocf', 'algorithm'],
      },
      requires: ['algorithm'],
      mustLoadAfter: ['algorithm'],
      mustLoadBefore: [],
      conflictsWith: ['algorithm2e'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/algorithmicx',
      commonErrors: [
        { symptom: 'Undefined algorithmic environment', cause: 'algorithmicx requires a layout style package (algpseudocode, algpascal, etc.)', fix: 'Load algpseudocode for pseudo-code style: \\usepackage{algpseudocode}' },
      ],
    },
  ],
  [
    'algpseudocode',
    {
      name: 'algpseudocode',
      description: 'Pseudo-code style layout for algorithmicx. Provides If/While/For/Return and other keywords.',
      category: 'code',
      provides: {
        commands: ['\\If', '\\ElsIf', '\\Else', '\\While', '\\For', 'ForAll', '\\Repeat', '\\Until', '\\Return', '\\State', '\\Call'],
        environments: ['algorithmic'],
        counters: [],
      },
      requires: ['algorithmicx'],
      mustLoadAfter: ['algorithmicx'],
      mustLoadBefore: [],
      conflictsWith: ['algorithm2e'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/algorithmicx',
      commonErrors: [
        { symptom: 'Undefined control sequence \\State', cause: 'algpseudocode not loaded; only algorithmicx base is present', fix: 'Add \\usepackage{algpseudocode} after \\usepackage{algorithm}' },
      ],
    },
  ],

  // ── Language (3 packages) ────────────────────────────────────
  [
    'babel',
    {
      name: 'babel',
      description: 'Multilingual support for pdflatex. Provides language-specific hyphenation, typography, and captions.',
      category: 'language',
      provides: {
        commands: ['\\selectlanguage', '\\foreignlanguage', '\\babelprovide', '\\babelsublr', '\\babeltags'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref', 'cleveref'],
      conflictsWith: ['polyglossia'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/babel',
      commonErrors: [
        { symptom: 'Unknown language', cause: 'The requested language is not supported by the current babel installation', fix: 'Check available languages with texdoc babel; install additional language packages if needed' },
      ],
    },
  ],
  [
    'polyglossia',
    {
      name: 'polyglossia',
      description: 'Modern multilingual support for XeLaTeX and LuaLaTeX. Replaces babel for Unicode engines.',
      category: 'language',
      provides: {
        commands: ['\\setdefaultlanguage', '\\setotherlanguage', '\\setmainlanguage', '\\newfontfamily'],
        environments: [],
        counters: [],
      },
      requires: ['fontspec'],
      mustLoadAfter: ['fontspec'],
      mustLoadBefore: ['hyperref'],
      conflictsWith: ['babel'],
      compilerSupport: ['xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/polyglossia',
      commonErrors: [
        { symptom: 'Language hyphenation not working', cause: 'Polyglossia may not find hyphenation patterns for the language', fix: 'Ensure the language patterns are installed in TeX Live; some languages may need babel as fallback' },
      ],
    },
  ],
  [
    'ctex',
    {
      name: 'ctex',
      description: 'Comprehensive Chinese typesetting support for XeLaTeX and LuaLaTeX with document class and package options.',
      category: 'language',
      provides: {
        commands: ['\\CTEXsetup', '\\CTEXoptions', '\\ccentury', '\\zihao'],
        environments: ['ctexart', 'ctexbook', 'ctexrep', 'ctexbeamer'],
        counters: [],
      },
      requires: ['fontspec'],
      mustLoadAfter: ['fontspec'],
      mustLoadBefore: ['hyperref'],
      conflictsWith: ['inputenc', 'fontenc', 'babel', 'polyglossia'],
      compilerSupport: ['xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/ctex',
      commonErrors: [
        { symptom: 'Chinese characters not displayed', cause: 'Chinese fonts not found on the system', fix: 'Install Chinese fonts (SimSun, SimHei, FangSong, KaiTi) or use ctex with auto font detection' },
        { symptom: 'Font warning: Font ... not found', cause: 'ctex cannot find the default Chinese fonts', fix: 'Set font options in ctex: \\usepackage[fontset=none]{ctex} and specify fonts with \\setCJKmainfont' },
      ],
    },
  ],

  // ── Misc (8 packages) ────────────────────────────────────────
  [
    'hyperref',
    {
      name: 'hyperref',
      description: 'PDF hyperlinks, cross-references, bookmarks, and metadata. Must load near the end of the preamble.',
      category: 'misc',
      provides: {
        commands: ['\\href', '\\url', '\\hyperlink', '\\hypertarget', '\\hyperref', '\\autoref', '\\pdfauthor', '\\pdftitle', '\\hypersetup', '\\phantomsection'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: ['xcolor'],
      mustLoadBefore: ['cleveref'],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/hyperref',
      commonErrors: [
        { symptom: 'Token not allowed in a PDF string', cause: 'Math commands or special characters used in section titles that hyperref tries to make into PDF bookmarks', fix: 'Use \\texorpdfstring{<tex>}{<pdf text>} to provide plain text for bookmarks' },
        { symptom: 'Rerun to get cross-references right', cause: 'hyperref needs multiple compilation passes', fix: 'Compile twice: pdflatex → pdflatex to resolve all references' },
      ],
    },
  ],
  [
    'cleveref',
    {
      name: 'cleveref',
      description: 'Smart cross-references that automatically prepend "Figure", "Table", "Equation" etc. based on the referenced type.',
      category: 'misc',
      provides: {
        commands: ['\\cref', '\\Cref', '\\crefrange', '\\Crefrange', '\\crefname', '\\Crefname', '\\crefalias'],
        environments: [],
        counters: [],
      },
      requires: ['hyperref'],
      mustLoadAfter: ['hyperref'],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/cleveref',
      commonErrors: [
        { symptom: 'cleveref loaded before hyperref', cause: 'cleveref must load after hyperref to access reference metadata', fix: 'Move \\usepackage{cleveref} to after \\usepackage{hyperref}' },
        { symptom: 'Wrong reference type', cause: 'A custom environment is not registered with cleveref', fix: 'Use \\crefname{<env>}{<singular>}{<plural>} to register custom environments' },
      ],
    },
  ],
  [
    'varioref',
    {
      name: 'varioref',
      description: 'Smart page-referencing commands: \\vref, \\vpageref that automatically say "on the next page" etc.',
      category: 'misc',
      provides: {
        commands: ['\\vref', '\\Vref', '\\vpageref', '\\Vpageref', '\\fullref', '\\labelformat', '\\reftextvario'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref'],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/varioref',
      commonErrors: [
        { symptom: 'Undefined reference', cause: 'varioref needs at least two compilation passes', fix: 'Run pdflatex twice to resolve varioref references' },
      ],
    },
  ],
  [
    'xcolor',
    {
      name: 'xcolor',
      description: 'Extended color support with named colors, color mixing, and color models. Required by many packages.',
      category: 'misc',
      provides: {
        commands: ['\\definecolor', '\\color', '\\textcolor', '\\colorbox', '\\fcolorbox', '\\rowcolor', '\\cellcolor', '\\arrayrulecolor', '\\colorlet', '\\blendcolors', '\\providecolor'],
        environments: [],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref'],
      conflictsWith: ['color'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/xcolor',
      commonErrors: [
        { symptom: 'Color not defined', cause: 'Using a named color not available in the loaded color set', fix: 'Load with dvipsnames and/or svgnames options: \\usepackage[dvipsnames,svgnames]{xcolor}' },
        { symptom: 'Option clash for package xcolor', cause: 'Another package loads xcolor with different options first', fix: 'Load xcolor first with all needed options, or use \\PassOptionsToPackage' },
      ],
    },
  ],
  [
    'acronym',
    {
      name: 'acronym',
      description: 'Support for acronyms with first-use expansion. Deprecated in favor of glossaries-extra.',
      category: 'misc',
      provides: {
        commands: ['\\acrodef', '\\acs', '\\ac', '\\acf', '\\acp', '\\acl', '\\acused'],
        environments: ['acronym', 'acronym'],
        counters: [],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: ['glossaries'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/acronym',
      commonErrors: [
        { symptom: 'Acronym undefined', cause: 'The acronym was not defined with \\acrodef before use', fix: 'Define all acronyms in a dedicated section using the acronym environment' },
      ],
    },
  ],
  [
    'glossaries',
    {
      name: 'glossaries',
      description: 'Comprehensive glossary, acronym, symbol, and nomenclature support with makeglossaries tool.',
      category: 'misc',
      provides: {
        commands: ['\\newglossaryentry', '\\gls', '\\Gls', '\\glspl', '\\Glspl', '\\newacronym', '\\printglossary', '\\printglossaries', '\\glsadd', '\\glsresetall'],
        environments: ['glossary', 'acronym', 'symbols', 'notation'],
        counters: ['glossarysection'],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref'],
      conflictsWith: ['acronym'],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/glossaries',
      commonErrors: [
        { symptom: 'Glossary is empty', cause: 'makeglossaries was not run or \\printglossaries is missing', fix: 'Run makeglossaries between compilation passes; ensure \\printglossaries is in the document' },
        { symptom: 'Undefined glossary entry', cause: 'Glossary entries not defined before use or makeglossaries not run', fix: 'Define entries in preamble or external file; run the full compilation: pdflatex → makeglossaries → pdflatex' },
      ],
    },
  ],
  [
    'nomencl',
    {
      name: 'nomencl',
      description: 'Nomenclature list generation using the makeindex tool. Common in physics and engineering theses.',
      category: 'misc',
      provides: {
        commands: ['\\nomenclature', '\\printnomenclature', '\\nomentrywidth', '\\makenomenclature'],
        environments: ['thenomenclature'],
        counters: ['nomenclature'],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: ['hyperref'],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/nomencl',
      commonErrors: [
        { symptom: 'Empty nomenclature list', cause: 'makeindex not run for the .nlo file', fix: 'Run: makeindex <filename>.nlo -s nomencl.ist -o <filename>.nls' },
      ],
    },
  ],
  [
    'makeidx',
    {
      name: 'makeidx',
      description: 'Standard index generation support. Creates an index using the makeindex tool.',
      category: 'misc',
      provides: {
        commands: ['\\makeindex', '\\index', '\\printindex', '\\see', '\\seealso', '\\indexspace'],
        environments: ['theindex'],
        counters: ['index'],
      },
      requires: [],
      mustLoadAfter: [],
      mustLoadBefore: [],
      conflictsWith: [],
      compilerSupport: ['pdflatex', 'xelatex', 'lualatex'],
      overleafSupport: true,
      documentationUrl: 'https://ctan.org/pkg/makeidx',
      commonErrors: [
        { symptom: 'Index is empty', cause: 'makeindex was not run', fix: 'Run makeindex <filename>.idx between pdflatex passes' },
        { symptom: 'Undefined index entries', cause: 'Index references need multiple compilation passes', fix: 'Compile: pdflatex → makeindex → pdflatex → pdflatex' },
      ],
    },
  ],
]);

// ============================================================
// Unicode Escape Map — For pdflatex compatibility
// Maps Unicode code points to LaTeX escape sequences.
// ============================================================

export const UNICODE_ESCAPE_MAP: Map<number, string> = new Map([
  // Latin extended accents
  [0xE9, "\\\'{e}"],     // é
  [0xE8, "\\\`{e}"],     // è
  [0xEA, "\\^{e}"],      // ê
  [0xEB, "\\\"{e}"],     // ë
  [0xF1, "\\~{n}"],      // ñ
  [0xFC, "\\\"{u}"],     // ü
  [0xF6, "\\\"{o}"],     // ö
  [0xE4, "\\\"{a}"],     // ä
  [0xDF, "\\ss{}"],       // ß
  [0xE7, "\\c{c}"],      // ç
  [0xE0, "\\\`{a}"],     // à
  [0xF9, "\\\`{u}"],     // ù
  [0xEC, "\\\`{i}"],     // ì
  [0xF3, "\\\'{o}"],     // ó
  [0xFA, "\\\'{u}"],     // ú
  [0xE1, "\\\'{a}"],     // á
  [0xED, "\\\'{\\i}"],   // í
  // Greek letters (need math mode)
  [0x03B1, "$\\alpha$"],   // α
  [0x03B2, "$\\beta$"],    // β
  [0x03B3, "$\\gamma$"],   // γ
  [0x03B4, "$\\delta$"],   // δ
  [0x03B5, "$\\varepsilon$"], // ε
  [0x03B8, "$\\theta$"],   // θ
  [0x03BB, "$\\lambda$"],  // λ
  [0x03BC, "$\\mu$"],      // μ
  [0x03C0, "$\\pi$"],      // π
  [0x03C3, "$\\sigma$"],   // σ
  [0x03C9, "$\\omega$"],   // ω
  [0x03A9, "$\\Omega$"],   // Ω
  [0x0394, "$\\Delta$"],   // Δ
  // Symbols
  [0x2192, "$\\rightarrow$"],  // →
  [0x2190, "$\\leftarrow$"],   // ←
  [0x2194, "$\\leftrightarrow$"], // ↔
  [0x2191, "$\\uparrow$"],     // ↑
  [0x2193, "$\\downarrow$"],   // ↓
  [0x00D7, "$\\times$"],     // ×
  [0x00F7, "$\\div$"],       // ÷
  [0x00B1, "$\\pm$"],        // ±
  [0x2264, "$\\leq$"],       // ≤
  [0x2265, "$\\geq$"],       // ≥
  [0x2260, "$\\neq$"],       // ≠
  [0x2248, "$\\approx$"],    // ≈
  [0x221E, "$\\infty$"],     // ∞
  [0x2208, "$\\in$"],        // ∈
  [0x2203, "$\\exists$"],    // ∃
  [0x2200, "$\\forall$"],    // ∀
  [0x222A, "$\\cup$"],       // ∪
  [0x2229, "$\\cap$"],       // ∩
  [0x2282, "$\\subset$"],    // ⊂
  [0x2283, "$\\supset$"],    // ⊃
  [0x2207, "$\\nabla$"],     // ∇
  [0x2202, "$\\partial$"],   // ∂
  [0x2211, "$\\sum$"],       // ∑
  [0x222B, "$\\int$"],       // ∫
  [0x221A, "$\\sqrt$"],      // √
  // Punctuation
  [0x2014, "---"],            // — (em dash)
  [0x2013, "--"],             // – (en dash)
  [0x201C, "``"],            // "
  [0x201D, "''"],            // "
  [0x2018, "`"],             // '
  [0x2019, "'"],             // '
  [0x2026, "\\ldots{}"],     // …
  [0x00A0, "~"],             // non-breaking space
  // Currency
  [0x20AC, "\\euro{}"],      // €
  [0x00A3, "\\pounds{}"],    // £
  [0x00A5, "\\yen{}"],       // ¥
  [0x00A2, "\\cent{}"],      // ¢
  // Special
  [0x00A9, "\\textcopyright{}"],  // ©
  [0x2122, "\\texttrademark{}"],  // ™
  [0x00AE, "\\textregistered{}"], // ®
  [0x2022, "\\textbullet{}"],    // •
]);

/**
 * Escape Unicode characters in text for pdflatex compatibility.
 * Characters outside ASCII (> 0x7E) are replaced with LaTeX commands
 * where possible. Unknown characters are passed through unchanged.
 */
export function escapeUnicodeForPdflatex(text: string): { escaped: string; unknownChars: number[] } {
  let result = '';
  const unknownChars: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7E) {
      const replacement = UNICODE_ESCAPE_MAP.get(code);
      if (replacement) {
        result += replacement;
      } else {
        unknownChars.push(code);
        result += text[i]; // keep original
      }
    } else {
      result += text[i];
    }
  }
  return { escaped: result, unknownChars: [...new Set(unknownChars)] };
}

// ============================================================
// Registry Query Functions
// ============================================================

/**
 * Look up a package by name in the registry.
 * Returns undefined if the package is not found.
 */
export function lookupPackage(name: string): PackageRegistryEntry | undefined {
  return LATEX_PACKAGE_REGISTRY.get(name);
}

/**
 * Get all packages in a given category.
 * Returns an empty array if the category is invalid or has no packages.
 */
export function getPackagesByCategory(category: PackageCategory): PackageRegistryEntry[] {
  const results: PackageRegistryEntry[] = [];
  for (const entry of LATEX_PACKAGE_REGISTRY.values()) {
    if (entry.category === category) {
      results.push(entry);
    }
  }
  return results;
}

/**
 * Check for conflicts among a list of packages.
 * Returns an array of conflict objects, each containing the package name
 * and the list of conflicting packages from the input set.
 */
export function checkPackageConflicts(packageNames: string[]): Array<{ pkg: string; conflicts: string[] }> {
  const nameSet = new Set(packageNames);
  const conflicts: Array<{ pkg: string; conflicts: string[] }> = [];

  for (const name of packageNames) {
    const entry = LATEX_PACKAGE_REGISTRY.get(name);
    if (!entry) continue;

    const found: string[] = [];
    for (const conflictName of entry.conflictsWith) {
      if (nameSet.has(conflictName)) {
        found.push(conflictName);
      }
    }

    if (found.length > 0) {
      conflicts.push({ pkg: name, conflicts: found });
    }
  }

  return conflicts;
}

/**
 * Suggest packages based on a set of LaTeX commands found in the document.
 * Returns packages whose `provides.commands` list intersects with the given commands.
 * Results are sorted by the number of matching commands (most relevant first).
 */
export function getSuggestedPackagesForCommands(commands: Set<string>): PackageRegistryEntry[] {
  const scored: Array<{ entry: PackageRegistryEntry; score: number }> = [];

  for (const entry of LATEX_PACKAGE_REGISTRY.values()) {
    let score = 0;
    for (const cmd of entry.provides.commands) {
      if (commands.has(cmd)) {
        score++;
      }
    }
    // Also check environments (strip \begin{} wrapper)
    for (const env of entry.provides.environments) {
      if (commands.has(`\\begin{${env}}`)) {
        score += 2; // environments are stronger signals
      }
    }
    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.entry);
}
