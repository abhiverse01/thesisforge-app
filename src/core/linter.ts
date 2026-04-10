// ============================================================
// ThesisForge Core — LaTeX Lint Engine
// Post-generation checks on the .tex string before download.
// Errors block export; warnings do not.
// ============================================================

export interface LintIssue {
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  line?: number;
  context?: string;
}

export interface LintResult {
  errors: LintIssue[];
  warnings: LintIssue[];
  infos: LintIssue[];
  all: LintIssue[];
  hasErrors: boolean;
}

// ============================================================
// Lint Rules
// ============================================================

const LINT_RULES: Array<{
  id: string;
  check: (tex: string) => boolean | { pass: boolean; line?: number; context?: string };
  message: string;
  severity: 'error' | 'warning' | 'info';
}> = [
  {
    id: 'unmatched-braces',
    check: (tex) => {
      const open = (tex.match(/\{/g) || []).length;
      const close = (tex.match(/\}/g) || []).length;
      return open === close;
    },
    message: 'Unmatched braces detected. The file may not compile.',
    severity: 'error',
  },
  {
    id: 'missing-documentclass',
    check: (tex) => tex.includes('\\documentclass'),
    message: 'No \\documentclass command found. The file will not compile.',
    severity: 'error',
  },
  {
    id: 'missing-begin-document',
    check: (tex) => tex.includes('\\begin{document}'),
    message: 'No \\begin{document} found.',
    severity: 'error',
  },
  {
    id: 'missing-end-document',
    check: (tex) => tex.includes('\\end{document}'),
    message: 'No \\end{document} found.',
    severity: 'error',
  },
  {
    id: 'missing-bibliography',
    check: (tex) => {
      if (tex.includes('\\cite{') && !tex.includes('\\bibliography{') && !tex.includes('\\begin{thebibliography}')) {
        return false;
      }
      return true;
    },
    message: '\\cite{} found but no \\bibliography{} or thebibliography environment.',
    severity: 'error',
  },
  {
    id: 'smart-quotes',
    check: (tex) => !/[\u201C\u201D\u2018\u2019]/.test(tex),
    message: 'Smart/curly quotes detected. Replace with LaTeX quotes: `` and \'\'.',
    severity: 'warning',
  },
  {
    id: 'long-lines',
    check: (tex) => {
      const lines = tex.split('\n');
      const longLines = lines.filter(l => l.length > 120);
      if (longLines.length > 0) {
        return { pass: false, line: lines.findIndex(l => l.length > 120) + 1, context: longLines[0].slice(0, 80) + '...' };
      }
      return true;
    },
    message: 'Lines exceeding 120 characters found. May be hard to read in editors.',
    severity: 'info',
  },
  {
    id: 'double-space-after-period',
    check: (tex) => !/\. {2,}[A-Z]/.test(tex),
    message: 'Double-space after period detected. LaTeX handles spacing automatically.',
    severity: 'info',
  },
  {
    id: 'unescaped-ampersand',
    check: (tex) => {
      // Match & not preceded by \ and not inside a comment or table alignment
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        // Skip table/alignment contexts
        if (line.includes('\\begin{tabular')) continue;
        if (line.includes('\\begin{align')) continue;
        if (line.includes('&') && !line.includes('\\&')) {
          // It's OK inside tabular/align environments — we do a rough check
          const matches = line.match(/&(?!\\)/g);
          if (matches && matches.length > 2) {
            return { pass: false, line: i + 1, context: line.slice(0, 60) };
          }
        }
      }
      return true;
    },
    message: 'Possible unescaped ampersand (&) found. Use \\& outside of tables.',
    severity: 'warning',
  },
  {
    id: 'hyperref-loaded-last',
    check: (tex) => {
      const hyperrefIdx = tex.indexOf('hyperref');
      const lastPkgMatch = tex.lastIndexOf('\\usepackage');
      // hyperref should be one of the last usepackage calls
      if (hyperrefIdx > 0 && lastPkgMatch > 0) {
        // Check if there are non-hyperref usepackage calls after hyperref
        const afterHyperref = tex.slice(hyperrefIdx + 10);
        const laterPackages = afterHyperref.match(/\\usepackage/g);
        if (laterPackages && laterPackages.length > 0) {
          // There are packages loaded after hyperref — warning
          return false;
        }
      }
      return true;
    },
    message: 'hyperref should be loaded last (or near-last). Other packages may conflict.',
    severity: 'warning',
  },
  {
    id: 'natbib-before-hyperref',
    check: (tex) => {
      const natbibIdx = tex.indexOf('natbib');
      const hyperrefIdx = tex.indexOf('hyperref');
      if (natbibIdx > 0 && hyperrefIdx > 0 && natbibIdx > hyperrefIdx) {
        return false;
      }
      return true;
    },
    message: 'natbib should be loaded before hyperref for correct citation links.',
    severity: 'info',
  },
  {
    id: 'empty-chapter',
    check: (tex) => {
      const chapterRegex = /\\chapter\{([^}]+)\}\s*\n\s*\\chapter/g;
      if (chapterRegex.test(tex)) {
        return false;
      }
      return true;
    },
    message: 'Empty chapter detected (consecutive \\chapter without content between them).',
    severity: 'warning',
  },
];

// ============================================================
// Lint Engine
// ============================================================

/**
 * Run all lint rules on generated LaTeX.
 */
export function lintLatex(tex: string): LintResult {
  const all: LintIssue[] = [];

  for (const rule of LINT_RULES) {
    const result = rule.check(tex);
    let pass: boolean;
    let line: number | undefined;
    let context: string | undefined;

    if (typeof result === 'boolean') {
      pass = result;
    } else {
      pass = result.pass;
      line = result.line;
      context = result.context;
    }

    if (!pass) {
      const issue: LintIssue = {
        id: rule.id,
        message: rule.message,
        severity: rule.severity,
        line,
        context,
      };
      all.push(issue);
    }
  }

  return {
    errors: all.filter(i => i.severity === 'error'),
    warnings: all.filter(i => i.severity === 'warning'),
    infos: all.filter(i => i.severity === 'info'),
    all,
    hasErrors: all.some(i => i.severity === 'error'),
  };
}

/**
 * Get a summary string for lint results.
 */
export function lintSummary(result: LintResult): string {
  const parts: string[] = [];
  if (result.errors.length > 0) parts.push(`${result.errors.length} error(s)`);
  if (result.warnings.length > 0) parts.push(`${result.warnings.length} warning(s)`);
  if (result.infos.length > 0) parts.push(`${result.infos.length} info`);

  if (parts.length === 0) return 'No issues found. LaTeX looks good!';
  return parts.join(', ');
}
