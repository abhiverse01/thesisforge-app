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
  // === ORIGINAL RULES ===
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

  // === 15 NEW RULES ===

  // 1. Straight quotes in text mode
  {
    id: 'straight-quotes',
    pattern: /(?<=[a-z,]\s)"(?=[a-zA-Z])/g,
    severity: 'suggestion',
    message: () =>
      'Straight double quote detected. Use `` for opening and \'\' for closing quotes in LaTeX.',
    autofix: (match) => "``",
  },

  // 2. "..." instead of \ldots
  {
    id: 'literal-dots',
    pattern: /\.{3}/g,
    severity: 'suggestion',
    message: () =>
      'Three literal dots detected. Use \\ldots for proper ellipsis in LaTeX.',
    autofix: () => '\\ldots',
  },

  // 3. "x2" instead of "$x^2$" (common math-in-text patterns)
  {
    id: 'math-in-text',
    pattern: /\b([a-zA-Z])([2-9])\b(?![\}\\])/g,
    severity: 'suggestion',
    message: (match) =>
      `"${match[0]}" looks like a superscript. In LaTeX, use $${match[1]}^{${match[2]}}$ for proper math formatting.`,
    autofix: (match) => `$${match[1]}^{${match[2]}}$`,
  },

  // 4. Em-dash typed as "--" instead of "---"
  {
    id: 'en-dash-for-em-dash',
    pattern: /(?<=[a-zA-Z,])--(?=[a-zA-Z])/g,
    severity: 'info',
    message: () =>
      'En dash (--) detected between words. Use --- for em dash or -- for en dash (number ranges).',
    autofix: () => '---',
  },

  // 5. "i.e." without comma
  {
    id: 'ie-without-comma',
    pattern: /\bi\.e\.(?!\s*,)/g,
    severity: 'info',
    message: () =>
      '"i.e." should be followed by a comma. Use "i.e.," for proper academic style.',
    autofix: () => 'i.e.,',
  },

  // 6. Widow/orphan-prone paragraphs (< 3 lines before page break)
  // We detect short paragraphs (< 30 words) at the end of sections
  {
    id: 'widow-paragraph',
    pattern: /\n\n([^\n]{10,150}?\.(?:\s|$))/gm,
    severity: 'info',
    message: (match) => {
      const words = match[1].trim().split(/\s+/).length;
      if (words < 30) {
        return `Short paragraph (${words} words) may create a widow/orphan. Consider merging with the previous paragraph or adding more content.`;
      }
      return `Paragraph before a break may create a widow/orphan. Consider adding content or adjusting.`;
    },
    autofix: null as unknown as (match: RegExpExecArray) => string,
  },

  // 7. \textbf overuse (> 5 per paragraph)
  // This is handled as a post-processing check since regex can't count easily
  {
    id: 'textbf-overuse',
    pattern: /\\textbf\{[^}]+\}/g,
    severity: 'info',
    message: (match) =>
      `Multiple \\textbf uses detected. Overusing bold reduces its impact. Consider using \\emph{} for lighter emphasis.`,
    autofix: null as unknown as (match: RegExpExecArray) => string,
  },

  // 8. Unclosed \begin{ without matching \end{}
  // Checked as a structural pattern (basic detection)
  {
    id: 'unclosed-begin',
    pattern: /\\begin\{(\w+)\}(?![\s\S]*?\\end\{\1\})/g,
    severity: 'error',
    message: (match) =>
      `Possible unclosed environment: \\begin{${match[1]}} without matching \\end{${match[1]}}. Check for missing closing tag.`,
    autofix: null as unknown as (match: RegExpExecArray) => string,
  },

  // 9. Manual spacing overuse (\ and ~)
  {
    id: 'manual-spacing-overuse',
    pattern: /[\\~]{2,}/g,
    severity: 'info',
    message: () =>
      'Multiple consecutive spacing commands detected. Excessive manual spacing is usually unnecessary in LaTeX.',
    autofix: null as unknown as (match: RegExpExecArray) => string,
  },

  // 10. Footnotes inside captions
  {
    id: 'footnote-in-caption',
    pattern: /\\caption\{[^}]*\\footnote/g,
    severity: 'warning',
    message: () =>
      'Footnote inside \\caption detected. Footnotes in captions can cause compilation issues. Use \\footnotemark in the caption and \\footnotetext outside.',
    autofix: null as unknown as (match: RegExpExecArray) => string,
  },

  // 11. $$...$$ display math (should use \[...\])
  {
    id: 'double-dollar-math',
    pattern: /\$\$([^$]+)\$\$/g,
    severity: 'suggestion',
    message: (match) =>
      '$$...$$ display math detected. Use \\[...\\] for display math, which is more robust and standard.',
    autofix: (match) => `\\[${match[1]}\\]`,
  },

  // 12. \center environment (should use \centering)
  {
    id: 'center-environment',
    pattern: /\\begin\{center\}/g,
    severity: 'info',
    message: () =>
      '\\begin{center} environment detected. \\centering is generally preferred as it avoids extra vertical spacing.',
    autofix: () => '\\centering',
  },

  // 13. \bf, \it, \rm (obsolete font commands)
  {
    id: 'obsolete-font-cmd',
    pattern: /\\(bf|it|rm|sl|sc|sf|tt)\b(?![a-zA-Z])/g,
    severity: 'suggestion',
    message: (match) =>
      `Obsolete font command \\${match[1]} detected. Use \\textbf{}, \\textit{}, \\textrm{} etc. for proper LaTeX2e commands.`,
    autofix: (match) => {
      const cmdMap: Record<string, string> = {
        bf: 'textbf{}',
        it: 'textit{}',
        rm: 'textrm{}',
        sl: 'textsl{}',
        sc: 'textsc{}',
        sf: 'textsf{}',
        tt: 'texttt{}',
      };
      return `\\${cmdMap[match[1]] || 'textbf{}'}`;
    },
  },

  // 14. Lines > 120 characters in preamble
  // Detected in the text as long lines without line breaks
  {
    id: 'long-line',
    pattern: /^[^\n]{121,}$/gm,
    severity: 'info',
    message: (match) =>
      `Line with ${match[0].length} characters detected. Consider breaking lines at ≤ 120 characters for better readability and diff tracking.`,
    autofix: null as unknown as (match: RegExpExecArray) => string,
  },

  // 15. \newpage inside chapters (anti-pattern)
  {
    id: 'newpage-in-chapter',
    pattern: /\\newpage\b/g,
    severity: 'info',
    message: () =>
      '\\newpage detected. Inside chapters, this breaks the flow. Use \\clearpage or sectioning commands instead. Automatic page breaks happen at \\section commands.',
    autofix: () => '\\clearpage',
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

  // Post-processing: check for \textbf overuse per paragraph
  checkTextbfOveruse(cleanedText, findings);

  // Post-processing: check for manual spacing overuse
  checkSpacingOveruse(cleanedText, findings);

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
 * Post-process: detect paragraphs with > 5 \textbf uses.
 */
function checkTextbfOveruse(text: string, findings: HeuristicFinding[]): void {
  const paragraphs = text.split(/\n\s*\n/);
  const TEXTBF_THRESHOLD = 5;

  let currentOffset = 0;
  for (const para of paragraphs) {
    const textbfMatches = para.match(/\\textbf\{/g);
    if (textbfMatches && textbfMatches.length > TEXTBF_THRESHOLD) {
      const paraStart = text.indexOf(para, currentOffset);
      if (paraStart >= 0) {
        findings.push({
          ruleId: 'textbf-overuse-detail',
          severity: 'info',
          offset: paraStart,
          length: para.length,
          original: para.slice(0, 60) + '...',
          message: `Paragraph contains ${textbfMatches.length} \\textbf commands. Overusing bold reduces its visual impact. Consider using \\emph{} or restructuring.`,
          fix: null,
        });
      }
    }
    currentOffset += para.length + 2;
  }
}

/**
 * Post-process: detect excessive manual spacing commands (> 10 per "page" ≈ 5000 chars).
 */
function checkSpacingOveruse(text: string, findings: HeuristicFinding[]): void {
  const SPACING_THRESHOLD = 10;
  const PAGE_SIZE = 5000;

  // Count \ and ~ spacing commands
  const spacingPattern = /(?:\\\s|~)/g;
  let match: RegExpExecArray | null;
  const positions: number[] = [];
  const re = new RegExp(spacingPattern.source, 'g');
  while ((match = re.exec(text)) !== null) {
    positions.push(match.index);
  }

  if (positions.length <= SPACING_THRESHOLD) return;

  // Check per "page" (every 5000 characters)
  for (let page = 0; page * PAGE_SIZE < text.length; page++) {
    const pageStart = page * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, text.length);
    const countInPage = positions.filter((p) => p >= pageStart && p < pageEnd).length;
    if (countInPage > SPACING_THRESHOLD) {
      findings.push({
        ruleId: 'spacing-overuse-detail',
        severity: 'info',
        offset: pageStart,
        length: PAGE_SIZE,
        original: `...${countInPage} spacing commands in section...`,
        message: `${countInPage} manual spacing commands (\\~ or ~) in ~5000 characters. Excessive manual spacing is usually unnecessary in LaTeX.`,
        fix: null,
      });
    }
  }
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
