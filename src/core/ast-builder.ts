// ============================================================
// ThesisForge Core — LaTeX AST Builder (Engine v3)
// Builds a DocumentNode tree from ThesisData + template schema.
// Pipeline: ThesisData → ASTBuilder → Serializer → .tex
//
// ENGINE RULES:
// 1. The AST is the law. No string concatenation.
// 2. Every output element is a node. The serializer is the only
//    place that produces LaTeX strings.
// 3. The escaper runs on every user-provided string.
// 4. Template specialization means templates are DIFFERENT.
// ============================================================

import type { ThesisData, ThesisType, ThesisChapter, ThesisReference } from '@/lib/thesis-types';
import { TEMPLATE_SCHEMAS } from '@/core/templates';
import { escapeLatexBody, escapeLatexMeta } from '@/engine/escape';
import { resolvePackages, buildPackageConfiguration, detectFigures, detectTables } from '@/engine/packages';
import {
  type ASTNode,
  type DocumentNode,
  type CommandNode,
  type EnvironmentNode,
  type TextNode,
  type CommentNode,
  type BlankLineNode,
  type PackageImportNode,
  type MathNode,
  type VerbatimNode,
  type ListNode,
  type FigureNode,
  type TableNode,
  document,
  comment,
  blankLine,
  text,
  command,
  environment,
  usepackage,
  docClass,
  macroDef,
  rawLaTeX,
  newPage,
  label,
  math,
  verbatim,
  list,
  figure,
  table,
} from '@/core/ast';
import { serialize, serializeDocument } from '@/core/serializer';
import { hash } from '@/utils/hash';

// ============================================================
// Constants
// ============================================================

const FIGURE_PLACEHOLDER_TOKEN = '[figure]';
const TABLE_PLACEHOLDER_TOKEN = '[table]';

// ============================================================
// Chapter-Level AST Cache (Incremental Rebuild)
// Survives re-renders, cleared on export or full rebuild.
// For a 50k-word thesis with 8 chapters, only the edited chapter
// rebuilds on keystroke — all others hit cache (zero work).
// ============================================================

type ChapterCacheEntry = {
  inputHash: string;
  nodes: ASTNode[];
  builtAt: number;
};

/** Module-level cache — survives re-renders, cleared on export. */
const chapterNodeCache = new Map<string, ChapterCacheEntry>();

/**
 * Build AST nodes for a single chapter body with cache.
 * Returns cached nodes if the chapter body hasn't changed.
 */
export function buildChapterNodesCached(
  chapter: { id: string; title: string; content: string },
  force = false
): ASTNode[] {
  const inputHash = hash(chapter.id + chapter.title + (chapter.content || ''));
  const cached = chapterNodeCache.get(chapter.id);

  if (!force && cached && cached.inputHash === inputHash) {
    return cached.nodes; // cache hit — zero work
  }

  const nodes = buildChapterBodyNodes(chapter.content || '', chapter.id);
  chapterNodeCache.set(chapter.id, { inputHash, nodes, builtAt: Date.now() });
  return nodes;
}

/** Invalidate a single chapter's cache entry. */
export function invalidateChapterCache(chapterId: string) {
  chapterNodeCache.delete(chapterId);
}

/** Clear all chapter cache entries. Call before export. */
export function clearASTCache() {
  chapterNodeCache.clear();
}

// ============================================================
// Public API
// ============================================================

/**
 * Build a complete LaTeX AST from ThesisData.
 * This is the main entry point for the AST pipeline.
 */
export function buildAST(data: ThesisData): DocumentNode {
  // Clear cache on full rebuild to avoid stale entries
  clearASTCache();

  const schema = TEMPLATE_SCHEMAS[data.type];
  if (!schema) {
    throw new Error(`Unknown template type: ${data.type}`);
  }

  const children: ASTNode[] = [];

  // 1. Header comment
  children.push(buildHeaderComment(data));

  // 2. Preamble (documentclass + packages + configuration + custom commands)
  children.push(...buildPreamble(data, schema));

  // 3. \begin{document}
  children.push(command('begin', ['document']));
  children.push(blankLine());

  // 4. Suppress page numbering on title pages (gobble)
  //    Numbering stays gobble through title, declaration, abstract;
  //    switched to roman in buildFrontMatter, arabic in buildMainMatter.
  children.push(command('pagenumbering', ['gobble']));
  children.push(blankLine());

  // 5. Title page (template-specific)
  children.push(...buildTitlePage(data, schema));

  // 6. Front matter (dedication, abstract, declaration [master/phd], ack, TOC, lists)
  children.push(...buildFrontMatter(data, schema));

  // 7. Main matter (chapters with labels and smart processing)
  children.push(...buildMainMatter(data, schema));

  // 8. Appendices
  if (data.appendices && data.appendices.length > 0) {
    children.push(...buildAppendices(data, schema));
  }

  // 9. Back matter (bibliography, glossary)
  children.push(...buildBackMatter(data, schema));

  // 10. \end{document}
  children.push(command('end', ['document']));

  return document(children);
}

/**
 * Generate LaTeX string from ThesisData using the AST pipeline.
 */
export function generateLatexFromAST(data: ThesisData): string {
  const ast = buildAST(data);
  return serializeDocument(ast);
}

// ============================================================
// Header Comment
// ============================================================

function buildHeaderComment(data: ThesisData): CommentNode {
  const title = data.metadata.title || 'Untitled Thesis';
  const date = new Date().toISOString().split('T')[0];
  const typeLabels: Record<ThesisType, string> = {
    bachelor: "Bachelor's Thesis",
    master: "Master's Thesis",
    phd: 'PhD Dissertation',
    report: 'Research Report',
    conference: 'Conference Paper',
  };
  return comment(
    `============================================================\n` +
    `${title}\n` +
    `${typeLabels[data.type] || data.type}\n` +
    `Generated by ThesisForge\n` +
    `Date: ${date}\n` +
    `============================================================`
  );
}

// ============================================================
// Preamble Builder
// Uses the canonical package system from engine/packages.ts
// ============================================================

function buildPreamble(data: ThesisData, schema: typeof TEMPLATE_SCHEMAS[string]): ASTNode[] {
  const nodes: ASTNode[] = [];

  // Document class — merge user format options with schema defaults
  const classOptions = buildClassOptions(data, schema);
  nodes.push(docClass(schema.documentClass, classOptions));
  nodes.push(blankLine());

  // Packages — use the canonical package system
  const packages = resolvePackages(data);
  for (const pkg of packages) {
    nodes.push(usepackage(pkg.name, pkg.options));
  }
  nodes.push(blankLine());

  // Package configuration block — geometry, microtype, hyperref, fancyhdr, etc.
  // This is the single source of truth for all \setup{} commands
  const configBlock = buildPackageConfiguration(data);
  if (configBlock) {
    nodes.push(rawLaTeX(configBlock));
    nodes.push(blankLine());
  }

  // Custom commands from TeX import (e.g. \newcommand{\mycmd}{...})
  if (data.customCommands && data.customCommands.length > 0) {
    nodes.push(comment('Custom commands (imported from source)'));
    for (const cmd of data.customCommands) {
      nodes.push(rawLaTeX(cmd));
    }
    nodes.push(blankLine());
  }

  return nodes;
}

