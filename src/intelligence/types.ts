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
  _confidence: Record<string, number>;
  _parseScore: number;
}

// --- Algorithm 2: Deduplicator ---
export interface DuplicatePair {
  indexA: number;
  indexB: number;
  score: number;
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
  balanceScore: number | null;
}

// --- Algorithm 4: Keyword Extractor ---
// Returns string[] of keywords

// --- Algorithm 5: Citation Graph ---
export interface CitationGraphResult {
  citedKeys: Set<string>;
  definedKeys: Set<string>;
  undefinedCitations: string[];
  uncitedReferences: string[];
  totalCitations: number;
  totalReferences: number;
  citationRatio: number;
}

// --- Algorithm 6: Completeness Scorer ---
export interface RubricItem {
  field: string;
  weight: number;
  label: string;
  achieved: boolean;
}

export interface CompletenessResult {
  score: number;
  earned: number;
  possible: number;
  breakdown: RubricItem[];
  level: 'ready' | 'almost' | 'in-progress' | 'early';
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
export interface ChapterReadingStats {
  chapterId: string;
  chapterTitle: string;
  words: number;
  readingTime: number;
  sentences: number;
  avgSentenceLength: number;
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
