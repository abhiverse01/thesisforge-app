// ============================================================
// ThesisForge Import — DOCX Importer
// Parses .docx files using JSZip to extract thesis metadata,
// chapters, and references from Word document XML content.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';
import { extractTitleSmart, extractAuthorsSmart, extractAbstractSmart, extractKeywordsSmart, extractYearSmart } from './contentIntelligence';

export async function importDOCX(file: File): Promise<ImportResult> {
  // FIX #18: Wrap entire DOCX parsing in try/catch for corrupted/invalid ZIP files
  let JSZip: any;
  try {
    JSZip = (await import('jszip')).default;
  } catch {
    return {
      source: 'docx',
      fileName: file.name,
      metadata: {},
      chapters: [],
      references: [],
      newcommands: [],
      detectedTemplate: null,
      confidence: { metadata: {}, chapters: 0, references: 0, overall: 0 },
      warnings: ['Failed to load ZIP library for DOCX parsing'],
      parseErrors: ['jszip library not available'],
    };
  }

  let zip: any;
  try {
    const arrayBuffer = await file.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    return {
      source: 'docx',
      fileName: file.name,
      metadata: {},
      chapters: [],
      references: [],
      newcommands: [],
      detectedTemplate: null,
      confidence: { metadata: {}, chapters: 0, references: 0, overall: 0 },
      warnings: ['The file could not be parsed as a valid DOCX. It may be corrupted or in an older .doc format.'],
      parseErrors: ['Invalid or corrupted DOCX file'],
    };
  }

  // Extract document.xml — the main content file
  const docXmlFile = zip.file('word/document.xml');
  const docXml = docXmlFile ? await docXmlFile.async('string') : '';

  // Extract core.xml for metadata (title, author, etc.)
  const coreXmlFile = zip.file('docProps/core.xml');
  const coreXml = coreXmlFile ? await coreXmlFile.async('string') : '';

  // Extract app.xml for company/institution metadata
  const appXmlFile = zip.file('docProps/app.xml');
  const appXml = appXmlFile ? await appXmlFile.async('string') : '';

  // ---- Enhancement #3: Extract settings.xml for custom properties ----
  const settingsXmlFile = zip.file('word/settings.xml');
  const settingsXml = settingsXmlFile ? await settingsXmlFile.async('string') : '';

  // Parse XML → structured paragraphs
  const paragraphs = parseDocumentXml(docXml);
  const coreMeta = parseCoreXml(coreXml);

  // ---- Enhancement #3: Enhanced metadata from app.xml ----
  // Company → institution fallback
  const companyMatch = appXml.match(/<Company>([^<]+)<\/Company>/i);
  if (companyMatch) coreMeta.coreCompany = companyMatch[1];

  // Category → department fallback
  const categoryMatch = appXml.match(/<Category>([^<]+)<\/Category>/i);
  if (categoryMatch) coreMeta.coreCategory = categoryMatch[1];

  // Manager → supervisor fallback
  const managerMatch = appXml.match(/<Manager>([^<]+)<\/Manager>/i);
  if (managerMatch) coreMeta.coreManager = managerMatch[1];

  // ---- Enhancement #3: Parse settings.xml for custom document properties ----
  if (settingsXml) {
    const settingsMeta = parseSettingsXml(settingsXml);
    // Custom properties from settings can provide department, supervisor, etc.
    if (settingsMeta.department && !coreMeta.coreCategory) coreMeta.coreCategory = settingsMeta.department;
    if (settingsMeta.supervisor && !coreMeta.coreManager) coreMeta.coreManager = settingsMeta.supervisor;
  }

  // Try to extract metadata from header/footer
  const headerFiles = ['word/header1.xml', 'word/header2.xml'];
  for (const hf of headerFiles) {
    const headerFile = zip.file(hf);
    if (headerFile) {
      const headerXml = await headerFile.async('string');
      const headerParagraphs = parseDocumentXml(headerXml);
      const headerText = headerParagraphs.map(p => p.text).join(' ');
      if (headerText && /\b(?:university|college|institute)\b/i.test(headerText)) {
        const headerInst = headerText.match(/\b((?:university|college|institute) of [A-Z][a-zA-Z\s]+)/i);
        if (headerInst) {
          // Store for later use by extractMetadata
          (coreMeta as any).headerInstitution = headerInst[1];
        }
      }
    }
  }

  // ---- Enhancement #1: Parse TOC.xml if it exists ----
  const tocTitles = await parseTocFromZip(zip);

  // Extract metadata
  const metadata = extractMetadata(paragraphs, coreMeta);

  // GODMODE: Content intelligence fallback for DOCX
  const fullDocText = paragraphs.map(p => p.text).join('\n');
  if (!metadata.title) { const t = extractTitleSmart(fullDocText); if (t) metadata.title = t; }
  if (!metadata.author) { const a = extractAuthorsSmart(fullDocText); if (a.length > 0) metadata.author = a[0]; }
  if (!metadata.abstract) { const ab = extractAbstractSmart(fullDocText); if (ab) metadata.abstract = ab; }
  if (!metadata.keywords || metadata.keywords.length === 0) { const kw = extractKeywordsSmart(fullDocText, metadata); if (kw.length > 0) metadata.keywords = kw; }
  if (!metadata.year) { const y = extractYearSmart(fullDocText); if (y) metadata.year = y; }

  // ---- Enhancement #3: Apply app.xml Category → department, Manager → supervisor ----
  if (!metadata.department && coreMeta.coreCategory) {
    metadata.department = coreMeta.coreCategory;
  }
  if (!metadata.supervisor && coreMeta.coreManager) {
    metadata.supervisor = coreMeta.coreManager;
  }

  // Extract chapters from heading-structured paragraphs (now with TOC + numbered heading awareness)
  const chapters = extractChapters(paragraphs, tocTitles);

  // ---- Enhancement #6: Content quality post-processing ----
  const cleanedChapters = postProcessChapters(chapters);

  // Extract references
  const references = extractReferences(paragraphs);

  const detectedTemplate = detectTemplate(metadata, cleanedChapters);
  const confidence = scoreConfidence({ metadata, chapters: cleanedChapters, references });

  const warnings: string[] = [];
  if (paragraphs.length < 10) warnings.push('Document appears to have very little content');
  if (!metadata.title) warnings.push('No title detected — check if the document uses heading styles');
  if (cleanedChapters.length === 0) warnings.push('No chapter headings found — the document may not use standard heading styles (Heading 1, Heading 2, etc.)');

  // Report which enhancements were applied
  if (tocTitles.length > 0) warnings.push(`TOC.xml detected with ${tocTitles.length} entries — chapter detection enhanced`);
  if (cleanedChapters.length < chapters.length) warnings.push(`${chapters.length - cleanedChapters.length} low-quality chapter(s) removed during post-processing`);

  return {
    source:          'docx',
    fileName:        file.name,
    metadata,
    chapters:        cleanedChapters,
    references,
    newcommands:     [],
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
  isItalic?: boolean;
  isBoldItalic?: boolean;
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

    // Check if the paragraph has at least one bold run and no non-bold runs
    const hasBoldRun = /<w:rPr[^>]*>\s*<w:b[\s\/>]/.test(pContent);
    const hasItalicRun = /<w:rPr[^>]*>\s*<w:i[\s\/>]/.test(pContent);
    const textRuns = pContent.match(/<w:r>[\s\S]*?<\/w:r>/g) || [];
    const allBold = hasBoldRun && textRuns.every((run: string) => /<w:rPr[^>]*>\s*<w:b[\s\/>]/.test(run));
    const allItalic = hasItalicRun && textRuns.every((run: string) => /<w:rPr[^>]*>\s*<w:i[\s\/>]/.test(run));
    const allBoldItalic = allBold && allItalic;

    const text = runs.join('').trim();
    if (text) {
      paragraphs.push({ style, text, isBold: allBold, isItalic: allItalic, isBoldItalic: allBoldItalic });
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

// ---- Enhancement #3: Parse settings.xml for custom document properties ----

function parseSettingsXml(xml: string): { department?: string; supervisor?: string; [key: string]: string | undefined } {
  const result: { department?: string; supervisor?: string; [key: string]: string | undefined } = {};

  // Look for custom properties in settings.xml — often stored as <w:attachedTemplate>
  // or in <w:docVars> / <w:docVar> elements
  const docVarRegex = /<w:docVar\s+w:name\s*=\s*"([^"]+)"\s+w:val\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = docVarRegex.exec(xml)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2];
    if (/department|dept/i.test(name) && value) result.department = value;
    if (/supervisor|advisor|adviser/i.test(name) && value) result.supervisor = value;
  }

  // Also look for <o:DocumentProperties> style properties sometimes embedded
  if (/<o:DocumentProperties>/i.test(xml)) {
    const deptMatch = xml.match(/<o:Department>([^<]*)<\/o:Department>/i);
    if (deptMatch) result.department = deptMatch[1];
    const mgrMatch = xml.match(/<o:Manager>([^<]*)<\/o:Manager>/i);
    if (mgrMatch) result.supervisor = mgrMatch[1];
  }

  return result;
}

