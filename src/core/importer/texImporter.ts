// ============================================================
// ThesisForge Import — LaTeX Source Parser
// Parses .tex files to extract metadata, chapters, and references.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference, ExtractedCommand } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';
import { parseBibTeX } from './bibtexParser';
import { extractTitleSmart, extractAuthorsSmart, extractAbstractSmart, extractKeywordsSmart } from './contentIntelligence';

export async function importTeX(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    return parseTeXSource(text, file.name);
  } catch (err: any) {
    throw new Error(`[texImporter] Failed to read TeX file "${file.name}": ${err?.message ?? err}`);
  }
}

export function parseTeXSource(tex: string, fileName: string): ImportResult {
  try {
    const metadata   = extractTeXMetadata(tex);

    // GODMODE: Use contentIntelligence as fallback for any missing TeX metadata
    const fullTex = tex.replace(/%[^\n]*/g, '');
    if (!metadata.title) {
      const smartTitle = extractTitleSmart(fullTex);
      if (smartTitle) metadata.title = smartTitle;
    }
    if (!metadata.author) {
      const smartAuthors = extractAuthorsSmart(fullTex);
      if (smartAuthors.length > 0) metadata.author = smartAuthors[0];
    }
    if (!metadata.abstract) {
      const smartAbstract = extractAbstractSmart(fullTex);
      if (smartAbstract) metadata.abstract = smartAbstract;
    }
    if ((!metadata.keywords || metadata.keywords.length === 0)) {
      const smartKw = extractKeywordsSmart(fullTex, metadata);
      if (smartKw.length > 0) metadata.keywords = smartKw;
    }

    const newcommands = extractNewCommands(tex);
    const chapters    = extractTeXChapters(tex);
    const references  = extractTeXBibliography(tex);

    const detectedTemplate = detectTemplate(metadata, chapters);
    const confidence       = scoreConfidence({ metadata, chapters, references });

    return {
      source:      'tex',
      fileName,
      metadata,
      chapters,
      references,
      newcommands,
      detectedTemplate,
      confidence,
      warnings:    generateTeXWarnings(tex),
      parseErrors: [],
    };
  } catch (err: any) {
    throw new Error(`[texImporter] Failed to parse TeX source in "${fileName}": ${err?.message ?? err}`);
  }
}

// ---- Balanced-brace helper ----

/**
 * Extract content within balanced braces starting right after an opening '{'.
 * Returns the string between (and excluding) the outermost braces.
 * Advances `fromIdx` past the closing brace.
 *
 * Issue #1: MAX_DEPTH (50) and MAX_SCAN (10000) guards prevent infinite scanning.
 * Issue #2: Pre-skips to the first '{' if fromIdx is not already positioned after one.
 */
function extractBalancedBraces(text: string, fromIdx: number): { content: string; endIdx: number } {
  const MAX_DEPTH = 50;
  const MAX_SCAN = 10000;

  // FIX #9: Guard against out-of-bounds access when fromIdx === 0
  if (fromIdx < 0) fromIdx = 0;
  if (fromIdx >= text.length) return { content: '', endIdx: text.length };

  let contentStart: number;
  let i: number;
  let depth: number;

  // If fromIdx is right after an opening '{', start depth at 1.
  // Otherwise, skip forward to find the first '{'.
  if (fromIdx > 0 && text[fromIdx - 1] === '{') {
    contentStart = fromIdx;
    i = fromIdx;
    depth = 1;
  } else {
    const openBraceIdx = text.indexOf('{', fromIdx);
    if (openBraceIdx === -1) {
      return { content: '', endIdx: text.length };
    }
    contentStart = openBraceIdx + 1;
    i = openBraceIdx + 1;
    depth = 1;
  }

  const limit = Math.min(text.length, contentStart + MAX_SCAN);

  for (; i < limit; i++) {
    if (text[i] === '{') {
      depth++;
      if (depth > MAX_DEPTH) {
        return { content: text.slice(contentStart, i), endIdx: i };
      }
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: text.slice(contentStart, i), endIdx: i + 1 };
      }
    }
  }
  return { content: text.slice(contentStart, limit), endIdx: limit };
}

// ---- \newcommand / \renewcommand extraction ----

