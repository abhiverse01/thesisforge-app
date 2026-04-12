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

  return PACKAGE_MANIFEST
    .filter(entry => {
      if (entry.conditional === 'hasCode' && !hasCode) return false;
      if (entry.conditional === 'hasMath' && !hasMath) return false;
      if (entry.conditional === 'isReport' && !isReport) return false;
      return true;
    })
    .concat(extraPackages)
    .filter((pkg, idx, arr) => {
      // Deduplicate — keep first occurrence
      return arr.findIndex(p => p.name === pkg.name) === idx;
    })
    .map(entry => ({
      name: entry.pkg,
      options: [...entry.opts],
      purpose: entry.purpose,
    }));
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
  lines.push(`\\setcounter{secnumdepth}{${data.options.tocDepth}}`);

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
