// ============================================================
// ThesisForge Import — Text Utilities (GODMODE)
// Shared text processing, fuzzy matching, normalization.
// ============================================================

/**
 * Normalize whitespace: collapse multiple spaces/newlines, trim.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\t ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim();
}

/**
 * Strip LaTeX commands from text, preserving content.
 * Handles: \command{content}, \command[opts]{content}, \command
 */
export function stripLatexCommands(text: string): string {
  // Handle \command[opt]{content} or \command{content}
  let result = text.replace(/\\[a-zA-Z]+\*?(?:\s*\[[^\]]*\])?\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
  // Handle standalone commands like \LaTeX, \TeX
  result = result.replace(/\\[a-zA-Z]+\*?/g, '');
  // Remove remaining braces
  result = result.replace(/[{}]/g, '');
  return normalizeWhitespace(result);
}

/**
 * Clean a single line of text: normalize whitespace, remove control chars.
 */
export function cleanLine(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Clean a paragraph: normalize whitespace, remove excessive blank lines.
 */
export function cleanParagraph(text: string): string {
  return text
    .replace(/\s{3,}/g, '\n\n')
    .replace(/\n{4,}/g, '\n\n')
    .replace(/--- PAGE BREAK ---/g, '\n')
    .trim();
}

/**
 * Count words in text (handles multiple whitespace, hyphens, CJK characters).
 * Godmode: single-pass loop — no array allocation, handles Latin + CJK in one iteration.
 */
export function countWords(text: string): number {
  if (!text || text.length === 0) return 0;
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    // Word characters: letters, digits, underscore, apostrophe (for contractions)
    const isWordChar = (ch >= 48 && ch <= 57) || (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || ch === 39;
    if (isWordChar) {
      if (!inWord) {
        count++;
        inWord = true;
      }
    } else if (ch === 45) {
      // Hyphen: continues a word if surrounded by word chars (e.g., well-known, state-of-the-art)
      const prev = i > 0 ? text.charCodeAt(i - 1) : 0;
      const next = i < text.length - 1 ? text.charCodeAt(i + 1) : 0;
      const prevIsWord = (prev >= 48 && prev <= 57) || (prev >= 65 && prev <= 90) || (prev >= 97 && prev <= 122) || prev === 39;
      const nextIsWord = (next >= 48 && next <= 57) || (next >= 65 && next <= 90) || (next >= 97 && next <= 122) || next === 39;
      if (prevIsWord && nextIsWord) {
        // Hyphen between word chars: keep the word going (don't break)
        // Do NOT set inWord = false for hyphens between word chars
      } else {
        // Standalone hyphen or at word boundary: break the word
        inWord = false;
      }
    } else if (
      // CJK characters: each counts as one word (Unified Ideographs, Hiragana, Katakana, Hangul)
      (ch >= 0x4E00 && ch <= 0x9FFF) ||
      (ch >= 0x3040 && ch <= 0x30FF) ||
      (ch >= 0xAC00 && ch <= 0xD7AF)
    ) {
      count++;
      inWord = false; // CJK chars don't combine with Latin words
    } else {
      inWord = false;
    }
  }
  return count;
}

/**
 * Calculate approximate reading time in minutes.
 */
export function readingTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 250));
}

/**
 * Levenshtein distance for fuzzy matching.
 * Godmode: early termination when length difference exceeds threshold,
 * and bounded matrix allocation for performance.
 */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Early termination: if length difference is very large, return distance as length diff + 1
  // (lower bound on actual Levenshtein, avoids O(n*m) allocation for clearly dissimilar strings)
  const maxLen = Math.max(a.length, b.length);
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > maxLen * 0.5) {
    return lenDiff; // Minimum possible distance is the length difference
  }

  // Use single-row DP for memory efficiency
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = b[j - 1] === a[i - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Fuzzy match: returns similarity ratio 0-1.
 */
export function similarity(a: string, b: string): number {
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  if (sa.length === 0 || sb.length === 0) return 0;
  const maxLen = Math.max(sa.length, sb.length);
  return 1 - levenshtein(sa, sb) / maxLen;
}

/**
 * Check if two strings are fuzzy-equal (above threshold).
 */
export function fuzzyEquals(a: string, b: string, threshold = 0.85): boolean {
  return similarity(a, b) >= threshold;
}

/**
 * Find best fuzzy match from a list of candidates.
 */
export function fuzzyFind(
  query: string,
  candidates: string[],
  threshold = 0.7
): { match: string; score: number } | null {
  let best: { match: string; score: number } | null = null;
  for (const candidate of candidates) {
    const score = similarity(query, candidate);
    if (score >= threshold && (!best || score > best.score)) {
      best = { match: candidate, score };
    }
  }
  return best;
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  if (maxLength < 3) return text.slice(0, maxLength);
  return text.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Deduplicate an array of strings, preserving order, using fuzzy matching.
 */
export function dedupeFuzzy(items: string[], threshold = 0.9): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (!result.some(existing => fuzzyEquals(existing, item, threshold))) {
      result.push(item);
    }
  }
  return result;
}

/**
 * Normalize author names: "SMITH, John A." → "John A. Smith"
 */
