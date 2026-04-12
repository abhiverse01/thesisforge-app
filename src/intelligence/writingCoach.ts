// ============================================================
// ThesisForge Intelligence — Algorithm 10: Adaptive Writing Coach
// Pure-function writing quality analyzer for academic theses.
// No side effects. No async. No DOM. Zero new dependencies.
// ============================================================

import type { ThesisData, ThesisChapter } from '@/lib/thesis-types';
import { generateCiteKey } from '@/core/bib';

// ─────────────────────────────────────────────────────────────
// Exported Types
// ─────────────────────────────────────────────────────────────

export interface CoachSuggestion {
  ruleId: string;
  category: 'structure' | 'argument' | 'citation' | 'language' | 'academic-style';
  severity: 'critical' | 'major' | 'minor';
  chapterId: string;
  location: 'opening' | 'body' | 'closing' | 'subsection';
  headline: string;
  detail: string;
  suggestedAction: string;
  exampleText?: string;
}

export interface CoachResult {
  suggestions: CoachSuggestion[];
  coachScore: number;
  scoreBreakdown: {
    structure: number;
    argument: number;
    citation: number;
    language: number;
    academicStyle: number;
  };
  dismissedRules: Set<string>;
}

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

/** Combine chapter content + all subsection content into a single string. */
function getChapterFullText(ch: ThesisChapter): string {
  const parts: string[] = [];
  if (ch.content) parts.push(ch.content);
  for (const ss of ch.subSections) {
    if (ss.content) parts.push(ss.content);
  }
  return parts.join('\n\n');
}

/** Split text into paragraphs (separated by blank lines). */
function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

/** Split text into sentences. Handles common abbreviations. */
function splitSentences(text: string): string[] {
  // Remove LaTeX commands first for cleaner splitting
  const clean = text
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}$%&_^~]/g, ' ');
  return clean
    .split(/(?<=[.!?])\s+(?=[A-Z"''(])/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

/** Count words in plain text (strips LaTeX). */
function countWords(text: string): number {
  if (!text) return 0;
  const stripped = text
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}\\$#_^~&%]/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim();
  return stripped.split(/\s+/).filter(Boolean).length;
}

/** Extract all \cite{key1,key2,...} keys from text, flattened. */
function extractCiteKeys(text: string): string[] {
  if (!text) return [];
  const pattern = /\\cite(?:p|t|author|year|alp|num)?\{([^}]+)\}/g;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    m[1].split(',').map(k => k.trim()).forEach(k => { if (k) keys.push(k); });
  }
  return keys;
}

/** Generate a cite-key from a reference (same pipeline as bib.ts). */
function refToCiteKey(ref: { authors: string; title: string; year: string; type: string }): string {
  return generateCiteKey(ref);
}

/** Build a map: citeKey → ThesisReference. */
function buildRefMap(references: ThesisData['references']): Map<string, typeof references[number]> {
  const map = new Map<string, typeof references[number]>();
  for (const ref of references) {
    const key = refToCiteKey(ref);
    map.set(key, ref);
    // Also map by id for fallback
    map.set(ref.id, ref);
  }
  return map;
}

/** Extract the first author's surname from a BibTeX-style author string. */
function extractFirstAuthorSurname(authors: string): string {
  if (!authors) return '';
  const first = authors.split(/(?:\s+and\s+|;\s+)/)[0].trim();
  // Handle "Surname, Firstname" pattern
  const commaMatch = first.match(/^([A-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\-]+)/i);
  if (commaMatch) return commaMatch[1].toLowerCase();
  // Handle "Firstname Surname" pattern — take last token
  const tokens = first.split(/\s+/);
  return (tokens[tokens.length - 1] || '').toLowerCase();
}

/** Detect the location of a position (word offset) within a chapter. */
function detectLocation(
  chapter: ThesisChapter,
  wordOffset: number,
  chapterWordCount: number
): CoachSuggestion['location'] {
  if (chapter.subSections.length > 0) {
    // Walk through content + subsections to find which section the word falls in
    let offset = 0;
    const mainWords = countWords(chapter.content || '');
    if (wordOffset < mainWords) {
      return wordOffset < 200 ? 'opening' : (mainWords - wordOffset < 200 ? 'closing' : 'body');
    }
    offset = mainWords;
    for (const ss of chapter.subSections) {
      const ssWords = countWords(ss.content || '');
      if (wordOffset < offset + ssWords) return 'subsection';
      offset += ssWords;
    }
  }
  if (wordOffset < 200) return 'opening';
  if (chapterWordCount - wordOffset < 200) return 'closing';
  return 'body';
}

/** Check if a chapter title matches a role (case-insensitive substring). */
function chapterMatches(ch: ThesisChapter, ...patterns: RegExp[]): boolean {
  const t = ch.title.toLowerCase();
  return patterns.some(p => p.test(t));
}

/** Dedupe helper: build a dismissed key from ruleId + chapterId. */
function dismissedKey(ruleId: string, chapterId: string): string {
  return `${ruleId}::${chapterId}`;
}

/** Word overlap percentage between two strings (Jaccard-like on lowercase words). */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
  return intersection / Math.min(wordsA.size, wordsB.size);
}

// ─────────────────────────────────────────────────────────────
// Rule Implementations
// ─────────────────────────────────────────────────────────────

// ================================================================
// STRUCTURE RULES (S01–S05)
// ================================================================

function checkS01_IntroGap(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const intro = thesis.chapters.find(ch =>
    chapterMatches(ch, /intro/i)
  );
  if (!intro) return;
  const text = getChapterFullText(intro).toLowerCase();
  if (!text) return;

  const gapPhrases = [
    'however', 'despite', 'although', 'yet',
    'little is known', 'no study has', 'remains unclear',
  ];
  const hasGap = gapPhrases.some(p => text.includes(p));
  if (!hasGap) {
    const dk = dismissedKey('S01', intro.id);
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'S01',
      category: 'structure',
      severity: 'critical',
      chapterId: intro.id,
      location: 'body',
      headline: 'Introduction missing research gap',
      detail: `No contrast phrases like "however", "despite", "although", "yet", "little is known", or "no study has" were found in "${intro.title}". A strong introduction must clearly identify the gap in the existing literature.`,
      suggestedAction: 'Add a paragraph that transitions from the current state of knowledge to the specific gap your thesis addresses, using phrases like "However, little is known about…" or "Despite recent advances, no study has…"',
      exampleText: 'However, despite growing interest in this area, little is known about how these mechanisms interact under real-world conditions.',
    });
  }
}

