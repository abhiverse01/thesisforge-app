// ============================================================
// ThesisForge Intelligence — LaTeX Expert Analyzer
// Comprehensive analysis engine for thesis LaTeX documents.
// Provides: compilation error detection with package suggestions,
// structure validation, writing quality, and intelligent warning
// classification. Minimal-change policy — never removes valid constructs.
//
// Pure function. No side effects. No DOM access. No async.
// ============================================================

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ExpertSeverity = 'critical' | 'major' | 'minor' | 'suggestion';
export type ExpertCategory = 'compilation' | 'package' | 'structure' | 'writing' | 'style' | 'bibliography' | 'encoding';

export interface ExpertIssue {
  id: string;
  severity: ExpertSeverity;
  category: ExpertCategory;
  title: string;
  detail: string;
  line?: number;
  context?: string;
  fix?: string;           // Suggested minimal fix
  packageSuggestion?: string; // Package to add if command is unknown
  isStylistic: boolean;   // true = suggestion, false = critical fix
}

export interface ExpertResult {
  issues: ExpertIssue[];
  criticalFixes: ExpertIssue[];   // Must fix before compilation
  improvements: ExpertIssue[];    // Suggested improvements
  stats: {
    totalIssues: number;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    suggestionCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    longSentenceCount: number;     // > 50 words
    veryLongSentenceCount: number; // > 80 words
    estimatedReadabilityScore: number; // 0-100
  };
  suggestedPackages: Array<{ pkg: string; reason: string; commands: string[] }>;
}

// ─────────────────────────────────────────────────────────────
// Valid LaTeX Commands Whitelist
// Commands that should NEVER be flagged as unknown or erroneous.
// ─────────────────────────────────────────────────────────────

const VALID_LATEX_COMMANDS = new Set([
  // Structural spacing & layout (commonly flagged by mistake)
  'par', 'vfill', 'hfill', 'vspace', 'hspace', 'smallskip', 'medskip',
  'bigskip', 'fill', 'newline', 'linebreak', 'pagebreak', 'newpage',
  'clearpage', 'cleardoublepage', 'noindent', 'indent', 'parskip',
  'baselineskip', 'linespread', 'setlength', 'addtolength',

  // Font switching commands (valid in any context)
  'bfseries', 'itshape', 'slshape', 'scshape', 'sffamily', 'ttfamily',
  'rmfamily', 'upshape', 'tiny', 'scriptsize', 'footnotesize', 'small',
  'normalsize', 'large', 'Large', 'LARGE', 'huge', 'Huge',
  'textnormal', 'mdseries', 'bf', 'it', 'rm', 'sl', 'sc', 'sf', 'tt',

  // Box & rule commands
  'mbox', 'makebox', 'fbox', 'framebox', 'rule', 'hrule', 'vrule',
  'hrulefill', 'dotfill', 'strut', 'phantom', 'hphantom', 'vphantom',
  'raisebox', 'parbox', 'minipage', 'colorbox', 'fcolorbox',

  // Alignment
  'centering', 'raggedright', 'raggedleft', 'justifying',
  'flushleft', 'flushright',

  // Cross-references & citations
  'label', 'ref', 'pageref', 'eqref', 'cref', 'Cref', 'autoref',
  'nameref', 'vref', 'fullref', 'cite', 'citep', 'citet', 'citeauthor',
  'citeyear', 'nocite', 'bibitem', 'newblock', 'harvarditem',

  // Caption & float
  'caption', 'captionof', 'centering', 'includegraphics',

  // Common text formatting
  'textbf', 'textit', 'textsc', 'texttt', 'textsf', 'textrm',
  'emph', 'underline', 'textsuperscript', 'textsubscript',
  'uppercase', 'lowercase', 'MakeUppercase', 'MakeLowercase',
  'footnote', 'footnotemark', 'footnotetext',

  // Math operators
  'frac', 'dfrac', 'tfrac', 'sqrt', 'sum', 'int', 'prod', 'coprod',
  'bigcup', 'bigcap', 'bigsqcup', 'bigvee', 'bigwedge', 'bigotimes',
  'bigoplus', 'bigodot', 'oint', 'iint', 'iiint', 'idotsint',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi',
  'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon',
  'Phi', 'Psi', 'Omega',
  'infty', 'partial', 'nabla', 'forall', 'exists', 'nexists',
  'left', 'right', 'bigl', 'bigr', 'Bigl', 'Bigr',
  'text', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathcal',
  'mathbb', 'mathfrak', 'mathscr', 'mathds', 'bm', 'boldsymbol',
  'hat', 'tilde', 'bar', 'vec', 'dot', 'ddot', 'dddot', 'check',
  'breve', 'acute', 'grave', 'widehat', 'widetilde', 'overrightarrow',
  'overleftarrow', 'overline', 'underline', 'overbrace', 'underbrace',
  'stackrel', 'overset', 'underset', 'boxed', 'limits', 'nolimits',
  'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
  'sin', 'cos', 'tan', 'log', 'exp', 'lim', 'sup', 'inf', 'min', 'max',
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'det', 'dim', 'ker', 'hom', 'Pr', 'deg', 'arg', 'gcd', 'ln',
  'pm', 'mp', 'times', 'div', 'cdot', 'ast', 'star', 'circ', 'bullet',
  'oplus', 'ominus', 'otimes', 'oslash', 'odot', 'dagger', 'ddagger',
  'cap', 'cup', 'uplus', 'sqcap', 'sqcup', 'vee', 'wedge', 'setminus',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'simeq', 'cong',
  'propto', 'll', 'gg', 'prec', 'succ', 'preceq', 'succeq',
  'subset', 'supset', 'subseteq', 'supseteq', 'in', 'notin', 'ni',
  'vdash', 'dashv', 'models', 'land', 'lor', 'neg', 'lnot',
  'Rightarrow', 'Leftarrow', 'Leftrightarrow', 'implies', 'iff',
  'mapsto', 'longmapsto', 'rightarrow', 'leftarrow', 'longrightarrow',
  'longleftarrow', 'uparrow', 'downarrow', 'Uparrow', 'Downarrow',
  'rightleftharpoons', 'aleph', 'beth', 'ell', 'wp', 'Re', 'Im',
  'emptyset', 'varnothing', 'surd', 'top', 'bot', 'angle', 'triangle',
  'diamond', 'square', 'clubsuit', 'diamondsuit', 'heartsuit', 'spadesuit',
  'sharp', 'flat', 'natural', 'ldotp', 'cdotp', 'colon',

  // Document structure
  'documentclass', 'usepackage', 'begin', 'end', 'part', 'chapter',
  'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph',
  'item', 'title', 'author', 'date', 'maketitle', 'thanks',
  'tableofcontents', 'listoffigures', 'listoftables',
  'bibliography', 'bibliographystyle', 'appendix',
  'frontmatter', 'mainmatter', 'backmatter',
  'include', 'input', 'includeonly',

  // Counters & lengths
  'setcounter', 'stepcounter', 'refstepcounter', 'counterwithin',
  'newcounter', 'value', 'the', 'arabic', 'roman', 'Roman',
  'alph', 'Alph', 'fnsymbol', 'pagestyle', 'thispagestyle',

  // Definitions
  'newcommand', 'renewcommand', 'newenvironment', 'renewenvironment',
  'def', 'let', 'newtheorem', 'newacronym', 'providecommand',
  'DeclareMathOperator', 'DeclarePairedDelimiter', 'DeclareRobustCommand',

  // Hyperlinks & URLs
  'href', 'url', 'hyperlink', 'hypertarget', 'nolinkurl',
  'pdfauthor', 'pdftitle', 'pdfsubject', 'pdfkeywords',
  'phantomsection',

  // Table commands
  'hline', 'cline', 'toprule', 'midrule', 'bottomrule', 'multicolumn',
  'multirow', 'addlinespace', 'cmidrule', 'newpage',
  'tabularnewline', 'arraybackslash', 'extrarowheight',
  'rowcolor', 'cellcolor', 'columncolor',

  // Spacing & measurement
  'quad', 'qquad', 'enspace', 'thinspace', 'negthinspace',
  'enskip', 'exskip', 'fill', 'stretch',

  // Misc
  'today', 'ldots', 'cdots', 'vdots', 'ddots',
  'verb', 'verb*', 'obeycr', 'and',
  'selectlanguage', 'foreignlanguage', 'includegraphics',
  'graphicspath', 'subfloat', 'subfigure', 'subtable',
  'crefname', 'Crefname', 'labelcref',
  'geometry', 'onehalfspacing', 'doublespacing', 'singlespacing',
  'setstretch', 'microtypesetup', 'fancyhf', 'fancyhead', 'fancyfoot',
  'fancypagestyle', 'lhead', 'rhead', 'chead', 'lfoot', 'rfoot', 'cfoot',
  'renewcommand', 'lstset', 'lstlisting', 'lstinline',
  'tikz', 'node', 'draw', 'fill', 'path', 'coordinate', 'foreach',
  'pic', 'usetikzlibrary', 'tikzset',
  'addplot', 'addlegendentry', 'pgfplotsset', 'legend',
  'todo', 'todoline', 'todomark', 'missingfigure', 'listoftodos',
  'newglossaryentry', 'gls', 'glspl', 'printglossaries',
  'newacronym', 'glossarystyle', 'makenoidxglossaries', 'printnoidxglossary',
  'makenomenclature', 'printnomenclature', 'nomenclature',
  'makeindex', 'printindex', 'index',
  'newtcolorbox', 'tcolorbox', 'tcbox', 'tcblibrary', 'tcbset',
  'FloatBarrier',
  'xspace', 'SI', 'si', 'num', 'qty', 'unit', 'DeclareSIUnit',
  'subcaptionbox', 'ContinuedFloat',
]);

