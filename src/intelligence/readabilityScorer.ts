// ============================================================
// ThesisForge Intelligence — Algorithm: Flesch-Kincaid Readability Scorer
// Computes readability metrics for thesis chapters.
// Pure function: input → result. No side effects.
// ============================================================

import type { ReadabilityResult } from './types';

/** Strip LaTeX commands from text, replacing with whitespace. */
function stripLatex(text: string): string {
  return text
    .replace(/\$[^$]+\$/g, ' ')           // inline math
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')    // display math
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, ' ') // \command{arg}
    .replace(/\\[a-zA-Z]+/g, ' ')          // standalone \command
    .replace(/[{}\\]/g, ' ')                // stray braces/backslash
    .replace(/\[[^\]]*\]/g, ' ')           // [optional args]
    .replace(/%.*$/gm, ' ')                // comments
    .replace(/~+/g, ' ')                   // non-breaking spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split text into sentences (approximate). */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

/** Split text into words. */
function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

/**
 * Count syllables in a single word using heuristic rules.
 *
 * Rules:
 * - Count vowel groups (a, e, i, o, u, y)
 * - Subtract 1 for silent 'e' at end of word
 * - Minimum 1 syllable per word
 * - Words with common academic suffixes add 1 syllable
 */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length === 0) return 0;

  // Count vowel groups (consecutive vowels count as 1)
  const vowelGroups = w.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 0;

  // Subtract 1 for silent 'e' at the end (but not for words like "le")
  if (w.endsWith('e') && count > 1 && !w.endsWith('le')) {
    count--;
  }

  // Handle "-le" at the end: "able" → a-ble (2 syllables)
  if (w.endsWith('le') && w.length > 2 && !/[aeiouy]/.test(w[w.length - 3])) {
    count++;
  }

  // Common academic suffixes that add a syllable
  const academicSuffixes = ['tion', 'sion', 'ic', 'ical', 'ity', 'ness', 'ment', 'able', 'ible', 'ful', 'less', 'ous', 'ive', 'ance', 'ence', 'ism', 'ist', 'ize', 'ise', 'ify'];
  for (const suffix of academicSuffixes) {
    if (w.endsWith(suffix)) {
      count++;
      break;
    }
  }

  // Ensure minimum 1 syllable
  return Math.max(1, count);
}

/**
 * Get status label from Reading Ease score.
 */
function getStatus(readingEase: number): ReadabilityResult['overall']['status'] {
  if (readingEase >= 60) return 'easy';
  if (readingEase >= 40) return 'moderate';
  if (readingEase >= 25) return 'difficult';
  return 'very-difficult';
}

/**
 * Compute Flesch-Kincaid readability scores for thesis chapters.
 *
 * Formulas:
 * - Reading Ease = 206.835 - 1.015 × (words/sentences) - 84.6 × (syllables/words)
 * - Grade Level = 0.39 × (words/sentences) + 11.8 × (syllables/words) - 15.59
 */
export function computeReadability(
  chapters: Array<{ id: string; title: string; body: string }>
): ReadabilityResult {
  const chapterResults = chapters.map(ch => {
    const clean = stripLatex(ch.body);
    if (!clean) {
      return {
        chapterId: ch.id,
        chapterTitle: ch.title,
        readingEase: 0,
        gradeLevel: 0,
        status: 'very-difficult' as const,
        words: 0,
        sentences: 0,
        syllables: 0,
      };
    }

    const sentences = splitSentences(clean);
    const words = splitWords(clean);
    const totalWords = words.length;
    const totalSentences = sentences.length;

    if (totalSentences === 0 || totalWords === 0) {
      return {
        chapterId: ch.id,
        chapterTitle: ch.title,
        readingEase: 0,
        gradeLevel: 0,
        status: 'very-difficult' as const,
        words: 0,
        sentences: 0,
        syllables: 0,
      };
    }

    const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

    const avgWordsPerSentence = totalWords / totalSentences;
    const avgSyllablesPerWord = totalSyllables / totalWords;

    const readingEase =
      206.835 -
      1.015 * avgWordsPerSentence -
      84.6 * avgSyllablesPerWord;

    const gradeLevel =
      0.39 * avgWordsPerSentence +
      11.8 * avgSyllablesPerWord -
      15.59;

    return {
      chapterId: ch.id,
      chapterTitle: ch.title,
      readingEase: Math.round(readingEase * 10) / 10,
      gradeLevel: Math.round(gradeLevel * 10) / 10,
      status: getStatus(readingEase),
      words: totalWords,
      sentences: totalSentences,
      syllables: totalSyllables,
    };
  });

  // Compute overall (weighted average across all chapters by word count)
  const totalWords = chapterResults.reduce((s, c) => s + c.words, 0);
  const totalSentences = chapterResults.reduce((s, c) => s + c.sentences, 0);
  const totalSyllables = chapterResults.reduce((s, c) => s + c.syllables, 0);

  let overallReadingEase = 0;
  let overallGradeLevel = 0;

  if (totalSentences > 0 && totalWords > 0) {
    const avgWPS = totalWords / totalSentences;
    const avgSPW = totalSyllables / totalWords;
    overallReadingEase = 206.835 - 1.015 * avgWPS - 84.6 * avgSPW;
    overallGradeLevel = 0.39 * avgWPS + 11.8 * avgSPW - 15.59;
  }

  return {
    overall: {
      readingEase: Math.round(overallReadingEase * 10) / 10,
      gradeLevel: Math.round(overallGradeLevel * 10) / 10,
      status: getStatus(overallReadingEase),
    },
    chapters: chapterResults,
  };
}
