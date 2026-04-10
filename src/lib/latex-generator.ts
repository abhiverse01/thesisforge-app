// ============================================================
// LaTeX Generator Engine — Generates clean, compilable LaTeX
// Uses the template schema system. Templates are data; this is code.
// ============================================================

import type { ThesisData, ThesisChapter, ThesisReference, ThesisAppendix, ReferenceType, ThesisType } from './thesis-types';
import { escapeLatex } from '@/utils/latex-escape';

/**
 * Escape special LaTeX characters in user input.
 * CRITICAL: Always escape user input before inserting into LaTeX.
 */
function esc(text: string): string {
  return escapeLatex(text);
}

/**
 * Convert plain text content to LaTeX paragraphs.
 * Splits on double newlines for paragraph separation.
 */
function contentToLatex(content: string): string {
  if (!content || !content.trim()) return '';
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length === 0) return '';

  return paragraphs
    .map((p) => {
      const escaped = esc(p.trim());
      // Handle single newlines within a paragraph as line breaks
      return escaped.replace(/\n/g, ' \\\\\n');
    })
    .join('\n\n');
}

/**
 * Generate BibTeX citation key from reference.
 */
function generateCiteKey(ref: ThesisReference, index: number): string {
  let authorPart = 'unknown';
  if (ref.authors) {
    const firstAuthor = ref.authors.split(',')[0].trim();
    const parts = firstAuthor.split(/\s+/);
    authorPart = (parts[parts.length - 1] || firstAuthor)
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }
  const yearPart = ref.year || '0000';
  let titlePart = '';
  if (ref.title) {
    titlePart = ref.title.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);
  }
  return `${authorPart}${yearPart}${titlePart}${index}`;
}

/**
 * Get the LaTeX chapter command based on thesis type.
 * PhD/Master: \chapter{} (report class)
 * Bachelor/Report: \section{} (article class for report, \chapter for bachelor)
 */
function getChapterCommand(type: ThesisType): string {
  if (type === 'report') return '\\section';
  return '\\chapter';
}

function getSectionCommand(type: ThesisType): string {
  if (type === 'report') return '\\subsection';
  return '\\section';
}

/**
 * Generate the document class and preamble.
 * Key: hyperref is loaded LAST. natbib before hyperref.
 */
