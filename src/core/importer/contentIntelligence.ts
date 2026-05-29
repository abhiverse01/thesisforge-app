// ============================================================
// ThesisForge Import — Content Intelligence Engine v3 (GODMODE ULTRA)
// Deep content analysis, classification, smart extraction,
// reference deduplication, quality scoring, and IMRAD detection.
// ============================================================

import type { ExtractedMetadata, ExtractedChapter, ExtractedReference } from './types';
import { countWords, extractYears, similarity, fuzzyEquals, fuzzyFind, normalizeAuthorName, normalizeInstitution, detectLanguage, cleanLine, dedupeFuzzy, levenshtein } from './textUtils';

// ---- Content Classification ----

export type ContentType = 'thesis' | 'research_paper' | 'report' | 'dissertation' | 'monograph' | 'unknown';

/**
 * Classify the content type from metadata and structure signals.
 * Uses a weighted multi-signal approach with 12 classification features.
 */
export function classifyContent(
  metadata: ExtractedMetadata,
  chapters: ExtractedChapter[],
  fullText: string
): ContentType {
  const signals: Record<ContentType, number> = {
    thesis: 0,
    research_paper: 0,
    report: 0,
    dissertation: 0,
    monograph: 0,
    unknown: 0,
  };

  const wordCount = countWords(fullText);
  const hasAbstract = !!metadata.abstract && metadata.abstract.length > 50;
  const hasSupervisor = !!metadata.supervisor;
  const hasInstitution = !!metadata.institution;
  const hasDegree = !!metadata.degree || !!metadata.degreeAbbrev;
  const hasKeywords = (metadata.keywords?.length || 0) > 0;
  const chapterCount = chapters.length;
  const totalChapterWords = chapters.reduce((s, ch) => s + countWords(ch.body), 0);

  // Thesis signals
  if (hasDegree) signals.thesis += 3;
  if (hasSupervisor) signals.thesis += 2;
  if (hasInstitution) signals.thesis += 1;
  if (chapterCount >= 4) signals.thesis += 2;
  if (wordCount > 15000) signals.thesis += 1;
  if (/\bthesis\b|\bdissertation\b|\bsubmitted\s+in\s+(?:partial\s+)?fulfillment\b/i.test(fullText)) signals.thesis += 3;
  if (/\bdeclaration\b|\backnowledgements?\b|\btable\s+of\s+contents\b/i.test(fullText)) signals.thesis += 1;

  // Dissertation signals (longer, more formal)
  if (wordCount > 40000) signals.dissertation += 2;
  if (/doctoral|ph\.?d/i.test(fullText)) signals.dissertation += 3;
  if (chapterCount >= 6) signals.dissertation += 1;
  if (hasDegree && metadata.degreeAbbrev === 'phd') signals.dissertation += 3;

  // Research paper signals
  if (wordCount < 15000 && wordCount > 2000) signals.research_paper += 2;
  if (chapterCount <= 6) signals.research_paper += 1;
  if (/\babstract\b|\bintroduction\b|\bmethod\b|\bresults?\b|\bdiscussion\b|\bconclusion\b/i.test(fullText)) {
    signals.research_paper += 2;
  }
  if (/©|copyright|arxiv|doi:/i.test(fullText)) signals.research_paper += 2;
  // Conference paper signals
  if (/\bconference\b|\bsymposium\b|\bworkshop\b|\bproceedings\b/i.test(fullText)) signals.research_paper += 2;
  if (/\bibeeetr\b|\bacmart\b|\bsigchi\b|\bIEEE\b/i.test(fullText)) signals.research_paper += 3;
  if (wordCount < 12000 && wordCount > 1500) signals.research_paper += 1;
  if (chapterCount <= 5 && chapterCount >= 3) signals.research_paper += 1;

  // Report signals
  if (/\breport\b|\bmemorandum\b|\btechnical\b/i.test(fullText)) signals.report += 2;
  if (wordCount < 10000) signals.report += 1;
  if (chapterCount <= 5) signals.report += 1;
  if (!hasDegree && !hasSupervisor) signals.report += 1;

  // Monograph signals
  if (wordCount > 50000) signals.monograph += 2;
  if (chapterCount > 10) signals.monograph += 2;
  if (/chapter\s+(one|two|three|four|five|six|seven|eight|nine|ten)/i.test(fullText)) signals.monograph += 1;

  // Find the highest scoring type with tie-breaking
  let bestType: ContentType = 'unknown';
  let bestScore = 0;
  for (const [type, score] of Object.entries(signals)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as ContentType;
    } else if (score === bestScore && score > 0) {
      // Tie-breaking: prefer shorter/more specific classification
      const priority: Record<string, number> = { thesis: 0, dissertation: 1, research_paper: 2, report: 3, monograph: 4 };
      if ((priority[type] ?? 5) < (priority[bestType] ?? 5)) {
        bestType = type as ContentType;
      }
    }
  }

  // Penalty for conflicting signals (e.g., thesis + report keywords)
  if (bestType === 'thesis' && signals.report >= 3) {
    // Report signals conflict — likely a research paper styled as thesis
    if (signals.research_paper > signals.thesis * 0.7) {
      bestType = 'research_paper';
    }
  }
  if (bestType === 'dissertation' && signals.thesis >= signals.dissertation * 0.8 && !hasDegree) {
    // Without explicit PhD signals, don't over-classify as dissertation
    bestType = 'thesis';
  }

  return bestScore >= 2 ? bestType : 'unknown';
}

