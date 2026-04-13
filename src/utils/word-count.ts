// ============================================================
// CJK-Aware Word Counter
// ============================================================
// Standard whitespace split doesn't work for CJK languages
// (Chinese, Japanese, Korean) where characters have no spaces.
// This utility properly handles both Latin and CJK text.
// ============================================================

// CJK Unicode ranges
const CJK_RANGES = /[\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/;

/**
 * Count words in text, properly handling both Latin and CJK languages.
 * - Latin words are split by whitespace
 * - Each CJK character is counted as one word
 * - Mixed text handles both correctly
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;

  // Fast path: if no CJK characters, use simple whitespace split
  if (!CJK_RANGES.test(text)) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  // CJK path: count CJK chars individually, plus Latin words
  let count = 0;
  let inWord = false;
  let inCJK = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const isCJK = CJK_RANGES.test(ch);
    const isSpace = /\s/.test(ch);

    if (isCJK) {
      // Transition from Latin word to CJK — count the Latin word
      if (inWord && !inCJK) count++;
      inCJK = true;
      inWord = false;
      count++; // Each CJK character = 1 word
    } else if (isSpace) {
      // End of any word
      if (inWord || inCJK) {
        if (inWord && !inCJK) count++;
        // CJK characters are already counted individually
      }
      inWord = false;
      inCJK = false;
    } else {
      // Latin character
      if (inCJK) {
        // Transition from CJK to Latin — CJK chars already counted
        inCJK = false;
      }
      inWord = true;
    }
  }

  // Count trailing word if any
  if (inWord && !inCJK) count++;

  return count;
}

/**
 * Format word count for display. Shows locale-formatted number.
 */
export function formatWordCount(count: number): string {
  if (count === 0) return '0';
  if (count < 1000) return String(count);
  return count.toLocaleString();
}

/**
 * Get estimated reading time in minutes (avg 250 wpm for Latin, 400 chars/min for CJK).
 */
export function getReadingTimeMinutes(text: string): number {
  const words = countWords(text);
  if (words === 0) return 0;
  // Rough average
  return Math.max(1, Math.ceil(words / 275));
}