function generatePreamble(data: ThesisData): string {
  const { type, options } = data;
  let p = '';

  // ---- Document Class ----
  const classMap: Record<ThesisType, string> = {
    bachelor: 'report',
    master: 'report',
    phd: 'report',
    report: 'report',
  };
  const sideOption = type === 'phd' ? 'twoside' : 'oneside';
  p += `\\documentclass[${options.fontSize},${options.paperSize},${sideOption}]{${classMap[type]}}\n\n`;

  // ---- Encoding & Fonts ----
  p += `\\usepackage[utf8]{inputenc}\n`;
  p += `\\usepackage[T1]{fontenc}\n`;
  p += `\\usepackage{lmodern}\n\n`;

  // ---- Language ----
  p += `\\usepackage[english]{babel}\n\n`;

  // ---- Page Geometry ----
  const marginMap: Record<string, string> = {
    normal: '1in',
    narrow: '0.75in',
    wide: '1.25in',
  };
  p += `\\usepackage[${marginMap[options.marginSize]}]{geometry}\n\n`;

  // ---- Line Spacing ----
  if (options.lineSpacing === 'onehalf') {
    p += `\\usepackage{setspace}\n`;
    p += `\\onehalfspacing\n\n`;
  } else if (options.lineSpacing === 'double') {
    p += `\\usepackage{setspace}\n`;
    p += `\\doublespacing\n\n`;
  }

  // ---- Graphics ----
  p += `\\usepackage{graphicx}\n`;
  p += `\\graphicspath{{images/}}\n\n`;

  // ---- Math ----
  p += `\\usepackage{amsmath}\n`;
  p += `\\usepackage{amssymb}\n`;
  p += `\\usepackage{amsthm}\n\n`;

  // ---- Tables ----
  p += `\\usepackage{booktabs}\n`;
  p += `\\usepackage{array}\n`;
  p += `\\usepackage{multirow}\n`;
  p += `\\usepackage{longtable}\n\n`;

  // ---- Captions & Counters ----
  p += `\\usepackage[font=small, labelfont=bf]{caption}\n`;
  if (options.figureNumbering === 'per-chapter' || options.tableNumbering === 'per-chapter') {
    p += `\\usepackage{chngcntr}\n`;
  }
  if (options.figureNumbering === 'per-chapter') {
    p += `\\counterwithin{figure}{chapter}\n`;
  }
  if (options.tableNumbering === 'per-chapter') {
    p += `\\counterwithin{table}{chapter}\n`;
  }
  p += '\n';

  // ---- Code Listings ----
  if (options.includeListings) {
    p += `\\usepackage{listings}\n`;
    p += `\\lstset{\n`;
    p += `  basicstyle=\\ttfamily\\small,\n`;
    p += `  breaklines=true,\n`;
    p += `  frame=single,\n`;
    p += `  numbers=left,\n`;
    p += `  numberstyle=\\tiny\\color{gray},\n`;
    p += `  keywordstyle=\\color{blue},\n`;
    p += `  commentstyle=\\color{green!50!black},\n`;
    p += `  stringstyle=\\color{red},\n`;
    p += `  tabsize=2,\n`;
    p += `  showstringspaces=false,\n`;
    p += `}\n\n`;
  }

  // ---- Bibliography: natbib (BEFORE hyperref) ----
  p += `\\usepackage[round]{natbib}\n\n`;

  // ---- Microtype ----
  p += `\\usepackage{microtype}\n\n`;

  // ---- hyperref: ALWAYS LAST ----
  p += `\\usepackage[hidelinks]{hyperref}\n`;
  p += `\\hypersetup{\n`;
  p += `  pdftitle    = {${esc(data.metadata.title)}},\n`;
  p += `  pdfauthor   = {${esc(data.metadata.author)}},\n`;
  p += `  pdfsubject  = {${esc(data.metadata.subtitle || data.type + ' thesis')}},\n`;
  p += `  pdfkeywords = {${esc(data.keywords.join(', '))}},\n`;
  p += `  colorlinks  = true,\n`;
  p += `  linkcolor   = blue,\n`;
  p += `  citecolor   = blue,\n`;
  p += `  urlcolor    = blue,\n`;
  p += `}\n\n`;

  // ---- ToC depth ----
  p += `\\setcounter{tocdepth}{${options.tocDepth}}\n`;
  p += `\\setcounter{secnumdepth}{${options.tocDepth}}\n\n`;

  // ---- Custom Commands ----
  p += `% ---- Custom Commands ----\n`;
  p += `\\usepackage{xspace}\n`;
  p += `\\newcommand{\\latex}{\\LaTeX\\xspace}\n`;
  p += `\\newcommand{\\tex}{\\TeX\\xspace}\n\n`;

  // ---- Theorem Environments ----
  p += `% ---- Theorem Environments ----\n`;
  p += `\\newtheorem{theorem}{Theorem}[chapter]\n`;
  p += `\\newtheorem{lemma}[theorem]{Lemma}\n`;
  p += `\\newtheorem{proposition}[theorem]{Proposition}\n`;
  p += `\\newtheorem{corollary}[theorem]{Corollary}\n`;
  p += `\\newtheorem{definition}{Definition}[chapter]\n`;
  p += `\\newtheorem{example}{Example}[chapter]\n`;
  p += `\\newtheorem{remark}{Remark}[chapter]\n\n`;

  return p;
}

/**
 * Generate the title page.
 */