// ---- IMRAD Structure Detection ----

export interface IMRADStructure {
  hasIntroduction: boolean;
  hasMethodology: boolean;
  hasResults: boolean;
  hasAndDiscussion: boolean;
  hasConclusion: boolean;
  hasLiteratureReview: boolean;
  hasTheory: boolean;
  hasCaseStudy: boolean;
  completeness: number; // 0-1
  imradScore: number;    // 0-1 how well it follows IMRAD
}

/**
 * Detect IMRAD (Introduction, Methods, Results, and Discussion) structure.
 * Returns detailed analysis of which IMRAD sections are present.
 */
export function detectIMRADStructure(chapters: ExtractedChapter[], fullText: string): IMRADStructure {
  const allTitles = chapters.map(ch => ch.title.toLowerCase()).join(' ');
  const first1000 = fullText.slice(0, 5000).toLowerCase();

  const hasIntroduction = /introduction/i.test(allTitles) || /introduction/i.test(first1000);
  const hasMethodology = /(?:method(?:ology)?|approach|materials?\s+and\s+methods?|research\s+design|experimental\s+(?:setup|design|method))/i.test(allTitles);
  const hasResults = /(?:results?|findings?|experiments?|evaluation|data\s+analysis|empirical)/i.test(allTitles);
  const hasAndDiscussion = /(?:discussion|interpretation|implications?|analysis\s+and\s+discussion)/i.test(allTitles);
  const hasConclusion = /(?:conclusion|summary|closing|concluding\s+remarks?)/i.test(allTitles);
  const hasLiteratureReview = /(?:literature|related\s+work|background|previous\s+work|prior\s+work|theoretical\s+(?:background|framework))/i.test(allTitles);
  const hasTheory = /(?:theoretical\s+framework|theory|conceptual\s+framework|model|formalism)/i.test(allTitles);
  const hasCaseStudy = /(?:case\s+study|case\s+analysis|empirical\s+study)/i.test(allTitles);

  const imradParts = [hasIntroduction, hasMethodology, hasResults, hasAndDiscussion];
  const allParts = [hasIntroduction, hasMethodology, hasResults, hasAndDiscussion, hasConclusion];
  const extendedParts = [...allParts, hasLiteratureReview];

  return {
    hasIntroduction,
    hasMethodology,
    hasResults,
    hasAndDiscussion,
    hasConclusion,
    hasLiteratureReview,
    hasTheory,
    hasCaseStudy,
    completeness: extendedParts.filter(Boolean).length / extendedParts.length,
    imradScore: imradParts.filter(Boolean).length / imradParts.length,
  };
}

