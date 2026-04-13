// ============================================================
// ThesisForge Import — PDF Importer
// Parses PDF files using pdfjs-dist to extract thesis metadata,
// chapters, and references from PDF text content.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';
import { parseReferencesFromText } from './texImporter';

export async function importPDF(file: File): Promise<ImportResult> {
  // Dynamic import for pdfjs-dist to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Extract full text page by page
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s{3,}/g, '\n');
    pages.push(pageText);
  }

  const fullText = pages.join('\n\n--- PAGE BREAK ---\n\n');

  // Extract metadata from first 3 pages
  const frontMatter = pages.slice(0, 3).join('\n\n');
  const metadata    = extractMetadataFromPDFText(frontMatter, fullText);

  // Extract chapters
  const chapters = extractChaptersFromPDFText(fullText);

  // Extract references from last pages
  const lastPages  = pages.slice(-5).join('\n\n');
  const references = extractReferencesFromPDFText(lastPages);

  const detectedTemplate = detectTemplate(metadata, chapters);
  const confidence       = scoreConfidence({ metadata, chapters, references });

  return {
    source:          'pdf',
    fileName:        file.name,
    metadata,
    chapters,
    references,
    detectedTemplate,
    confidence,
    warnings:        generatePDFWarnings({ metadata, chapters, references }),
    parseErrors:     [],
  };
}

function extractMetadataFromPDFText(frontMatter: string, fullText: string) {
  const meta: Record<string, any> = {};

  // Title detection
  const titlePatterns = [
    /^(.{10,100})\n(?:by|submitted by|a thesis|a dissertation)/im,
    /^([A-Z][A-Z\s:–—]{15,100})\n/m,
    /\n([A-Z][a-zA-Z\s:–—]{15,80})\n(?:by|author)/im,
  ];
  for (const p of titlePatterns) {
    const m = frontMatter.match(p);
    if (m) { meta.title = cleanLine(m[1]); break; }
  }

  // Author detection
  const authorPatterns = [
    /\bby\s+([A-Z][a-z]+ (?:[A-Z]\.? )?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
    /\bauthor[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\bsubmitted by\s+([A-Z][a-z]+ [A-Z][a-z]+)/i,
  ];
  for (const p of authorPatterns) {
    const m = frontMatter.match(p);
    if (m) { meta.author = cleanLine(m[1]); break; }
  }

  // Institution
  const instPatterns = [
    /\b((?:university|college|institute) of [A-Z][a-zA-Z\s]+)/i,
    /\b([A-Z][a-zA-Z]+ (?:university|college|institute))\b/i,
  ];
  for (const p of instPatterns) {
    const m = frontMatter.match(p);
    if (m) { meta.institution = cleanLine(m[1]); break; }
  }

  // Supervisor
  const supMatch = frontMatter.match(
    /(?:supervisor|adviser|advisor|supervised by)[:\s]+([A-Z][a-z.]+(?:\s+[A-Z][a-z.]+){1,3})/i
  );
  if (supMatch) meta.supervisor = cleanLine(supMatch[1]);

  // Year
  const yearMatch = frontMatter.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) meta.year = yearMatch[1];

  // Degree
  const degreePatterns = [
    { pattern: /doctor of philosophy|ph\.?d/i,         abbrev: 'phd',     full: 'Doctor of Philosophy' },
    { pattern: /master of science|m\.?s\.?c/i,         abbrev: 'master',  full: 'Master of Science' },
    { pattern: /master of arts|m\.?a\b/i,              abbrev: 'master',  full: 'Master of Arts' },
    { pattern: /bachelor of science|b\.?s\.?c/i,       abbrev: 'bachelor',full: 'Bachelor of Science' },
    { pattern: /bachelor of engineering|b\.?eng/i,     abbrev: 'bachelor',full: 'Bachelor of Engineering' },
  ];
  for (const { pattern, abbrev, full } of degreePatterns) {
    if (pattern.test(frontMatter)) {
      meta.degreeAbbrev = abbrev;
      meta.degree = full;
      break;
    }
  }

  // Abstract
  const abstractMatch = fullText.match(
    /\babstract\b\s*\n+([\s\S]{100,1500}?)(?:\n{2,}|chapter\s+1|introduction\b)/i
  );
  if (abstractMatch) meta.abstract = cleanParagraph(abstractMatch[1]);

  // Keywords
  const keywordMatch = fullText.match(
    /\bkeywords?[:\s]+([^\n.]{20,200})/i
  );
  if (keywordMatch) {
    meta.keywords = keywordMatch[1]
      .split(/[,;·•]/)
      .map(k => k.trim())
      .filter(k => k.length > 2 && k.length < 50);
  }

  return meta;
}

function extractChaptersFromPDFText(fullText: string): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];

  const CHAPTER_RE = /\n(?:chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)[\s:.—–]+([^\n]{3,80})|\d+\.\s+([A-Z][A-Za-z\s&:–—]{5,60}))\n/gi;

  const matches: Array<{ title: string; index: number }> = [];
  let match;
  while ((match = CHAPTER_RE.exec(fullText)) !== null) {
    const title = (match[1] || match[2]).trim();
    if (/contents|figures|tables|references|bibliography|appendix/i.test(title)) continue;
    matches.push({ title, index: match.index + match[0].length });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end   = i + 1 < matches.length ? matches[i + 1].index : fullText.length;
    const body  = cleanParagraph(fullText.slice(start, end).slice(0, 8000));

    if (body.split(' ').length < 20) continue;

    chapters.push({
      title:       matches[i].title,
      body,
      order:       i,
      level:       'chapter',
      subsections: extractSubsections(body),
    });
  }

  return chapters;
}

function extractSubsections(body: string): Array<{ title: string; body: string }> {
  const SUB_RE = /\n(\d+\.\d+\s+[A-Z][a-zA-Z\s&:]{5,60})\n/g;
  const subs: Array<{ title: string; body: string }> = [];
  let match;
  const positions: Array<{ title: string; index: number }> = [];

  while ((match = SUB_RE.exec(body)) !== null) {
    positions.push({ title: match[1].trim(), index: match.index + match[0].length });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end   = i + 1 < positions.length ? positions[i + 1].index : body.length;
    subs.push({
      title: positions[i].title,
      body:  cleanParagraph(body.slice(start, end).slice(0, 3000)),
    });
  }

  return subs.slice(0, 8);
}

function extractReferencesFromPDFText(text: string): ExtractedReference[] {
  const refSectionMatch = text.match(
    /(?:references|bibliography)\s*\n([\s\S]+)/i
  );
  if (!refSectionMatch) return [];
  return parseReferencesFromText(refSectionMatch[1]);
}

function cleanLine(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim();
}

function cleanParagraph(s: string): string {
  return s
    .replace(/--- PAGE BREAK ---/g, '\n')
    .replace(/\s{3,}/g, '\n\n')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

function generatePDFWarnings(data: { metadata: Record<string, any>; chapters: ExtractedChapter[]; references: ExtractedReference[] }): string[] {
  const warnings: string[] = [];
  if (!data.metadata.title) warnings.push('Could not detect thesis title from PDF');
  if (!data.metadata.author) warnings.push('Could not detect author from PDF');
  if (data.chapters.length === 0) warnings.push('No chapter headings detected — chapters may not be in standard format');
  if (data.references.length === 0) warnings.push('No references section detected in the PDF');
  return warnings;
}
