// ============================================================
// ThesisForge Intelligence — Barrel Export
// ============================================================

export type {
  IssueSeverity,
  IntelligenceIssue,
  ParsedCitation,
  DuplicatePair,
  MergeSuggestion,
  StructureIssue,
  StructureAnalysis,
  CrossCheckResult,
  RubricItem,
  SubScores,
  RadarDataPoint,
  CompletenessResult,
  HeuristicFinding,
  ChapterReadingStats,
  LongSentenceInfo,
  ReadingStatsResult,
  CitationGraphResult,
  AlgorithmSchedule,
  AlgorithmId,
  CircuitBreakerState,
} from './types';

export { parseCitationText } from './citationParser';
export { jaroWinkler, detectDuplicates, detectDuplicatesWithMerge } from './deduplicator';
export { analyzeStructure, countWords } from './structureAnalyzer';
export { extractKeywords, crossCheckKeywords } from './keywordExtractor';
export { buildCitationGraph, deduplicateCiteKeys } from './citationGraph';
export { scoreCompleteness } from './completenessScorer';
export {
  runHeuristics,
  applyHeuristicFix,
  applyAllHeuristicFixes,
} from './latexHeuristics';
export { computeReadingStats } from './readingStats';
export {
  IntelligenceScheduler,
  intelligenceScheduler,
  ALGORITHM_SCHEDULE,
} from './scheduler';
export type { IntelligenceResults } from './scheduler';
