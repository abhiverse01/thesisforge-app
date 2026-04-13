// ============================================================
// ThesisForge Intelligence — Algorithm 9: Semantic Thesis Graph
// Builds a semantic graph of concepts, claims, evidence, and
// gaps across the entire thesis. Detects argument coverage,
// narrative structure, redundancy, and unsupported claims.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { ThesisData, ThesisChapter } from '@/lib/thesis-types';

// ── STG Node Types ─────────────────────────────────────────────

export type STGNodeKind = 'concept' | 'claim' | 'evidence' | 'gap';

export interface STGConceptNode {
  kind: 'concept';
  id: string;
  label: string;
  frequency: number;
  chapters: string[];
}

export interface STGClaimNode {
  kind: 'claim';
  id: string;
  text: string;
  chapterId: string;
  subsectionId?: string;
  confidence: number; // 0-1, how confident we are this is a claim
}

export interface STGEvidenceNode {
  kind: 'evidence';
  id: string;
  citationKey: string;
  supportsClaims: string[]; // claim IDs
}

export interface STGGapNode {
  kind: 'gap';
  id: string;
  description: string;
  detectedBy: 'structure' | 'citation' | 'keyword';
  severity: 'high' | 'medium' | 'low';
}

export type STGNode = STGConceptNode | STGClaimNode | STGEvidenceNode | STGGapNode;

// ── STG Edge Types ─────────────────────────────────────────────

export type STGEdgeType = 'supports' | 'contradicts' | 'introduces' | 'repeats';

export interface STGEdge {
  type: STGEdgeType;
  from: string; // node ID
  to: string; // node ID
  similarity?: number; // only for 'repeats' edges
}

// ── STG Result ─────────────────────────────────────────────────

export interface STGResult {
  nodes: STGNode[];
  edges: STGEdge[];
  adjacencyList: Map<string, Array<{ edgeType: STGEdgeType; targetId: string }>>;

  // Summary stats
  totalConcepts: number;
  totalClaims: number;
  totalEvidence: number;
  totalGaps: number;

  // Quality metrics
  argumentCoverage: number; // 0-100, % of claims with evidence
  conceptConnectivity: number; // 0-100, % of concepts connected to claims
  redundancyScore: number; // 0-100, higher = more redundancy

  // Detected issues
  unsupportedClaims: STGClaimNode[];
  conceptOrphans: STGConceptNode[];
  redundantSections: Array<{ sectionA: string; sectionB: string; similarity: number }>;
  narrativeStructure: 'valid' | 'weak' | 'invalid';
  narrativeStructureType?: string;
}

// ── Argument structure patterns ────────────────────────────────

export const NARRATIVE_PATTERNS = [
  { name: 'problem-method-results-conclusion', chapters: ['introduction', 'methodology', 'results', 'conclusion'] },
  { name: 'survey-synthesis-position-implication', chapters: ['introduction', 'literature', 'discussion', 'conclusion'] },
  { name: 'hypothesis-experiment-analysis-contribution', chapters: ['introduction', 'methodology', 'analysis', 'conclusion'] },
] as const;

// ── Internal helpers ───────────────────────────────────────────

interface Sentence {
  text: string;
  index: number;
}

/** Hardcoded stopwords (~150 common English words + thesis-specific). */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'of', 'at', 'by',
  'for', 'with', 'about', 'against', 'between', 'through', 'during',
  'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'because', 'as', 'until', 'while', 'but',
  'and', 'or', 'if', 'it', 'its', 'this', 'that', 'these', 'those',
  'also', 'however', 'therefore', 'thus', 'hence', 'chapter', 'section',
  'figure', 'table', 'page', 'equation',
]);

/** Assertive verb stems used for claim detection. */
const ASSERTIVE_VERBS = [
  'shows', 'demonstrates', 'proves', 'indicates', 'suggests',
  'reveals', 'confirms', 'establishes', 'validates', 'provides evidence',
  'illustrates', 'highlights', 'presents', 'exhibits', 'manifests',
  'corroborates', 'substantiates', 'verifies', 'attests', 'evinces',
];

/** Hedging words that reduce claim confidence. */
const HEDGING_WORDS = [
  'may', 'might', 'could', 'possibly', 'perhaps', 'potentially',
  'seems', 'appears', 'suggests', 'arguably', 'somewhat', 'likely',
  'probably', 'would', 'could', 'might',
];

/** Abbreviation patterns that should not trigger sentence splits. */
const ABBREVIATIONS = new Set([
  'e.g', 'i.e', 'etc', 'vs', 'Dr', 'Mr', 'Mrs', 'Ms', 'Prof',
  'Sr', 'Jr', 'al', 'approx', 'cf', 'fig', 'eq', 'vol', 'no',
  'ed', 'eds', 'p', 'pp', 'ch', 'sec', 'et', 'ca', 'viz',
]);

// ── Step 1: Sentence Splitter ─────────────────────────────────

/**
 * Rule-based sentence splitter.
 * Splits on `. `, `! `, `? ` followed by a capital letter.
 * Handles abbreviations and LaTeX commands.
 *
 * Returns array of { text, index } where index is the position in the text.
 */