// ─────────────────────────────────────────────────────────────
// Command → Package Suggestion Map
// When an unknown command is found, suggest the package that provides it.
// ─────────────────────────────────────────────────────────────

const COMMAND_TO_PACKAGE: Record<string, { pkg: string; commands?: string[] }> = {
  // Colors
  'definecolor':        { pkg: 'xcolor', commands: ['\\definecolor', '\\color', '\\textcolor', '\\colorbox'] },
  'textcolor':          { pkg: 'xcolor', commands: ['\\definecolor', '\\color', '\\textcolor'] },
  'colorbox':           { pkg: 'xcolor', commands: ['\\definecolor', '\\color', '\\colorbox'] },
  'fcolorbox':          { pkg: 'xcolor', commands: ['\\fcolorbox'] },
  'colorlet':           { pkg: 'xcolor', commands: ['\\colorlet'] },
  'rowcolor':           { pkg: 'xcolor', commands: ['\\rowcolor', '\\cellcolor'] },
  'cellcolor':          { pkg: 'xcolor', commands: ['\\rowcolor', '\\cellcolor'] },
  'columncolor':        { pkg: 'xcolor' },
  'selectcolormodel':   { pkg: 'xcolor' },

  // Algorithms
  'SetAlgoLined':       { pkg: 'algorithm2e' },
  'SetKw':              { pkg: 'algorithm2e' },
  'SetKwInput':         { pkg: 'algorithm2e' },
  'SetKwInOut':         { pkg: 'algorithm2e' },
  'KwIn':               { pkg: 'algorithm2e' },
  'KwOut':              { pkg: 'algorithm2e' },
  'KwData':             { pkg: 'algorithm2e' },
  'KwResult':           { pkg: 'algorithm2e' },
  'eIf':                { pkg: 'algorithm2e' },
  'Procedure':          { pkg: 'algpseudocode' },
  'Require':            { pkg: 'algpseudocode' },
  'Ensure':             { pkg: 'algpseudocode' },
  'Call':               { pkg: 'algpseudocode' },

  // Math
  'coloneqq':           { pkg: 'mathtools' },
  'eqqcolon':           { pkg: 'mathtools' },
  'prescript':          { pkg: 'mathtools' },
  'mathclap':           { pkg: 'mathtools' },
  'shortintertext':     { pkg: 'mathtools' },
  'dcases':             { pkg: 'mathtools' },
  'rcases':             { pkg: 'mathtools' },
  'multlined':          { pkg: 'mathtools' },
  'lgathered':          { pkg: 'mathtools' },
  'rgathered':          { pkg: 'mathtools' },
  'spreadlines':        { pkg: 'mathtools' },
  'mathbb':             { pkg: 'amssymb' },
  'mathfrak':           { pkg: 'amssymb' },
  'iint':               { pkg: 'amssymb' },
  'iiint':              { pkg: 'amssymb' },
  'idotsint':           { pkg: 'amssymb' },
  'boldsymbol':         { pkg: 'amsmath', commands: ['\\boldsymbol'] },

  // Font
  'setmainfont':        { pkg: 'fontspec' },
  'setsansfont':        { pkg: 'fontspec' },
  'setmonofont':        { pkg: 'fontspec' },
  'setmathfont':        { pkg: 'unicode-math' },

  // Glossaries
  'newglossaryentry':   { pkg: 'glossaries' },
  'gls':                { pkg: 'glossaries' },
  'glspl':              { pkg: 'glossaries' },

  // Caption
  'captionsetup':       { pkg: 'caption' },
  'captionof':          { pkg: 'caption' },
  'declarecaptionfont': { pkg: 'caption' },

  // Subcaption
  'subcaptionbox':      { pkg: 'subcaption' },

  // Float
  'newfloat':           { pkg: 'float' },
  'floatname':          { pkg: 'float' },
  'restylefloat':       { pkg: 'float' },

  // Sidecap
  'SCfigure':           { pkg: 'sidecap' },
  'SCtable':            { pkg: 'sidecap' },
  'sidecaption':        { pkg: 'sidecap' },

  // SI units
  'qty':                { pkg: 'siunitx' },
  'unit':               { pkg: 'siunitx' },
  'ang':                { pkg: 'siunitx' },
  'DeclareSIUnit':      { pkg: 'siunitx' },

  // Cancel
  'cancel':             { pkg: 'cancel' },
  'bcancel':            { pkg: 'cancel' },
  'xcancel':            { pkg: 'cancel' },
  'cancelto':           { pkg: 'cancel' },

  // tcolorbox
  'newtcolorbox':       { pkg: 'tcolorbox' },
  'tcbox':              { pkg: 'tcolorbox' },
  'tcblibrary':         { pkg: 'tcolorbox' },
  'tcbset':             { pkg: 'tcolorbox' },

  // Wrapfig
  'wrapfigure':         { pkg: 'wrapfig' },
  'wraptable':          { pkg: 'wrapfig' },

  // Rotating
  'sidewaysfigure':     { pkg: 'rotating' },
  'sidewaystable':      { pkg: 'rotating' },

  // Enumitem
  'setitemize':         { pkg: 'enumitem' },
  'setenumerate':       { pkg: 'enumitem' },
  'setdescription':     { pkg: 'enumitem' },

  // Titlesec
  'titleformat':        { pkg: 'titlesec' },
  'titlespacing':       { pkg: 'titlesec' },
  'titlelabel':         { pkg: 'titlesec' },

  // todonotes
  'missingfigure':      { pkg: 'todonotes' },
  'todomark':           { pkg: 'todonotes' },
  'listoftodos':        { pkg: 'todonotes' },
};