// ---- Content Quality Scoring ----

export interface ContentQuality {
  overall: number;          // 0-100
  metadataCompleteness: number;
  structureScore: number;
  contentDepth: number;
  referenceQuality: number;
  readabilityScore: number;
  issues: string[];
  suggestions: string[];
}

/**
 * Comprehensive content quality scoring across 6 dimensions.
 * Returns detailed scores and actionable suggestions.
 */
export function scoreContentQuality(
  metadata: ExtractedMetadata,
  chapters: ExtractedChapter[],
  references: ExtractedReference[],
  fullText: string
): ContentQuality {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // ---- 1. Metadata Completeness (0-100) ----
  const metaFields = [
    !!metadata.title,
    !!metadata.author,
    !!metadata.institution,
    !!metadata.year,
    !!metadata.abstract && metadata.abstract.length > 100,
    (metadata.keywords?.length || 0) >= 3,
    !!metadata.department,
    !!metadata.supervisor,
  ];
  const metadataCompleteness = Math.round((metaFields.filter(Boolean).length / metaFields.length) * 100);

  if (!metadata.title) issues.push('No title detected in the document');
  else if (metadata.title.length < 10) issues.push('Title appears too short (less than 10 characters)');
  if (!metadata.author) issues.push('No author detected in the document');
  if (!metadata.abstract) issues.push('No abstract section found');
  else if (countWords(metadata.abstract) < 50) issues.push('Abstract is very short (less than 50 words)');
  else if (countWords(metadata.abstract) > 500) suggestions.push('Abstract may be too long — consider condensing to 150-300 words');
  if (!metadata.year) suggestions.push('Add a year/date for better categorization');
  if ((metadata.keywords?.length || 0) === 0) suggestions.push('Add keywords for discoverability');
  if ((metadata.keywords?.length || 0) > 15) suggestions.push('Too many keywords — consider reducing to 5-10');

  // ---- 2. Structure Score (0-100) ----
  const imrad = detectIMRADStructure(chapters, fullText);
  const structureSignals = [
    chapters.length >= 3 ? 1 : 0,
    chapters.length >= 5 ? 1 : 0,
    imrad.hasIntroduction ? 1 : 0,
    imrad.hasConclusion ? 1 : 0,
    imrad.hasLiteratureReview ? 1 : 0,
    imrad.imradScore > 0.5 ? 1 : 0,
  ];
  const structureScore = Math.round((structureSignals.reduce((a, b) => a + b, 0) / structureSignals.length) * 100);

  if (chapters.length === 0) issues.push('No chapters or sections detected in the document');
  else if (chapters.length < 3) issues.push('Very few chapters detected — document structure may be incomplete');
  if (!imrad.hasIntroduction) suggestions.push('Consider adding an introduction chapter');
  if (!imrad.hasConclusion) suggestions.push('Consider adding a conclusion chapter');
  if (imrad.imradScore < 0.5 && chapters.length >= 3) suggestions.push('Consider organizing chapters in IMRAD structure (Introduction, Methods, Results, Discussion)');

  // ---- 3. Content Depth (0-100) ----
  const totalWords = chapters.reduce((s, ch) => s + countWords(ch.body), 0);
  const avgChapterWords = chapters.length > 0 ? totalWords / chapters.length : 0;
  const depthSignals = [
    totalWords > 5000 ? 1 : 0,
    totalWords > 15000 ? 1 : 0,
    avgChapterWords > 500 ? 1 : 0,
    avgChapterWords > 1500 ? 1 : 0,
    chapters.some(ch => countWords(ch.body) > 2000) ? 1 : 0,
  ];
  const contentDepth = Math.round((depthSignals.reduce((a, b) => a + b, 0) / depthSignals.length) * 100);

  if (totalWords < 1000) issues.push('Document has very little text content');
  if (totalWords > 100000) suggestions.push('Very long document — import processing may be slower');
  if (chapters.some(ch => countWords(ch.body) < 20)) {
    suggestions.push('Some chapters have very little content — verify chapter boundaries');
  }

  // ---- 4. Reference Quality (0-100) ----
  let referenceQuality = 0;
  if (references.length > 0) {
    const withTitle = references.filter(r => r.title).length / references.length;
    const withAuthor = references.filter(r => r.author).length / references.length;
    const withYear = references.filter(r => r.year).length / references.length;
    const withDOI = references.filter(r => r.doi || r.url).length / references.length;
    referenceQuality = Math.round(((withTitle * 0.3 + withAuthor * 0.25 + withYear * 0.25 + withDOI * 0.1 + Math.min(references.length / 15, 1) * 0.1) * 100));
  }
  if (references.length === 0) suggestions.push('No references detected — add a bibliography section');
  else if (references.length < 5) suggestions.push('Very few references — academic documents typically cite more sources');
  if (references.length > 0) {
    const withMetadata = references.filter(r => r.title && r.author && r.year).length;
    if (withMetadata / references.length < 0.5) suggestions.push('Many references lack complete metadata (title, author, year)');
  }

  // ---- 5. Readability Score (0-100) ----
  const avgSentenceLength = fullText.length > 100 ? estimateAvgSentenceLength(fullText) : 20;
  const readabilityScore = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(avgSentenceLength - 20) * 1.5)));

  if (avgSentenceLength > 35) suggestions.push('Sentences appear very long — consider breaking them up for readability');
  if (avgSentenceLength < 8) suggestions.push('Sentences appear very short — consider combining related ideas');

  // ---- Overall (weighted) ----
  const overall = Math.round(
    metadataCompleteness * 0.25 +
    structureScore * 0.20 +
    contentDepth * 0.25 +
    referenceQuality * 0.20 +
    readabilityScore * 0.10
  );

  return {
    overall,
    metadataCompleteness,
    structureScore,
    contentDepth,
    referenceQuality,
    readabilityScore,
    issues,
    suggestions,
  };
}