function generateTitlePage(data: ThesisData): string {
  const { metadata, type } = data;
  let tex = '';
  tex += `% ============================================================\n`;
  tex += `% Title Page\n`;
  tex += `% ============================================================\n\n`;
  tex += `\\begin{titlepage}\n`;
  tex += `  \\centering\n\n`;

  if (metadata.university) {
    tex += `  {\\scshape\\Large ${esc(metadata.university)}\\par}\n\n`;
  }
  if (metadata.faculty) {
    tex += `  {\\scshape\\large ${esc(metadata.faculty)}\\par}\n\n`;
  }
  if (metadata.department) {
    tex += `  {\\large ${esc(metadata.department)}\\par}\n\n`;
  }
  tex += `  \\vspace{1.5cm}\n\n`;

  const typeLabels: Record<string, string> = {
    bachelor: "Bachelor's Thesis",
    master: "Master's Thesis",
    phd: 'Doctoral Dissertation',
    report: 'Research Report',
  };
  tex += `  {\\Large\\bfseries ${typeLabels[type]}\\par}\n\n`;
  tex += `  \\vspace{1cm}\n\n`;
  tex += `  {\\LARGE\\bfseries ${esc(metadata.title)}\\par}\n\n`;
  if (metadata.subtitle) {
    tex += `  {\\large\\itshape ${esc(metadata.subtitle)}\\par}\n\n`;
  }
  tex += `  \\vspace{2cm}\n\n`;
  tex += `  {\\large Submitted by:\\par}\n`;
  tex += `  \\vspace{0.3cm}\n`;
  tex += `  {\\Large\\bfseries ${esc(metadata.author)}\\par}\n\n`;
  if (metadata.authorId) {
    tex += `  {\\large Student ID: ${esc(metadata.authorId)}\\par}\n\n`;
  }
  tex += `  \\vspace{1.5cm}\n\n`;

  if (metadata.supervisor) {
    tex += `  {\\large Supervisor:\\par}\n`;
    tex += `  {\\large ${esc(metadata.supervisorTitle || 'Prof.')} ${esc(metadata.supervisor)}\\par}\n\n`;
  }
  if (metadata.coSupervisor) {
    tex += `  {\\large Co-Supervisor:\\par}\n`;
    tex += `  {\\large ${esc(metadata.coSupervisorTitle || 'Dr.')} ${esc(metadata.coSupervisor)}\\par}\n\n`;
  }
  tex += `  \\vspace{1.5cm}\n\n`;

  if (metadata.location && metadata.submissionDate) {
    const dateObj = new Date(metadata.submissionDate);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    tex += `  {\\large ${esc(metadata.location)}, ${formattedDate}\\par}\n\n`;
  }
  tex += `\\end{titlepage}\n\n`;
  return tex;
}

/**
 * Generate front matter.
 */
function generateFrontMatter(data: ThesisData): string {
  let tex = '';
  const { metadata, abstract, keywords, options, type } = data;

  tex += `% ============================================================\n`;
  tex += `% Front Matter\n`;
  tex += `% ============================================================\n\n`;
  tex += `\\frontmatter\n\n`;

  // Dedication
  if (options.includeDedication && metadata.dedication) {
    tex += `% ---- Dedication ----\n`;
    tex += `\\begin{dedication}\n`;
    tex += `  \\vspace*{\\fill}\n`;
    tex += `  \\begin{center}\n`;
    tex += `    \\large\\itshape ${esc(metadata.dedication)}\n`;
    tex += `  \\end{center}\n`;
    tex += `  \\vspace*{\\fill}\n`;
    tex += `\\end{dedication}\n\n`;
  }

  // Acknowledgments
  if (options.includeAcknowledgment && metadata.acknowledgment) {
    tex += `% ---- Acknowledgments ----\n`;
    tex += `\\chapter*{Acknowledgments}\n`;
    tex += `\\addcontentsline{toc}{chapter}{Acknowledgments}\n\n`;
    tex += `${contentToLatex(metadata.acknowledgment)}\n\n`;
  }

  // Abstract
  tex += `% ---- Abstract ----\n`;
  const absCmd = type === 'report' ? '\\section*{Abstract}' : '\\chapter*{Abstract}';
  tex += `${absCmd}\n`;
  tex += `\\addcontentsline{toc}{chapter}{Abstract}\n\n`;
  if (abstract) {
    tex += `${contentToLatex(abstract)}\n`;
  }
  if (keywords.length > 0) {
    tex += `\n\\noindent\\textbf{Keywords:} ${keywords.map(esc).join(', ')}\n\n`;
  }

  // Table of Contents
  tex += `% ---- Table of Contents ----\n`;
  tex += `\\tableofcontents\n\n`;

  // List of Figures
  tex += `% ---- List of Figures ----\n`;
  tex += `\\listoffigures\n\n`;

  // List of Tables
  tex += `% ---- List of Tables ----\n`;
  tex += `\\listoftables\n\n`;

  return tex;
}

/**
 * Generate a single chapter.
 */
function generateChapter(chapter: ThesisChapter, type: ThesisType): string {
  const cmd = getChapterCommand(type);
  const secCmd = getSectionCommand(type);
  let tex = '';
  tex += `% ---- ${cmd === '\\chapter' ? 'Chapter' : 'Section'} ${chapter.number}: ${chapter.title} ----\n`;
  tex += `${cmd}{${esc(chapter.title)}}\n\n`;

  if (chapter.content && chapter.content.trim()) {
    tex += `${contentToLatex(chapter.content)}\n`;
  }

  for (const sub of chapter.subSections) {
    tex += `${secCmd}{${esc(sub.title)}}\n\n`;
    if (sub.content && sub.content.trim()) {
      tex += `${contentToLatex(sub.content)}\n`;
    }
  }

  return tex;
}

