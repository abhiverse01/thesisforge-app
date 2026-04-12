// ============================================================
// ThesisForge Core — Compilation Simulator (System 3)
// Pure-function analysis engine that predicts real pdflatex
// compilation outcomes from raw .tex / .bib strings.
//
// 4-pass architecture:
//   Pass 1: Tokenizer    — brace/env/math balance
//   Pass 2: Packages     — conflict detection, load-order checks
//   Pass 3: Commands     — unknown commands, ref/label resolution
//   Pass 4: BibTeX       — citation ↔ key cross-check
// ============================================================

// ============================================================
// Exported Types
// ============================================================

export type SimSeverity = 'error' | 'warning' | 'info';

export interface SimulationError {
  code: string;
  severity: 'error';
  message: string;
  location?: string;
  hint: string;
}

export interface SimulationWarning {
  code: string;
  severity: 'warning';
  message: string;
  location?: string;
  hint: string;
}

export interface SimulationInfo {
  code: string;
  severity: 'info';
  message: string;
  data?: Record<string, unknown>;
}

export interface CompilationStep {
  command: string;
  description: string;
  purpose: string;
}

export interface SimulationResult {
  passed: boolean;
  errors: SimulationError[];
  warnings: SimulationWarning[];
  info: SimulationInfo[];
  estimatedPageCount: number;
  compilationRecipe: CompilationStep[];
  packageSummary: {
    total: number;
    known: number;
    unknown: number;
    conflicts: string[];
  };
  labelSummary: {
    defined: number;
    referenced: number;
    unresolved: string[];
  };
  citationSummary: {
    totalCitations: number;
    definedKeys: number;
    unresolvedKeys: string[];
  };
}

// ============================================================
// Internal Types — Tokenizer
// ============================================================

type TokenType =
  | 'text'
  | 'command'
  | 'environment-open'
  | 'environment-close'
  | 'math-inline'
  | 'math-display'
  | 'comment'
  | 'group-open'
  | 'group-close'
  | 'bracket-open'
  | 'bracket-close';

interface Token {
  type: TokenType;
  value: string;
  line: number;
  position: number;
}

// ============================================================
// Constants — Known Packages (80+)
// ============================================================

const KNOWN_PACKAGES = new Set([
  'inputenc', 'fontenc', 'lmodern', 'babel', 'polyglossia', 'fontspec',
  'geometry', 'microtype', 'setspace', 'parskip', 'ragged2e',
  'amsmath', 'amssymb', 'amsthm', 'mathtools', 'unicode-math', 'bm',
  'graphicx', 'xcolor', 'float', 'caption', 'subcaption', 'subfig',
  'booktabs', 'tabularx', 'longtable', 'multirow', 'array',
  'natbib', 'biblatex', 'csquotes', 'biblatex-apa',
  'fancyhdr', 'varioref', 'cleveref', 'hyperref', 'url', 'xspace',
  'enumitem', 'listings', 'algorithm2e', 'algorithmicx', 'algpseudocode',
  'nomencl', 'glossaries', 'acronym', 'makeidx',
  'tcolorbox', 'mdframed', 'needspace', 'afterpage', 'footmisc',
  'titlesec', 'wrapfig', 'rotating', 'sidecap',
  'tikz', 'pgfplots', 'pgfplotsset',
  'ccaption', 'chngcntr',
  'siunitx', 'cancel', 'empheq', 'nccmath',
  'luatexja', 'luacode', 'xunicode',
  'verbatim', 'fancyvrb', 'moreverb',
  'pdfpages', 'pdfcrop', 'watermark', 'todonotes',
  'appendix', 'placeins',
  'dblfloatfix', 'stfloats',
  'multicol', 'minipage',
  'import', 'subfiles',
]);

// ============================================================
// Constants — Known Package Conflicts
// ============================================================

interface PackageConflict {
  packages: [string, string];
  severity: 'error' | 'warning';
  message: string;
  hint: string;
}

const PACKAGE_CONFLICTS: PackageConflict[] = [
  {
    packages: ['subfig', 'subcaption'],
    severity: 'error',
    message: 'Packages "subfig" and "subcaption" conflict — both define subfigure functionality.',
    hint: 'Use only one. "subcaption" is recommended for new documents.',
  },
  {
    packages: ['natbib', 'biblatex'],
    severity: 'error',
    message: 'Packages "natbib" and "biblatex" conflict — both provide citation management.',
    hint: 'Use only one. "biblatex" is more modern; "natbib" is simpler and widely compatible.',
  },
  {
    packages: ['inputenc', 'fontspec'],
    severity: 'error',
    message: 'Packages "inputenc" and "fontspec" conflict — fontspec handles encoding internally.',
    hint: 'Remove inputenc when using fontspec (XeLaTeX/LuaLaTeX).',
  },
  {
    packages: ['fontenc', 'fontspec'],
    severity: 'error',
    message: 'Packages "fontenc" and "fontspec" conflict — fontspec handles font encoding.',
    hint: 'Remove fontenc when using fontspec (XeLaTeX/LuaLaTeX).',
  },
  {
    packages: ['times', 'mathptmx'],
    severity: 'warning',
    message: 'Both "times" and "mathptmx" provide Times-like fonts — this is redundant.',
    hint: 'Use only one. "mathptmx" is preferred because it also sets matching math fonts.',
  },
];

// ============================================================
// Constants — Load-Order Rules
// ============================================================

interface LoadOrderRule {
  /** Package that must come FIRST */
  before: string;
  /** Package that must come AFTER */
  after: string;
  severity: 'warning';
  message: string;
  hint: string;
}

const LOAD_ORDER_RULES: LoadOrderRule[] = [
  {
    before: 'natbib',
    after: 'hyperref',
    severity: 'warning',
    message: '"hyperref" is loaded before "natbib" — natbib should be loaded first.',
    hint: 'Load natbib before hyperref to ensure correct citation link formatting.',
  },
  {
    before: 'hyperref',
    after: 'cleveref',
    severity: 'warning',
    message: '"cleveref" is loaded before "hyperref" — cleveref must come after hyperref.',
    hint: 'Load cleveref after hyperref. cleveref patches hyperref commands.',
  },
];

