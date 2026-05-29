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
  suggestion?: string;
}

export interface StructuralWarning {
  type: 'orphan-section' | 'title-only-chapter';
  chapterId: string;
  chapterTitle: string;
  sectionTitle?: string;
  wordCount: number;
  message: string;
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
  structuralWarnings: StructuralWarning[];
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
  /** Generate a DOT-format graph string. Not available when results arrive via Web Worker (stripped for structured-clone). */
  exportAsDot?: () => string;
}

// --- Algorithm 6: Completeness Scorer ---
export interface CompletenessIssue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  chapterId?: string;
  chapterTitle?: string;
}

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
  issues: CompletenessIssue[];
  readyForExport: boolean;
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
  speakingTime: number;
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
    readingTimeMinutes: number;
    speakingTimeMinutes: number;
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
  | 'readingStats'
  | 'semanticThesisGraph'
  | 'writingCoach'
  | 'passiveVoice'
  | 'transitionAnalyzer'
  | 'acronymChecker'
  | 'readabilityScorer'
  | 'sentenceLengthAnalyzer'
  | 'sectionBalanceChecker';

export interface CircuitBreakerState {
  failures: number;
  disabled: boolean;
  reason?: string;
}

// --- Algorithm 14: Readability Scorer ---
export interface ReadabilityResult {
  overall: {
    readingEase: number;
    gradeLevel: number;
    status: 'easy' | 'moderate' | 'difficult' | 'very-difficult';
  };
  chapters: Array<{
    chapterId: string;
    chapterTitle: string;
    readingEase: number;
    gradeLevel: number;
    status: 'easy' | 'moderate' | 'difficult' | 'very-difficult';
    words: number;
    sentences: number;
    syllables: number;
  }>;
}

// --- Algorithm 15: Sentence Length Analyzer ---
export interface SentenceLengthResult {
  overall: {
    meanLength: number;
    stdDeviation: number;
    medianLength: number;
    longSentencePct: number;
    shortSentencePct: number;
    status: 'good' | 'warning' | 'concern';
  };
  chapters: Array<{
    chapterId: string;
    chapterTitle: string;
    meanLength: number;
    stdDeviation: number;
    longSentencePct: number;
    shortSentencePct: number;
    runOnFlag: boolean;
    choppyFlag: boolean;
    longestSentence: number;
  }>;
}

// --- Algorithm 16: Section Balance Checker ---
export interface SectionBalanceResult {
  issues: Array<{
    chapterId: string;
    chapterTitle: string;
    type: 'excessive-nesting' | 'single-subsection' | 'orphaned-section';
    message: string;
    severity: 'warning' | 'info';
  }>;
  stats: {
    totalSections: number;
    totalSubsections: number;
    maxNestingDepth: number;
    chaptersWithSingleSubsection: number;
    chaptersWithExcessiveNesting: number;
    orphanedSections: number;
  };
}

// Re-export types from new algorithm modules for convenience
export type { STGResult, STGNode, STGEdge } from './semanticGraph';
export type { CoachSuggestion, CoachResult } from './writingCoach';
export type { PassiveVoiceResult } from './passiveVoiceDetector';
export type { TransitionResult } from './transitionAnalyzer';
export type { AcronymIssue } from './acronymChecker';
export type { SimulationResult as SimulationResultType } from '../core/compilation-simulator';
export type { Annotation as AnnotationType, AnnotationSummary } from '../core/annotations';
export type { ThesisMemoryState, MemoryInsight, SessionSummary, WritingVelocity } from './thesisMemory';