/**
 * Extract all \newcommand, \newcommand*, \renewcommand, \renewcommand* definitions
 * from a TeX source string.
 *
 * Handles:
 * - `\newcommand{\cmd}{def}`            — zero-arg command
 * - `\newcommand{\cmd}[2]{def with #1 and #2}` — multi-arg command
 * - `\newcommand*{\cmd}{def}`           — starred form
 * - `\renewcommand{...}`               — same patterns with \renewcommand
 * - Nested braces in the definition via extractBalancedBraces
 *
 * Skips commented lines (lines starting with %).
 */
export function extractNewCommands(tex: string): ExtractedCommand[] {
  const commands: ExtractedCommand[] = [];

  // Remove comment lines but preserve newlines so regex positions stay meaningful
  const clean = tex.replace(/%[^\n]*/g, '');

  // Regex matches: \newcommand or \renewcommand, optional *, then {\cmd}
  const RE = /\\(re)?newcommand\*?\s*\{/g;
  let match;

  while ((match = RE.exec(clean)) !== null) {
    const fullMatchStart = match.index;
    const isRenew = !!match[1];               // true if \renewcommand
    const isStarred = match[0].includes('*');
    const variant: ExtractedCommand['variant'] = isRenew ? 'renewcommand' : 'newcommand';

    let pos = fullMatchStart + match[0].length;

    // 1) Extract the command name from {\cmd}
    const { content: cmdName, endIdx: afterName } = extractBalancedBraces(clean, pos);
    pos = afterName;

    // Validate: command name must be \ followed by one or more letters (standard LaTeX)
    if (!cmdName || !/^\\[a-zA-Z]+$/.test(cmdName.trim())) continue;
    const name = cmdName.trim(); // e.g. "\mycmd"

    // 2) Optional argument count: [N]
    let numArgs = 0;
    const optArgMatch = /^\s*\[(\d+)\]/.exec(clean.slice(pos));
    if (optArgMatch) {
      numArgs = parseInt(optArgMatch[1], 10);
      pos += optArgMatch[0].length;
    }

    // 3) Extract the definition body using balanced braces
    // Skip whitespace (including newlines) between ] or name and {
    const defBraceStart = clean.indexOf('{', pos);
    // Allow up to 200 chars of whitespace/newlines between [N] and { for multi-line defs
    if (defBraceStart === -1 || defBraceStart > pos + 200) continue;
    const { content: definition } = extractBalancedBraces(clean, defBraceStart + 1);

    // Skip empty or whitespace-only definitions
    const trimmedDef = definition.trim();
    if (!trimmedDef) continue;

    commands.push({
      name,
      numArgs,
      definition: trimmedDef,
      variant,
      starred: isStarred,
    });
  }

  return commands;
}

function extractTeXMetadata(tex: string) {
  const meta: Record<string, any> = {};

  // Remove comments first
  const clean = tex.replace(/%[^\n]*/g, '');

  // \title{...} — use balanced braces for nested content
  const titleRe = /\\title\s*(?:\[[^\]]*\])?\s*\{/;
  const titleMatch = titleRe.exec(clean);
  if (titleMatch) {
    const { content } = extractBalancedBraces(clean, titleMatch.index + titleMatch[0].length);
    meta.title = stripTeX(content);
  }

  // \author{...}
  const authorRe = /\\author\s*(?:\[[^\]]*\])?\s*\{/;
  const authorMatch = authorRe.exec(clean);
  if (authorMatch) {
    const { content } = extractBalancedBraces(clean, authorMatch.index + authorMatch[0].length);
    meta.author = stripTeX(content).split('\\\\')[0].trim();
  }

  // \date{...}
  const dateRe = /\\date\s*\{/;
  const dateMatch = dateRe.exec(clean);
  if (dateMatch) {
    const { content } = extractBalancedBraces(clean, dateMatch.index + dateMatch[0].length);
    const dateStr = stripTeX(content);
    const yearMatch = dateStr.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) meta.year = yearMatch[1];
  }

  // Custom commands from preamble (\university, \supervisor, etc.)
  const customPairs: Array<[RegExp, string]> = [
    [/\\(?:university|institution|univer|college)\s*\{([^}]+)\}/i, 'institution'],
    [/\\(?:supervisor|adviser|advisor)\s*\{([^}]+)\}/i,            'supervisor'],
    [/\\(?:department|dept)\s*\{([^}]+)\}/i,                       'department'],
    [/\\(?:faculty|school)\s*\{([^}]+)\}/i,                        'faculty'],
    [/\\(?:subtitle|stitle)\s*\{([^}]+)\}/i,                       'subtitle'],
  ];
  for (const [pattern, field] of customPairs) {
    const m = clean.match(pattern);
    if (m) meta[field] = stripTeX(m[1]);
  }

  // GODMODE: Detect \newcommand definitions for metadata
  // Many theses define: \newcommand{\thesistitle}{Deep Learning...}
  // Extract these and map to standard metadata fields.
  // Uses extractNewCommands() for robust balanced-brace parsing.
  const extractedCmds = extractNewCommands(tex);
  const CMD_MAP: Record<string, string> = {
    thesistitle: 'title', mytitle: 'title', thetitle: 'title',
    thesisauthor: 'author', myauthor: 'author', theauthor: 'author',
    theyear: 'year', myyear: 'year',
    theinstitution: 'institution', myuniversity: 'institution',
    mysupervisor: 'supervisor', thesupervisor: 'supervisor',
    mydepartment: 'department', thedepartment: 'department',
    myfaculty: 'faculty', thefaculty: 'faculty',
  };
  for (const cmd of extractedCmds) {
    const bareName = cmd.name.replace(/^\\/, '');
    const field = CMD_MAP[bareName.toLowerCase()];
    // Only use zero-arg commands for metadata mapping
    if (field && !meta[field] && cmd.numArgs === 0) {
      meta[field] = stripTeX(cmd.definition);
    }
  }

  // hypersetup metadata
  const hyperRe = /\\hypersetup\s*\{/;
  const hyperMatch = hyperRe.exec(clean);
  if (hyperMatch) {
    const { content: hyperContent } = extractBalancedBraces(clean, hyperMatch.index + hyperMatch[0].length);
    const hyperFields: Array<[RegExp, string]> = [
      [/pdftitle\s*=\s*\{([^}]+)\}/,    'title'],
      [/pdfauthor\s*=\s*\{([^}]+)\}/,   'author'],
      [/pdfsubject\s*=\s*\{([^}]+)\}/,  'degree'],
      [/pdfkeywords\s*=\s*\{([^}]+)\}/, 'keywords'],
    ];
    for (const [p, field] of hyperFields) {
      const m = hyperContent.match(p);
      if (m && !meta[field]) {
        if (field === 'keywords') {
          meta.keywords = m[1].split(/[,;]/).map((k: string) => k.trim()).filter(Boolean);
        } else {
          meta[field] = stripTeX(m[1]);
        }
      }
    }
  }

  // Abstract environment — use balanced braces
  const absRe = /\\begin\s*\{abstract\*?\}/;
  const absMatch = absRe.exec(clean);
  if (absMatch) {
    const afterAbs = clean.slice(absMatch.index + absMatch[0].length);
    const endRe = /\\end\s*\{abstract\*?\}/;
    const endMatch = endRe.exec(afterAbs);
    if (endMatch) {
      meta.abstract = stripTeX(afterAbs.slice(0, endMatch.index)).trim();
    }
  }

  // Degree detection
  const degreePatterns = [
    { re: /doctor of philosophy|phd thesis|phd dissertation/i, val: 'phd' },
    { re: /master of science|master's thesis|msc thesis/i,     val: 'master' },
    { re: /master of arts|ma thesis/i,                          val: 'master' },
    { re: /bachelor of science|bsc thesis/i,                   val: 'bachelor' },
    { re: /bachelor of engineering|beng/i,                     val: 'bachelor' },
  ];
  for (const { re, val } of degreePatterns) {
    if (re.test(clean)) { meta.degreeAbbrev = val; break; }
  }

  return meta;
}

