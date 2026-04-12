// ============================================================
// ThesisForge Core — LaTeX Output Quality Contract (30 checks)
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
// The 30 Contract Checks
// ============================================================

interface ContractCheck {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  check: (tex: string, bib: string, state?: ThesisData) => boolean;
}

const ENGINE_CONTRACT: ContractCheck[] = [
  // ── Compilability (C01-C07) ──────────────────────────────────
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

  // ── Package Integrity (P01-P05) ──────────────────────────────
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

  // ── Structure (S01-S07) ──────────────────────────────────────
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

  // ── Bibliography (B01-B03) ───────────────────────────────────
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

  // ── Quality (Q01-Q05) ────────────────────────────────────────
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