function checkS02_MethodJustification(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const methodCh = thesis.chapters.find(ch =>
    chapterMatches(ch, /method|approach|design/i)
  );
  if (!methodCh) return;
  const text = getChapterFullText(methodCh).toLowerCase();
  if (!text) return;

  const justPhrases = [
    'because', 'since', 'chosen because', 'appropriate for',
    'was selected', 'was chosen', 'we opted for',
  ];
  const hasJust = justPhrases.some(p => text.includes(p));
  if (!hasJust) {
    const dk = dismissedKey('S02', methodCh.id);
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'S02',
      category: 'structure',
      severity: 'major',
      chapterId: methodCh.id,
      location: 'body',
      headline: 'Methodology lacks justification',
      detail: `No justification phrases like "because", "chosen because", "appropriate for", or "was selected" were found in "${methodCh.title}". Readers need to understand why you chose this methodology over alternatives.`,
      suggestedAction: 'After describing each method, add a sentence explaining why it was chosen: "This approach was selected because…" or "A semi-structured interview method was appropriate for…"',
      exampleText: 'A mixed-methods approach was chosen because it combines the statistical power of quantitative analysis with the depth of qualitative insights.',
    });
  }
}

function checkS03_ResultsInterpretation(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const resultsCh = thesis.chapters.find(ch =>
    chapterMatches(ch, /result|finding|experiment|eval/i)
  );
  if (!resultsCh) return;
  const text = getChapterFullText(resultsCh).toLowerCase();
  if (!text) return;

  const interpPhrases = [
    'this suggests', 'this indicates', 'this implies',
    'importantly', 'notably', 'interestingly',
  ];
  const matches: { phrase: string; index: number }[] = [];
  for (const phrase of interpPhrases) {
    let idx = text.indexOf(phrase);
    while (idx !== -1) {
      matches.push({ phrase, index: idx });
      idx = text.indexOf(phrase, idx + 1);
    }
  }
  if (matches.length > 0) {
    const dk = dismissedKey('S03', resultsCh.id);
    if (dismissed.has(dk)) return;
    const chWordCount = countWords(text);
    const loc = detectLocation(resultsCh, Math.floor((matches[0].index / text.length) * chWordCount), chWordCount);
    out.push({
      ruleId: 'S03',
      category: 'structure',
      severity: 'major',
      chapterId: resultsCh.id,
      location: loc,
      headline: 'Results chapter contains interpretive language',
      detail: `Found ${matches.length} interpretive phrase(s) in "${resultsCh.title}" (e.g., "${matches[0].phrase}"). Interpretation belongs in the Discussion chapter, not Results.`,
      suggestedAction: 'Restructure the Results chapter to present findings objectively (data, statistics, observations). Move interpretive language to the Discussion chapter.',
      exampleText: 'Replace "This suggests that the model outperformed baselines" with "The model achieved 94.2% accuracy compared to 87.1% for the nearest baseline (Table 3)."',
    });
  }
}

function checkS04_DiscussionRQReference(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const intro = thesis.chapters.find(ch => chapterMatches(ch, /intro/i));
  const discussion = thesis.chapters.find(ch =>
    chapterMatches(ch, /discussion|interpretation|analysis/i)
  );
  if (!intro || !discussion) return;

  const introText = getChapterFullText(intro);
  const discussionText = getChapterFullText(discussion).toLowerCase();
  if (!introText || !discussionText) return;

  // Extract key phrases from intro's first 3 paragraphs
  const introParas = splitParagraphs(introText).slice(0, 3);
  const keyPhrases: string[] = [];
  for (const para of introParas) {
    // Extract significant noun phrases (3+ word sequences starting with uppercase)
    const phrases = para.match(/[A-Z][a-z]+(?:\s+[a-z]+){2,}/g) || [];
    for (const p of phrases) {
      if (p.length > 12) keyPhrases.push(p);
    }
  }

  const matchedPhrases = keyPhrases.filter(p => discussionText.includes(p.toLowerCase()));
  if (matchedPhrases.length === 0 && keyPhrases.length > 2) {
    const dk = dismissedKey('S04', discussion.id);
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'S04',
      category: 'structure',
      severity: 'critical',
      chapterId: discussion.id,
      location: 'body',
      headline: 'Discussion does not reference research questions',
      detail: `"${discussion.title}" does not appear to reference the research questions or key concepts from "${intro.title}". A strong discussion should explicitly connect findings back to each research question.`,
      suggestedAction: 'Structure your discussion section around your research questions. Begin each subsection by restating the question, then discuss how the findings address it.',
      exampleText: 'Returning to RQ1 — "What factors influence adoption?" — the survey results indicate that perceived usefulness was the strongest predictor (β = 0.42, p < .001).',
    });
  }
}

function checkS05_ConclusionNewRefs(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const conclusion = thesis.chapters.find(ch =>
    chapterMatches(ch, /conclu|summary|future/i)
  );
  if (!conclusion) return;
  const conclusionCites = new Set(extractCiteKeys(getChapterFullText(conclusion)));

  // Collect all cite keys from all earlier chapters
  const earlierCites = new Set<string>();
  for (const ch of thesis.chapters) {
    if (ch.id === conclusion.id) break;
    for (const k of extractCiteKeys(getChapterFullText(ch))) {
      earlierCites.add(k);
    }
  }

  const newRefs: string[] = [];
  for (const k of conclusionCites) {
    if (!earlierCites.has(k)) newRefs.push(k);
  }
  if (newRefs.length > 0) {
    const dk = dismissedKey('S05', conclusion.id);
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'S05',
      category: 'structure',
      severity: 'minor',
      chapterId: conclusion.id,
      location: 'closing',
      headline: 'Conclusion introduces new references',
      detail: `Found ${newRefs.length} citation(s) in "${conclusion.title}" that do not appear in any earlier chapter: ${newRefs.slice(0, 3).join(', ')}${newRefs.length > 3 ? '…' : ''}. Conclusions should synthesize existing discussions, not introduce new sources.`,
      suggestedAction: 'Remove citations from the conclusion that haven\'t been discussed earlier. If a reference is important, introduce it in the Discussion or Literature Review first.',
    });
  }
}

// ================================================================
// ARGUMENT RULES (A01–A05)
// ================================================================

function checkA01_TransitionalClosing(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const transWords = [
    'in the next', 'following this', 'subsequent',
    'the next chapter', 'having established', 'with this',
  ];

  for (const ch of thesis.chapters) {
    // Skip the last chapter — no "next chapter" needed
    if (ch.number >= thesis.chapters.length && thesis.chapters.length > 1) continue;

    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 50) continue;

    const sentences = splitSentences(text);
    if (sentences.length === 0) continue;
    const lastSentence = sentences[sentences.length - 1].toLowerCase();

    const hasTransition = transWords.some(w => lastSentence.includes(w));
    if (!hasTransition) {
      const dk = dismissedKey('A01', ch.id);
      if (dismissed.has(dk)) continue;
      out.push({
        ruleId: 'A01',
        category: 'argument',
        severity: 'minor',
        chapterId: ch.id,
        location: 'closing',
        headline: `Chapter "${ch.title}" lacks transitional closing`,
        detail: `The last sentence of "${ch.title}" does not transition to the next chapter. Transitional closings improve the narrative flow.`,
        suggestedAction: 'Add a closing sentence that previews the next chapter, e.g., "Having established the theoretical framework, the next chapter describes the methodology…"',
        exampleText: 'Having established the theoretical framework, the following chapter presents the research methodology used to investigate these questions.',
      });
    }
  }
}

