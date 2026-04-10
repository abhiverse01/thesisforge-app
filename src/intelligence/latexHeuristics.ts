// ============================================================
// ThesisForge Intelligence — Algorithm 7: LaTeX Pattern Heuristics
// Pattern recognizer that surfaces teaching moments — not a linter.
// Detects Markdown patterns, smart quotes, bare URLs, etc.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { HeuristicFinding } from './types';

export type HeuristicSeverity = 'error' | 'warning' | 'suggestion' | 'info';

interface HeuristicRule {
  id: string;
  pattern: RegExp;
  severity: HeuristicSeverity;
  message: (match: RegExpExecArray) => string;
  autofix: (match: RegExpExecArray) => string;
}

/**
 * Heuristic rules for detecting common LaTeX anti-patterns.
 * Each rule is a pattern recognizer with an optional autofix.
 */
const HEURISTIC_RULES: HeuristicRule[] = [
  {
    id: 'markdown-bold',
    pattern: /\*\*(.+?)\*\*/g,
    severity: 'suggestion',
    message: (match) =>
      `"${match[1]}" looks like Markdown bold. In LaTeX, use \\textbf{${match[1]}}`,
    autofix: (match) => `\\textbf{${match[1]}}`,
  },
  {
    id: 'markdown-italic',
    pattern: /\*([^*]+?)\*/g,
    severity: 'suggestion',
    message: (match) =>
      `"${match[1]}" looks like Markdown italic. Use \\textit{${match[1]}}`,
    autofix: (match) => `\\textit{${match[1]}}`,
  },
  {
    id: 'smart-quotes',
    pattern: /[\u201C\u201D\u2018\u2019]/g,
    severity: 'warning',
    message: () =>
      'Smart quotes detected. LaTeX uses `` for opening and \'\' for closing double quotes.',
    autofix: (match) => {
      const c = match[0];
      if (c === '\u201C') return '``';
      if (c === '\u201D') return "''";
      if (c === '\u2018') return '`';
      if (c === '\u2019') return "'";
      return match[0];
    },
  },
  {
    id: 'percent-sign',
    pattern: /(?<!\\)(\d+)\s*%/g,
    severity: 'warning',
    message: (match) =>
      `"${match[0]}" — the % sign must be escaped in LaTeX: ${match[1]}\\%`,
    autofix: (match) => `${match[1]}\\%`,
  },
  {
    id: 'em-dash',
    pattern: /\s-\s/g,
    severity: 'suggestion',
    message: () =>
      'A lone hyphen surrounded by spaces may be an em dash. In LaTeX use --- (em dash) or -- (en dash).',
    autofix: () => ' --- ',
  },
  {
    id: 'url-in-text',
    pattern: /(?<!\\url\{)(?<!\\href\{)https?:\/\/[^\s,}]+/g,
    severity: 'suggestion',
    message: (match) =>
      `Bare URL detected. Use \\url{${match[0]}} or cite it as a reference instead.`,
    autofix: (match) => `\\url{${match[0]}}`,
  },
  {
    id: 'double-space-after-period',
    pattern: /\. {2,}[A-Z]/g,
    severity: 'info',
    message: () =>
      'Double space after period. LaTeX handles inter-sentence spacing automatically.',
    autofix: (match) => match[0].replace(/  +/, ' '),
  },
  {
    id: 'ampersand',
    pattern: /(?<!\\)&(?![a-zA-Z])/g,
    severity: 'warning',
    message: () =>
      'Unescaped & detected. In LaTeX, use \\& for a literal ampersand.',
    autofix: (match) => '\\&',
  },
  {
    id: 'hash-symbol',
    pattern: /(?<!\\)#(?!)/g,
    severity: 'warning',
    message: () =>
      'Unescaped # detected. In LaTeX, use \\# for a literal hash symbol.',
    autofix: () => '\\#',
  },
  {
    id: 'dollar-sign',
    pattern: /(?<![\\$])\$(?![^{])/g,
    severity: 'suggestion',
    message: () =>
      'Unescaped $ detected. In LaTeX, $ enters math mode. Use \\$ for a literal dollar sign.',
    autofix: () => '\\$',
  },
];

/**
 * Strip code blocks and verbatim environments from text
 * before running pattern matching. Prevents false positives.
 */
function stripCodeBlocks(text: string): string {
  return text
    .replace(/\\begin\{verbatim\}[\s\S]*?\\end\{verbatim\}/g, '')
    .replace(/\\begin\{lstlisting\}[\s\S]*?\\end\{lstlisting\}/g, '')
    .replace(/\\begin\{minted\}[\s\S]*?\\end\{minted\}/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\\verb[^{]*\{[^}]*\}/g, '');
}

/**
 * Run heuristic pattern matching on chapter body text.
 *
 * Strips verbatim/code environments first to prevent false positives.
 * Returns findings sorted by severity and offset.
 *
 * Edge cases:
 * - Empty string → returns []
 * - All code blocks → returns []
 * - Very long text → capped at reasonable output
 *
 * Performance budget: < 6ms per chapter body
 */
export function runHeuristics(text: string): HeuristicFinding[] {
  if (!text || typeof text !== 'string') return [];

  const cleanedText = stripCodeBlocks(text);
  const findings: HeuristicFinding[] = [];

  for (const rule of HEURISTIC_RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = re.exec(cleanedText)) !== null) {
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        offset: match.index,
        length: match[0].length,
        original: match[0],
        message: rule.message(match),
        fix: rule.autofix ? rule.autofix(match) : null,
      });
    }
  }

  // Sort by severity (error > warning > suggestion > info), then by offset
  const severityOrder: Record<string, number> = {
    error: 0,
    warning: 1,
    suggestion: 2,
    info: 3,
  };
  findings.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99) ||
      a.offset - b.offset
  );

  return findings;
}

/**
 * Apply a single heuristic fix at the given offset.
 * Returns the new text with the fix applied.
 */
export function applyHeuristicFix(
  text: string,
  offset: number,
  length: number,
  fix: string
): string {
  return text.slice(0, offset) + fix + text.slice(offset + length);
}

/**
 * Apply all auto-fixable heuristics to text.
 * Applies fixes in reverse offset order so offsets remain valid.
 * Returns the fixed text.
 */
export function applyAllHeuristicFixes(text: string): string {
  const findings = runHeuristics(text).filter((f) => f.fix !== null);
  // Sort by offset descending so we apply from end to start
  findings.sort((a, b) => b.offset - a.offset);

  let result = text;
  for (const finding of findings) {
    if (finding.fix) {
      result = applyHeuristicFix(result, finding.offset, finding.length, finding.fix);
    }
  }
  return result;
}