// ---- Enhancement #1: TOC XML Parsing ----

interface TocEntry {
  title: string;
  level: number;
  page?: string;
}

/**
 * Parse word/toc.xml (or any toc*.xml file) to extract a definitive list of
 * chapter titles and their hierarchy levels.
 */
async function parseTocFromZip(zip: any): Promise<TocEntry[]> {
  const tocFiles = ['word/toc.xml'];
  // Also look for alternative TOC file names
  for (const path of Object.keys(zip.files)) {
    if (/^word\/toc\d*\.xml$/i.test(path) && !tocFiles.includes(path)) {
      tocFiles.push(path);
    }
  }

  for (const tocPath of tocFiles) {
    const tocFile = zip.file(tocPath);
    if (!tocFile) continue;

    const tocXml = await tocFile.async('string');
    const entries = parseTocXml(tocXml);
    if (entries.length > 0) return entries;
  }

  return [];
}

/**
 * Parse TOC XML content to extract structured entries.
 * TOC entries in DOCX use <w:sdt> elements with hyperlinks to bookmarked headings.
 */
function parseTocXml(xml: string): TocEntry[] {
  const entries: TocEntry[] = [];

  // Strategy 1: Parse structured document tags (SDT) based TOC entries
  // TOC entries are typically <w:sdt> blocks containing <w:hyperlink> elements
  const sdtRegex = /<w:sdt\b[^>]*>([\s\S]*?)<\/w:sdt>/g;
  let sdtMatch;

  while ((sdtMatch = sdtRegex.exec(xml)) !== null) {
    const sdtContent = sdtMatch[1];

    // Extract the text from the TOC entry
    const runs: string[] = [];
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(sdtContent)) !== null) {
      runs.push(tMatch[1]);
    }

    const text = runs.join('').trim();
    if (!text || text.length < 2) continue;

    // Determine level from outline level: <w:outlineLvl w:val="0"/>
    const outlineMatch = sdtContent.match(/<w:outlineLvl\s+w:val\s*=\s*"(\d+)"/);
    const level = outlineMatch ? parseInt(outlineMatch[1], 10) + 1 : 1;

    // Extract page number if available (usually at end of TOC entry)
    const pageMatch = sdtContent.match(/<w:t[^>]*>(\d+)\s*<\/w:t>(?:\s*<\/w:r>\s*)*<\/w:sdt>/);
    // More reliable: look for right-aligned tab with page number
    const pageRunMatch = sdtContent.match(/<w:fldChar\s+w:fldCharType\s*=\s*"end"\/>[\s\S]*?<w:t[^>]*>(\d+)/);
    const page = pageRunMatch?.[1];

    // Skip non-content TOC entries
    if (/^(abstract|acknowledgements?|dedication|table of contents|list of figures|list of tables|bibliography|references|appendix|table\s+of\s+contents|contents|list of abbreviations|list of symbols|curriculum vitae|cv|declaration|list of publications)$/i.test(text)) continue;

    entries.push({ title: text, level, page: page || undefined });
  }

  // Strategy 2: If SDT parsing yielded nothing, try hyperlink-based TOC parsing
  if (entries.length === 0) {
    // Some DOCX TOC files use simple <w:hyperlink> elements
    const hyperlinkRegex = /<w:hyperlink[^>]*>([\s\S]*?)<\/w:hyperlink>/g;
    let hlMatch;
    let currentLevel = 1;

    while ((hlMatch = hyperlinkRegex.exec(xml)) !== null) {
      const hlContent = hlMatch[1];
      const runs: string[] = [];
      const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let tMatch;
      while ((tMatch = tRegex.exec(hlContent)) !== null) {
        runs.push(tMatch[1]);
      }

      const text = runs.join('').trim();
      if (!text || text.length < 2) continue;

      // Determine indentation level from the paragraph indent
      const indentMatch = hlContent.match(/<w:ind\s+w:left\s*=\s*"(\d+)"/);
      if (indentMatch) {
        const indent = parseInt(indentMatch[1], 10);
        currentLevel = indent <= 360 ? 1 : indent <= 720 ? 2 : 3;
      }

      if (/^(abstract|acknowledgements?|dedication|table of contents|list of figures|list of tables|bibliography|references|appendix|table\s+of\s+contents|contents)$/i.test(text)) continue;

      entries.push({ title: text, level: currentLevel });
    }
  }

  // Strategy 3: Fallback — parse paragraph-based TOC entries
  if (entries.length === 0) {
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let pMatch;
    while ((pMatch = pRegex.exec(xml)) !== null) {
      const pContent = pMatch[1];
      const runs: string[] = [];
      const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let tMatch;
      while ((tMatch = tRegex.exec(pContent)) !== null) {
        runs.push(tMatch[1]);
      }
      const text = runs.join('').trim();
      if (!text || text.length < 2) continue;

      // Determine level from indentation or outline level
      const outlineMatch = pContent.match(/<w:outlineLvl\s+w:val\s*=\s*"(\d+)"/);
      const indentMatch = pContent.match(/<w:ind\s+w:left\s*=\s*"(\d+)"/);
      let level = 1;
      if (outlineMatch) {
        level = parseInt(outlineMatch[1], 10) + 1;
      } else if (indentMatch) {
        const indent = parseInt(indentMatch[1], 10);
        level = indent <= 360 ? 1 : indent <= 720 ? 2 : 3;
      }

      if (/^(abstract|acknowledgements?|dedication|table of contents|list of figures|list of tables|bibliography|references|appendix|table\s+of\s+contents|contents)$/i.test(text)) continue;

      entries.push({ title: text, level });
    }
  }

  return entries;
}