function checkA02_ClaimDensity(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const claimWords = ['shows', 'demonstrates', 'proves', 'findings', 'results indicate'];
  const CLAIM_THRESHOLD = 3;
  const WINDOW = 500; // words

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 200) continue;

    const sentences = splitSentences(text);
    if (sentences.length === 0) continue;

    // Extract cite key positions as word offsets (approximate)
    const citePositions = new Set<number>();
    const allWords = text.split(/\s+/);
    let wordIdx = 0;
    for (const sentence of sentences) {
      const sentLen = sentence.split(/\s+/).length;
      const hasCite = /\\cite/.test(sentence);
      if (hasCite) {
        // Mark a window of ±50 words around the cite
        for (let w = Math.max(0, wordIdx - 50); w <= wordIdx + sentLen + 50; w++) {
          citePositions.add(w);
        }
      }
      wordIdx += sentLen;
    }

    // Slide a 500-word window
    const totalWords = allWords.length;
    for (let start = 0; start < totalWords; start += Math.floor(WINDOW / 2)) {
      const end = Math.min(start + WINDOW, totalWords);
      const windowSentences: string[] = [];
      const windowStart = start;
      const windowEnd = end;

      let wIdx = 0;
      for (const sentence of sentences) {
        const sLen = sentence.split(/\s+/).length;
        if (wIdx + sLen > windowStart && wIdx < windowEnd) {
          windowSentences.push(sentence);
        }
        wIdx += sLen;
      }

      const claimCount = windowSentences.filter(s =>
        claimWords.some(cw => s.toLowerCase().includes(cw))
      ).length;

      // Check if the window has enough cite coverage
      const citedWords = [...citePositions].filter(w => w >= windowStart && w <= windowEnd).length;
      const hasCitation = citedWords > 0;

      if (claimCount > CLAIM_THRESHOLD && !hasCitation) {
        const dk = dismissedKey('A02', ch.id);
        if (dismissed.has(dk)) continue;
        const loc = detectLocation(ch, windowStart, totalWords);
        out.push({
          ruleId: 'A02',
          category: 'argument',
          severity: 'major',
          chapterId: ch.id,
          location: loc,
          headline: `High claim density without citations in "${ch.title}"`,
          detail: `Found ${claimCount} assertive sentences in a ~500-word section without nearby citations. Every factual claim should be supported by a reference.`,
          suggestedAction: 'Add citations to support assertive statements. For claims about prior work, cite the relevant source. For your own findings, reference your results section.',
          exampleText: 'Previous studies have demonstrated significant improvements in classification accuracy [cite], and recent findings further confirm this trend [cite].',
        });
        break; // One per chapter is enough
      }
    }
  }
}

function checkA03_StructuralMonotony(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const badStarts = /^(the|this)\s/i;
  const MIN_SENTENCES = 5;

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text) continue;

    const paragraphs = splitParagraphs(text);
    let flagged = false;

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const sentences = splitSentences(para);
      if (sentences.length < MIN_SENTENCES) continue;

      const allStartWithThis = sentences.every(s => {
        const trimmed = s.trimStart();
        return badStarts.test(trimmed);
      });

      if (allStartWithThis) {
        const dk = dismissedKey('A03', ch.id);
        if (dismissed.has(dk)) continue;
        const wordOffset = paragraphs.slice(0, pIdx).reduce((sum, p) => sum + countWords(p), 0);
        const loc = detectLocation(ch, wordOffset, countWords(text));
        out.push({
          ruleId: 'A03',
          category: 'argument',
          severity: 'minor',
          chapterId: ch.id,
          location: loc,
          headline: `Structural monotony in "${ch.title}"`,
          detail: `A paragraph with ${sentences.length} sentences was found where every sentence begins with "The" or "This". This creates a monotonous rhythm that reduces readability.`,
          suggestedAction: 'Vary sentence openings by using transitional phrases, adverbs, or restructuring. Consider starting some sentences with the subject, a prepositional phrase, or a subordinate clause.',
          exampleText: 'The results confirm the hypothesis. However, an unexpected pattern emerged in the control group. This discrepancy may stem from… → "The results confirm the hypothesis. However, an unexpected pattern emerged in the control group. Such discrepancies may stem from…"',
        });
        flagged = true;
        break;
      }
    }
    if (flagged) break; // One per chapter
  }
}

function checkA04_LiteratureSynthesis(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const litReview = thesis.chapters.find(ch =>
    chapterMatches(ch, /literature|review|related work|state of the art/i)
  );
  if (!litReview) return;
  const text = getChapterFullText(litReview).toLowerCase();
  if (!text || countWords(text) < 100) return;

  const synthPhrases = [
    'taken together', 'collectively', 'across these studies',
    'overall', 'in aggregate', 'combining', 'synthesizing',
    'a common theme', 'converging evidence',
  ];
  const hasSynthesis = synthPhrases.some(p => text.includes(p));
  if (!hasSynthesis) {
    const dk = dismissedKey('A04', litReview.id);
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'A04',
      category: 'argument',
      severity: 'critical',
      chapterId: litReview.id,
      location: 'body',
      headline: 'Literature review lacks synthesis',
      detail: `No synthesis connectives were found in "${litReview.title}". A literature review should not merely list studies — it must synthesize them into themes, identify patterns, and highlight agreements or contradictions.`,
      suggestedAction: 'Add synthesis paragraphs that compare and contrast findings across studies. Use phrases like "Taken together, these studies suggest…" or "A common theme across the literature is…"',
      exampleText: 'Taken together, these studies converge on the finding that user engagement drops significantly after the initial onboarding phase, although the specific mechanisms remain debated.',
    });
  }
}

function checkA05_ContributionEcho(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const intro = thesis.chapters.find(ch => chapterMatches(ch, /intro/i));
  const conclusion = thesis.chapters.find(ch =>
    chapterMatches(ch, /conclu|summary/i)
  );
  if (!intro || !conclusion) return;

  const introText = getChapterFullText(intro);
  const conclusionText = getChapterFullText(conclusion);
  if (!introText || !conclusionText) return;

  // Find sentences in intro mentioning "contribution" or "contribute"
  const introSentences = splitSentences(introText);
  const contribSentences = introSentences.filter(s =>
    /\bcontribution|contribute/i.test(s)
  );

  if (contribSentences.length === 0) return;

  const conclusionLower = conclusionText.toLowerCase();
  const unmatched = contribSentences.filter(
    s => wordOverlap(s, conclusionText) < 0.5
  );

  if (unmatched.length > 0) {
    const dk = dismissedKey('A05', conclusion.id);
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'A05',
      category: 'argument',
      severity: 'major',
      chapterId: conclusion.id,
      location: 'closing',
      headline: 'Contributions not echoed in conclusion',
      detail: `The introduction states ${contribSentences.length} contribution(s), but ${unmatched.length} do not appear to be restated or confirmed in "${conclusion.title}". The conclusion should echo each contribution.`,
      suggestedAction: 'Structure your conclusion to explicitly revisit each contribution stated in the introduction. Use similar phrasing and confirm whether the contribution was achieved.',
      exampleText: 'Introduction: "The main contribution of this thesis is a novel framework for…" → Conclusion: "As stated in the introduction, this thesis contributes a novel framework for…, which was validated in Chapter 5."',
    });
  }
}