export function normalizeAuthorName(name: string): string {
  let cleaned = name.trim().replace(/\s+/g, ' ');
  // "LAST, First Middle" → "First Middle Last"
  const commaMatch = cleaned.match(/^([A-Za-z'-]+),\s*(.+)$/);
  if (commaMatch) {
    cleaned = `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
  }
  // Normalize initials: "J. A." stays as is
  return cleaned;
}

/**
 * Normalize institution names: common abbreviations, case fixes.
 */
export function normalizeInstitution(name: string): string {
  return name
    .replace(/\buni\.?\s*of\b/i, 'University of')
    .replace(/\bdept\.?\b/i, 'Department')
    .replace(/\binst\.?\b/i, 'Institute')
    .replace(/\blab\.?\b/i, 'Laboratory')
    .replace(/\bTech\.?\b/g, 'Technology')
    .replace(/\bsci\.?\b/i, 'Science')
    .replace(/\beng\.?\b/i, 'Engineering')
    .replace(/\bUniv\.?\b/g, 'University')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Detect if text contains primarily CJK (Chinese/Japanese/Korean) characters.
 */
export function isCJK(text: string): boolean {
  const cjkChars = (text.match(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g) || []).length;
  return cjkChars / text.length > 0.3;
}

/**
 * Detect language from text content (simple heuristic).
 */
export function detectLanguage(text: string): string {
  if (isCJK(text)) {
    const zhCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
    const jaCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
    const koCount = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
    if (zhCount > jaCount && zhCount > koCount) return 'zh';
    if (jaCount > koCount) return 'ja';
    return 'ko';
  }
  // Check for common European language markers
  const germanMarkers = (text.match(/\b(der|die|das|und|ist|ein|nicht|mit|auf|für|von)\b/gi) || []).length;
  const frenchMarkers = (text.match(/\b(le|la|les|de|des|du|et|est|un|une|dans|pour)\b/gi) || []).length;
  const spanishMarkers = (text.match(/\b(el|la|los|las|de|del|en|y|es|un|una|por)\b/gi) || []).length;
  const portugueseMarkers = (text.match(/\b(o|a|os|as|de|do|da|em|e|um|uma|para|por)\b/gi) || []).length;

  const maxMarkers = Math.max(germanMarkers, frenchMarkers, spanishMarkers, portugueseMarkers);
  if (maxMarkers > text.split(/\s+/).length * 0.05) {
    if (germanMarkers === maxMarkers) return 'de';
    if (frenchMarkers === maxMarkers) return 'fr';
    if (spanishMarkers === maxMarkers) return 'es';
    if (portugueseMarkers === maxMarkers) return 'pt';
  }
  return 'en';
}

/**
 * Extract years from text (4-digit years between 1900-2099).
 */
export function extractYears(text: string): string[] {
  const matches = text.match(/\b(19\d{2}|20\d{2})\b/g) || [];
  // Deduplicate and filter to reasonable thesis years
  const currentYear = new Date().getFullYear();
  return [...new Set(matches)].filter(y => {
    const year = parseInt(y, 10);
    return year >= 1950 && year <= currentYear + 1;
  });
}

/**
 * Count LaTeX figures/tables/equations in text.
 */
export function countLatexEnvironments(text: string): { figures: number; tables: number; equations: number } {
  const figures = (text.match(/\\begin\{figure\}/g) || []).length;
  const tables = (text.match(/\\begin\{table\}/g) || []).length;
  const equations = (text.match(/\\\(|\\\[|\\begin\{equation\}|\\begin\{align\}/g) || []).length;
  return { figures, tables, equations };
}

/**
 * Calculate content statistics for an import result.
 */
export function calculateContentStats(
  chapters: Array<{ body: string; wordCount?: number }>,
  references: unknown[],
  metadata: { abstract?: string },
  extraEnvCounts?: { figures: number; tables: number; equations: number }
): {
  totalWords: number;
  chapterCount: number;
  referenceCount: number;
  avgChapterWords: number;
  longestChapterIdx: number;
  shortestChapterIdx: number;
  abstractWords: number;
  readingTimeMinutes: number;
  figureCount: number;
  tableCount: number;
  equationCount: number;
  totalChars: number;
} {
  // Early return for empty chapters to avoid Infinity/minWords edge case
  if (chapters.length === 0) {
    const abstractWords = metadata.abstract ? countWords(metadata.abstract) : 0;
    return {
      totalWords: abstractWords,
      totalChars: metadata.abstract?.length || 0,
      chapterCount: 0,
      referenceCount: references.length,
      avgChapterWords: 0,
      longestChapterIdx: -1,
      shortestChapterIdx: -1,
      abstractWords,
      readingTimeMinutes: readingTimeMinutes(abstractWords),
      figureCount: extraEnvCounts?.figures || 0,
      tableCount: extraEnvCounts?.tables || 0,
      equationCount: extraEnvCounts?.equations || 0,
    };
  }

  let totalWords = 0;
  let longestIdx = 0;
  let shortestIdx = 0;
  let maxWords = 0;
  let minWords = Infinity;
  let totalChars = 0;

  for (let i = 0; i < chapters.length; i++) {
    const wc = chapters[i].wordCount || countWords(chapters[i].body);
    totalWords += wc;
    totalChars += chapters[i].body.length;
    if (wc > maxWords) { maxWords = wc; longestIdx = i; }
    if (wc < minWords) { minWords = wc; shortestIdx = i; }
  }

  // Add abstract words
  const abstractWords = metadata.abstract ? countWords(metadata.abstract) : 0;
  totalWords += abstractWords;
  totalChars += metadata.abstract?.length || 0;

  return {
    totalWords,
    totalChars,
    chapterCount: chapters.length,
    referenceCount: references.length,
    avgChapterWords: chapters.length > 0 ? Math.round((totalWords - abstractWords) / chapters.length) : 0,
    longestChapterIdx: chapters.length > 0 ? longestIdx : -1,
    shortestChapterIdx: chapters.length > 0 ? shortestIdx : -1,
    abstractWords,
    readingTimeMinutes: readingTimeMinutes(totalWords),
    figureCount: extraEnvCounts?.figures || 0,
    tableCount: extraEnvCounts?.tables || 0,
    equationCount: extraEnvCounts?.equations || 0,
  };
}