// ---- Enhancement #2: Numbered Heading Detection ----

/** Regex for numbered heading patterns like "1.", "1.1", "2.1.1", "1.1.1.1" */
const NUMBERED_HEADING_REGEX = /^(\d+(?:\.\d+)*)\s+(.+)/;

/**
 * Detect numbered headings in body text that aren't marked with heading styles.
 * Common in theses: "1. Introduction", "2.1 Literature Review", "2.1.1 Background"
 */
function detectNumberedHeadings(paragraphs: Paragraph[]): Array<{ title: string; level: number; index: number }> {
  const results: Array<{ title: string; level: number; index: number }> = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];

    // Skip paragraphs that already have a heading style
    if (p.style && /^heading\s*\d+$/i.test(p.style)) continue;

    // Skip short or very long paragraphs (not headings)
    if (p.text.length < 3 || p.text.length > 200) continue;

    const numMatch = p.text.match(NUMBERED_HEADING_REGEX);
    if (!numMatch) continue;

    const numberPart = numMatch[1];
    const titlePart = numMatch[2].trim();
    const dotCount = (numberPart.match(/\./g) || []).length;

    // Level based on number of dots: "1." → 1, "1.1" → 2, "1.1.1" → 3, "1.1.1.1" → 3 (capped)
    const level = Math.min(dotCount + 1, 3);

    // Title part should be reasonable length for a heading
    if (titlePart.length < 2 || titlePart.length > 150) continue;

    // Skip if the next paragraph is too short (not a real section start)
    // OR if this looks like a numbered list item (very short title with no next content)
    if (level === 1 && !paragraphs[i + 1]) continue;

    // Skip TOC-like entries (pure numbered items in a row without body content)
    if (i + 1 < paragraphs.length) {
      const nextP = paragraphs[i + 1];
      const nextNumMatch = nextP.text.match(NUMBERED_HEADING_REGEX);
      // If next para is also a numbered heading at same level, might be TOC listing
      if (nextNumMatch && (nextP.text.match(NUMBERED_HEADING_REGEX)?.[1].match(/\./g) || []).length === dotCount) {
        // Check if there's any substantial text between this and next numbered item
        if (titlePart.length < 50 && nextP.text.length < 50) continue;
      }
    }

    // Skip common non-content numbered items
    if (/^(abstract|acknowledgements?|dedication|table of contents|list of figures|list of tables|bibliography|references|appendix|table\s+of\s+contents|contents)$/i.test(titlePart)) continue;

    results.push({
      title: p.text.trim(),
      level,
      index: i,
    });
  }

  return results;
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
  // Check header/footer first, then document paragraphs, then app.xml company
  if ((coreMeta as any).headerInstitution) {
    meta.institution = (coreMeta as any).headerInstitution;
  } else {
    const instPara = paragraphs.find(p =>
      /\b(?:university|college|institute|school)\b/i.test(p.text) &&
      p.text.split(' ').length <= 15
    );
    if (instPara) {
      meta.institution = instPara.text;
    } else if (coreMeta.coreCompany) {
      // Fallback: company from app.xml
      meta.institution = coreMeta.coreCompany;
    }
  }

  // ---- Enhancement #4: Enhanced Abstract Detection ----
  meta.abstract = extractAbstractFromParagraphs(paragraphs);

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