// ============================================================
// Constants — LaTeX Built-in Commands (200+)
// ============================================================

const LATEX_BUILTINS = new Set([
  // Document structure
  'documentclass', 'usepackage', 'begin', 'end', 'part', 'chapter', 'section', 'subsection',
  'subsubsection', 'paragraph', 'subparagraph', 'item', 'title', 'author', 'date', 'maketitle',
  'tableofcontents', 'listoffigures', 'listoftables', 'bibliography', 'bibliographystyle',
  'appendix', 'frontmatter', 'mainmatter', 'backmatter',
  // Cross-references
  'label', 'ref', 'pageref', 'eqref', 'cref', 'Cref', 'autoref', 'nameref',
  'cite', 'citep', 'citet', 'citeauthor', 'citeyear', 'nocite',
  'bibitem', 'newblock', 'harvarditem',
  // Figures & tables
  'includegraphics', 'caption', 'figcaption', 'tablecaption',
  'centering', 'hline', 'cline', 'toprule', 'midrule', 'bottomrule',
  'multicolumn', 'multirow', 'addlinespace',
  'subfloat', 'subfigure', 'subtable',
  // Math
  'equation', 'align', 'gather', 'multline', 'split', 'cases',
  'frac', 'dfrac', 'tfrac', 'sqrt', 'sum', 'int', 'prod',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta', 'lambda', 'mu', 'pi', 'sigma', 'omega',
  'infty', 'partial', 'nabla', 'forall', 'exists',
  'left', 'right', 'bigl', 'bigr', 'Bigl', 'Bigr',
  'text', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathcal',
  'nonumber', 'tag',
  // Text formatting
  'textbf', 'textit', 'textrm', 'textsc', 'texttt', 'textsf', 'emph',
  'underline', 'textsuperscript', 'textsubscript',
  'footnote', 'footnotetext', 'endnote',
  'noindent', 'newline', 'linebreak', 'pagebreak', 'newpage',
  'clearpage', 'cleardoublepage',
  'hspace', 'vspace', 'smallskip', 'medskip', 'bigskip',
  'raggedright', 'raggedleft',
  'tiny', 'scriptsize', 'footnotesize', 'small', 'normalsize', 'large', 'Large', 'LARGE', 'huge', 'Huge',
  // Hyperref
  'href', 'url', 'hyperlink', 'hypertarget',
  'pdfauthor', 'pdftitle', 'pdfsubject', 'pdfkeywords',
  // Other common
  'newcommand', 'renewcommand', 'newenvironment', 'def', 'let',
  'if', 'else', 'fi', 'for', 'do', 'while', 'repeat', 'until',
  'input', 'include', 'includeonly',
  'setlength', 'setcounter', 'stepcounter', 'refstepcounter', 'counterwithin',
  'pagestyle', 'thispagestyle', 'fancyhf', 'fancyhead', 'fancyfoot',
  'lhead', 'rhead', 'chead', 'lfoot', 'rfoot', 'cfoot',
  'newtheorem', 'newacronym',
  'geometry', 'onehalfspacing', 'doublespacing', 'singlespacing',
  'crefname',
  // Additional standard commands
  'today', 'and', 'ldots', 'cdots', 'vdots', 'ddots',
  'quad', 'qquad', 'enspace', 'thinspace', 'negthinspace',
  'newline', 'obeycr', 'verb', 'verb*',
  'thanks', 'line', 'overline', 'underline',
  'phantom', 'hphantom', 'vphantom',
  'boxed', 'fbox', 'mbox', 'makebox', 'parbox',
  'rule', 'hrulefill', 'dotfill',
  'vcenter', 'raisebox', 'stackrel',
  'mathop', 'mathbin', 'mathrel', 'mathord', 'mathpunct',
  'limits', 'nolimits', 'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
  'boldsymbol', 'boldmath', 'unboldmath',
  'hat', 'tilde', 'bar', 'vec', 'dot', 'ddot', 'dddot', 'check', 'breve', 'acute', 'grave',
  'widetilde', 'widehat', 'overrightarrow', 'overleftarrow',
  'sin', 'cos', 'tan', 'log', 'exp', 'lim', 'sup', 'inf', 'min', 'max',
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'det', 'dim', 'ker', 'hom', 'Pr', 'deg', 'arg', 'gcd',
  'pm', 'mp', 'times', 'div', 'cdot', 'ast', 'star', 'circ', 'bullet',
  'oplus', 'ominus', 'otimes', 'oslash', 'odot',
  'cap', 'cup', 'uplus', 'sqcap', 'sqcup', 'vee', 'wedge', 'setminus',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'simeq', 'cong', 'propto',
  'll', 'gg', 'prec', 'succ', 'preceq', 'succeq',
  'subset', 'supset', 'subseteq', 'supseteq', 'sqsubseteq', 'sqsupseteq',
  'in', 'notin', 'ni', 'vdash', 'dashv', 'models',
  'forall', 'exists', 'nexists', 'neg', 'lnot',
  'land', 'lor', 'Rightarrow', 'Leftarrow', 'Leftrightarrow',
  'implies', 'impliedby', 'iff',
  'mapsto', 'longmapsto', 'hookrightarrow', 'hookleftarrow',
  'rightarrow', 'leftarrow', 'longrightarrow', 'longleftarrow',
  'uparrow', 'downarrow', 'Uparrow', 'Downarrow',
  'rightleftharpoons', 'leftrightharpoons',
  'aleph', 'beth', 'ell', 'wp', 'Re', 'Im', 'prime',
  'emptyset', 'varnothing', 'nabla', 'surd', 'top', 'bot',
  'angle', 'measuredangle', 'triangle',
  'diamond', 'Diamond', 'Box', 'square',
  'clubsuit', 'diamondsuit', 'heartsuit', 'spadesuit',
  'sharp', 'flat', 'natural', 'partial',
  'ldotp', 'cdotp', 'colon',
  'smile', 'frown',
  // Document class options
  'twocolumn', 'onecolumn', 'twoside', 'oneside',
  'landscape', 'portrait',
  'draft', 'final',
  'titlepage', 'notitlepage',
  'openright', 'openany', 'openleft',
  'leqno', 'fleqn',
]);

