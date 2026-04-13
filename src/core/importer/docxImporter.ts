// ============================================================
// ThesisForge Import — DOCX Importer
// Parses .docx files using JSZip to extract thesis metadata,
// chapters, and references from Word document XML content.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';

export async function importDOCX(file: File): Promise<ImportResult> {
  const JSZip = (await import('jszip')).default;
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Extract document.xml — the main content file
  const docXmlFile = zip.file('word/document.xml');
  const docXml = docXmlFile ? await docXmlFile.async('string') : '';

  // Extract core.xml for metadata (title, author, etc.)
  const coreXmlFile = zip.file('docProps/core.xml');
  const coreXml = coreXmlFile ? await coreXmlFile.async('string') : '';

  // Parse XML → structured paragraphs
  const paragraphs = parseDocumentXml(docXml);
  const coreMeta = parseCoreXml(coreXml);

  // Extract metadata
  const metadata = extractMetadata(paragraphs, coreMeta);

  // Extract chapters from heading-structured paragraphs
  const chapters = extractChapters(paragraphs);

  // Extract references
  const references = extractReferences(paragraphs);

  const detectedTemplate = detectTemplate(metadata, chapters);
  const confidence = scoreConfidence({ metadata, chapters, references });

  const warnings: string[] = [];
  if (paragraphs.length < 10) warnings.push('Document appears to have very little content');
  if (!metadata.title) warnings.push('No title detected — check if the document uses heading styles');
  if (chapters.length === 0) warnings.push('No chapter headings found — the document may not use standard heading styles (Heading 1, Heading 2, etc.)');

  return {
    source:          'docx',
    fileName:        file.name,
    metadata,
    chapters,
    references,
    detectedTemplate,
    confidence,
    warnings,
    parseErrors:     [],
  };
}

// ---- XML Parsing Helpers ----

interface Paragraph {
  style?: string;
  text: string;
  isBold: boolean;
}

function parseDocumentXml(xml: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Split into <w:p> elements
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];

    // Detect paragraph style
    const styleMatch = pContent.match(/<w:pStyle\s+w:val\s*=\s*"([^"]+)"/);
    const style = styleMatch?.[1];

    // Extract all text runs
    const runs: string[] = [];
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      runs.push(tMatch[1]);
    }

    // Check if entire paragraph is bold
    const allBold = /<w:rPr>[\s\S]*?<w:b\s*\/?>[\s\S]*?<\/w:rPr>/g.test(pContent);

    const text = runs.join('').trim();
    if (text) {
      paragraphs.push({ style, text, isBold: allBold });
    }
  }

  return paragraphs;
}

function parseCoreXml(xml: string): Record<string, string> {
  const meta: Record<string, string> = {};

  const titleMatch = xml.match(/<dc:title>([^<]*)<\/dc:title>/);
  if (titleMatch) meta.coreTitle = titleMatch[1];

  const creatorMatch = xml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
  if (creatorMatch) meta.coreAuthor = creatorMatch[1];

  const subjectMatch = xml.match(/<dc:subject>([^<]*)<\/dc:subject>/);
  if (subjectMatch) meta.coreSubject = subjectMatch[1];

  const keywordsMatch = xml.match(/<cp:keywords>([^<]*)<\/cp:keywords>/);
  if (keywordsMatch) meta.coreKeywords = keywordsMatch[1];

  return meta;
}

// ---- Metadata Extraction ----