function extractTeXChapters(tex: string): ExtractedChapter[] {
  const clean    = tex.replace(/%[^\n]*/g, '');
  const chapters: ExtractedChapter[] = [];

  const docStart = clean.indexOf('\\begin{document}');
  const docEnd   = clean.lastIndexOf('\\end{document}');
  if (docStart === -1) return chapters;

  const body = clean.slice(docStart, docEnd > -1 ? docEnd : undefined);

  // Match \chapter{title} or \chapter*{title} — use balanced braces
  const CHAPTER_RE = /\\chapter\*?\s*(?:\[[^\]]*\])?\s*\{/g;
  const positions: Array<{ title: string; index: number }> = [];
  let m;

  while ((m = CHAPTER_RE.exec(body)) !== null) {
    const { content: chapTitle } = extractBalancedBraces(body, m.index + m[0].length);
    const title = stripTeX(chapTitle).trim();
    if (/abstract|acknowledgement|dedication|contents|bibliography/i.test(title)) continue;
    positions.push({ title, index: m.index + m[0].length + chapTitle.length + 1 });
  }

  // Fallback: \section (article class)
  if (positions.length === 0) {
    const SECTION_RE = /\\section\*?\s*(?:\[[^\]]*\])?\s*\{/g;
    while ((m = SECTION_RE.exec(body)) !== null) {
      const { content: secTitle } = extractBalancedBraces(body, m.index + m[0].length);
      const title = stripTeX(secTitle).trim();
      if (/abstract|bibliography|references/i.test(title)) continue;
      positions.push({ title, index: m.index + m[0].length + secTitle.length + 1 });
    }
  }

  // Fallback: numbered sections in plain text ("1. Introduction", "2. Methods")
  if (positions.length === 0) {
    const NUMBERED_SECTION_RE = /^\s*(\d{1,2})\.\s+([A-Z][A-Za-z\s&:–—]{5,60})\s*$/gm;
    while ((m = NUMBERED_SECTION_RE.exec(body)) !== null) {
      const title = m[2].trim();
      if (/abstract|bibliography|references/i.test(title)) continue;
      positions.push({ title, index: m.index + m[0].length });
    }
  }

  // Extract content between markers
  for (let i = 0; i < positions.length; i++) {
    const start    = positions[i].index;
    const end      = i + 1 < positions.length ? positions[i + 1].index : body.length;
    const rawBody  = body.slice(start, end);
    const cleaned  = convertTeXBodyToPlain(rawBody);

    if (cleaned.split(' ').length < 10) continue;

    chapters.push({
      title:       positions[i].title,
      body:        cleaned,
      order:       i,
      level:       tex.includes('\\chapter') ? 'chapter' : 'section',
      subsections: extractTeXSubsections(rawBody),
    });
  }

  return chapters;
}