// ============================================================
// Pass 1 — Tokenizer
// Scans .tex character-by-character and tracks structural balance.
// ============================================================

function runTokenizer(texContent: string): {
  tokens: Token[];
  errors: SimulationError[];
  environmentStack: string[];
} {
  const tokens: Token[] = [];
  const errors: SimulationError[] = [];
  const environmentStack: string[] = [];

  let i = 0;
  const len = texContent.length;
  let line = 1;
  let position = 0;

  // Track comments to skip their content
  let inComment = false;

  while (i < len) {
    const ch = texContent[i];

    // Track line numbers
    if (ch === '\n') {
      line++;
      position = 0;
      i++;
      continue;
    }

    // ── Comments: skip from % to end of line ──────────────────
    if (ch === '%' && !inComment) {
      inComment = true;
      const start = i;
      while (i < len && texContent[i] !== '\n') {
        i++;
      }
      tokens.push({
        type: 'comment',
        value: texContent.slice(start, i),
        line,
        position,
      });
      continue;
    }

    // ── Display math: \[ ─────────────────────────────────────
    if (ch === '\\' && i + 1 < len && texContent[i + 1] === '[') {
      tokens.push({ type: 'math-display', value: '\\[', line, position });
      environmentStack.push('\\[');
      i += 2;
      position += 2;
      continue;
    }

    // ── Display math: \] ─────────────────────────────────────
    if (ch === '\\' && i + 1 < len && texContent[i + 1] === ']') {
      const topEnv = environmentStack[environmentStack.length - 1];
      if (topEnv === '\\[') {
        environmentStack.pop();
      }
      tokens.push({ type: 'math-display', value: '\\]', line, position });
      i += 2;
      position += 2;
      continue;
    }

    // ── Display math: $$ (deprecated but common) ──────────────
    if (ch === '$' && i + 1 < len && texContent[i + 1] === '$') {
      const topEnv = environmentStack[environmentStack.length - 1];
      if (topEnv === '$$') {
        environmentStack.pop();
        tokens.push({ type: 'math-display', value: '$$', line, position });
      } else {
        environmentStack.push('$$');
        tokens.push({ type: 'math-display', value: '$$', line, position });
      }
      i += 2;
      position += 2;
      continue;
    }

    // ── Inline math: $ (single) ──────────────────────────────
    if (ch === '$') {
      tokens.push({ type: 'math-inline', value: '$', line, position });
      i++;
      position++;
      continue;
    }

    // ── Commands: \word ──────────────────────────────────────
    if (ch === '\\' && /[a-zA-Z]/.test(texContent[i + 1] ?? '')) {
      let cmdEnd = i + 1;
      while (cmdEnd < len && /[a-zA-Z]/.test(texContent[cmdEnd])) {
        cmdEnd++;
      }
      const cmdName = texContent.slice(i + 1, cmdEnd);
      const cmdToken: Token = {
        type: 'command',
        value: cmdName,
        line,
        position,
      };
      tokens.push(cmdToken);

      // Track \begin{env} and \end{env}
      if (cmdName === 'begin') {
        // Extract environment name from {env}
        let braceStart = cmdEnd;
        while (braceStart < len && texContent[braceStart] !== '{' && texContent[braceStart] !== '\n') {
          braceStart++;
        }
        if (braceStart < len && texContent[braceStart] === '{') {
          let braceEnd = braceStart + 1;
          while (braceEnd < len && texContent[braceEnd] !== '}' && texContent[braceEnd] !== '\n') {
            braceEnd++;
          }
          const envName = texContent.slice(braceStart + 1, braceEnd);
          environmentStack.push(envName);
          // Add environment-open token
          tokens.push({ type: 'environment-open', value: envName, line, position });
        }
      } else if (cmdName === 'end') {
        let braceStart = cmdEnd;
        while (braceStart < len && texContent[braceStart] !== '{' && texContent[braceStart] !== '\n') {
          braceStart++;
        }
        if (braceStart < len && texContent[braceStart] === '{') {
          let braceEnd = braceStart + 1;
          while (braceEnd < len && texContent[braceEnd] !== '}' && texContent[braceEnd] !== '\n') {
            braceEnd++;
          }
          const envName = texContent.slice(braceStart + 1, braceEnd);
          // Check if it matches the top of the stack
          const topEnv = environmentStack[environmentStack.length - 1];
          if (topEnv === envName) {
            environmentStack.pop();
          } else {
            // Mismatch — report but don't pop (we track the structural error)
            // Still try to find the matching env in the stack
            const idx = environmentStack.lastIndexOf(envName);
            if (idx !== -1) {
              environmentStack.splice(idx, 1);
            }
          }
          tokens.push({ type: 'environment-close', value: envName, line, position });
        }
      }

      i = cmdEnd;
      position += (cmdEnd - i);
      continue;
    }

    // ── Special characters as commands: \{ \} \\ etc. ────────
    if (ch === '\\' && i + 1 < len && !/[a-zA-Z]/.test(texContent[i + 1])) {
      tokens.push({ type: 'command', value: '\\' + texContent[i + 1], line, position });
      i += 2;
      position += 2;
      continue;
    }

    // ── Group open/close ─────────────────────────────────────
    if (ch === '{') {
      tokens.push({ type: 'group-open', value: '{', line, position });
      i++;
      position++;
      continue;
    }
    if (ch === '}') {
      tokens.push({ type: 'group-close', value: '}', line, position });
      i++;
      position++;
      continue;
    }

    // ── Bracket open/close ───────────────────────────────────
    if (ch === '[') {
      tokens.push({ type: 'bracket-open', value: '[', line, position });
      i++;
      position++;
      continue;
    }
    if (ch === ']') {
      tokens.push({ type: 'bracket-close', value: ']', line, position });
      i++;
      position++;
      continue;
    }

    // ── Regular text ─────────────────────────────────────────
    let textStart = i;
    while (i < len && texContent[i] !== '\\' && texContent[i] !== '{' && texContent[i] !== '}' && texContent[i] !== '[' && texContent[i] !== ']' && texContent[i] !== '$' && texContent[i] !== '%' && texContent[i] !== '\n') {
      i++;
    }
    if (i > textStart) {
      tokens.push({ type: 'text', value: texContent.slice(textStart, i), line, position });
      position += (i - textStart);
    }
  }

  // ── EOF checks ─────────────────────────────────────────────
  for (const unclosedEnv of environmentStack) {
    if (unclosedEnv === '\\[') {
      errors.push({
        code: 'SIM-E001',
        severity: 'error',
        message: 'Unclosed display math: \\[ without matching \\].',
        location: `EOF`,
        hint: 'Add \\] to close the display math environment.',
      });
    } else if (unclosedEnv === '$$') {
      errors.push({
        code: 'SIM-E002',
        severity: 'error',
        message: 'Unclosed display math: $$ without matching $$.',
        location: `EOF`,
        hint: 'Add $$ to close the display math, or use \\[...\\] instead.',
      });
    } else {
      errors.push({
        code: 'SIM-E003',
        severity: 'error',
        message: `Unclosed environment: {${unclosedEnv}}.`,
        location: `EOF`,
        hint: `Add \\end{${unclosedEnv}} to close the environment.`,
      });
    }
  }

  // Check group depth
  let groupDepth = 0;
  for (const t of tokens) {
    if (t.type === 'group-open') groupDepth++;
    else if (t.type === 'group-close') groupDepth--;
  }
  if (groupDepth !== 0) {
    errors.push({
      code: 'SIM-E004',
      severity: 'error',
      message: `Unmatched curly braces: ${groupDepth > 0 ? 'too many {' : 'too many }'}.`,
      location: 'entire document',
      hint: groupDepth > 0
        ? `Add ${groupDepth} closing brace(s) } to match.`
        : `Remove or escape ${Math.abs(groupDepth)} extra closing brace(s).`,
    });
  }

  // Check bracket depth
  let bracketDepth = 0;
  for (const t of tokens) {
    if (t.type === 'bracket-open') bracketDepth++;
    else if (t.type === 'bracket-close') bracketDepth--;
  }
  if (bracketDepth !== 0) {
    errors.push({
      code: 'SIM-E005',
      severity: 'error',
      message: `Unmatched square brackets: ${bracketDepth > 0 ? 'too many [' : 'too many ]'}.`,
      location: 'entire document',
      hint: bracketDepth > 0
        ? `Add ${bracketDepth} closing bracket(s) ] to match.`
        : `Remove or escape ${Math.abs(bracketDepth)} extra closing bracket(s).`,
    });
  }

  return { tokens, errors, environmentStack };
}