// ---- Enhancement #4: Enhanced Abstract Detection ----

/**
 * Multi-strategy abstract detection:
 * 1. Paragraph with style "Abstract" or "Summary"
 * 2. Bold+italic paragraph near the start of the document
 * 3. Long paragraph (>100 words) in the first ~3 pages that isn't a heading
 * 4. Traditional "Abstract" / "Summary" heading followed by content (original logic)
 */
function extractAbstractFromParagraphs(paragraphs: Paragraph[]): string | undefined {
  // Strategy 1: Paragraph with style "Abstract" or "Summary"
  for (let i = 0; i < Math.min(paragraphs.length, 50); i++) {
    const p = paragraphs[i];
    if (p.style && /^(?:abstract|summary|abstracttitle|abstractheading)$/i.test(p.style)) {
      // Found an abstract-styled paragraph; collect following content
      const abstractParts: string[] = [];
      if (p.text.length > 30) {
        // The styled paragraph itself may be the abstract title or content
        if (/^(?:abstract|summary)$/i.test(p.text.trim())) {
          // It's a heading, collect following paragraphs
          for (let j = i + 1; j < paragraphs.length && j < i + 20; j++) {
            const pp = paragraphs[j];
            if (/^heading\s*\d+$/i.test(pp.style || '') || pp.style === 'Title') break;
            if (pp.text.length > 10) abstractParts.push(pp.text);
          }
        } else {
          // The styled paragraph itself contains abstract content
          abstractParts.push(p.text);
          for (let j = i + 1; j < paragraphs.length && j < i + 15; j++) {
            const pp = paragraphs[j];
            if (/^heading\s*\d+$/i.test(pp.style || '') || pp.style === 'Title') break;
            if (pp.text.length > 10) abstractParts.push(pp.text);
          }
        }
      }
      const result = abstractParts.join(' ').trim();
      if (result.split(/\s+/).length >= 20) return result;
    }
  }

  // Strategy 2: Bold+italic paragraph near the start (common for abstracts in some templates)
  const firstPageEnd = Math.min(paragraphs.length, 60); // ~3 pages at ~20 paragraphs/page
  for (let i = 0; i < firstPageEnd; i++) {
    const p = paragraphs[i];
    if (p.isBoldItalic && p.text.split(/\s+/).length >= 30 && p.text.split(/\s+/).length <= 500) {
      // Check it's not a heading
      if (!/^heading\s*\d+$/i.test(p.style || '') && p.style !== 'Title') {
        // Verify it reads like abstract content (mentions research methods, findings, etc.)
        if (/(?:study|research|method|analysis|result|finding|approach|propose|present|investigate|examine|evaluate)/i.test(p.text)) {
          return p.text;
        }
      }
    }
  }

  // Strategy 3: Long paragraph (>100 words) in first ~3 pages that isn't a heading
  // and appears before any numbered chapter heading
  let firstChapterIdx = paragraphs.length;
  for (let i = 0; i < firstPageEnd; i++) {
    const p = paragraphs[i];
    if (p.style && /^heading\s*1$/i.test(p.style)) {
      firstChapterIdx = i;
      break;
    }
    // Also check for numbered headings like "1. Introduction"
    if (NUMBERED_HEADING_REGEX.test(p.text) && (p.text.match(NUMBERED_HEADING_REGEX)?.[1].match(/\./g) || []).length === 0) {
      firstChapterIdx = i;
      break;
    }
  }

  for (let i = 0; i < Math.min(firstPageEnd, firstChapterIdx); i++) {
    const p = paragraphs[i];
    if (p.style && /^heading\s*\d+$/i.test(p.style)) continue;
    if (p.style === 'Title') continue;

    const wordCount = p.text.split(/\s+/).length;
    if (wordCount >= 100 && wordCount <= 500) {
      // This might be an abstract without explicit heading
      // Verify it doesn't look like a regular body paragraph (check position and context)
      // Abstracts typically appear early and before numbered sections
      if (/(?:this\s+(?:study|research|paper|thesis|dissertation|work)|we\s+(?:propose|present|investigate|examine)|in\s+this\s+(?:paper|study|thesis|research))/i.test(p.text)) {
        return p.text;
      }
    }
  }

  // Strategy 4: Traditional "Abstract" / "Summary" heading followed by content (original logic)
  const abstractIdx = paragraphs.findIndex(p =>
    /(?:^|\s)(?:abstract|summary)(?:\s|$)/i.test(p.text) && p.text.length < 30
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
      const result = abstractParts.join(' ').trim();
      if (result.split(/\s+/).length >= 15) return result;
    }
  }

  return undefined;
}

