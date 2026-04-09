// ============================================================
// LaTeX Template Engine — Generates clean, compilable LaTeX
// ============================================================

import type { ThesisData, ThesisChapter, ThesisReference, ThesisAppendix, ReferenceType } from './thesis-types';

/**
 * Escape special LaTeX characters in user input
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Convert plain text content to LaTeX paragraphs
 */
function contentToLatex(content: string): string {
  if (!content || !content.trim()) return '';
  // Split by double newlines for paragraph separation
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length === 0) return '';

  return paragraphs
    .map((p) => {
      const escaped = escapeLatex(p.trim());
      // Handle single newlines within a paragraph as line breaks
      return escaped.replace(/\n/g, ' \\\\\n');
    })
    .map((p) => `${p}\n\n`)
    .join('');
}

/**
 * Generate BibTeX key from reference
 */
function generateBibtexKey(ref: ThesisReference, index: number): string {
  const authorPart = ref.authors
    ? ref.authors
        .split(',')[0]
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, '')
    : 'unknown';
  const yearPart = ref.year || '0000';
  return `${authorPart}${yearPart}${index}`;
}

/**
 * Generate a BibTeX entry for a reference
 */
function referenceToBibtex(ref: ThesisReference, index: number): string {
  const key = generateBibtexKey(ref, index);
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
  entry += `  year = {${ref.year}},\n`;
  if (ref.volume) entry += `  volume = {${ref.volume}},\n`;
  if (ref.number) entry += `  number = {${ref.number}},\n`;
  if (ref.pages) entry += `  pages = {${ref.pages}},\n`;
  if (ref.edition) entry += `  edition = {${ref.edition}},\n`;
  if (ref.address) entry += `  address = {${ref.address}},\n`;
  if (ref.school) entry += `  school = {${ref.school}},\n`;
  if (ref.howPublished) entry += `  howpublished = {${ref.howPublished}},\n`;
  if (ref.doi) entry += `  doi = {${ref.doi}},\n`;
  if (ref.url) entry += `  url = {${ref.url}},\n`;
  if (ref.note) entry += `  note = {${ref.note}},\n`;
  if (ref.accessed) entry += `  accessed = {${ref.accessed}},\n`;

  entry += `}\n`;
  return entry;
}

/**
 * Generate the document class and preamble
 */
