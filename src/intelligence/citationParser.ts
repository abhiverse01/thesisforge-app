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
 * Features:
 * - DOI string parsing: detects `10.XXXX/...` patterns directly
 * - arXiv ID detection: `arXiv:XXXX.XXXXX` patterns
 * - Crossref field extraction from text
 * - Confidence scores (0.0–1.0) for each parsed field in `_confidence`
 * - `_warningFields: string[]` for fields with confidence < 0.5
 *
 * Edge cases:
 * - Empty string → returns type "article", _parseScore 0
 * - Single word → returns minimal parse
 * - Malformed input → low confidence, no false positives
 * - No parenthesized year → falls back to bare year, skips title extraction
 *
 * Performance budget: < 2ms per call
 */
export function parseCitationText(raw: string): ParsedCitation {
  const result: ParsedCitation = {
    type: 'article',
    _confidence: {},
    _parseScore: 0,
    _warningFields: [],
  };

  if (!raw || typeof raw !== 'string') {
    return result;
  }

  const text = raw.trim();
  if (text.length < 5) {
    return result;
  }

  // --- DOI extraction (highest confidence field) ---
  const doiMatch = text.match(/\b(10\.\d{4,}\/[^\s,]+)/);
  if (doiMatch) {
    result.doi = doiMatch[1].replace(/[.)]+$/, '');
    result._confidence.doi = 1.0;
  }

  // --- arXiv ID extraction ---
  const arxivMatch = text.match(/\barXiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)\b/i);
  if (arxivMatch) {
    result.eprint = arxivMatch[1];
    result.eprinttype = 'arxiv';
    result._confidence.eprint = 1.0;
    result._confidence.eprinttype = 1.0;
    // If type is still default, infer preprint
    if (!doiMatch) {
      result.type = 'article';
    }
  }

  // --- Crossref field extraction ---
  // Detect crossref patterns like "Crossref: ..." or DOI-based crossref metadata
  const crossrefMatch = text.match(/(?:crossref|cross[\s-]ref)[:\s]+([^\s,]+)/i);
  if (crossrefMatch && !doiMatch) {
    result.crossRef = crossrefMatch[1].replace(/[.)]+$/, '');
    result._confidence.crossRef = 0.7;
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
  let hasParenYear = false;
  if (yearMatch) {
    result.year = yearMatch[1];
    result._confidence.year = 0.95;
    hasParenYear = true;
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
  // FIX: Only extract title when we have a parenthesized year as anchor.
  // Without a year anchor, "Smith, J. (2021). Deep learning. Journal..." is parseable,
  // but "Smith J Some random text" would match author as title.
  if (hasParenYear) {
    const afterYear = text.replace(/^.*?\(\d{4}[^)]*\)\.?\s*/, '');
    // Title ends at the first period followed by a capital letter (journal name)
    const titleMatch = afterYear.match(/^([^.!?]+?)\.\s+[A-Z]/);
    if (titleMatch) {
      const candidate = titleMatch[1].trim();
      // Sanity: title should be at least 5 chars and not look like an author string
      if (candidate.length >= 5 && !/^[A-Z][a-z]+,?\s*[A-Z]\.?$/.test(candidate)) {
        result.title = candidate;
        result._confidence.title = 0.75;
      }
    }

    // --- Journal / booktitle extraction (only when we have a year anchor) ---
    const titleStripped = result.title ? afterYear.replace(escapeRegex(result.title), '') : afterYear;
    const journalMatch = titleStripped.match(/\.\s+([A-Z][^,.\d]+?)(?:,\s*\d|\.\s*\d|$)/);
    if (journalMatch) {
      const journal = journalMatch[1].trim();
      if (journal.length > 3 && journal.length < 100) {
        result.journal = journal;
        result._confidence.journal = 0.7;
      }
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
    result._confidence.school = 0.3;
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

  // --- Warning fields: fields with confidence < 0.5 ---
  result._warningFields = Object.entries(result._confidence)
    .filter(([, conf]) => conf < 0.5)
    .map(([field]) => field);

  return result;
}

/**
 * Escape a string for use in a RegExp replacement.
 * Prevents regex special characters in title from corrupting the match.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * FIX: Simplified single-pass approach instead of broken multi-replace chain.
 */
function normalizeAuthorsVancouver(raw: string): string {
  // Split on commas, normalize each part, rejoin
  const parts = raw.split(/\s*,\s*/).filter(Boolean);
  return parts
    .map((part) => {
      const trimmed = part.trim();
      // Match "Smith J" or "Smith" → "Smith, J."
      const m = trimmed.match(/^([A-Z][a-zA-Z\u00C0-\u024F]+)\s+([A-Z])\.?\s*$/);
      if (m) return `${m[1]}, ${m[2]}.`;
      return trimmed;
    })
    .join(' and ');
}