// ─────────────────────────────────────────────────────────────
// Known LaTeX Built-ins (for cross-check)
// ─────────────────────────────────────────────────────────────

const LATEX_BUILTINS_EXTENDED = new Set([
  ...VALID_LATEX_COMMANDS,
  // Document class options (used in \documentclass)
  'twocolumn', 'onecolumn', 'twoside', 'oneside', 'landscape',
  'portrait', 'draft', 'final', 'titlepage', 'notitlepage',
  'openright', 'openany', 'openleft', 'leqno', 'fleqn',
  '12pt', '11pt', '10pt',
  // Common environments (appear after \begin{})
  'document', 'frame', 'block', 'alertblock', 'exampleblock',
  'columns', 'column',
]);

// ─────────────────────────────────────────────────────────────
// Sentence Length & Writing Quality
// ─────────────────────────────────────────────────────────────

interface SentenceInfo {
  text: string;
  wordCount: number;
  line: number;
  offset: number;
}

/**
 * Extract sentences from LaTeX text, returning position info.
 * Strips commands and math for word counting.
 */
function extractSentences(tex: string): SentenceInfo[] {
  const lines = tex.split('\n');
  const sentences: SentenceInfo[] = [];
  let offset = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    let line = lines[lineIdx];
    // Skip comments
    const commentIdx = line.indexOf('%');
    if (commentIdx >= 0) line = line.slice(0, commentIdx);
    // Skip blank lines
    if (!line.trim()) { offset += lines[lineIdx].length + 1; continue; }
    // Skip command-only lines
    if (/^\s*\\(documentclass|usepackage|begin|end|section|chapter|bibliography|newcommand|renewcommand|def|let|setlength|setcounter|geometry|pagestyle|thispagestyle|fancyhf|fancyhead|fancyfoot|hypersetup|crefname|bibliographystyle|newtheorem|lstset|newacronym)/.test(line)) {
      offset += lines[lineIdx].length + 1;
      continue;
    }

    // Clean LaTeX commands from text for sentence splitting
    const cleaned = line
      .replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])*(\{[^{}]*\}(\{[^{}]*\})*)*/g, ' ')
      .replace(/[{}$#_^~&%\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) { offset += lines[lineIdx].length + 1; continue; }

    // Split on sentence-ending punctuation
    const parts = cleaned.split(/(?<=[.!?])\s+(?=[A-Z"'(])/);
    for (const part of parts) {
      const words = part.trim().split(/\s+/).filter(Boolean);
      if (words.length >= 5) { // Only count substantial sentences
        sentences.push({
          text: part.trim(),
          wordCount: words.length,
          line: lineIdx + 1,
          offset,
        });
      }
    }
    offset += lines[lineIdx].length + 1;
  }
  return sentences;
}

// ─────────────────────────────────────────────────────────────
// Structure Validation
// ─────────────────────────────────────────────────────────────

function analyzeStructure(tex: string, issues: ExpertIssue[]): void {
  const lines = tex.split('\n');

  // 1. Title page structure
  const hasTitle = /\\title\{[^}]+\}/.test(tex);
  const hasAuthor = /\\author\{[^}]+\}/.test(tex);
  const hasDate = /\\date\{/.test(tex);
  const hasMaketitle = /\\maketitle/.test(tex) || /\\begin\{titlepage\}/.test(tex);

  if (!hasTitle) {
    issues.push({
      id: 'STR-001',
      severity: 'major',
      category: 'structure',
      title: 'Missing \\title{}',
      detail: 'No \\title{} command found. Every thesis must have a title declared in the preamble.',
      isStylistic: false,
    });
  }
  if (!hasAuthor) {
    issues.push({
      id: 'STR-002',
      severity: 'major',
      category: 'structure',
      title: 'Missing \\author{}',
      detail: 'No \\author{} command found. The author name must be declared for the title page.',
      isStylistic: false,
    });
  }
  if (!hasMaketitle && hasTitle) {
    issues.push({
      id: 'STR-003',
      severity: 'minor',
      category: 'structure',
      title: 'No \\maketitle or titlepage environment',
      detail: 'The title and author are declared but \\maketitle (or \\begin{titlepage}) is never called. Add it after \\begin{document}.',
      fix: '\\maketitle',
      isStylistic: false,
    });
  }

  // 2. Table of contents
  if (!/\\tableofcontents/.test(tex)) {
    issues.push({
      id: 'STR-004',
      severity: 'minor',
      category: 'structure',
      title: 'No table of contents',
      detail: 'No \\tableofcontents found. Academic theses require a table of contents after the title page.',
      fix: '\\tableofcontents',
      isStylistic: true,
    });
  }

  // 3. Chapter structure — check for missing labels after chapters/sections
  let inDocument = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/\\begin\{document\}/.test(line)) { inDocument = true; continue; }
    if (/\\end\{document\}/.test(line)) { break; }
    if (!inDocument) continue;

    // Check chapter/section without label
    const chapterMatch = line.match(/^\\chapter\*?\{([^}]+)\}/);
    if (chapterMatch) {
      const nextLine = lines[i + 1]?.trim() ?? '';
      if (!nextLine.startsWith('\\label') && !nextLine.startsWith('%')) {
        issues.push({
          id: 'STR-005',
          severity: 'minor',
          category: 'structure',
          title: `Unlabeled chapter: "${chapterMatch[1]}"`,
          detail: `The chapter "${chapterMatch[1]}" on line ${i + 1} has no \\label{}. Add a label immediately after the chapter command for cross-referencing.`,
          line: i + 1,
          context: line,
          isStylistic: true,
        });
      }
    }

    const sectionMatch = line.match(/^\\section\*?\{([^}]+)\}/);
    if (sectionMatch) {
      const nextLine = lines[i + 1]?.trim() ?? '';
      if (!nextLine.startsWith('\\label') && !nextLine.startsWith('%')) {
        issues.push({
          id: 'STR-006',
          severity: 'suggestion',
          category: 'structure',
          title: `Unlabeled section: "${sectionMatch[1]}"`,
          detail: `The section "${sectionMatch[1]}" on line ${i + 1} has no \\label{}. While not strictly required, labels on sections enable \\cref{} references.`,
          line: i + 1,
          context: line,
          isStylistic: true,
        });
      }
    }
  }

  // 4. Abstract environment check
  const hasAbstract = /\\begin\{abstract\}/.test(tex);
  const inDoc = tex.includes('\\begin{document}');
  if (inDoc && !hasAbstract) {
    issues.push({
      id: 'STR-007',
      severity: 'minor',
      category: 'structure',
      title: 'No abstract environment',
      detail: 'Academic theses require an abstract. Add \\begin{abstract}...\\end{abstract} after \\maketitle.',
      fix: '\\begin{abstract}\n  % Write your abstract here\n\\end{abstract}',
      isStylistic: false,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Package & Compilation Analysis
// ─────────────────────────────────────────────────────────────

function analyzePackages(tex: string, issues: ExpertIssue[], suggestedPkgs: ExpertResult['suggestedPackages']): void {
  // Extract preamble
  const beginIdx = tex.indexOf('\\begin{document}');
  const preamble = beginIdx >= 0 ? tex.slice(0, beginIdx) : tex;

  // Extract loaded packages
  const loadedPkgs = new Set<string>();
  const usepackageRegex = /\\usepackage\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = usepackageRegex.exec(preamble)) !== null) {
    m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(p => loadedPkgs.add(p));
  }

  // Check documentclass for encoding hints
  const docClassMatch = tex.match(/\\documentclass\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/);
  const docClass = docClassMatch ? docClassMatch[1].trim() : '';

  // 1. Encoding validation
  if (!loadedPkgs.has('fontspec')) {
    // pdflatex path — check for inputenc/fontenc
    if (!loadedPkgs.has('inputenc')) {
      issues.push({
        id: 'PKG-001',
        severity: 'suggestion',
        category: 'encoding',
        title: 'Missing inputenc package',
        detail: 'For robust UTF-8 support with pdflatex, add \\usepackage[utf8]{inputenc}. Without it, non-ASCII characters may cause compilation errors.',
        fix: '\\usepackage[utf8]{inputenc}',
        packageSuggestion: 'inputenc',
        isStylistic: true,
      });
    }
    if (!loadedPkgs.has('fontenc')) {
      issues.push({
        id: 'PKG-002',
        severity: 'suggestion',
        category: 'encoding',
        title: 'Missing fontenc package',
        detail: 'The fontenc package with T1 encoding ensures proper hyphenation and character rendering. Add \\usepackage[T1]{fontenc}.',
        fix: '\\usepackage[T1]{fontenc}',
        packageSuggestion: 'fontenc',
        isStylistic: true,
      });
    }
  }

  // 2. Check for color usage without xcolor
  const body = beginIdx >= 0 ? tex.slice(beginIdx) : tex;
  const usesColor = /\\(definecolor|textcolor|color\{|colorbox|fcolorbox|rowcolor|cellcolor)/.test(tex);
  if (usesColor && !loadedPkgs.has('xcolor')) {
    const colorCmds = new Set<string>();
    if (/\\definecolor/.test(tex)) colorCmds.add('\\definecolor');
    if (/\\textcolor/.test(tex)) colorCmds.add('\\textcolor');
    if (/\\colorbox/.test(tex)) colorCmds.add('\\colorbox');
    if (/\\rowcolor/.test(tex)) colorCmds.add('\\rowcolor');
    issues.push({
      id: 'PKG-003',
      severity: 'major',
      category: 'compilation',
      title: 'Color commands used without xcolor package',
      detail: `Found ${colorCmds.size} color command(s) (${[...colorCmds].join(', ')}) but xcolor is not loaded. This will cause "Undefined control sequence" errors.`,
      fix: '\\usepackage[dvipsnames,svgnames,table]{xcolor}',
      packageSuggestion: 'xcolor',
      isStylistic: false,
    });
    suggestedPkgs.push({
      pkg: 'xcolor',
      reason: 'Required for color commands (definecolor, textcolor, colorbox, etc.)',
      commands: [...colorCmds],
    });
  }

  // 3. Check for algorithm usage without algorithm packages
  const usesAlgorithm = /\\(begin\{algorithm\}|SetAlgoLined|SetKw|KwIn|KwOut|Procedure|Require|Ensure)/.test(tex);
  if (usesAlgorithm && !loadedPkgs.has('algorithm2e') && !loadedPkgs.has('algorithmicx') && !loadedPkgs.has('algpseudocode')) {
    issues.push({
      id: 'PKG-004',
      severity: 'major',
      category: 'compilation',
      title: 'Algorithm commands without algorithm package',
      detail: 'Algorithm environments or commands detected but no algorithm package is loaded. Add algorithm2e or algpseudocode.',
      fix: '\\usepackage{algorithm}\n\\usepackage{algpseudocode}',
      packageSuggestion: 'algpseudocode',
      isStylistic: false,
    });
    suggestedPkgs.push({
      pkg: 'algpseudocode',
      reason: 'Provides algorithm environment and pseudocode commands',
      commands: ['\\begin{algorithm}', '\\Procedure', '\\Require'],
    });
  }

  // 4. Check for tikz usage without tikz package
  const usesTikz = /\\(tikz|node|draw|fill|path|coordinate|foreach)\s*(?:\[|\{)/.test(body);
  if (usesTikz && !loadedPkgs.has('tikz')) {
    issues.push({
      id: 'PKG-005',
      severity: 'major',
      category: 'compilation',
      title: 'TikZ commands without tikz package',
      detail: 'TikZ drawing commands detected but \\usepackage{tikz} is not in the preamble.',
      fix: '\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta, positioning}',
      packageSuggestion: 'tikz',
      isStylistic: false,
    });
    suggestedPkgs.push({
      pkg: 'tikz',
      reason: 'Required for TikZ drawing commands',
      commands: ['\\tikz', '\\node', '\\draw'],
    });
  }

  // 5. Check for pgfplots usage without pgfplots
  const usesPgfplots = /\\(begin\{axis\}|addplot|addlegendentry|pgfplotsset)/.test(tex);
  if (usesPgfplots && !loadedPkgs.has('pgfplots')) {
    issues.push({
      id: 'PKG-006',
      severity: 'major',
      category: 'compilation',
      title: 'PGFPlots commands without pgfplots package',
      detail: 'PGFPlots chart commands detected but \\usepackage{pgfplots} is missing.',
      fix: '\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}',
      packageSuggestion: 'pgfplots',
      isStylistic: false,
    });
  }

  // 6. Check for siunitx commands
  const usesSiunitx = /\\(SI\{|si\{|qty\{|num\{|unit\{|DeclareSIUnit)/.test(tex);
  if (usesSiunitx && !loadedPkgs.has('siunitx')) {
    issues.push({
      id: 'PKG-007',
      severity: 'major',
      category: 'compilation',
      title: 'SI unit commands without siunitx package',
      detail: 'SI unit formatting commands detected but siunitx is not loaded.',
      fix: '\\usepackage{siunitx}',
      packageSuggestion: 'siunitx',
      isStylistic: false,
    });
  }

  // 7. Check for subfigure/subtable without subcaption
  const usesSubcaption = /\\(begin\{subfigure\}|begin\{subtable\}|subcaptionbox)/.test(tex);
  if (usesSubcaption && !loadedPkgs.has('subcaption') && !loadedPkgs.has('subfig')) {
    issues.push({
      id: 'PKG-008',
      severity: 'major',
      category: 'compilation',
      title: 'Subfigure commands without subcaption package',
      detail: 'Subfigure or subtable environment detected but neither subcaption nor subfig is loaded.',
      fix: '\\usepackage{subcaption}',
      packageSuggestion: 'subcaption',
      isStylistic: false,
    });
    suggestedPkgs.push({
      pkg: 'subcaption',
      reason: 'Required for subfigure and subtable environments',
      commands: ['\\begin{subfigure}', '\\begin{subtable}'],
    });
  }

  // 8. Check for biblatex vs natbib
  if (loadedPkgs.has('natbib') && loadedPkgs.has('biblatex')) {
    issues.push({
      id: 'PKG-009',
      severity: 'critical',
      category: 'compilation',
      title: 'Conflicting citation packages: natbib + biblatex',
      detail: 'Both natbib and biblatex are loaded. They provide overlapping citation commands and will conflict. Use only one. biblatex is more modern and flexible; natbib is simpler and more widely compatible.',
      isStylistic: false,
    });
  }

  // 9. Check for subcaption + subfig conflict
  if (loadedPkgs.has('subcaption') && loadedPkgs.has('subfig')) {
    issues.push({
      id: 'PKG-010',
      severity: 'critical',
      category: 'compilation',
      title: 'Conflicting packages: subcaption + subfig',
      detail: 'Both subcaption and subfig are loaded. They both define subfigure functionality and will conflict. Use only one — subcaption is recommended for new documents.',
      isStylistic: false,
    });
  }

  // 10. fontspec + inputenc/fontenc conflict
  if (loadedPkgs.has('fontspec') && (loadedPkgs.has('inputenc') || loadedPkgs.has('fontenc'))) {
    issues.push({
      id: 'PKG-011',
      severity: 'critical',
      category: 'compilation',
      title: 'fontspec conflicts with inputenc/fontenc',
      detail: 'fontspec (for XeLaTeX/LuaLaTeX) handles encoding internally and conflicts with inputenc/fontenc (for pdfLaTeX). Remove inputenc and fontenc when using fontspec.',
      isStylistic: false,
    });
  }

  // 11. hyperref load order
  const pkgOrder: string[] = [];
  const pkgLineMap = new Map<string, number>();
  const preambleLines = preamble.split('\n');
  for (let i = 0; i < preambleLines.length; i++) {
    const upMatch = preambleLines[i].match(/\\usepackage\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/);
    if (upMatch) {
      const pkgs = upMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      for (const p of pkgs) {
        if (!pkgOrder.includes(p)) {
          pkgOrder.push(p);
          pkgLineMap.set(p, i + 1);
        }
      }
    }
  }

  const hyperrefIdx = pkgOrder.indexOf('hyperref');
  const natbibIdx = pkgOrder.indexOf('natbib');
  const cleverefIdx = pkgOrder.indexOf('cleveref');

  if (hyperrefIdx >= 0 && natbibIdx >= 0 && natbibIdx > hyperrefIdx) {
    issues.push({
      id: 'PKG-012',
      severity: 'minor',
      category: 'package',
      title: 'natbib loaded after hyperref',
      detail: `natbib (line ${pkgLineMap.get('natbib')}) should be loaded before hyperref (line ${pkgLineMap.get('hyperref')}) for correct citation link formatting.`,
      isStylistic: true,
    });
  }

  if (hyperrefIdx >= 0 && cleverefIdx >= 0 && cleverefIdx < hyperrefIdx) {
    issues.push({
      id: 'PKG-013',
      severity: 'minor',
      category: 'package',
      title: 'cleveref loaded before hyperref',
      detail: `cleveref (line ${pkgLineMap.get('cleveref')}) must be loaded after hyperref (line ${pkgLineMap.get('hyperref')}). cleveref patches hyperref commands.`,
      isStylistic: true,
    });
  }

  // 12. Unknown command → package suggestion
  const commandRegex = /\\([a-zA-Z]+)/g;
  const seenUnknown = new Set<string>();
  const texLines = tex.split('\n');
  while ((m = commandRegex.exec(tex)) !== null) {
    const cmd = m[1];
    // Skip if known
    if (LATEX_BUILTINS_EXTENDED.has(cmd)) continue;
    if (['begin', 'end'].includes(cmd)) continue;

    // Check if user-defined
    if (/\\(?:newcommand|renewcommand|providecommand|DeclareMathOperator|DeclarePairedDelimiter)\s*(?:\[[^\]]*\])?\s*\{\\/.test(tex.replace(cmd, cmd))) continue;

    // Check if in any loaded package's provided commands
    const pkgSuggestion = COMMAND_TO_PACKAGE[cmd];
    if (pkgSuggestion) {
      if (!loadedPkgs.has(pkgSuggestion.pkg)) {
        if (!seenUnknown.has(cmd)) {
          seenUnknown.add(cmd);
          const lineNum = tex.slice(0, m.index).split('\n').length;
          issues.push({
            id: `PKG-${300 + seenUnknown.size}`,
            severity: 'major',
            category: 'compilation',
            title: `Unknown command \\${cmd} — package "${pkgSuggestion.pkg}" needed`,
            detail: `The command \\${cmd} on line ${lineNum} is not a LaTeX built-in. It is provided by the "${pkgSuggestion.pkg}" package, which is not loaded.`,
            line: lineNum,
            context: texLines[lineNum - 1]?.trim() || '',
            fix: `\\usepackage{${pkgSuggestion.pkg}}`,
            packageSuggestion: pkgSuggestion.pkg,
            isStylistic: false,
          });
          suggestedPkgs.push({
            pkg: pkgSuggestion.pkg,
            reason: `Provides \\${cmd}${pkgSuggestion.commands ? ` (also: ${pkgSuggestion.commands.join(', ')})` : ''}`,
            commands: [`\\${cmd}`],
          });
        }
      }
      // If package IS loaded, command is valid (skip)
      continue;
    }

    // For truly unknown commands — only warn once per command
    if (!seenUnknown.has(cmd) && loadedPkgs.size > 0) {
      // Don't flag commands that are likely user-defined or from custom packages
      if (cmd.length <= 2) continue; // Skip very short commands (likely typos or noise)
      if (/^[a-z]+$/.test(cmd) && cmd.length <= 4) continue; // Skip common short lowercase commands
      seenUnknown.add(cmd);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Writing Quality Analysis
// ─────────────────────────────────────────────────────────────

function analyzeWritingQuality(tex: string, issues: ExpertIssue[], stats: ExpertResult['stats']): void {
  const sentences = extractSentences(tex);
  stats.sentenceCount = sentences.length;

  if (sentences.length === 0) return;

  const totalWords = sentences.reduce((sum, s) => sum + s.wordCount, 0);
  stats.avgSentenceLength = Math.round((totalWords / sentences.length) * 10) / 10;

  // 1. Long sentences (40-60 word threshold)
  for (const sent of sentences) {
    if (sent.wordCount > 60) {
      stats.veryLongSentenceCount++;
      issues.push({
        id: 'WRT-001',
        severity: sent.wordCount > 80 ? 'major' : 'minor',
        category: 'writing',
        title: `Overly long sentence (${sent.wordCount} words)`,
        detail: `A sentence with ${sent.wordCount} words on line ${sent.line} is difficult to read. Academic writing targets 15-25 words per sentence for clarity.`,
        line: sent.line,
        context: sent.text.slice(0, 80) + (sent.text.length > 80 ? '...' : ''),
        isStylistic: true,
      });
    } else if (sent.wordCount > 40) {
      stats.longSentenceCount++;
      // Only report first few to avoid noise
      if (stats.longSentenceCount <= 5) {
        issues.push({
          id: 'WRT-002',
          severity: 'suggestion',
          category: 'writing',
          title: `Long sentence (${sent.wordCount} words)`,
          detail: `A ${sent.wordCount}-word sentence on line ${sent.line} may be hard to follow. Consider splitting it at a natural break point.`,
          line: sent.line,
          context: sent.text.slice(0, 80) + (sent.text.length > 80 ? '...' : ''),
          isStylistic: true,
        });
      }
    }
  }

  // 2. Intensifiers in academic text
  const intensifierPattern = /\b(very|really|quite|rather|somewhat|fairly|pretty|just|basically|actually|literally)\s+\w+/gi;
  const body = tex.slice(tex.indexOf('\\begin{document}') + 17);
  const intensifierMatches = body.match(intensifierPattern);
  if (intensifierMatches && intensifierMatches.length > 3) {
    const uniqueIntensifiers = [...new Set(intensifierMatches.map(m => m.trim().split(/\s+/)[0].toLowerCase()))];
    issues.push({
      id: 'WRT-003',
      severity: 'minor',
      category: 'style',
      title: `${intensifierMatches.length} intensifiers detected`,
      detail: `Found ${intensifierMatches.length} instances of intensifiers (${uniqueIntensifiers.slice(0, 5).join(', ')}${uniqueIntensifiers.length > 5 ? '...' : ''}). In academic writing, prefer precise language: "significantly" instead of "very much", "approximately" instead of "quite a bit".`,
      isStylistic: true,
    });
  }

  // 3. Weak hedging overuse
  const hedgePattern = /\b(might|could|possibly|perhaps|seems? to|appears? to|may|arguably|potentially|somewhat|relatively)\b/gi;
  const hedgeMatches = body.match(hedgePattern);
  if (hedgeMatches && hedgeMatches.length > 10) {
    issues.push({
      id: 'WRT-004',
      severity: 'suggestion',
      category: 'style',
      title: 'Excessive hedging detected',
      detail: `Found ${hedgeMatches.length} hedging words. Over-hedging undermines confidence in your arguments. Reserve hedging for claims with genuine uncertainty. Replace some with confident statements supported by evidence.`,
      isStylistic: true,
    });
  }

  // 4. Passive voice detection (basic heuristic)
  const passivePattern = /\b(is|are|was|were|be|been|being)\s+(?:being\s+)?(?:analyzed|examined|studied|investigated|observed|measured|calculated|computed|determined|evaluated|assessed|conducted|performed|carried|implemented|developed|designed|proposed|presented|discussed|reviewed|compared|tested|trained|used|chosen|selected|applied)/gi;
  const passiveMatches = body.match(passivePattern);
  if (passiveMatches && passiveMatches.length > sentences.length * 0.3 && sentences.length > 5) {
    issues.push({
      id: 'WRT-005',
      severity: 'suggestion',
      category: 'style',
      title: 'Heavy passive voice usage',
      detail: `Approximately ${Math.round((passiveMatches.length / sentences.length) * 100)}% of sentences appear to use passive voice. While acceptable in academic writing, vary with active voice for readability: "We analyzed the data" vs "The data was analyzed".`,
      isStylistic: true,
    });
  }

  // 5. Structural monotony — check for consecutive "The/This" sentence starts
  const paragraphBlocks = body.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  let monotonyCount = 0;
  for (const para of paragraphBlocks) {
    const paraSentences = para.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 10);
    if (paraSentences.length >= 5) {
      const startsWithThis = paraSentences.every(s => /^(the|this|it|we|our)\s/i.test(s.trim()));
      if (startsWithThis) {
        monotonyCount++;
      }
    }
  }
  if (monotonyCount >= 1) {
    issues.push({
      id: 'WRT-006',
      severity: 'suggestion',
      category: 'style',
      title: `${monotonyCount} paragraph(s) with monotonous sentence starts`,
      detail: 'One or more paragraphs start every sentence with "The", "This", or similar words. Vary sentence openings with transitional phrases, adverbs, or subordinate clauses for better readability.',
      isStylistic: true,
    });
  }

  // 6. Compute readability score (simplified Flesch-like for LaTeX)
  const avgWords = stats.avgSentenceLength;
  const estimatedComplexWords = body.match(/\b(implementation|methodology|investigation|understanding|approximately|correspondingly|consequently|fundamental|particularly|significantly|demonstrates|effectiveness|computational|architectural|characterization|representative|simultaneously|investigated|experimentation)/gi);
  const complexRatio = estimatedComplexWords ? estimatedComplexWords.length / Math.max(totalWords, 1) : 0;

  // Higher sentence length and complex word ratio = harder to read
  stats.estimatedReadabilityScore = Math.max(0, Math.min(100,
    100 - (avgWords - 20) * 0.8 - complexRatio * 100
  ));
}

// ─────────────────────────────────────────────────────────────
// Bibliography Analysis
// ─────────────────────────────────────────────────────────────

function analyzeBibliography(tex: string, bibContent: string | undefined, issues: ExpertIssue[]): void {
  const body = tex.slice(tex.indexOf('\\begin{document}') + 17);

  // 1. Check citation commands used
  const citeCommands = new Set<string>();
  const citeRegex = /\\(cite[a-z]*)\{/gi;
  let cm: RegExpExecArray | null;
  while ((cm = citeRegex.exec(body)) !== null) {
    citeCommands.add(cm[1]);
  }

  // 2. Check citation style consistency
  const usesParenthetical = citeCommands.has('citep') || citeCommands.has('cite');
  const usesTextual = citeCommands.has('citet') || citeCommands.has('citeauthor');
  const usesNumeric = /\\bibliographystyle\{(ieeetr|vancouver|plain|unsrt)\}/.test(tex);

  if (usesParenthetical && usesTextual) {
    // Good — using both styles (standard in thesis)
  } else if (usesTextual && !usesParenthetical) {
    issues.push({
      id: 'BIB-001',
      severity: 'suggestion',
      category: 'bibliography',
      title: 'Only textual citations detected',
      detail: 'Only \\citet/\\citeauthor commands found. Consider using \\citep for parenthetical citations in some locations for variety and completeness.',
      isStylistic: true,
    });
  }

  // 3. Check for \cite without bibliography
  if (citeCommands.size > 0) {
    const hasBibliography = /\\bibliography\{[^}]+\}/.test(tex) || /\\printbibliography/.test(tex) || /\\begin\{thebibliography\}/.test(tex);
    if (!hasBibliography) {
      issues.push({
        id: 'BIB-002',
        severity: 'critical',
        category: 'compilation',
        title: 'Citations without bibliography',
        detail: `Found ${citeCommands.size} citation command type(s) (${[...citeCommands].join(', ')}) but no \\bibliography{}, \\printbibliography, or thebibliography environment. The document will not compile correctly.`,
        isStylistic: false,
      });
    }
  }

  // 4. Check for natbib style commands without natbib loaded
  const usesNatbibCmds = citeCommands.has('citep') || citeCommands.has('citet') || citeCommands.has('citeauthor') || citeCommands.has('citeyear');
  const hasNatbib = /\\usepackage(\[.*?\])?\{natbib\}/.test(tex);
  const hasBiblatex = /\\usepackage(\[.*?\])?\{biblatex\}/.test(tex);

  if (usesNatbibCmds && !hasNatbib && !hasBiblatex) {
    issues.push({
      id: 'BIB-003',
      severity: 'major',
      category: 'compilation',
      title: 'natbib citation commands without natbib package',
      detail: 'Commands like \\citep, \\citet, \\citeauthor require the natbib package. Add \\usepackage[round, colon, authoryear]{natbib}.',
      fix: '\\usepackage[round, colon, authoryear]{natbib}',
      packageSuggestion: 'natbib',
      isStylistic: false,
    });
  }

  // 5. Check bibliography style matches citation commands
  if (hasBiblatex && /\\bibliographystyle/.test(tex)) {
    issues.push({
      id: 'BIB-004',
      severity: 'minor',
      category: 'bibliography',
      title: '\\bibliographystyle with biblatex',
      detail: 'With biblatex, use \\printbibliography instead of \\bibliography{} and \\bibliographystyle{}. biblatex handles bibliography formatting through \\addbibresource and style options.',
      isStylistic: false,
    });
  }

  // 6. Check for empty bib keys in citations
  const emptyCitePattern = /\\cite[a-z]*\{\s*\}/g;
  const emptyCites = body.match(emptyCitePattern);
  if (emptyCites && emptyCites.length > 0) {
    issues.push({
      id: 'BIB-005',
      severity: 'minor',
      category: 'bibliography',
      title: `${emptyCites.length} empty citation(s) detected`,
      detail: 'One or more \\cite{} commands have empty keys. Every citation must reference a valid bibliography entry.',
      isStylistic: false,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Main Expert Analysis Function
// ─────────────────────────────────────────────────────────────

/**
 * Run comprehensive LaTeX expert analysis on a document.
 *
 * Analysis categories:
 * - Compilation: Errors that prevent compilation
 * - Package: Missing/unknown packages, load order issues
 * - Structure: Title page, chapters, labels, TOC
 * - Writing: Sentence length, readability, passive voice
 * - Style: Academic tone, hedging, monotony
 * - Bibliography: Citation commands, style consistency
 * - Encoding: UTF-8, font encoding issues
 *
 * Output format:
 * - criticalFixes: Issues that MUST be fixed
 * - improvements: Suggested enhancements (stylistic)
 * - stats: Quantitative metrics
 * - suggestedPackages: Packages to add with reasons
 *
 * Performance budget: < 50ms for typical thesis (< 50KB)
 */
export function analyzeLatexExpert(
  tex: string,
  bibContent?: string
): ExpertResult {
  const issues: ExpertIssue[] = [];
  const suggestedPkgs: ExpertResult['suggestedPackages'] = [];

  const stats: ExpertResult['stats'] = {
    totalIssues: 0,
    criticalCount: 0,
    majorCount: 0,
    minorCount: 0,
    suggestionCount: 0,
    sentenceCount: 0,
    avgSentenceLength: 0,
    longSentenceCount: 0,
    veryLongSentenceCount: 0,
    estimatedReadabilityScore: 0,
  };

  if (!tex || typeof tex !== 'string' || tex.trim().length === 0) {
    return { issues: [], criticalFixes: [], improvements: [], stats, suggestedPackages: [] };
  }

  // Run all analyzers
  analyzeStructure(tex, issues);
  analyzePackages(tex, issues, suggestedPkgs);
  analyzeWritingQuality(tex, issues, stats);
  analyzeBibliography(tex, bibContent, issues);

  // Count stats
  stats.totalIssues = issues.length;
  stats.criticalCount = issues.filter(i => i.severity === 'critical').length;
  stats.majorCount = issues.filter(i => i.severity === 'major').length;
  stats.minorCount = issues.filter(i => i.severity === 'minor').length;
  stats.suggestionCount = issues.filter(i => i.severity === 'suggestion').length;

  // Categorize
  const criticalFixes = issues.filter(i => !i.isStylistic);
  const improvements = issues.filter(i => i.isStylistic);

  // Sort: critical first, then by category, then by line
  const severityOrder: Record<ExpertSeverity, number> = {
    critical: 0, major: 1, minor: 2, suggestion: 3,
  };
  issues.sort((a, b) =>
    (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9) ||
    (a.line ?? 999) - (b.line ?? 999)
  );

  return {
    issues,
    criticalFixes,
    improvements,
    stats,
    suggestedPackages: suggestedPkgs,
  };
}

/**
 * Format expert results into a human-readable summary.
 */
export function formatExpertSummary(result: ExpertResult): string {
  const parts: string[] = [];

  if (result.stats.totalIssues === 0) {
    parts.push('No issues found. Your LaTeX document looks good!');
    return parts.join('\n');
  }

  parts.push(`Analysis complete: ${result.stats.totalIssues} issue(s) detected.`);
  parts.push(`  ${result.stats.criticalCount} critical, ${result.stats.majorCount} major, ${result.stats.minorCount} minor, ${result.stats.suggestionCount} suggestions`);
  parts.push('');

  if (result.criticalFixes.length > 0) {
    parts.push(`--- Critical Fixes (${result.criticalFixes.length}) ---`);
    for (const issue of result.criticalFixes.slice(0, 10)) {
      parts.push(`  [${issue.severity.toUpperCase()}] ${issue.title}`);
      parts.push(`    ${issue.detail}`);
      if (issue.fix) parts.push(`    Fix: ${issue.fix}`);
      parts.push('');
    }
  }

  if (result.improvements.length > 0) {
    parts.push(`--- Suggested Improvements (${result.improvements.length}) ---`);
    for (const issue of result.improvements.slice(0, 10)) {
      parts.push(`  [${issue.severity.toUpperCase()}] ${issue.title}`);
      parts.push(`    ${issue.detail}`);
      if (issue.fix) parts.push(`    Fix: ${issue.fix}`);
      parts.push('');
    }
  }

  if (result.suggestedPackages.length > 0) {
    parts.push('--- Suggested Packages ---');
    for (const pkg of result.suggestedPackages) {
      parts.push(`  ${pkg.pkg}: ${pkg.reason}`);
    }
    parts.push('');
  }

  // Writing stats
  parts.push(`--- Writing Quality ---`);
  parts.push(`  Sentences: ${result.stats.sentenceCount}`);
  parts.push(`  Avg sentence length: ${result.stats.avgSentenceLength} words`);
  if (result.stats.longSentenceCount > 0) {
    parts.push(`  Long sentences (40-60 words): ${result.stats.longSentenceCount}`);
  }
  if (result.stats.veryLongSentenceCount > 0) {
    parts.push(`  Very long sentences (>60 words): ${result.stats.veryLongSentenceCount}`);
  }
  parts.push(`  Readability score: ${result.stats.estimatedReadabilityScore}/100`);

  return parts.join('\n');
}
