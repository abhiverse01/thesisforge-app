// ============================================================
// ThesisForge Engine — Layer 5: Document Intelligence
// Knows what a good thesis looks like. Fills gaps.
//
// Intelligence rules run SILENTLY.
// They produce warnings in the sidebar. They NEVER block.
// A thesis with an orphan section is better than no thesis.
// ============================================================

import type { ThesisData, ThesisChapter } from '@/lib/thesis-types';

// ============================================================
// Intelligence Rule 1 — Cross-Reference Validation
// Verify every \ref{} and \cref{} target exists.
// ============================================================

export interface CrossRefResult {
  defined: Set<string>;
  undefined: Array<{ ref: string; full: string }>;
  unused: string[];
  totalLabels: number;
  totalRefs: number;
}

export function validateCrossReferences(tex: string): CrossRefResult {
  const definedLabels = new Set(
    [...tex.matchAll(/\\label\{([^}]+)\}/g)].map(m => m[1])
  );

  const usedRefs = [
    ...tex.matchAll(/\\(?:cref|ref|pageref|vref|eqref|Cref|Cref|autoref)\{([^}]+)\}/g)
  ].map(m => ({ ref: m[1], full: m[0] }));

  const undefinedRefs = usedRefs.filter(r => !definedLabels.has(r.ref));
  const unused = [...definedLabels].filter(
    l => !usedRefs.some(r => r.ref === l)
  );

  return {
    defined: definedLabels,
    undefined: undefinedRefs,
    unused,
    totalLabels: definedLabels.size,
    totalRefs: usedRefs.length,
  };
}

// ============================================================
// Intelligence Rule 2 — Orphan Sentence Detection
// A section with only 1-2 sentences is an orphan.
// Professors notice these immediately.
// ============================================================

export interface OrphanSection {
  chapterId: string;
  chapterTitle: string;
  sentenceCount: number;
  wordCount: number;
  message: string;
}

export function detectOrphanSections(chapters: ThesisChapter[]): OrphanSection[] {
  const orphans: OrphanSection[] = [];

  for (const ch of chapters) {
    const body = ch.content || '';
    if (!body.trim()) continue;

    // Count sentences by splitting on sentence-ending punctuation
    const sentences = body
      .split(/[.!?]+\s+/)
      .filter(s => s.trim().length > 10); // Filter out very short fragments

    const wordCount = countWords(body);

    if (sentences.length < 3 && wordCount > 20) {
      orphans.push({
        chapterId: ch.id,
        chapterTitle: ch.title,
        sentenceCount: sentences.length,
        wordCount,
        message: `"${ch.title}" has only ${sentences.length} sentence(s) (${wordCount} words). Expand to at least 3-4 paragraphs.`,
      });
    }
  }

  return orphans;
}

// ============================================================
// Intelligence Rule 3 — Citation Density Check
// Academic writing requires citations. Flag chapters with
// suspicious citation density (too many or too few).
// ============================================================

export interface CitationDensityResult {
  chapterId: string;
  chapterTitle: string;
  wordCount: number;
  citeCount: number;
  density: number; // citations per 100 words
  status: 'ok' | 'no-citations' | 'over-cited' | 'exempt';
}