function extractMetadata(paragraphs: Paragraph[], coreMeta: Record<string, string>) {
  const meta: Record<string, any> = {};

  // Title: first Title or Heading1 paragraph, or core.xml title
  const titlePara = paragraphs.find(p =>
    p.style === 'Title' ||
    /^Heading1$/i.test(p.style || '') ||
    /^heading\s*1$/i.test(p.style || '')
  );
  if (titlePara) {
    meta.title = titlePara.text;
  } else if (coreMeta.coreTitle) {
    meta.title = coreMeta.coreTitle;
  } else if (paragraphs.length > 0 && paragraphs[0].isBold && paragraphs[0].text.length > 5) {
    // Fallback: first bold paragraph that looks like a title
    meta.title = paragraphs[0].text;
  }

  // Author: from core.xml
  if (coreMeta.coreAuthor) meta.author = coreMeta.coreAuthor;

  // Try to find author in document text (e.g., "by John Smith")
  if (!meta.author) {
    const authorPara = paragraphs.find(p =>
      /^\s*by\s+/i.test(p.text) && p.text.split(' ').length <= 8
    );
    if (authorPara) meta.author = authorPara.text.replace(/^\s*by\s+/i, '').trim();
  }

  // Institution: look for university/college keywords
  const instPara = paragraphs.find(p =>
    /\b(?:university|college|institute|school)\b/i.test(p.text) &&
    p.text.split(' ').length <= 15
  );
  if (instPara) meta.institution = instPara.text;

  // Abstract: look for a paragraph after an "Abstract" heading
  const abstractIdx = paragraphs.findIndex(p =>
    /(?:^|\s)abstract(?:\s|$)/i.test(p.text) && p.text.length < 30
  );
  if (abstractIdx > -1) {
    const abstractParts: string[] = [];
    for (let i = abstractIdx + 1; i < paragraphs.length && i < abstractIdx + 20; i++) {
      const p = paragraphs[i];
      // Stop at next heading
      if (/^heading\s*\d+$/i.test(p.style || '') || p.style === 'Title') break;
      if (p.text.length > 10) abstractParts.push(p.text);
    }
    if (abstractParts.length > 0) {
      meta.abstract = abstractParts.join(' ');
    }
  }

  // Keywords
  if (coreMeta.coreKeywords) {
    meta.keywords = coreMeta.coreKeywords
      .split(/[,;]/)
      .map(k => k.trim())
      .filter(k => k.length > 1 && k.length < 60);
  } else {
    const kwPara = paragraphs.find(p =>
      /^keywords?\s*[:：]/i.test(p.text)
    );
    if (kwPara) {
      meta.keywords = kwPara.text
        .replace(/^keywords?\s*[:：]\s*/i, '')
        .split(/[,;]/)
        .map(k => k.trim())
        .filter(k => k.length > 1 && k.length < 60);
    }
  }

  // Degree detection from content
  const fullText = paragraphs.map(p => p.text).join(' ');
  const degreePatterns = [
    { re: /doctor of philosophy|ph\.?d\s*(?:thesis|dissertation)?/i, abbrev: 'phd', full: 'Doctor of Philosophy' },
    { re: /master of science|m\.?s\.?c/i,                         abbrev: 'master', full: 'Master of Science' },
    { re: /master of arts|m\.?a\b/i,                              abbrev: 'master', full: 'Master of Arts' },
    { re: /bachelor of science|b\.?s\.?c/i,                       abbrev: 'bachelor', full: 'Bachelor of Science' },
    { re: /bachelor of engineering|b\.?eng/i,                     abbrev: 'bachelor', full: 'Bachelor of Engineering' },
  ];
  for (const { re, abbrev, full } of degreePatterns) {
    if (re.test(fullText)) {
      meta.degreeAbbrev = abbrev;
      meta.degree = full;
      break;
    }
  }

  // Year
  const yearMatch = fullText.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) meta.year = yearMatch[1];

  return meta;
}

// ---- Chapter Extraction ----

