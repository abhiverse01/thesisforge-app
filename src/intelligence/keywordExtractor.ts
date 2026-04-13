// ============================================================
// ThesisForge Intelligence — Algorithm 4: TF-IDF Keyword Extractor
// Extracts 5-8 most significant terms from thesis chapter bodies.
// TF-IDF over combined chapters with academic stop-word list.
// Cross-checks against user-entered keywords.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { ThesisChapter } from '@/lib/thesis-types';
import type { CrossCheckResult } from './types';

/**
 * Custom stop-word list tuned for academic writing.
 * Includes common English stopwords + academic boilerplate terms
 * + domain-specific academic filler words.
 */
const ACADEMIC_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'also', 'however',
  'therefore', 'thus', 'hence', 'moreover', 'furthermore', 'although',
  'though', 'while', 'since', 'because', 'when', 'where', 'which', 'who',
  'whom', 'whose', 'what', 'how', 'study', 'paper', 'research', 'work',
  'result', 'results', 'show', 'shows', 'shown', 'use', 'used', 'using',
  'based', 'method', 'methods', 'approach', 'proposed', 'present', 'chapter',
  'section', 'figure', 'table', 'equation', 'model', 'data', 'analysis',
  'system', 'process', 'framework', 'from', 'into', 'about', 'between',
  'through', 'during', 'before', 'after', 'above', 'below', 'each', 'every',
  'both', 'same', 'other', 'such', 'only', 'than', 'then', 'over', 'some',
  'most', 'very', 'even', 'well', 'much', 'many', 'just', 'like', 'its',
  'their', 'our', 'your', 'his', 'her', 'they', 'them', 'these', 'those',
  'been', 'being', 'have', 'having', 'does', 'doing', 'would', 'should',
  // Domain-specific academic filler words (less meaningful as keywords)
  'study', 'analysis', 'result', 'chapter', 'section', 'method',
  'approach', 'figure', 'table', 'result', 'results',
]);

/**
 * Tokenize text: lowercase, strip punctuation, filter short words and stopwords.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) => w.length > 3 && !ACADEMIC_STOPWORDS.has(w) && !/^\d+$/.test(w)
    );
}

/**
 * Compute term frequency (TF) normalized by max frequency.
 */
function computeTF(tokens: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const max = Math.max(...Object.values(freq), 1);
  const tf: Record<string, number> = {};
  for (const [term, count] of Object.entries(freq)) {
    tf[term] = count / max;
  }
  return tf;
}

/**
 * Extract significant bigrams (2-word phrases) that appear 3+ times.
 * Bigrams are boosted by 1.4x as they tend to be more specific.
 */
function extractBigrams(tokens: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    // Skip if either word is a stop word (bigrams with stopwords are less meaningful)
    if (ACADEMIC_STOPWORDS.has(tokens[i]) || ACADEMIC_STOPWORDS.has(tokens[i + 1])) continue;
    const bg = `${tokens[i]} ${tokens[i + 1]}`;
    freq[bg] = (freq[bg] || 0) + 1;
  }
  // Only keep bigrams that appear 3+ times
  const scores: Record<string, number> = {};
  for (const [bg, count] of Object.entries(freq)) {
    if (count >= 3) {
      scores[bg] = (count / tokens.length) * 10;
    }
  }
  return scores;
}

/**
 * Extract the top N keywords from thesis chapter bodies using TF-IDF.
 *
 * Each chapter is treated as a "document" for IDF calculation.
 * Combined TF across all chapters represents the thesis-level frequency.
 * Bigrams are boosted 1.4x since multi-word phrases are more specific.
 *
 * Edge cases:
 * - No chapters → returns []
 * - All chapters empty → returns []
 * - Single short chapter → returns top terms from that chapter
 *
 * Performance budget: < 12ms for up to 20,000 words
 */
export function extractKeywords(
  chapters: ThesisChapter[],
  topN: number = 8
): string[] {
  const result = extractKeywordsWithScores(chapters, topN);
  return result.map(([term]) => term);
}

/**
 * Extract keywords with their TF-IDF scores for cross-checking.
 * Returns [term, score][] sorted by score descending.
 */
