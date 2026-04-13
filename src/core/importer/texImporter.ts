// ============================================================
// ThesisForge Smart Import — .tex Importer
// Parses LaTeX source files into structured data.
// Pure functions for parsing, no side effects.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';

export async function importTeX(file: File): Promise<ImportResult> {
  const text = await file.text();
  return parseTeXSource(text, file.name);
}

export function parseTeXSource(tex: string, fileName: string): ImportResult {
  const metadata = extractTeXMetadata(tex);
  const chapters = extractTeXChapters(tex);
  const references = extractTeXBibliography(tex);
  const detectedTemplate = detectTemplate(metadata, chapters);
  const confidence = scoreConfidence({ metadata, chapters, references });

  return {
    source: 'tex',
    fileName,
    metadata,
    chapters,
    references,
    detectedTemplate,
    confidence,
    warnings: generateTeXWarnings(tex),
    parseErrors: [],
  };
}

function extractTeXMetadata(tex: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  const clean = tex.replace(/%[^\n]*/g, '');

  const titleMatch = clean.match(/\\title\s*(?:\[[^\]]*\])?\s*\{([\s\S]*?)\}/);
  if (titleMatch) meta.title = stripTeX(titleMatch[1]);

  const authorMatch = clean.match(/\\author\s*(?:\[[^\]]*\])?\s*\{([\s\S]*?)\}/);
  if (authorMatch) meta.author = stripTeX(authorMatch[1]).split('\\\\')[0].trim();

  const dateMatch = clean.match(/\\date\s*\{([\s\S]*?)\}/);
  if (dateMatch) {
    const dateStr = stripTeX(dateMatch[1]);
    const yearMatch = dateStr.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) meta.year = yearMatch[1];
  }

  const customPairs: Array<[RegExp, string]> = [
    [/\\(?:university|institution|univer|college)\s*\{([^}]+)\}/i, 'institution'],
    [/\\(?:supervisor|adviser|advisor)\s*\{([^}]+)\}/i, 'supervisor'],
    [/\\(?:department|dept)\s*\{([^}]+)\}/i, 'department'],
    [/\\(?:faculty|school)\s*\{([^}]+)\}/i, 'faculty'],
    [/\\(?:subtitle|stitle)\s*\{([^}]+)\}/i, 'subtitle'],
  ];
  for (const [pattern, field] of customPairs) {
    const m = clean.match(pattern);
    if (m) meta[field] = stripTeX(m[1]);
  }

  const hyperMatch = clean.match(/\\hypersetup\s*\{([\s\S]*?)\}/);
  if (hyperMatch) {
    const hyperContent = hyperMatch[1];
    const hyperFields: Array<[RegExp, string]> = [
      [/pdftitle\s*=\s*\{([^}]+)\}/, 'title'],
      [/pdfauthor\s*=\s*\{([^}]+)\}/, 'author'],
      [/pdfsubject\s*=\s*\{([^}]+)\}/, 'degree'],
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

  const abstractMatch = clean.match(/\\begin\s*\{abstract\}([\s\S]*?)\\end\s*\{abstract\}/);
  if (abstractMatch) meta.abstract = stripTeX(abstractMatch[1]).trim();

  const degreePatterns = [
    { re: /doctor of philosophy|phd thesis|phd dissertation/i, val: 'phd' },
    { re: /master of science|master's thesis|msc thesis/i, val: 'master' },
    { re: /master of arts|ma thesis/i, val: 'master' },
    { re: /bachelor of science|bsc thesis/i, val: 'bachelor' },
    { re: /bachelor of engineering|beng/i, val: 'bachelor' },
  ];
  for (const { re, val } of degreePatterns) {
    if (re.test(clean)) { meta.degreeAbbrev = val; break; }
  }

  return meta;
}

