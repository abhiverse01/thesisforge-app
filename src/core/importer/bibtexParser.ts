// ============================================================
// ThesisForge Import — BibTeX Parser
// Parses embedded BibTeX entries from TeX source text.
// ============================================================

import type { ExtractedReference } from './types';

/**
 * Parse BibTeX entries embedded in a string.
 * Returns an array of extracted references.
 *
 * Issue #5 fix: All global regex instances are created fresh inside this
 * function and their lastIndex is explicitly managed after every
 * extractBalancedBraces call to prevent stale-state scanning.
 *
 * Issue #3 fix: try/catch wraps the core logic and re-throws with context.
 */
export function parseBibTeX(text: string): ExtractedReference[] {
  try {
    const refs: ExtractedReference[] = [];

    // Issue #5: Create a fresh regex instance each call to avoid stale lastIndex
    // from any prior regex usage in the calling scope.
    const ENTRY_RE = new RegExp('@(\\w+)\\s*\\{', 'g');
    let entryMatch;

    while ((entryMatch = ENTRY_RE.exec(text)) !== null) {
      const entryType = entryMatch[1].toLowerCase();

      const braceStart = entryMatch.index + entryMatch[0].length;

      // Skip non-reference BibTeX entry types but still consume their braces
      if (entryType === 'string' || entryType === 'preamble' || entryType === 'comment') {
        const skipped = extractBalancedBraces(text, braceStart);
        ENTRY_RE.lastIndex = skipped.endIdx;
        continue;
      }

      const { content, endIdx } = extractBalancedBraces(text, braceStart);

      // Issue #5: Explicitly update lastIndex to avoid re-scanning content
      // that was already consumed by the balanced-brace extractor.
      ENTRY_RE.lastIndex = endIdx;

      const fields = parseBibFields(content);

      refs.push({
        type:      entryType,
        author:    fields.author,
        title:     fields.title,
        year:      fields.year,
        journal:   fields.journal,
        booktitle: fields.booktitle,
        volume:    fields.volume,
        pages:     fields.pages,
        doi:       fields.doi,
        url:       fields.url,
        publisher: fields.publisher,
        school:    fields.school,
        raw:       content,
      });
    }

    return refs;
  } catch (err: any) {
    throw new Error(`[bibtexParser] Failed to parse BibTeX entries: ${err?.message ?? err}`);
  }
}

// ---- Internal helpers ----

/**
 * Balanced-brace extractor with depth and scan limits.
 * Self-contained (no dependency on texImporter) to avoid circular imports.
 */
function extractBalancedBraces(text: string, fromIdx: number): { content: string; endIdx: number } {
  const MAX_DEPTH = 50;
  const MAX_SCAN = 10000;

  // FIX #10: Guard against out-of-bounds access when fromIdx === 0
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

  // FIX #11: Calculate limit from contentStart, not fromIdx
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

/**
 * Parse BibTeX field=value pairs from the body of an entry.
 * Handles both `{value}` and `"value"` quoting, and numeric bare values.
 */
function parseBibFields(fieldStr: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Issue #5: Fresh regex instance; lastIndex is managed below.
  const FIELD_RE = new RegExp('(\\w+)\\s*=\\s*', 'g');
  let fMatch;

  while ((fMatch = FIELD_RE.exec(fieldStr)) !== null) {
    const fieldName = fMatch[1].toLowerCase();
    const valueStart = fMatch.index + fMatch[0].length;

    if (valueStart >= fieldStr.length) break;

    const ch = fieldStr[valueStart];

    if (ch === '{') {
      // Balanced braces
      const { content, endIdx } = extractBalancedBraces(fieldStr, valueStart + 1);
      fields[fieldName] = content.trim();
      FIELD_RE.lastIndex = endIdx;
    } else if (ch === '"') {
      // Quoted string — find closing quote
      const closeQuote = fieldStr.indexOf('"', valueStart + 1);
      if (closeQuote !== -1) {
        fields[fieldName] = fieldStr.slice(valueStart + 1, closeQuote).trim();
        FIELD_RE.lastIndex = closeQuote + 1;
      }
    } else {
      // Bare value (numeric or macro) — read until comma or end
      const commaOrEnd = /[,\s}]/.exec(fieldStr.slice(valueStart));
      if (commaOrEnd) {
        fields[fieldName] = fieldStr.slice(valueStart, valueStart + commaOrEnd.index).trim();
        FIELD_RE.lastIndex = valueStart + commaOrEnd.index;
      } else {
        fields[fieldName] = fieldStr.slice(valueStart).trim();
        FIELD_RE.lastIndex = fieldStr.length;
      }
    }

    // Skip past trailing comma
    const commaSkip = /^\s*,/.exec(fieldStr.slice(FIELD_RE.lastIndex));
    if (commaSkip) {
      FIELD_RE.lastIndex += commaSkip[0].length;
    }
  }

  return fields;
}