// ============================================================
// Pass 2 — Package Resolver
// Extracts \usepackage calls, checks conflicts & load order.
// ============================================================

function runPackageResolver(texContent: string): {
  errors: SimulationError[];
  warnings: SimulationWarning[];
  info: SimulationInfo[];
  packages: string[];
  packageLines: Map<string, number>;
  packageSummary: SimulationResult['packageSummary'];
} {
  const errors: SimulationError[] = [];
  const warnings: SimulationWarning[] = [];
  const info: SimulationInfo[] = [];
  const packages: string[] = [];
  const packageLines = new Map<string, number>();

  // Extract preamble (before \begin{document})
  const beginDocIdx = texContent.indexOf('\\begin{document}');
  const preamble = beginDocIdx >= 0 ? texContent.slice(0, beginDocIdx) : texContent;

  // Extract all \usepackage[options]{name} — handle multiple packages in one call
  // Pattern: \usepackage[...]{pkg1,pkg2,...}
  const usepackageRegex = /\\usepackage\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = usepackageRegex.exec(preamble)) !== null) {
    const raw = match[1];
    const pkgNames = raw.split(',').map(s => s.trim()).filter(Boolean);
    // Calculate line number
    const lineNum = preamble.slice(0, match.index).split('\n').length;

    for (const pkgName of pkgNames) {
      // Skip sub-package names like biblatex-apa (they load with biblatex)
      if (!packages.includes(pkgName)) {
        packages.push(pkgName);
        packageLines.set(pkgName, lineNum);
      }
    }
  }

  // Count known vs unknown
  const knownCount = packages.filter(p => KNOWN_PACKAGES.has(p)).length;
  const unknownCount = packages.length - knownCount;
  const conflictMessages: string[] = [];

  // ── Conflict checks ────────────────────────────────────────
  for (const conflict of PACKAGE_CONFLICTS) {
    const [pkgA, pkgB] = conflict.packages;
    if (packages.includes(pkgA) && packages.includes(pkgB)) {
      conflictMessages.push(`${pkgA} + ${pkgB}`);
      if (conflict.severity === 'error') {
        errors.push({
          code: 'SIM-E010',
          severity: 'error',
          message: conflict.message,
          location: `line ${packageLines.get(pkgB) ?? '?'}`,
          hint: conflict.hint,
        });
      } else {
        warnings.push({
          code: 'SIM-W010',
          severity: 'warning',
          message: conflict.message,
          location: `line ${packageLines.get(pkgB) ?? '?'}`,
          hint: conflict.hint,
        });
      }
    }
  }

  // ── Load-order checks ──────────────────────────────────────
  for (const rule of LOAD_ORDER_RULES) {
    const beforeIdx = packages.indexOf(rule.before);
    const afterIdx = packages.indexOf(rule.after);
    if (beforeIdx >= 0 && afterIdx >= 0 && afterIdx < beforeIdx) {
      warnings.push({
        code: 'SIM-W011',
        severity: 'warning',
        message: rule.message,
        location: `line ${packageLines.get(rule.after) ?? '?'}`,
        hint: rule.hint,
      });
    }
  }

  // ── Unknown packages ───────────────────────────────────────
  for (const pkg of packages) {
    if (!KNOWN_PACKAGES.has(pkg)) {
      warnings.push({
        code: 'SIM-W012',
        severity: 'warning',
        message: `Unknown package: "${pkg}".`,
        location: `line ${packageLines.get(pkg) ?? '?'}`,
        hint: 'If this is a custom or local package, ensure it is installed. Otherwise, check for typos.',
      });
    }
  }

  // Info: package list summary
  if (packages.length > 0) {
    info.push({
      code: 'SIM-I001',
      severity: 'info',
      message: `${packages.length} package(s) loaded in preamble.`,
      data: { packages },
    });
  }

  return {
    errors,
    warnings,
    info,
    packages,
    packageLines,
    packageSummary: {
      total: packages.length,
      known: knownCount,
      unknown: unknownCount,
      conflicts: conflictMessages,
    },
  };
}