// ================================================================
// CITATION RULES (C01–C05)
// ================================================================

function checkC01_FirstAuthorOverReliance(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>,
  refMap: Map<string, typeof thesis.references[number]>
): void {
  const THRESHOLD = 0.4;

  for (const ch of thesis.chapters) {
    const citeKeys = extractCiteKeys(getChapterFullText(ch));
    if (citeKeys.length < 5) continue; // Need at least 5 citations

    // Map cite keys to first author surnames
    const authorCounts = new Map<string, number>();
    let resolved = 0;

    for (const key of citeKeys) {
      const ref = refMap.get(key);
      if (ref) {
        const surname = extractFirstAuthorSurname(ref.authors);
        if (surname) {
          authorCounts.set(surname, (authorCounts.get(surname) || 0) + 1);
          resolved++;
        }
      }
    }

    if (resolved === 0) continue;

    for (const [surname, count] of authorCounts) {
      const ratio = count / resolved;
      if (ratio > THRESHOLD) {
        const dk = dismissedKey('C01', ch.id);
        if (dismissed.has(dk)) continue;
        out.push({
          ruleId: 'C01',
          category: 'citation',
          severity: 'major',
          chapterId: ch.id,
          location: 'body',
          headline: `Over-reliance on author "${surname}" in "${ch.title}"`,
          detail: `${surname} accounts for ${Math.round(ratio * 100)}% of citations in "${ch.title}" (${count} of ${resolved}). This suggests a narrow evidence base for the claims in this chapter.`,
          suggestedAction: 'Broaden your reference base by citing additional authors who have studied the same topic. Diverse sources strengthen the argument.',
        });
        break; // One per chapter
      }
    }
  }
}

function checkC02_NoRecentCitations(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>,
  refMap: Map<string, typeof thesis.references[number]>
): void {
  const currentYear = new Date().getFullYear();
  const cutoffYear = currentYear - 5;

  for (const ch of thesis.chapters) {
    const citeKeys = extractCiteKeys(getChapterFullText(ch));
    if (citeKeys.length < 3) continue;

    let hasRecent = false;
    for (const key of citeKeys) {
      const ref = refMap.get(key);
      if (ref) {
        const year = parseInt(ref.year, 10);
        if (!isNaN(year) && year >= cutoffYear) {
          hasRecent = true;
          break;
        }
      }
    }

    if (!hasRecent) {
      const dk = dismissedKey('C02', ch.id);
      if (dismissed.has(dk)) continue;
      out.push({
        ruleId: 'C02',
        category: 'citation',
        severity: 'major',
        chapterId: ch.id,
        location: 'body',
        headline: `No recent citations in "${ch.title}"`,
        detail: `None of the citations in "${ch.title}" are from the last 5 years (${cutoffYear}–${currentYear}). Academic writing should reference recent scholarship to demonstrate currency.`,
        suggestedAction: `Search for publications from ${cutoffYear}–${currentYear} on the topics discussed in this chapter. Recent sources demonstrate awareness of the current state of the field.`,
      });
    }
  }
}

function checkC03_AuthorProminentOveruse(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const THRESHOLD = 0.6;

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 200) continue;

    const sentences = splitSentences(text);
    const sentencesWithCites = sentences.filter(s => /\\cite/.test(s));
    if (sentencesWithCites.length < 3) continue;

    // Author-prominent: "AuthorName (year)" or "AuthorName et al. (year)" at start of sentence
    const authorProminentPattern = /^[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?\s*\(\d{4}\)/;
    let authorProminent = 0;
    let claimProminent = 0;

    for (const s of sentencesWithCites) {
      if (authorProminentPattern.test(s.trim())) {
        authorProminent++;
      } else {
        claimProminent++;
      }
    }

    const total = authorProminent + claimProminent;
    if (total === 0) continue;
    const ratio = authorProminent / total;

    if (ratio > THRESHOLD) {
      const dk = dismissedKey('C03', ch.id);
      if (dismissed.has(dk)) continue;
      out.push({
        ruleId: 'C03',
        category: 'citation',
        severity: 'minor',
        chapterId: ch.id,
        location: 'body',
        headline: `Overuse of author-prominent citations in "${ch.title}"`,
        detail: `${Math.round(ratio * 100)}% of citation contexts in "${ch.title}" use the author-prominent pattern ("Smith (2021) argues…"). Aim for a mix with claim-prominent citations ("…as shown by Smith (2021)") for better readability.`,
        suggestedAction: 'Vary your citation style. Use claim-prominent citations to foreground your own argument: "Prior research has established… (Smith, 2021; Jones, 2020)."',
        exampleText: 'Instead of: "Smith (2021) argues that X. Jones (2020) demonstrates Y. Lee (2019) shows Z."\nTry: "Several studies have established X, Y, and Z (Smith, 2021; Jones, 2020; Lee, 2019)."',
      });
    }
  }
}

function checkC04_SingleChapterFoundational(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>,
  refMap: Map<string, typeof thesis.references[number]>
): void {
  const CLUSTER_THRESHOLD = 5;

  // Count per-chapter citations for each reference
  const refChapterCounts = new Map<string, Map<string, number>>();

  for (const ch of thesis.chapters) {
    const citeKeys = extractCiteKeys(getChapterFullText(ch));
    for (const key of citeKeys) {
      if (!refChapterCounts.has(key)) refChapterCounts.set(key, new Map());
      const counts = refChapterCounts.get(key)!;
      counts.set(ch.id, (counts.get(ch.id) || 0) + 1);
    }
  }

  for (const [citeKey, chapterCounts] of refChapterCounts) {
    for (const [chId, count] of chapterCounts) {
      if (count >= CLUSTER_THRESHOLD && chapterCounts.size === 1) {
        const ch = thesis.chapters.find(c => c.id === chId);
        const ref = refMap.get(citeKey);
        const refLabel = ref ? ref.title?.slice(0, 40) || citeKey : citeKey;

        // Check if this is the only chapter (dismiss if thesis has only 1 chapter)
        if (thesis.chapters.length <= 1) continue;

        const dk = dismissedKey('C04', chId);
        if (dismissed.has(dk)) continue;
        out.push({
          ruleId: 'C04',
          category: 'citation',
          severity: 'minor',
          chapterId: chId,
          location: 'body',
          headline: `Single-chapter citation cluster for "${refLabel}"`,
          detail: `The reference "${refLabel}" is cited ${count} times in "${ch?.title || 'unknown'}" but not in any other chapter. Consider whether this source is relevant elsewhere.`,
          suggestedAction: 'Review whether this reference supports claims in other chapters. If it\'s a foundational work, it may be worth citing in the literature review or introduction as well.',
        });
        break; // One per chapter
      }
    }
  }
}