/**
 * Generate all chapters (main matter).
 */
function generateMainMatter(data: ThesisData): string {
  let tex = '';
  tex += `% ============================================================\n`;
  tex += `% Main Matter\n`;
  tex += `% ============================================================\n\n`;
  tex += `\\mainmatter\n\n`;

  for (const chapter of data.chapters) {
    tex += generateChapter(chapter, data.type);
    tex += '\n';
  }

  return tex;
}

/**
 * Generate BibTeX entry for a reference.
 */
function referenceToBibtex(ref: ThesisReference, index: number): string {
  const key = generateCiteKey(ref, index);
  const typeMap: Record<ReferenceType, string> = {
    article: '@article',
    book: '@book',
    inproceedings: '@inproceedings',
    techreport: '@techreport',
    thesis: '@phdthesis',
    online: '@online',
    misc: '@misc',
  };

  let entry = `${typeMap[ref.type]}{${key},\n`;
  entry += `  author = {${ref.authors}},\n`;
  entry += `  title = {${ref.title}},\n`;

  if (ref.journal) entry += `  journal = {${ref.journal}},\n`;
  if (ref.bookTitle) entry += `  booktitle = {${ref.bookTitle}},\n`;
  if (ref.publisher) entry += `  publisher = {${ref.publisher}},\n`;
  if (ref.school) entry += `  school = {${ref.school}},\n`;
  if (ref.institution) entry += `  institution = {${ref.institution}},\n`;
  entry += `  year = {${ref.year}},\n`;
  if (ref.volume) entry += `  volume = {${ref.volume}},\n`;
  if (ref.number) entry += `  number = {${ref.number}},\n`;
  if (ref.pages) entry += `  pages = {${ref.pages}},\n`;
  if (ref.edition) entry += `  edition = {${ref.edition}},\n`;
  if (ref.address) entry += `  address = {${ref.address}},\n`;
  if (ref.howPublished) entry += `  howpublished = {${ref.howPublished}},\n`;
  if (ref.doi) entry += `  doi = {${ref.doi}},\n`;
  if (ref.url) entry += `  url = {${ref.url}},\n`;
  if (ref.accessed) entry += `  urldate = {${ref.accessed}},\n`;
  if (ref.note) entry += `  note = {${ref.note}},\n`;

  entry += `}\n`;
  return entry;
}

/**
 * Generate bibliography section with natbib.
 */