function estimateAvgSentenceLength(text: string): number {
  // Sample-based estimation for large texts (godmode: avoid full split on 100k+ chars)
  const sampleText = text.length > 20000 ? text.slice(0, 20000) : text;
  // Handle CJK sentence endings (Chinese 。 Japanese 。！？ Korean . ！？)
  const hasCJKSentenceEnders = /[。\uff01\uff1f]/.test(sampleText);
  if (hasCJKSentenceEnders) {
    // Split on CJK sentence terminators for accurate CJK sentence length
    const cjkSentences = sampleText.split(/[。\uff01\uff1f]+/).filter(s => s.trim().length > 0);
    if (cjkSentences.length > 0) {
      const totalWords = cjkSentences.reduce((sum, s) => sum + countWords(s), 0);
      return totalWords / cjkSentences.length;
    }
  }
  const sentences = sampleText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + countWords(s), 0);
  return totalWords / sentences.length;
}

// ---- Reference Deduplication ----

/**
 * Deduplicate references using multi-signal similarity.
 * Godmode: uses Set for O(1) DOI/URL lookups, length pre-filter for fuzzy,
 * and trigram-based fast comparison before Levenshtein.
 */
export function deduplicateReferences(refs: ExtractedReference[]): ExtractedReference[] {
  if (refs.length <= 1) return refs;

  const deduped: ExtractedReference[] = [];
  const exactTitleSet = new Set<string>();    // O(1) exact match
  const normalizedTitleSet = new Set<string>(); // O(1) normalized match
  const doiSet = new Set<string>();
  const urlSet = new Set<string>();
  // For fuzzy matching of near-duplicates
  const fuzzyTitleList: string[] = [];

  for (const ref of refs) {
    const titleKey = (ref.title || '').toLowerCase().trim();
    const normalizedTitle = titleKey.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

    // O(1) exact DOI/URL match
    if (ref.doi) {
      const normalizedDoi = ref.doi.toLowerCase().trim();
      if (doiSet.has(normalizedDoi)) continue;
    }
    if (ref.url) {
      const normalizedUrl = ref.url.toLowerCase().replace(/\/$/, '').trim();
      if (urlSet.has(normalizedUrl)) continue;
    }

    // O(1) exact title match
    if (titleKey.length > 5 && exactTitleSet.has(titleKey)) continue;

    // O(1) normalized title match (ignores punctuation, extra spaces)
    if (normalizedTitle.length > 8 && normalizedTitleSet.has(normalizedTitle)) continue;

    // Fuzzy match only for longer titles (O(n) per candidate, but with pre-filters)
    let isDuplicate = false;
    if (titleKey.length > 10) {
      for (const seenKey of fuzzyTitleList) {
        // Quick length pre-check
        if (Math.abs(titleKey.length - seenKey.length) / Math.max(titleKey.length, seenKey.length) > 0.2) continue;
        // Trigram quick-check
        if (trigramOverlap(titleKey, seenKey) < 0.5) continue;
        if (fuzzyEquals(titleKey, seenKey, 0.85)) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      // Author+year pre-filter for fast dedup
      const authorLastName = ref.author ? extractLastName(ref.author) : '';
      if (authorLastName.length > 2) {
        const seenRef = deduped.find(d => {
          const dLastName = extractLastName(d.author || '');
          return dLastName === authorLastName && (d.year || '') === (ref.year || '') && dLastName.length > 2;
        });
        if (seenRef && titleKey.length > 10 && similarity(titleKey, (seenRef.title || '').toLowerCase()) < 0.3) {
          // Same author+year, very different title = likely different paper, keep
          continue;
        }
      }
      deduped.push(ref);
      if (titleKey.length > 5) {
        exactTitleSet.add(titleKey);
        fuzzyTitleList.push(titleKey);
      }
      if (normalizedTitle.length > 8) normalizedTitleSet.add(normalizedTitle);
      if (ref.doi) doiSet.add(ref.doi.toLowerCase().trim());
      if (ref.url) urlSet.add(ref.url.toLowerCase().replace(/\/$/, '').trim());
    }
  }

  return deduped;
}

/** Fast trigram overlap ratio (0-1) for pre-filtering before Levenshtein. */
function trigramOverlap(a: string, b: string): number {
  if (a.length < 3 || b.length < 3) return 0;
  const trigramsA = new Set<string>();
  for (let i = 0; i <= a.length - 3; i++) trigramsA.add(a.slice(i, i + 3));
  const trigramsB = new Set<string>();
  for (let i = 0; i <= b.length - 3; i++) trigramsB.add(b.slice(i, i + 3));
  let overlap = 0;
  for (const t of trigramsA) { if (trigramsB.has(t)) overlap++; }
  return overlap / Math.min(trigramsA.size, trigramsB.size);
}

/**
 * Classify reference types more intelligently based on field patterns.
 */
export function classifyReferenceType(ref: ExtractedReference): string {
  const title = (ref.title || '').toLowerCase();
  const raw = (ref.raw || '').toLowerCase();
  const journal = (ref.journal || '').toLowerCase();
  const booktitle = (ref.booktitle || '').toLowerCase();

  // Use the explicit BibTeX type first (highest confidence)
  if (ref.type === 'phdthesis' || ref.type === 'mastersthesis') {
    return ref.type;
  }
  // Only check raw for thesis keywords when type is ambiguous
  if (ref.type === 'thesis' || ref.type === 'dissertation') {
    return /ph\.?d|doctoral/i.test(raw) ? 'phdthesis' : 'mastersthesis';
  }
  if (/conference|proceedings|symposium|workshop/i.test(raw) || ref.type === 'inproceedings') {
    return 'inproceedings';
  }
  if (/arxiv|preprint/i.test(raw) || /doi\.org\/10\.1109/i.test(ref.doi || '')) {
    return 'article';
  }
  if (booktitle && booktitle.length > 5) {
    return 'incollection';
  }
  if (journal || ref.type === 'article') {
    return 'article';
  }
  if (/http|www\.|\.com|\.org/i.test(ref.url || '') && !journal && !booktitle) {
    return 'online';
  }
  if (/book|press|publishing|university\s+press/i.test(raw) || ref.type === 'book') {
    return 'book';
  }
  if (ref.type === 'techreport' || /technical\s+report/i.test(raw)) {
    return 'techreport';
  }
  return ref.type || 'misc';
}

// ---- Deep Metadata Extraction ----

/**
 * Intelligently extract author names from raw text.
 * Handles: "by John Smith", "John Smith and Jane Doe", "J. Smith, J. Doe", etc.
 */
export function extractAuthorsSmart(text: string): string[] {
  const authors: string[] = [];

  // Pattern 1: "by <name>" or "By <name>"
  const byMatch = text.match(/\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+)*)\b/i);
  if (byMatch) authors.push(normalizeAuthorName(byMatch[1]));

  // Pattern 2: "author: <name>" or "author(s): <name>"
  const authorMatch = text.match(/\bauthor[s]?\s*[:：]\s*([^\n]+)/i);
  if (authorMatch) {
    const authorText = authorMatch[1].trim();
    const parts = authorText.split(/\s*(?:,|and)\s*/i);
    for (const part of parts) {
      const cleaned = part.trim();
      if (cleaned.length > 2 && cleaned.length < 100) {
        authors.push(normalizeAuthorName(cleaned));
      }
    }
  }

  // Pattern 3: "John A. Smith" at start of document (typical thesis first page)
  const firstPageAuthor = text.match(/^([A-Z][a-z]+\s+[A-Z]\.(?:\s+[A-Z]\.?)*\s+[A-Z][a-z]+)/m);
  if (firstPageAuthor && authors.length === 0) {
    authors.push(normalizeAuthorName(firstPageAuthor[1]));
  }

  return [...new Set(authors)].filter(a => a.length > 0);
}

