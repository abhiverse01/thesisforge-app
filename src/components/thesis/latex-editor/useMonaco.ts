// ============================================================
// ThesisForge — Monaco Editor Setup Hook
// Registers LaTeX and BibTeX languages, custom themes, and
// autocomplete snippet provider. Registers once globally.
// ============================================================

import type { languages } from 'monaco-editor';

// GODMODE 13: Use this flag to avoid redundant getLanguages() scan on repeated calls.
// Previously the flag was declared but never read/written — now properly guards registration.
let latexRegistered = false;

const LATEX_SNIPPETS = [
  // Structure
  { label: '\\chapter',       doc: 'Chapter heading',       insert: '\\chapter{$1}\n\\label{ch:${2:label}}\n$0' },
  { label: '\\section',       doc: 'Section heading',        insert: '\\section{$1}\n\\label{sec:${2:label}}\n$0' },
  { label: '\\subsection',    doc: 'Subsection heading',     insert: '\\subsection{$1}\n\\label{subsec:${2:label}}\n$0' },
  { label: '\\subsubsection', doc: 'Subsubsection heading',  insert: '\\subsubsection{$1}\n\\label{subsubsec:${2:label}}\n$0' },
  { label: '\\paragraph',     doc: 'Paragraph heading',      insert: '\\paragraph{$1}\n$0' },
  // Environments
  { label: 'itemize',    doc: 'Bullet list',            insert: '\\begin{itemize}\n  \\item $1\n  \\item $2\n\\end{itemize}' },
  { label: 'enumerate',  doc: 'Numbered list',          insert: '\\begin{enumerate}\n  \\item $1\n  \\item $2\n\\end{enumerate}' },
  { label: 'figure',     doc: 'Figure environment',     insert: '\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{figures/$1}\n  \\caption{$2}\n  \\label{fig:$3}\n\\end{figure}' },
  { label: 'table',      doc: 'Table environment',      insert: '\\begin{table}[htbp]\n  \\centering\n  \\caption{$1}\n  \\label{tab:$2}\n  \\begin{tabular}{$3}\n    \\toprule\n    $4 \\\\\n    \\midrule\n    $5 \\\\\n    \\bottomrule\n  \\end{tabular}\n\\end{table}' },
  { label: 'equation',   doc: 'Numbered equation',      insert: '\\begin{equation}\n  $1\n  \\label{eq:$2}\n\\end{equation}' },
  { label: 'align',      doc: 'Aligned equations',      insert: '\\begin{align}\n  $1 &= $2 \\\\\n  $3 &= $4\n\\end{align}' },
  { label: 'lstlisting', doc: 'Code listing',           insert: '\\begin{lstlisting}[language=$1,caption=$2]\n$3\n\\end{lstlisting}' },
  { label: 'abstract',   doc: 'Abstract environment',   insert: '\\begin{abstract}\n  $1\n\\end{abstract}' },
  { label: 'theorem',    doc: 'Theorem environment',    insert: '\\begin{theorem}\n  \\label{thm:$1}\n  $2\n\\end{theorem}' },
  { label: 'proof',      doc: 'Proof environment',      insert: '\\begin{proof}\n  $1\n\\end{proof}' },
  // Formatting
  { label: '\\textbf',     doc: 'Bold text',              insert: '\\textbf{$1}' },
  { label: '\\textit',     doc: 'Italic text',            insert: '\\textit{$1}' },
  { label: '\\emph',       doc: 'Emphasized text',        insert: '\\emph{$1}' },
  { label: '\\texttt',     doc: 'Typewriter text',        insert: '\\texttt{$1}' },
  { label: '\\underline',  doc: 'Underlined text',        insert: '\\underline{$1}' },
  { label: '\\footnote',   doc: 'Footnote',               insert: '\\footnote{$1}' },
  // References
  { label: '\\label',      doc: 'Label for cross-ref',    insert: '\\label{$1}' },
  { label: '\\ref',        doc: 'Cross reference',        insert: '\\ref{$1}' },
  { label: '\\cref',       doc: 'Smart cross reference',  insert: '\\cref{$1}' },
  { label: '\\cite',       doc: 'Citation',               insert: '\\cite{$1}' },
  { label: '\\citep',      doc: 'Parenthetical citation',  insert: '\\citep{$1}' },
  { label: '\\citet',      doc: 'Textual citation',       insert: '\\citet{$1}' },
  // Math
  { label: '\\frac',       doc: 'Fraction',               insert: '\\frac{$1}{$2}' },
  { label: '\\sqrt',       doc: 'Square root',            insert: '\\sqrt{$1}' },
  { label: '\\sum',        doc: 'Summation',              insert: '\\sum_{$1}^{$2}' },
  { label: '\\int',        doc: 'Integral',               insert: '\\int_{$1}^{$2}' },
  { label: '\\infty',      doc: 'Infinity',               insert: '\\infty' },
  { label: '\\alpha',      doc: 'Greek alpha',            insert: '\\alpha' },
  { label: '\\beta',       doc: 'Greek beta',             insert: '\\beta' },
  { label: '\\gamma',      doc: 'Greek gamma',            insert: '\\gamma' },
  { label: '\\delta',      doc: 'Greek delta',            insert: '\\delta' },
  { label: '\\theta',      doc: 'Greek theta',            insert: '\\theta' },
  { label: '\\lambda',     doc: 'Greek lambda',           insert: '\\lambda' },
  { label: '\\mu',         doc: 'Greek mu',               insert: '\\mu' },
  { label: '\\sigma',      doc: 'Greek sigma',            insert: '\\sigma' },
  { label: '\\pi',         doc: 'Greek pi',               insert: '\\pi' },
  { label: '\\Omega',      doc: 'Greek Omega',            insert: '\\Omega' },
  { label: '\\in',         doc: 'Element of',             insert: '\\in' },
  { label: '\\subset',     doc: 'Subset',                 insert: '\\subset' },
  { label: '\\forall',     doc: 'For all',                insert: '\\forall' },
  { label: '\\exists',     doc: 'There exists',           insert: '\\exists' },
  { label: '\\approx',     doc: 'Approximately equal',    insert: '\\approx' },
  { label: '\\leq',        doc: 'Less than or equal',     insert: '\\leq' },
  { label: '\\geq',        doc: 'Greater than or equal',  insert: '\\geq' },
  { label: '\\neq',        doc: 'Not equal',              insert: '\\neq' },
  { label: '\\times',      doc: 'Multiplication',         insert: '\\times' },
  { label: '\\cdot',       doc: 'Centered dot',           insert: '\\cdot' },
  { label: '\\ldots',      doc: 'Ellipsis',               insert: '\\ldots' },
  { label: '\\left(',      doc: 'Auto-sized left paren',  insert: '\\left( $1 \\right)' },
  { label: '\\left[',      doc: 'Auto-sized left bracket',insert: '\\left[ $1 \\right]' },

  // Theorem environments (common in math/CS theses)
  { label: 'lemma env',      doc: 'Lemma environment',      insert: '\\begin{lemma}[$1]\n  $2\n\\end{lemma}' },
  { label: 'definition env', doc: 'Definition environment', insert: '\\begin{definition}[$1]\n  $2\n\\end{definition}' },
  { label: 'corollary env',  doc: 'Corollary environment',  insert: '\\begin{corollary}\n  $1\n\\end{corollary}' },
  { label: 'remark env',     doc: 'Remark environment',     insert: '\\begin{remark}\n  $1\n\\end{remark}' },
  { label: 'example env',    doc: 'Example environment',    insert: '\\begin{example}\n  $1\n\\end{example}' },
  { label: 'algorithm env',  doc: 'Algorithm environment',  insert: '\\begin{algorithm}\n  \\caption{$1}\n  \\label{alg:$2}\n  \\begin{algorithmic}[1]\n    $3\n  \\end{algorithmic}\n\\end{algorithm}' },

  // Bibliography entries
  { label: '@article',       doc: 'BibTeX article entry',       insert: '@article{$1,\n  author  = {$2},\n  title   = {$3},\n  journal = {$4},\n  year    = {$5},\n  volume  = {$6},\n  pages   = {$7}\n}' },
  { label: '@book',          doc: 'BibTeX book entry',          insert: '@book{$1,\n  author    = {$2},\n  title     = {$3},\n  publisher = {$4},\n  year      = {$5}\n}' },
  { label: '@inproceedings', doc: 'BibTeX conference entry',    insert: '@inproceedings{$1,\n  author    = {$2},\n  title     = {$3},\n  booktitle = {$4},\n  year      = {$5},\n  pages     = {$6}\n}' },
  { label: '@online',        doc: 'BibTeX online entry',        insert: '@online{$1,\n  author  = {$2},\n  title   = {$3},\n  url     = {$4},\n  year    = {$5},\n  urldate = {$6}\n}' },
  { label: '@phdthesis',     doc: 'BibTeX PhD thesis entry',    insert: '@phdthesis{$1,\n  author = {$2},\n  title  = {$3},\n  school = {$4},\n  year   = {$5}\n}' },
  { label: '@mastersthesis', doc: 'BibTeX Masters thesis entry',insert: '@mastersthesis{$1,\n  author = {$2},\n  title  = {$3},\n  school = {$4},\n  year   = {$5}\n}' },

  // Math environments
  { label: 'matrix env',     doc: 'Matrix environment',      insert: '\\begin{pmatrix}\n  $1 & $2 \\\\\\\\\n  $3 & $4\n\\end{pmatrix}' },
  { label: 'cases env',      doc: 'Cases environment',       insert: '\\begin{cases}\n  $1 & \\text{if } $2 \\\\\\\\\n  $3 & \\text{otherwise}\n\\end{cases}' },
  { label: 'split env',      doc: 'Split equation',          insert: '\\begin{equation}\n  \\begin{split}\n    $1 &= $2 \\\\\\\\\n         &= $3\n  \\end{split}\n\\end{equation}' },
  { label: 'aligned env',    doc: 'Aligned math',             insert: '\\begin{aligned}\n  $1 &= $2 \\\\\\\\\n  $3 &= $4\n\\end{aligned}' },
  { label: 'gathered env',   doc: 'Gathered equations',       insert: '\\begin{gather}\n  $1 \\\\\\\\\n  $2\n\\end{gather}' },

  // Common preamble packages
  { label: 'usepackage set', doc: 'Common thesis packages',  insert: '\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage{lmodern}\n\\usepackage{microtype}\n\\usepackage{geometry}\n\\usepackage{setspace}\n\\usepackage{natbib}\n\\usepackage{graphicx}\n\\usepackage{booktabs}\n\\usepackage{hyperref}\n\\usepackage[nameinlink]{cleveref}' },

  // Cross references
  { label: '\\eqref{}',      doc: 'Equation reference',      insert: '\\eqref{$1}' },
  { label: '\\autoref{}',    doc: 'Auto reference',          insert: '\\autoref{$1}' },
  { label: '\\nameref{}',    doc: 'Name reference',          insert: '\\nameref{$1}' },
  { label: '\\pageref{}',    doc: 'Page reference',          insert: '\\pageref{$1}' },

  // Formatting extras
  { label: '\\url{}',        doc: 'URL',                     insert: '\\url{$1}' },
  { label: '\\href{}{}',     doc: 'Hyperlink',               insert: '\\href{$1}{$2}' },
  { label: '\\caption{}',    doc: 'Caption',                 insert: '\\caption{$1}' },
  { label: '\\centering',    doc: 'Centering',               insert: '\\centering' },
  { label: '\\noindent',     doc: 'No indent',               insert: '\\noindent' },
  { label: '\\newpage',      doc: 'New page',                insert: '\\newpage' },
  { label: '\\clearpage',    doc: 'Clear page',              insert: '\\clearpage' },
  { label: '\\appendix',     doc: 'Appendix command',        insert: '\\appendix' },

  // Table extras
  { label: 'tabularx env',   doc: 'Flexible width table',    insert: '\\begin{table}[htbp]\n  \\centering\n  \\caption{$1}\n  \\label{tab:$2}\n  \\begin{tabularx}{\\textwidth}{$3}\n    \\toprule\n    $4 \\\\\n    \\midrule\n    $5 \\\\\n    \\bottomrule\n  \\end{tabularx}\n\\end{table}' },
  { label: 'longtable env',  doc: 'Multi-page table',        insert: '\\begin{longtable}{$1}\n  \\toprule\n  $2 \\\\\n  \\midrule\n  \\endhead\n  $3 \\\\\n  \\bottomrule\n  \\end{longtable}' },

  // TikZ / PGFPlots
  { label: 'tikzpicture env',  doc: 'TikZ picture environment',   insert: '\\begin{tikzpicture}\n  $1\n\\end{tikzpicture}' },
  { label: 'tikz node',        doc: 'TikZ node',                  insert: '\\node[$1] ($2) {$3};' },
  { label: 'tikz draw',        doc: 'TikZ draw line',             insert: '\\draw[$1] ($2) -- ($3);' },
  { label: 'tikz axis',        doc: 'PGFPlots axis',              insert: '\\begin{axis}[\n  xlabel={$1},\n  ylabel={$2},\n  grid=major,\n]\n  \\addplot coordinates {$3};\n\\end{axis}' },
  { label: 'tikz barplot',     doc: 'PGFPlots bar chart',        insert: '\\begin{axis}[\n  ybar,\n  xlabel={$1},\n  ylabel={$2},\n  symbolic x coords={$3},\n  xtick=data,\n  nodes near coords,\n]\n  \\addplot coordinates {($4)};\n\\end{axis}' },

  // SI Units (siunitx)
  { label: '\\SI{}',         doc: 'SI number with unit',     insert: '\\SI{$1}{$2}' },
  { label: '\\si{}',         doc: 'SI unit only',            insert: '\\si{$1}' },
  { label: '\\num{}',        doc: 'SI number',               insert: '\\num{$1}' },
  { label: '\\qty{}',        doc: 'SI quantity',             insert: '\\qty{$1}{$2}' },

  // Additional formatting
  { label: '\\textsc{}',     doc: 'Small caps text',         insert: '\\textsc{$1}' },
  { label: '\\textsuperscript{}', doc: 'Superscript text',   insert: '\\textsuperscript{$1}' },
  { label: '\\textsubscript{}',  doc: 'Subscript text',      insert: '\\textsubscript{$1}' },
  { label: '\\hfill',        doc: 'Horizontal fill',         insert: '\\hfill' },
  { label: '\\vspace{}',     doc: 'Vertical space',          insert: '\\vspace{$1}' },
  { label: '\\hspace{}',     doc: 'Horizontal space',        insert: '\\hspace{$1}' },
  { label: '\\rule{}',       doc: 'Horizontal rule',         insert: '\\rule{$1}{$2}' },
  { label: '\\today',        doc: 'Current date',            insert: '\\today' },

  // Academic writing helpers
  { label: 'todo note',      doc: 'TODO note (todonotes)',   insert: '\\todo{$1}' },
  { label: 'todo inline',    doc: 'Inline TODO note',        insert: '\\todoline{$1}' },
  { label: 'blind text',     doc: 'Blind text placeholder',  insert: '\\blindtext' },
  { label: 'lipsum',         doc: 'Lorem ipsum paragraph',   insert: '\\lipsum[$1]' },
];