function splitIntoSentences(text: string): Sentence[] {
  if (!text || text.trim().length === 0) return [];

  const sentences: Sentence[] = [];
  let currentStart = 0;
  let sentenceIndex = 0;

  // We'll walk character-by-character and detect sentence boundaries
  const len = text.length;
  let i = 0;

  while (i < len) {
    // Check if we're inside a LaTeX command: \cite{...}, \ref{...}, etc.
    if (text[i] === '\\') {
      // Skip the command name
      i++;
      while (i < len && /[a-zA-Z]/.test(text[i])) i++;
      // Skip optional argument [...]
      if (i < len && text[i] === '[') {
        const bracketDepth = 1;
        i++;
        while (i < len && bracketDepth > 0) {
          if (text[i] === '[') i++;
          else if (text[i] === ']') i++;
          else i++;
        }
      }
      // Skip mandatory argument {...}
      if (i < len && text[i] === '{') {
        i++; // skip opening brace
        let braceDepth = 1;
        while (i < len && braceDepth > 0) {
          if (text[i] === '{') braceDepth++;
          else if (text[i] === '}') braceDepth--;
          i++;
        }
      }
      continue;
    }

    // Check for sentence-ending punctuation followed by space and capital letter
    if (
      (text[i] === '.' || text[i] === '!' || text[i] === '?') &&
      i + 1 < len && text[i + 1] === ' ' &&
      i + 2 < len && /[A-Z\u00C0-\u024F]/.test(text[i + 2])
    ) {
      // Check if this is an abbreviation
      const beforePunct = text.slice(Math.max(0, i - 10), i);
      const wordBefore = beforePunct.trim().split(/\s+/).pop() || '';
      const baseWord = wordBefore.replace(/[.,;:]/g, '').trim();

      const isAbbreviation =
        ABBREVIATIONS.has(baseWord) ||
        ABBREVIATIONS.has(baseWord.replace(/\.$/, '')) ||
        // Single letter abbreviations (like "U.S.") or initials (like "J.R.")
        /^[A-Z]\.$/.test(baseWord) ||
        // Two-letter abbreviations like "U.S"
        /^[A-Z]\.[A-Z]$/.test(wordBefore) ||
        // Numeric patterns like "Fig. 1", "Eq. 2"
        /^\d+\.$/.test(baseWord) ||
        // "et al." pattern
        (baseWord === 'al' && beforePunct.includes('et')) ||
        // Common academic patterns like "Sec. 3"
        (baseWord === 'Sec' || baseWord === 'Ch' || baseWord === 'Fig');

      if (!isAbbreviation) {
        // Extract sentence up to and including the punctuation
        const sentenceEnd = i + 1;
        const sentenceText = text.slice(currentStart, sentenceEnd).trim();

        if (sentenceText.length > 3) {
          sentences.push({ text: sentenceText, index: sentenceIndex++ });
        }
        currentStart = sentenceEnd + 1; // skip the space
        i += 2; // skip the space and the capital letter
        continue;
      }
    }

    i++;
  }

  // Capture any remaining text as a final sentence
  if (currentStart < len) {
    const remaining = text.slice(currentStart).trim();
    if (remaining.length > 3) {
      sentences.push({ text: remaining, index: sentenceIndex });
    }
  }

  return sentences;
}

// ── Step 2: Claim Extractor ───────────────────────────────────

/**
 * Extract assertive claims from sentences.
 * A claim must contain at least one assertive verb, start with a capital
 * letter, and end with a period.
 *
 * Confidence scoring:
 * - Base 0.3 if exactly one assertive verb found
 * - +0.15 per additional assertive verb (up to 0.3 bonus)
 * - -0.1 per hedging word present
 * - Minimum 0.1, maximum 1.0
 *
 * Caps at 50 claims per chapter for performance.
 */
