// ============================================================
// ThesisForge Intelligence — Barrel Export
// ============================================================

export type {
  IssueSeverity,
  IntelligenceIssue,
  ParsedCitation,
  DuplicatePair,
  StructureIssue,
  StructureAnalysis,
  CompletenessResult,
  RubricItem,
  HeuristicFinding,
  ChapterReadingStats,
  ReadingStatsResult,
  CitationGraphResult,
  AlgorithmSchedule,
  AlgorithmId,
} from './types';

export { parseCitationText } from './citationParser';
export { jaroWinkler, detectDuplicates } from './deduplicator';
export { analyzeStructure, countWords } from './structureAnalyzer';
export { extractKeywords } from './keywordExtractor';
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
