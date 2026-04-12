// ============================================================
// ThesisForge Intelligence — Shared Types
// All algorithms live here, isolated from the FSM and UI layers.
// Each module exports a pure function: input → result object.
// ============================================================

export type IssueSeverity = 'error' | 'warning' | 'suggestion' | 'info';

export interface IntelligenceIssue {
  algorithmId: string;
  severity: IssueSeverity;
  message: string;
  action?: string;
  actionHandler?: string;
  data?: Record<string, unknown>;
}

// --- Algorithm 1: Citation Parser ---
export interface ParsedCitation {
  type: string;
  doi?: string;
  url?: string;
  year?: string;
  author?: string;
  title?: string;
  journal?: string;
  bookTitle?: string;
  volume?: string;
  number?: string;
  pages?: string;
  school?: string;
  accessed?: string;
  eprint?: string;
  eprinttype?: string;
  crossRef?: string;
  _confidence: Record<string, number>;
  _parseScore: number;
  _warningFields: string[];
}

// --- Algorithm 2: Deduplicator ---
export interface DuplicatePair {
  indexA: number;
  indexB: number;
  score: number;
  reason: string;
}

export interface MergeSuggestion {
  indexA: number;
  indexB: number;
  score: number;
  suggestedTarget: number;
  reason: string;
}

// --- Algorithm 3: Structure Analyzer ---
export interface StructureIssue {
  chapterId: string;
  chapterTitle: string;
  actualPct: number;
  idealPct: number;
  direction: 'over' | 'under';
  severity: 'high' | 'medium';
  words: number;
}

export interface StructureAnalysis {
  totalWords: number;
  wordCounts: Array<{ id: string; title: string; words: number }>;
  issues: StructureIssue[];
  suggestions: string[];
  balanceScore: number | null;
  imradScore: number;
  denseParagraphs: Array<{
    chapterId: string;
    chapterTitle: string;
    paragraphIndex: number;
    wordCount: number;
  }>;
}

// --- Algorithm 4: Keyword Extractor ---
export interface CrossCheckResult {
  extractedKeywords: string[];
  userKeywords: string[];
  suggestedAdditions: string[];
  irrelevantEntries: string[];
  alignmentScore: number;
}

// --- Algorithm 5: Citation Graph ---
export interface CitationGraphResult {
  citedKeys: Set<string>;
  definedKeys: Set<string>;
  undefinedCitations: string[];
  uncitedReferences: string[];
  totalCitations: number;
  totalReferences: number;
  citationRatio: number;
  perChapterCitations: Map<string, number>;
  chaptersWithoutCitations: string[];
  citationClusters: Array<{
    referenceKey: string;
    chapterIds: string[];
    count: number;
  }>;
  exportAsDot(): string;
}

// --- Algorithm 6: Completeness Scorer ---
export interface RubricItem {
  field: string;
  weight: number;
  label: string;
  achieved: boolean;
}

export interface SubScores {
  metadata: number;
  content: number;
  references: number;
  formatting: number;
  advanced: number;
}

export interface RadarDataPoint {
  axis: string;
  value: number;
}

export interface CompletenessResult {
  score: number;
  earned: number;
  possible: number;
  breakdown: RubricItem[];
  nextAction: {
    field: string;
    label: string;
    weight: number;
    action: string;
  } | null;
  level: 'ready' | 'almost' | 'in-progress' | 'early';
  subScores: SubScores;
  radarData: RadarDataPoint[];
}

// --- Algorithm 7: LaTeX Heuristics ---
export interface HeuristicFinding {
  ruleId: string;
  severity: IssueSeverity;
  offset: number;
  length: number;
  original: string;
  message: string;
  fix: string | null;
}

// --- Algorithm 8: Reading Stats ---
export interface LongSentenceInfo {
  text: string;
  position: number;
  suggestion: string;
}

export interface ChapterReadingStats {
  chapterId: string;
  chapterTitle: string;
  words: number;
  readingTime: number;
  sentences: number;
  avgSentenceLength: number;
  fleschKincaid: number;
  gunningFog: number;
  passiveVoicePct: number;
  longSentences: LongSentenceInfo[];
}

export interface ReadingStatsResult {
  chapters: ChapterReadingStats[];
  total: {
    words: number;
    readingTime: number;
    abstractWords: number;
    abstractStatus: 'too short' | 'too long' | 'good';
  };
  longSentenceChapters: string[];
}

// --- Scheduler ---
export interface AlgorithmSchedule {
  steps: number[];
  debounce: number;
  priority: number;
}

export type AlgorithmId =
  | 'citationParser'
  | 'deduplicator'
  | 'structureAnalyzer'
  | 'keywordExtractor'
  | 'citationGraph'
  | 'completenessScorer'
  | 'latexHeuristics'
  | 'readingStats';

export interface CircuitBreakerState {
  failures: number;
  disabled: boolean;
  reason?: string;
}
