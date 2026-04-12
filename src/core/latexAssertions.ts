// ============================================================
// ThesisForge Core — LaTeX Output Quality Contract (41 checks)
// Every document produced by the engine must satisfy all checks.
// Run verifyEngineContract(tex, bib, wizardState) before every export.
// Warnings surface in the UI. Errors block export.
// ============================================================

import type { ThesisData } from '@/lib/thesis-types';
import { escapeLatexMeta } from '@/engine/escape';

export interface ContractError {
  id: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================
// The 41 Contract Checks
// ============================================================

interface ContractCheck {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  check: (tex: string, bib: string, state?: ThesisData) => boolean;
}

const ENGINE_CONTRACT: ContractCheck[] = [
  // ── Compilability (C01-C09) ──────────────────────────────────
  {
    id: 'C01', severity: 'error',
    message: 'Unbalanced braces — mismatched { and }',
    check: (tex) => {
      let depth = 0;
      for (const ch of tex) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        if (depth < 0) return false;
      }
      return depth === 0;
    },
  },
  {
    id: 'C02', severity: 'error',
    message: 'Unmatched \\begin/\\end environments',
    check: (tex) => {
      const begins = (tex.match(/\\begin\{([^}]+)\}/g) || []).length;
      const ends = (tex.match(/\\end\{([^}]+)\}/g) || []).length;
      return begins === ends;
    },
  },
  {
    id: 'C03', severity: 'error',
    message: '\\documentclass must appear exactly once',
    check: (tex) => (tex.match(/\\documentclass/g) || []).length === 1,
  },
  {
    id: 'C04', severity: 'error',
    message: 'Missing \\begin{document}',
    check: (tex) => tex.includes('\\begin{document}'),
  },
  {
    id: 'C05', severity: 'error',
    message: '\\end{document} must be the last line',
    check: (tex) => tex.trimEnd().endsWith('\\end{document}'),
  },
  {
    id: 'C06', severity: 'error',
    message: 'Content after \\end{document}',
    check: (tex) => {
      const endIdx = tex.lastIndexOf('\\end{document}');
      const after = tex.slice(endIdx + '\\end{document}'.length).trim();
      return after.length === 0;
    },
  },
  {
    id: 'C07', severity: 'warning',
    message: 'Possible unescaped special character in text',
    check: (tex) => {
      const lines = tex.split('\n');
      for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('%')) continue;
        if (trimmed.startsWith('\\')) continue;
        if (/(?<!\\)[&%$#_]/.test(trimmed)) return false;
      }
      return true;
    },
  },
  {
    id: 'C08', severity: 'warning',
    message: '\\bibliography{references} should appear before \\end{document}',
    check: (tex) => {
      if (!tex.includes('\\bibliography{')) return true; // no bibliography command
      const bibIdx = tex.indexOf('\\bibliography{');
      const endIdx = tex.indexOf('\\end{document}');
      if (endIdx < 0) return true;
      return bibIdx < endIdx;
    },
  },
  {
    id: 'C09', severity: 'error',
    message: 'Duplicate \\label{} keys detected across the document',
    check: (tex) => {
      const labels = [...tex.matchAll(/\\label\{([^}]+)\}/g)].map(m => m[1].trim());
      const seen = new Set<string>();
      for (const label of labels) {
        if (seen.has(label)) return false;
        seen.add(label);
      }
      return true;
    },
  },

  // ── Package Integrity (P01-P07) ──────────────────────────────
  {
    id: 'P01', severity: 'error',
    message: 'Missing inputenc with utf8',
    check: (tex) => tex.includes('\\usepackage[utf8]{inputenc}'),
  },
  {
    id: 'P02', severity: 'error',
    message: 'Missing fontenc with T1',
    check: (tex) => tex.includes('\\usepackage[T1]{fontenc}'),
  },
  {
    id: 'P03', severity: 'error',
    message: 'Missing hyperref package',
    check: (tex) => tex.includes('\\usepackage{hyperref}'),
  },
  {
    id: 'P04', severity: 'warning',
    message: 'hyperref must be second-to-last package',
    check: (tex) => {
      const lines = tex.split('\n');
      const hyperLine = lines.findIndex(l => l.includes('\\usepackage{hyperref}') || l.includes('\\usepackage['));
      if (hyperLine < 0) return true;
      // Check no non-cleveref usepackage after hyperref
      const afterHyper = lines.slice(hyperLine + 1);
      const laterPackages = afterHyper.filter(l =>
        l.includes('\\usepackage') &&
        !l.includes('cleveref') &&
        !l.includes('hyperref') &&
        !l.startsWith('%')
      );
      return laterPackages.length === 0;
    },
  },
  {
    id: 'P05', severity: 'warning',
    message: 'Duplicate \\usepackage declarations',
    check: (tex) => {
      const pkgs = [...tex.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g)].map(m => m[1]);
      return new Set(pkgs).size === pkgs.length;
    },
  },
  {
    id: 'P06', severity: 'warning',
    message: 'cleveref is loaded but \\cref is never used',
    check: (tex) => {
      if (!tex.includes('\\usepackage{cleveref}')) return true;
      return /\\cref[^\w]/.test(tex);
    },
  },
  {
    id: 'P07', severity: 'warning',
    message: '\\usepackage{times} is deprecated — use mathptmx instead',
    check: (tex) => !tex.includes('\\usepackage{times}'),
  },

  // ── Structure (S01-S10) ──────────────────────────────────────
  {
    id: 'S01', severity: 'warning',
    message: 'Empty \\chapter{} command detected',
    check: (tex) => !tex.match(/\\chapter\{\s*\}/),
  },
  {
    id: 'S02', severity: 'warning',
    message: 'Empty \\section{} command detected',
    check: (tex) => !tex.match(/\\section\{\s*\}/),
  },
  {
    id: 'S03', severity: 'error',
    message: 'Missing \\tableofcontents',
    check: (tex) => tex.includes('\\tableofcontents'),
  },
  {
    id: 'S04', severity: 'error',
    message: 'References exist but \\bibliography missing',
    check: (tex, bib) => tex.includes('\\bibliography{') || tex.includes('\\begin{thebibliography}') || bib.trim() === '',
  },
  {
    id: 'S05', severity: 'warning',
    message: 'Missing \\hypersetup block',
    check: (tex) => tex.includes('\\hypersetup{'),
  },
  {
    id: 'S06', severity: 'warning',
    message: 'Title not found in document',
    check: (tex, _, state) => {
      if (!state?.metadata?.title) return true; // No title to check
      const escaped = escapeLatexMeta(state.metadata.title).slice(0, 20);
      return tex.includes(escaped);
    },
  },
  {
    id: 'S07', severity: 'warning',
    message: 'Author not found in document',
    check: (tex, _, state) => {
      if (!state?.metadata?.author) return true;
      const escaped = escapeLatexMeta(state.metadata.author).slice(0, 10);
      return tex.includes(escaped);
    },
  },
  {
    id: 'S08', severity: 'warning',
    message: 'Book class detected but missing \\frontmatter/\\mainmatter/\\backmatter',
    check: (tex) => {
      if (!/\\documentclass(?:\[[^\]]*\])?\{book\}/.test(tex)) return true;
      const hasFront = tex.includes('\\frontmatter');
      const hasMain = tex.includes('\\mainmatter');
      const hasBack = tex.includes('\\backmatter');
      return hasFront && hasMain && hasBack;
    },
  },
  {
    id: 'S09', severity: 'warning',
    message: 'Figure environment missing \\caption or \\label',
    check: (tex) => {
      const figures = [...tex.matchAll(/\\begin\{figure\}([\s\S]*?)\\end\{figure\}/g)];
      for (const match of figures) {
        const body = match[1];
        if (!/\\caption/.test(body)) return false;
        if (!/\\label/.test(body)) return false;
      }
      return true;
    },
  },
  {
    id: 'S10', severity: 'warning',
    message: 'Table environment missing \\caption or \\label',
    check: (tex) => {
      const tables = [...tex.matchAll(/\\begin\{table\}([\s\S]*?)\\end\{table\}/g)];
      for (const match of tables) {
        const body = match[1];
        if (!/\\caption/.test(body)) return false;
        if (!/\\label/.test(body)) return false;
      }
      return true;
    },
  },

  // ── Bibliography (B01-B05) ───────────────────────────────────
  {
    id: 'B01', severity: 'warning',
    message: 'Undefined citation keys',
    check: (tex, bib) => {
      const cited = [...tex.matchAll(/\\cite[a-z]*\{([^}]+)\}/g)].flatMap(m => m[1].split(',').map(k => k.trim()));
      if (cited.length === 0) return true;
      const defined = new Set([...bib.matchAll(/@\w+\{([^,]+),/g)].map(m => m[1].trim()));
      // Also check thebibliography
      const bibItemKeys = new Set([...tex.matchAll(/\\bibitem\{([^}]+)\}/g)].map(m => m[1].trim()));
      const allDefined = new Set([...defined, ...bibItemKeys]);
      return cited.every(k => !k || allDefined.has(k));
    },
  },
  {
    id: 'B02', severity: 'warning',
    message: 'Duplicate BibTeX keys',
    check: (_, bib) => {
      const keys = [...bib.matchAll(/@\w+\{([^,]+),/g)].map(m => m[1].trim());
      return new Set(keys).size === keys.length;
    },
  },
  {
    id: 'B03', severity: 'warning',
    message: 'BibTeX keys must be alphanumeric only',
    check: (_, bib) => {
      const keys = [...bib.matchAll(/@\w+\{([^,]+),/g)].map(m => m[1].trim());
      return keys.every(k => /^[a-z0-9]+$/.test(k));
    },
  },
  {
    id: 'B04', severity: 'error',
    message: 'Citation key has no matching BibTeX entry or \\bibitem',
    check: (tex, bib) => {
      const cited = [...tex.matchAll(/\\(?:citep|citet|cite)\{([^}]+)\}/g)]
        .flatMap(m => m[1].split(',').map(k => k.trim()))
        .filter(k => k.length > 0);
      if (cited.length === 0) return true;
      const defined = new Set([...bib.matchAll(/@\w+\{([^,]+),/g)].map(m => m[1].trim()));
      const bibItemKeys = new Set([...tex.matchAll(/\\bibitem\{([^}]+)\}/g)].map(m => m[1].trim()));
      const allDefined = new Set([...defined, ...bibItemKeys]);
      return cited.every(k => allDefined.has(k));
    },
  },
  {
    id: 'B05', severity: 'warning',
    message: 'BibTeX keys contain spaces or special characters',
    check: (_, bib) => {
      const keys = [...bib.matchAll(/@\w+\{([^,]+),/g)].map(m => m[1].trim());
      return keys.every(k => /^[a-zA-Z0-9_-]+$/.test(k));
    },
  },

  // ── Metadata (M01-M04) ───────────────────────────────────────
  {
    id: 'M01', severity: 'warning',
    message: 'Missing pdftitle in hypersetup',
    check: (tex) => tex.includes('pdftitle'),
  },
  {
    id: 'M02', severity: 'warning',
    message: 'Missing pdfauthor in hypersetup',
    check: (tex) => tex.includes('pdfauthor'),
  },
  {
    id: 'M03', severity: 'warning',
    message: 'Missing colorlinks in hypersetup',
    check: (tex) => tex.includes('colorlinks'),
  },
  {
    id: 'M04', severity: 'warning',
    message: 'Missing fancyhdr page style',
    check: (tex) => tex.includes('\\pagestyle{fancy}'),
  },

  // ── Quality (Q01-Q07) ────────────────────────────────────────
  {
    id: 'Q01', severity: 'info',
    message: 'Straight double quotes in text (use `` and \'\')',
    check: (tex) => {
      // Check for straight quotes that aren't in comments or commands
      const lines = tex.split('\n');
      for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('%')) continue;
        if (trimmed.startsWith('\\')) continue;
        // Look for " that isn't part of a LaTeX command
        const stripped = trimmed.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '').replace(/%.*$/, '');
        if (/"[^"]*"/.test(stripped)) return false;
      }
      return true;
    },
  },
  {
    id: 'Q02', severity: 'info',
    message: 'Double space after period detected',
    check: (tex) => !/\. {2,}[A-Z]/.test(tex),
  },
  {
    id: 'Q03', severity: 'warning',
    message: 'Missing microtype configuration',
    check: (tex) => tex.includes('\\microtypesetup'),
  },
  {
    id: 'Q04', severity: 'info',
    message: 'Missing \\bibliographystyle declaration',
    check: (tex) => tex.includes('\\bibliographystyle'),
  },
  {
    id: 'Q05', severity: 'info',
    message: 'Document has no chapters or sections',
    check: (tex) => tex.includes('\\chapter{') || tex.includes('\\section{'),
  },
  {
    id: 'Q06', severity: 'info',
    message: 'No \\listoffigures or \\listoftables despite having figures/tables',
    check: (tex, _, state) => {
      // Only applicable for PhD template
      if (state?.type !== 'phd') return true;
      const hasFigures = /\\begin\{figure\}/.test(tex);
      const hasTables = /\\begin\{table\}/.test(tex);
      if (!hasFigures && !hasTables) return true;
      const hasListOfFigures = tex.includes('\\listoffigures');
      const hasListOfTables = tex.includes('\\listoftables');
      if (hasFigures && !hasListOfFigures) return false;
      if (hasTables && !hasListOfTables) return false;
      return true;
    },
  },
  {
    id: 'Q07', severity: 'warning',
    message: 'Detected \\hline\\hline (double rules) — use \\toprule/\\midrule/\\bottomrule instead',
    check: (tex) => !/\\hline\s*\\hline/.test(tex),
  },

  // ── Advanced Quality (A01-A03) ───────────────────────────────
  {
    id: 'A01', severity: 'info',
    message: 'No labels found — cross-references will not work',
    check: (tex) => tex.includes('\\label{'),
  },
  {
    id: 'A02', severity: 'info',
    message: 'No abstract content detected',
    check: (tex) => {
      // Check if abstract has meaningful content (not just the heading)
      const abstractMatch = tex.match(/\\chapter\*?\{Abstract\}([\s\S]*?)(?=\\chapter|\\bibliography|\\end\{document\})/i);
      if (!abstractMatch) return true; // No abstract section = not an error
      const abstractBody = abstractMatch[1]
        .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
        .replace(/%.*$/gm, '')
        .trim();
      return abstractBody.length > 50; // At least some content
    },
  },
  {
    id: 'A03', severity: 'info',
    message: 'Lines exceeding 120 characters may be hard to read',
    check: (tex) => {
      const lines = tex.split('\n');
      const longLines = lines.filter(l => l.length > 120);
      return longLines.length <= 5; // Allow a few long lines
    },
  },
];

