// ============================================================
// ThesisForge Intelligence — Scheduler & Unified Runner
// Orchestrates all 8 algorithms with step-aware scheduling,
// debouncing, priority queuing, and circuit breaker protection.
// ============================================================

import type { ThesisData, ThesisType, ThesisChapter, ThesisReference } from '@/lib/thesis-types';
import type {
  AlgorithmId,
  AlgorithmSchedule,
  CircuitBreakerState,
  CompletenessResult,
  DuplicatePair,
  HeuristicFinding,
  MergeSuggestion,
  ParsedCitation,
  ReadingStatsResult,
  StructureAnalysis,
  CitationGraphResult,
  CrossCheckResult,
} from './types';
import { parseCitationText } from './citationParser';
import { detectDuplicates, detectDuplicatesWithMerge } from './deduplicator';
import { analyzeStructure } from './structureAnalyzer';
import { extractKeywords, crossCheckKeywords } from './keywordExtractor';
import { buildCitationGraph } from './citationGraph';
import { scoreCompleteness } from './completenessScorer';
import { runHeuristics } from './latexHeuristics';
import { computeReadingStats } from './readingStats';

// ============================================================
// Schedule Configuration
// Which steps trigger which algorithms, debounce times, and priority.
// Priority: 1 = highest (Completeness), 2 = high (CitationGraph), 3 = normal (Structure), 4 = others
// ============================================================

export const ALGORITHM_SCHEDULE: Record<AlgorithmId, AlgorithmSchedule> = {
  completenessScorer: { steps: [1, 2, 3, 4, 5, 6], debounce: 300,  priority: 1 },
  citationGraph:      { steps: [3, 4, 6],           debounce: 800,  priority: 2 },
  structureAnalyzer:  { steps: [3, 6],              debounce: 1500, priority: 3 },
  citationParser:     { steps: [4],                 debounce: 500,  priority: 4 },
  deduplicator:       { steps: [4],                 debounce: 1000, priority: 4 },
  keywordExtractor:   { steps: [3, 6],              debounce: 2000, priority: 4 },
  latexHeuristics:    { steps: [3],                 debounce: 800,  priority: 4 },
  readingStats:       { steps: [3, 6],              debounce: 500,  priority: 4 },
};

// ============================================================
// Circuit Breaker Configuration
// ============================================================

/** Max consecutive failures before an algorithm is disabled. */
const CIRCUIT_BREAKER_THRESHOLD = 3;

// ============================================================
// Result Types — Unified interface for all algorithm outputs
// ============================================================

export interface IntelligenceResults {
  completeness: CompletenessResult | null;
  readingStats: ReadingStatsResult | null;
  structure: StructureAnalysis | null;
  keywords: string[];
  crossCheck: CrossCheckResult | null;
  citationGraph: CitationGraphResult | null;
  duplicates: DuplicatePair[];
  mergeSuggestions: MergeSuggestion[];
  heuristics: Map<string, HeuristicFinding[]>;
  circuitBreaker: Map<AlgorithmId, CircuitBreakerState>;
}

// ============================================================
// Scheduler — Debounced, priority-aware, circuit-breaker execution
// ============================================================

type ResultCallback = (results: IntelligenceResults) => void;

const DEFAULT_RESULTS: IntelligenceResults = {
  completeness: null,
  readingStats: null,
  structure: null,
  keywords: [],
  crossCheck: null,
  citationGraph: null,
  duplicates: [],
  mergeSuggestions: [],
  heuristics: new Map(),
  circuitBreaker: new Map(),
};

/**
 * Create a debounced version of a function.
 * Pure utility — no side effects beyond the timer.
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
 * Orchestrates all algorithms with step-aware scheduling,
 * priority queuing, and circuit breaker protection.
 *
 * Call `scheduleRun(step)` when the wizard step changes.
 * Call `scheduleAlgorithm(algorithmId)` to trigger a specific algorithm.
 * Call `runAllForced()` at export time to bypass circuit breakers.
 */
