// ============================================================
// ThesisForge Import — PDF Importer
// Parses PDF files using pdfjs-dist to extract thesis metadata,
// chapters, and references from PDF text content.
//
// v5.8 fix: Safe GlobalWorkerOptions resolution (never assign to module namespace).
// Content intelligence fallbacks, enhanced abstract/title/author/
// reference extraction, IMRAD chapter fallback, paragraph-block fallback.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';
import { parseReferencesFromText } from './texImporter';
import {
  extractTitleSmart,
  extractAuthorsSmart,
  extractAbstractSmart,
  extractKeywordsSmart,
  extractYearSmart,
  extractInstitutionSmart,
  extractSupervisorSmart,
  deduplicateReferences,
  classifyReferenceType,
} from './contentIntelligence';
import { cleanLine as ciCleanLine } from './textUtils';

// ============================================================
// Types for font-size aware extraction
// ============================================================

/** Font size data for a single text line on a page. */
interface FontSizeLine {
  text: string;
  fontSize: number;
  y: number;
}

/** Per-page extraction result including font size information. */
interface PageExtractData {
  text: string;
  fontSizeLines: FontSizeLine[];
}

/** Static flag — set the workerSrc exactly once per session. */
let _workerConfigured = false;
/** Whether the worker was actually configured (vs fell back to main thread). */
let _workerAvailable = false;

/**
 * Configure the pdfjs-dist web worker exactly once.
 * Must be called before the first getDocument() call.
 *
 * v5.8 FIX: In pdfjs-dist v5 ESM, GlobalWorkerOptions is a read-only named export
 * on the module namespace object. You CANNOT assign a new object to it.
 * Instead, we access the existing object and set its .workerSrc property.
 * If even that fails (frozen object), we fall back to main-thread PDF parsing.
 */
async function ensureWorkerConfigured() {
  if (_workerConfigured) return;

  // Dynamic import — avoid SSR issues with pdfjs-dist.
  const pdfjsLib = await import('pdfjs-dist');

  // In pdfjs-dist v5, GlobalWorkerOptions is a named export (an object with a
  // writable workerSrc property). The module namespace object itself is read-only,
  // but the exported object is mutable. We just need to find it.
  const candidatePaths = [
    pdfjsLib.GlobalWorkerOptions,
    (pdfjsLib as any).default?.GlobalWorkerOptions,
  ];

  let gwo: any = null;
  for (const candidate of candidatePaths) {
    // v5.9 FIX: In pdfjs-dist v5, GlobalWorkerOptions is a *class* (typeof === 'function'),
    // not a plain object. The previous check `typeof candidate === 'object'` rejected it,
    // so gwo was never set, workerSrc was never configured, and pdfjs threw
    // "No GlobalWorkerOptions.workerSrc specified."
    if (candidate && (typeof candidate === 'object' || typeof candidate === 'function') && 'workerSrc' in candidate) {
      gwo = candidate;
      break;
    }
  }

  if (gwo) {
    try {
      // Use absolute URL for Next.js — relative paths can fail in some deployment configs
      const workerUrl = typeof window !== 'undefined'
        ? new URL('/pdf.worker.min.mjs', window.location.origin).href
        : '/pdf.worker.min.mjs';
      gwo.workerSrc = workerUrl;
      gwo.isEvalSupported = false;
      _workerAvailable = true;
      console.log('[pdfImporter] PDF worker configured:', workerUrl);
    } catch (err) {
      // workerSrc may be frozen/read-only in some edge-case environments.
      // pdfjs will fall back to main-thread (fake worker) parsing.
      console.warn('[pdfImporter] GlobalWorkerOptions.workerSrc is read-only; using main-thread PDF parsing:', err);
    }
  } else {
    // GlobalWorkerOptions not accessible on any candidate path.
    // DO NOT try to create and assign it to the module — that crashes.
    // pdfjs will silently fall back to main-thread parsing.
    console.warn('[pdfImporter] GlobalWorkerOptions not found on module; using main-thread PDF parsing');
  }

  _workerConfigured = true;
}

// ============================================================
// Public API
// ============================================================

