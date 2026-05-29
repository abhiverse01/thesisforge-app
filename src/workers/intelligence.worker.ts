// ============================================================
// ThesisForge — Intelligence Web Worker
// Executes all heavy analysis algorithms off the main thread.
// Pure functions, no DOM, no Zustand.
// ============================================================

// ── Global error handler ────────────────────────────────────────
// In restricted environments (e.g., Vercel preview deployments), the
// bundler may generate importScripts() calls that fail due to CORS /
// network restrictions.  Without this handler the worker crashes with
// an uncaught error and never processes any messages.  With it, the
// error is caught, logged as a warning, and the worker stays alive so
// it can still handle messages (with whatever modules did load).
self.onerror = ((e: ErrorEvent) => {
  console.warn('[intelligence.worker] Uncaught error, degrading gracefully:', e.message);
  e.preventDefault(); // Prevent the error from propagating as unhandled
}) as unknown as OnErrorEventHandler;

import type { ThesisData } from '@/lib/thesis-types';

// ── Serialization utility ──────────────────────────────────────
// postMessage uses the structured-clone algorithm which does NOT
// support functions.  Any algorithm that returns a function
// property (e.g. CitationGraphResult.exportAsDot) will trigger a
// DataCloneError.  This helper recursively strips function values
// while preserving Map, Set, Array, Date, RegExp, etc.
function stripFunctions<T>(value: unknown): T {
  if (value === null || value === undefined) return value as T;
  if (typeof value === 'function') return undefined as unknown as T;
  if (typeof value !== 'object') return value as T;

  if (Array.isArray(value)) {
    return value.map(stripFunctions) as unknown as T;
  }

  if (value instanceof Map) {
    const m = new Map();
    for (const [k, v] of value.entries()) m.set(k, stripFunctions(v));
    return m as unknown as T;
  }

  if (value instanceof Set) {
    const s = new Set();
    for (const v of value.values()) s.add(stripFunctions(v));
    return s as unknown as T;
  }

  // Plain object – copy own enumerable props, skip functions
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as object)) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === 'function') continue;
    out[key] = stripFunctions(v);
  }
  return out as unknown as T;
}

import type {
  CompletenessResult,
  ReadingStatsResult,
  StructureAnalysis,
  CrossCheckResult,
  CitationGraphResult,
  DuplicatePair,
  MergeSuggestion,
  HeuristicFinding,
  PassiveVoiceResult,
  TransitionResult,
  AcronymIssue,
  CircuitBreakerState,
  ReadabilityResult,
  SentenceLengthResult,
  SectionBalanceResult,
} from '@/intelligence/types';
import type { STGResult } from '@/intelligence/semanticGraph';
import type { CoachResult } from '@/intelligence/writingCoach';

import { buildSemanticGraph } from '@/intelligence/semanticGraph';
import { analyzeStructure } from '@/intelligence/structureAnalyzer';
import { detectDuplicatesWithMerge } from '@/intelligence/deduplicator';
import { runHeuristics } from '@/intelligence/latexHeuristics';
import { extractKeywords, crossCheckKeywords } from '@/intelligence/keywordExtractor';
import { scoreCompleteness } from '@/intelligence/completenessScorer';
import { computeReadingStats } from '@/intelligence/readingStats';
import { buildCitationGraph } from '@/intelligence/citationGraph';
import { computeReadability } from '@/intelligence/readabilityScorer';
import { analyzeSentenceLengths } from '@/intelligence/sentenceLengthAnalyzer';
import { checkSectionBalance } from '@/intelligence/sectionBalanceChecker';

// ── Local IntelligenceResults interface (mirrors scheduler.ts) ──
interface IntelligenceResults {
  completeness: CompletenessResult | null;
  readingStats: ReadingStatsResult | null;
  structure: StructureAnalysis | null;
  keywords: string[];
  crossCheck: CrossCheckResult | null;
  citationGraph: CitationGraphResult | null;
  duplicates: DuplicatePair[];
  mergeSuggestions: MergeSuggestion[];
  heuristics: Map<string, HeuristicFinding[]>;
  passiveVoice: PassiveVoiceResult[] | null;
  transitions: TransitionResult[] | null;
  acronyms: AcronymIssue[] | null;
  semanticGraph: STGResult | null;
  writingCoach: CoachResult | null;
 readability: ReadabilityResult | null;
  sentenceLength: SentenceLengthResult | null;
  sectionBalance: SectionBalanceResult | null;
  circuitBreaker: Map<string, CircuitBreakerState>;
}

self.onmessage = (e: MessageEvent<{ thesis: ThesisData; templateId: string; sequence?: number }>) => {
  const { thesis, templateId, sequence } = e.data;

  const results: IntelligenceResults = {
    completeness: null,
    readingStats: null,
    structure: null,
    keywords: [],
    crossCheck: null,
    citationGraph: null,
    duplicates: [],
    mergeSuggestions: [],
    heuristics: new Map(),
    passiveVoice: null,
    transitions: null,
    acronyms: null,
    semanticGraph: null,
    writingCoach: null,
    readability: null,
    sentenceLength: null,
    sectionBalance: null,
    circuitBreaker: new Map(),
  };

  try {
    // Lightweight computations
    results.completeness = scoreCompleteness(thesis, templateId as any);
    results.readingStats = computeReadingStats(thesis.chapters, thesis.abstract);
    results.structure = analyzeStructure(thesis.chapters, templateId as any);
    results.keywords = extractKeywords(thesis.chapters);
    if (thesis.keywords?.length) {
      results.crossCheck = crossCheckKeywords(thesis.chapters, thesis.keywords);
    }
    results.citationGraph = buildCitationGraph(thesis.chapters, thesis.references);

    const { duplicates, mergeSuggestions } = detectDuplicatesWithMerge(thesis.references);
    results.duplicates = duplicates;
    results.mergeSuggestions = mergeSuggestions;

    results.heuristics = new Map();
    for (const ch of thesis.chapters) {
      const fullText = [ch.content || '', ...(ch.subSections || []).map(ss => ss.content || '')].join(' ');
      if (fullText.trim()) {
        results.heuristics.set(ch.id, runHeuristics(fullText));
      }
    }

    // Heavy: semantic graph
    results.semanticGraph = buildSemanticGraph(thesis);

    // Heavy: Phase 2b algorithms
    const chapterInputs = thesis.chapters.map(ch => ({ id: ch.id, title: ch.title, body: ch.content || '' }));
    results.readability = computeReadability(chapterInputs);
    results.sentenceLength = analyzeSentenceLengths(chapterInputs);
    results.sectionBalance = checkSectionBalance(chapterInputs);
  } catch (err) {
    // One or more algorithms threw — return whatever partial results
    // were computed so the main thread is never left waiting forever.
    console.warn('[intelligence.worker] Computation error, returning partial results:', err);
  }

  // Post results back to main thread (partial if error occurred).
  // stripFunctions removes function properties (e.g. exportAsDot)
  // that would cause a DataCloneError with structured-clone.
  (self as any).postMessage({ type: 'results', results: stripFunctions(results), sequence });
};