function extractKeywordsWithScores(
  chapters: ThesisChapter[],
  topN: number = 8
): Array<[string, number]> {
  if (!chapters || chapters.length === 0) return [];

  // Treat each chapter as a "document" for IDF calculation
  const docs = chapters.map((ch) => {
    const chapterText = [
      ch.content || '',
      ...(ch.subSections || []).map((ss) => ss.content || ''),
    ].join(' ');
    return tokenize(chapterText);
  });

  const totalDocs = docs.length;

  // Filter out empty docs
  const nonEmptyDocs = docs.filter((d) => d.length > 0);
  if (nonEmptyDocs.length === 0) return [];

  // IDF: log(N / df) where df = number of docs containing the term
  const df: Record<string, number> = {};
  for (const doc of nonEmptyDocs) {
    const unique = new Set(doc);
    for (const term of unique) df[term] = (df[term] || 0) + 1;
  }

  // Combined TF across all chapters (thesis-level TF)
  const allTokens = nonEmptyDocs.flat();
  if (allTokens.length === 0) return [];

  const globalTF = computeTF(allTokens);

  // TF-IDF score per term
  const scores: Record<string, number> = {};
  for (const [term, tf] of Object.entries(globalTF)) {
    const idf =
      Math.log((totalDocs + 1) / ((df[term] || 0) + 1)) + 1;
    scores[term] = tf * idf;
  }

  // Boost bigrams
  const bigrams = extractBigrams(allTokens);
  for (const [bigram, score] of Object.entries(bigrams)) {
    scores[bigram] = score * 1.4;
  }

  // Bug 10: Boost proper nouns — words that appear capitalized mid-sentence
  // Scan original text (not lowercased) for capitalized words not at sentence start
  const allOriginalText = chapters
    .map((ch) => {
      return [
        ch.content || '',
        ...(ch.subSections || []).map((ss) => ss.content || ''),
      ].join(' ');
    })
    .join(' ');

  // Collect words that start sentences (so we can exclude them)
  const sentenceStarters = new Set<string>();
  const startPattern = /(?:^|[.!?]\s+)([A-Z][a-z]{2,})/g;
  let ssMatch: RegExpExecArray | null;
  while ((ssMatch = startPattern.exec(allOriginalText)) !== null) {
    sentenceStarters.add(ssMatch[1].toLowerCase());
  }

  // Find capitalized words mid-sentence (likely proper nouns)
  const midSentenceCapitalized = allOriginalText.match(/(?<=[a-z]\s)([A-Z][a-z]{2,})/g) || [];
  const properNouns = new Set<string>();
  for (const word of midSentenceCapitalized) {
    if (!sentenceStarters.has(word.toLowerCase()) && !ACADEMIC_STOPWORDS.has(word.toLowerCase())) {
      properNouns.add(word.toLowerCase());
    }
  }

  // Boost proper noun scores by 1.6x
  for (const pn of properNouns) {
    if (scores[pn] !== undefined) {
      scores[pn] *= 1.6;
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

/**
 * Cross-check extracted keywords against user-entered keywords.
 *
 * Returns:
 * - suggestedAdditions: keywords the algorithm found but the user didn't enter
 * - irrelevantEntries: user keywords not found in the thesis content
 * - alignmentScore: 0-1 indicating how well user keywords match extracted ones
 *
 * Pure function: (chapters, userKeywords) → CrossCheckResult
 */
export function crossCheckKeywords(
  chapters: ThesisChapter[],
  userKeywords: string[]
): CrossCheckResult {
  // Extract keywords with scores
  const extractedWithScores = extractKeywordsWithScores(chapters, 15);
  const extractedKeywords = extractedWithScores.map(([term]) => term);

  const userLower = userKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
  const extractedLower = extractedKeywords.map((k) => k.toLowerCase());

  // Build a set of extracted keyword stems for fuzzy matching
  const extractedStems = new Set(extractedLower);

  // Suggested additions: extracted keywords not similar to any user keyword
  const suggestedAdditions: string[] = [];
  for (const [term, score] of extractedWithScores) {
    const termLower = term.toLowerCase();
    // Check if this term is already covered by a user keyword (exact or contains)
    const isCovered = userLower.some(
      (uk) => uk === termLower || uk.includes(termLower) || termLower.includes(uk)
    );
    if (!isCovered) {
      suggestedAdditions.push(term);
    }
  }
  // Limit to top 5 suggestions
  const limitedSuggestions = suggestedAdditions.slice(0, 5);

  // Irrelevant entries: user keywords not found in any chapter content
  const allContent = chapters
    .map((ch) => {
      return [
        ch.content || '',
        ...(ch.subSections || []).map((ss) => ss.content || ''),
      ].join(' ').toLowerCase();
    })
    .join(' ');

  const irrelevantEntries: string[] = [];
  for (let i = 0; i < userKeywords.length; i++) {
    const kw = userKeywords[i].toLowerCase().trim();
    if (!kw) continue;

    // Check if the keyword appears in the content or in extracted keywords
    const inContent = allContent.includes(kw);
    const inExtracted = extractedStems.has(kw) ||
      extractedLower.some((e) => e.includes(kw) || kw.includes(e));

    if (!inContent && !inExtracted) {
      irrelevantEntries.push(userKeywords[i]);
    }
  }

  // Alignment score: fraction of user keywords that match extracted/content
  let matchCount = 0;
  for (const uk of userLower) {
    const inContent = allContent.includes(uk);
    const inExtracted = extractedStems.has(uk) ||
      extractedLower.some((e) => e.includes(uk) || uk.includes(e));
    if (inContent || inExtracted) {
      matchCount++;
    }
  }
  const alignmentScore = userLower.length > 0
    ? Math.round((matchCount / userLower.length) * 100) / 100
    : userKeywords.length === 0 ? 1.0 : 0;

  return {
    extractedKeywords,
    userKeywords,
    suggestedAdditions: limitedSuggestions,
    irrelevantEntries,
    alignmentScore,
  };
}