function extractChapters(paragraphs: Paragraph[]): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];

  // Find heading-based chapter boundaries
  const headingPositions: Array<{ title: string; level: number; index: number }> = [];
  const headingStyleRegex = /^heading\s*(\d+)$/i;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const hMatch = p.style?.match(headingStyleRegex);
    if (hMatch) {
      const level = parseInt(hMatch[1], 10);
      if (level >= 1 && level <= 3) {
        const title = p.text.trim();
        // Skip common non-content headings
        if (/^(abstract|acknowledgements?|dedication|table of contents|list of figures|list of tables|bibliography|references|appendix|table\s+of\s+contents|contents)$/i.test(title)) continue;
        headingPositions.push({ title, level, index: i });
      }
    }
  }

  // Group: top-level headings (level 1) become chapters, level 2 become subsections
  const topLevelHeadings = headingPositions.filter(h => h.level === 1);

  // Fallback: if no heading styles, try bold paragraphs as potential headings
  if (topLevelHeadings.length === 0) {
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (p.isBold && p.text.length > 3 && p.text.length < 100 && paragraphs[i + 1]?.text?.length > 50) {
        topLevelHeadings.push({ title: p.text.trim(), level: 1, index: i });
        if (topLevelHeadings.length >= 15) break;
      }
    }
  }

  // Build chapters from top-level headings
  for (let i = 0; i < topLevelHeadings.length; i++) {
    const start = topLevelHeadings[i].index + 1;
    const end = i + 1 < topLevelHeadings.length ? topLevelHeadings[i + 1].index : paragraphs.length;

    // Collect body paragraphs
    const bodyParts: string[] = [];
    const subHeadings: Array<{ title: string; index: number }> = [];

    for (let j = start; j < end; j++) {
      const p = paragraphs[j];
      const hMatch = p.style?.match(headingStyleRegex);

      if (hMatch && parseInt(hMatch[1], 10) === 2) {
        subHeadings.push({ title: p.text.trim(), index: j });
      } else if (!hMatch || parseInt(hMatch[1], 10) >= 2) {
        // Include text that is not a higher-level heading
        if (p.text.length > 2) bodyParts.push(p.text);
      }
    }

    const body = bodyParts.join('\n\n').trim();
    if (body.split(' ').length < 15) continue;

    // Build subsections
    const subsections = subHeadings.slice(0, 8).map((sub, si) => {
      const subStart = sub.index + 1;
      const subEnd = si + 1 < subHeadings.length ? subHeadings[si + 1].index : end;
      const subParts: string[] = [];
      for (let k = subStart; k < subEnd; k++) {
        const pp = paragraphs[k];
        const shm = pp.style?.match(headingStyleRegex);
        if (!shm) subParts.push(pp.text);
      }
      return {
        title: sub.title,
        body: subParts.join('\n\n').trim().slice(0, 2000),
      };
    });

    chapters.push({
      title: topLevelHeadings[i].title,
      body,
      order: i,
      level: 'chapter',
      subsections,
    });
  }

  return chapters;
}

// ---- Reference Extraction ----

function extractReferences(paragraphs: Paragraph[]): ExtractedReference[] {
  const refs: ExtractedReference[] = [];

  // Find the references/bibliography section
  let refStartIdx = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (/^(references|bibliography|works?\s+cited)$/i.test(p.text.trim()) && p.text.length < 30) {
      refStartIdx = i + 1;
      break;
    }
  }

  if (refStartIdx === -1) return refs;

  // Collect paragraphs in the references section
  for (let i = refStartIdx; i < paragraphs.length && refs.length < 60; i++) {
    const p = paragraphs[i];
    if (p.text.length < 20) continue;

    refs.push({
      type: 'misc',
      raw: p.text,
      ...guessReferenceFields(p.text),
    });
  }

  return refs;
}

function guessReferenceFields(line: string): Partial<ExtractedReference> {
  const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
  const authorMatch = line.match(/^([A-Z][a-z]+,?\s+[A-Z]\.(?:\s+[A-Z]\.?)*(?:\s+[A-Z][a-z]+,?)*)/);
  const titleMatch = line.match(/"([^"]{10,100})"|'([^']{10,100})'/);

  return {
    year:   yearMatch?.[1],
    author: authorMatch?.[1],
    title:  titleMatch?.[1] || titleMatch?.[2],
  };
}
