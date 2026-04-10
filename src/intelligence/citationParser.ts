// ============================================================
// ThesisForge Intelligence — Algorithm 1: Citation Text Parser
// Parses raw citation strings (Google Scholar, journal sites, PDFs)
// into partially-filled reference objects for the BibTeX generator.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { ParsedCitation } from './types';

/**
 * Parse a raw citation string into a structured reference object.
 * Returns confidence scores per field for UI display.
 *
 * Edge cases:
 * - Empty string → returns type "article", _parseScore 0
 * - Single word → returns minimal parse
 * - Malformed input → low confidence, no false positives
 *
 * Performance budget: < 2ms per call
 */
export function parseCitationText(raw: string): ParsedCitation {
  const result: ParsedCitation = {
    type: 'article',
    _confidence: {},
    _parseScore: 0,
  };

  if (!raw || typeof raw !== 'string') {
    result._parseScore = 0;
    return result;
  }

  const text = raw.trim();
  if (text.length < 5) {
    result._parseScore = 0;
    return result;
  }

  // --- DOI extraction (highest confidence field) ---
  const doiMatch = text.match(/\b(10\.\d{4,}\/[^\s,]+)/);
  if (doiMatch) {
    result.doi = doiMatch[1].replace(/[.)]+$/, '');
    result._confidence.doi = 1.0;
  }

  // --- URL extraction ---
  const urlMatch = text.match(/https?:\/\/[^\s,)]+/);
  if (urlMatch) {
    const cleanUrl = urlMatch[0].replace(/[.)]+$/, '');
    // Don't set URL if we already have a DOI (DOIs are more useful)
    if (!doiMatch) {
      result.url = cleanUrl;
      result._confidence.url = 0.9;
    }
  }

  // --- Year extraction ---
  // Parenthesized year: (2021) or (2021, March) or (n.d.)
  const yearMatch = text.match(/\((\d{4})[^)]*\)/);
  if (yearMatch) {
    result.year = yearMatch[1];
    result._confidence.year = 0.95;
  } else {
    // Fallback: bare 4-digit year (19xx or 20xx)
    const bareYear = text.match(/\b(19|20)\d{2}\b/);
    if (bareYear) {
      result.year = bareYear[0];
      result._confidence.year = 0.7;
    }
  }

  // --- Author extraction ---
  // APA: "Smith, J., & Jones, A." or "Smith, John"
  // Vancouver: "Smith J, Jones A"
  const apaAuthors = text.match(
    /^([A-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\u00E9\-]+\s*,\s*[A-Z]\.(?:\s*,?\s*&?\s*[A-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\-]+\s*,\s*[A-Z]\.)*)/
  );
  if (apaAuthors) {
    result.author = normalizeAuthors(apaAuthors[1]);
    result._confidence.author = 0.85;
  } else {
    // Try Vancouver-style: "Smith J, Jones A"
    const vancouverAuthors = text.match(
      /^([A-Z][a-zA-Z\u00C0-\u024F]+(?:\s+[A-Z]\.)?(?:\s*,\s*[A-Z][a-zA-Z\u00C0-\u024F]+(?:\s+[A-Z]\.)?)*)/
    );
    if (vancouverAuthors && vancouverAuthors[1].length > 3) {
      result.author = normalizeAuthorsVancouver(vancouverAuthors[1]);
      result._confidence.author = 0.7;
    }
  }

  // --- Title extraction ---
  // In APA: comes after year paren, ends before journal/publisher name
  const afterYear = text.replace(/^.*?\(\d{4}[^)]*\)\.?\s*/, '');
  const titleMatch = afterYear.match(/^([^.!?]+?)\.\s+[A-Z]/);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
    result._confidence.title = 0.75;
  } else if (afterYear.length > 10) {
    // Fallback: take the first sentence-like chunk
    const fallbackTitle = afterYear.match(/^(.{10,80}?)[.,:]/);
    if (fallbackTitle) {
      result.title = fallbackTitle[1].trim();
      result._confidence.title = 0.4;
    }
  }

  // --- Journal / booktitle extraction ---
  // Typically: Sentence after title, followed by volume(issue) or page numbers
  const titleStripped = result.title ? afterYear.replace(result.title, '') : afterYear;
  const journalMatch = titleStripped.match(/\.\s+([A-Z][^,.\d]+?)(?:,\s*\d|\.\s*\d|$)/);
  if (journalMatch) {
    const journal = journalMatch[1].trim();
    if (journal.length > 3 && journal.length < 100) {
      result.journal = journal;
      result._confidence.journal = 0.7;
    }
  }

  // --- Volume, number, pages ---
  const volMatch = text.match(/\b(\d+)\((\d+)\)/);
  if (volMatch) {
    result.volume = volMatch[1];
    result.number = volMatch[2];
    result._confidence.volume = 0.9;
  }
  const pageMatch = text.match(/[,\s](\d+)[\u2013\u2014\-](\d+)/);
  if (pageMatch) {
    result.pages = `${pageMatch[1]}--${pageMatch[2]}`;
    result._confidence.pages = 0.85;
  }

  // --- Type inference ---
  if (/\bProceedings\b|\bConference\b|\bWorkshop\b|\bSymposium\b/i.test(text)) {
    result.type = 'inproceedings';
    if (result.journal) {
      result.bookTitle = result.journal;
      delete result.journal;
    }
  } else if (/\bPhD\b|\bDissertation\b/i.test(text)) {
    result.type = 'thesis';
    result.school = '';
    result._confidence.school = 0.3; // Needs manual fill
  } else if (/\bMaster'?s?\s*Thesis\b/i.test(text)) {
    result.type = 'thesis';
    result.school = '';
    result._confidence.school = 0.3;
  } else if (/\bhttp\b/i.test(text) && !result.journal) {
    result.type = 'online';
    result.accessed = new Date().toISOString().slice(0, 10);
  }

  // --- Overall parse confidence ---
  const scores = Object.values(result._confidence);
  result._parseScore = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
    : 0;

  return result;
}

/**
 * Normalize APA author string: "Smith, J., & Jones, A." → "Smith, J. and Jones, A."
 */
function normalizeAuthors(raw: string): string {
  return raw
    .replace(/\s*&\s*/g, ' and ')
    .replace(/,\s*$/, '');
}

/**
 * Normalize Vancouver-style authors: "Smith J, Jones A" → "Smith, J. and Jones, A."
 */
function normalizeAuthorsVancouver(raw: string): string {
  return raw
    .replace(/\b([A-Z][a-z]+)\s+([A-Z])\.?\b/g, '$1, $2.')
    .replace(/\s*,\s*/g, ' and ')
    .replace(/\band\b/g, ',')
    .replace(/,\s*$/, '');
}