export async function importPDF(file: File): Promise<ImportResult> {
  // Ensure the worker is configured before any PDF operation
  await ensureWorkerConfigured();

  // Re-import after worker is set so getDocument picks it up
  const { getDocument } = await import('pdfjs-dist');

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Build getDocument options. Worker config is handled via GlobalWorkerOptions
    // in ensureWorkerConfigured(). If the worker was not configurable, pdfjs
    // silently falls back to main-thread (fake worker) parsing.
    const docOptions: Record<string, any> = {
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableAutoFetch: false,
    };

    const pdf = await getDocument(docOptions).promise;

    // ---- PDF Document Metadata (highest confidence) ----
    const pdfDocMetadata = await extractPDFDocumentMetadata(pdf);

    // ---- Text Extraction ----
    // Strategy: Extract text per page using TextItem positions.
    // For each page, we join text items with a space UNLESS the item
    // has a significant x-offset (indicating a new column or line break).
    // Also collect font size data for heading detection.
    const BATCH_SIZE = 10;
    const pages: string[] = new Array(pdf.numPages);
    const pageDataArray: PageExtractData[] = new Array(pdf.numPages) as any;

    for (let batch = 0; batch < pdf.numPages; batch += BATCH_SIZE) {
      const end     = Math.min(batch + BATCH_SIZE, pdf.numPages);
      const indices = Array.from({ length: end - batch }, (_, i) => batch + i + 1);

      const batchData = await Promise.all(
        indices.map(async (pageNum) => {
          const page    = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          return extractTextFromItemsWithFontInfo(content.items as Array<any>);
        })
      );

      batchData.forEach((data, i) => {
        pages[batch + i] = data.text;
        (pageDataArray as any)[batch + i] = data;
      });
    }

    const fullText = pages.join('\n\n--- PAGE BREAK ---\n\n');

    // ---- Page Header/Footer Detection ----
    const { headers, footers } = detectHeadersFooters(pageDataArray as PageExtractData[]);

    // ---- Extraction Pipeline ----
    // Extract metadata from first 10 pages (expanded for longer front-matter)
    const frontPages  = pages.slice(0, Math.min(10, pages.length)).join('\n\n');
    const metadata    = extractMetadataFromPDFText(frontPages, fullText);

    // Enhance metadata with content intelligence fallbacks
    const enhancedMetadata = enhanceMetadataWithIntelligence(metadata, frontPages, fullText);

    // Overlay PDF document metadata as HIGHEST confidence source
    const pdfOverlaidMetadata = overlayPDFDocumentMetadata(enhancedMetadata, pdfDocMetadata);

    // Extract chapters — try standard patterns first, then IMRAD, then paragraph blocks, then font-size
    let chapters = extractChaptersFromPDFText(fullText);

    // Fallback 1: IMRAD detection
    if (chapters.length === 0) {
      const ciChapters = extractChaptersByContentIntelligence(fullText);
      if (ciChapters.length > 0) chapters = ciChapters;
    }

    // Fallback 2: Paragraph-level segmentation (for PDFs with no clear headings)
    if (chapters.length === 0) {
      const paraChapters = extractChaptersByParagraphBlocks(fullText);
      if (paraChapters.length > 0) chapters = paraChapters;
    }

    // Fallback 3: Font-size based heading detection
    if (chapters.length === 0) {
      const fontChapters = extractChaptersByFontSize(fullText, pageDataArray as PageExtractData[]);
      if (fontChapters.length > 0) chapters = fontChapters;
    }

    // ---- Chapter Body Content Improvement ----
    // Clean chapter bodies: remove running headers/footers and page numbers
    chapters = chapters.map(ch => ({
      ...ch,
      body: cleanChapterBody(ch.body, headers, footers),
    }));

    // Extract references — scan the FULL text for best coverage
    // Reference sections can appear anywhere (not just last pages)
    let references    = extractReferencesFromPDFText(fullText, fullText);

    // Apply deduplication and type classification to references
    if (references.length > 0) {
      references = deduplicateReferences(references);
      references = references.map(ref => ({
        ...ref,
        type: classifyReferenceType(ref),
      }));
    }

    // ---- Content Intelligence Post-Processing ----
    const { metadata: validatedMetadata, chapters: validatedChapters, warnings: validationWarnings } =
      validateAndCleanExtractedData(pdfOverlaidMetadata, chapters);

    const detectedTemplate = detectTemplate(validatedMetadata, validatedChapters);
    const baseConfidence   = scoreConfidence({ metadata: validatedMetadata, chapters: validatedChapters, references });

    // NOTE: Source format boost is applied centrally in index.ts for ALL formats.
    // Do NOT apply it here — that would cause a double-boost (pdfImporter * index.ts).
    const confidence = baseConfidence;

    return {
      source:          'pdf',
      fileName:        file.name,
      metadata:        validatedMetadata,
      chapters:        validatedChapters,
      references,
      newcommands:     [],
      detectedTemplate,
      confidence,
      warnings:        [...generatePDFWarnings({ metadata: validatedMetadata, chapters: validatedChapters, references }), ...validationWarnings],
      parseErrors:     [],
    };
  } catch (err: any) {
    const msg = err?.message ?? 'Unknown error during PDF parsing';
    // If it's our own error, re-throw directly
    if (msg.includes('PDF.js library could not be initialised')) {
      throw err;
    }
    throw new Error(
      `PDF import failed for "${file.name}": ${msg}`,
      { cause: err },
    );
  }
}

// ============================================================
// Text Extraction — position-aware item joining
// ============================================================

/**
 * Join TextItem.str values with spacing-aware logic.
 * PDF text items have x/y positions. When two consecutive items
 * are on the same line (similar y) but far apart in x, we insert
 * a space. When they're on different lines (different y), we insert
 * a newline. This produces much cleaner output than naive `.join(' ')`.
 *
 * ENHANCEMENT: If position-aware extraction yields fewer than 5 words
 * but the page has 3+ items, fall back to simple `.join(' ')`.
 */
function extractTextFromItems(items: Array<any>): string {
  if (!items || items.length === 0) return '';

  const result = extractTextFromItemsPositionAware(items);

  // Fallback: if position-aware extraction yields fewer than 5 words
  // but the page has 3+ items, fall back to simple join
  if (items.length >= 3 && result.split(/\s+/).filter(w => w.length > 0).length < 5) {
    const simpleJoin = items
      .map((item: any) => (item.str ?? ''))
      .filter((s: string) => s.length > 0)
      .join(' ')
      .trim();
    if (simpleJoin.split(/\s+/).length >= 5) {
      return simpleJoin;
    }
  }

  return result;
}

/**
 * Core position-aware text extraction logic.
 */
function extractTextFromItemsPositionAware(items: Array<any>): string {
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  let lastX: number | null = null;

  for (const item of items) {
    const str = item.str;
    if (str === undefined || str === null) continue;
    if (str === ' ') {
      // Explicit space item — treat as inter-word gap
      if (lastX !== null) currentLine += ' ';
      continue;
    }

    const y = item.transform ? item.transform[5] : null;
    const x = item.transform ? item.transform[4] : null;

    if (y !== null && lastY !== null) {
      const yDiff = Math.abs(y - lastY);
      // If y changed significantly, this is a new line
      if (yDiff > 2) {
        if (currentLine.trim()) lines.push(currentLine.trimEnd());
        currentLine = str;
      } else {
        // Same line — add space between items if there's a gap
        if (x !== null && lastX !== null) {
          const xGap = Math.abs(x - lastX);
          if (xGap > 3 && currentLine.length > 0 && !currentLine.endsWith(' ')) {
            currentLine += ' ';
          }
        } else if (currentLine.length > 0 && !currentLine.endsWith(' ')) {
          currentLine += ' ';
        }
        currentLine += str;
      }
    } else {
      // First item or no position info
      currentLine += str;
    }

    if (y !== null) lastY = y;
    if (x !== null) lastX = x + (str.length * 6); // Estimate next x position
  }

  if (currentLine.trim()) lines.push(currentLine.trimEnd());

  // Merge very short fragments into the previous line
  const merged: string[] = [];
  for (const line of lines) {
    if (line.length < 3 && merged.length > 0) {
      merged[merged.length - 1] += ' ' + line;
    } else {
      merged.push(line);
    }
  }

  return merged.join('\n');
}

// ============================================================
// Metadata Extraction
// ============================================================