/**
 * Intelligently extract title from text using 8 strategies.
 */
export function extractTitleSmart(text: string): string | null {
  // Strategy 1: \title{...} in LaTeX
  const latexTitle = text.match(/\\title\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/);
  if (latexTitle) return cleanLine(latexTitle[1]);

  // Strategy 2: YAML frontmatter title
  const yamlTitle = text.match(/^---\s*\n[\s\S]*?title:\s*["']?([^"'\n]+)["']?\s*\n[\s\S]*?---/m);
  if (yamlTitle) return cleanLine(yamlTitle[1]);

  // Strategy 3: H1 markdown heading
  const mdH1 = text.match(/^#\s+(.+)/m);
  if (mdH1) return cleanLine(mdH1[1]);

  // Strategy 4: ALL CAPS title (first prominent one)
  const allCapsTitle = text.match(/^([A-Z][A-Z\s:;&–—\-]{15,120})$/m);
  if (allCapsTitle) return cleanLine(allCapsTitle[1]);

  // Strategy 5: First long line that looks like a title (with "by" on next line)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  for (const line of lines.slice(0, 5)) {
    const trimmed = cleanLine(line);
    if (trimmed.length > 10 && trimmed.length < 200) {
      const nextLineIdx = lines.indexOf(line) + 1;
      if (nextLineIdx < lines.length && /^\s*by\s+/i.test(lines[nextLineIdx])) {
        return trimmed;
      }
    }
  }

  // Strategy 6: "Title:" explicit label
  const explicitTitle = text.match(/\btitle\s*[:：]\s*(.{10,200})/im);
  if (explicitTitle) return cleanLine(explicitTitle[1]);

  // Strategy 7: First line if it's substantial and capitalized
  if (lines.length > 0) {
    const firstLine = cleanLine(lines[0]);
    if (firstLine.length > 10 && firstLine.length < 150) {
      const capWords = firstLine.split(/\s+/).filter(w => /^[A-Z]/.test(w));
      if (capWords.length / firstLine.split(/\s+/).length > 0.5) {
        return firstLine;
      }
    }
  }

  // Strategy 8: Look for bold/heading-like patterns in first 30 lines
  for (const line of lines.slice(0, 30)) {
    const trimmed = line.trim();
    if (trimmed.length >= 15 && trimmed.length <= 150) {
      if (/^\*[^*]+\*$/.test(trimmed)) {
        return cleanLine(trimmed.replace(/^\*|\*$/g, ''));
      }
    }
  }

  return null;
}

