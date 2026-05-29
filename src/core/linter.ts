// ============================================================
// ThesisForge Core — LaTeX Lint Engine (36 rules)
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
// Lint Rules (12 original + 15 new + 9 expert = 36 total)
// ============================================================

const LINT_RULES: Array<{
  id: string;
  check: (tex: string) => boolean | { pass: boolean; line?: number; context?: string };
  message: string;
  severity: 'error' | 'warning' | 'info';
}> = [
  // ── Original Rules (L01–L12) ─────────────────────────────────

  {
    id: 'unmatched-braces',
    check: (tex) => {
      // Strip comments — handle escaped \% (negative lookbehind)
      const noComments = tex.replace(/(?<!\\)%[^\n]*/g, '');
      // Strip verbatim content (between \begin{verbatim} and \end{verbatim})
      const noVerbatim = noComments.replace(/\\begin\{verbatim\}[\s\S]*?\\end\{verbatim\}/g, '');
      // Strip lstlisting content
      const noListings = noVerbatim.replace(/\\begin\{lstlisting\}[\s\S]*?\\end\{lstlisting\}/g, '');
      // Remove escaped braces \{ \} — they are literal characters, not structural braces
      const noEscaped = noListings.replace(/\\[{}]/g, '');
      const open = (noEscaped.match(/\{/g) || []).length;
      const close = (noEscaped.match(/\}/g) || []).length;
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
      const hasCite = /\\(?:cite[tp]?|citeauthor|citeyear|autocite|parencite|textcite|footcite|nocite)\s*(?:\[[^\]]*\])?\s*\{/.test(tex);
      if (hasCite && !tex.includes('\\bibliography{') && !tex.includes('\\begin{thebibliography}')) {
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
      const lines = tex.split('\n');
      // Track whether we're inside a tabular/align-like environment
      let tabularDepth = 0;
      const envOpen = /\\begin\{(tabularx?|align|alignat|array|matrix|bmatrix|pmatrix|vmatrix)\b/;
      const envClose = /\\end\{(tabularx?|align|alignat|array|matrix|bmatrix|pmatrix|vmatrix)\b/;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        // Update environment nesting depth
        tabularDepth += (line.match(envOpen) || []).length;
        // Skip the check entirely if we're inside a tabular/align environment
        if (tabularDepth > 0) {
          tabularDepth -= (line.match(envClose) || []).length;
          continue;
        }
        tabularDepth -= (line.match(envClose) || []).length;
        // Count bare & characters (not preceded by backslash)
        if (/&(?!\\)/.test(line)) {
          const bareAmpCount = (line.match(/&(?!\\)/g) || []).length;
          // Increased threshold from 2 to 6 to handle wide tables (7+ columns)
          if (bareAmpCount > 6) {
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
      // FIX: Strip comments and scope check to preamble only (before \begin{document}).
      // Also ignore \newcommand / \renewcommand that may appear after hyperref — they are
      // not \usepackage calls and do not conflict.
      const noComments = tex.replace(/(?<!\\)%[^\n]*/g, '');
      const preamble = noComments.split(/\\begin\{document\}/)[0] || noComments;
      // Find all \usepackage lines with their positions
      const pkgRegex = /\\usepackage\b/g;
      const matches: Array<{ idx: number; line: string }> = [];
      let m: RegExpExecArray | null;
      while ((m = pkgRegex.exec(preamble)) !== null) {
        matches.push({ idx: m.index, line: preamble.slice(m.index, m.index + 80) });
      }
      if (matches.length === 0) return true;
      // Find the last hyperref usepackage
      const lastHyperref = [...matches].reverse().find(
        ({ line }) => /\\usepackage(?:\[[^\]]*\])?\{[^}]*hyperref/,
      );
      if (!lastHyperref) return true;
      // Check if any non-hyperref, non-cleveref usepackage comes after it
      // (cleveref is the only package that must load after hyperref)
      const afterIdx = lastHyperref.idx;
      const laterNonCleveref = matches.filter(
        ({ idx, line }) => idx > afterIdx && !/cleveref/.test(line),
      );
      return laterNonCleveref.length === 0;
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

  // ── New Rules (L13–L20) ──────────────────────────────────────

  {
    id: 'display-math-deprecated',
    check: (tex) => {
      // Detect $$...$$ display math (deprecated — use \[...\])
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        // Match standalone $$ or $$ at start of line
        if (/\$\$[^\$]/.test(line) || /\$\$\s*$/.test(line)) {
          return { pass: false, line: i + 1, context: line.slice(0, 60) };
        }
      }
      return true;
    },
    message: 'Display math $$...$$ is deprecated. Use \\[...\\] instead.',
    severity: 'warning',
  },
  {
    id: 'center-environment',
    check: (tex) => {
      // Detect \begin{center} environment (use \centering inside float instead)
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        if (/\\begin\{center\}/.test(line)) {
          return { pass: false, line: i + 1, context: line.slice(0, 60) };
        }
      }
      return true;
    },
    message: '\\begin{center} detected. Use \\centering inside float environments for better spacing.',
    severity: 'warning',
  },
  {
    id: 'eqnarray-deprecated',
    check: (tex) => {
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        if (/\\begin\{eqnarray\*?\}/.test(line)) {
          return { pass: false, line: i + 1, context: line.slice(0, 60) };
        }
      }
      return true;
    },
    message: 'eqnarray environment is deprecated. Use align from amsmath instead.',
    severity: 'warning',
  },
  {
    id: 'over-escaped-chars',
    check: (tex) => {
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;

        // Detect \& outside of tabular/align environments
        if (/\\&/.test(line) && !/\\begin\{(tabular|align|array|matrix)\}/.test(line)) {
          // Check if we're roughly inside a tabular block
          const linesAbove = lines.slice(0, i);
          const beginCount = linesAbove.filter(l => /\\begin\{(tabular|align|array|matrix)/.test(l)).length;
          const endCount = linesAbove.filter(l => /\\end\{(tabular|align|array|matrix)/.test(l)).length;
          if (beginCount <= endCount) {
            return { pass: false, line: i + 1, context: '\\& outside tabular/align environment' };
          }
        }

        // FIX: Removed \% check — \% IS necessary in running text to print a literal
        // percent sign (since % starts a LaTeX comment). It's only unnecessary inside
        // \url{} or \href{}{} arguments, but that case is handled by the URL escaper.
      }
      return true;
    },
    message: 'Over-escaped character detected. \\& is usually unnecessary outside tabular.',
    severity: 'info',
  },
  {
    id: 'missing-tilde-before-cite',
    check: (tex) => {
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        // Detect \cite or \ref not preceded by ~
        // FIX: The old regex [^\s~{\\] excluded backslash, making it impossible
        // to match \cite or \ref. Use a negative lookbehind instead.
        if (/ (?<!~)\\(?:cite|ref)(?:\[[^\]]*\])?\{/.test(line) || /^\\(?:cite|ref)(?:\[[^\]]*\])?\{/.test(line)) {
          return { pass: false, line: i + 1, context: 'Missing ~ before \\cite or \\ref' };
        }
      }
      return true;
    },
    message: 'Missing non-breaking space (~) before \\cite or \\ref. Use "~\\cite{...}" to prevent line breaks.',
    severity: 'info',
  },
  {
    id: 'obsolete-font-commands',
    check: (tex) => {
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        // Detect \bf, \it, \rm (obsolete — use \textbf, \textit, \textrm)
        // Match the standalone commands, not \bfseries, \textbf, etc.
        const obsoletePattern = /\\(bf|it|rm)(?![a-zA-Z*])/g;
        if (obsoletePattern.test(line)) {
          const match = line.match(/\\(bf|it|rm)(?![a-zA-Z*])/);
          const cmd = match ? match[1] : 'unknown';
          const suggestion: Record<string, string> = { bf: '\\textbf{...}', it: '\\textit{...}', rm: '\\textrm{...}' };
          return { pass: false, line: i + 1, context: `\\${cmd} found — use ${suggestion[cmd]}` };
        }
      }
      return true;
    },
    message: 'Obsolete font command detected. Use \\textbf, \\textit, \\textrm instead of \\bf, \\it, \\rm.',
    severity: 'warning',
  },
  {
    id: 'preamble-long-lines',
    check: (tex) => {
      // Only check lines in the preamble (before \begin{document})
      const beginIdx = tex.indexOf('\\begin{document}');
      const preamble = beginIdx >= 0 ? tex.slice(0, beginIdx) : tex;
      const lines = preamble.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        if (line.length > 120) {
          return { pass: false, line: i + 1, context: line.slice(0, 80) + '...' };
        }
      }
      return true;
    },
    message: 'Preamble lines exceeding 120 characters detected. Consider breaking long commands for readability.',
    severity: 'info',
  },
  {
    id: 'newpage-in-chapters',
    check: (tex) => {
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        if (/\\newpage/.test(line)) {
          // Check if we're inside a chapter (after \chapter, before next \chapter or \end{document})
          const linesBefore = lines.slice(0, i);
          const lastChapter = linesBefore.findLastIndex(l => /\\chapter\b/.test(l));
          const nextChapter = lines.slice(i + 1).findIndex(l => /\\chapter\b/.test(l));

          // If there's a chapter before this \newpage and no chapter immediately after
          if (lastChapter >= 0 && (nextChapter === -1 || nextChapter > 3)) {
            return { pass: false, line: i + 1, context: '\\newpage inside chapter content' };
          }
        }
      }
      return true;
    },
    message: '\\newpage detected inside chapter. This is an anti-pattern in academic writing — let LaTeX handle page breaks.',
    severity: 'warning',
  },

  // ── Academic Writing Rules (L21–L26) ────────────────────────

  {
    id: 'intensifiers',
    severity: 'warning' as const,
    // FIX: Negated — lint framework uses !pass to flag issues.
    // Original returned true when problem exists, silently suppressing the warning.
    check: (tex: string) =>
      !/\b(very|really|quite|rather|somewhat|fairly|pretty)\s+\w+/i.test(tex),
    message: 'Intensifiers (very, really, quite) weaken academic writing. Remove or replace with precise language.',
  },
  {
    id: 'first-person-plural',
    severity: 'info' as const,
    check: (tex: string) => {
      // Strip author block and comments to reduce false positives
      const cleaned = tex.replace(/\\author\{[^}]+\}/, '').replace(/%.*/g, '');
      // FIX: Negated — lint framework uses !pass to flag issues.
      return !/\b(we|our|us)\b/i.test(cleaned);
    },
    message: 'First-person plural detected. Check your style guide for preferred voice.',
  },
  {
    id: 'long-sentence',
    severity: 'warning' as const,
    check: (tex: string) => {
      // FIX: Strip LaTeX commands before counting to avoid false positives.
      // A sentence with \cite{key}, $\alpha$, etc. should not inflate word count.
      const stripped = tex
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')        // display math
        .replace(/\$[^$]+\$/g, ' ')                     // inline math
        .replace(/\\[a-zA-Z]+\{[^}]*\}/g, ' ')        // \command{arg}
        .replace(/\\[a-zA-Z]+/g, ' ')                   // standalone \command
        .replace(/\[[^\]]*\]/g, ' ')                    // [optional args]
        .replace(/%.*$/gm, ' ')                           // comments
        .replace(/[{}\\]/g, ' ')                         // stray braces/backslash
        .replace(/~+/g, ' ');                             // non-breaking spaces
      // Replace known abbreviations to prevent false sentence breaks.
      const ABBREVIATIONS = /\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|vs|al|etc|e\.g|i\.e|cf|viz|Ph|D|Ed|vol|no|pp|ch|fig|tab|eq)\.\s*/g;
      const cleaned = stripped.replace(ABBREVIATIONS, (match) => match.replace('.', '_ABBREV_DOT_'));
      // Split on sentence-ending punctuation
      const sentences = cleaned.split(/[.!?]+\s+/);
      // Restore dots and check word count (only words of 2+ chars count as real words)
      return !sentences.some(s =>
        s.replace(/_ABBREV_DOT_/g, '.').split(/\s+/).filter(w => w.length > 0).length > 60,
      );
    },
    message: 'Sentence exceeding 60 words detected. Consider breaking it up for clarity.',
  },
  {
    id: 'empty-caption',
    severity: 'error' as const,
    check: (tex: string) =>
      // FIX: Negated — lint framework uses !pass to flag issues.
      !/\\caption\{TODO\b|\\caption\{\s*\}/.test(tex),
    message: 'Figure or table has an empty or TODO caption. All captions must be descriptive.',
  },
  {
    id: 'long-inline-math',
    severity: 'warning' as const,
    check: (tex: string) => {
      const mathMode = tex.match(/\$[^$]+\$/g) || [];
      // FIX: Negated — lint framework uses !pass to flag issues.
      return !mathMode.some(m => m.length > 120);
    },
    message: 'Long inline math expression detected. Use display math \\[ ... \\] instead for better readability.',
  },
  {
    id: 'cleveref-suggestion',
    severity: 'info' as const,
    // FIX: Negated — lint framework uses !pass to flag issues.
    check: (tex: string) =>
      tex.includes('\\usepackage{cleveref}') ||
      (tex.match(/\\ref\{/g) || []).length <= 3,
    message: 'Multiple \\ref{} commands without cleveref. Consider using \\cref{} for smarter cross-references.',
  },
  {
    id: 'todo-markers',
    severity: 'warning' as const,
    check: (tex: string) => {
      // FIX: Case-insensitive, also catches FIXME. Skip commented lines (% TODO).
      const noComments = tex.replace(/%.*$/gm, '');
      const todos = noComments.match(/\bTODO\b/gi) || [];
      const fixmes = noComments.match(/\bFIXME\b/gi) || [];
      return (todos.length + fixmes.length) <= 2;
    },
    message: 'More than 2 TODO/FIXME markers remain in the document. Remove or resolve before submission.',
  },

  // ── Expert-Level Rules (L28–L36) ──────────────────────────

  {
    id: 'label-before-caption',
    severity: 'error' as const,
    check: (tex: string) => {
      // \label must come AFTER \caption in float environments for correct numbering
      const labelCaptionPattern = /\\label\{[^}]+\}\s*\n\s*\\caption\{[^}]+\}/g;
      return !labelCaptionPattern.test(tex);
    },
    message: '\\label appears before \\caption in a float. This causes incorrect figure/table numbering. Place \\caption before \\label.',
  },
  {
    id: 'color-without-xcolor',
    severity: 'error' as const,
    check: (tex: string) => {
      const usesColor = /\\(definecolor|textcolor|color\{|colorbox|fcolorbox|rowcolor|cellcolor)\b/.test(tex);
      const hasXcolor = /\\usepackage(\[.*?\])?\{xcolor\}/.test(tex);
      return !(usesColor && !hasXcolor);
    },
    message: 'Color commands (definecolor, textcolor, colorbox) detected but xcolor package is not loaded. Add \\usepackage[dvipsnames,svgnames,table]{xcolor}.',
  },
  {
    id: 'figure-outside-float',
    severity: 'warning' as const,
    check: (tex: string) => {
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        // \includegraphics outside figure environment (rough check)
        if (/\\includegraphics/.test(line) && !/\\begin\{(figure|wrapfigure)/.test(lines.slice(Math.max(0, i - 3)).join('\n'))) {
          // Check we're not in a figure environment already
          const linesAbove = lines.slice(0, i).join('\n');
          const figBegin = (linesAbove.match(/\\begin\{figure/g) || []).length;
          const figEnd = (linesAbove.match(/\\end\{figure/g) || []).length;
          if (figBegin <= figEnd) {
            return { pass: false, line: i + 1, context: line.slice(0, 60) };
          }
        }
      }
      return true;
    },
    message: '\\includegraphics found outside a figure environment. Wrap in \\begin{figure}[htbp]...\\end{figure} for proper floating.',
  },
  {
    id: 'bare-url-text',
    severity: 'warning' as const,
    check: (tex: string) => {
      // FIX: Negative lookbehind was insufficient — only checked one char before http,
      // not the full \url{ or \href{ sequence. Instead, strip \url{} and \href{}{}
      // content first, then check for remaining bare URLs.
      const stripped = tex
        .replace(/\\href\{[^}]*\}\{[^}]*\}/g, '')   // \href{url}{text}
        .replace(/\\url\{[^}]*\}/g, '')              // \url{url}
        .replace(/\\href\{[^}]*\}/g, '');             // incomplete \href{url}
      const urlPattern = /https?:\/\/[^\s,})\]]+/;
      return !urlPattern.test(stripped);
    },
    message: 'Bare URL detected in text. Wrap in \\url{} or \\href{}{} for proper formatting and line breaking.',
  },
  {
    id: 'missing-label-on-float',
    severity: 'warning' as const,
    check: (tex: string) => {
      const floatPattern = /\\begin\{(figure|table)\}[\s\S]*?\\end\{(figure|table)\}/g;
      let m: RegExpExecArray | null;
      let unlabeledCount = 0;
      while ((m = floatPattern.exec(tex)) !== null) {
        if (!/\\label\{/.test(m[0]) && /\\caption\{/.test(m[0])) {
          unlabeledCount++;
        }
      }
      return unlabeledCount === 0;
    },
    message: 'One or more float environments (figure/table) have a \\caption but no \\label{}. Add labels for cross-referencing.',
  },
  {
    id: 'eg-ie-etc-formatting',
    severity: 'info' as const,
    check: (tex: string) => {
      // "e.g.", "i.e.", "etc." should use proper formatting
      const badPattern = /(?<![a-zA-Z\\])(?:e\.g|i\.e|etc)\.\s*(?![,\\])/g;
      const matches = tex.match(badPattern);
      return !matches || matches.length === 0;
    },
    message: '"e.g.", "i.e.", "etc." should be followed by a comma or backslash-space. Use "e.g.," or "i.e.\\ " to prevent incorrect sentence-end spacing.',
  },
  {
    id: 'hline-in-tabularx',
    severity: 'info' as const,
    check: (tex: string) => {
      // booktabs rules (toprule, midrule, bottomrule) are preferred over \hline
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        if (/\\hline/.test(line) && !/\\begin\{(tabularx?|longtable)/.test(line)) {
          // Check if booktabs is loaded
          const linesAbove = lines.slice(0, i).join('\n');
          if (/\\usepackage(\[.*?\])?\{booktabs\}/.test(linesAbove)) {
            return { pass: false, line: i + 1, context: line.slice(0, 60) };
          }
        }
      }
      return true;
    },
    message: '\\hline used with booktabs loaded. Use \\toprule, \\midrule, \\bottomrule from booktabs for professional-looking tables.',
  },
  {
    id: 'empty-section-content',
    severity: 'warning' as const,
    check: (tex: string) => {
      const lines = tex.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('%')) continue;
        const sectionMatch = line.match(/^\\(section|subsection|subsubsection)\{([^}]+)\}/);
        if (sectionMatch) {
          // Check if next 5 lines have substantial content
          const nextLines = lines.slice(i + 1, Math.min(i + 8, lines.length)).join(' ').trim();
          if (nextLines.length < 20 && /\\(section|subsection|subsubsection|chapter)/.test(nextLines)) {
            return { pass: false, line: i + 1, context: `Empty ${sectionMatch[1]}: "${sectionMatch[2]}"` };
          }
        }
      }
      return true;
    },
    message: 'Empty section detected — section heading immediately followed by another section without content.',
  },
  {
    id: 'inconsistent-citation-commands',
    severity: 'info' as const,
    check: (tex: string) => {
      const citepCount = (tex.match(/\\citep\{/g) || []).length;
      const citetCount = (tex.match(/\\citet\{/g) || []).length;
      // FIX: \cite[opt]{key} has optional argument — match with optional [args]
      const citeCount = (tex.match(/\\cite(?:\[[^\]]*\])?\{/g) || []).length;
      // FIX: Lowered threshold from 3 to 2 to catch mixing earlier
      // If using both citep/citet AND plain cite, that's inconsistent
      if ((citepCount > 2 || citetCount > 2) && citeCount > 2) {
        return false;
      }
      return true;
    },
    message: 'Mix of \\cite{} and \\citep/\\citet{} detected. Choose one style consistently — prefer \\citep/\\citet with natbib.',
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