function extractMetadataFromPDFText(frontMatter: string, fullText: string) {
  const meta: Record<string, any> = {};

  // Title detection — 12 strategies with expanded patterns
  const titlePatterns = [
    // "Title\nby Author" or "Title\nsubmitted by ..."
    /^(.{10,120})\n(?:by|submitted by|a thesis|a dissertation)/im,
    // ALL CAPS title (at least 15 chars of uppercase)
    /^([A-Z][A-Z\s:–—]{15,120})\n/m,
    // "Title\nby Author" with shorter title
    /\n([A-Z][a-zA-Z\s:–—]{10,100})\n(?:by|author)/im,
    // "Thesis Title:" or "Title:" label
    /(?:thesis\s+title|title|document\s+title)[:\s]+([^\n]{10,150})/i,
    // Long line before institution name
    /^([A-Z][a-zA-Z\s:–—,]{20,120})\n(?:[A-Z][a-z]+\s+(?:University|College|Institute))/m,
    // Title in quotes
    /["\u201C]([A-Z][^\u201D"]{15,120})["\u201D]/,
    // Centered-looking line (short, alone on line, mixed case)
    /\n([A-Z][a-zA-Z\s:–—',]{15,100})\n\n/m,
    // "entitled: Title" pattern
    /(?:entitled|title)\s*[:]\s*([^\n]{10,150})/i,
    // Title ending with period before degree keywords
    /^([A-Z][a-zA-Z\s:–—',]{10,120})\.\s*\n(?:.*(?:thesis|dissertation|degree))/im,
    // ALL CAPS author on next line pattern: "ALL CAPS TITLE\nFIRST LAST" where next line is short & ALL CAPS
    /^([A-Z][A-Z\s:–—&']{15,120})\n\s*([A-Z][A-Z\s]{3,30})\n/m,
    // "thesis by: Title" pattern
    /(?:thesis|dissertation)\s+by\s*[:]\s*\n?\s*([^\n]{10,150})/i,
    // Title after "A Thesis" line
    /\n\s*(?:a|an)\s+(?:thesis|dissertation)\s*\n\s*([^\n]{10,150})/i,
    // Title ending with period before "A thesis/dissertation" (high confidence)
    /^([A-Z][^\n]{10,150}?)\.\s*\n\s*(?:a\s+|an\s+)?(?:thesis|dissertation)\b/im,
    // Title in quotes followed by author on next line
    /["\u201C]([A-Z][^\u201D\"]{15,150})["\u201D]\s*\n\s*(?:by|submitted by)\s/im,
    // Multi-line title before "by" (2-3 lines followed by blank line and "by")
    /\n([A-Z][^\n]{10,120}\n(?:[^\n]{5,120}\n){0,2})\s*\n\s*by\s/im,
    // Title with institution in running header (heavily indented)
    /\n\s{4,}([A-Z][A-Za-z\s:–—',.]{10,100})\s{4,}\n/m,
  ];
  for (const p of titlePatterns) {
    const m = frontMatter.match(p);
    if (m) { meta.title = cleanLine(m[1]); break; }
  }

  // Author detection — 8 strategies
  const authorPatterns = [
    /\bby\s+([A-Z][a-z]+ (?:[A-Z]\.? )?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
    /\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/i,
    /\bauthor[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\bsubmitted by\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\b(?:candidate|student)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
    // "Author: FirstName I. LastName" pattern
    /\bauthor[:\s]+([A-Z][a-z]+\s+[A-Z]\.(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+)/i,
    // "Presented by" pattern
    /\bpresented by\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    // "thesis by" pattern
    /\bthesis\s+by\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  for (const p of authorPatterns) {
    const m = frontMatter.match(p);
    if (m) { meta.author = cleanLine(m[1]); break; }
  }

  // Institution — expanded patterns
  const instPatterns = [
    /\b((?:university|college|institute|schule|hochschule) of [A-Z][a-zA-Z\s,]+)/i,
    /\b([A-Z][a-zA-Z]+ (?:university|college|institute|schule|hochschule))\b/i,
    /\b((?:department|faculty|school) of [A-Z][a-zA-Z\s,]+ at [A-Z][a-zA-Z\s,]+)/i,
  ];
  for (const p of instPatterns) {
    const m = frontMatter.match(p);
    if (m) { meta.institution = cleanLine(m[1]); break; }
  }

  // Supervisor — expanded patterns
  const supPatterns = [
    /(?:supervisor|adviser|advisor|supervised by)[:\s]+([A-Z][a-z.]+(?:\s+[A-Z][a-z.]+){1,4})/i,
    /(?:principal\s+investigator|pi)[:\s]+([A-Z][a-z.]+(?:\s+[A-Z][a-z.]+){1,3})/i,
    /(?:supervisor|advisor)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
  ];
  for (const p of supPatterns) {
    const m = frontMatter.match(p);
    if (m) { meta.supervisor = cleanLine(m[1]); break; }
  }

  // Department
  const deptMatch = frontMatter.match(
    /(?:department|dept)[:\s]+([A-Z][a-zA-Z\s&]{5,60})/i
  );
  if (deptMatch) meta.department = cleanLine(deptMatch[1]);

  // Faculty
  const facultyMatch = frontMatter.match(
    /(?:faculty|school)\s+of\s+([A-Z][a-zA-Z\s&]{5,60})/i
  );
  if (facultyMatch) meta.faculty = cleanLine(facultyMatch[1]);

  // Year — prefer a 4-digit year in the front matter
  const yearPatterns = [
    /\b((?:19|20)\d{2})\b/,
    /(?:year|date|published)[:\s]+((?:19|20)\d{2})/i,
  ];
  for (const p of yearPatterns) {
    const m = frontMatter.match(p);
    if (m) { meta.year = m[1]; break; }
  }

  // Degree detection — expanded patterns
  const degreePatterns = [
    { pattern: /doctor of philosophy|ph\.?d\s*(?:thesis|dissertation)?/i,    abbrev: 'phd',      full: 'Doctor of Philosophy' },
    { pattern: /doctor(?:al)?\s+(?:of )?science|d\.?sc/i,                 abbrev: 'phd',      full: 'Doctor of Science' },
    { pattern: /master of science|m\.?s\.?c/i,                             abbrev: 'master',   full: 'Master of Science' },
    { pattern: /master of arts|m\.?a\b/i,                                  abbrev: 'master',   full: 'Master of Arts' },
    { pattern: /master(?:'s)?\s+thesis/i,                                  abbrev: 'master',   full: "Master's Thesis" },
    { pattern: /bachelor of science|b\.?s\.?c/i,                           abbrev: 'bachelor', full: 'Bachelor of Science' },
    { pattern: /bachelor of engineering|b\.?eng/i,                         abbrev: 'bachelor', full: 'Bachelor of Engineering' },
    { pattern: /bachelor(?:'s)?\s+thesis/i,                                abbrev: 'bachelor', full: "Bachelor's Thesis" },
  ];
  for (const { pattern, abbrev, full } of degreePatterns) {
    if (pattern.test(frontMatter)) {
      meta.degreeAbbrev = abbrev;
      meta.degree = full;
      break;
    }
  }

  // Abstract — multiple strategies with relaxed thresholds
  // 1. Standalone "Abstract" heading followed by content
  const abstractMatch = fullText.match(
    /\babstract\b\s*\n+([\s\S]{30,3000}?)(?:\n{2,}|\n(?:chapter|1[\.\s]|introduction|keywords?\b))/i
  );
  if (abstractMatch) {
    meta.abstract = cleanParagraph(abstractMatch[1]);
  }

  // 2. Fallback: "Summary" heading as alternate pattern
  if (!meta.abstract) {
    const summaryMatch = fullText.match(
      /\bsummary\b\s*\n+([\s\S]{30,3000}?)(?:\n{2,}|\n(?:chapter|1[\.\s]|introduction|keywords?\b|conclusion))/i
    );
    if (summaryMatch) {
      meta.abstract = cleanParagraph(summaryMatch[1]);
    }
  }

  // 3. Fallback: inline "Abstract: Text..." format
  if (!meta.abstract) {
    const inlineMatch = fullText.match(/\bAbstract[:\s]{1,3}([\s\S]{30,3000}?)(?:\n{3,}|1[\.\s]|introduction|chapter)/i);
    if (inlineMatch && inlineMatch[1].split(' ').length > 10) {
      meta.abstract = cleanParagraph(inlineMatch[1]).slice(0, 3000);
    }
  }

  // 4. Fallback: Look for a paragraph after "Abstract" on the same line
  if (!meta.abstract) {
    const sameLineMatch = fullText.match(/\bAbstract\s*[-–—:]\s*([\s\S]{30,3000}?)(?:\n{3,}|1[\.\s]|Introduction|Chapter)/i);
    if (sameLineMatch && sameLineMatch[1].split(' ').length > 10) {
      meta.abstract = cleanParagraph(sameLineMatch[1]).slice(0, 3000);
    }
  }

  // 5. Final fallback: find a substantial paragraph (80-500 words) in the first 3 pages
  if (!meta.abstract) {
    // Use frontMatter (already contains first 8 pages of text) for abstract fallback
    const first3PagesText = frontMatter.length > 200 ? frontMatter : '';
    if (first3PagesText) {
      const paragraphs = first3PagesText.split(/\n{2,}/).filter(p => p.trim().length > 0);
      for (const para of paragraphs) {
        const wordCount = para.split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount >= 80 && wordCount <= 500) {
          meta.abstract = cleanParagraph(para).slice(0, 3000);
          break;
        }
      }
    }
  }

  // Keywords — multiple strategies with expanded patterns
  const keywordPatterns = [
    /\bkeywords?[:\s]+([^\n.]{20,300})/i,
    /\bkey\s+words?[:\s]+([^\n.]{20,300})/i,
    /\bindexing\s+terms?[:\s]+([^\n.]{20,300})/i,
    /\bkeywords?\s*[:：]\s*([^\n]{10,300})\s*[;，]/,    // "Keywords:" with semicolons
    /\bsubject\s+terms?[:\s]+([^\n.]{20,300})/i,         // "Subject terms:"
  ];
  for (const p of keywordPatterns) {
    const m = fullText.match(p);
    if (m) {
      meta.keywords = m[1]
        .split(/[,;·•|]/)
        .map(k => k.replace(/\b(and|or|the|a|an)\b/gi, '').trim())
        .filter(k => k.length > 2 && k.length < 60);
      if (meta.keywords.length >= 2) break;
    }
  }

  return meta;
}

// ============================================================
// Enhanced Metadata with Content Intelligence
// ============================================================

/**
 * Use contentIntelligence smart extractors as fallbacks for any
 * missing metadata fields after basic extraction.
 */
function enhanceMetadataWithIntelligence(
  meta: Record<string, any>,
  frontMatter: string,
  fullText: string,
): Record<string, any> {
  const enhanced = { ...meta };

  // Title fallback
  if (!enhanced.title) {
    const smartTitle = extractTitleSmart(frontMatter);
    if (smartTitle) enhanced.title = smartTitle;
  }

  // Author fallback
  if (!enhanced.author) {
    const smartAuthors = extractAuthorsSmart(frontMatter);
    if (smartAuthors.length > 0) enhanced.author = smartAuthors[0];
  }

  // Abstract fallback
  if (!enhanced.abstract) {
    const smartAbstract = extractAbstractSmart(fullText);
    if (smartAbstract) enhanced.abstract = smartAbstract;
  }

  // Keywords fallback
  if (!enhanced.keywords || enhanced.keywords.length < 2) {
    const smartKeywords = extractKeywordsSmart(fullText, enhanced);
    if (smartKeywords.length > (enhanced.keywords?.length ?? 0)) {
      enhanced.keywords = smartKeywords;
    }
  }

  // Year fallback
  if (!enhanced.year) {
    const smartYear = extractYearSmart(frontMatter);
    if (smartYear) enhanced.year = smartYear;
  }

  // Institution fallback
  if (!enhanced.institution) {
    const smartInst = extractInstitutionSmart(frontMatter);
    if (smartInst) enhanced.institution = smartInst;
  }

  // Supervisor fallback
  if (!enhanced.supervisor) {
    const smartSup = extractSupervisorSmart(frontMatter);
    if (smartSup) enhanced.supervisor = smartSup;
  }

  return enhanced;
}

// ============================================================
// Chapter Extraction
// ============================================================

function extractChaptersFromPDFText(fullText: string): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];

  // Chapter detection patterns — expanded and refined
  const CHAPTER_PATTERNS = [
    // Standard: "Chapter 1: Introduction" / "CHAPTER ONE Introduction"
    /\n(?:chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[\s:.—–]+([^\n]{3,100})|\bCHAPTER\s+(?:\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE)[\s:.—–]+([^\n]{3,100}))/gi,
    // Roman numeral: "I. Introduction", "II. Methods", "III. Results"
    // Careful: only match Roman numerals that are standalone on a line
    /\n(?:I{1,3}V?I{0,2}|IV|VI{0,3}|IX|X{1,3}V?I{0,2})\.\s+([A-Z][A-Za-z\s&:–—]{4,80})\n/gi,
    // ALL CAPS standalone: "INTRODUCTION", "LITERATURE REVIEW", "METHODOLOGY"
    /\n([A-Z][A-Z\s&'–—]{8,60})\n/g,
    // Numbered sections: "1. Introduction", "2. Methods"
    /\n(\d{1,2})\.\s+([A-Z][A-Za-z\s&:–—]{5,80})\n/g,
    // "Section N: Title" pattern
    /\n(?:section|sect\.?)\s+(\d{1,2})[\s:.—–]+([A-Z][A-Za-z\s&:–—]{5,80})\n/gi,
  ];

  const matches: Array<{ title: string; index: number }> = [];

  // Try all chapter patterns, collect unique matches
  for (const pattern of CHAPTER_PATTERNS) {
    let m;
    // Reset lastIndex for safety (regex might have state from prior exec)
    pattern.lastIndex = 0;
    while ((m = pattern.exec(fullText)) !== null) {
      // Extract the title from whichever capture group matched
      let title = (m[1] || m[2] || '').trim();
      if (!title) continue;

      // For numbered section patterns (group 1 is the number), combine
      if (pattern.source.includes('section|sect') && m[1] && m[2]) {
        title = `${m[1]}. ${m[2]}`.trim();
      }

      // Skip non-content headings
      if (/^(contents|figures|tables|references|bibliography|appendix|list of|table of|acknowledg|dedication|abstract|declaration|abbreviations?|nomenclature|glossary|notation)/i.test(title)) continue;

      // Skip if we already have a match very close to this position (avoid duplicates)
      const matchEnd = m.index + m[0].length;
      const isDuplicate = matches.some(
        existing => Math.abs(existing.index - matchEnd) < 80
      );
      if (!isDuplicate) {
        matches.push({ title: cleanLine(title), index: matchEnd });
      }
    }
  }

  // Sort by position in the text
  matches.sort((a, b) => a.index - b.index);

  // De-duplicate titles that are very similar (Levenshtein-like)
  const deduped: typeof matches = [];
  for (const match of matches) {
    const isSimilar = deduped.some(
      existing => existing.title.toLowerCase() === match.title.toLowerCase()
        || (existing.title.length > 5 && match.title.length > 5
            && (existing.title.toLowerCase().includes(match.title.toLowerCase())
                || match.title.toLowerCase().includes(existing.title.toLowerCase())))
    );
    if (!isSimilar) deduped.push(match);
  }

  // Build chapters with body content between matches
  for (let i = 0; i < deduped.length; i++) {
    const start = deduped[i].index;
    const end   = i + 1 < deduped.length ? deduped[i + 1].index : fullText.length;
    const rawBody = fullText.slice(start, end);
    const body  = cleanParagraph(rawBody).slice(0, 50000);

    // Require minimum content
    if (body.split(' ').length < 15) continue;

    chapters.push({
      title:       deduped[i].title,
      body,
      order:       i,
      level:       'chapter',
      subsections: extractSubsections(body),
    });
  }

  // If no chapters found but the text is long, try paragraph-level segmentation
  if (chapters.length === 0 && fullText.split(' ').length > 500) {
    const fallback = extractChaptersByParagraphBlocks(fullText);
    if (fallback.length > 0) {
      chapters.push(...fallback);
    }
  }

  return chapters;
}

/**
 * Fallback chapter extraction: split text into blocks by large paragraph breaks
 * and treat top-level blocks as chapters if they have headings.
 */
function extractChaptersByParagraphBlocks(fullText: string): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];
  // Split by double+ newline
  const blocks = fullText.split(/\n{3,}/).filter(b => b.trim().length > 100);

  for (let i = 0; i < blocks.length && chapters.length < 10; i++) {
    const block = blocks[i].trim();
    const lines = block.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 3) continue;

    // Use the first line as title if it looks like a heading
    const firstLine = lines[0].trim();
    const isHeading = firstLine.length <= 100 && (
      /^[A-Z]/.test(firstLine) && !firstLine.includes('.')
      || /^\d{1,2}[\.\)]/.test(firstLine)
    );

    if (isHeading) {
      const body = cleanParagraph(lines.slice(1).join('\n')).slice(0, 8000);
      if (body.split(' ').length < 15) continue;

      chapters.push({
        title:  cleanLine(firstLine),
        body,
        order:  chapters.length,
        level:  'chapter',
        subsections: extractSubsections(body),
      });
    }
  }

  return chapters;
}

function extractSubsections(body: string): Array<{ title: string; body: string }> {
  // Subsection patterns: "1.1 Title", "1.2 Title", "2.1 Title"
  const SUB_RE = /\n(\d{1,2}\.\d{1,2}\s+[A-Z][a-zA-Z\s&:–—]{4,80})\n/g;
  const subs: Array<{ title: string; body: string }> = [];
  const positions: Array<{ title: string; index: number }> = [];
  let match;

  while ((match = SUB_RE.exec(body)) !== null) {
    positions.push({ title: match[1].trim(), index: match.index + match[0].length });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end   = i + 1 < positions.length ? positions[i + 1].index : body.length;
    const subBody = cleanParagraph(body.slice(start, end));
    if (subBody.split(' ').length < 5) continue; // Skip empty subsections
    subs.push({
      title: positions[i].title,
      body:  subBody.slice(0, 4000),
    });
  }

  return subs.slice(0, 10);
}

// ============================================================
// Reference Extraction
// ============================================================

function extractReferencesFromPDFText(refPagesText: string, fullText: string): ExtractedReference[] {
  // Strategy 1: Find "References" / "Bibliography" section heading
  const refSectionPatterns = [
    /(?:^|\n)(?:references|bibliography|works?\s+(?:cited|referred))\s*\n([\s\S]+)/i,
    /(?:^|\n)\d{1,2}\.\s+(?:references|bibliography)\s*\n([\s\S]+)/i,
  ];

  for (const p of refSectionPatterns) {
    const m = refPagesText.match(p);
    if (m) {
      const refs = parseReferencesFromText(m[1]);
      if (refs.length >= 2) return refs;
    }
  }

  // Strategy 2: Try the full text (references section might not be in last pages)
  for (const p of refSectionPatterns) {
    const m = fullText.match(p);
    if (m) {
      const refs = parseReferencesFromText(m[1].slice(0, 50000)); // Cap to prevent hanging
      if (refs.length >= 2) return refs;
    }
  }

  // Strategy 3: Find numbered entries like "[1] Author..." or "1. Author..."
  const numberedRefs = refPagesText.match(
    /(?:^|\n)\s*(?:\[\d+\]|\d+\.)\s+([A-Z][^\n]{30,500})/g
  );
  if (numberedRefs && numberedRefs.length >= 2) {
    return numberedRefs.slice(0, 80).map(raw => {
      const cleaned = raw.replace(/^\s*(?:\[\d+\]|\d+\.)\s*/, '').trim();
      return {
        type: 'misc',
        raw:  cleaned,
        ...guessReferenceFields(cleaned),
      };
    });
  }

  return [];
}

function guessReferenceFields(line: string): Partial<ExtractedReference> {
  const yearMatch   = line.match(/\b((?:19|20)\d{2})\b/);
  const authorMatch = line.match(/^([A-Z][a-z]+,?\s+(?:[A-Z]\.?\s*)+(?:[A-Z][a-z]+,?)*)/);
  const titleMatch  = line.match(/"([^"]{10,200})"|'([^']{10,200})'/);
  const doiMatch    = line.match(/(?:doi|DOI)[:\s]*(10\.\d{4,}\/[^\s,]+)/);
  const urlMatch    = line.match(/(?:https?:\/\/|www\.)[^\s]+/);

  return {
    year:   yearMatch?.[1],
    author: authorMatch?.[1]?.trim(),
    title:  titleMatch?.[1] || titleMatch?.[2],
    doi:    doiMatch?.[1],
    url:    urlMatch?.[0],
  };
}

// ============================================================
// Fallback Chapter Extraction via Content Intelligence
// ============================================================

/**
 * Fallback chapter extraction using IMRAD-related keyword search.
 * When standard chapter heading detection fails, this searches for
 * common academic section headings and splits content between them.
 */
function extractChaptersByContentIntelligence(fullText: string): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];

  // IMRAD-related keywords to search for (case-insensitive)
  const sectionKeywords = [
    'Introduction',
    'Literature Review',
    'Literature Survey',
    'Background',
    'Related Work',
    'Methodology',
    'Methods',
    'Materials and Methods',
    'Experimental Methods',
    'Results',
    'Findings',
    'Analysis',
    'Discussion',
    'Conclusion',
    'Conclusions',
    'Recommendations',
    'Future Work',
    'Appendix',
  ];

  // Find positions of all section headings in the text
  const positions: Array<{ title: string; index: number; length: number }> = [];

  for (const keyword of sectionKeywords) {
    // Match as a standalone line or with common numbering prefixes
    const patterns = [
      new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.?\\s+)?${escapeRegExp(keyword)}s?\\s*[:.\\-–—]?\\s*(?:\\n|$)`, 'gim'),
      new RegExp(`(?:^|\\n)\\s*${escapeRegExp(keyword)}s?\\s*[:.\\-–—]?\\s*(?:\\n|$)`, 'gim'),
    ];

    for (const pattern of patterns) {
      let m;
      pattern.lastIndex = 0;
      while ((m = pattern.exec(fullText)) !== null) {
        const startIdx = m.index + (m[0].startsWith('\n') ? 1 : 0);
        const endIdx   = startIdx + m[0].trimEnd().length;

        // Skip if very close to an already-found position
        const isNearby = positions.some(
          p => Math.abs(p.index - startIdx) < 100
        );
        if (!isNearby) {
          positions.push({
            title:  keyword,
            index:  startIdx,
            length: endIdx - startIdx,
          });
        }
      }
    }
  }

  // Sort by position
  positions.sort((a, b) => a.index - b.index);

  // Build chapters from found positions
  for (let i = 0; i < positions.length; i++) {
    const contentStart = positions[i].index + positions[i].length;
    const contentEnd   = i + 1 < positions.length
      ? positions[i + 1].index
      : fullText.length;

    const rawBody = fullText.slice(contentStart, contentEnd);
    const body    = cleanParagraph(rawBody).slice(0, 50000);

    // Each chapter needs minimum 15 words
    if (body.split(/\s+/).filter(w => w.length > 0).length < 15) continue;

    chapters.push({
      title:       positions[i].title,
      body,
      order:       chapters.length,
      level:       'chapter',
      subsections: extractSubsections(body),
    });
  }

  return chapters;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// PDF Document Metadata Extraction
// ============================================================

/**
 * Extract PDF info dictionary metadata (Title, Author, Subject, Keywords, Creator).
 * These are HIGH-confidence sources that override regex-based extraction.
 */
async function extractPDFDocumentMetadata(pdf: any): Promise<Record<string, string>> {
  try {
    const metadataObj = await pdf.getMetadata();
    const info = metadataObj?.info;
    if (!info) return {};

    const result: Record<string, string> = {};

    if (info.Title) result.title = String(info.Title).trim();
    if (info.Author) result.author = String(info.Author).trim();
    if (info.Subject) result.subject = String(info.Subject).trim();
    if (info.Keywords) result.keywords = String(info.Keywords).trim();
    if (info.Creator) result.creator = String(info.Creator).trim();

    return result;
  } catch (err) {
    console.warn('[pdfImporter] Could not extract PDF document metadata:', err);
    return {};
  }
}

/**
 * Overlay PDF document metadata on top of regex-extracted metadata.
 * PDF info dict entries are HIGHEST priority for title and author.
 */
function overlayPDFDocumentMetadata(
  meta: Record<string, any>,
  pdfMeta: Record<string, string>,
): Record<string, any> {
  const overlaid = { ...meta };

  // Title from PDF metadata (highest priority)
  if (pdfMeta.title && pdfMeta.title.length >= 5 && pdfMeta.title.length <= 300) {
    overlaid.title = pdfMeta.title;
  }

  // Author from PDF metadata (highest priority)
  if (pdfMeta.author) {
    // Validate it looks like a name (has spaces, no numbers)
    if (/\s/.test(pdfMeta.author) && !/\d/.test(pdfMeta.author)) {
      overlaid.author = pdfMeta.author;
    }
  }

  // Subject can be used as title if no title was found
  if (pdfMeta.subject && !overlaid.title) {
    overlaid.title = pdfMeta.subject;
  }

  // Keywords from PDF metadata — supplement existing keywords
  if (pdfMeta.keywords) {
    const pdfKeywords = pdfMeta.keywords
      .split(/[,;]/)
      .map(k => k.trim())
      .filter(k => k.length > 2 && k.length < 60);
    if (pdfKeywords.length >= 2) {
      // Merge with existing keywords, dedup
      const existing = overlaid.keywords ?? [];
      const merged = [...new Set([...existing, ...pdfKeywords])];
      overlaid.keywords = merged;
    }
  }

  return overlaid;
}

// ============================================================
// Font-Size Aware Text Extraction
// ============================================================

/**
 * Extract text from PDF content items with font size information per line.
 * Used for font-size based heading detection and header/footer detection.
 */
function extractTextFromItemsWithFontInfo(items: Array<any>): PageExtractData {
  if (!items || items.length === 0) return { text: '', fontSizeLines: [] };

  // Reuse existing position-aware extraction for text output
  const text = extractTextFromItems(items);

  // Collect font size information per line in a single pass
  const fontSizeLines: FontSizeLine[] = [];
  let currentLineText = '';
  let lastY: number | null = null;
  let lineFontSizes: number[] = [];

  for (const item of items) {
    const str = item.str;
    if (str === undefined || str === null || str === ' ') continue;

    const y = item.transform ? item.transform[5] : null;
    const fontSize = item.transform ? Math.abs(item.transform[3]) : 12;

    if (y !== null && lastY !== null && Math.abs(y - lastY) > 2) {
      // New line — push the accumulated line
      if (currentLineText.trim()) {
        const avgSize = lineFontSizes.length > 0
          ? lineFontSizes.reduce((a, b) => a + b, 0) / lineFontSizes.length
          : 12;
        fontSizeLines.push({
          text: currentLineText.trim(),
          fontSize: Math.round(avgSize * 10) / 10,
          y: lastY,
        });
      }
      currentLineText = str;
      lineFontSizes = [fontSize];
    } else {
      currentLineText += (currentLineText.length > 0 ? ' ' : '') + str;
      lineFontSizes.push(fontSize);
    }

    if (y !== null) lastY = y;
  }

  // Push the final line
  if (currentLineText.trim()) {
    const avgSize = lineFontSizes.length > 0
      ? lineFontSizes.reduce((a, b) => a + b, 0) / lineFontSizes.length
      : 12;
    fontSizeLines.push({
      text: currentLineText.trim(),
      fontSize: Math.round(avgSize * 10) / 10,
      y: lastY ?? 0,
    });
  }

  return { text, fontSizeLines };
}

// ============================================================
// Page Header/Footer Detection
// ============================================================

/**
 * Detect running headers and footers by finding repeated text
 * at the top and bottom of pages across the document.
 * Headers/footers typically appear on >= 40% of pages.
 */
function detectHeadersFooters(pageDataArray: PageExtractData[]): { headers: string[]; footers: string[] } {
  if (!pageDataArray || pageDataArray.length < 3) return { headers: [], footers: [] };

  const nonEmptyPages = pageDataArray.filter(p => p && p.fontSizeLines.length > 0);
  if (nonEmptyPages.length < 3) return { headers: [], footers: [] };

  // Collect first 2 lines (by y position) and last 2 lines from each page
  const pageTops: string[][] = [];
  const pageBottoms: string[][] = [];

  for (const pageData of nonEmptyPages) {
    const lines = pageData.fontSizeLines.filter(l => l.text.trim().length > 0);
    if (lines.length === 0) continue;

    // Sort by y position (higher y = top of page in PDF coordinates)
    const sorted = [...lines].sort((a, b) => b.y - a.y);

    // First 2 lines (top of page)
    if (sorted.length >= 1) {
      pageTops.push([sorted[0].text.trim()]);
      if (sorted.length >= 2) {
        pageTops[pageTops.length - 1].push(sorted[1].text.trim());
      }
    }

    // Last 2 lines (bottom of page)
    if (sorted.length >= 1) {
      const last = sorted[sorted.length - 1].text.trim();
      const secondLast = sorted.length >= 2 ? sorted[sorted.length - 2].text.trim() : '';
      const bottom: string[] = [];
      if (secondLast) bottom.push(secondLast);
      bottom.push(last);
      pageBottoms.push(bottom);
    }
  }

  const threshold = Math.max(3, Math.ceil(nonEmptyPages.length * 0.4));
  const headers = findRepeatedStrings(pageTops, threshold);
  const footers = findRepeatedStrings(pageBottoms, threshold);

  return { headers, footers };
}

/**
 * Find strings that appear on many pages, indicating headers/footers.
 */
function findRepeatedStrings(stringArrays: string[][], minOccurrences: number): string[] {
  const frequency: Record<string, number> = {};

  for (const arr of stringArrays) {
    for (const s of arr) {
      if (s.length < 3) continue;
      const normalized = s.replace(/\s+/g, ' ').trim();
      // Skip pure numbers (likely page numbers, not headers)
      if (/^\d+$/.test(normalized)) continue;
      frequency[normalized] = (frequency[normalized] || 0) + 1;
    }
  }

  return Object.entries(frequency)
    .filter(([, count]) => count >= minOccurrences)
    .map(([text]) => text);
}

// ============================================================
// Font-Size Based Chapter Detection
// ============================================================

/**
 * Fallback chapter extraction using font size analysis.
 * Calculates the most common (mode) font size = body text.
 * Lines with font size significantly larger than body text are headings.
 */
function extractChaptersByFontSize(
  fullText: string,
  pageDataArray: PageExtractData[],
): ExtractedChapter[] {
  if (!pageDataArray || pageDataArray.length === 0) return [];

  // Collect all font sizes with their counts
  const sizeFrequency: Record<string, { count: number; totalSize: number }> = {};

  for (const pageData of pageDataArray) {
    if (!pageData) continue;
    for (const line of pageData.fontSizeLines) {
      if (line.text.trim().length < 3) continue;
      const key = String(Math.round(line.fontSize * 10) / 10);
      if (!sizeFrequency[key]) sizeFrequency[key] = { count: 0, totalSize: 0 };
      sizeFrequency[key].count++;
      sizeFrequency[key].totalSize += line.fontSize;
    }
  }

  if (Object.keys(sizeFrequency).length === 0) return [];

  // The most common font size is body text
  const bodyFontSize = Number(
    Object.entries(sizeFrequency)
      .sort((a, b) => b[1].count - a[1].count)[0]?.[0] ?? 12
  );

  const headingThreshold = bodyFontSize * 1.3;

  // Find heading-sized lines with their positions in the full text
  const headingCandidates: Array<{ text: string; fullTextIndex: number }> = [];

  for (const pageData of pageDataArray) {
    if (!pageData) continue;

    for (const line of pageData.fontSizeLines) {
      if (line.fontSize < headingThreshold) continue;
      const trimmed = line.text.trim();

      // Skip short or very long lines
      if (trimmed.length < 3 || trimmed.length > 100) continue;

      // Skip standalone numbers (page numbers)
      if (/^\d+$/.test(trimmed)) continue;
      if (/^page\s*\d+$/i.test(trimmed)) continue;

      // Find this text in the full text
      const idx = fullText.indexOf(trimmed);
      if (idx < 0) continue;

      // Skip if very close to an already-found heading
      const isNearby = headingCandidates.some(
        c => Math.abs(c.fullTextIndex - idx) < 100
      );
      if (!isNearby) {
        headingCandidates.push({ text: trimmed, fullTextIndex: idx });
      }
    }
  }

  // Sort by position in text
  headingCandidates.sort((a, b) => a.fullTextIndex - b.fullTextIndex);

  // Skip non-content headings
  const nonContentRe = /^(contents|figures|tables|references|bibliography|appendix|list of|table of|acknowledg|dedication|abstract|declaration|abbreviations?|nomenclature|glossary|notation)/i;

  const filtered = headingCandidates.filter(c => !nonContentRe.test(c.text));

  if (filtered.length < 2) return [];

  // Build chapters from heading positions
  const chapters: ExtractedChapter[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const contentStart = filtered[i].fullTextIndex + filtered[i].text.length;
    const contentEnd = i + 1 < filtered.length
      ? filtered[i + 1].fullTextIndex
      : fullText.length;

    const rawBody = fullText.slice(contentStart, contentEnd);
    const body = cleanParagraph(rawBody).slice(0, 50000);

    if (body.split(/\s+/).filter(w => w.length > 0).length < 15) continue;

    chapters.push({
      title: cleanLine(filtered[i].text),
      body,
      order: chapters.length,
      level: 'chapter',
      subsections: extractSubsections(body),
    });
  }

  return chapters;
}

// ============================================================
// Chapter Body Content Improvement
// ============================================================

/**
 * Clean chapter body text by removing running headers/footers,
 * page numbers, and merging paragraphs across page breaks.
 */
function cleanChapterBody(body: string, headers: string[], footers: string[]): string {
  let cleaned = body;

  // Remove detected running headers (as standalone lines)
  for (const header of headers) {
    const escaped = escapeRegExp(header);
    cleaned = cleaned.replace(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*(?:$|\\n)`, 'g'), '\n');
  }

  // Remove detected running footers (as standalone lines)
  for (const footer of footers) {
    const escaped = escapeRegExp(footer);
    cleaned = cleaned.replace(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*(?:$|\\n)`, 'g'), '\n');
  }

  // Remove standalone page numbers (1-4 digits on a line by themselves)
  cleaned = cleaned.replace(/(?:^|\n)\s*\d{1,4}\s*(?:$|\n)/gm, '\n');

  // Remove "Page X of Y" patterns anywhere
  cleaned = cleaned.replace(/\s*page\s+\d+\s+of\s+\d+\s*/gi, ' ');

  // Remove standalone "Page N" lines
  cleaned = cleaned.replace(/(?:^|\n)\s*page\s+\d+\s*(?:$|\n)/gim, '\n');

  // Better paragraph merging across page breaks:
  // If a line ends with a comma, semicolon, dash, or lowercase letter
  // and the next content starts with lowercase, merge them
  cleaned = cleaned.replace(/([a-z,;:—–-])\s*\n\s*\n+(?=[a-z])/g, '$1 ');

  // Clean up excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

// ============================================================
// Content Intelligence Post-Processing
// ============================================================

/**
 * Validate and clean extracted metadata and chapters.
 * Performs sanity checks and removes spurious content.
 */
function validateAndCleanExtractedData(
  metadata: Record<string, any>,
  chapters: ExtractedChapter[],
): { metadata: Record<string, any>; chapters: ExtractedChapter[]; warnings: string[] } {
  const warnings: string[] = [];
  const validatedMeta = { ...metadata };

  // ---- Title sanity check ----
  if (validatedMeta.title) {
    if (validatedMeta.title.length < 5) {
      warnings.push('Detected title is very short — it may be incorrect');
      delete validatedMeta.title;
    } else if (validatedMeta.title.length > 300) {
      validatedMeta.title = validatedMeta.title.slice(0, 300).replace(/\s+[^\s]*$/, '');
      warnings.push('Title was truncated due to excessive length');
    }
  }

  // ---- Author validation ----
  if (validatedMeta.author) {
    const author = validatedMeta.author;
    if (/\d/.test(author)) {
      warnings.push('Detected author contains numbers — it may be incorrect');
    }
    if (!/\s/.test(author.trim())) {
      warnings.push('Detected author is a single word — it may be incomplete');
    }
  }

  // ---- Chapter title cleanup ----
  let cleanedChapters = chapters.map(ch => {
    let title = ch.title;

    // Remove trailing page numbers from titles
    const originalTitle = title;
    title = title.replace(/\s*page\s*\d+\s*$/i, '').trim();
    title = title.replace(/\s*(\d{1,4})\s*$/, (_, num) => {
      // Only remove trailing standalone numbers (likely page numbers)
      if (/^\d{1,4}$/.test(num)) return '';
      return num;
    }).trim();

    if (title !== originalTitle && title.length > 0) {
      warnings.push(`Chapter title cleaned: "${originalTitle}" → "${title}"`);
    }

    return title.length > 0 ? { ...ch, title } : ch;
  });

  // ---- Remove spurious chapters ----
  cleanedChapters = cleanedChapters.filter(ch => {
    // Remove chapters that are purely "Page X of Y"
    if (/^page\s+\d+\s+of\s+\d+$/i.test(ch.title.trim())) {
      warnings.push(`Removed spurious chapter: "${ch.title}"`);
      return false;
    }
    // Remove chapters with only page numbers as titles
    if (/^\d{1,4}$/.test(ch.title.trim())) {
      warnings.push(`Removed spurious chapter (page number): "${ch.title}"`);
      return false;
    }
    return true;
  });

  // ---- Re-order chapters after filtering ----
  cleanedChapters = cleanedChapters.map((ch, i) => ({ ...ch, order: i }));

  return { metadata: validatedMeta, chapters: cleanedChapters, warnings };
}

// ============================================================
// Utility Functions
// ============================================================

function cleanLine(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function cleanParagraph(s: string): string {
  return s
    .replace(/--- PAGE BREAK ---/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

function generatePDFWarnings(data: { metadata: Record<string, any>; chapters: ExtractedChapter[]; references: ExtractedReference[] }): string[] {
  const warnings: string[] = [];
  if (!data.metadata.title) warnings.push('Could not detect thesis title from PDF — you may need to enter it manually');
  if (!data.metadata.author) warnings.push('Could not detect author from PDF — you may need to enter it manually');
  if (data.chapters.length === 0) warnings.push('No chapter headings detected — chapters may not be in standard format or may need manual creation');
  if (data.chapters.length > 0 && data.chapters.length < 2) warnings.push(`Only ${data.chapters.length} chapter(s) detected — some chapters may have been missed`);
  if (data.references.length === 0) warnings.push('No references section detected in the PDF — you may need to add them manually');
  if (data.metadata.abstract) {
    const abstractWordCount = data.metadata.abstract.split(/\s+/).filter(w => w.length > 0).length;
    if (abstractWordCount < 30) warnings.push(`Abstract is very short (${abstractWordCount} words) — it may be incomplete or not properly extracted`);
  }
  return warnings;
}
