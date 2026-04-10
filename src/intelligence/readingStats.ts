// ============================================================
// ThesisForge Intelligence — Algorithm 8: Reading Time & Word Count
// Simple but surfaces important information students rarely have
// visibility on. Per-chapter word counts, reading time estimates,
// sentence complexity flags.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { ReadingStatsResult, ChapterReadingStats } from './types';
import type { ThesisChapter } from '@/lib/thesis-types';
import { countWords } from './structureAnalyzer';

/** Average academic reading speed in words per minute. */
const READING_SPEED_WPM = 238;

/** Flag threshold: average sentence length above this triggers a warning. */
const LONG_SENTENCE_THRESHOLD = 35;

/**
 * Count sentences in text.
 * Heuristic: count sentence-ending punctuation followed by a capital letter.
 * Always returns at least 1 (even for empty text).
 */
function countSentences(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const matches = text.match(/[.!?]+\s+[A-Z\u00C0-\u024F]/g);
  return matches ? matches.length + 1 : 1;
}

/**
 * Compute reading statistics per chapter and totals.
 *
 * Edge cases:
 * - No chapters → returns zeros for totals
 * - Empty chapters → counts as 0 words
 * - Chapters with only whitespace → counts as 0 words
 * - Very long chapters → word count scales linearly
 *
 * Performance budget: < 3ms for up to 20,000 words
 */
export function computeReadingStats(
  chapters: ThesisChapter[],
  abstract: string | undefined = ''
): ReadingStatsResult {
  const chapterStats: ChapterReadingStats[] = chapters.map((ch) => {
    // Combine chapter content + all subsections
    const fullText = [
      ch.content || '',
      ...(ch.subSections || []).map((ss) => ss.content || ''),
    ].join(' ');

    const words = countWords(fullText);
    const sentences = countSentences(fullText);
    const readingTime = Math.ceil(words / READING_SPEED_WPM);
    const avgSentenceLength = sentences > 0 ? words / sentences : 0;

    return {
      chapterId: ch.id,
      chapterTitle: ch.title,
      words,
      readingTime,
      sentences,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    };
  });

  const totalWords = chapterStats.reduce((s, c) => s + c.words, 0);
  const abstractWords = countWords(abstract);

  // Abstract status: check recommended range (150–300 for most templates)
  let abstractStatus: 'too short' | 'too long' | 'good';
  if (abstractWords < 100) {
    abstractStatus = 'too short';
  } else if (abstractWords > 700) {
    abstractStatus = 'too long';
  } else {
    abstractStatus = 'good';
  }

  // Flag chapters with overly long average sentences
  const longSentenceChapters = chapterStats
    .filter((s) => s.avgSentenceLength > LONG_SENTENCE_THRESHOLD)
    .map((s) => s.chapterTitle);

  return {
    chapters: chapterStats,
    total: {
      words: totalWords,
      readingTime: Math.ceil(totalWords / READING_SPEED_WPM),
      abstractWords,
      abstractStatus,
    },
    longSentenceChapters,
  };
}
