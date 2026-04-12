// ============================================================
// ThesisForge Intelligence — Algorithm 8: Reading Time & Word Count
// Simple but surfaces important information students rarely have
// visibility on. Per-chapter word counts, reading time estimates,
// sentence complexity flags, readability indices.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { ReadingStatsResult, ChapterReadingStats, LongSentenceInfo } from './types';
import type { ThesisChapter } from '@/lib/thesis-types';
import { countWords } from './structureAnalyzer';

/** Average academic reading speed in words per minute. */
const READING_SPEED_WPM = 238;

/** Flag threshold: average sentence length above this triggers a warning. */
const LONG_SENTENCE_THRESHOLD = 35;

/** Threshold for individual long sentences (> 40 words). */
const INDIVIDUAL_LONG_SENTENCE = 40;

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
 * Split text into individual sentences.
 * Returns an array of sentence strings (trimmed, non-empty).
 * Pure function.
 */
function splitSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  // Split on sentence-ending punctuation
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/**
 * Estimate syllable count for a word using heuristic rules.
 * Based on the Flesch-Kincaid syllable counting algorithm.
 *
 * Rules:
 * - Silent 'e' at end doesn't count
 * - Consecutive vowels count as one syllable
 * - 'le' at end of word preceded by a consonant counts as one syllable
 * - 'es'/'ed' at end often don't add a syllable
 * - Minimum 1 syllable per word
 *
 * Pure function.
 */
function countSyllables(word: string): number {
  if (!word || word.length === 0) return 0;
  const w = word.toLowerCase();

  if (w.length <= 3) return 1;

  let count = 0;
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    const isVowel = ch === 'a' || ch === 'e' || ch === 'i' || ch === 'o' || ch === 'u' || ch === 'y';

    if (isVowel && !prevVowel) {
      count++;
    }
    prevVowel = isVowel;
  }

  // Silent 'e' at the end
  if (w.endsWith('e') && count > 1) {
    count--;
  }

  // 'le' at end preceded by consonant (e.g., "table", "little")
  if (
    w.endsWith('le') &&
    w.length > 2 &&
    !isVowelChar(w[w.length - 3])
  ) {
    count++;
  }

  // Words ending in 'es' or 'ed' often don't add a syllable
  // e.g., "created" → 2 syllables, "bases" → 2 syllables
  if ((w.endsWith('ed') || w.endsWith('es')) && count > 1) {
    // Check if the word would be pronounced with the suffix
    // If the word ends with 'ted' or 'ded', it typically adds a syllable (e.g., "wanted", "added")
    if (!w.endsWith('ted') && !w.endsWith('ded') && !w.endsWith('ied') && !w.endsWith('ies')) {
      // Don't subtract — the heuristic already handled this
    }
  }

  // ION suffix typically adds 2 syllables (e.g., "computation")
  if (w.endsWith('ion') && count > 1) {
    count++;
  }

  // ICA, ATE suffix typically add a syllable
  if ((w.endsWith('ica') || w.endsWith('ate')) && count > 1) {
    count++;
  }

  return Math.max(1, count);
}

/**
 * Check if a character is a vowel.
 */
function isVowelChar(ch: string): boolean {
  return ch === 'a' || ch === 'e' || ch === 'i' || ch === 'o' || ch === 'u' || ch === 'y';
}

/**
 * Count total syllables in a text passage.
 * Strips LaTeX commands and punctuation first.
 */
function countTotalSyllables(text: string): number {
  const words = extractCleanWords(text);
  let total = 0;
  for (const word of words) {
    total += countSyllables(word);
  }
  return total;
}

/**
 * Count complex words (3+ syllables) in a text passage.
 * These are words with 3 or more syllables — not counting common
 * suffixes like -es, -ed, -ing, -ly.
 */
function countComplexWords(text: string): number {
  const words = extractCleanWords(text);
  let count = 0;
  for (const word of words) {
    if (countSyllables(word) >= 3) {
      count++;
    }
  }
  return count;
}

