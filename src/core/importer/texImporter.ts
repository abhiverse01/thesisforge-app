// ============================================================
// ThesisForge Import — LaTeX Source Parser
// Parses .tex files to extract metadata, chapters, and references.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';

export async function importTeX(file: File): Promise<ImportResult> {
  const text = await file.text();
  return parseTeXSource(text, file.name);
}

export function parseTeXSource(tex: string, fileName: string): ImportResult {
  const metadata   = extractTeXMetadata(tex);
  const chapters   = extractTeXChapters(tex);
  const references = extractTeXBibliography(tex);

  const detectedTemplate = detectTemplate(metadata, chapters);
  const confidence       = scoreConfidence({ metadata, chapters, references });

  return {
    source:   'tex',
    fileName,
    metadata,
    chapters,
    references,
    detectedTemplate,
    confidence,
    warnings:    generateTeXWarnings(tex),
    parseErrors: [],
  };
}

// ---- Balanced-brace helper ----

/**
 * Extract content within balanced braces starting right after an opening '{'.
 * Returns the string between (and excluding) the outermost braces.
 * Advances `fromIdx` past the closing brace.
 */
function extractBalancedBraces(text: string, fromIdx: number): { content: string; endIdx: number } {
  let depth = 0;
  let i = fromIdx;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: text.slice(fromIdx, i), endIdx: i + 1 };
      }
    }
  }
  return { content: text.slice(fromIdx), endIdx: text.length };
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
  const absRe = /\\begin\s*\{abstract\}/;
  const absMatch = absRe.exec(clean);
  if (absMatch) {
    const afterAbs = clean.slice(absMatch.index + absMatch[0].length);
    const endRe = /\\end\s*\{abstract\}/;
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

  // BibTeX entries (@article{...}) — use balanced-brace matching for nested braces
  const bibStartRe = /@(\w+)\s*\{/g;
  let bibMatch;
  while ((bibMatch = bibStartRe.exec(clean)) !== null) {
    const type = bibMatch[1].toLowerCase();
    const { content: entryBody, endIdx } = extractBalancedBraces(clean, bibMatch.index + bibMatch[0].length);
    // First token before comma is the citation key
    const commaIdx = entryBody.indexOf(',');
    if (commaIdx === -1) continue;
    const fieldStr = entryBody.slice(commaIdx + 1);
    const fields = parseBibFields(fieldStr);
    refs.push({ type, ...fields, raw: clean.slice(bibMatch.index, endIdx) });
  }

  if (refs.length > 0) return refs;

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

function parseBibFields(fieldStr: string): Record<string, string> {
  const fields: Record<string, string> = {};
  // Use balanced-brace matching for field values
  const FIELD_RE = /(\w+)\s*=\s*\{/g;
  let m;
  while ((m = FIELD_RE.exec(fieldStr)) !== null) {
    const key = m[1].toLowerCase();
    const startIdx = m.index + m[0].length;
    const { content } = extractBalancedBraces(fieldStr, startIdx);
    fields[key] = content.trim();
  }
  return fields;
}

function guessReferenceFields(line: string): Partial<ExtractedReference> {
  const yearMatch   = line.match(/\b(20\d{2}|19\d{2})\b/);
  const authorMatch = line.match(/^([A-Z][a-z]+,?\s+[A-Z]\.(?:\s+[A-Z][a-z]+,?)*)/);
  const titleMatch  = line.match(/"([^"]{10,100})"|'([^']{10,100})'/);

  return {
    year:   yearMatch?.[1],
    author: authorMatch?.[1],
    title:  titleMatch?.[1] || titleMatch?.[2],
  };
}

function convertTeXBodyToPlain(tex: string): string {
  return tex
    .replace(/\\label\{[^}]+\}/g, '')
    .replace(/\\(?:cref|ref|pageref|vref)\{([^}]+)\}/g, '$1')
    .replace(/\\cite[a-z]*\{([^}]+)\}/g, '[$1]')
    .replace(/\\(?:textbf|textit|emph|textsc|texttt|underline)\{([^}]+)\}/g, '$1')
    .replace(/\\(?:footnote)\{[^}]+\}/g, '')
    .replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, '[figure]')
    .replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, '[table]')
    .replace(/\\(?:newpage|clearpage|cleardoublepage)/g, '\n\n')
    .replace(/\\(?:vspace|hspace)\*?\{[^}]+\}/g, '')
    .replace(/\\noindent\s*/g, '')
    .replace(/\\par\b/g, '\n\n')
    .replace(/\n{4,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function stripTeX(s: string): string {
  return s
    .replace(/\\[a-zA-Z]+\*?\{([^}]*)\}/g, '$1')
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