/**
 * Register LaTeX and BibTeX languages, themes, and autocomplete.
 * Safe to call multiple times — only registers once.
 */
export function registerLatexLanguage(monaco: any): void {
  if (!monaco) return;

  // GODMODE 13: Fast-path using module-level flag — avoids O(n) getLanguages() scan
  // on every call. Previously the flag was declared but never read/written (dead code).
  if (latexRegistered) return;

  try {
    // ── Register LaTeX language ────────────────────────────────
    monaco.languages.register({ id: 'latex' });

    monaco.languages.setMonarchTokensProvider('latex', {
      defaultToken:    '',
      tokenPostfix:    '.latex',
      ignoreCase:      false,

      brackets: [
        { open: '{', close: '}', token: 'delimiter.curly'   },
        { open: '[', close: ']', token: 'delimiter.bracket' },
        { open: '(',  close: ')', token: 'delimiter.paren'   },
      ],

      keywords: [
        'documentclass', 'usepackage', 'begin', 'end', 'newcommand',
        'renewcommand', 'setlength', 'textwidth', 'textheight',
        'maketitle', 'tableofcontents', 'bibliography', 'bibliographystyle',
      ],

      tokenizer: {
        root: [
          [/%.*$/, 'comment'],
          [/\\[a-zA-Z@]+\*?/, {
            cases: {
              '@keywords': 'keyword',
              '@default':  'type',
            },
          }],
          [/\$/, { token: 'string', bracket: '@open', next: '@math_inline' }],
          [/\\\[/, { token: 'string', bracket: '@open', next: '@math_display' }],
          [/\{/, 'delimiter.curly'],
          [/\}/, 'delimiter.curly'],
          [/\[/, 'delimiter.bracket'],
          [/\]/, 'delimiter.bracket'],
          [/"[^"]*"/, 'string'],
          [/'[^']*'/, 'string'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/[&~^_\\]/, 'keyword.operator'],
        ],

        math_inline: [
          [/\$/, { token: 'string', bracket: '@close', next: '@pop' }],
          [/[^$\\]+/, 'string.math'],
          [/\\./, 'string.escape'],
        ],

        math_display: [
          [/\\\]/, { token: 'string', bracket: '@close', next: '@pop' }],
          [/[^\\\]]+/, 'string.math'],
          [/\\./, 'string.escape'],
        ],
      },
    });

    // ── Register BibTeX language ─────────────────────────────
    monaco.languages.register({ id: 'bibtex' });

    monaco.languages.setMonarchTokensProvider('bibtex', {
      tokenizer: {
        root: [
          [/@\w+/,    'keyword'],
          [/\{[^,}]+/, 'string'],
          [/\w+\s*=/, 'attribute.name'],
          [/\{[^}]*\}/, 'string'],
          [/%.*$/,    'comment'],
          [/[{}]/, 'delimiter.curly'],
          [/,/,    'delimiter'],
        ],
      },
    });

    // ── LaTeX autocomplete provider ──────────────────────────
    monaco.languages.registerCompletionItemProvider('latex', {
      triggerCharacters: ['\\'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber:   position.lineNumber,
          startColumn:     word.startColumn,
          endColumn:       word.endColumn,
        };

        const suggestions: languages.CompletionItem[] = LATEX_SNIPPETS.map(s => ({
          label:            s.label,
          kind:             monaco.languages.CompletionItemKind.Snippet,
          documentation:    s.doc,
          insertText:       s.insert,
          insertTextRules:  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return { suggestions };
      },
    });

    // ── BibTeX autocomplete provider ─────────────────────────
    monaco.languages.registerCompletionItemProvider('bibtex', {
      triggerCharacters: ['@'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber:   position.lineNumber,
          startColumn:     word.startColumn,
          endColumn:       word.endColumn,
        };

        const BIB_SNIPPETS = [
          { label: '@article',       doc: 'Journal article',       insert: '@article{$1,\n  author  = {$2},\n  title   = {$3},\n  journal = {$4},\n  year    = {$5},\n  volume  = {$6},\n  pages   = {$7}\n}' },
          { label: '@book',          doc: 'Book',                  insert: '@book{$1,\n  author    = {$2},\n  title     = {$3},\n  publisher = {$4},\n  year      = {$5}\n}' },
          { label: '@inproceedings', doc: 'Conference paper',       insert: '@inproceedings{$1,\n  author    = {$2},\n  title     = {$3},\n  booktitle = {$4},\n  year      = {$5}\n}' },
          { label: '@online',        doc: 'Online resource',        insert: '@online{$1,\n  author  = {$2},\n  title   = {$3},\n  url     = {$4},\n  year    = {$5},\n  urldate = {$6}\n}' },
          { label: '@phdthesis',     doc: 'PhD thesis',            insert: '@phdthesis{$1,\n  author = {$2},\n  title  = {$3},\n  school = {$4},\n  year   = {$5}\n}' },
          { label: '@mastersthesis', doc: 'Masters thesis',        insert: '@mastersthesis{$1,\n  author = {$2},\n  title  = {$3},\n  school = {$4},\n  year   = {$5}\n}' },
          { label: '@techreport',    doc: 'Technical report',       insert: '@techreport{$1,\n  author      = {$2},\n  title       = {$3},\n  institution = {$4},\n  year        = {$5}\n}' },
          { label: '@misc',          doc: 'Miscellaneous',          insert: '@misc{$1,\n  author = {$2},\n  title  = {$3},\n  howpublished = {$4},\n  year   = {$5}\n}' },
          { label: '@www',           doc: 'Web resource',           insert: '@misc{$1,\n  author = {$2},\n  title  = {$3},\n  url    = {$4},\n  year   = {$5}\n}' },
          { label: '@manual',        doc: 'Technical manual',       insert: '@manual{$1,\n  title     = {$2},\n  author    = {$3},\n  organization = {$4},\n  year      = {$5},\n  address   = {$6}\n}' },
          { label: '@incollection',  doc: 'Book chapter entry',     insert: '@incollection{$1,\n  author    = {$2},\n  title     = {$3},\n  booktitle = {$4},\n  editor    = {$5},\n  year      = {$6},\n  publisher = {$7},\n  pages     = {$8}\n}' },
          { label: '@string',        doc: 'BibTeX string macro',     insert: '@string{$1 = {$2}}' },
        ];

        const suggestions: languages.CompletionItem[] = BIB_SNIPPETS.map(s => ({
          label:            s.label,
          kind:             monaco.languages.CompletionItemKind.Snippet,
          documentation:    s.doc,
          insertText:       s.insert,
          insertTextRules:  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return { suggestions };
      },
    });

    // ── Markdown autocomplete provider ──────────────────────
    monaco.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters: ['#', '-', '*'],
      provideCompletionItems: (model: any, position: any) => {
        const line = model.getLineContent(position.lineNumber);
        const lineUntil = line.slice(0, position.column - 1);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber:   position.lineNumber,
          startColumn:     1,
          endColumn:       position.column,
        };

        // Only suggest at line start
        if (lineUntil.trim().length > 0 && !lineUntil.startsWith('#')) {
          return { suggestions: [] };
        }

        const MD_SNIPPETS = [
          { label: '# Heading 1',  doc: 'Level 1 heading',   insert: '# $1' },
          { label: '## Heading 2', doc: 'Level 2 heading',   insert: '## $1' },
          { label: '### Heading 3', doc: 'Level 3 heading',   insert: '### $1' },
          { label: '- Bullet',      doc: 'Bullet point',       insert: '- $1' },
          { label: '- [ ] Task',    doc: 'Task list item',     insert: '- [ ] $1' },
          { label: '**bold**',      doc: 'Bold text',          insert: '**$1**' },
          { label: '*italic*',      doc: 'Italic text',        insert: '*$1*' },
          { label: '`code`',        doc: 'Inline code',        insert: '`$1`' },
          { label: '[link](url)',   doc: 'Hyperlink',          insert: '[$1]($2)' },
          { label: '```code block', doc: 'Fenced code block', insert: '```\n$1\n```' },
        ];

        const suggestions: languages.CompletionItem[] = MD_SNIPPETS.map(s => ({
          label:            s.label,
          kind:             monaco.languages.CompletionItemKind.Snippet,
          documentation:    s.doc,
          insertText:       s.insert,
          insertTextRules:  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return { suggestions };
      },
    });

    // GODMODE 13: Mark as registered — prevents redundant scans on subsequent calls
    latexRegistered = true;
  } catch (err) {
    console.error('[editor] Failed to register languages/tokens:', err);
  }
}