function extractTeXSubsections(body: string): Array<{ title: string; body: string }> {
  const SUB_RE = /\\subsection\*?\s*(?:\[[^\]]*\])?\s*\{/g;
  const positions: Array<{ title: string; index: number }> = [];
  let m;

  while ((m = SUB_RE.exec(body)) !== null) {
    const { content: subTitle } = extractBalancedBraces(body, m.index + m[0].length);
    positions.push({ title: stripTeX(subTitle), index: m.index + m[0].length + subTitle.length + 1 });
  }

  return positions.slice(0, 8).map((pos, i) => {
    const start = pos.index;
    const end   = i + 1 < positions.length ? positions[i + 1].index : body.length;
    return {
      title: pos.title,
      body:  convertTeXBodyToPlain(body.slice(start, end)).slice(0, 2000),
    };
  });
}

function extractTeXBibliography(tex: string): ExtractedReference[] {
  const refs: ExtractedReference[] = [];
  const clean = tex.replace(/%[^\n]*/g, '');

  // Issue #5: Delegate to bibtexParser for @article{...} entries.
  // bibtexParser creates fresh regex instances internally to avoid stale lastIndex.
  try {
    const bibRefs = parseBibTeX(clean);
    if (bibRefs.length > 0) return bibRefs;
  } catch {
    // Fall through to thebibliography parsing if BibTeX parsing fails
  }

  // thebibliography entries
  const BIBITEM_RE = /\\bibitem\{([^}]+)\}\s*([\s\S]*?)(?=\\bibitem|\\end\{thebibliography)/g;
  let m;
  while ((m = BIBITEM_RE.exec(clean)) !== null) {
    refs.push({
      type: 'misc',
      raw:  m[2].trim(),
      ...guessReferenceFields(m[2].trim()),
    });
  }

  return refs;
}