// ---- Enhancement #5: Chapter Extraction with TOC + Numbered Headings + Multi-level Subsections ----

/**
 * Extract chapters using multiple strategies:
 * 1. Heading styles (Heading 1, 2, 3)
 * 2. TOC entries from word/toc.xml
 * 3. Numbered heading patterns ("1. Title", "1.1 Title", "2.1.1 Title")
 * 4. Bold paragraphs as fallback
 */
function extractChapters(paragraphs: Paragraph[], tocEntries: TocEntry[] = []): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];

  const headingStyleRegex = /^heading\s*(\d+)$/i;

  // ---- Step 1: Find heading-based chapter boundaries ----
  const headingPositions: Array<{ title: string; level: number; index: number }> = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const hMatch = p.style?.match(headingStyleRegex);
    if (hMatch) {
      const level = parseInt(hMatch[1], 10);
      if (level >= 1 && level <= 3) {
        const title = p.text.trim();
        // Skip common non-content headings
        if (/^(abstract|acknowledgements?|dedication|table of contents|list of figures|list of tables|bibliography|references|appendix|table\s+of\s+contents|contents|list of abbreviations|list of symbols|curriculum vitae|cv|declaration)$/i.test(title)) continue;
        headingPositions.push({ title, level, index: i });
      }
    }
  }

  // ---- Step 2: Enhance with numbered heading detection ----
  // Only add numbered headings that don't overlap with existing heading-style positions
  const numberedHeadings = detectNumberedHeadings(paragraphs);
  const existingIndices = new Set(headingPositions.map(h => h.index));

  for (const nh of numberedHeadings) {
    if (!existingIndices.has(nh.index)) {
      // Check if this numbered heading aligns with a TOC entry (confidence boost)
      const tocMatch = findTocMatch(nh.title, tocEntries);
      headingPositions.push({
        title: nh.title,
        level: nh.level,
        index: nh.index,
      });
      existingIndices.add(nh.index);
    }
  }

  // ---- Step 3: Sort by index to maintain document order ----
  headingPositions.sort((a, b) => a.index - b.index);

  // ---- Step 4: Use TOC to validate and supplement headings ----
  if (tocEntries.length > 0) {
    // Build a set of heading titles for quick lookup
    const headingTitleSet = new Set(
      headingPositions.map(h => normalizeTocTitle(h.title))
    );

    // Find TOC entries that don't have a matching heading in the document
    // These might be headings without proper styles
    for (const toc of tocEntries) {
      if (toc.level > 3) continue; // Only care about levels 1-3
      const normalizedTocTitle = normalizeTocTitle(toc.title);

      if (!headingTitleSet.has(normalizedTocTitle)) {
        // Try to find this TOC title in the document paragraphs
        const paraIdx = findParagraphByTitle(paragraphs, toc.title);
        if (paraIdx !== -1 && !existingIndices.has(paraIdx)) {
          headingPositions.push({
            title: toc.title,
            level: toc.level,
            index: paraIdx,
          });
          existingIndices.add(paraIdx);
          headingTitleSet.add(normalizedTocTitle);
        }
      }
    }

    // Re-sort after TOC augmentation
    headingPositions.sort((a, b) => a.index - b.index);
  }

  // ---- Step 5: Get top-level headings (level 1) ----
  let topLevelHeadings = headingPositions.filter(h => h.level === 1);

  // Fallback: if no heading styles and no numbered headings, try bold paragraphs
  if (topLevelHeadings.length === 0) {
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (p.isBold && p.text.length > 3 && p.text.length < 100 && paragraphs[i + 1]?.text?.length > 50) {
        topLevelHeadings.push({ title: p.text.trim(), level: 1, index: i });
        if (topLevelHeadings.length >= 15) break;
      }
    }
  }

  // ---- Step 6: Build chapters with multi-level subsection support ----
  const allHeadingPositions = headingPositions;

  for (let i = 0; i < topLevelHeadings.length; i++) {
    const start = topLevelHeadings[i].index + 1;
    const end = i + 1 < topLevelHeadings.length ? topLevelHeadings[i + 1].index : paragraphs.length;

    // Collect body paragraphs and sub-headings (levels 2 and 3)
    const bodyParts: string[] = [];
    const subHeadings: Array<{ title: string; level: number; index: number }> = [];

    for (let j = start; j < end; j++) {
      const p = paragraphs[j];
      const hMatch = p.style?.match(headingStyleRegex);
      const numMatch = p.text.match(NUMBERED_HEADING_REGEX);

      if (hMatch) {
        const level = parseInt(hMatch[1], 10);
        if (level === 2 || level === 3) {
          subHeadings.push({ title: p.text.trim(), level, index: j });
          continue; // Don't include heading text in body
        }
        // Skip level 1 headings (shouldn't happen within a chapter but just in case)
        if (level === 1) continue;
      }

      // Also detect numbered sub-headings (e.g., "2.1 Literature Review", "2.1.1 Background")
      if (numMatch && !hMatch) {
        const dotCount = (numMatch[1].match(/\./g) || []).length;
        const numLevel = Math.min(dotCount + 1, 3);
        if (numLevel >= 2 && p.text.length < 200) {
          // Only treat as sub-heading if it's relatively short (heading-like)
          const nextPara = paragraphs[j + 1];
          if (!nextPara || nextPara.text.length > 20) {
            subHeadings.push({ title: p.text.trim(), level: numLevel, index: j });
            continue;
          }
        }
      }

      if (p.text.length > 2) bodyParts.push(p.text);
    }

    const body = bodyParts.join('\n\n').trim();

    // ---- Step 7: Build subsections with Heading 3 (sub-subsection) support ----
    const subsections = buildSubsections(paragraphs, subHeadings, start, end);

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

/**
 * Build subsection hierarchy from sub-heading positions.
 * Supports both level 2 (subsections) and level 3 (sub-subsections).
 */
function buildSubsections(
  paragraphs: Paragraph[],
  subHeadings: Array<{ title: string; level: number; index: number }>,
  chapterStart: number,
  chapterEnd: number
): Array<{ title: string; body: string }> {
  if (subHeadings.length === 0) return [];

  // Only use level 2 and level 3 headings
  const relevantSubs = subHeadings.filter(s => s.level === 2 || s.level === 3);
  if (relevantSubs.length === 0) return [];

  const result: Array<{ title: string; body: string }> = [];

  for (let i = 0; i < relevantSubs.length; i++) {
    const sub = relevantSubs[i];
    const subStart = sub.index + 1;
    const subEnd = i + 1 < relevantSubs.length ? relevantSubs[i + 1].index : chapterEnd;

    const parts: string[] = [];
    for (let k = subStart; k < subEnd; k++) {
      const pp = paragraphs[k];
      // Skip any heading-styled paragraphs
      if (pp.style && /^heading\s*\d+$/i.test(pp.style)) continue;
      parts.push(pp.text);
    }

    const body = parts.join('\n\n').trim();
    if (body.length > 0) {
      result.push({
        title: sub.title,
        body: body.slice(0, 2000),
      });
    }
  }

  return result.slice(0, 12); // Cap at 12 subsections total
}

// ---- Enhancement #6: Content Quality Post-Processing ----

/**
 * Post-process extracted chapters for quality:
 * - Remove empty chapters (body word count < 15)
 * - Clean up page numbers, header/footer artifacts
 * - Deduplicate chapters with very similar titles
 * - Strip "Figure X:", "Table X:" prefixes from body content
 */
function postProcessChapters(chapters: ExtractedChapter[]): ExtractedChapter[] {
  if (chapters.length === 0) return chapters;

  // Step 1: Strip artifacts from body content
  const cleaned = chapters.map(ch => ({
    ...ch,
    body: cleanBodyArtifacts(ch.body),
    subsections: ch.subsections.map(sub => ({
      ...sub,
      body: cleanBodyArtifacts(sub.body),
    })),
  }));

  // Step 2: Remove empty chapters (body word count < 15)
  const nonEmpty = cleaned.filter(ch => {
    const wordCount = ch.body.split(/\s+/).filter(w => w.length > 0).length;
    return wordCount >= 15;
  });

  // Step 3: Deduplicate chapters with very similar titles
  const deduped = deduplicateChapterTitles(nonEmpty);

  // Step 4: Re-number order after filtering
  return deduped.map((ch, i) => ({
    ...ch,
    order: i,
  }));
}

/**
 * Clean common artifacts from body text:
 * - Page numbers (standalone numbers at start/end of lines)
 * - Header/footer artifacts (repeated short text)
 * - "Figure X:", "Table X:" prefixes
 */
function cleanBodyArtifacts(body: string): string {
  if (!body) return body;

  let cleaned = body;

  // Strip "Figure X:" and "Table X:" prefixes from body lines
  cleaned = cleaned.replace(/^[ \t]*(?:Figure|Fig\.?|Table)\s+\d+[:.]\s*/gim, '');

  // Remove standalone page number lines (e.g., a line that is just a number)
  cleaned = cleaned.replace(/\n\s*\d{1,4}\s*\n/g, '\n');

  // Remove common header/footer artifact patterns
  // Repeated short lines at start/end that look like running headers
  const lines = cleaned.split('\n');
  if (lines.length > 10) {
    // Check if the first few lines are very short and repeated
    const firstLines = lines.slice(0, 3);
    const avgFirstLen = firstLines.reduce((s, l) => s + l.trim().length, 0) / firstLines.length;
    if (avgFirstLen < 10 && avgFirstLen > 0) {
      // Check if same text appears at end
      const lastLines = lines.slice(-3);
      const firstText = firstLines.map(l => l.trim()).join(' ');
      const lastText = lastLines.map(l => l.trim()).join(' ');
      if (firstText === lastText || similarity(firstText, lastText) > 0.8) {
        // Remove header/footer artifacts
        cleaned = lines.slice(3, -3).join('\n');
      }
    }
  }

  // Remove "Chapter X" prefix artifacts in body
  cleaned = cleaned.replace(/^[ \t]*Chapter\s+\d+[.:]\s*/gim, '');

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Deduplicate chapters whose titles are very similar (e.g., "Introduction" vs "1. Introduction").
 * Keeps the chapter with more body content.
 */
function deduplicateChapterTitles(chapters: ExtractedChapter[]): ExtractedChapter[] {
  if (chapters.length <= 1) return chapters;

  const kept: ExtractedChapter[] = [];
  const normalizedTitles: string[] = [];

  for (const ch of chapters) {
    const normalized = normalizeChapterTitle(ch.title);

    // Check if a very similar title already exists
    const existingIdx = normalizedTitles.findIndex(nt => {
      // Exact match
      if (nt === normalized) return true;
      // Check if one is a numbered version of the other
      // e.g., "Introduction" vs "1. Introduction" or "Introduction" vs "Chapter 1: Introduction"
      const strippedNt = nt.replace(/^\d+(?:\.\d+)*\s+/, '').replace(/^chapter\s+\d+[:.]\s*/i, '').trim();
      const strippedNorm = normalized.replace(/^\d+(?:\.\d+)*\s+/, '').replace(/^chapter\s+\d+[:.]\s*/i, '').trim();
      if (strippedNt === strippedNorm && strippedNt.length > 3) return true;
      // Simple word overlap for near-duplicates
      if (wordOverlap(strippedNt, strippedNorm) > 0.85 && strippedNt.length > 5) return true;
      return false;
    });

    if (existingIdx !== -1) {
      // Keep the one with more body content
      if (ch.body.length > kept[existingIdx].body.length) {
        kept[existingIdx] = ch;
      }
    } else {
      kept.push(ch);
      normalizedTitles.push(normalized);
    }
  }

  return kept;
}

/**
 * Normalize a chapter title for comparison.
 */
function normalizeChapterTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^\d+(?:\.\d+)*\s+/, '')     // Remove leading numbers: "1. " → ""
    .replace(/^chapter\s+\d+[:.]\s*/i, '')  // Remove "Chapter 1:" prefix
    .replace(/[^\w\s]/g, '')                // Remove punctuation
    .replace(/\s+/g, ' ')                  // Normalize whitespace
    .trim();
}