export class IntelligenceScheduler {
  private thesis: ThesisData | null = null;
  private templateId: ThesisType = 'bachelor';
  private results: IntelligenceResults = {
    ...DEFAULT_RESULTS,
    heuristics: new Map(),
    circuitBreaker: new Map(),
  };
  private callback: ResultCallback | null = null;
  private debouncers: Map<AlgorithmId, () => void> = new Map();
  private circuitBreaker: Map<AlgorithmId, CircuitBreakerState> = new Map();
  private pendingTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private disposed = false;

  /**
   * Initialize the scheduler with a callback for results.
   */
  init(callback: ResultCallback): void {
    this.callback = callback;
    this.disposed = false;
    // Reset results on re-init to avoid stale state
    this.results = {
      ...DEFAULT_RESULTS,
      heuristics: new Map(),
      circuitBreaker: new Map(),
    };
    // Initialize circuit breaker state for each algorithm
    for (const id of Object.keys(ALGORITHM_SCHEDULE) as AlgorithmId[]) {
      this.circuitBreaker.set(id, { failures: 0, disabled: false });
    }
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
   * Runs algorithms in priority order (lower number = higher priority).
   */
  scheduleRun(step: number): void {
    // Collect algorithms that should run, sorted by priority
    const toSchedule: Array<{ id: AlgorithmId; schedule: AlgorithmSchedule }> = [];
    for (const [id, schedule] of Object.entries(ALGORITHM_SCHEDULE)) {
      if (schedule.steps.includes(step)) {
        toSchedule.push({ id: id as AlgorithmId, schedule });
      }
    }

    // Sort by priority (1 = highest priority)
    toSchedule.sort((a, b) => a.schedule.priority - b.schedule.priority);

    // Schedule each algorithm with a slight delay based on priority tier
    // Higher priority algorithms get scheduled first
    for (const { id } of toSchedule) {
      const debounced = this.debouncers.get(id);
      if (debounced) {
        // Add a micro-delay based on priority so higher priority algorithms start first
        const priority = ALGORITHM_SCHEDULE[id].priority;
        const tierDelay = (priority - 1) * 50; // 0ms, 50ms, 100ms, 150ms
        const timerId = setTimeout(() => {
          if (!this.disposed) debounced();
          this.pendingTimeouts.delete(`schedule_${id}`);
        }, tierDelay);
        this.pendingTimeouts.set(`schedule_${id}`, timerId);
      }
    }
  }

  /**
   * Schedule a specific algorithm to run.
   */
  scheduleAlgorithm(algorithmId: AlgorithmId): void {
    if (this.isDisabled(algorithmId)) return;
    const debounced = this.debouncers.get(algorithmId);
    if (debounced) debounced();
  }

  /**
   * Check if an algorithm is disabled by the circuit breaker.
   */
  isDisabled(algorithmId: AlgorithmId): boolean {
    const state = this.circuitBreaker.get(algorithmId);
    return state?.disabled ?? false;
  }

  /**
   * Get the circuit breaker state for all algorithms.
   */
  getCircuitBreakerStates(): Map<AlgorithmId, CircuitBreakerState> {
    return new Map(this.circuitBreaker);
  }

  /**
   * Reset the circuit breaker for a specific algorithm.
   * Useful for manual retry after fixing an issue.
   */
  resetCircuitBreaker(algorithmId: AlgorithmId): void {
    this.circuitBreaker.set(algorithmId, { failures: 0, disabled: false });
  }

  /**
   * Reset all circuit breakers.
   */
  resetAllCircuitBreakers(): void {
    for (const id of Object.keys(ALGORITHM_SCHEDULE) as AlgorithmId[]) {
      this.circuitBreaker.set(id, { failures: 0, disabled: false });
    }
  }

  /**
   * Execute a specific algorithm and update results.
   * Protected by circuit breaker: 3 consecutive failures → disable.
   */
  private executeAlgorithm(algorithmId: AlgorithmId): void {
    const thesis = this.thesis;
    if (!thesis) return;

    // Circuit breaker check
    if (this.isDisabled(algorithmId)) return;

    try {
      this.executeAlgorithmUnsafe(algorithmId, thesis);

      // Success: reset failure count
      const state = this.circuitBreaker.get(algorithmId);
      if (state) {
        this.circuitBreaker.set(algorithmId, {
          failures: 0,
          disabled: false,
        });
      }

      this.notifyCallback();
    } catch (error) {
      // Record failure and update circuit breaker
      const state = this.circuitBreaker.get(algorithmId);
      if (state) {
        const newFailures = state.failures + 1;
        const disabled = newFailures >= CIRCUIT_BREAKER_THRESHOLD;
        this.circuitBreaker.set(algorithmId, {
          failures: newFailures,
          disabled,
          reason: disabled
            ? `Disabled after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures: ${error instanceof Error ? error.message : String(error)}`
            : undefined,
        });
      }
      // FIX: Notify callback on failure so UI can show degraded state
      this.notifyCallback();
    }
  }

  /**
   * Execute an algorithm without circuit breaker protection.
   * Used by runAllForced for export-time execution.
   */
  private executeAlgorithmUnsafe(algorithmId: AlgorithmId, thesis: ThesisData): void {
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
        // Also compute cross-check if keywords are defined
        if (thesis.keywords && thesis.keywords.length > 0) {
          this.results.crossCheck = crossCheckKeywords(
            thesis.chapters,
            thesis.keywords
          );
        }
        break;

      case 'citationGraph':
        this.results.citationGraph = buildCitationGraph(
          thesis.chapters,
          thesis.references
        );
        break;

      case 'deduplicator':
        {
          const dedupResult = detectDuplicatesWithMerge(thesis.references);
          this.results.duplicates = dedupResult.duplicates;
          this.results.mergeSuggestions = dedupResult.mergeSuggestions;
        }
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
  }

  /**
   * Run all algorithms synchronously, bypassing circuit breakers and debounce.
   * Designed for export-time execution where all algorithms must run.
   *
   * Returns the full IntelligenceResults with all algorithms executed.
   * Errors are caught per-algorithm and reported in circuitBreaker state,
   * but execution continues for remaining algorithms.
   */
  runAllForced(): IntelligenceResults {
    const thesis = this.thesis;
    if (!thesis) return { ...this.results, heuristics: new Map(this.results.heuristics), circuitBreaker: new Map(this.circuitBreaker) };

    // Reset all circuit breakers before forced run
    this.resetAllCircuitBreakers();

    // Execute all algorithms in priority order
    const sortedAlgorithms = (Object.keys(ALGORITHM_SCHEDULE) as AlgorithmId[])
      .sort((a, b) => ALGORITHM_SCHEDULE[a].priority - ALGORITHM_SCHEDULE[b].priority);

    for (const algoId of sortedAlgorithms) {
      try {
        this.executeAlgorithmUnsafe(algoId, thesis);
        this.circuitBreaker.set(algoId, { failures: 0, disabled: false });
      } catch (error) {
        this.circuitBreaker.set(algoId, {
          failures: 1,
          disabled: false,
          reason: `Export-time failure: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    this.notifyCallback();
    return {
      ...this.results,
      heuristics: new Map(this.results.heuristics),
      circuitBreaker: new Map(this.circuitBreaker),
    };
  }

  /**
   * Notify the callback with a snapshot of current results.
   */
  private notifyCallback(): void {
    if (this.callback) {
      this.callback({
        ...this.results,
        heuristics: new Map(this.results.heuristics),
        circuitBreaker: new Map(this.circuitBreaker),
      });
    }
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
    return {
      ...this.results,
      heuristics: new Map(this.results.heuristics),
      circuitBreaker: new Map(this.circuitBreaker),
    };
  }

  /**
   * Dispose of all debouncers.
   */
  dispose(): void {
    this.disposed = true;
    // Clear all pending timeouts to prevent post-dispose execution
    for (const [key, timerId] of this.pendingTimeouts) {
      clearTimeout(timerId);
    }
    this.pendingTimeouts.clear();
    this.debouncers.clear();
    this.callback = null;
  }
}

// Singleton instance for app-wide use
export const intelligenceScheduler = new IntelligenceScheduler();