function generatePreamble(data: ThesisData): string {
  const { type, options } = data;
  const thesisClassMap: Record<string, string> = {
    bachelor: 'report',
    master: 'report',
    phd: 'report',
    report: 'report',
  };

  let preamble = '';
  preamble += `\\documentclass[${options.fontSize},${options.paperSize}]{${thesisClassMap[type]}}\n\n`;

  // ---- Encoding & Fonts ----
  preamble += `\\usepackage[utf8]{inputenc}\n`;
  preamble += `\\usepackage[T1]{fontenc}\n`;
  preamble += `\\usepackage{lmodern}\n\n`;

  // ---- Language ----
  preamble += `\\usepackage[english]{babel}\n\n`;

  // ---- Page Geometry ----
  const marginMap = {
    normal: '1in',
    narrow: '0.75in',
    wide: '1.25in',
  };
  preamble += `\\usepackage[${marginMap[options.marginSize]}]{geometry}\n\n`;

  // ---- Line Spacing ----
  if (options.lineSpacing === 'onehalf') {
    preamble += `\\usepackage{setspace}\n`;
    preamble += `\\onehalfspacing\n\n`;
  } else if (options.lineSpacing === 'double') {
    preamble += `\\usepackage{setspace}\n`;
    preamble += `\\doublespacing\n\n`;
  }

  // ---- Graphics ----
  preamble += `\\usepackage{graphicx}\n`;
  preamble += `\\graphicspath{{images/}}\n\n`;

  // ---- Math ----
  preamble += `\\usepackage{amsmath}\n`;
  preamble += `\\usepackage{amssymb}\n`;
  preamble += `\\usepackage{amsthm}\n\n`;

  // ---- Tables ----
  preamble += `\\usepackage{booktabs}\n`;
  preamble += `\\usepackage{array}\n`;
  preamble += `\\usepackage{multirow}\n`;
  preamble += `\\usepackage{longtable}\n\n`;

  // ---- Captions ----
  preamble += `\\usepackage[font=small, labelfont=bf]{caption}\n`;
  if (options.figureNumbering === 'per-chapter' || options.tableNumbering === 'per-chapter') {
    preamble += `\\usepackage{chngcntr}\n`;
  }
  if (options.figureNumbering === 'per-chapter') {
    preamble += `\\counterwithin{figure}{chapter}\n`;
  }
  if (options.tableNumbering === 'per-chapter') {
    preamble += `\\counterwithin{table}{chapter}\n`;
  }
  preamble += '\n';

  // ---- Code Listings ----
  if (options.includeListings) {
    preamble += `\\usepackage{listings}\n`;
    preamble += `\\lstset{\n`;
    preamble += `  basicstyle=\\ttfamily\\small,\n`;
    preamble += `  breaklines=true,\n`;
    preamble += `  frame=single,\n`;
    preamble += `  numbers=left,\n`;
    preamble += `  numberstyle=\\tiny\\color{gray},\n`;
    preamble += `  keywordstyle=\\color{blue},\n`;
    preamble += `  commentstyle=\\color{green!50!black},\n`;
    preamble += `  stringstyle=\\color{red},\n`;
    preamble += `  tabsize=2,\n`;
    preamble += `  showstringspaces=false,\n`;
    preamble += `}\n\n`;
  }

  // ---- Hyperlinks ----
  preamble += `\\usepackage[hidelinks]{hyperref}\n`;
  preamble += `\\hypersetup{\n`;
  preamble += `  colorlinks=false,\n`;
  preamble += `  linkcolor=black,\n`;
  preamble += `  citecolor=black,\n`;
  preamble += `  urlcolor=black,\n`;
  preamble += `  pdftitle={${escapeLatex(data.metadata.title)}},\n`;
  preamble += `  pdfauthor={${escapeLatex(data.metadata.author)}},\n`;
  preamble += `}\n\n`;

  // ---- ToC depth ----
  preamble += `\\setcounter{tocdepth}{${options.tocDepth}}\n`;
  preamble += `\\setcounter{secnumdepth}{${options.tocDepth}}\n\n`;

  // ---- Custom Commands ----
  preamble += `% ---- Custom Commands ----\n`;
  preamble += `\\newcommand{\\latex}{\\LaTeX\\xspace}\n`;
  preamble += `\\newcommand{\\tex}{\\TeX\\xspace}\n`;
  preamble += `\\usepackage{xspace}\n\n`;

  // ---- Theorem Environments ----
  preamble += `% ---- Theorem Environments ----\n`;
  preamble += `\\newtheorem{theorem}{Theorem}[chapter]\n`;
  preamble += `\\newtheorem{lemma}[theorem]{Lemma}\n`;
  preamble += `\\newtheorem{proposition}[theorem]{Proposition}\n`;
  preamble += `\\newtheorem{corollary}[theorem]{Corollary}\n`;
  preamble += `\\newtheorem{definition}{Definition}[chapter]\n`;
  preamble += `\\newtheorem{example}{Example}[chapter]\n`;
  preamble += `\\newtheorem{remark}{Remark}[chapter]\n\n`;

  return preamble;
}

/**
 * Generate the title page
 */
function generateTitlePage(data: ThesisData): string {
  const { metadata, type } = data;

  let tex = `% ============================================================\n`;
  tex += `% Title Page\n`;
  tex += `% ============================================================\n\n`;

  tex += `\\begin{titlepage}\n`;
  tex += `  \\centering\n\n`;

  // University name
  if (metadata.university) {
    tex += `  {\\scshape\\Large ${escapeLatex(metadata.university)}\\par}\n\n`;
  }

  // Faculty
  if (metadata.faculty) {
    tex += `  {\\scshape\\large ${escapeLatex(metadata.faculty)}\\par}\n\n`;
  }

  // Department
  if (metadata.department) {
    tex += `  {\\large ${escapeLatex(metadata.department)}\\par}\n\n`;
  }

  tex += `  \\vspace{1.5cm}\n\n`;

  // Thesis type label
  const typeLabels: Record<string, string> = {
    bachelor: "Bachelor's Thesis",
    master: "Master's Thesis",
    phd: 'Doctoral Dissertation',
    report: 'Research Report',
  };
  tex += `  {\\Large\\bfseries ${typeLabels[type]}\\par}\n\n`;

  tex += `  \\vspace{1cm}\n\n`;

  // Title
  tex += `  {\\LARGE\\bfseries ${escapeLatex(metadata.title)}\\par}\n\n`;
  if (metadata.subtitle) {
    tex += `  {\\large\\itshape ${escapeLatex(metadata.subtitle)}\\par}\n\n`;
  }

  tex += `  \\vspace{2cm}\n\n`;

  // Author
  tex += `  {\\large Submitted by:\\par}\n`;
  tex += `  \\vspace{0.3cm}\n`;
  tex += `  {\\Large\\bfseries ${escapeLatex(metadata.author)}\\par}\n\n`;

  if (metadata.authorId) {
    tex += `  {\\large Student ID: ${escapeLatex(metadata.authorId)}\\par}\n\n`;
  }

  tex += `  \\vspace{1.5cm}\n\n`;

  // Supervisor
  if (metadata.supervisor) {
    tex += `  {\\large Supervisor:\\par}\n`;
    tex += `  {\\large ${escapeLatex(metadata.supervisorTitle)} ${escapeLatex(metadata.supervisor)}\\par}\n\n`;
  }

  // Co-supervisor
  if (metadata.coSupervisor) {
    tex += `  {\\large Co-Supervisor:\\par}\n`;
    tex += `  {\\large ${escapeLatex(metadata.coSupervisorTitle)} ${escapeLatex(metadata.coSupervisor)}\\par}\n\n`;
  }

  tex += `  \\vspace{1.5cm}\n\n`;

  // Date and location
  if (metadata.location && metadata.submissionDate) {
    const dateObj = new Date(metadata.submissionDate);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    tex += `  {\\large ${escapeLatex(metadata.location)}, ${formattedDate}\\par}\n\n`;
  }

  tex += `\\end{titlepage}\n\n`;

  return tex;
}