function extractClaims(
  sentences: Sentence[],
  chapterId: string,
  subsectionId: string | undefined
): STGClaimNode[] {
  const claims: STGClaimNode[] = [];

  for (const sentence of sentences) {
    if (claims.length >= 50) break;

    const text = sentence.text.trim();

    // Must be a declarative sentence: starts with capital, ends with period
    if (text.length < 15) continue;
    if (!/^[A-Z\u00C0-\u024F]/.test(text)) continue;
    if (!/[.!]$/.test(text)) continue;

    // Count assertive verbs (case-insensitive search)
    const lowerText = text.toLowerCase();
    let assertiveCount = 0;
    for (const verb of ASSERTIVE_VERBS) {
      const regex = new RegExp(`\\b${escapeRegex(verb)}\\b`, 'i');
      if (regex.test(lowerText)) assertiveCount++;
    }

    if (assertiveCount === 0) continue;

    // Count hedging words
    let hedgeCount = 0;
    for (const hedge of HEDGING_WORDS) {
      const regex = new RegExp(`\\b${escapeRegex(hedge)}\\b`, 'i');
      if (regex.test(lowerText)) hedgeCount++;
    }

    // Compute confidence
    let confidence = 0.3 + Math.min(assertiveCount - 1, 2) * 0.15;
    confidence -= hedgeCount * 0.1;
    confidence = Math.max(0.1, Math.min(1.0, confidence));

    claims.push({
      kind: 'claim',
      id: `claim-${chapterId}-${sentence.index}`,
      text: text.length > 300 ? text.slice(0, 300) + '...' : text,
      chapterId,
      subsectionId,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  return claims;
}

// ── Step 3: Concept Extractor ─────────────────────────────────

/**
 * Extract concepts from two sources:
 * 1. User keywords (from thesis.keywords)
 * 2. TF-IDF top terms per chapter (top 10 per chapter)
 *
 * Caps at 100 total concepts.
 */
function extractConcepts(
  chapters: ThesisChapter[],
  userKeywords: string[]
): STGConceptNode[] {
  const conceptMap = new Map<string, { frequency: number; chapters: Set<string> }>();

  // Source 1: User keywords
  for (const keyword of userKeywords) {
    const normalized = keyword.toLowerCase().trim();
    if (normalized.length === 0) continue;

    // Check which chapters contain this keyword
    const foundChapters = new Set<string>();
    for (const ch of chapters) {
      const fullText = getChapterFullText(ch).toLowerCase();
      // Check for multi-word keywords or single-word
      if (normalized.includes(' ')) {
        if (fullText.includes(normalized)) {
          foundChapters.add(ch.id);
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(normalized)}\\b`);
        if (regex.test(fullText)) {
          foundChapters.add(ch.id);
        }
      }
    }

    const key = `concept-user-${normalized.replace(/\s+/g, '-')}`;
    conceptMap.set(key, {
      frequency: foundChapters.size,
      chapters: foundChapters,
    });
  }

  // Source 2: TF-IDF top terms per chapter
  const totalChapters = chapters.length || 1;

  for (const chapter of chapters) {
    const fullText = getChapterFullText(chapter);
    const cleanText = stripLatex(fullText);
    const words = tokenize(cleanText);

    // Count term frequency
    const termFreq = new Map<string, number>();
    for (const word of words) {
      const w = word.toLowerCase();
      if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
      termFreq.set(w, (termFreq.get(w) || 0) + 1);
    }

    // Compute document frequency (how many chapters contain each term)
    const docFreq = new Map<string, number>();
    for (const [term] of termFreq) {
      let df = 0;
      for (const ch of chapters) {
        const chText = stripLatex(getChapterFullText(ch)).toLowerCase();
        const regex = new RegExp(`\\b${escapeRegex(term)}\\b`);
        if (regex.test(chText)) df++;
      }
      docFreq.set(term, df);
    }

    // Compute TF-IDF score for each term
    const tfidfScores = new Map<string, number>();
    for (const [term, tf] of termFreq) {
      const df = docFreq.get(term) || 1;
      const idf = Math.log((totalChapters + 1) / (df + 1)) + 1;
      tfidfScores.set(term, tf * idf);
    }

    // Sort by TF-IDF descending, take top 10
    const sorted = [...tfidfScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [term] of sorted) {
      const key = `concept-tfidf-${term}`;
      const existing = conceptMap.get(key);
      if (existing) {
        existing.frequency++;
        existing.chapters.add(chapter.id);
      } else {
        const foundChapters = new Set<string>();
        for (const ch of chapters) {
          const chText = stripLatex(getChapterFullText(ch)).toLowerCase();
          const regex = new RegExp(`\\b${escapeRegex(term)}\\b`);
          if (regex.test(chText)) foundChapters.add(ch.id);
        }
        conceptMap.set(key, {
          frequency: foundChapters.size,
          chapters: foundChapters,
        });
      }
    }
  }

  // Convert to nodes, cap at 100
  const nodes: STGConceptNode[] = [];
  let count = 0;
  for (const [key, data] of conceptMap) {
    if (count >= 100) break;
    if (data.frequency === 0) continue; // skip concepts not found anywhere

    nodes.push({
      kind: 'concept',
      id: key,
      label: key.replace(/^(concept-user-|concept-tfidf-)/, '').replace(/-/g, ' '),
      frequency: data.frequency,
      chapters: [...data.chapters],
    });
    count++;
  }

  return nodes;
}

// ── Step 4: Citation Proximity Mapper ─────────────────────────

/**
 * For each claim, check if any citation command appears within
 * a ±2 sentence window. If found, create an evidence node
 * linking that citation to the claim.
 */
function mapCitationProximity(
  claims: STGClaimNode[],
  allSentencesByChapter: Map<string, Sentence[]>
): STGEvidenceNode[] {
  // Citation regex: \cite{...}, \citep{...}, \citet{...}, \citeauthor{...}, \citeyear{...}
  // Also handles \cite[...]{key1,key2}
  const citePattern = /\\cite(?:p|t|author|year|alp|num)?\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;

  // Map citationKey -> Set of claim IDs it supports
  const citationToClaims = new Map<string, Set<string>>();

  for (const claim of claims) {
    const chapterId = claim.chapterId;
    const sentences = allSentencesByChapter.get(chapterId) || [];

    // Find the sentence index for this claim
    const claimSentenceIdx = parseInt(claim.id.split('-').pop() || '0', 10);

    // Check sentences in window [idx-2, idx+2]
    let found = false;
    for (let offset = -2; offset <= 2 && !found; offset++) {
      const targetIdx = claimSentenceIdx + offset;
      if (targetIdx < 0 || targetIdx >= sentences.length) continue;

      const sentenceText = sentences[targetIdx].text;
      citePattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = citePattern.exec(sentenceText)) !== null) {
        const keys = match[1]
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);

        for (const key of keys) {
          if (!citationToClaims.has(key)) {
            citationToClaims.set(key, new Set());
          }
          citationToClaims.get(key)!.add(claim.id);
        }
        found = true; // Found at least one citation in window
      }
    }
  }

  // Build evidence nodes
  const evidenceNodes: STGEvidenceNode[] = [];
  for (const [citationKey, claimIds] of citationToClaims) {
    evidenceNodes.push({
      kind: 'evidence',
      id: `evidence-${citationKey}`,
      citationKey,
      supportsClaims: [...claimIds],
    });
  }

  return evidenceNodes;
}

// ── Step 5: Gap Detector ──────────────────────────────────────

/**
 * Detect three types of gaps:
 * 1. Structure gaps: concept mentioned in chapter N but not in later chapters
 * 2. Citation gaps: claim with no citation within ±2 sentences
 * 3. Keyword gaps: user keyword that doesn't appear in ANY chapter
 */
function detectGaps(
  concepts: STGConceptNode[],
  claims: STGClaimNode[],
  evidenceNodes: STGEvidenceNode[],
  chapters: ThesisChapter[],
  userKeywords: string[]
): STGGapNode[] {
  const gaps: STGGapNode[] = [];
  let gapIndex = 0;

  // 1. Structure gaps: concepts that appear only in early chapters
  // A concept is orphaned if it appears in chapter at index N but not
  // in any chapter at index > N (it "drops off")
  if (chapters.length >= 2) {
    for (const concept of concepts) {
      const conceptChapterIndices = new Set<number>();
      for (const chId of concept.chapters) {
        const idx = chapters.findIndex((ch) => ch.id === chId);
        if (idx >= 0) conceptChapterIndices.add(idx);
      }

      if (conceptChapterIndices.size === 0) continue;

      const maxIndex = Math.max(...conceptChapterIndices);
      const minIndex = Math.min(...conceptChapterIndices);

      // If concept appears in an early chapter but not in the last chapter
      // (meaning it was introduced but never revisited)
      if (maxIndex < chapters.length - 1) {
        gaps.push({
          kind: 'gap',
          id: `gap-structure-${gapIndex++}`,
          description: `Concept "${concept.label}" appears in ${concept.frequency} chapter(s) but is absent from chapters ${maxIndex + 2}–${chapters.length}`,
          detectedBy: 'structure',
          severity: concept.frequency === 1 ? 'high' : 'medium',
        });
      }
    }
  }

  // 2. Citation gaps: claims with no nearby citations
  // Build a set of all claim IDs that have supporting evidence
  const supportedClaimIds = new Set<string>();
  for (const ev of evidenceNodes) {
    for (const claimId of ev.supportsClaims) {
      supportedClaimIds.add(claimId);
    }
  }

  for (const claim of claims) {
    if (!supportedClaimIds.has(claim.id)) {
      gaps.push({
        kind: 'gap',
        id: `gap-citation-${gapIndex++}`,
        description: `Unsupported claim in ${claim.chapterId}: "${claim.text.slice(0, 100)}${claim.text.length > 100 ? '...' : ''}"`,
        detectedBy: 'citation',
        severity: claim.confidence > 0.5 ? 'high' : 'medium',
      });
    }
  }

  // 3. Keyword gaps: user keywords that don't appear in any chapter
  for (const keyword of userKeywords) {
    const normalized = keyword.toLowerCase().trim();
    if (normalized.length === 0) continue;

    let found = false;
    for (const ch of chapters) {
      const fullText = getChapterFullText(ch).toLowerCase();
      if (normalized.includes(' ')) {
        if (fullText.includes(normalized)) {
          found = true;
          break;
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(normalized)}\\b`);
        if (regex.test(fullText)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      gaps.push({
        kind: 'gap',
        id: `gap-keyword-${gapIndex++}`,
        description: `Keyword "${keyword}" is declared but never appears in the thesis content`,
        detectedBy: 'keyword',
        severity: 'medium',
      });
    }
  }

  return gaps;
}

// ── Step 6: Redundancy Detector ───────────────────────────────

/**
 * For each pair of subsections across different chapters,
 * compute bag-of-words cosine similarity.
 * Flag pairs with similarity > 0.70 as potentially redundant.
 *
 * Caps at checking first 1000 words per subsection for performance.
 */
function detectRedundancy(
  chapters: ThesisChapter[]
): Array<{ sectionA: string; sectionB: string; similarity: number }> {
  const results: Array<{ sectionA: string; sectionB: string; similarity: number }> = [];

  // Collect all subsections with their chapter and section identifiers
  const subsections: Array<{ id: string; text: string }> = [];

  for (const chapter of chapters) {
    // Include the chapter-level content as a "subsection"
    if (chapter.content && chapter.content.trim().length > 50) {
      subsections.push({
        id: `${chapter.title} (main content)`,
        text: chapter.content,
      });
    }
    for (const ss of chapter.subSections) {
      if (ss.content && ss.content.trim().length > 50) {
        subsections.push({
          id: `${chapter.title} > ${ss.title}`,
          text: ss.content,
        });
      }
    }
  }

  // Compare each pair across different chapters
  for (let i = 0; i < subsections.length; i++) {
    for (let j = i + 1; j < subsections.length; j++) {
      const a = subsections[i];
      const b = subsections[j];

      // Only compare across different chapters (check by prefix)
      const chapterA = a.id.split(' > ')[0];
      const chapterB = b.id.split(' > ')[0];
      if (chapterA === chapterB) continue;

      const similarity = computeCosineSimilarity(
        bagOfWords(a.text, 1000),
        bagOfWords(b.text, 1000)
      );

      if (similarity > 0.70) {
        results.push({
          sectionA: a.id,
          sectionB: b.id,
          similarity: Math.round(similarity * 100) / 100,
        });
      }
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}

// ── Step 7: Narrative Thread Validator ────────────────────────

/**
 * Match chapter titles against the three narrative patterns
 * using fuzzy matching.
 *
 * Normalization:
 * - Lowercase
 * - Remove common suffixes: "and discussion", "and conclusion"
 *
 * Fuzzy matching:
 * - Check if pattern keyword is a substring or if the title is a substring of the keyword
 * - Also check for word-level overlap (any word from keyword appears in title)
 *
 * Returns best matching pattern and validity.
 */
function validateNarrativeStructure(
  chapters: ThesisChapter[]
): { structure: 'valid' | 'weak' | 'invalid'; patternName?: string } {
  if (chapters.length < 3) {
    return { structure: 'invalid' };
  }

  const normalizedTitles = chapters.map((ch) => normalizeChapterTitle(ch.title));

  let bestPattern = '';
  let bestScore = 0;

  for (const pattern of NARRATIVE_PATTERNS) {
    const score = matchPattern(normalizedTitles, pattern.chapters as unknown as string[]);
    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern.name;
    }
  }

  // Determine validity based on match score
  let structure: 'valid' | 'weak' | 'invalid';
  if (bestScore >= 60) {
    structure = 'valid';
  } else if (bestScore >= 40) {
    structure = 'weak';
  } else {
    structure = 'invalid';
  }

  return {
    structure,
    patternName: bestScore > 0 ? bestPattern : undefined,
  };
}

/**
 * Calculate how well actual chapter titles match a narrative pattern.
 * Uses positional matching: each pattern chapter maps to a position
 * in the thesis. We check which actual chapters best match each
 * expected position.
 */
function matchPattern(
  normalizedTitles: string[],
  patternChapters: string[]
): number {
  // Map each pattern keyword to the best matching actual chapter position
  let totalMatchScore = 0;
  let matchedCount = 0;

  // Create a scoring matrix: patternKeyword x thesisPosition
  for (let pIdx = 0; pIdx < patternChapters.length; pIdx++) {
    const patternKeyword = patternChapters[pIdx];

    // Determine the expected thesis position for this pattern element
    // Distribute pattern chapters evenly across the thesis
    const expectedPosition = Math.round(
      (pIdx / (patternChapters.length - 1)) * (normalizedTitles.length - 1)
    );

    // Find best matching chapter title for this pattern keyword
    let bestKeywordScore = 0;
    let bestPosition = -1;

    for (let tIdx = 0; tIdx < normalizedTitles.length; tIdx++) {
      const titleScore = fuzzyMatchScore(normalizedTitles[tIdx], patternKeyword);
      if (titleScore > bestKeywordScore) {
        bestKeywordScore = titleScore;
        bestPosition = tIdx;
      }
    }

    if (bestKeywordScore > 0.3 && bestPosition >= 0) {
      // Score combines keyword match quality with positional proximity
      const positionScore = 1 - Math.abs(bestPosition - expectedPosition) / normalizedTitles.length;
      const combinedScore = bestKeywordScore * (0.6 + 0.4 * positionScore);
      totalMatchScore += combinedScore;
      matchedCount++;
    }
  }

  if (matchedCount === 0) return 0;

  // Normalize: what fraction of pattern chapters were matched, weighted by quality
  return Math.round((totalMatchScore / patternChapters.length) * 100);
}

/**
 * Fuzzy match a normalized chapter title against a pattern keyword.
 * Returns 0-1 score.
 *
 * Strategies:
 * 1. Exact substring match (either direction)
 * 2. Word overlap (shared words)
 * 3. Levenshtein-based character similarity
 */
function fuzzyMatchScore(title: string, keyword: string): number {
  if (title === keyword) return 1.0;

  // Strategy 1: Substring match
  if (title.includes(keyword) || keyword.includes(title)) {
    // Length ratio bonus: shorter match is better
    const ratio = Math.min(title.length, keyword.length) / Math.max(title.length, keyword.length);
    return 0.7 + 0.3 * ratio;
  }

  // Strategy 2: Word overlap
  const titleWords = title.split(/\s+/);
  const keywordWords = keyword.split(/\s+/);

  let overlapCount = 0;
  for (const kw of keywordWords) {
    if (titleWords.some((tw) => tw === kw || tw.startsWith(kw) || kw.startsWith(tw))) {
      overlapCount++;
    }
  }

  if (overlapCount > 0) {
    const overlapRatio = overlapCount / keywordWords.length;
    return Math.min(0.8, overlapRatio * 0.9);
  }

  // Strategy 3: Character-level similarity (simple Dice coefficient on bigrams)
  const titleBigrams = bigrams(title);
  const keywordBigrams = bigrams(keyword);

  if (titleBigrams.size === 0 || keywordBigrams.size === 0) return 0;

  let intersection = 0;
  for (const bg of titleBigrams) {
    if (keywordBigrams.has(bg)) intersection++;
  }

  const dice = (2 * intersection) / (titleBigrams.size + keywordBigrams.size);
  return dice;
}

// ── Step 8: Assembly ──────────────────────────────────────────

/**
 * Build the adjacency list from all nodes and edges.
 * Compute summary statistics and quality metrics.
 */
function assembleResult(
  concepts: STGConceptNode[],
  claims: STGClaimNode[],
  evidenceNodes: STGEvidenceNode[],
  gaps: STGGapNode[],
  edges: STGEdge[],
  unsupportedClaims: STGClaimNode[],
  conceptOrphans: STGConceptNode[],
  redundantSections: Array<{ sectionA: string; sectionB: string; similarity: number }>,
  narrativeResult: { structure: 'valid' | 'weak' | 'invalid'; patternName?: string }
): STGResult {
  const allNodes: STGNode[] = [
    ...concepts,
    ...claims,
    ...evidenceNodes,
    ...gaps,
  ];

  // Build adjacency list
  const adjacencyList = new Map<string, Array<{ edgeType: STGEdgeType; targetId: string }>>();
  for (const node of allNodes) {
    adjacencyList.set(node.id, []);
  }

  for (const edge of edges) {
    const fromList = adjacencyList.get(edge.from);
    if (fromList) {
      fromList.push({ edgeType: edge.type, targetId: edge.to });
    }
    // Also add reverse for undirected lookups
    const toList = adjacencyList.get(edge.to);
    if (toList) {
      toList.push({ edgeType: edge.type, targetId: edge.from });
    }
  }

  // Quality metrics

  // Argument coverage: % of claims with at least one supporting evidence
  const supportedClaimIds = new Set<string>();
  for (const ev of evidenceNodes) {
    for (const claimId of ev.supportsClaims) {
      supportedClaimIds.add(claimId);
    }
  }
  const argumentCoverage =
    claims.length > 0
      ? Math.round((supportedClaimIds.size / claims.length) * 100)
      : 100; // No claims = no coverage issue

  // Concept connectivity: % of concepts that appear in at least one chapter
  // that also contains a claim. A concept is "connected" if there's a chapter
  // that has both the concept and a claim.
  const chaptersWithClaims = new Set<string>();
  for (const claim of claims) {
    chaptersWithClaims.add(claim.chapterId);
  }

  let connectedConcepts = 0;
  for (const concept of concepts) {
    const isConnected = concept.chapters.some((chId) => chaptersWithClaims.has(chId));
    if (isConnected) connectedConcepts++;
  }
  const conceptConnectivity =
    concepts.length > 0
      ? Math.round((connectedConcepts / concepts.length) * 100)
      : 100;

  // Redundancy score: based on number and severity of redundant sections
  // 0-100 scale where higher = more redundancy
  const redundancyScore =
    redundantSections.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            redundantSections.reduce((sum, r) => sum + r.similarity * 20, 0) /
              Math.max(1, redundantSections.length)
          )
        );

  return {
    nodes: allNodes,
    edges,
    adjacencyList,

    // Summary stats
    totalConcepts: concepts.length,
    totalClaims: claims.length,
    totalEvidence: evidenceNodes.length,
    totalGaps: gaps.length,

    // Quality metrics
    argumentCoverage,
    conceptConnectivity,
    redundancyScore,

    // Detected issues
    unsupportedClaims,
    conceptOrphans,
    redundantSections,
    narrativeStructure: narrativeResult.structure,
    narrativeStructureType: narrativeResult.patternName,
  };
}

// ── Utility functions ─────────────────────────────────────────

/**
 * Get the full text of a chapter, including all subsections.
 */
function getChapterFullText(chapter: ThesisChapter): string {
  const parts = [chapter.content || ''];
  for (const ss of chapter.subSections || []) {
    parts.push(ss.content || '');
  }
  return parts.join(' ');
}

/**
 * Strip LaTeX commands from text, leaving only plain text.
 */
function stripLatex(text: string): string {
  return text
    // Remove \command{...} with nested braces
    .replace(/\\[a-zA-Z]+\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1')
    // Remove \command[...]{...}
    .replace(/\\[a-zA-Z]+\[[^\]]*\]\{[^}]*\}/g, '')
    // Remove remaining \commands
    .replace(/\\[a-zA-Z]+/g, '')
    // Remove braces
    .replace(/[{}]/g, '')
    // Remove math delimiters
    .replace(/\$[^$]*\$/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    // Remove % comments
    .replace(/%.*$/gm, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize text into words (lowercase, alphanumeric only).
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Create a bag-of-words Map from text, capped at maxWords.
 */
function bagOfWords(text: string, maxWords: number): Map<string, number> {
  const cleanText = stripLatex(text);
  const words = tokenize(cleanText).slice(0, maxWords);
  const bow = new Map<string, number>();

  for (const word of words) {
    const w = word.toLowerCase();
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    bow.set(w, (bow.get(w) || 0) + 1);
  }

  return bow;
}

/**
 * Compute cosine similarity between two bag-of-words vectors.
 */
function computeCosineSimilarity(
  bowA: Map<string, number>,
  bowB: Map<string, number>
): number {
  if (bowA.size === 0 || bowB.size === 0) return 0;

  // Dot product
  let dotProduct = 0;
  for (const [term, countA] of bowA) {
    const countB = bowB.get(term);
    if (countB !== undefined) {
      dotProduct += countA * countB;
    }
  }

  if (dotProduct === 0) return 0;

  // Magnitudes
  let magA = 0;
  for (const count of bowA.values()) magA += count * count;
  magA = Math.sqrt(magA);

  let magB = 0;
  for (const count of bowB.values()) magB += count * count;
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (magA * magB);
}

/**
 * Normalize a chapter title for pattern matching.
 * - Lowercase
 * - Remove common suffixes like "and discussion", "and conclusion"
 * - Strip LaTeX
 */
function normalizeChapterTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\band\s+(discussion|conclusion|analysis|results|future work)\b/g, '')
    .replace(/^(chapter\s+\d+[\s:.]*)/i, '')
    .replace(/[{}\\]/g, '')
    .trim();
}

/**
 * Compute bigram set from a string (for Dice coefficient).
 */
function bigrams(str: string): Set<string> {
  const result = new Set<string>();
  const s = ` ${str} `; // pad for boundary bigrams
  for (let i = 0; i < s.length - 1; i++) {
    result.add(s.slice(i, i + 2));
  }
  return result;
}

/**
 * Escape a string for use in a RegExp.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a map of chapter IDs to their sentences (used for citation proximity).
 */
function buildSentenceIndex(chapters: ThesisChapter[]): Map<string, Sentence[]> {
  const map = new Map<string, Sentence[]>();
  for (const chapter of chapters) {
    const fullText = getChapterFullText(chapter);
    const sentences = splitIntoSentences(fullText);
    map.set(chapter.id, sentences);
  }
  return map;
}

/**
 * Generate 'introduces' edges from concepts to the chapters they appear in.
 */
function buildConceptEdges(
  concepts: STGConceptNode[],
  claims: STGClaimNode[]
): STGEdge[] {
  const edges: STGEdge[] = [];

  // Connect concepts to claims that mention them (via chapter overlap)
  for (const concept of concepts) {
    const conceptLabel = concept.label.toLowerCase();
    for (const claim of claims) {
      if (concept.chapters.includes(claim.chapterId)) {
        // Check if the claim text mentions this concept (word-level)
        const claimWords = claim.text.toLowerCase().split(/\s+/);
        const conceptWords = conceptLabel.split(/\s+/);

        const hasOverlap = conceptWords.some((cw) =>
          claimWords.some((claimWord) =>
            claimWord.includes(cw) || cw.includes(claimWord)
          )
        );

        if (hasOverlap) {
          edges.push({
            type: 'introduces',
            from: concept.id,
            to: claim.id,
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Generate 'supports' edges from evidence nodes to claims.
 */
function buildEvidenceEdges(evidenceNodes: STGEvidenceNode[]): STGEdge[] {
  const edges: STGEdge[] = [];
  for (const ev of evidenceNodes) {
    for (const claimId of ev.supportsClaims) {
      edges.push({
        type: 'supports',
        from: ev.id,
        to: claimId,
      });
    }
  }
  return edges;
}

/**
 * Generate 'repeats' edges for redundant sections.
 */
function buildRedundancyEdges(
  redundantSections: Array<{ sectionA: string; sectionB: string; similarity: number }>,
  chapters: ThesisChapter[]
): STGEdge[] {
  const edges: STGEdge[] = [];

  // Create a mapping from section identifier to a node ID
  const sectionToNodeId = new Map<string, string>();
  for (const chapter of chapters) {
    sectionToNodeId.set(
      `${chapter.title} (main content)`,
      chapter.id
    );
    for (const ss of chapter.subSections) {
      sectionToNodeId.set(
        `${chapter.title} > ${ss.title}`,
        ss.id
      );
    }
  }

  for (const pair of redundantSections) {
    const nodeIdA = sectionToNodeId.get(pair.sectionA);
    const nodeIdB = sectionToNodeId.get(pair.sectionB);
    if (nodeIdA && nodeIdB) {
      edges.push({
        type: 'repeats',
        from: nodeIdA,
        to: nodeIdB,
        similarity: pair.similarity,
      });
    }
  }

  return edges;
}

/**
 * Identify concept orphans: concepts that appear in only one chapter
 * or that are user-declared but not found in any chapter.
 */
function findConceptOrphans(concepts: STGConceptNode[]): STGConceptNode[] {
  return concepts.filter(
    (c) => c.frequency === 0 || c.chapters.length <= 1
  );
}

/**
 * Find unsupported claims: claims not linked to any evidence.
 */
function findUnsupportedClaims(
  claims: STGClaimNode[],
  evidenceNodes: STGEvidenceNode[]
): STGClaimNode[] {
  const supportedIds = new Set<string>();
  for (const ev of evidenceNodes) {
    for (const claimId of ev.supportsClaims) {
      supportedIds.add(claimId);
    }
  }
  return claims.filter((c) => !supportedIds.has(c.id));
}

// ── Main entry point ──────────────────────────────────────────

/**
 * Build the Semantic Thesis Graph (STG) for a given thesis.
 *
 * This is a PURE FUNCTION — no side effects, no DOM, no async.
 *
 * Pipeline:
 * 1. Sentence Splitter — rule-based sentence segmentation
 * 2. Claim Extractor — detect assertive claims
 * 3. Concept Extractor — TF-IDF + user keywords
 * 4. Citation Proximity Mapper — link claims to evidence
 * 5. Gap Detector — structure/citation/keyword gaps
 * 6. Redundancy Detector — bag-of-words cosine similarity
 * 7. Narrative Thread Validator — fuzzy pattern matching
 * 8. Assembly — build graph, compute metrics
 *
 * Performance budget: < 500ms for 10 chapters × 5000 words each.
 *
 * Edge cases:
 * - No chapters → empty graph with valid defaults
 * - Empty chapters → skipped, no claims/concepts extracted
 * - No keywords → concepts come from TF-IDF only
 * - No references → all claims are unsupported
 * - Single chapter → narrative structure is 'invalid'
 */
export function buildSemanticGraph(thesis: ThesisData): STGResult {
  const chapters = thesis.chapters || [];

  // Empty thesis guard
  if (chapters.length === 0) {
    return {
      nodes: [],
      edges: [],
      adjacencyList: new Map(),
      totalConcepts: 0,
      totalClaims: 0,
      totalEvidence: 0,
      totalGaps: 0,
      argumentCoverage: 100,
      conceptConnectivity: 100,
      redundancyScore: 0,
      unsupportedClaims: [],
      conceptOrphans: [],
      redundantSections: [],
      narrativeStructure: 'invalid',
    };
  }

  // ── Step 1: Split all chapters into sentences ──
  const sentenceIndex = buildSentenceIndex(chapters);

  // ── Step 2: Extract claims from each chapter ──
  const allClaims: STGClaimNode[] = [];
  for (const chapter of chapters) {
    const sentences = sentenceIndex.get(chapter.id) || [];

    // Extract from chapter-level content
    const chapterSentences = sentences.slice(); // all sentences for this chapter
    const chapterClaims = extractClaims(chapterSentences, chapter.id, undefined);
    allClaims.push(...chapterClaims);

    // If we're already at 50 for this chapter from main content, skip subsections
    if (chapterClaims.length >= 50) continue;
  }
  // Note: We extract claims at the chapter level (not per-subsection) for simplicity,
  // since subsection sentence boundaries may not align with the full chapter text.

  // ── Step 3: Extract concepts ──
  const concepts = extractConcepts(chapters, thesis.keywords || []);

  // ── Step 4: Map citation proximity ──
  const evidenceNodes = mapCitationProximity(allClaims, sentenceIndex);

  // ── Step 5: Detect gaps ──
  const gaps = detectGaps(concepts, allClaims, evidenceNodes, chapters, thesis.keywords || []);

  // ── Step 6: Detect redundancy ──
  const redundantSections = detectRedundancy(chapters);

  // ── Step 7: Validate narrative structure ──
  const narrativeResult = validateNarrativeStructure(chapters);

  // ── Step 8a: Build edges ──
  const evidenceEdges = buildEvidenceEdges(evidenceNodes);
  const conceptEdges = buildConceptEdges(concepts, allClaims);
  const redundancyEdges = buildRedundancyEdges(redundantSections, chapters);
  const allEdges = [...evidenceEdges, ...conceptEdges, ...redundancyEdges];

  // ── Step 8b: Identify specific issues ──
  const unsupportedClaims = findUnsupportedClaims(allClaims, evidenceNodes);
  const conceptOrphans = findConceptOrphans(concepts);

  // ── Step 8c: Assemble final result ──
  return assembleResult(
    concepts,
    allClaims,
    evidenceNodes,
    gaps,
    allEdges,
    unsupportedClaims,
    conceptOrphans,
    redundantSections,
    narrativeResult
  );
}