function checkC05_SelfCitationCluster(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>,
  refMap: Map<string, typeof thesis.references[number]>
): void {
  const THRESHOLD = 0.2;
  const authorName = (thesis.metadata.author || '').trim().toLowerCase();
  if (!authorName || authorName.length < 2) return;

  // Count total references and self-citations
  let totalRefs = 0;
  let selfRefs = 0;

  for (const ref of thesis.references) {
    const refAuthors = (ref.authors || '').toLowerCase();
    // Check if the thesis author appears as any author in the reference
    const authorParts = authorName.split(/\s+/).filter(w => w.length > 2);
    const isSelf = authorParts.some(part =>
      refAuthors.includes(part)
    );
    totalRefs++;
    if (isSelf) selfRefs++;
  }

  if (totalRefs === 0 || selfRefs === 0) return;

  const ratio = selfRefs / totalRefs;
  if (ratio > THRESHOLD) {
    // Find a representative chapter
    const ch = thesis.chapters[0];
    const dk = dismissedKey('C05', ch?.id || 'global');
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'C05',
      category: 'citation',
      severity: 'major',
      chapterId: ch?.id || '',
      location: 'body',
      headline: 'Self-citation rate is unusually high',
      detail: `${Math.round(ratio * 100)}% of your references (${selfRefs} of ${totalRefs}) appear to be self-citations (matching "${thesis.metadata.author}"). While some self-citation is normal, excessive self-citation can undermine credibility.`,
      suggestedAction: 'Review your references and ensure the majority are independent, external sources. Self-citations should be limited to your own prior publications that are directly relevant.',
    });
  }
}

// ================================================================
// LANGUAGE RULES (L01–L05)
// ================================================================

function checkL01_FirstPersonSingular(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const firstPersonPatterns = [
    /\bi believe\b/i,
    /\bi think\b/i,
    /\bi feel\b/i,
    /\bi argue\b/i,
    /\bi claim\b/i,
    /\bi found\b/i,
    /\bi observed\b/i,
    /\bi conclude\b/i,
  ];

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 50) continue;

    const matches: { pattern: string; index: number }[] = [];
    for (const pattern of firstPersonPatterns) {
      let m: RegExpExecArray | null;
      const re = new RegExp(pattern.source, 'gi');
      while ((m = re.exec(text)) !== null) {
        matches.push({ pattern: m[0], index: m.index });
      }
    }

    if (matches.length > 0) {
      const dk = dismissedKey('L01', ch.id);
      if (dismissed.has(dk)) continue;
      const chWordCount = countWords(text);
      const loc = detectLocation(ch, Math.floor((matches[0].index / text.length) * chWordCount), chWordCount);
      out.push({
        ruleId: 'L01',
        category: 'language',
        severity: 'minor',
        chapterId: ch.id,
        location: loc,
        headline: `First person singular in "${ch.title}"`,
        detail: `Found ${matches.length} instance(s) of first person singular (e.g., "${matches[0].pattern}") in "${ch.title}". Academic writing typically avoids first person singular.`,
        suggestedAction: 'Replace first person singular with passive voice or "we" (if applicable). For example: "I found that…" → "The analysis revealed that…" or "We found that…"',
        exampleText: '"I believe this approach is superior" → "This approach demonstrates superior performance" or "We argue that this approach is superior."',
      });
    }
  }
}

function checkL02_HedgingOverload(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const hedgeWords = [
    'might', 'could', 'possibly', 'perhaps', 'seems to',
    'appears to', 'may', 'arguably', 'potentially',
  ];

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 100) continue;

    const paragraphs = splitParagraphs(text);

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const sentences = splitSentences(para);
      if (sentences.length < 3) continue;

      let totalHedges = 0;
      let sentCount = 0;

      for (const s of sentences) {
        const lower = s.toLowerCase();
        let count = 0;
        for (const hedge of hedgeWords) {
          const regex = new RegExp(`\\b${hedge}\\b`, 'gi');
          const matches = lower.match(regex);
          if (matches) count += matches.length;
        }
        totalHedges += count;
        sentCount++;
      }

      const avg = totalHedges / sentCount;
      if (avg > 1.0) {
        const dk = dismissedKey('L02', ch.id);
        if (dismissed.has(dk)) continue;
        const wordOffset = paragraphs.slice(0, pIdx).reduce((sum, p) => sum + countWords(p), 0);
        const loc = detectLocation(ch, wordOffset, countWords(text));
        out.push({
          ruleId: 'L02',
          category: 'language',
          severity: 'minor',
          chapterId: ch.id,
          location: loc,
          headline: `Excessive hedging in "${ch.title}"`,
          detail: `A paragraph in "${ch.title}" averages ${avg.toFixed(1)} hedge word(s) per sentence. Over-hedging undermines confidence in your arguments.`,
          suggestedAction: 'Be selective with hedging. Reserve it for claims with genuine uncertainty. Replace some hedges with confident statements where your evidence supports it.',
          exampleText: '"This might possibly suggest that X could perhaps indicate Y" → "This suggests that X indicates Y."',
        });
        break; // One per chapter
      }
    }
  }
}

function checkL03_WeakNominalizations(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const nominalizations: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /\bmake a decision\b/i, replacement: 'decide' },
    { pattern: /\bgive consideration\b/i, replacement: 'consider' },
    { pattern: /\bprovide an explanation\b/i, replacement: 'explain' },
    { pattern: /\bmake an argument\b/i, replacement: 'argue' },
    { pattern: /\btake into consideration\b/i, replacement: 'consider' },
    { pattern: /\bcome to a conclusion\b/i, replacement: 'conclude' },
    { pattern: /\bmake use of\b/i, replacement: 'use' },
    { pattern: /\bgive an overview\b/i, replacement: 'overview' },
    { pattern: /\bhave an effect\b/i, replacement: 'affect' },
    { pattern: /\bcarry out an analysis\b/i, replacement: 'analyze' },
    { pattern: /\bconduct an investigation\b/i, replacement: 'investigate' },
    { pattern: /\bplace emphasis on\b/i, replacement: 'emphasize' },
  ];

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 50) continue;

    const found: Array<{ match: string; replacement: string; index: number }> = [];

    for (const nom of nominalizations) {
      const re = new RegExp(nom.pattern.source, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        found.push({ match: m[0], replacement: nom.replacement, index: m.index });
      }
    }

    if (found.length > 0) {
      const dk = dismissedKey('L03', ch.id);
      if (dismissed.has(dk)) continue;
      const chWordCount = countWords(text);
      const loc = detectLocation(ch, Math.floor((found[0].index / text.length) * chWordCount), chWordCount);
      const examples = found.slice(0, 3).map(f => `"${f.match}" → "${f.replacement}"`).join(', ');
      out.push({
        ruleId: 'L03',
        category: 'language',
        severity: 'minor',
        chapterId: ch.id,
        location: loc,
        headline: `Weak nominalizations in "${ch.title}"`,
        detail: `Found ${found.length} weak nominalization(s): ${examples}. Using strong verbs instead of verb-noun phrases makes your writing more direct and concise.`,
        suggestedAction: 'Replace nominalizations with their verb equivalents for stronger, more concise prose.',
      });
    }
  }
}