function buildClassOptions(data: ThesisData, schema: typeof TEMPLATE_SCHEMAS[string]): string[] {
  const options = [...schema.classOptions];

  // Apply user font size
  const fontSizeIdx = options.findIndex(o => ['10pt', '11pt', '12pt'].includes(o));
  if (fontSizeIdx >= 0) options[fontSizeIdx] = data.options.fontSize;

  // Apply user paper size
  const paperIdx = options.findIndex(o => ['a4paper', 'letterpaper'].includes(o));
  if (paperIdx >= 0) options[paperIdx] = data.options.paperSize;

  // Remove duplicates
  return [...new Set(options)];
}

// ============================================================
// Title Page Builder — Template-Specific
// Each template has a distinct, correct title page structure.
// A Bachelor title page and a PhD title page are not the same
// with different words. They are structurally different documents.
// ============================================================

function buildTitlePage(data: ThesisData, schema: typeof TEMPLATE_SCHEMAS[string]): ASTNode[] {
  const builders: Record<ThesisType, (data: ThesisData) => ASTNode[]> = {
    bachelor: buildBachelorTitlePage,
    master: buildMasterTitlePage,
    phd: buildPhDTitlePage,
    report: buildReportTitlePage,
    conference: buildConferenceTitlePage,
  };

  const builder = builders[data.type] || buildBachelorTitlePage;
  return builder(data);
}