/**
 * Smart abstract extraction - finds abstract section regardless of format.
 */
export function extractAbstractSmart(text: string): string | null {
  // LaTeX: \begin{abstract}...\end{abstract}
  const latexAbstract = text.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  if (latexAbstract) {
    const cleaned = latexAbstract[1]
      .replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, '')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[{}]/g, '')
      .trim();
    if (cleaned.length > 50) return cleaned;
  }

  // Markdown/Text: "Abstract" heading followed by content
  const abstractHeading = text.match(/(?:^|\n)(?:#{1,4}\s+)?abstract\s*[:：]?\s*\n([\s\S]{100,5000})(?:\n#{1,3}\s|\n\s*\n\s*(?:introduction|chapter|keywords?\s*[:：])\b)/im);
  if (abstractHeading) {
    const cleaned = abstractHeading[1].trim();
    if (cleaned.length > 50) return cleaned;
  }

  // Fallback: Look for a paragraph that mentions "abstract" concepts
  const lines = text.split('\n');
  let abstractStart = -1;
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    if (/^abstract\s*[:：]?\s*$/i.test(lines[i].trim())) {
      abstractStart = i + 1;
      break;
    }
  }
  if (abstractStart > -1) {
    const parts: string[] = [];
    for (let i = abstractStart; i < lines.length && parts.join(' ').length < 5000; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (/^(?:introduction|chapter|keywords?|1\s+\.)/i.test(line)) break;
      parts.push(line);
    }
    if (parts.join(' ').length > 50) return parts.join(' ').trim();
  }

  return null;
}