export function checkCitationDensity(chapters: ThesisChapter[]): CitationDensityResult[] {
  return chapters.map(ch => {
    const body = ch.content || '';
    const wordCount = countWords(body);

    // Count \cite{} commands
    const citeCount = (body.match(/\\cite[a-z]*\{/g) || []).length;
    const density = wordCount > 0 ? Math.round((citeCount / (wordCount / 100)) * 10) / 10 : 0;

    // Conclusions and introductions cite less — exempt
    const isConclusion = /conclusion/i.test(ch.title);
    const isIntroduction = /introduction/i.test(ch.title);

    let status: CitationDensityResult['status'] = 'ok';
    if (isConclusion || isIntroduction) {
      status = 'exempt';
    } else if (density === 0 && wordCount > 200) {
      status = 'no-citations';
    } else if (density > 8) {
      status = 'over-cited';
    }

    return {
      chapterId: ch.id,
      chapterTitle: ch.title,
      wordCount,
      citeCount,
      density,
      status,
    };
  });
}

// ============================================================
// Intelligence Rule 4 — Abstract Quality Gate
// The abstract is the most-read part of a thesis.
// Check for the 5 required elements of a strong abstract.
// ============================================================

export interface AbstractAudit {
  wordCount: number;
  sentences: number;
  checks: {
    statesContext: boolean;
    statesGap: boolean;
    statesMethod: boolean;
    statesResult: boolean;
    statesImpact: boolean;
  };
  passCount: number;
  issues: string[];
}

export function auditAbstract(abstractText: string): AbstractAudit {
  const text = abstractText || '';
  const words = countWords(text);
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 5);

  const checks = {
    statesContext: /\b(this (study|thesis|paper|research|project|dissertation|work)|we (investigate|present|propose|examine|explore|develop|analyze))\b/i.test(text),
    statesGap: /\b(however|although|despite|problem|challenge|limitation|gap|lack|insufficient|need for|room for)\b/i.test(text),
    statesMethod: /\b(method|approach|technique|algorithm|experiment|survey|analysis|framework|methodology|design|model|system)\b/i.test(text),
    statesResult: /\b(result|finding|show|demonstrate|achieve|improve|outperform|reduce|increase|reveal|indicate|suggest|confirm)\b/i.test(text),
    statesImpact: /\b(contribut|implicat|significance|practical|theoretical|application|recommend|benefit|advance|inform)\b/i.test(text),
  };

  const passCount = Object.values(checks).filter(Boolean).length;

  const issues: string[] = [];
  if (words < 150) issues.push('Abstract is too short (< 150 words). Most universities require 150-350 words.');
  if (words > 500) issues.push('Abstract may be too long (> 500 words). Consider condensing.');
  if (!checks.statesContext) issues.push("Abstract doesn't clearly state the research context or purpose.");
  if (!checks.statesGap) issues.push("Abstract doesn't identify a gap, problem, or motivation.");
  if (!checks.statesMethod) issues.push("Abstract doesn't describe the method or approach used.");
  if (!checks.statesResult) issues.push("Abstract doesn't state the results or findings.");
  if (!checks.statesImpact) issues.push("Abstract doesn't mention contributions, implications, or significance.");

  return { wordCount: words, sentences: sentences.length, checks, passCount, issues };
}

// ============================================================
// Intelligence Rule 5 — Conclusion Completeness Check
// Conclusions must address specific elements.
// A conclusion that just summarizes is weak.
// ============================================================

export interface ConclusionAudit {
  checks: {
    hasSummary: boolean;
    hasContribution: boolean;
    hasLimitations: boolean;
    hasFutureWork: boolean;
    hasImpact: boolean;
  };
  passCount: number;
  issues: string[];
}

export function auditConclusion(conclusionBody: string): ConclusionAudit {
  const text = conclusionBody || '';

  const checks = {
    hasSummary: /\b(this (thesis|study|work|research|dissertation|project) (has|have|presented|investigated|examined|explored|described|shown|demonstrated))\b/i.test(text),
    hasContribution: /\b(contribut|novel|new|original|proposed|introduced|developed|innovative)\b/i.test(text),
    hasLimitations: /\b(limitation|constraint|shortcoming|caveat|assumption|restrict|bound|weakness)\b/i.test(text),
    hasFutureWork: /\b(future (work|research|study|direction)|further (research|work|study|investigation)|next step|future study|ongoing)\b/i.test(text),
    hasImpact: /\b(practical|theor|implicat|application|recommend|benefit|significance|value|useful)\b/i.test(text),
  };

  const passCount = Object.values(checks).filter(Boolean).length;

  const issues: string[] = [];
  if (!checks.hasSummary) issues.push("Conclusion doesn't summarize what was done in this work.");
  if (!checks.hasContribution) issues.push("Conclusion doesn't state the key contribution(s).");
  if (!checks.hasLimitations) issues.push("Conclusion doesn't acknowledge limitations.");
  if (!checks.hasFutureWork) issues.push("Conclusion doesn't suggest future work or directions.");
  if (!checks.hasImpact) issues.push("Conclusion doesn't discuss practical or theoretical impact.");

  return { checks, passCount, issues };
}

// ============================================================
// Intelligence Rule 6 — Chapter Word Count Check
// Ensure chapters meet minimum academic standards.
// ============================================================

export interface ChapterWordCountResult {
  chapterId: string;
  chapterTitle: string;
  wordCount: number;
  status: 'ok' | 'thin' | 'empty' | 'missing';
}

const MIN_WORDS_PER_CHAPTER: Record<string, number> = {
  introduction: 300,
  background: 500,
  'literature review': 800,
  methodology: 600,
  'research methodology': 1000,
  methods: 300,
  results: 500,
  discussion: 400,
  conclusion: 300,
  'conclusion and future work': 500,
};

