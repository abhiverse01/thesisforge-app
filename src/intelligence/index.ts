// ============================================================
// ThesisForge Intelligence — Barrel Export
// ============================================================

export type {
  // Used by intelligence-panel.tsx
  CompletenessResult,
  HeuristicFinding,
  // Level 2 re-exports (consumed by scheduler internally)
  STGResult,
  CoachResult,
  SimulationResultType,
  // Algorithm results (consumed by scheduler)
  PassiveVoiceResult,
  TransitionResult,
  AcronymIssue,
  // Phase 2b algorithm results
  ReadabilityResult,
  SentenceLengthResult,
  SectionBalanceResult,
} from './types';

export { parseCitationText } from './citationParser';
export { detectDuplicates, detectDuplicatesWithMerge } from './deduplicator';
export { analyzeStructure, countWords } from './structureAnalyzer';
export { extractKeywords, crossCheckKeywords } from './keywordExtractor';
export { buildCitationGraph } from './citationGraph';
export { scoreCompleteness } from './completenessScorer';
export {
  runHeuristics,
  applyAllHeuristicFixes,
} from './latexHeuristics';
export { computeReadingStats } from './readingStats';
export { buildSemanticGraph } from './semanticGraph';
export { runWritingCoach } from './writingCoach';
export { detectPassiveVoice } from './passiveVoiceDetector';
export { analyzeTransitions } from './transitionAnalyzer';
export { checkAcronyms } from './acronymChecker';
export { computeReadability } from './readabilityScorer';
export { analyzeSentenceLengths } from './sentenceLengthAnalyzer';
export { checkSectionBalance } from './sectionBalanceChecker';
export {
  analyzeLatexExpert,
  formatExpertSummary,
} from './latexExpertAnalyzer';
export type {
  ExpertIssue,
  ExpertResult,
  ExpertSeverity,
  ExpertCategory,
} from './latexExpertAnalyzer';
export {
  IntelligenceScheduler,
  intelligenceScheduler,
  ALGORITHM_SCHEDULE,
} from './scheduler';
export type { IntelligenceResults } from './scheduler';
export {
  buildMemoryState,
  computeVelocity,
  generateInsights,
} from './thesisMemory';
export { assessChapterHealth } from './readingStats';
export type { ChapterHealth } from './readingStats';
export { deduplicateCiteKeys } from './citationGraph';