/**
 * Smart keyword extraction from multiple sources.
 */
export function extractKeywordsSmart(text: string, metadata?: Partial<ExtractedMetadata>): string[] {
  const keywords: string[] = [];

  if (metadata?.keywords?.length) return metadata.keywords;

  // LaTeX \keywords{...}
  const latexKw = text.match(/\\keywords?\s*\{([^}]+)\}/i);
  if (latexKw) {
    keywords.push(...latexKw[1].split(/[,;]/).map(k => k.trim()).filter(k => k.length > 1));
  }

  // "Keywords:" line
  const kwLine = text.match(/\bkeywords?\s*[:：]\s*([^\n]{10,300})/i);
  if (kwLine) {
    keywords.push(...kwLine[1].split(/[,;·•]/).map(k => k.trim()).filter(k => k.length > 1 && k.length < 60));
  }

  // YAML frontmatter
  const yamlKw = text.match(/^---\s*\n[\s\S]*?keywords:\s*\[?([^\]\n]+)\]?/m);
  if (yamlKw) {
    keywords.push(...yamlKw[1].split(/[,;"]/).map(k => k.trim()).filter(k => k.length > 1));
  }

  // pdfkeywords from hypersetup
  const hyperKw = text.match(/\\hypersetup\s*\{[^}]*pdfkeywords\s*=\s*\{([^}]+)\}/);
  if (hyperKw) {
    keywords.push(...hyperKw[1].split(/[,;]/).map(k => k.trim()).filter(k => k.length > 1));
  }

  return [...new Set(keywords)].slice(0, 15);
}

/**
 * Smart year extraction with context awareness.
 */
export function extractYearSmart(text: string): string | null {
  const years = extractYears(text);
  if (years.length === 0) return null;

  // Prefer year near "date", "submitted", "copyright", or "©"
  const contextPatterns = [
    /\b(?:date|submitted|published|copyright|©)\s*[:：]?\s*(?:\w+\s+)?(\d{4})/i,
    /\b(20\d{2}|19\d{2})\s*(?:\b(?:by|submitted|published|copyright|©)\b)/i,
  ];
  for (const pattern of contextPatterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  // Return the most common recent year
  const yearCounts: Record<string, number> = {};
  for (const y of years) {
    yearCounts[y] = (yearCounts[y] || 0) + 1;
  }
  const sorted = Object.entries(yearCounts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

/**
 * Smart institution extraction.
 */
export function extractInstitutionSmart(text: string): string | null {
  const patterns = [
    /\b((?:[A-Z][a-zA-Z\s&'-]{1,30}(?:of|at|for)\s+)?[A-Z][a-zA-Z\s&'-]{1,40}\s+(?:University|College|Institute|School|Polytechnic|Conservatory|Academy))\b/i,
    /\b(University\s+of\s+[A-Z][a-zA-Z\s&'-]+)\b/i,
    /\b([A-Z][a-zA-Z\s&'-]+\s+(?:University|College|Institute))\b/i,
    /\b((?:[A-Z][a-zA-Z\s&'-]{1,30}\s+)?(?:Dept(?:artment)?\.?\s+of\s+[A-Z][a-zA-Z\s&'-]{1,40}(?:\s+(?:University|College|Institute|School))?))\b/i,
    /\b((?:[A-Z][a-zA-Z\s&'-]{1,30}\s+)?(?:Faculty|School)\s+of\s+[A-Z][a-zA-Z\s&'-]{1,40})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = normalizeInstitution(match[1].trim());
      if (name.length > 5 && name.length < 150) return name;
    }
  }
  return null;
}

/**
 * Smart supervisor extraction.
 */
export function extractSupervisorSmart(text: string): string | null {
  const patterns = [
    /(?:supervisor|advisor|adviser|supervised by)\s*[:：]?\s*([A-Z][a-zA-Z.\s'-]{3,60})/i,
    /(?:principal\s+)?(?:supervisor|advisor)\s*[:：]?\s*(?:prof(?:essor)?\.?\s*)?([A-Z][a-zA-Z.\s'-]{3,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = normalizeAuthorName(match[1].trim());
      if (name.length > 3 && name.length < 60) return name;
    }
  }
  return null;
}

/**
 * Comprehensive content analysis - returns structured analysis report.
 */
export function analyzeContent(
  text: string,
  metadata: ExtractedMetadata,
  chapters: ExtractedChapter[],
  references: ExtractedReference[]
): {
  contentType: ContentType;
  language: string;
  imrad: IMRADStructure;
  quality: ContentQuality;
} {
  const contentType = classifyContent(metadata, chapters, text);
  const language = detectLanguage(text.slice(0, 5000));
  const imrad = detectIMRADStructure(chapters, text);
  const quality = scoreContentQuality(metadata, chapters, references, text);

  return { contentType, language, imrad, quality };
}

/** Extract last name from author string for dedup comparison. */
function extractLastName(author: string): string {
  if (!author) return '';
  const parts = author.split(/[,;]\s*/).map(p => p.trim().replace(/\./g, ''));
  const last = (parts[parts.length - 1] || '').split(/\s+/).pop() || '';
  return last.toLowerCase();
}