// ============================================================
// Contract Verification Engine
// ============================================================

export interface LatexContractError {
  code: string;
  message: string;
}

/**
 * Verify the full engine contract. Returns errors (empty = clean).
 * @param severity - Minimum severity to include: 'error' | 'warning' | 'info'
 */
export function assertLatexContract(
  tex: string,
  bib: string,
  state?: ThesisData,
  severity: 'error' | 'warning' | 'info' = 'error'
): LatexContractError[] {
  const severityOrder = { error: 0, warning: 1, info: 2 };
  const minSeverity = severityOrder[severity];

  return ENGINE_CONTRACT
    .filter(check => severityOrder[check.severity] <= minSeverity)
    .map(rule => ({
      code: rule.id,
      message: rule.message,
      passed: (() => { try { return rule.check(tex, bib, state); } catch { return false; } })(),
      severity: rule.severity,
    }))
    .filter(r => !r.passed)
    .map(r => ({ code: r.code, message: r.message }));
}

/**
 * Get all contract check results (passed + failed) for UI display.
 */
export function getFullContractReport(
  tex: string,
  bib: string,
  state?: ThesisData
): Array<{ id: string; passed: boolean; message: string; severity: string }> {
  return ENGINE_CONTRACT.map(rule => ({
    id: rule.id,
    passed: (() => { try { return rule.check(tex, bib, state); } catch { return false; } })(),
    message: rule.message,
    severity: rule.severity,
  }));
}

/**
 * Get a quick pass/fail summary.
 */
export function contractSummary(
  tex: string,
  bib: string,
  state?: ThesisData
): { total: number; passed: number; failed: number; errors: number; warnings: number; infos: number } {
  const results = ENGINE_CONTRACT.map(rule => ({
    passed: (() => { try { return rule.check(tex, bib, state); } catch { return false; } })(),
    severity: rule.severity,
  }));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed);
  return {
    total: results.length,
    passed,
    failed: failed.length,
    errors: failed.filter(r => r.severity === 'error').length,
    warnings: failed.filter(r => r.severity === 'warning').length,
    infos: failed.filter(r => r.severity === 'info').length,
  };
}
