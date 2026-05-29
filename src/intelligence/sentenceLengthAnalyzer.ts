// ============================================================
// ThesisForge Intelligence — Algorithm: Sentence Length Analyzer
// Analyzes sentence length variance for writing quality.
// Pure function: input → result. No side effects.
// ============================================================

import type { SentenceLengthResult } from './types';

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

/** Split text into sentences and return their word counts. */
function getSentenceWordCounts(text: string): number[] {
  const clean = stripLatex(text);
  if (!clean) return [];

  const sentences = clean
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  return sentences.map(sentence => {
    return sentence.split(/\s+/).filter(w => w.length > 0).length;
  });
}

/** Compute standard deviation of a number array. */
function stdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/** Compute median of a number array. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Analyze sentence length distribution across thesis chapters.
 *
 * Flags:
 * - runOnFlag: >30% of sentences exceed 40 words
 * - choppyFlag: mean sentence length < 10 words
 * - Status: 'good' if no flags, 'warning' if one, 'concern' if both
 */
export function analyzeSentenceLengths(
  chapters: Array<{ id: string; title: string; body: string }>
): SentenceLengthResult {
  const chapterResults = chapters.map(ch => {
    const wordCounts = getSentenceWordCounts(ch.body);

    if (wordCounts.length === 0) {
      return {
        chapterId: ch.id,
        chapterTitle: ch.title,
        meanLength: 0,
        stdDeviation: 0,
        longSentencePct: 0,
        shortSentencePct: 0,
        runOnFlag: false,
        choppyFlag: false,
        longestSentence: 0,
      };
    }

    const totalWords = wordCounts.reduce((a, b) => a + b, 0);
    const mean = totalWords / wordCounts.length;
    const sd = stdDev(wordCounts, mean);
    const longest = Math.max(...wordCounts);

    const longSentences = wordCounts.filter(w => w > 40).length;
    const shortSentences = wordCounts.filter(w => w < 10).length;

    const longPct = Math.round((longSentences / wordCounts.length) * 1000) / 10;
    const shortPct = Math.round((shortSentences / wordCounts.length) * 1000) / 10;

    const runOnFlag = longPct > 30;
    const choppyFlag = mean < 10;

    return {
      chapterId: ch.id,
      chapterTitle: ch.title,
      meanLength: Math.round(mean * 10) / 10,
      stdDeviation: Math.round(sd * 10) / 10,
      longSentencePct: longPct,
      shortSentencePct: shortPct,
      runOnFlag,
      choppyFlag,
      longestSentence: longest,
    };
  });

  // Compute overall statistics
  const allWordCounts = chapters.flatMap(ch => getSentenceWordCounts(ch.body));

  if (allWordCounts.length === 0) {
    return {
      overall: {
        meanLength: 0,
        stdDeviation: 0,
        medianLength: 0,
        longSentencePct: 0,
        shortSentencePct: 0,
        status: 'good',
      },
      chapters: chapterResults,
    };
  }

  const totalWords = allWordCounts.reduce((a, b) => a + b, 0);
  const overallMean = totalWords / allWordCounts.length;
  const overallSD = stdDev(allWordCounts, overallMean);
  const overallMedian = median(allWordCounts);
  const longSentences = allWordCounts.filter(w => w > 40).length;
  const shortSentences = allWordCounts.filter(w => w < 10).length;
  const longPct = Math.round((longSentences / allWordCounts.length) * 1000) / 10;
  const shortPct = Math.round((shortSentences / allWordCounts.length) * 1000) / 10;

  const hasRunOn = longPct > 30;
  const hasChoppy = overallMean < 10;

  const flagCount = [hasRunOn, hasChoppy].filter(Boolean).length;
  const status = flagCount === 0 ? 'good' : flagCount === 1 ? 'warning' : 'concern';

  return {
    overall: {
      meanLength: Math.round(overallMean * 10) / 10,
      stdDeviation: Math.round(overallSD * 10) / 10,
      medianLength: Math.round(overallMedian * 10) / 10,
      longSentencePct: longPct,
      shortSentencePct: shortPct,
      status,
    },
    chapters: chapterResults,
  };
}