function buildBachelorTitlePage(data: ThesisData): ASTNode[] {
  const m = data.metadata;
  const nodes: ASTNode[] = [];

  nodes.push(comment('Title Page'));
  nodes.push(blankLine());

  const body: ASTNode[] = [
    rawLaTeX('\\centering'),
    rawLaTeX('\\vspace*{2cm}'),
    blankLine(),
  ];

  // University name
  if (m.university) {
    body.push(rawLaTeX(`{\\Large\\textbf{${escapeLatexMeta(m.university)}}\\par}`));
    body.push(rawLaTeX('\\vspace{0.5cm}'));
  }
  // Department
  if (m.department) {
    body.push(rawLaTeX(`{\\large ${escapeLatexMeta(m.department)}\\par}`));
    body.push(blankLine());
  }

  body.push(rawLaTeX('\\vspace{3cm}'));

  // Title
  body.push(rawLaTeX(`{\\Huge\\bfseries ${escapeLatexMeta(m.title)}\\par}`));
  // Subtitle
  if (m.subtitle) {
    body.push(rawLaTeX('\\vspace{0.5cm}'));
    body.push(rawLaTeX(`{\\large\\itshape ${escapeLatexMeta(m.subtitle)}\\par}`));
  }

  body.push(rawLaTeX('\\vspace{2cm}'));
  body.push(blankLine());

  // Author and Supervisor
  let authorBlock = '{\\large\n\\textbf{Author:} ' + escapeLatexMeta(m.author);
  if (m.authorId) {
    authorBlock += ' (' + escapeLatexMeta(m.authorId) + ')';
  }
  authorBlock += '\\par';
  if (m.supervisor) {
    authorBlock += '\\vspace{0.3cm}\n\\textbf{Supervisor:} ' + escapeLatexMeta(m.supervisorTitle || 'Prof.') + ' ' + escapeLatexMeta(m.supervisor) + '\\par';
  }
  authorBlock += '}';
  body.push(rawLaTeX(authorBlock));

  body.push(rawLaTeX('\\vfill'));

  // Degree and date
  const year = m.submissionDate
    ? new Date(m.submissionDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  body.push(rawLaTeX(`{\\large Bachelor of Science\\par}`));
  body.push(rawLaTeX('\\vspace{0.3cm}'));
  // Location and year — suppress location line if both location and year are empty
  const bachelorLocation = m.location ? escapeLatexMeta(m.location) + ' ' : '';
  if (bachelorLocation || year) {
    body.push(rawLaTeX(`{\\large ${bachelorLocation}${escapeLatexMeta(year)}\\par}`));
  }
  body.push(blankLine());

  nodes.push(environment('titlepage', body));
  nodes.push(blankLine());

  return nodes;
}

function buildMasterTitlePage(data: ThesisData): ASTNode[] {
  const m = data.metadata;
  const nodes: ASTNode[] = [];

  nodes.push(comment('Title Page'));
  nodes.push(blankLine());

  const body: ASTNode[] = [
    rawLaTeX('\\centering'),
    rawLaTeX('\\vspace*{1.5cm}'),
    blankLine(),
  ];

  // University with small caps
  if (m.university) {
    body.push(rawLaTeX(`{\\large\\textsc{${escapeLatexMeta(m.university)}}\\par}`));
  }
  if (m.faculty) {
    body.push(rawLaTeX('\\vspace{0.3cm}'));
    body.push(rawLaTeX(`{\\normalsize ${escapeLatexMeta(m.faculty)}\\par}`));
  }
  if (m.department) {
    body.push(rawLaTeX('\\vspace{0.3cm}'));
    body.push(rawLaTeX(`{\\normalsize ${escapeLatexMeta(m.department)}\\par}`));
  }

  body.push(rawLaTeX('\\vspace{2cm}'));

  // Decorative rule above title
  body.push(rawLaTeX('\\hrule'));
  body.push(rawLaTeX('\\vspace{0.5cm}'));

  // Title
  body.push(rawLaTeX(`{\\LARGE\\bfseries ${escapeLatexMeta(m.title)}\\par}`));

  // Subtitle
  if (m.subtitle) {
    body.push(rawLaTeX('\\vspace{0.3cm}'));
    body.push(rawLaTeX(`{\\large\\itshape ${escapeLatexMeta(m.subtitle)}\\par}`));
  }

  // Decorative rule below title
  body.push(rawLaTeX('\\vspace{0.5cm}'));
  body.push(rawLaTeX('\\hrule'));

  body.push(rawLaTeX('\\vspace{2cm}'));
  body.push(blankLine());

  // Author info as tabular
  let infoRows = `\\textbf{Author:}     & ${escapeLatexMeta(m.author)} \\\\[0.2cm]`;
  if (m.supervisor) {
    infoRows += `\n    \\textbf{Supervisor:} & ${escapeLatexMeta(m.supervisorTitle || 'Prof.')} ${escapeLatexMeta(m.supervisor)} \\\\[0.2cm]`;
  }
  if (m.coSupervisor) {
    infoRows += `\n    \\textbf{Co-supervisor:} & ${escapeLatexMeta(m.coSupervisorTitle || 'Dr.')} ${escapeLatexMeta(m.coSupervisor)} \\\\[0.2cm]`;
  }
  // ORCID — conditional, shown if metadata has orcid
  if (m.orcid) {
    infoRows += `\n    \\textbf{ORCID:} & \\href{https://orcid.org/${escapeLatexMeta(m.orcid)}}{orcid.org/${escapeLatexMeta(m.orcid)}} \\\\[0.2cm]`;
  }
  body.push(rawLaTeX(`\\begin{tabular}{rl}\n    ${infoRows}\n\\end{tabular}`));

  body.push(rawLaTeX('\\vfill'));

  // Degree and date
  const year = m.submissionDate
    ? new Date(m.submissionDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  // University name and year — suppress university line if empty to avoid blank rendering
  if (m.university) {
    body.push(rawLaTeX(`{\\large ${escapeLatexMeta(m.university)}\\par}`));
  }
  body.push(rawLaTeX(`{\\large ${escapeLatexMeta(year)}\\par}`));
  body.push(blankLine());

  nodes.push(environment('titlepage', body));
  nodes.push(blankLine());

  return nodes;
}

function buildPhDTitlePage(data: ThesisData): ASTNode[] {
  const m = data.metadata;
  const nodes: ASTNode[] = [];

  nodes.push(comment('Title Page'));
  nodes.push(blankLine());

  const body: ASTNode[] = [
    rawLaTeX('\\centering'),
    rawLaTeX('\\vspace*{1cm}'),
    blankLine(),
  ];

  // University with small caps
  if (m.university) {
    body.push(rawLaTeX(`{\\large\\textsc{${escapeLatexMeta(m.university)}}\\par}`));
  }

  body.push(rawLaTeX('\\vspace{2cm}'));

  // Title — PhD title pages are more dramatic
  body.push(rawLaTeX(`{\\Huge\\bfseries\\setstretch{1.2}\n${escapeLatexMeta(m.title)}\\par}`));

  if (m.subtitle) {
    body.push(rawLaTeX('\\vspace{0.5cm}'));
    body.push(rawLaTeX(`{\\Large\\itshape ${escapeLatexMeta(m.subtitle)}\\par}`));
  }

  body.push(rawLaTeX('\\vspace{2cm}'));

  // Author
  body.push(rawLaTeX(`{\\Large ${escapeLatexMeta(m.author)}\\par}`));

  body.push(rawLaTeX('\\vspace{3cm}'));
  body.push(blankLine());

  // PhD-specific declaration text
  body.push(rawLaTeX('{\\normalsize\nA thesis submitted in partial fulfilment of the requirements\\\\\nfor the degree of Doctor of Philosophy\\par}'));
  body.push(rawLaTeX('\\vspace{1cm}'));

  // Declaration of originality — standard for PhD theses
  body.push(rawLaTeX('\\vspace{0.5cm}'));
  body.push(rawLaTeX('{\\small\\textit{Declaration of Originality}\\par}'));
  body.push(rawLaTeX('\\vspace{0.3cm}'));
  body.push(rawLaTeX('{\\footnotesize I hereby declare that this doctoral thesis entitled \\"' + escapeLatexMeta(m.title) + '\\" is my own original work and has not been submitted elsewhere for the award of a degree. All sources used have been duly acknowledged.\\par}'));

  // Faculty, department, and university — suppress entire block if all empty
  const institutionParts: string[] = [];
  if (m.faculty) institutionParts.push(escapeLatexMeta(m.faculty));
  if (m.department) institutionParts.push(escapeLatexMeta(m.department));
  if (m.university) institutionParts.push(escapeLatexMeta(m.university));
  if (institutionParts.length > 0) {
    const institutionLines = institutionParts.join('\\\\[0.2cm]\n');
    body.push(rawLaTeX(`{\\normalsize\n${institutionLines}\\par}`));
  }

  body.push(rawLaTeX('\\vfill'));

  // Supervisors
  if (m.supervisor) {
    body.push(rawLaTeX(`{\\normalsize\\textbf{Supervisor:} ${escapeLatexMeta(m.supervisorTitle || 'Prof.')} ${escapeLatexMeta(m.supervisor)}\\par}`));
  }
  if (m.coSupervisor) {
    body.push(rawLaTeX(`{\\normalsize\\textbf{Co-supervisor:} ${escapeLatexMeta(m.coSupervisorTitle || 'Dr.')} ${escapeLatexMeta(m.coSupervisor)}\\par}`));
  }
  body.push(blankLine());

  // Year
  const year = m.submissionDate
    ? new Date(m.submissionDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  body.push(rawLaTeX(`{\\normalsize ${escapeLatexMeta(year)}\\par}`));
  body.push(blankLine());

  nodes.push(environment('titlepage', body));
  nodes.push(blankLine());

  return nodes;
}

function buildReportTitlePage(data: ThesisData): ASTNode[] {
  const m = data.metadata;
  const nodes: ASTNode[] = [];

  nodes.push(comment('Title Page'));
  nodes.push(blankLine());

  const body: ASTNode[] = [
    rawLaTeX('\\centering'),
    rawLaTeX('\\vspace*{2cm}'),
    blankLine(),
  ];

  // Title — clean and centered
  body.push(rawLaTeX(`{\\Huge\\bfseries ${escapeLatexMeta(m.title)}\\par}`));

  if (m.subtitle) {
    body.push(rawLaTeX('\\vspace{0.5cm}'));
    body.push(rawLaTeX(`{\\large ${escapeLatexMeta(m.subtitle)}\\par}`));
  }

  body.push(rawLaTeX('\\vspace{3cm}'));
  body.push(blankLine());

  // Author and affiliation
  body.push(rawLaTeX(`{\\large ${escapeLatexMeta(m.author)}\\par}`));
  // Report number — conditional, shown if metadata has one
  if (m.reportNumber) {
    body.push(rawLaTeX('\\vspace{0.5cm}'));
    body.push(rawLaTeX(`{\\normalsize\\textbf{Report Number:} ${escapeLatexMeta(m.reportNumber)}\\par}`));
  }
  if (m.university) {
    body.push(rawLaTeX('\\vspace{0.3cm}'));
    body.push(rawLaTeX(`{\\normalsize ${escapeLatexMeta(m.university)}\\par}`));
  }
  if (m.department) {
    body.push(rawLaTeX('\\vspace{0.3cm}'));
    body.push(rawLaTeX(`{\\normalsize ${escapeLatexMeta(m.department)}\\par}`));
  }
  body.push(rawLaTeX('\\vfill'));

  // Date
  const year = m.submissionDate
    ? new Date(m.submissionDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  // Location and year — omit leading comma if location is empty
  const reportLocation = m.location ? escapeLatexMeta(m.location) + ', ' : '';
  body.push(rawLaTeX(`{\\normalsize ${reportLocation}${escapeLatexMeta(year)}\\par}`));
  body.push(blankLine());

  nodes.push(environment('titlepage', body));
  nodes.push(blankLine());

  return nodes;
}

function buildConferenceTitlePage(data: ThesisData): ASTNode[] {
  const m = data.metadata;
  const nodes: ASTNode[] = [];

  nodes.push(comment('Title Block'));
  nodes.push(blankLine());

  // IEEE conference paper title — centered, uppercase
  const body: ASTNode[] = [
    rawLaTeX('\\centering'),
    blankLine(),
  ];

  // Title
  body.push(rawLaTeX(`{\\Large\\bfseries ${escapeLatexMeta(m.title)}\\par}`));
  if (m.subtitle) {
    body.push(rawLaTeX('\\vspace{0.3cm}'));
    body.push(rawLaTeX(`{\\normalsize\\itshape ${escapeLatexMeta(m.subtitle)}\\par}`));
  }

  body.push(rawLaTeX('\\vspace{0.5cm}'));
  body.push(blankLine());

  // Author info — IEEE style with \IEEEauthorblock
  if (m.author) {
    let authorBlock = `\\begin{IEEEauthorblockN}{${escapeLatexMeta(m.author)}}\n`;
    // Affiliation line
    let affiliation = '';
    if (m.university) {
      affiliation += escapeLatexMeta(m.university);
    }
    if (m.department) {
      affiliation = escapeLatexMeta(m.department) + (affiliation ? ', ' + affiliation : '');
    }
    if (affiliation) {
      authorBlock += `\\begin{IEEEauthorblockA}\n${affiliation}\n`;
      // ORCID — conditional within IEEE author block
      if (m.orcid) {
        authorBlock += `\\\\ ORCID: \\href{https://orcid.org/${escapeLatexMeta(m.orcid)}}{${escapeLatexMeta(m.orcid)}}\n`;
      }
      authorBlock += `\\end{IEEEauthorblockA}\n`;
    }
    authorBlock += `\\end{IEEEauthorblockN}`;
    body.push(rawLaTeX(authorBlock));
  }

  body.push(rawLaTeX('\\vspace{0.5cm}'));

  // Date
  const year = m.submissionDate
    ? new Date(m.submissionDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  body.push(rawLaTeX(`{\\small ${escapeLatexMeta(year)}\\par}`));
  body.push(blankLine());

  nodes.push(environment('IEEEtitlepage', body));
  nodes.push(blankLine());

  return nodes;
}

// ============================================================
// Front Matter Builder
// Conditional: only includes sections that have content.
// Declaration page for master/phd (after abstract, before TOC).
// Dedication for master/phd. Conference papers skip academic
// front matter (declaration, dedication, TOC).
//
// Page numbering:
//   - gobble: title/declaration/abstract pages (set in buildAST)
//   - roman: front matter starts here (TOC, lists)
//   - arabic: main matter chapters (set in buildMainMatter)
// ============================================================

function buildFrontMatter(data: ThesisData, schema: typeof TEMPLATE_SCHEMAS[string]): ASTNode[] {
  const nodes: ASTNode[] = [];
  const { metadata, abstract, keywords, options } = data;
  const isReport = schema.documentClass === 'article';
  const isConference = data.type === 'conference';

  // Conference papers: no \frontmatter, no declaration, no dedication, no TOC.
  if (isConference) {
    nodes.push(comment('Front Matter'));

    // Abstract — required for conference papers, use IEEE \begin{abstract} environment
    nodes.push(comment('Abstract'));
    if (abstract && abstract.trim()) {
      const absBody: ASTNode[] = [];
      absBody.push(...processChapterBody(abstract));
      // Keywords inside IEEE abstract
      if (keywords && keywords.length > 0) {
        absBody.push(blankLine());
        absBody.push(command('noindent'));
        absBody.push(command('textbf', ['Keywords: ']));
        absBody.push(text(keywords.map(k => escapeLatexMeta(k)).join(', ')));
        absBody.push(blankLine());
      }
      nodes.push(environment('abstract', absBody));
    } else {
      const absBody: ASTNode[] = [
        comment('TODO: Write your abstract here. Aim for 200-250 words for a conference paper.'),
        text('TODO: Write your abstract here.'),
      ];
      nodes.push(environment('abstract', absBody));
    }
    nodes.push(blankLine());

    return nodes;
  }

  // Page numbering: roman for front matter
  // Note: LaTeX report class does not provide \frontmatter command,
  // so we use manual \pagenumbering{roman} for all template types.
  nodes.push(comment('Front Matter'));
  nodes.push(command('pagenumbering', ['roman']));
  nodes.push(blankLine());

  // Dedication — only if enabled and content provided
  // NOTE: \begin{dedication} is NOT a standard LaTeX environment.
  // Use \chapter*{} with centering for Overleaf compatibility.
  if (options.includeDedication && metadata.dedication && metadata.dedication.trim()) {
    nodes.push(comment('Dedication'));
    const dedCmd = isReport ? 'section' : 'chapter';
    nodes.push(command(dedCmd, ['Dedication'], undefined, true));
    nodes.push(command('addcontentsline', ['toc', dedCmd, 'Dedication']));
    nodes.push(blankLine());
    nodes.push(rawLaTeX('\\vspace*{\\fill}'));
    nodes.push(rawLaTeX('\\begin{center}'));
    nodes.push(rawLaTeX('\\large\\itshape'));
    nodes.push(text(escapeLatexMeta(metadata.dedication)));
    nodes.push(rawLaTeX('\\end{center}'));
    nodes.push(rawLaTeX('\\vspace*{\\fill}'));
    nodes.push(newPage('cleardoublepage'));
    nodes.push(blankLine());
  }

  // Abstract — always included (even if empty, it's required by most universities)
  nodes.push(comment('Abstract'));
  const absLabel = isReport ? 'section' : 'chapter';
  nodes.push(command(absLabel, ['Abstract'], undefined, true));
  nodes.push(command('addcontentsline', ['toc', absLabel, 'Abstract']));
  nodes.push(blankLine());
  if (abstract && abstract.trim()) {
    nodes.push(...processChapterBody(abstract));
  } else {
    nodes.push(comment('TODO: Write your abstract here. Aim for 150-350 words.'));
    nodes.push(text('TODO: Write your abstract here.'));
  }
  // Keywords
  if (keywords && keywords.length > 0) {
    nodes.push(blankLine());
    nodes.push(command('noindent'));
    nodes.push(command('textbf', ['Keywords: ']));
    nodes.push(text(keywords.map(k => escapeLatexMeta(k)).join(', ')));
    nodes.push(blankLine());
  }
  nodes.push(blankLine());

  // Declaration page — master and PhD only (placed after abstract, before TOC)
  // Note: bachelor templates handle declaration differently;
  // report and conference types do not require academic declarations.
  if (data.type === 'master' || data.type === 'phd') {
    nodes.push(...buildDeclarationPage(data));
  }

  // Acknowledgments — only if enabled and content provided
  if (options.includeAcknowledgment && metadata.acknowledgment && metadata.acknowledgment.trim()) {
    nodes.push(comment('Acknowledgments'));
    const ackCmd = isReport ? 'section' : 'chapter';
    nodes.push(command(ackCmd, ['Acknowledgments'], undefined, true));
    nodes.push(command('addcontentsline', ['toc', ackCmd, 'Acknowledgments']));
    nodes.push(blankLine());
    nodes.push(...processChapterBody(metadata.acknowledgment));
    nodes.push(blankLine());
  }

  // Table of Contents
  nodes.push(comment('Table of Contents'));
  nodes.push(command('tableofcontents'));
  nodes.push(newPage('cleardoublepage'));
  nodes.push(blankLine());

  // List of Figures — conditional on detected figures
  if (detectFigures(data.chapters)) {
    nodes.push(command('listoffigures'));
    nodes.push(newPage('cleardoublepage'));
    nodes.push(blankLine());
  }

  // List of Tables — conditional on detected tables
  if (detectTables(data.chapters)) {
    nodes.push(command('listoftables'));
    nodes.push(newPage('cleardoublepage'));
    nodes.push(blankLine());
  }

  return nodes;
}

/**
 * Declaration page — thesis-type-aware academic integrity declaration.
 * Included for master and PhD only (not bachelor, not report, not conference).
 * Each thesis type has distinct declaration wording reflecting degree requirements.
 * Placed after abstract and before acknowledgments/TOC.
 */
function buildDeclarationPage(data: ThesisData): ASTNode[] {
  const nodes: ASTNode[] = [];
  const m = data.metadata;
  const type = data.type;

  nodes.push(comment('Declaration'));
  const declCmd = 'chapter';
  nodes.push(command(declCmd, ['Declaration'], undefined, true));
  nodes.push(command('addcontentsline', ['toc', declCmd, 'Declaration']));
  nodes.push(blankLine());

  // Thesis-type-specific declaration text
  let declarationText = '';
  if (type === 'phd') {
    declarationText =
      'I hereby declare that this doctoral thesis, entitled \\"' + escapeLatexMeta(m.title) + '\\", ' +
      'is my own original work and has not been submitted elsewhere for the award of a degree, ' +
      'diploma, or professional qualification. All sources of information used have been ' +
      'duly acknowledged. This thesis does not contain other persons\\textquotesingle{} data, ' +
      'pictures, graphs, or other information, unless specifically acknowledged as being ' +
      'sourced from other researchers. Where written permission has been granted, the extent ' +
      'of such permission has been clearly indicated. No portion of this thesis has been ' +
      'previously submitted for any degree or qualification at any other university.';
  } else if (type === 'master') {
    declarationText =
      'I declare that this thesis, entitled \\"' + escapeLatexMeta(m.title) + '\\", ' +
      'is my own original work and has not been submitted for any degree or examination ' +
      'at any other university. All sources of information used have been duly acknowledged. ' +
      'This thesis does not contain other persons\\textquotesingle{} data, pictures, graphs, ' +
      'or other information, unless specifically acknowledged as being sourced from other ' +
      'researchers. Where written permission has been granted, the extent of such permission ' +
      'has been clearly indicated.';
  } else {
    // Bachelor's thesis declaration
    declarationText =
      'I declare that this thesis is my original work and has not been submitted ' +
      'for any degree or examination at any other university. All sources of information ' +
      'used have been duly acknowledged. This thesis does not contain other persons\\textquotesingle{} ' +
      'data, pictures, graphs or other information, unless specifically acknowledged as being ' +
      'sourced from other researchers. Where written permission has been granted, the extent ' +
      'of such permission has been clearly indicated.';
  }

  nodes.push(...processChapterBody(declarationText));

  nodes.push(blankLine());
  nodes.push(rawLaTeX('\\vspace{2cm}'));
  nodes.push(blankLine());

  // Signature line
  const year = m.submissionDate
    ? new Date(m.submissionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Degree-specific signature block
  const degreeLabel = type === 'phd' ? 'Doctor of Philosophy'
    : type === 'master' ? "Master\\textquotesingle{}s Degree"
    : "Bachelor\\textquotesingle{}s Degree";

  nodes.push(rawLaTeX(
    `\\noindent\\begin{tabular}{ll}\n` +
    `  \\textbf{Name:}            & ${escapeLatexMeta(m.author)} \\\\\n` +
    `  \\textbf{Degree:}          & ${degreeLabel} \\\\\n` +
    (m.supervisor ? `  \\textbf{Supervisor:}     & ${escapeLatexMeta(m.supervisor)} \\\\\n` : '') +
    `  \\textbf{Date:}            & ${escapeLatexMeta(year)} \\\\\n` +
    `  \\textbf{Signature:}       & \\rule[0.5ex]{6cm}{0.5pt} \\\\\n` +
    `\\end{tabular}`
  ));

  nodes.push(newPage('cleardoublepage'));
  nodes.push(blankLine());

  return nodes;
}

// ============================================================
// Main Matter Builder — Chapters with Labels
// ============================================================

function buildMainMatter(data: ThesisData, schema: typeof TEMPLATE_SCHEMAS[string]): ASTNode[] {
  const nodes: ASTNode[] = [];
  const isReport = schema.documentClass === 'article';
  const isConference = data.type === 'conference';

  // Page numbering: arabic for main matter, reset to page 1
  // Note: LaTeX report class does not provide \mainmatter command,
  // so we use manual \pagenumbering{arabic} for all template types.
  nodes.push(comment('Main Matter'));
  nodes.push(command('pagenumbering', ['arabic']));
  nodes.push(rawLaTeX('\\setcounter{page}{1}'));
  nodes.push(blankLine());

  for (let i = 0; i < data.chapters.length; i++) {
    const chapter = data.chapters[i];
    nodes.push(...buildChapter(chapter, data.type, schema, i));
  }

  return nodes;
}

function buildChapter(
  chapter: ThesisChapter,
  type: ThesisType,
  schema: typeof TEMPLATE_SCHEMAS[string],
  index: number
): ASTNode[] {
  const nodes: ASTNode[] = [];
  const chCmd = schema.chapterCommand.replace('\\', ''); // 'chapter' or 'section'
  const secCmd = type === 'report' ? 'subsection' : 'section';
  const body = (chapter.content || '').trim();
  const coreCount = schema.bodyStructure.length;

  // Generate a consistent label for cross-references
  const chapterLabel = generateLabel('chapter', chapter.title, chapter.id);

  // Empty chapter handling
  if (!body) {
    const isCoreChapter = chapter.number <= coreCount;
    const hasNoSubSections = !chapter.subSections || chapter.subSections.length === 0;

    if (!isCoreChapter && hasNoSubSections) {
      return []; // Suppress optional empty chapters entirely
    }

    // Required empty chapter — include with TODO placeholder
    nodes.push(comment(`${chCmd === 'chapter' ? 'Chapter' : 'Section'} ${chapter.number}: ${chapter.title}`));
    nodes.push(command(chCmd, [escapeLatexMeta(chapter.title)]));
    nodes.push(label(chapterLabel));
    nodes.push(blankLine());
    nodes.push(comment(`TODO: Add content for "${chapter.title}". This section requires substantial writing.`));
    nodes.push(text('TODO: Add content for this section.'));
    nodes.push(blankLine());
    return nodes;
  }

  // Chapter heading with label
  const chLabel = chCmd === 'chapter' ? 'Chapter' : 'Section';
  nodes.push(comment(`${chLabel} ${chapter.number}: ${chapter.title}`));
  nodes.push(command(chCmd, [escapeLatexMeta(chapter.title)]));
  nodes.push(label(chapterLabel));
  nodes.push(blankLine());

  // Chapter body — processed through the content pipeline
  nodes.push(...processChapterBody(body));
  nodes.push(blankLine());

  // Subsections
  if (chapter.subSections && chapter.subSections.length > 0) {
    for (let si = 0; si < chapter.subSections.length; si++) {
      const sub = chapter.subSections[si];
      if (sub.title?.trim()) {
        const subLabel = generateLabel('section', sub.title, sub.id);
        nodes.push(command(secCmd, [escapeLatexMeta(sub.title)]));
        nodes.push(label(subLabel));
        nodes.push(blankLine());
        if (sub.content && sub.content.trim()) {
          nodes.push(...processChapterBody(sub.content));
          nodes.push(blankLine());
        }
      }
    }
  }

  return nodes;
}

// ============================================================
// Appendices Builder
// ============================================================

function buildAppendices(data: ThesisData, schema: typeof TEMPLATE_SCHEMAS[string]): ASTNode[] {
  const nodes: ASTNode[] = [];
  const chCmd = schema.chapterCommand.replace('\\', '');

  nodes.push(comment('Appendices'));
  nodes.push(command('appendix'));
  nodes.push(blankLine());

  for (const appendix of data.appendices) {
    const appLabel = generateLabel('appendix', appendix.title, appendix.id);
    nodes.push(command(chCmd, [escapeLatexMeta(appendix.title)]));
    nodes.push(label(appLabel));
    nodes.push(blankLine());
    if (appendix.content && appendix.content.trim()) {
      nodes.push(...processChapterBody(appendix.content));
      nodes.push(blankLine());
    }
  }

  return nodes;
}

// ============================================================
// Back Matter Builder — Bibliography (and glossary for PhD)
// ============================================================

function buildBackMatter(data: ThesisData, schema: typeof TEMPLATE_SCHEMAS[string]): ASTNode[] {
  const nodes: ASTNode[] = [];
  const isReport = schema.documentClass === 'article';
  const isConference = data.type === 'conference';

  // \backmatter only in report/book class (not article, not IEEEtran)
  if (!isReport && !isConference) {
    nodes.push(comment('Back Matter'));
    nodes.push(command('backmatter'));
    nodes.push(blankLine());
  } else {
    nodes.push(comment('Back Matter'));
  }

  // Glossary — PhD only
  // NOTE: \printglossaries requires external `makeglossaries` tool.
  // Use \printnoidxglossary instead — works with single-pass pdflatex on Overleaf.
  if (data.type === 'phd' && data.options.includeGlossary) {
    nodes.push(command('chapter', ['Glossary']));
    nodes.push(command('printnoidxglossary'));
    nodes.push(blankLine());
  }

  // Bibliography
  if (data.references.length === 0) {
    nodes.push(comment('No references added yet. Add references in Step 4 to populate this section.'));
    nodes.push(blankLine());
    return nodes;
  }

  // Conference papers use \section* for bibliography, others use \chapter
  if (isConference) {
    nodes.push(command('section', ['References'], undefined, true));
  } else {
    // Use thebibliography for zero-config compilability
    nodes.push(command('chapter', ['Bibliography'], undefined, true));
    nodes.push(command('addcontentsline', ['toc', 'chapter', 'Bibliography']));
  }
  nodes.push(blankLine());

  nodes.push(command('begin', ['thebibliography', String(data.references.length)]));
  nodes.push(blankLine());

  // Track used keys for deduplication
  const usedKeys = new Set<string>();

  for (let i = 0; i < data.references.length; i++) {
    const ref = data.references[i];
    let key = generateCiteKey(ref, i);

    // Deduplicate keys
    let originalKey = key;
    let dedupIndex = 0;
    while (usedKeys.has(key)) {
      dedupIndex++;
      key = `${originalKey}${String.fromCharCode(97 + dedupIndex)}`; // a, b, c...
    }
    usedKeys.add(key);

    const entryText = formatBibItemInline(ref);
    nodes.push(text(`  \\bibitem{${key}} ${entryText}`, true));
    nodes.push(blankLine());
  }

  nodes.push(command('end', ['thebibliography']));
  nodes.push(blankLine());

  // Include BibTeX source as comment block for advanced users
  nodes.push(comment(
    'BibTeX Source (for BibTeX workflow)\n' +
    'To switch: uncomment \\bibliography{references} and remove thebibliography above'
  ));
  nodes.push(blankLine());

  for (let i = 0; i < data.references.length; i++) {
    const ref = data.references[i];
    const bibEntry = formatBibTeXEntry(ref, i);
    nodes.push(comment(bibEntry));
    nodes.push(blankLine());
  }

  return nodes;
}

// ============================================================
// Content Processing Pipeline
// Converts plain text to AST nodes with smart processing:
//   1. Normalize whitespace
//   2. Split into paragraphs
//   3. Handle [figure]/[table] placeholders
//   4. Convert ## headings to \section
//   5. Escape LaTeX special chars (smart — preserves existing commands)
// ============================================================

function processChapterBody(content: string): ASTNode[] {
  return buildChapterBodyNodes(content, 'ch');
}

/**
 * Upgraded chapter body processor.
 * Detects structure in plain text and promotes it to typed AST nodes.
 * Preserves existing raw LaTeX pass-through for advanced users.
 *
 * Detects: ##/### headings, ``` code blocks, $$/\[ display math,
 * - bullet lists, 1. numbered lists, [figure: caption], [table: caption].
 */
export function buildChapterBodyNodes(rawBody: string, chapterId: string): ASTNode[] {
  if (!rawBody?.trim()) {
    return [comment('TODO: Add content for this chapter')];
  }

  const nodes: ASTNode[] = [];
  const lines = rawBody.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let buffer: string[] = [];
  let i = 0;
  let figCount = 0;
  let tabCount = 0;

  const flushBuffer = () => {
    const text2 = buffer.join('\n').trim();
    if (text2) {
      // Process buffered text through placeholder splitter
      const parts = splitPlaceholders(text2);
      for (const part of parts) {
        if (part.type === 'figure') {
          figCount++;
          nodes.push(...buildFigurePlaceholder(part.caption || '', figCount));
        } else if (part.type === 'table') {
          tabCount++;
          nodes.push(...buildTablePlaceholder(part.caption || '', tabCount));
        } else {
          const contentLines = part.content.split('\n');
          for (let j = 0; j < contentLines.length; j++) {
            if (j > 0) nodes.push(text('\\\\', true));
            const line = contentLines[j].trim();
            if (line) nodes.push(text(escapeLatexBody(line)));
          }
          nodes.push(blankLine());
        }
      }
    }
    buffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // ── Subsection markers (## and ###) ──
    if (/^#{2}\s+(.+)$/.test(line)) {
      flushBuffer();
      const title = line.replace(/^#{2}\s+/, '').trim();
      const headingLabel = generateLabel('subsection', title);
      nodes.push(command('subsection', [escapeLatexMeta(title)]));
      nodes.push(label(headingLabel));
      nodes.push(blankLine());
      i++; continue;
    }
    if (/^#{3}\s+(.+)$/.test(line)) {
      flushBuffer();
      const title = line.replace(/^#{3}\s+/, '').trim();
      const headingLabel = generateLabel('subsec', title);
      nodes.push(command('subsubsection', [escapeLatexMeta(title)]));
      nodes.push(blankLine());
      i++; continue;
    }

    // ── Code block (``` ... ```) ──
    if (line.trimStart().startsWith('```')) {
      flushBuffer();
      const lang = line.replace(/```/, '').trim() || null;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(verbatim(codeLines.join('\n'), lang));
      nodes.push(blankLine());
      i++; continue;
    }

    // ── Display math (\[ ... \] or $$ ... $$) ──
    if (line.trim() === '\\[' || line.trim() === '$$') {
      flushBuffer();
      const mathLines: string[] = [];
      const closer = line.trim() === '$$' ? '$$' : '\\]';
      i++;
      while (i < lines.length && lines[i].trim() !== closer) {
        mathLines.push(lines[i]);
        i++;
      }
      nodes.push(math(mathLines.join('\n'), true));
      nodes.push(blankLine());
      i++; continue;
    }

    // ── Bullet list (- item) ──
    if (/^[\s]*[-*]\s+/.test(line)) {
      flushBuffer();
      const items: Array<{ term?: string; content: string }> = [];
      while (i < lines.length && /^[\s]*[-*]\s+/.test(lines[i])) {
        items.push({ content: lines[i].replace(/^[\s]*[-*]\s+/, '').trim() });
        i++;
      }
      nodes.push(list('itemize', items));
      nodes.push(blankLine());
      continue;
    }

    // ── Numbered list (1. item) ──
    if (/^[\s]*\d+\.\s+/.test(line)) {
      flushBuffer();
      const items: Array<{ term?: string; content: string }> = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        items.push({ content: lines[i].replace(/^[\s]*\d+\.\s+/, '').trim() });
        i++;
      }
      nodes.push(list('enumerate', items));
      nodes.push(blankLine());
      continue;
    }

    buffer.push(line);
    i++;
  }

  flushBuffer();
  return nodes;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}

// ============================================================
// Placeholder Handlers
// ============================================================

interface ContentPart {
  type: 'text' | 'figure' | 'table';
  content: string;
  caption?: string;
  count?: number;
}

function splitPlaceholders(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const figureRegex = /\[figure\](?::([^\]]*))?/g;
  const tableRegex = /\[table\](?::([^\]]*))?/g;

  const tokens: Array<{ pos: number; len: number; type: 'figure' | 'table'; caption: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = figureRegex.exec(content)) !== null) {
    tokens.push({ pos: match.index, len: match[0].length, type: 'figure', caption: match[1] || '' });
  }
  while ((match = tableRegex.exec(content)) !== null) {
    tokens.push({ pos: match.index, len: match[0].length, type: 'table', caption: match[1] || '' });
  }

  if (tokens.length === 0) {
    return [{ type: 'text', content }];
  }

  tokens.sort((a, b) => a.pos - b.pos);

  let lastEnd = 0;
  let figCount = 0;
  let tabCount = 0;

  for (const token of tokens) {
    if (token.pos > lastEnd) {
      parts.push({ type: 'text', content: content.slice(lastEnd, token.pos) });
    }
    if (token.type === 'figure') {
      figCount++;
      parts.push({ type: 'figure', content: '', caption: token.caption, count: figCount });
    } else {
      tabCount++;
      parts.push({ type: 'table', content: '', caption: token.caption, count: tabCount });
    }
    lastEnd = token.pos + token.len;
  }

  if (lastEnd < content.length) {
    parts.push({ type: 'text', content: content.slice(lastEnd) });
  }

  return parts;
}

function buildFigurePlaceholder(caption: string, count: number): ASTNode[] {
  const cap = caption || 'Figure placeholder';
  const figLabel = `fig:placeholder${count > 0 ? '-' + count : ''}`;
  return [
    environment('figure', [
      blankLine(),
      command('centering'),
      command('includegraphics', ['figures/placeholder'], ['width=0.8\\textwidth']),
      command('caption', [escapeLatexMeta(cap)]),
      command('label', [figLabel]),
      blankLine(),
    ], ['htbp']),
    blankLine(),
  ];
}

function buildTablePlaceholder(caption: string, count: number): ASTNode[] {
  const cap = caption || 'Table placeholder';
  const tabLabel = `tab:placeholder${count > 0 ? '-' + count : ''}`;
  return [
    environment('table', [
      blankLine(),
      command('centering'),
      command('caption', [escapeLatexMeta(cap)]),
      command('label', [tabLabel]),
      blankLine(),
      comment('Replace with your table content'),
      text('\\begin{tabular}{lcc}', true),
      text('\\toprule', true),
      text('Header 1 & Header 2 & Header 3 \\\\', true),
      text('\\midrule', true),
      text('Data 1 & Data 2 & Data 3 \\\\', true),
      text('Data 4 & Data 5 & Data 6 \\\\', true),
      text('\\bottomrule', true),
      text('\\end{tabular}', true),
      blankLine(),
    ], ['htbp']),
    blankLine(),
  ];
}

// ============================================================
// Label Generation — Document Intelligence
// Every chapter, section, figure, table gets a consistent label
// so students can use \\cref{} without manual label management.
// ============================================================

function generateLabel(type: string, title: string, id: string | undefined = undefined): string {
  const prefix: Record<string, string> = {
    chapter: 'ch',
    section: 'sec',
    subsection: 'subsec',
    figure: 'fig',
    table: 'tab',
    equation: 'eq',
    appendix: 'app',
  };

  const p = prefix[type] || 'item';

  // Use ID if available (more stable than title-based slugs)
  if (id) {
    const slug = id
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 30);
    if (slug) return `${p}:${slug}`;
  }

  // Fallback: derive from title
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30);

  return `${p}:${slug}`;
}

// ============================================================
// Bibliography Formatting Helpers
// ============================================================

function generateCiteKey(ref: ThesisReference, index: number): string {
  const sanitize = (s: string): string => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  let authorPart = 'unknown';
  if (ref.authors) {
    const firstAuthor = ref.authors.split(',')[0].trim();
    const parts = firstAuthor.split(/\s+/);
    authorPart = sanitize(parts[parts.length - 1] || firstAuthor);
  }
  const yearPart = sanitize(ref.year || '0000');
  let titlePart = '';
  if (ref.title) {
    const firstWord = ref.title.split(/\s+/)
      .find(w => w.length > 3) || ref.title.split(/\s+/)[0];
    titlePart = sanitize(firstWord).slice(0, 8);
  }
  return `${authorPart}${yearPart}${titlePart}${index}`;
}

function formatBibItemInline(ref: ThesisReference): string {
  let entry = `${escapeLatexMeta(ref.authors)}, `;

  switch (ref.type) {
    case 'book':
      entry += `\\textit{${escapeLatexMeta(ref.title)}}`;
      if (ref.edition) entry += `, ${escapeLatexMeta(ref.edition)} edition`;
      if (ref.publisher) entry += `, ${escapeLatexMeta(ref.publisher)}`;
      if (ref.address) entry += `, ${escapeLatexMeta(ref.address)}`;
      if (ref.year) entry += `, ${escapeLatexMeta(ref.year)}`;
      entry += '.';
      break;
    case 'article':
      entry += `\\textit{${escapeLatexMeta(ref.title)}}, `;
      if (ref.journal) entry += `${escapeLatexMeta(ref.journal)}, `;
      if (ref.volume) entry += `vol.~${escapeLatexMeta(ref.volume)}, `;
      if (ref.number) entry += `no.~${escapeLatexMeta(ref.number)}, `;
      if (ref.pages) entry += `pp.~${escapeLatexMeta(ref.pages)}, `;
      if (ref.year) entry += `${escapeLatexMeta(ref.year)}`;
      entry += '.';
      break;
    case 'inproceedings':
      entry += `\\textit{${escapeLatexMeta(ref.title)}}, `;
      if (ref.bookTitle) entry += `in \\textit{${escapeLatexMeta(ref.bookTitle)}}, `;
      if (ref.pages) entry += `pp.~${escapeLatexMeta(ref.pages)}, `;
      if (ref.year) entry += `${escapeLatexMeta(ref.year)}`;
      entry += '.';
      break;
    case 'online':
      entry += `\\textit{${escapeLatexMeta(ref.title)}}, `;
      if (ref.url) entry += `\\url{${ref.url}}, `;
      if (ref.accessed) entry += `accessed: ${escapeLatexMeta(ref.accessed)}`;
      entry += '.';
      break;
    case 'thesis':
      entry += `\\textit{${escapeLatexMeta(ref.title)}}, `;
      if (ref.school) entry += `${escapeLatexMeta(ref.school)}, `;
      if (ref.year) entry += `${escapeLatexMeta(ref.year)}`;
      entry += '.';
      break;
    case 'techreport':
      entry += `\\textit{${escapeLatexMeta(ref.title)}}, `;
      if (ref.publisher) entry += `${escapeLatexMeta(ref.publisher)}, `;
      if (ref.year) entry += `${escapeLatexMeta(ref.year)}`;
      entry += '.';
      break;
    default:
      entry += `\\textit{${escapeLatexMeta(ref.title)}}`;
      if (ref.year) entry += `, ${escapeLatexMeta(ref.year)}`;
      entry += '.';
  }

  return entry;
}

function formatBibTeXEntry(ref: ThesisReference, index: number): string {
  const key = generateCiteKey(ref, index);
  const typeMap: Record<string, string> = {
    article: 'article',
    book: 'book',
    inproceedings: 'inproceedings',
    techreport: 'techreport',
    thesis: 'phdthesis',
    online: 'online',
    misc: 'misc',
  };
  const bibType = typeMap[ref.type] || 'misc';

  const fields: string[] = [];
  fields.push(`  author  = {${ref.authors || 'TODO: Add author'}}`);
  fields.push(`  title   = {${ref.title || 'TODO: Add title'}}`);

  if (ref.journal) fields.push(`  journal = {${ref.journal}}`);
  if (ref.bookTitle) fields.push(`  booktitle = {${ref.bookTitle}}`);
  if (ref.publisher) fields.push(`  publisher = {${ref.publisher}}`);
  if (ref.school) fields.push(`  school = {${ref.school}}`);
  if (ref.year) fields.push(`  year = {${ref.year}}`);
  if (ref.volume) fields.push(`  volume = {${ref.volume}}`);
  if (ref.number) fields.push(`  number = {${ref.number}}`);
  if (ref.pages) {
    // Normalize dashes to en-dashes for LaTeX
    const normalizedPages = ref.pages.replace(/\s*[-\u2013]\s*/g, '--');
    fields.push(`  pages = {${normalizedPages}}`);
  }
  if (ref.edition) fields.push(`  edition = {${ref.edition}}`);
  if (ref.address) fields.push(`  address = {${ref.address}}`);
  if (ref.doi) fields.push(`  doi = {${ref.doi}}`);
  if (ref.url) fields.push(`  url = {${ref.url}}`);
  if (ref.accessed) fields.push(`  urldate = {${ref.accessed}}`);
  if (ref.note) fields.push(`  note = {${ref.note}}`);
  if (ref.howPublished) fields.push(`  howpublished = {${ref.howPublished}}`);

  return `@${bibType}{${key},\n${fields.join(',\n')}\n}`;
}

// ============================================================
// Utility — Escape shorthands
// ============================================================
// Note: escapeLatexMeta is imported from @/engine/escape (line 16).
// No local wrapper needed — the import is used directly.
// ============================================================

/** Escape for chapter body text — smart, preserves LaTeX commands */
function esc(str: string): string {
  return escapeLatexBody(str);
}