/**
 * Generate front matter (dedication, abstract, acknowledgment, TOC, LOT, LOF)
 */
function generateFrontMatter(data: ThesisData): string {
  let tex = '';
  const { metadata, abstract, keywords, options } = data;

  // Front matter starts
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
    tex += `    \\large\\itshape ${escapeLatex(metadata.dedication)}\n`;
    tex += `  \\end{center}\n`;
    tex += `  \\vspace*{\\fill}\n`;
    tex += `\\end{dedication}\n\n`;
  }

  // Acknowledgments
  if (options.includeAcknowledgment && metadata.acknowledgment) {
    tex += `% ---- Acknowledgments ----\n`;
    tex += `\\chapter*{Acknowledgments}\n`;
    tex += `\\addcontentsline{toc}{chapter}{Acknowledgments}\n\n`;
    tex += `${contentToLatex(metadata.acknowledgment)}\n`;
  }

  // Abstract
  tex += `% ---- Abstract ----\n`;
  tex += `\\chapter*{Abstract}\n`;
  tex += `\\addcontentsline{toc}{chapter}{Abstract}\n\n`;
  if (abstract) {
    tex += `${contentToLatex(abstract)}\n`;
  }

  // Keywords
  if (keywords.length > 0) {
    tex += `\\noindent\\textbf{Keywords:} ${keywords.map(escapeLatex).join(', ')}\n\n`;
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
 * Generate a single chapter
 */
function generateChapter(chapter: ThesisChapter): string {
  let tex = '';
  tex += `% ---- Chapter ${chapter.number}: ${chapter.title} ----\n`;
  tex += `\\chapter{${escapeLatex(chapter.title)}}\n\n`;

  // Chapter content (if any)
  if (chapter.content && chapter.content.trim()) {
    tex += `${contentToLatex(chapter.content)}\n`;
  }

  // Subsections
  for (const sub of chapter.subSections) {
    tex += `\\section{${escapeLatex(sub.title)}}\n\n`;
    if (sub.content && sub.content.trim()) {
      tex += `${contentToLatex(sub.content)}\n`;
    }
  }

  return tex;
}

/**
 * Generate all chapters (main matter)
 */
function generateMainMatter(data: ThesisData): string {
  let tex = '';
  tex += `% ============================================================\n`;
  tex += `% Main Matter\n`;
  tex += `% ============================================================\n\n`;
  tex += `\\mainmatter\n\n`;

  for (const chapter of data.chapters) {
    tex += generateChapter(chapter);
    tex += '\n';
  }

  return tex;
}

/**
 * Generate bibliography section
 */
function generateBibliography(data: ThesisData): string {
  let tex = '';
  tex += `% ============================================================\n`;
  tex += `% Bibliography\n`;
  tex += `% ============================================================\n\n`;

  tex += `\\backmatter\n\n`;

  if (data.references.length === 0) {
    tex += `% No references added yet. Add references to this section.\n`;
    tex += `% \\begin{thebibliography}{99}\n`;
    tex += `%   \\bibitem{ref1} Author Name, \\textit{Title}, Publisher, Year.\n`;
    tex += `% \\end{thebibliography}\n\n`;
    return tex;
  }

  // Option 1: Use thebibliography (no external .bib file needed)
  tex += `\\begin{thebibliography}{${data.references.length}}\n\n`;

  data.references.forEach((ref, idx) => {
    let bibEntry = '';
    bibEntry += `  \\bibitem{${generateBibtexKey(ref, idx)}} `;

    if (ref.type === 'book') {
      bibEntry += `${escapeLatex(ref.authors)}, `;
      bibEntry += `\\textit{${escapeLatex(ref.title)}}`;
      if (ref.edition) bibEntry += `, ${escapeLatex(ref.edition)} edition`;
      if (ref.publisher) bibEntry += `, ${escapeLatex(ref.publisher)}`;
      if (ref.address) bibEntry += `, ${escapeLatex(ref.address)}`;
      if (ref.year) bibEntry += `, ${escapeLatex(ref.year)}`;
      bibEntry += '.\n';
    } else if (ref.type === 'article') {
      bibEntry += `${escapeLatex(ref.authors)}, `;
      bibEntry += `\\textit{${escapeLatex(ref.title)}}, `;
      if (ref.journal) bibEntry += `${escapeLatex(ref.journal)}, `;
      if (ref.volume) bibEntry += `vol.~${escapeLatex(ref.volume)}, `;
      if (ref.number) bibEntry += `no.~${escapeLatex(ref.number)}, `;
      if (ref.pages) bibEntry += `pp.~${escapeLatex(ref.pages)}, `;
      if (ref.year) bibEntry += `${escapeLatex(ref.year)}`;
      bibEntry += '.\n';
    } else if (ref.type === 'inproceedings') {
      bibEntry += `${escapeLatex(ref.authors)}, `;
      bibEntry += `\\textit{${escapeLatex(ref.title)}}, `;
      if (ref.bookTitle) bibEntry += `in \\textit{${escapeLatex(ref.bookTitle)}}, `;
      if (ref.year) bibEntry += `${escapeLatex(ref.year)}`;
      bibEntry += '.\n';
    } else if (ref.type === 'online') {
      bibEntry += `${escapeLatex(ref.authors)}, `;
      bibEntry += `\\textit{${escapeLatex(ref.title)}}, `;
      if (ref.url) bibEntry += `\\url{${escapeLatex(ref.url)}}, `;
      if (ref.accessed) bibEntry += `accessed: ${escapeLatex(ref.accessed)}`;
      bibEntry += '.\n';
    } else if (ref.type === 'techreport') {
      bibEntry += `${escapeLatex(ref.authors)}, `;
      bibEntry += `\\textit{${escapeLatex(ref.title)}}, `;
      if (ref.publisher) bibEntry += `${escapeLatex(ref.publisher)}, `;
      if (ref.year) bibEntry += `${escapeLatex(ref.year)}`;
      bibEntry += '.\n';
    } else {
      bibEntry += `${escapeLatex(ref.authors)}, `;
      bibEntry += `\\textit{${escapeLatex(ref.title)}}`;
      if (ref.publisher) bibEntry += `, ${escapeLatex(ref.publisher)}`;
      if (ref.year) bibEntry += `, ${escapeLatex(ref.year)}`;
      bibEntry += '.\n';
    }

    tex += bibEntry + '\n';
  });

  tex += `\\end{thebibliography}\n\n`;

  // Also generate BibTeX file content as a comment
  tex += `% ============================================================\n`;
  tex += `% BibTeX File (save as references.bib and use \\bibliography{references})\n`;
  tex += `% ============================================================\n\n`;
  tex += `% \\bibliographystyle{${data.options.citationStyle}}\n`;
  tex += `% \\bibliography{references}\n\n`;

  tex += `% === Content for references.bib ===\n`;
  for (let i = 0; i < data.references.length; i++) {
    tex += referenceToBibtex(data.references[i], i) + '\n';
  }

  return tex;
}

/**
 * Generate appendices
 */
function generateAppendices(data: ThesisData): string {
  if (data.appendices.length === 0) return '';

  let tex = '';
  tex += `% ============================================================\n`;
  tex += `% Appendices\n`;
  tex += `% ============================================================\n\n`;
  tex += `\\appendix\n\n`;

  for (const appendix of data.appendices) {
    tex += `\\chapter{${escapeLatex(appendix.title)}}\n\n`;
    if (appendix.content && appendix.content.trim()) {
      tex += `${contentToLatex(appendix.content)}\n`;
    }
  }

  return tex;
}

/**
 * Generate complete LaTeX document from ThesisData
 */
export function generateLatex(data: ThesisData): string {
  let latex = '';

  // Header comment
  latex += `% ============================================================\n`;
  latex += `% ${data.metadata.title || 'Untitled Thesis'}\n`;
  latex += `% Generated by Instant Thesis Creator\n`;
  latex += `% Date: ${new Date().toISOString().split('T')[0]}\n`;
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
 * Generate just the BibTeX file content
 */
export function generateBibtexFile(data: ThesisData): string {
  let content = `% Bibliography file for: ${data.metadata.title}\n`;
  content += `% Generated by Instant Thesis Creator\n`;
  content += `% Date: ${new Date().toISOString().split('T')[0]}\n\n`;

  data.references.forEach((ref, idx) => {
    content += referenceToBibtex(ref, idx);
  });

  return content;
}