function generateBibliography(data: ThesisData): string {
  let tex = '';
  tex += `% ============================================================\n`;
  tex += `% Bibliography\n`;
  tex += `% ============================================================\n\n`;
  tex += `\\backmatter\n\n`;

  if (data.references.length === 0) {
    tex += `% No references added yet.\n`;
    tex += `% Add references in Step 5 to populate this section.\n\n`;
    return tex;
  }

  // Use thebibliography for zero-config compilability
  tex += `\\begin{thebibliography}{${data.references.length}}\n\n`;
  tex += `\\bibliographystyle{plainnat}\n\n`;

  data.references.forEach((ref, idx) => {
    let bibEntry = `  \\bibitem{${generateCiteKey(ref, idx)}} `;

    switch (ref.type) {
      case 'book':
        bibEntry += `${esc(ref.authors)}, `;
        bibEntry += `\\textit{${esc(ref.title)}}`;
        if (ref.edition) bibEntry += `, ${esc(ref.edition)} edition`;
        if (ref.publisher) bibEntry += `, ${esc(ref.publisher)}`;
        if (ref.address) bibEntry += `, ${esc(ref.address)}`;
        if (ref.year) bibEntry += `, ${esc(ref.year)}`;
        bibEntry += '.\n';
        break;
      case 'article':
        bibEntry += `${esc(ref.authors)}, `;
        bibEntry += `\\textit{${esc(ref.title)}}, `;
        if (ref.journal) bibEntry += `${esc(ref.journal)}, `;
        if (ref.volume) bibEntry += `vol.~${esc(ref.volume)}, `;
        if (ref.number) bibEntry += `no.~${esc(ref.number)}, `;
        if (ref.pages) bibEntry += `pp.~${esc(ref.pages)}, `;
        if (ref.year) bibEntry += `${esc(ref.year)}`;
        bibEntry += '.\n';
        break;
      case 'inproceedings':
        bibEntry += `${esc(ref.authors)}, `;
        bibEntry += `\\textit{${esc(ref.title)}}, `;
        if (ref.bookTitle) bibEntry += `in \\textit{${esc(ref.bookTitle)}}, `;
        if (ref.pages) bibEntry += `pp.~${esc(ref.pages)}, `;
        if (ref.year) bibEntry += `${esc(ref.year)}`;
        bibEntry += '.\n';
        break;
      case 'online':
        bibEntry += `${esc(ref.authors)}, `;
        bibEntry += `\\textit{${esc(ref.title)}}, `;
        if (ref.url) bibEntry += `\\url{${ref.url}}, `;
        if (ref.accessed) bibEntry += `accessed: ${esc(ref.accessed)}`;
        bibEntry += '.\n';
        break;
      case 'techreport':
        bibEntry += `${esc(ref.authors)}, `;
        bibEntry += `\\textit{${esc(ref.title)}}, `;
        if (ref.publisher) bibEntry += `${esc(ref.publisher)}, `;
        if (ref.year) bibEntry += `${esc(ref.year)}`;
        bibEntry += '.\n';
        break;
      case 'thesis':
        bibEntry += `${esc(ref.authors)}, `;
        bibEntry += `\\textit{${esc(ref.title)}}, `;
        if (ref.school) bibEntry += `${esc(ref.school)}, `;
        if (ref.year) bibEntry += `${esc(ref.year)}`;
        bibEntry += '.\n';
        break;
      default:
        bibEntry += `${esc(ref.authors)}, `;
        bibEntry += `\\textit{${esc(ref.title)}}`;
        if (ref.year) bibEntry += `, ${esc(ref.year)}`;
        bibEntry += '.\n';
    }

    tex += bibEntry + '\n';
  });

  tex += `\\end{thebibliography}\n\n`;

  // Also include BibTeX content as a comment block
  tex += `% ============================================================\n`;
  tex += `% BibTeX Source (for BibTeX workflow)\n`;
  tex += `% To use: uncomment \\bibliography{references} and remove thebibliography above\n`;
  tex += `% ============================================================\n\n`;
  for (let i = 0; i < data.references.length; i++) {
    tex += referenceToBibtex(data.references[i], i) + '\n';
  }

  return tex;
}

/**
 * Generate appendices.
 */
function generateAppendices(data: ThesisData): string {
  if (data.appendices.length === 0) return '';

  let tex = '';
  tex += `% ============================================================\n`;
  tex += `% Appendices\n`;
  tex += `% ============================================================\n\n`;
  tex += `\\appendix\n\n`;

  for (const appendix of data.appendices) {
    tex += `\\chapter{${esc(appendix.title)}}\n\n`;
    if (appendix.content && appendix.content.trim()) {
      tex += `${contentToLatex(appendix.content)}\n`;
    }
  }

  return tex;
}

// ============================================================
// Public API
// ============================================================

/**
 * Generate complete LaTeX document from ThesisData.
 * Output is compilable on Overleaf without modifications.
 */
export function generateLatex(data: ThesisData): string {
  let latex = '';

  // Header comment
  latex += `% ============================================================\n`;
  latex += `% ${data.metadata.title || 'Untitled Thesis'}\n`;
  latex += `% Generated by ThesisForge\n`;
  latex += `% Date: ${new Date().toISOString().split('T')[0]}\n`;
  latex += `% Template: ${data.type}\n`;
  latex += `% ============================================================\n\n`;

  // Preamble
  latex += generatePreamble(data);

  // Begin document
  latex += `% ============================================================\n`;
  latex += `% Document Body\n`;
  latex += `% ============================================================\n\n`;
  latex += `\\begin{document}\n\n`;

  // Title page
  latex += generateTitlePage(data);

  // Front matter
  latex += generateFrontMatter(data);

  // Main matter (chapters)
  latex += generateMainMatter(data);

  // Appendices
  latex += generateAppendices(data);

  // Bibliography
  latex += generateBibliography(data);

  // End document
  latex += `\\end{document}\n`;

  return latex;
}

/**
 * Generate just the BibTeX file content.
 */
export function generateBibtexFile(data: ThesisData): string {
  let content = `% Bibliography for: ${data.metadata.title}\n`;
  content += `% Generated by ThesisForge\n`;
  content += `% Date: ${new Date().toISOString().split('T')[0]}\n\n`;

  data.references.forEach((ref, idx) => {
    content += referenceToBibtex(ref, idx);
  });

  return content;
}