function checkL04_VagueQuantifiers(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const vaguePhrases = [
    'many studies', 'several researchers', 'a number of',
    'various authors', 'numerous studies', 'few studies',
  ];

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 100) continue;

    const sentences = splitSentences(text);
    for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
      const sentence = sentences[sIdx];
      const lower = sentence.toLowerCase();
      const matched = vaguePhrases.find(vp => lower.includes(vp));
      if (!matched) continue;

      // Check if a \cite exists within 2 sentences
      const window = sentences.slice(sIdx, sIdx + 3).join(' ');
      const hasCite = /\\cite/.test(window);

      if (!hasCite) {
        const dk = dismissedKey('L04', ch.id);
        if (dismissed.has(dk)) continue;
        const wordOffset = sentences.slice(0, sIdx).reduce((sum, s) => sum + countWords(s), 0);
        const loc = detectLocation(ch, wordOffset, countWords(text));
        out.push({
          ruleId: 'L04',
          category: 'language',
          severity: 'major',
          chapterId: ch.id,
          location: loc,
          headline: `Vague quantifier without citation in "${ch.title}"`,
          detail: `The phrase "${matched}" appears without a supporting citation within the following 2 sentences. Vague quantifiers should be backed by specific references.`,
          suggestedAction: 'Add a citation to support the claim, or replace the vague quantifier with specific evidence: "many studies" → "Three recent meta-analyses (Smith, 2021; Jones, 2020; Lee, 2019)"',
        });
        break; // One per chapter
      }
    }
  }
}

function checkL05_TransitionOveruse(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const transitions = [
    'However', 'Therefore', 'Thus', 'Hence',
    'Moreover', 'Furthermore', 'Additionally', 'Consequently',
  ];
  const MAX_PER_CHAPTER = 3;

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 200) continue;

    const sentences = splitSentences(text);

    for (const transition of transitions) {
      const regex = new RegExp(`^${transition}[\\s,]`, 'i');
      const count = sentences.filter(s => regex.test(s.trim())).length;

      if (count > MAX_PER_CHAPTER) {
        const dk = dismissedKey('L05', ch.id);
        if (dismissed.has(dk)) continue;
        out.push({
          ruleId: 'L05',
          category: 'language',
          severity: 'minor',
          chapterId: ch.id,
          location: 'body',
          headline: `Overuse of "${transition}" in "${ch.title}"`,
          detail: `"${transition}" appears at the start of ${count} sentences in "${ch.title}" (max recommended: ${MAX_PER_CHAPTER}). Repetitive transitions make writing feel formulaic.`,
          suggestedAction: 'Replace some instances with alternative transitions or restructure sentences to avoid the need for an explicit transition word.',
          exampleText: 'Vary between: "However," "Nevertheless," "On the other hand," "In contrast," or restructure to connect ideas implicitly.',
        });
        break; // One per chapter (first overused transition)
      }
    }
  }
}

// ================================================================
// ACADEMIC STYLE RULES (AS01–AS05)
// ================================================================

function checkAS01_AbstractElements(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const abstract = (thesis.abstract || '').toLowerCase();
  if (!abstract || countWords(abstract) < 20) return;

  const requiredElements: Array<{ name: string; patterns: string[] }> = [
    { name: 'context', patterns: ['this study', 'this research', 'this paper', 'this thesis'] },
    { name: 'gap', patterns: ['however', 'despite', 'although', 'little is known', 'gap'] },
    { name: 'method', patterns: ['method', 'approach', 'technique', 'procedure', 'we propose', 'we present'] },
    { name: 'result', patterns: ['result', 'finding', 'outcome', 'show that', 'found that'] },
    { name: 'impact', patterns: ['implication', 'contribution', 'significance', 'importance'] },
  ];

  const missing: string[] = [];
  for (const el of requiredElements) {
    const found = el.patterns.some(p => abstract.includes(p));
    if (!found) missing.push(el.name);
  }

  if (missing.length > 0) {
    const dk = dismissedKey('AS01', 'abstract');
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'AS01',
      category: 'academic-style',
      severity: 'critical',
      chapterId: '',
      location: 'opening',
      headline: 'Abstract missing required elements',
      detail: `The abstract is missing ${missing.length} required element(s): ${missing.join(', ')}. A well-formed abstract should cover all five: context, research gap, method, results, and impact.`,
      suggestedAction: `Add the missing element(s) to your abstract. For example:
${missing.includes('context') ? '- Add a sentence establishing the context: "This study investigates…"\n' : ''}${missing.includes('gap') ? '- Identify the research gap: "However, little is known about…"\n' : ''}${missing.includes('method') ? '- Describe your method: "Using a mixed-methods approach…"\n' : ''}${missing.includes('result') ? '- State key results: "The results show that…"\n' : ''}${missing.includes('impact') ? '- Explain impact: "These findings have implications for…"\n' : ''}`,
    });
  }
}

function checkAS02_KeywordsNotInAbstract(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const abstract = (thesis.abstract || '').toLowerCase();
  const keywords = thesis.keywords || [];
  if (!abstract || keywords.length === 0) return;

  const missing: string[] = [];
  for (const kw of keywords) {
    if (!abstract.includes(kw.toLowerCase())) {
      missing.push(kw);
    }
  }

  if (missing.length > keywords.length * 0.5 && keywords.length >= 2) {
    const dk = dismissedKey('AS02', 'abstract');
    if (dismissed.has(dk)) return;
    out.push({
      ruleId: 'AS02',
      category: 'academic-style',
      severity: 'minor',
      chapterId: '',
      location: 'opening',
      headline: 'Most keywords absent from abstract',
      detail: `${missing.length} of ${keywords.length} keywords are not mentioned in the abstract: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}. Keywords should appear in the abstract for discoverability.`,
      suggestedAction: 'Incorporate your keywords naturally into the abstract text. This improves search engine visibility and helps readers quickly identify the relevance of your work.',
    });
  }
}