/**
 * Calculate word overlap ratio between two strings (0-1).
 */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

/**
 * Simple string similarity (0-1) based on character n-gram overlap.
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const len = Math.max(a.length, b.length);
  if (len === 0) return 1;
  // Quick check: if lengths are very different, similarity is low
  if (Math.abs(a.length - b.length) / len > 0.5) return 0.2;
  // Character bigram overlap
  const bigramsA = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  const bigramsB = new Set<string>();
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));
  let overlap = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) overlap++;
  }
  return overlap / Math.max(bigramsA.size, bigramsB.size);
}

// ---- TOC Helper Functions ----

/**
 * Normalize a TOC title for matching against document headings.
 */
function normalizeTocTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Find a TOC entry that matches a heading title.
 */
function findTocMatch(title: string, tocEntries: TocEntry[]): TocEntry | undefined {
  const normalized = normalizeTocTitle(title);
  // Strip leading numbers for comparison
  const stripped = normalized.replace(/^\d+(?:\.\d+)*\s+/, '');

  return tocEntries.find(toc => {
    const tocNorm = normalizeTocTitle(toc.title);
    const tocStripped = tocNorm.replace(/^\d+(?:\.\d+)*\s+/, '');
    return tocNorm === normalized || tocStripped === stripped;
  });
}

/**
 * Find a paragraph in the document that matches a TOC title.
 * Uses fuzzy matching to handle minor formatting differences.
 */
function findParagraphByTitle(paragraphs: Paragraph[], tocTitle: string): number {
  const normalizedToc = normalizeTocTitle(tocTitle);
  const strippedToc = normalizedToc.replace(/^\d+(?:\.\d+)*\s+/, '');

  for (let i = 0; i < Math.min(paragraphs.length, 500); i++) {
    const p = paragraphs[i];
    const normalized = normalizeTocTitle(p.text);
    const stripped = normalized.replace(/^\d+(?:\.\d+)*\s+/, '');

    if (normalized === normalizedToc) return i;
    if (stripped === strippedToc && strippedToc.length > 3) return i;

    // Fuzzy match for minor differences (spaces, punctuation)
    if (strippedToc.length > 5 && wordOverlap(stripped, strippedToc) > 0.9) return i;
  }

  return -1;
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
