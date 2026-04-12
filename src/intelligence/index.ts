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
  // Level 2 re-exports
  STGResult,
  STGNode,
  STGEdge,
  CoachSuggestion,
  CoachResult,
  TimelinePlan,
  ChapterPlan,
  Milestone,
  RiskLevel,
  SimulationResultType,
  AnnotationType,
  AnnotationSummary,
  CompilerTarget,
  CompilerTargetConfig,
  ThesisMemoryState,
  MemoryInsight,
  SessionSummary,
  WritingVelocity,
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
export { buildSemanticGraph } from './semanticGraph';
export { runWritingCoach } from './writingCoach';
export {
  IntelligenceScheduler,
  intelligenceScheduler,
  ALGORITHM_SCHEDULE,
} from './scheduler';
export type { IntelligenceResults } from './scheduler';