// ============================================================
// Pass 3 — Command Validator
// Extracts \command occurrences, checks against builtins and
// loaded packages. Tracks \label / \ref cross-references.
// ============================================================

function runCommandValidator(
  texContent: string,
  loadedPackages: string[],
): {
  errors: SimulationError[];
  warnings: SimulationWarning[];
  info: SimulationInfo[];
  labelSummary: SimulationResult['labelSummary'];
} {
  const errors: SimulationError[] = [];
  const warnings: SimulationWarning[] = [];
  const info: SimulationInfo[] = [];

  // ── Collect user-defined commands via \newcommand / \renewcommand ──
  const userDefinedCommands = new Set<string>();
  const newcmdRegex = /\\(?:newcommand|renewcommand|providecommand|DeclareMathOperator|DeclarePairedDelimiter)\s*(?:\[[^\]]*\])?\s*\{\\([a-zA-Z]+)/g;
  let match: RegExpExecArray | null;
  while ((match = newcmdRegex.exec(texContent)) !== null) {
    userDefinedCommands.add(match[1]);
  }

  // Also track \newenvironment
  const newenvRegex = /\\newenvironment\s*(?:\[[^\]]*\])?\s*\{([a-zA-Z]+)/g;
  while ((match = newenvRegex.exec(texContent)) !== null) {
    userDefinedCommands.add(match[1]);
  }

  // ── Map packages to commands they provide (common subset) ──
  const PACKAGE_COMMANDS: Record<string, string[]> = {
    amsmath: ['text', 'dfrac', 'tfrac', 'binom', 'genfrac', 'overset', 'underset', 'operatorname',
              'align', 'gather', 'multline', 'split', 'cases', 'subequations', 'intertext',
              'xrightarrow', 'xleftarrow', 'shoveleft', 'shoveright'],
    amssymb: ['mathbb', 'mathfrak', 'mathscr', 'mathds', 'mathring', 'boxdot', 'boxplus', 'boxtimes',
              'iint', 'iiint', 'idotsint', 'Finv', 'Game', 'Im', 'Re', 'aleph', 'beth',
              'nabla', 'surd', 'varnothing', 'square', 'lozenge', 'diamondsuit'],
    amsthm: ['newtheorem', 'theoremstyle', 'qedsymbol', 'qedhere'],
    mathtools: ['coloneqq', 'eqqcolon', 'prescript', 'mathclap', 'shortintertext',
                'dcases', 'rcases', 'multlined', 'lgathered', 'rgathered', 'spreadlines'],
    unicode_math: ['setmathfont', 'symup', 'symit', 'symbf', 'symcal', 'symscr', 'symfrak', 'symbb'],
    bm: ['bm', 'boldmath', 'unboldmath'],
    graphicx: ['includegraphics', 'graphicspath', 'resizebox', 'scalebox', 'rotatebox', 'reflectbox'],
    float: ['newfloat', 'floatname', 'floatstyle', 'restylefloat'],
    caption: ['captionsetup', 'captionof', 'ContinuedFloat', 'declarecaptionfont', 'declarecaptionlabelseparator'],
    subcaption: ['subcaptionbox', 'subcaption', 'subcapformat'],
    subfig: ['subfloat', 'subfigtopskip', 'subfigbottomskip', 'subfigcapstyle'],
    booktabs: ['toprule', 'midrule', 'bottomrule', 'addlinespace', 'specialrule', 'abovetopsep', 'belowbottomsep'],
    tabularx: ['tabularx', 'newcolumntype', 'endtabularx'],
    longtable: ['longtable', 'endlongtable', 'endhead', 'endfoot', 'endfirsthead', 'endlastfoot'],
    multirow: ['multirow'],
    array: ['newcolumntype', 'extrarowheight', 'rowcolors'],
    natbib: ['citep', 'citet', 'citeauthor', 'citeyear', 'citealt', 'citealp', 'citetitle',
             'bibentry', 'citenum', 'citefullauthor'],
    biblatex: ['printbibliography', 'addbibresource', 'autocite', 'parencite', 'textcite',
               'footcite', 'supercite', 'parentextcite', 'autocites', 'parencites'],
    hyperref: ['href', 'url', 'hyperlink', 'hypertarget', 'nolinkurl', 'phantomsection',
               'hyperbaseurl', 'hyperimage', 'autoref'],
    cleveref: ['cref', 'crefname', 'Cref', 'Crefname', 'lcnamecref', 'labelcref', 'labelcpageref'],
    xcolor: ['definecolor', 'color', 'textcolor', 'colorbox', 'fcolorbox', 'rowcolor', 'cellcolor',
             'colorlet', 'sethlcolor', 'hl', 'selectcolormodel'],
    geometry: ['geometry'],
    setspace: ['onehalfspacing', 'doublespacing', 'singlespacing', 'setstretch'],
    fancyhdr: ['fancyhf', 'fancyhead', 'fancyfoot', 'fancypagestyle', 'headrulewidth', 'footrulewidth'],
    enumitem: ['setitemize', 'setenumerate', 'setdescription', 'newlist'],
    listings: ['lstlisting', 'lstinline', 'lstset', 'lstinputlisting', 'lstdefinelanguage', 'lstdefinestyle'],
    xspace: ['xspace'],
    fancyvrb: ['begin', 'fvset', 'fvextra', 'DefineVerbatimEnvironment', 'RecustomVerbatimEnvironment'],
    todonotes: ['todo', 'todomark', 'missingfigure', 'listoftodos'],
    tcolorbox: ['tcolorbox', 'newtcolorbox', 'tcbox', 'tcblibrary', ' tcbset'],
    glossaries: ['newglossary', 'newglossaryentry', 'gls', 'glspl', 'glsentry', 'printglossaries',
                 'glossarystyle', 'makenoidxglossaries', 'printnoidxglossary', 'newacronym'],
    nomencl: ['makenomenclature', 'printnomenclature', 'nomenclature'],
    algorithm2e: ['SetAlgoLined', 'SetKw', 'SetKwInput', 'SetKwInOut', 'KwIn', 'KwOut',
                  'KwData', 'KwResult', 'eIf', 'If', 'Else', 'EndIf', 'While', 'EndWhile',
                  'For', 'EndFor', 'Return', 'Algorithm'],
    algorithmicx: ['algorithmic', 'algorithm', 'statex', 'state', 'if', 'endif', 'else',
                   'for', 'endfor', 'while', 'endwhile', 'repeat', 'until', 'return'],
    algpseudocode: ['algorithmicx', 'algorithmic', 'Procedure', 'Function', 'State', 'If', 'ElsIf',
                    'Else', 'EndIf', 'For', 'ForAll', 'EndFor', 'While', 'EndWhile', 'Repeat',
                    'Until', 'Loop', 'EndLoop', 'Require', 'Ensure', 'State', 'Call', 'Return'],
    tikz: ['tikz', 'node', 'draw', 'fill', 'path', 'coordinate', 'foreach', 'pic',
            'usetikzlibrary', 'tikzset', 'tikzstyle'],
    pgfplots: ['beginaxis', 'endaxis', 'addplot', 'addlegendentry', 'pgfplotsset', 'pgfplotsset',
               'axis', 'legend', 'usetikzlibrary'],
    siunitx: ['si', 'SI', 'num', 'qty', 'unit', 'ang', 'quantity', 'DeclareSIUnit', 'DeclareSIQualifier'],
    cancel: ['cancel', 'bcancel', 'xcancel', 'cancelto'],
    wrapfig: ['wrapfigure', 'wraptable'],
    rotating: ['sidewaysfigure', 'sidewaystable', 'turn', 'rotate', 'scalebox', 'resizebox'],
    sidecap: ['SCfigure', 'SCtable', 'sidecaption'],
    makeidx: ['makeindex', 'printindex', 'index'],
    titlesec: ['titleformat', 'titlespacing', 'titlelabel', 'assignpagestyle'],
    footnote: ['footnotesize', 'footnotemark', 'footnoterule'],
    url: ['url', 'urldef', 'path'],
    varioref: ['vref', 'vpageref', 'Vref', 'fullref', 'labelformat'],
    import: ['import', 'subimport', 'includefrom', 'subincludefrom', 'inputfrom'],
    subfiles: ['subfiles'],
    multicol: ['begin', 'multicols'],
    placeins: ['FloatBarrier', 'RGB'],
    needspace: ['needspace'],
    afterpage: ['afterpage'],
    footmisc: ['footnotesize'],
    parskip: ['parskip'],
  };

  // Build a set of all commands provided by loaded packages
  const providedCommands = new Set<string>();
  for (const pkg of loadedPackages) {
    const cmds = PACKAGE_COMMANDS[pkg];
    if (cmds) {
      for (const c of cmds) providedCommands.add(c);
    }
  }

  // ── Extract all \command occurrences from the full document ──
  const commandRegex = /\\([a-zA-Z]+)/g;
  const seenUnknown = new Set<string>();
  while ((match = commandRegex.exec(texContent)) !== null) {
    const cmd = match[1];
    // Skip commands inside comments (rough check)
    const lineStart = texContent.lastIndexOf('\n', match.index) + 1;
    const lineText = texContent.slice(lineStart, texContent.indexOf('\n', match.index) || texContent.length);
    const commentIdx = lineText.indexOf('%');
    if (commentIdx >= 0 && match.index - lineStart > commentIdx) {
      continue;
    }

    // Skip if known builtin, user-defined, or provided by a loaded package
    if (LATEX_BUILTINS.has(cmd) || userDefinedCommands.has(cmd) || providedCommands.has(cmd)) {
      continue;
    }

    // Skip environment names (they appear after \begin/\end and are handled separately)
    if (['begin', 'end'].includes(cmd)) continue;

    if (!seenUnknown.has(cmd)) {
      seenUnknown.add(cmd);
      const lineNum = texContent.slice(0, match.index).split('\n').length;
      warnings.push({
        code: 'SIM-W020',
        severity: 'warning',
        message: `Unknown command: \\${cmd}.`,
        location: `line ${lineNum}`,
        hint: 'This command may be provided by a package not detected in the preamble, or it may be a typo.',
      });
    }
  }

  // ── Label / Reference resolution ───────────────────────────
  const definedLabels = new Set<string>();
  const referencedLabels = new Set<string>();

  // Extract \label{key}
  const labelRegex = /\\label\s*\{([^}]+)\}/g;
  while ((match = labelRegex.exec(texContent)) !== null) {
    definedLabels.add(match[1].trim());
  }

  // Extract \ref{key}, \cref{key}, \Cref{key}, \eqref{key}, \autoref{key}, \pageref{key}, \nameref{key}, \vref{key}
  const refRegex = /\\(?:ref|cref|Cref|eqref|autoref|pageref|nameref|vref|fullref)\s*\{([^}]+)\}/g;
  while ((match = refRegex.exec(texContent)) !== null) {
    referencedLabels.add(match[1].trim());
  }

  // Check for unresolved references
  const unresolvedRefs: string[] = [];
  for (const ref of Array.from(referencedLabels)) {
    if (!definedLabels.has(ref)) {
      unresolvedRefs.push(ref);
    }
  }

  // Sort for deterministic output
  unresolvedRefs.sort();

  // Warn about unresolved references (multiple undefined refs → single summary warning to avoid noise)
  if (unresolvedRefs.length > 0) {
    if (unresolvedRefs.length <= 5) {
      for (const ref of unresolvedRefs) {
        warnings.push({
          code: 'SIM-W021',
          severity: 'warning',
          message: `Unresolved reference: \\ref{${ref}} — no matching \\label found.`,
          hint: 'Add \\label{...} in the target environment (figure, table, equation, section, etc.).',
        });
      }
    } else {
      // Summary warning for many unresolved refs
      warnings.push({
        code: 'SIM-W021',
        severity: 'warning',
        message: `${unresolvedRefs.length} unresolved reference(s): ${unresolvedRefs.slice(0, 5).map(r => `"${r}"`).join(', ')}...`,
        hint: 'Add \\label{...} in each target environment. Run pdflatex multiple times to resolve forward references.',
      });
    }
  }

  // Info: label stats
  info.push({
    code: 'SIM-I002',
    severity: 'info',
    message: `${definedLabels.size} label(s) defined, ${referencedLabels.size} referenced, ${unresolvedRefs.length} unresolved.`,
    data: {
      defined: Array.from(definedLabels).sort(),
      referenced: Array.from(referencedLabels).sort(),
      unresolved: unresolvedRefs,
    },
  });

  return {
    errors,
    warnings,
    info,
    labelSummary: {
      defined: definedLabels.size,
      referenced: referencedLabels.size,
      unresolved: unresolvedRefs,
    },
  };
}

