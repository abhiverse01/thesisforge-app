// ============================================================
// ThesisForge Intelligence — Scheduler & Unified Runner
// Orchestrates all 8 algorithms with step-aware scheduling,
// debouncing, and requestIdleCallback for non-blocking execution.
// ============================================================

import type { ThesisData, ThesisType, ThesisChapter, ThesisReference } from '@/lib/thesis-types';
import type {
  AlgorithmId,
  AlgorithmSchedule,
  CompletenessResult,
  DuplicatePair,
  HeuristicFinding,
  ParsedCitation,
  ReadingStatsResult,
  StructureAnalysis,
  CitationGraphResult,
} from './types';
import { parseCitationText } from './citationParser';
import { detectDuplicates } from './deduplicator';
import { analyzeStructure } from './structureAnalyzer';
import { extractKeywords } from './keywordExtractor';
import { buildCitationGraph } from './citationGraph';
import { scoreCompleteness } from './completenessScorer';
import { runHeuristics } from './latexHeuristics';
import { computeReadingStats } from './readingStats';

// ============================================================
// Schedule Configuration
// Which steps trigger which algorithms, and how long to debounce.
// ============================================================

export const ALGORITHM_SCHEDULE: Record<AlgorithmId, AlgorithmSchedule> = {
  citationParser:     { steps: [4],             debounce: 500 },
  deduplicator:       { steps: [4],             debounce: 1000 },
  structureAnalyzer:  { steps: [3, 6],          debounce: 1500 },
  keywordExtractor:   { steps: [3, 6],          debounce: 2000 },
  citationGraph:      { steps: [3, 4, 6],       debounce: 800 },
  completenessScorer: { steps: [1, 2, 3, 4, 5, 6], debounce: 300 },
  latexHeuristics:    { steps: [3],             debounce: 800 },
  readingStats:       { steps: [3, 6],          debounce: 500 },
};

// ============================================================
// Result Types — Unified interface for all algorithm outputs
// ============================================================

export interface IntelligenceResults {
  completeness: CompletenessResult | null;
  readingStats: ReadingStatsResult | null;
  structure: StructureAnalysis | null;
  keywords: string[];
  citationGraph: CitationGraphResult | null;
  duplicates: DuplicatePair[];
  heuristics: Map<string, HeuristicFinding[]>;
}

// ============================================================
// Scheduler — Debounced, idle-aware algorithm execution
// ============================================================

type ResultCallback = (results: IntelligenceResults) => void;

const DEFAULT_RESULTS: IntelligenceResults = {
  completeness: null,
  readingStats: null,
  structure: null,
  keywords: [],
  citationGraph: null,
  duplicates: [],
  heuristics: new Map(),
};

/**
 * Run a single algorithm via requestIdleCallback (or setTimeout fallback).
 */
function runIdle(fn: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => fn(), { timeout: 50 });
  } else {
    setTimeout(fn, 0);
  }
}

/**
 * Create a debounced version of a function.
 */
function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

/**
 * Intelligence Scheduler class.
 * Orchestrates all algorithms with step-aware scheduling.
 * Call `scheduleRun(step)` when the wizard step changes.
 * Call `scheduleAlgorithm(algorithmId)` to trigger a specific algorithm.
 */
export class IntelligenceScheduler {
  private thesis: ThesisData | null = null;
  private templateId: ThesisType = 'bachelor';
  private results: IntelligenceResults = { ...DEFAULT_RESULTS, heuristics: new Map() };
  private callback: ResultCallback | null = null;
  private debouncers: Map<AlgorithmId, () => void> = new Map();

  /**
   * Initialize the scheduler with a callback for results.
   */
  init(callback: ResultCallback): void {
    this.callback = callback;
    // Initialize debounced runners for each algorithm
    for (const [id, schedule] of Object.entries(ALGORITHM_SCHEDULE)) {
      const algoId = id as AlgorithmId;
      this.debouncers.set(
        algoId,
        debounce(() => this.executeAlgorithm(algoId), schedule.debounce)
      );
    }
  }

  /**
   * Update thesis data reference.
   */
  updateData(thesis: ThesisData | null, templateId: ThesisType): void {
    this.thesis = thesis;
    this.templateId = templateId;
  }

  /**
   * Schedule all algorithms that should run for a given wizard step.
   */
  scheduleRun(step: number): void {
    for (const [id, schedule] of Object.entries(ALGORITHM_SCHEDULE)) {
      if (schedule.steps.includes(step)) {
        const algoId = id as AlgorithmId;
        const debounced = this.debouncers.get(algoId);
        if (debounced) debounced();
      }
    }
  }

  /**
   * Schedule a specific algorithm to run.
   */
  scheduleAlgorithm(algorithmId: AlgorithmId): void {
    const debounced = this.debouncers.get(algorithmId);
    if (debounced) debounced();
  }

  /**
   * Execute a specific algorithm and update results.
   */
  private executeAlgorithm(algorithmId: AlgorithmId): void {
    const thesis = this.thesis;
    if (!thesis) return;

    runIdle(() => {
      switch (algorithmId) {
        case 'completenessScorer':
          this.results.completeness = scoreCompleteness(
            thesis,
            this.templateId
          );
          break;

        case 'readingStats':
          this.results.readingStats = computeReadingStats(
            thesis.chapters,
            thesis.abstract
          );
          break;

        case 'structureAnalyzer':
          this.results.structure = analyzeStructure(
            thesis.chapters,
            this.templateId
          );
          break;

        case 'keywordExtractor':
          this.results.keywords = extractKeywords(thesis.chapters);
          break;

        case 'citationGraph':
          this.results.citationGraph = buildCitationGraph(
            thesis.chapters,
            thesis.references
          );
          break;

        case 'deduplicator':
          this.results.duplicates = detectDuplicates(thesis.references);
          break;

        case 'latexHeuristics':
          this.results.heuristics = new Map();
          for (const ch of thesis.chapters) {
            const fullText = [
              ch.content || '',
              ...(ch.subSections || []).map((ss) => ss.content || ''),
            ].join(' ');
            if (fullText.trim()) {
              this.results.heuristics.set(ch.id, runHeuristics(fullText));
            }
          }
          break;

        case 'citationParser':
          // Citation parser is on-demand, not auto-scheduled
          break;
      }

      if (this.callback) {
        this.callback({ ...this.results, heuristics: new Map(this.results.heuristics) });
      }
    });
  }

  /**
   * Run citation parser on-demand (not auto-scheduled).
   */
  parseCitation(raw: string): ParsedCitation {
    return parseCitationText(raw);
  }

  /**
   * Get current results (synchronous).
   */
  getResults(): IntelligenceResults {
    return this.results;
  }

  /**
   * Dispose of all debouncers.
   */
  dispose(): void {
    this.debouncers.clear();
    this.callback = null;
  }
}

// Singleton instance for app-wide use
export const intelligenceScheduler = new IntelligenceScheduler();