function checkAS03_AcronymBeforeDefinition(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const MIN_ACRONYM_LEN = 3;

  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 100) continue;

    // Find ALL-CAPS tokens > MIN_ACRONYM_LEN chars (potential acronyms)
    const acronymPattern = /\b([A-Z]{2,8})\b/g;
    const acronyms = new Map<string, number[]>(); // acronym → array of positions (char indices)

    let m: RegExpExecArray | null;
    while ((m = acronymPattern.exec(text)) !== null) {
      const token = m[1];
      // Skip common non-acronym all-caps words
      if (['THE', 'AND', 'FOR', 'NOT', 'WITH', 'FROM', 'THAT', 'THIS', 'ARE', 'HAS', 'WAS', 'WERE', 'BEEN', 'HAVE', 'HAD', 'WILL', 'CAN', 'MAY', 'ITS', 'ALL', 'BUT', 'HER', 'HIS', 'SHE', 'THEY', 'OUR', 'YOU', 'WHO', 'HOW', 'DID', 'USE'].includes(token)) continue;
      if (token.length < MIN_ACRONYM_LEN) continue;
      if (!acronyms.has(token)) acronyms.set(token, []);
      acronyms.get(token)!.push(m.index);
    }

    for (const [acronym, positions] of acronyms) {
      if (positions.length < 2) continue; // Need at least 2 occurrences to check

      // Check if the first occurrence is in a definition context
      const firstPos = positions[0];
      const context = text.substring(Math.max(0, firstPos - 30), Math.min(text.length, firstPos + 80));

      // Definition patterns: "(XYZ - ...)", "(XYZ, ...)", "XYZ, which", "XYZ stands for"
      const isDefined =
        /\(\s*[^)]*[A-Za-z]/.test(context) ||    // something in parens after it
        new RegExp(`${acronym}\\s*,\\s*which`, 'i').test(context) ||
        new RegExp(`${acronym}\\s+stands?\\s+for`, 'i').test(context);

      if (!isDefined) {
        // Check if there's any definition later (still a problem — used before defined)
        const laterContext = text.substring(positions[0], Math.min(text.length, positions[0] + 200));
        const definedLater =
          new RegExp(`\\(\\s*${acronym}\\s*[,\-–—:)]`, 'i').test(laterContext) ||
          new RegExp(`${acronym}\\s*,?\\s+which\\s+(?:is|stands|refers|represents)`, 'i').test(laterContext) ||
          new RegExp(`${acronym}\\s+stands?\\s+for`, 'i').test(laterContext);

        // If used before any definition is found within 200 chars, flag
        if (!definedLater) {
          const dk = dismissedKey('AS03', ch.id);
          if (dismissed.has(dk)) continue;
          const chWordCount = countWords(text);
          const loc = detectLocation(ch, Math.floor((firstPos / text.length) * chWordCount), chWordCount);
          out.push({
            ruleId: 'AS03',
            category: 'academic-style',
            severity: 'minor',
            chapterId: ch.id,
            location: loc,
            headline: `Acronym "${acronym}" used without definition in "${ch.title}"`,
            detail: `"${acronym}" is used without an apparent definition nearby. Academic convention requires defining an acronym on first use, e.g., "Natural Language Processing (NLP)".`,
            suggestedAction: 'Define the acronym on its first occurrence: "Natural Language Processing (NLP)" or "NLP, which stands for Natural Language Processing,".',
            exampleText: `"The NLP system was trained on… → "The Natural Language Processing (NLP) system was trained on…"`,
          });
          break; // One per chapter
        }
      }
    }
  }
}

function checkAS04_NumbersBelowTen(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  for (const ch of thesis.chapters) {
    const text = getChapterFullText(ch);
    if (!text || countWords(text) < 100) continue;

    // Remove math environments: $...$, \[...\], \begin{equation}...\end{equation}
    const noMath = text
      .replace(/\$[^$]+\$/g, '')
      .replace(/\\\[[^\]]*\\\]/g, '')
      .replace(/\\begin\{equation\}[\s\S]*?\\end\{equation\}/g, '')
      .replace(/\\begin\{align\}[\s\S]*?\\end\{align\}/g, '');

    // Remove table environments
    const noTables = noMath
      .replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '')
      .replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, '');

    // Remove figure references (Figure X, Fig. X)
    const noFigRefs = noTables.replace(/(?:Figure|Fig\.?)\s+\d+/gi, '');

    // Remove years (4 digits) and page numbers
    const noYears = noFigRefs.replace(/\b(19|20)\d{2}\b/g, '');

    // Remove section/chapter numbers (\section{1.2}, Chapter 3)
    const noSectionNums = noYears.replace(/\\(?:section|chapter)\{[\d.]+\}/g, '');

    // Find single digit numerals 0-9 not inside commands
    const singleDigitPattern = /(?<![\\a-zA-Z])\b([0-9])\b(?![\d])/g;

    const matches: { digit: string; index: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = singleDigitPattern.exec(noSectionNums)) !== null) {
      // Additional check: ensure it's not part of a LaTeX command argument
      const before = noSectionNums.substring(Math.max(0, m.index - 20), m.index);
      if (!/\\\w+\s*\{[^}]*$/.test(before)) {
        matches.push({ digit: m[1], index: m.index });
      }
    }

    if (matches.length > 3) {
      const dk = dismissedKey('AS04', ch.id);
      if (dismissed.has(dk)) continue;
      const chWordCount = countWords(text);
      const loc = detectLocation(ch, Math.floor((matches[0].index / text.length) * chWordCount), chWordCount);
      out.push({
        ruleId: 'AS04',
        category: 'academic-style',
        severity: 'minor',
        chapterId: ch.id,
        location: loc,
        headline: `Numbers below 10 written as numerals in "${ch.title}"`,
        detail: `Found ${matches.length} instance(s) of single-digit numerals in running text. APA style requires spelling out numbers below 10 (e.g., "three" instead of "3").`,
        suggestedAction: 'Spell out numbers below 10 in running text: "3 participants" → "three participants", "2 studies" → "two studies". Exception: keep numerals for measurements, percentages, and statistical values.',
        exampleText: '"The study included 3 groups of 5 participants each" → "The study included three groups of five participants each."',
      });
    }
  }
}