/** Exported for use by PDF importer for plain-text reference fallback. */
export function parseReferencesFromText(text: string): ExtractedReference[] {
  const refs: ExtractedReference[] = [];
  const lines = text.split('\n').filter(l => l.trim().length > 20);

  for (const line of lines.slice(0, 60)) {
    const cleaned = line.replace(/^\s*[\[\d\]\.]+\s*/, '').trim();
    if (cleaned.length < 20) continue;
    refs.push({
      type: 'misc',
      raw:  cleaned,
      ...guessReferenceFields(cleaned),
    });
  }

  return refs;
}

function guessReferenceFields(line: string): Partial<ExtractedReference> {
  const yearMatch   = line.match(/\b(20\d{2}|19\d{2})\b/);
  const authorMatch = line.match(/^([A-Z][a-z]+,?\s+[A-Z]\.(?:\s+[A-Z][a-z]+,?)*)/);
  const titleMatch  = line.match(/"([^"]{10,100})"|'([^']{10,100})'/);
  const doiMatch    = line.match(/(?:doi|DOI)[:\s]*(10\.\d{4,}\/[^\s,]+)/);

  return {
    year:   yearMatch?.[1],
    author: authorMatch?.[1],
    title:  titleMatch?.[1] || titleMatch?.[2],
    doi:    doiMatch?.[1],
  };
}

function convertTeXBodyToPlain(tex: string): string {
  return tex
    .replace(/\\label\{[^}]+\}/g, '')
    .replace(/\\includegraphics(?:\[[^\]]*\])?\{[^}]+\}/g, '[image]')
    .replace(/\\caption(?:\[[^\]]*\])?\{([^{}]*)\}/g, '$1')
    .replace(/\\input\{[^}]+\}/g, '')
    .replace(/\\(?:cref|ref|pageref|vref)\{([^}]+)\}/g, '$1')
    .replace(/\\cite[a-z]*\{([^}]+)\}/g, '[$1]')
    .replace(/\\(?:textbf|textit|emph|textsc|texttt|underline)\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\}/g, '$1')
    .replace(/\\(?:footnote)\{[^}]+\}/g, '')
    .replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, '[figure]')
    .replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, '[table]')
    .replace(/\\(?:newpage|clearpage|cleardoublepage)/g, '\n\n')
    .replace(/\\(?:vspace|hspace)\*?\{[^}]+\}/g, '')
    .replace(/\\(?:maketitle|tableofcontents|listoffigures|listoftables|newblock|bibliographystyle|bibliography)\{[^}]*\}/g, '')
    .replace(/\\(?:maketitle|tableofcontents|listoffigures|listoftables|newblock)\b/g, '')
    .replace(/\\noindent\s*/g, '')
    .replace(/\\par\b/g, '\n\n')
    .replace(/\n{4,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Strip TeX commands from a string, returning only the visible text.
 *
 * Issue #4 fix: Replaces the previous greedy regex (which only handled
 * one level of brace nesting) with iterative balanced-brace extraction
 * that correctly handles arbitrarily nested commands like
 * \textbf{bold \textit{italic \emph{deep}}}.
 */
function stripTeX(s: string): string {
  // Match any TeX command followed by '{'
  const CMD_RE = /\\([a-zA-Z]+)\*?\{/g;
  let result = '';
  let lastIdx = 0;
  let m;

  while ((m = CMD_RE.exec(s)) !== null) {
    // Append text before this command
    result += s.slice(lastIdx, m.index);

    // Extract content between balanced braces (fromIdx is right after '{')
    const braceStart = m.index + m[0].length;
    const { content, endIdx } = extractBalancedBraces(s, braceStart);

    // Advance regex lastIndex past the entire \cmd{...} to prevent stale state
    CMD_RE.lastIndex = endIdx;

    // Recursively strip nested TeX commands from the extracted content
    result += stripTeX(content);

    lastIdx = endIdx;
  }

  result += s.slice(lastIdx);

  // Remove remaining standalone commands (without braces) and leftover braces
  return result
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateTeXWarnings(tex: string): string[] {
  const warnings: string[] = [];
  if (!tex.includes('\\begin{document}')) warnings.push('No \\begin{document} found — file may be a partial or preamble-only document');
  if (!tex.includes('\\title')) warnings.push('No \\title{} command found — title was not extracted');
  if ((tex.match(/\\chapter/g) || []).length < 2) warnings.push('Fewer than 2 chapters detected — chapter extraction may be incomplete');
  return warnings;
}