// ============================================================
// Pass 4 — BibTeX Resolver
// Parses citation keys from .tex and validates against .bib.
// ============================================================

function runBibtexResolver(
  texContent: string,
  bibContent?: string,
): {
  errors: SimulationError[];
  warnings: SimulationWarning[];
  citationSummary: SimulationResult['citationSummary'];
} {
  const errors: SimulationError[] = [];
  const warnings: SimulationWarning[] = [];

  // ── Extract citation keys from .tex ────────────────────────
  const citationKeys = new Set<string>();
  const citeRegex = /\\(?:cite[tp]?|citeauthor|citeyear|nocite|parencite|textcite|footcite|autocite|citealt|citealp)\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = citeRegex.exec(texContent)) !== null) {
    const raw = match[1];
    // Keys can be comma-separated
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    for (const key of keys) {
      citationKeys.add(key);
    }
  }

  const citationCount = citationKeys.size;

  // ── Extract BibTeX keys from .bib content ──────────────────
  const bibKeys = new Set<string>();
  if (bibContent) {
    const bibEntryRegex = /@\w+\s*\{(\s*[\w][\w\-:.]*)\s*,/g;
    while ((match = bibEntryRegex.exec(bibContent)) !== null) {
      bibKeys.add(match[1].trim());
    }
  }

  // ── Check for undefined citations ──────────────────────────
  const unresolvedCitations: string[] = [];
  if (bibContent) {
    for (const key of Array.from(citationKeys)) {
      if (!bibKeys.has(key)) {
        unresolvedCitations.push(key);
      }
    }
  } else if (citationCount > 0) {
    // No .bib provided but citations exist
    warnings.push({
      code: 'SIM-W030',
      severity: 'warning',
      message: `${citationCount} citation(s) found but no .bib content provided for validation.`,
      hint: 'Provide the .bib file content for full citation validation.',
    });
  }

  // Sort for deterministic output
  unresolvedCitations.sort();

  // Report unresolved citation keys
  if (unresolvedCitations.length > 0) {
    if (unresolvedCitations.length <= 5) {
      for (const key of unresolvedCitations) {
        errors.push({
          code: 'SIM-E030',
          severity: 'error',
          message: `Undefined citation: "${key}" — not found in .bib file.`,
          hint: 'Check for typos in the \\cite{...} key or add the entry to the .bib file.',
        });
      }
    } else {
      errors.push({
        code: 'SIM-E030',
        severity: 'error',
        message: `${unresolvedCitations.length} undefined citation(s): ${unresolvedCitations.slice(0, 5).map(k => `"${k}"`).join(', ')}...`,
        hint: 'Check for typos in citation keys or add missing entries to the .bib file.',
      });
    }
  }

  // ── Check \bibliography command ────────────────────────────
  const bibCmdMatch = /\\bibliography\s*\{([^}]+)\}/.exec(texContent);
  if (bibCmdMatch) {
    const bibFiles = bibCmdMatch[1].split(',').map(f => f.trim());
    // Verify that the .bib filename(s) are reasonable
    for (const f of bibFiles) {
      if (!/^[a-zA-Z0-9_\-./]+$/.test(f)) {
        warnings.push({
          code: 'SIM-W031',
          severity: 'warning',
          message: `Unusual bibliography filename: "${f}".`,
          hint: 'Use simple alphanumeric filenames for .bib files (e.g., "references", "bibliography").',
        });
      }
    }
  }

  // Check for \cite without \bibliography or \bibliographystyle
  if (citationCount > 0 && !bibCmdMatch && !texContent.includes('\\begin{thebibliography}')) {
    warnings.push({
      code: 'SIM-W032',
      severity: 'warning',
      message: 'Citations found but no \\bibliography{} command or thebibliography environment.',
      hint: 'Add \\bibliography{yourfile} (with matching .bib) or use \\begin{thebibliography}{} for inline entries.',
    });
  }

  // Check for \bibliographystyle without matching \bibliography
  const styleMatch = /\\bibliographystyle\s*\{([^}]+)\}/.exec(texContent);
  if (styleMatch && !bibCmdMatch && !texContent.includes('\\printbibliography')) {
    warnings.push({
      code: 'SIM-W033',
      severity: 'warning',
      message: `\\bibliographystyle{${styleMatch[1]}} found but no \\bibliography{} command.`,
      hint: 'Add \\bibliography{yourfile} to use the bibliography style, or remove the \\bibliographystyle command.',
    });
  }

  return {
    errors,
    warnings,
    citationSummary: {
      totalCitations: citationCount,
      definedKeys: bibKeys.size,
      unresolvedKeys: unresolvedCitations,
    },
  };
}