function checkAS05_InconsistentTense(
  thesis: ThesisData,
  out: CoachSuggestion[],
  dismissed: Set<string>
): void {
  const litReview = thesis.chapters.find(ch =>
    chapterMatches(ch, /literature|review|related work|state of the art/i)
  );
  if (!litReview) return;

  const text = getChapterFullText(litReview);
  if (!text || countWords(text) < 200) return;

  const pastMarkers = ['found', 'showed', 'reported', 'conducted', 'investigated', 'observed', 'discovered'];
  const presentMarkers = ['argues', 'claims', 'suggests', 'proposes', 'states', 'demonstrates', 'shows'];

  const sentences = splitSentences(text);
  let pastCount = 0;
  let presentCount = 0;

  for (const s of sentences) {
    const lower = s.toLowerCase();
    const words = lower.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[.,;:!?)]+$/, '');
      if (pastMarkers.includes(clean)) { pastCount++; break; }
      if (presentMarkers.includes(clean)) { presentCount++; break; }
    }
  }

  const total = pastCount + presentCount;
  if (total < 5) return; // Not enough data

  const pastRatio = pastCount / total;
  const presentRatio = presentCount / total;

  // If neither tense exceeds 60%, flag as inconsistent
  if (pastRatio < 0.6 && presentRatio < 0.6) {
    const dk = dismissedKey('AS05', litReview.id);
    if (dismissed.has(dk)) return;
    const dominant = pastCount >= presentCount ? 'past' : 'present';
    out.push({
      ruleId: 'AS05',
      category: 'academic-style',
      severity: 'major',
      chapterId: litReview.id,
      location: 'body',
      headline: `Inconsistent tense in "${litReview.title}"`,
      detail: `Tense usage in "${litReview.title}" is inconsistent: ${Math.round(pastRatio * 100)}% past tense and ${Math.round(presentRatio * 100)}% present tense. Academic style guides recommend choosing one dominant tense for the literature review.`,
      suggestedAction: `Choose a dominant tense for your literature review. Present tense (${Math.round(presentRatio * 100)}%) is slightly more common for discussing current theoretical positions, while past tense is used for reporting specific study findings. Apply the dominant tense consistently.`,
      exampleText: 'Present: "Smith argues that X is true. Jones demonstrates…" — Past: "Smith argued that X was true. Jones demonstrated…"',
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Score Calculation
// ─────────────────────────────────────────────────────────────

function calculateScore(suggestions: CoachSuggestion[], category?: CoachSuggestion['category']): number {
  const filtered = category
    ? suggestions.filter(s => s.category === category)
    : suggestions;

  let criticalCount = 0;
  let majorCount = 0;
  let minorCount = 0;

  for (const s of filtered) {
    if (s.severity === 'critical') criticalCount++;
    else if (s.severity === 'major') majorCount++;
    else minorCount++;
  }

  const score = 100 - (criticalCount * 15) - (majorCount * 5) - (minorCount * 1);
  return Math.max(0, score);
}

// ─────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────

const MAX_SUGGESTIONS = 100;

/**
 * Run the Adaptive Writing Coach on a thesis.
 *
 * Pure function. No side effects. No async. No DOM access.
 *
 * Analyzes thesis content across 5 categories (25 rules total):
 * - Structure (S01–S05): Introduction gap, method justification,
 *   results interpretation, discussion-RQ linkage, conclusion refs
 * - Argument (A01–A05): Transitional closings, claim density,
 *   structural monotony, literature synthesis, contribution echo
 * - Citation (C01–C05): Author over-reliance, recency, style balance,
 *   single-chapter clusters, self-citation
 * - Language (L01–L05): First person, hedging, nominalizations,
 *   vague quantifiers, transition overuse
 * - Academic Style (AS01–AS05): Abstract elements, keyword coverage,
 *   acronym definitions, numeral usage, tense consistency
 *
 * Edge cases:
 * - Empty thesis / no chapters → empty suggestions, score 100
 * - Chapters with no content → skipped
 * - No references → citation rules gracefully handle missing data
 * - dismissedRules → filter out rule+chapter combos the user dismissed
 *
 * @param thesis  — Full ThesisData object
 * @param dismissedRules — Set of "ruleId::chapterId" strings to skip
 * @returns CoachResult with suggestions, score, and breakdown
 */
export function runWritingCoach(
  thesis: ThesisData,
  dismissedRules?: Set<string>
): CoachResult {
  if (!thesis || !thesis.chapters || thesis.chapters.length === 0) {
    return {
      suggestions: [],
      coachScore: 100,
      scoreBreakdown: {
        structure: 100,
        argument: 100,
        citation: 100,
        language: 100,
        academicStyle: 100,
      },
      dismissedRules: dismissedRules || new Set(),
    };
  }

  const dismissed = dismissedRules || new Set<string>();
  const suggestions: CoachSuggestion[] = [];

  // Build reference lookup map once
  const refMap = buildRefMap(thesis.references);

  // ── Structure Rules ──
  checkS01_IntroGap(thesis, suggestions, dismissed);
  checkS02_MethodJustification(thesis, suggestions, dismissed);
  checkS03_ResultsInterpretation(thesis, suggestions, dismissed);
  checkS04_DiscussionRQReference(thesis, suggestions, dismissed);
  checkS05_ConclusionNewRefs(thesis, suggestions, dismissed);

  // ── Argument Rules ──
  checkA01_TransitionalClosing(thesis, suggestions, dismissed);
  checkA02_ClaimDensity(thesis, suggestions, dismissed);
  checkA03_StructuralMonotony(thesis, suggestions, dismissed);
  checkA04_LiteratureSynthesis(thesis, suggestions, dismissed);
  checkA05_ContributionEcho(thesis, suggestions, dismissed);

  // ── Citation Rules ──
  checkC01_FirstAuthorOverReliance(thesis, suggestions, dismissed, refMap);
  checkC02_NoRecentCitations(thesis, suggestions, dismissed, refMap);
  checkC03_AuthorProminentOveruse(thesis, suggestions, dismissed);
  checkC04_SingleChapterFoundational(thesis, suggestions, dismissed, refMap);
  checkC05_SelfCitationCluster(thesis, suggestions, dismissed, refMap);

  // ── Language Rules ──
  checkL01_FirstPersonSingular(thesis, suggestions, dismissed);
  checkL02_HedgingOverload(thesis, suggestions, dismissed);
  checkL03_WeakNominalizations(thesis, suggestions, dismissed);
  checkL04_VagueQuantifiers(thesis, suggestions, dismissed);
  checkL05_TransitionOveruse(thesis, suggestions, dismissed);

  // ── Academic Style Rules ──
  checkAS01_AbstractElements(thesis, suggestions, dismissed);
  checkAS02_KeywordsNotInAbstract(thesis, suggestions, dismissed);
  checkAS03_AcronymBeforeDefinition(thesis, suggestions, dismissed);
  checkAS04_NumbersBelowTen(thesis, suggestions, dismissed);
  checkAS05_InconsistentTense(thesis, suggestions, dismissed);

  // Cap at MAX_SUGGESTIONS
  const capped = suggestions.slice(0, MAX_SUGGESTIONS);

  return {
    suggestions: capped,
    coachScore: calculateScore(capped),
    scoreBreakdown: {
      structure: calculateScore(capped, 'structure'),
      argument: calculateScore(capped, 'argument'),
      citation: calculateScore(capped, 'citation'),
      language: calculateScore(capped, 'language'),
      academicStyle: calculateScore(capped, 'academic-style'),
    },
    dismissedRules: dismissed,
  };
}