export function checkChapterWordCounts(chapters: ThesisChapter[]): ChapterWordCountResult[] {
  return chapters.map(ch => {
    const body = ch.content || '';
    const wordCount = countWords(body);
    const titleLower = ch.title.toLowerCase();

    // Find minimum word count by matching title keywords
    let minWords = 200; // Default minimum
    for (const [keyword, min] of Object.entries(MIN_WORDS_PER_CHAPTER)) {
      if (titleLower.includes(keyword)) {
        minWords = min;
        break;
      }
    }

    let status: ChapterWordCountResult['status'] = 'ok';
    if (wordCount === 0) {
      status = 'empty';
    } else if (wordCount < minWords) {
      status = 'thin';
    }

    return {
      chapterId: ch.id,
      chapterTitle: ch.title,
      wordCount,
      status,
    };
  });
}

// ============================================================
// Intelligence Rule 7 — Structure Balance Analysis
// Check if the thesis is well-balanced across chapters.
// ============================================================

export interface StructureBalance {
  totalWords: number;
  chapterBreakdown: Array<{
    title: string;
    words: number;
    percentage: number;
  }>;
  imbalanceWarnings: string[];
}

export function analyzeStructureBalance(chapters: ThesisChapter[]): StructureBalance {
  const breakdown = chapters.map(ch => ({
    title: ch.title,
    words: countWords(ch.content || ''),
  }));

  const totalWords = breakdown.reduce((sum, ch) => sum + ch.words, 0);

  const percentages = breakdown.map(ch => ({
    title: ch.title,
    words: ch.words,
    percentage: totalWords > 0 ? Math.round((ch.words / totalWords) * 100) : 0,
  }));

  // Flag imbalances: any chapter > 40% or < 5% of total (if thesis has content)
  const imbalanceWarnings: string[] = [];
  if (totalWords > 1000) {
    for (const ch of percentages) {
      if (ch.percentage > 40) {
        imbalanceWarnings.push(`"${ch.title}" is ${ch.percentage}% of the thesis (${ch.words} words). Consider splitting.`);
      } else if (ch.percentage < 3 && ch.words > 0) {
        imbalanceWarnings.push(`"${ch.title}" is only ${ch.percentage}% of the thesis (${ch.words} words). Consider expanding or merging.`);
      }
    }
  }

  return { totalWords, chapterBreakdown: percentages, imbalanceWarnings };
}

// ============================================================
// Utility — Word Counter
// ============================================================

export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  // Remove LaTeX commands for accurate word count
  const stripped = text
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')  // Remove \command{arg}
    .replace(/\\[a-zA-Z]+/g, '')             // Remove \command
    .replace(/[{}\\$#_^~&%]/g, '')           // Remove LaTeX special chars
    .replace(/\[[^\]]*\]/g, '')              // Remove [options]
    .trim();

  return stripped.split(/\s+/).filter(w => w.length > 0).length;
}

// ============================================================
// Run All Intelligence Rules
// Aggregates all checks into a single call.
// ============================================================

export interface IntelligenceReport {
  crossRefs: CrossRefResult;
  orphans: OrphanSection[];
  citationDensity: CitationDensityResult[];
  abstractAudit: AbstractAudit | null;
  conclusionAudit: ConclusionAudit | null;
  chapterWordCounts: ChapterWordCountResult[];
  structureBalance: StructureBalance;
}

export async function runIntelligence(data: ThesisData): Promise<IntelligenceReport> {
  // We need the .tex output for cross-reference validation
  let tex = '';
  try {
    // Dynamic import to avoid circular dependency
    const { generateLatexFromAST } = await import('@/core/ast-builder');
    tex = generateLatexFromAST(data);
  } catch {
    // If generation fails, run what we can
  }

  // Find the abstract chapter
  const abstractText = data.abstract || '';

  // Find the conclusion chapter
  const conclusionCh = data.chapters.find(ch => /conclusion/i.test(ch.title));
  const conclusionText = conclusionCh?.content || '';

  return {
    crossRefs: tex ? validateCrossReferences(tex) : {
      defined: new Set(),
      undefined: [],
      unused: [],
      totalLabels: 0,
      totalRefs: 0,
    },
    orphans: detectOrphanSections(data.chapters),
    citationDensity: checkCitationDensity(data.chapters),
    abstractAudit: abstractText ? auditAbstract(abstractText) : null,
    conclusionAudit: conclusionText ? auditConclusion(conclusionText) : null,
    chapterWordCounts: checkChapterWordCounts(data.chapters),
    structureBalance: analyzeStructureBalance(data.chapters),
  };
}