// ============================================================
// Page Count Estimation
// Strip LaTeX commands and count words. ~300 words/page.
// ============================================================

function estimatePageCount(texContent: string): number {
  if (!texContent.trim()) return 0;

  // Remove comments
  let cleaned = texContent.replace(/%[^\n]*/g, '');

  // Remove preamble
  const beginDocIdx = cleaned.indexOf('\\begin{document}');
  if (beginDocIdx >= 0) {
    const endDocIdx = cleaned.indexOf('\\end{document}');
    cleaned = endDocIdx >= 0
      ? cleaned.slice(beginDocIdx + '\\begin{document}'.length, endDocIdx)
      : cleaned.slice(beginDocIdx + '\\begin{document}'.length);
  }

  // Remove common LaTeX commands but keep their text arguments
  cleaned = cleaned
    // Remove \begin{...} and \end{...}
    .replace(/\\(?:begin|end)\{[^}]*\}/g, ' ')
    // Remove \command{} keeping content inside braces
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1 ')
    // Remove \command[...]{...} keeping content inside braces
    .replace(/\\[a-zA-Z]+\[[^\]]*\]\{([^}]*)\}/g, '$1 ')
    // Remove standalone commands (no arguments)
    .replace(/\\[a-zA-Z]+/g, ' ')
    // Remove remaining braces, brackets, special chars
    .replace(/[{}[\]\\$&#_^~]/g, ' ')
    // Remove display math content (equations count as less text)
    .replace(/\$\$[^$]*\$\$/g, ' ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' ')
    // Remove inline math but keep a word-like placeholder
    .replace(/\$[^$]*\$/g, ' formula ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 0;

  // Count words (sequences of non-space characters, at least 1 char)
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;

  return Math.ceil(totalWords / 300);
}

// ============================================================
// Compilation Recipe
// Standard pdflatex + bibtex compilation sequence.
// ============================================================

function buildCompilationRecipe(): CompilationStep[] {
  return [
    {
      command: 'pdflatex main',
      description: 'First pass — resolves references',
      purpose: 'Initial compilation',
    },
    {
      command: 'bibtex main',
      description: 'Generate bibliography',
      purpose: 'Citation resolution',
    },
    {
      command: 'pdflatex main',
      description: 'Second pass — includes bibliography',
      purpose: 'Bibliography integration',
    },
    {
      command: 'pdflatex main',
      description: 'Third pass — resolves cross-refs',
      purpose: 'Final resolution',
    },
  ];
}

// ============================================================
// Main Function — simulateCompilation
// Runs all 4 passes and returns a complete SimulationResult.
// ============================================================

export function simulateCompilation(
  texContent: string,
  bibContent?: string,
): SimulationResult {
  // Handle empty/null content gracefully
  if (!texContent || texContent.trim().length === 0) {
    return {
      passed: true,
      errors: [],
      warnings: [],
      info: [
        {
          code: 'SIM-I000',
          severity: 'info',
          message: 'No TeX content provided — nothing to simulate.',
        },
      ],
      estimatedPageCount: 0,
      compilationRecipe: buildCompilationRecipe(),
      packageSummary: { total: 0, known: 0, unknown: 0, conflicts: [] },
      labelSummary: { defined: 0, referenced: 0, unresolved: [] },
      citationSummary: { totalCitations: 0, definedKeys: 0, unresolvedKeys: [] },
    };
  }

  // ── Pass 1: Tokenizer ──────────────────────────────────────
  const tokenizerResult = runTokenizer(texContent);

  // ── Pass 2: Package Resolver ───────────────────────────────
  const packageResult = runPackageResolver(texContent);

  // ── Pass 3: Command Validator ──────────────────────────────
  const commandResult = runCommandValidator(texContent, packageResult.packages);

  // ── Pass 4: BibTeX Resolver ────────────────────────────────
  const bibtexResult = runBibtexResolver(texContent, bibContent);

  // ── Collect all issues ─────────────────────────────────────
  const allErrors: SimulationError[] = [
    ...tokenizerResult.errors,
    ...packageResult.errors,
    ...commandResult.errors,
    ...bibtexResult.errors,
  ];

  const allWarnings: SimulationWarning[] = [
    ...packageResult.warnings,
    ...commandResult.warnings,
    ...bibtexResult.warnings,
  ];

  const allInfo: SimulationInfo[] = [
    ...packageResult.info,
    ...commandResult.info,
  ];

  // ── Page count estimation ──────────────────────────────────
  const estimatedPageCount = estimatePageCount(texContent);

  // Add page count info
  allInfo.push({
    code: 'SIM-I003',
    severity: 'info',
    message: `Estimated page count: ${estimatedPageCount} page(s) (~300 words/page).`,
    data: { estimatedPageCount },
  });

  // ── passed = no errors ─────────────────────────────────────
  const passed = allErrors.length === 0;

  return {
    passed,
    errors: allErrors,
    warnings: allWarnings,
    info: allInfo,
    estimatedPageCount,
    compilationRecipe: buildCompilationRecipe(),
    packageSummary: packageResult.packageSummary,
    labelSummary: commandResult.labelSummary,
    citationSummary: bibtexResult.citationSummary,
  };
}