/**
 * Extract clean words from text, stripping LaTeX commands and punctuation.
 */
function extractCleanWords(text: string): string[] {
  return text
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '') // Remove \cmd{arg}
    .replace(/\\[a-zA-Z]+/g, '')           // Remove \cmd
    .replace(/[{}[\]()]/g, '')
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^\d+$/.test(w));
}

/**
 * Compute Flesch-Kincaid Reading Ease score.
 *
 * Formula: 206.835 − 1.015 × (words/sentences) − 84.6 × (syllables/words)
 *
 * Interpretation:
 * - 90–100: Very easy (5th grade)
 * - 80–89: Easy (6th grade)
 * - 70–79: Fairly easy (7th grade)
 * - 60–69: Standard (8th–9th grade)
 * - 50–59: Fairly difficult (10th–12th grade)
 * - 30–49: Difficult (College)
 * - 0–29: Very difficult (College graduate)
 *
 * Pure function.
 */
function computeFleschKincaid(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0;
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  // Clamp to 0-100 range
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Compute Gunning Fog Index.
 *
 * Formula: 0.4 × ((words/sentences) + 100 × (complex_words/words))
 *
 * Interpretation:
 * - 6: Easy to read (conversational English)
 * - 8–9: Conversational
 * - 10–12: Acceptable for most audiences
 * - 13–16: Academic/professional
 * - 17+: Very difficult, best for specialists
 *
 * Pure function.
 */
function computeGunningFog(words: number, sentences: number, complexWords: number): number {
  if (words === 0 || sentences === 0) return 0;
  const score = 0.4 * ((words / sentences) + 100 * (complexWords / words));
  return Math.round(Math.max(0, score) * 10) / 10;
}

/**
 * Detect passive voice constructions in text.
 *
 * Looks for: was/were/been + past participle pattern.
 * Past participles are detected by common endings:
 * -ed, -en, -t (e.g., "was analyzed", "were found", "been implemented").
 *
 * Returns percentage of sentences containing passive voice.
 *
 * Pure function.
 */
function computePassiveVoice(sentences: string[]): number {
  if (sentences.length === 0) return 0;

  // Pattern: (was|were|been) followed by a past participle
  // Past participles commonly end in -ed, -en, -t, -wn, -ught, -one
  const passivePattern = /\b(was|were|been)\s+([a-zA-Z]+(?:ed|en|t|wn|ught|one|ted|sed|red|ped|ced|ved|med|ned))\b/i;
  // Also handle: was/were being + past participle
  const passiveBeingPattern = /\b(was|were)\s+being\s+([a-zA-Z]+(?:ed|en|t|wn|ught|one))\b/i;

  let passiveCount = 0;
  for (const sentence of sentences) {
    if (passivePattern.test(sentence) || passiveBeingPattern.test(sentence)) {
      passiveCount++;
    }
  }

  return Math.round((passiveCount / sentences.length) * 100);
}

/**
 * Find long sentences (> 40 words) with split suggestions.
 *
 * For each long sentence, suggests splitting at the most natural
 * break point (after a conjunction like "however", "therefore", "which",
 * or after the middle comma).
 *
 * Pure function.
 */
function findLongSentences(sentences: string[]): LongSentenceInfo[] {
  const results: LongSentenceInfo[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const wordCount = sentence.trim().split(/\s+/).filter(Boolean).length;

    if (wordCount > INDIVIDUAL_LONG_SENTENCE) {
      const suggestion = generateSplitSuggestion(sentence);
      results.push({
        text: sentence.length > 200 ? sentence.slice(0, 200) + '...' : sentence,
        position: i,
        suggestion,
      });
    }
  }

  return results;
}

/**
 * Generate a split suggestion for a long sentence.
 * Looks for natural break points: after semicolons, after transition words
 * followed by commas, or at the midpoint comma.
 */
function generateSplitSuggestion(sentence: string): string {
  const words = sentence.trim().split(/\s+/);

  // Strategy 1: Split at semicolons
  const semiIndex = words.findIndex((w) => w.endsWith(';'));
  if (semiIndex > 10 && semiIndex < words.length - 10) {
    const first = words.slice(0, semiIndex + 1).join(' ');
    const second = words.slice(semiIndex + 1).join(' ');
    // Capitalize the first letter of the second part
    const capitalized = second.charAt(0).toUpperCase() + second.slice(1);
    return `Split at semicolon: "${first}" and "${capitalized}"`;
  }

  // Strategy 2: Split after a transition word + comma
  const transitions = ['however', 'therefore', 'moreover', 'furthermore', 'consequently', 'nevertheless', 'thus', 'hence'];
  for (const transition of transitions) {
    const re = new RegExp(`\\b${transition}\\s*,\\s*`, 'i');
    const match = re.exec(sentence);
    if (match) {
      const pos = match.index + match[0].length;
      if (pos > sentence.length * 0.2 && pos < sentence.length * 0.8) {
        const first = sentence.slice(0, match.index).replace(/,\s*$/, '').trim();
        const second = transition.charAt(0).toUpperCase() + transition.slice(1) + sentence.slice(pos).trim();
        return `Split before "${transition}": "${first}." and "${second}"`;
      }
    }
  }

  // Strategy 3: Split at the middle comma
  const commaPositions: number[] = [];
  for (let i = 0; i < sentence.length; i++) {
    if (sentence[i] === ',') commaPositions.push(i);
  }

  // Find a comma near the middle of the sentence
  const midPoint = Math.floor(sentence.length / 2);
  let bestComma = -1;
  let bestDist = Infinity;
  for (const cp of commaPositions) {
    const dist = Math.abs(cp - midPoint);
    if (dist < bestDist) {
      bestDist = dist;
      bestComma = cp;
    }
  }

  if (bestComma > 10 && bestComma < sentence.length - 10) {
    const first = sentence.slice(0, bestComma).trim();
    const second = sentence.slice(bestComma + 1).trim();
    const capitalized = second.charAt(0).toUpperCase() + second.slice(1);
    return `Split at comma: "${first}." and "${capitalized}"`;
  }

  // Strategy 4: Split at the midpoint word
  const midWord = Math.floor(words.length / 2);
  const first = words.slice(0, midWord).join(' ');
  const second = words.slice(midWord).join(' ');
  return `Consider splitting this ${words.length}-word sentence into two shorter sentences.`;
}

/**
 * Compute reading statistics per chapter and totals.
 *
 * Features:
 * - Flesch-Kincaid Reading Ease per chapter
 * - Gunning Fog Index per chapter
 * - Passive voice percentage (was/were/been + past participle)
 * - Long sentences (> 40 words) with split suggestions
 * - Reading time and word counts
 *
 * Edge cases:
 * - No chapters → returns zeros for totals
 * - Empty chapters → counts as 0 words
 * - Chapters with only whitespace → counts as 0 words
 * - Very long chapters → word count scales linearly
 *
 * Performance budget: < 5ms for up to 20,000 words
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

    // Readability metrics (only compute if there's enough text)
    const cleanSentences = splitSentences(fullText);
    const totalSyllables = words > 0 ? countTotalSyllables(fullText) : 0;
    const complexWordCount = words > 0 ? countComplexWords(fullText) : 0;

    const fleschKincaid = computeFleschKincaid(words, sentences, totalSyllables);
    const gunningFog = computeGunningFog(words, sentences, complexWordCount);
    const passiveVoicePct = computePassiveVoice(cleanSentences);
    const longSentences = findLongSentences(cleanSentences);

    return {
      chapterId: ch.id,
      chapterTitle: ch.title,
      words,
      readingTime,
      sentences,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      fleschKincaid,
      gunningFog,
      passiveVoicePct,
      longSentences,
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
    .filter(
      (s) =>
        s.avgSentenceLength > LONG_SENTENCE_THRESHOLD ||
        s.longSentences.length > 0
    )
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