function extractTeXChapters(tex: string): ExtractedChapter[] {
  const clean = tex.replace(/%[^\n]*/g, '');
  const chapters: ExtractedChapter[] = [];

  const docStart = clean.indexOf('\\begin{document}');
  const docEnd = clean.lastIndexOf('\\end{document}');
  if (docStart === -1) return chapters;
  const body = clean.slice(docStart, docEnd > -1 ? docEnd : undefined);

  const CHAPTER_RE = /\\chapter\*?\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  const positions: Array<{ title: string; index: number }> = [];
  let m;
  while ((m = CHAPTER_RE.exec(body)) !== null) {
    const title = stripTeX(m[1]).trim();
    if (/abstract|acknowledgement|dedication|contents|bibliography/i.test(title)) continue;
    positions.push({ title, index: m.index + m[0].length });
  }

  if (positions.length === 0) {
    const SECTION_RE = /\\section\*?\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
    while ((m = SECTION_RE.exec(body)) !== null) {
      const title = stripTeX(m[1]).trim();
      if (/abstract|bibliography|references/i.test(title)) continue;
      positions.push({ title, index: m.index + m[0].length });
    }
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = i + 1 < positions.length ? positions[i + 1].index : body.length;
    const rawBody = body.slice(start, end);
    const cleaned = convertTeXBodyToPlain(rawBody);

    if (cleaned.split(' ').length < 10) continue;

    chapters.push({
      title: positions[i].title,
      body: cleaned,
      order: i,
      level: !tex.includes('\\chapter') ? 'section' : 'chapter',
      subsections: extractTeXSubsections(rawBody),
    });
  }

  return chapters;
}

function extractTeXSubsections(body: string): Array<{ title: string; body: string }> {
  const SUB_RE = /\\subsection\*?\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  const positions: Array<{ title: string; index: number }> = [];
  let m;
  while ((m = SUB_RE.exec(body)) !== null) {
    positions.push({ title: stripTeX(m[1]), index: m.index + m[0].length });
  }

  return positions.slice(0, 8).map((pos, i) => {
    const start = pos.index;
    const end = i + 1 < positions.length ? positions[i + 1].index : body.length;
    return {
      title: pos.title,
      body: convertTeXBodyToPlain(body.slice(start, end)).slice(0, 2000),
    };
  });
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

function extractTeXBibliography(tex: string): ExtractedReference[] {
  const clean = tex.replace(/%[^\n]*/g, '');
  const refs: ExtractedReference[] = [];
  const docStart = clean.indexOf('\\begin{document}');
  const docEnd = clean.lastIndexOf('\\end{document}');
  const body = docStart > -1 ? clean.slice(docStart, docEnd > -1 ? docEnd : undefined) : clean;

  const BIBTEX_RE = /@(\w+)\s*\{([^,]+),\s*([\s\S]*?)\n\}/g;
  let m;
  while ((m = BIBTEX_RE.exec(body)) !== null) {
    const type = m[1].toLowerCase();
    const fields = parseBibFields(m[3]);
    refs.push({ type, ...fields, raw: m[0] });
  }

  if (refs.length > 0) return refs;

  // Fallback: look for thebibliography environment
  const bibMatch = clean.match(/\\begin\{thebibliography\}[\s\S]*?\\end\{thebibliography\}/);
  if (bibMatch) {
    const bibContent = bibMatch[0];
    const itemRe = /\\bibitem\{([^}]+)\}\s*([\s\S]*?)(?=\\bibitem\{|\\end\{thebibliography\})/g;
    let itemMatch;
    while ((itemMatch = itemRe.exec(bibContent)) !== null) {
      const raw = itemMatch[2].trim();
      if (raw.length < 15) continue;
      refs.push({ type: 'misc', raw, ...guessReferenceFields(raw) });
    }
  }

  return refs.slice(0, 80);
}

function parseBibFields(fieldStr: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const FIELD_RE = /(\w+)\s*=\s*\{([^}]*)\}/g;
  let m;
  while ((m = FIELD_RE.exec(fieldStr)) !== null) {
    fields[m[1].toLowerCase()] = m[2].trim();
  }
  return fields;
}

function guessReferenceFields(line: string): Partial<ExtractedReference> {
  const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
  const authorMatch = line.match(/^([A-Z][a-z]+,?\s+[A-Z]\.(?:\s+[A-Z][a-z]+,?)*)/);
  const titleMatch = line.match(/"([^"]{10,100})"|'([^']{10,100})'/);
  return {
    year: yearMatch?.[1],
    author: authorMatch?.[1],
    title: titleMatch?.[1] || titleMatch?.[2],
  };
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

// Re-export parseReferencesFromText for use by other importers
export function parseReferencesFromText(text: string): ExtractedReference[] {
  const refs: ExtractedReference[] = [];
  const lines = text.split('\n').filter((l) => l.trim().length > 20);
  for (const line of lines.slice(0, 60)) {
    const cleaned = line.replace(/^\s*[\[\d\]\.]+\s*/, '').trim();
    if (cleaned.length < 20) continue;
    refs.push({ type: 'misc', raw: cleaned, ...guessReferenceFields(cleaned) });
  }
  return refs;
}
