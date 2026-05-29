// ============================================================
// ThesisForge Intelligence — Scheduler & Unified Runner
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
  PassiveVoiceResult,
  TransitionResult,
  AcronymIssue,
  ReadabilityResult,
  SentenceLengthResult,
  SectionBalanceResult,
} from './types';

import {
  checkS01_IntroGap,
  checkS02_MethodJustification,
  checkS03_ResultsInterpretation,
  checkS04_DiscussionRQReference,
  checkS05_ConclusionNewRefs,
  checkA01_TransitionalClosing,
  checkA02_ClaimDensity,
  checkA03_StructuralMonotony,
  checkA04_LiteratureSynthesis,
  checkA05_ContributionEcho,
  checkC01_FirstAuthorOverReliance,
  checkC02_NoRecentCitations,
  checkC03_AuthorProminentOveruse,
  checkC04_SingleChapterFoundational,
  checkC05_SelfCitationCluster,
  checkL01_FirstPersonSingular,
  checkL02_HedgingOverload,
  checkL03_WeakNominalizations,
  checkL04_VagueQuantifiers,
  checkL05_TransitionOveruse,
  checkAS01_AbstractElements,
  checkAS02_KeywordsNotInAbstract,
  checkAS03_AcronymBeforeDefinition,
  checkAS04_NumbersBelowTen,
  checkAS05_InconsistentTense,
  calculateCoachScore,
} from './writingCoach';

import type { STGResult } from './semanticGraph';
import type { CoachResult } from './writingCoach';
import type { CoachSuggestion } from './writingCoach';

import { parseCitationText } from './citationParser';
import { detectDuplicates, detectDuplicatesWithMerge } from './deduplicator';
import { analyzeStructure } from './structureAnalyzer';
import { extractKeywords, crossCheckKeywords } from './keywordExtractor';
import { buildCitationGraph } from './citationGraph';
import { scoreCompleteness } from './completenessScorer';
import { runHeuristics } from './latexHeuristics';
import { computeReadingStats } from './readingStats';
import { buildSemanticGraph } from './semanticGraph';
import { runWritingCoach } from './writingCoach';
import { detectPassiveVoice } from './passiveVoiceDetector';
import { analyzeTransitions } from './transitionAnalyzer';
import { checkAcronyms } from './acronymChecker';
import { computeReadability } from './readabilityScorer';
import { analyzeSentenceLengths } from './sentenceLengthAnalyzer';
import { checkSectionBalance } from './sectionBalanceChecker';
import { generateCiteKey } from '@/core/bib';

export const ALGORITHM_PRIORITY: Record<string, 0 | 1 | 2 | 3> = {
  completenessScorer:  0,
  citationGraph:       1,
  latexHeuristics:     1,
  citationParser:      1,
  readingStats:        2,
  structureAnalyzer:   2,
  deduplicator:        2,
  semanticThesisGraph: 2,
  writingCoach:        2,
  passiveVoice:        3,
  transitionAnalyzer:  3,
  acronymChecker:        3,
  keywordExtractor:      3,
  readabilityScorer:     3,
  sentenceLengthAnalyzer: 3,
  sectionBalanceChecker: 3,
};

export const ALGORITHM_SCHEDULE: Record<AlgorithmId, AlgorithmSchedule> = {
  completenessScorer:  { steps: [1, 2, 3, 4, 5, 6], debounce: 300,  priority: 1 },
  citationGraph:       { steps: [3, 4, 6],           debounce: 800,  priority: 2 },
  structureAnalyzer:   { steps: [3, 6],              debounce: 1500, priority: 3 },
  citationParser:      { steps: [4],                 debounce: 500,  priority: 1 },
  deduplicator:        { steps: [4],                 debounce: 1000, priority: 4 },
  keywordExtractor:    { steps: [3, 6],              debounce: 3000, priority: 4 },
  latexHeuristics:     { steps: [3],                 debounce: 1200, priority: 1 },
  readingStats:        { steps: [3, 6],              debounce: 500,  priority: 4 },
  passiveVoice:        { steps: [3, 6],              debounce: 3000, priority: 4 },
  transitionAnalyzer:  { steps: [3, 6],              debounce: 3500, priority: 4 },
  acronymChecker:        { steps: [3, 6],              debounce: 4000, priority: 4 },
  semanticThesisGraph:   { steps: [3, 6],              debounce: 3000, priority: 3 },
  writingCoach:          { steps: [3, 6],              debounce: 3000, priority: 3 },
  readabilityScorer:     { steps: [3, 6],              debounce: 2000, priority: 3 },
  sentenceLengthAnalyzer:{ steps: [3, 6],              debounce: 2500, priority: 3 },
  sectionBalanceChecker: { steps: [3, 6],              debounce: 2000, priority: 3 },
};

const CIRCUIT_BREAKER_THRESHOLD = 3;

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
  passiveVoice: PassiveVoiceResult[] | null;
  transitions: TransitionResult[] | null;
  acronyms: AcronymIssue[] | null;
  semanticGraph: STGResult | null;
  writingCoach: CoachResult | null;
  readability: ReadabilityResult | null;
  sentenceLength: SentenceLengthResult | null;
  sectionBalance: SectionBalanceResult | null;
  circuitBreaker: Map<AlgorithmId, CircuitBreakerState>;
}

type ResultCallback = (results: IntelligenceResults) => void;

export const DEFAULT_RESULTS: IntelligenceResults = {
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

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

export class IntelligenceScheduler {
  protected thesis: ThesisData | null = null;
  protected templateId: ThesisType = 'bachelor';
  protected currentStep: number = 1;
  protected results: IntelligenceResults = {
    ...DEFAULT_RESULTS,
    heuristics: new Map(),
    circuitBreaker: new Map(),
  };
  private callback: ResultCallback | null = null;
  protected debouncers: Map<AlgorithmId, () => void> = new Map();
  protected circuitBreaker: Map<AlgorithmId, CircuitBreakerState> = new Map();
  protected pendingTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // AUDIT(fix19): Track requestIdleCallback IDs so they can be cancelled on dispose.
  protected pendingIdleCallbacks: Set<number> = new Set();
  protected disposed = false;
  private notifyCallbackScheduled = false;
  protected _shouldRun = true;

  setShouldRun(value: boolean): void {
    this._shouldRun = value;
    if (!value) {
      this.cancelAllPending();
    }
  }

  init(callback: ResultCallback): void {
    this.callback = callback;
    this.disposed = false;
    this._shouldRun = true;
    this.results = {
      ...DEFAULT_RESULTS,
      heuristics: new Map(),
      circuitBreaker: new Map(),
    };
    for (const id of Object.keys(ALGORITHM_SCHEDULE) as AlgorithmId[]) {
      this.circuitBreaker.set(id, { failures: 0, disabled: false });
    }
    for (const [id, schedule] of Object.entries(ALGORITHM_SCHEDULE)) {
      const algoId = id as AlgorithmId;
      this.debouncers.set(
        algoId,
        debounce(() => this.executeAlgorithm(algoId), schedule.debounce)
      );
    }
  }

  updateData(thesis: ThesisData | null, templateId: ThesisType): void {
    this.thesis = thesis;
    this.templateId = templateId;
  }

  scheduleRun(step: number): void {
    this.currentStep = step;
    if (!this._shouldRun) return;
    this.cancelAllPending();

    const toSchedule: Array<{ id: AlgorithmId; schedule: AlgorithmSchedule }> = [];
    for (const [id, schedule] of Object.entries(ALGORITHM_SCHEDULE)) {
      if (schedule.steps.includes(step)) {
        toSchedule.push({ id: id as AlgorithmId, schedule });
      }
    }

    toSchedule.sort((a, b) => a.schedule.priority - b.schedule.priority);

    for (const { id } of toSchedule) {
      const debounced = this.debouncers.get(id);
      if (debounced) {
        const priority = ALGORITHM_SCHEDULE[id].priority;
        const tierDelay = (priority - 1) * 200;
        const timerId = setTimeout(() => {
          if (!this.disposed && this._shouldRun) debounced();
          this.pendingTimeouts.delete(`schedule_${id}`);
        }, tierDelay);
        this.pendingTimeouts.set(`schedule_${id}`, timerId);
      }
    }
  }

  scheduleAlgorithm(algorithmId: AlgorithmId): void {
    if (this.isDisabled(algorithmId)) return;
    const debounced = this.debouncers.get(algorithmId);
    if (debounced) debounced();
  }

  isDisabled(algorithmId: AlgorithmId): boolean {
    const state = this.circuitBreaker.get(algorithmId);
    return state?.disabled ?? false;
  }

  getCircuitBreakerStates(): Map<AlgorithmId, CircuitBreakerState> {
    return new Map(this.circuitBreaker);
  }

  resetCircuitBreaker(algorithmId: AlgorithmId): void {
    this.circuitBreaker.set(algorithmId, { failures: 0, disabled: false });
  }

  resetAllCircuitBreakers(): void {
    for (const id of Object.keys(ALGORITHM_SCHEDULE) as AlgorithmId[]) {
      this.circuitBreaker.set(id, { failures: 0, disabled: false });
    }
  }

  private executeAlgorithm(algorithmId: AlgorithmId): void {
    if (this.disposed) return;
    const thesis = this.thesis;
    if (!thesis) return;
    if (this.isDisabled(algorithmId)) return;

    const HEAVY_ALGORITHMS: Set<AlgorithmId> = new Set([
      'semanticThesisGraph',
      'writingCoach',
      'passiveVoice',
      'transitionAnalyzer',
      'acronymChecker',
      'latexHeuristics',
      'readabilityScorer',
      'sentenceLengthAnalyzer',
      'sectionBalanceChecker',
    ]);

    const run = () => {
      const startTime = performance.now();
      try {
        this.executeAlgorithmUnsafe(algorithmId, thesis);
        const elapsed = performance.now() - startTime;
        if (elapsed > 50) {
          console.warn(`[intel] ${algorithmId} took ${elapsed.toFixed(1)}ms`);
        }
        // Reset circuit breaker on success
        const cbState = this.circuitBreaker.get(algorithmId);
        if (cbState) {
          this.circuitBreaker.set(algorithmId, {
            failures: 0,
            disabled: false,
          });
        }
        // FIXELEVEN: Skip notifyCallback for writingCoach — it runs async via
        // runChunkedWritingCoach() which calls notifyCallback when done.
        // Without this guard, notifyCallback fires with null writingCoach results,
        // causing a visible flash of empty→populated content in the UI.
        if (algorithmId !== 'writingCoach') {
          this.notifyCallback();
        }
      } catch (error) {
        const cbState = this.circuitBreaker.get(algorithmId);
        if (cbState) {
          const newFailures = cbState.failures + 1;
          const disabled = newFailures >= CIRCUIT_BREAKER_THRESHOLD;
          this.circuitBreaker.set(algorithmId, {
            failures: newFailures,
            disabled,
            reason: disabled
              ? `Disabled after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures: ${error instanceof Error ? error.message : String(error)}`
              : undefined,
          });
        }
        this.notifyCallback();
      }
    };

    if (HEAVY_ALGORITHMS.has(algorithmId)) {
      // FIX: Use requestIdleCallback (or setTimeout fallback) to yield
      // the main thread. The old 4ms setTimeout was too short — it
      // still blocked the UI because the heavy algo runs immediately
      // after the micro-delay. requestIdleCallback properly defers
      // to when the browser is idle.
      // AUDIT(fix19): Track the callback ID for cleanup on dispose.
      const scheduleIdle = typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 50);
      const idleId = scheduleIdle(run);
      if (typeof idleId === 'number') {
        this.pendingIdleCallbacks.add(idleId);
      }
    } else {
      run();
    }
  }

  protected executeAlgorithmUnsafe(algorithmId: AlgorithmId, thesis: ThesisData): void {
    switch (algorithmId) {
      case 'completenessScorer':
        this.results.completeness = scoreCompleteness(thesis, this.templateId);
        break;
      case 'readingStats':
        this.results.readingStats = computeReadingStats(thesis.chapters, thesis.abstract);
        break;
      case 'structureAnalyzer':
        this.results.structure = analyzeStructure(thesis.chapters, this.templateId);
        break;
      case 'keywordExtractor':
        this.results.keywords = extractKeywords(thesis.chapters);
        if (thesis.keywords && thesis.keywords.length > 0) {
          this.results.crossCheck = crossCheckKeywords(thesis.chapters, thesis.keywords);
        }
        break;
      case 'citationGraph':
        this.results.citationGraph = buildCitationGraph(thesis.chapters, thesis.references);
        break;
      case 'deduplicator': {
        const dedupResult = detectDuplicatesWithMerge(thesis.references);
        this.results.duplicates = dedupResult.duplicates;
        this.results.mergeSuggestions = dedupResult.mergeSuggestions;
        break;
      }
      case 'latexHeuristics':
        this.results.heuristics = new Map();
        for (const ch of thesis.chapters) {
          const fullText = [ch.content || '', ...(ch.subSections || []).map(ss => ss.content || '')].join(' ');
          if (fullText.trim()) {
            this.results.heuristics.set(ch.id, runHeuristics(fullText));
          }
        }
        break;
      case 'passiveVoice':
        this.results.passiveVoice = detectPassiveVoice(
          thesis.chapters.map(ch => ({ id: ch.id, title: ch.title, body: ch.content || '' }))
        );
        break;
      case 'transitionAnalyzer':
        this.results.transitions = analyzeTransitions(
          thesis.chapters.map(ch => ({ id: ch.id, title: ch.title, body: ch.content || '' }))
        );
        break;
      case 'acronymChecker':
        this.results.acronyms = checkAcronyms(
          thesis.chapters.map(ch => ({ id: ch.id, title: ch.title, body: ch.content || '' }))
        );
        break;
      case 'citationParser':
        break;
      case 'semanticThesisGraph':
        this.results.semanticGraph = buildSemanticGraph(thesis);
        break;
      case 'writingCoach':
        this.runChunkedWritingCoach(thesis);
        return;
      case 'readabilityScorer':
        this.results.readability = computeReadability(
          thesis.chapters.map(ch => ({ id: ch.id, title: ch.title, body: ch.content || '' }))
        );
        break;
      case 'sentenceLengthAnalyzer':
        this.results.sentenceLength = analyzeSentenceLengths(
          thesis.chapters.map(ch => ({ id: ch.id, title: ch.title, body: ch.content || '' }))
        );
        break;
      case 'sectionBalanceChecker':
        this.results.sectionBalance = checkSectionBalance(
          thesis.chapters.map(ch => ({ id: ch.id, title: ch.title, body: ch.content || '' }))
        );
        break;
    }
  }

  private runChunkedWritingCoach(thesis: ThesisData): void {
    const refMap = new Map<string, ThesisReference>();
    for (const ref of thesis.references) {
      const key = generateCiteKey({
        authors: ref.authors || '',
        title: ref.title || '',
        year: ref.year || '',
        type: ref.type || '',
      });
      refMap.set(key, ref);
    }

    const ruleFunctions = [
      checkS01_IntroGap, checkS02_MethodJustification, checkS03_ResultsInterpretation,
      checkS04_DiscussionRQReference, checkS05_ConclusionNewRefs,
      checkA01_TransitionalClosing, checkA02_ClaimDensity, checkA03_StructuralMonotony,
      checkA04_LiteratureSynthesis, checkA05_ContributionEcho,
      checkC01_FirstAuthorOverReliance, checkC02_NoRecentCitations, checkC03_AuthorProminentOveruse,
      checkC04_SingleChapterFoundational, checkC05_SelfCitationCluster,
      checkL01_FirstPersonSingular, checkL02_HedgingOverload, checkL03_WeakNominalizations,
      checkL04_VagueQuantifiers, checkL05_TransitionOveruse,
      checkAS01_AbstractElements, checkAS02_KeywordsNotInAbstract, checkAS03_AcronymBeforeDefinition,
      checkAS04_NumbersBelowTen, checkAS05_InconsistentTense,
    ];
    const dismissed = new Set<string>();
    const suggestions: CoachSuggestion[] = [];
    const CHUNK_SIZE = 5;
    let index = 0;

    const processChunk = () => {
      if (this.disposed) return;
      const chunk = ruleFunctions.slice(index, index + CHUNK_SIZE);
      for (const fn of chunk) {
        fn(thesis, suggestions, dismissed, refMap);
      }
      index += CHUNK_SIZE;
      if (index < ruleFunctions.length) {
        requestAnimationFrame(processChunk);
      } else {
        this.results.writingCoach = {
          suggestions: suggestions.slice(0, 100),
          coachScore: calculateCoachScore(suggestions),
          scoreBreakdown: {
            structure: calculateCoachScore(suggestions, 'structure'),
            argument: calculateCoachScore(suggestions, 'argument'),
            citation: calculateCoachScore(suggestions, 'citation'),
            language: calculateCoachScore(suggestions, 'language'),
            academicStyle: calculateCoachScore(suggestions, 'academic-style'),
          },
          dismissedRules: dismissed,
        };
        this.notifyCallback();
      }
    };

    processChunk();
  }

  // AUDIT(fix19): Changed return type to Promise<IntelligenceResults>.
  // Previously, this method processed algorithms in async chunks (via
  // setTimeout) but returned synchronously, giving callers INCOMPLETE
  // results — only the first chunk's algorithms had run. The Promise
  // ensures callers get the full result set. Callers must await.
  // NOTE: No external callers exist today — this is a correctness fix
  // for future use (export, snapshot, etc.).
  runAllForced(step?: number): Promise<IntelligenceResults> {
    if (step !== undefined) this.currentStep = step;
    const thesis = this.thesis;
    if (!thesis) return Promise.resolve({ ...this.results, heuristics: new Map(this.results.heuristics), circuitBreaker: new Map(this.circuitBreaker) });

    this.resetAllCircuitBreakers();

    const sortedAlgorithms = (Object.keys(ALGORITHM_SCHEDULE) as AlgorithmId[])
      .sort((a, b) => ALGORITHM_SCHEDULE[a].priority - ALGORITHM_SCHEDULE[b].priority);

    // Process algorithms in chunks with yields between heavy ones
    // to avoid freezing the main thread on large theses.
    const HEAVY: Set<AlgorithmId> = new Set([
      'semanticThesisGraph', 'writingCoach', 'passiveVoice',
      'transitionAnalyzer', 'acronymChecker', 'latexHeuristics',
      'readabilityScorer', 'sentenceLengthAnalyzer', 'sectionBalanceChecker',
    ]);

    let index = 0;
    const CHUNK_SIZE = 3;

    return new Promise((resolve) => {
      const processChunk = () => {
        const chunk = sortedAlgorithms.slice(index, index + CHUNK_SIZE);
        for (const algoId of chunk) {
          if (this.disposed) {
            resolve({ ...this.results, heuristics: new Map(this.results.heuristics), circuitBreaker: new Map(this.circuitBreaker) });
            return;
          }
          try {
            if (algoId === 'writingCoach') {
              this.results.writingCoach = runWritingCoach(thesis);
              this.circuitBreaker.set(algoId, { failures: 0, disabled: false });
              continue;
            }
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
        index += CHUNK_SIZE;
        if (index < sortedAlgorithms.length) {
          // Use setTimeout(0) to yield the main thread between chunks
          setTimeout(processChunk, 0);
        } else {
          this.notifyCallback();
          resolve({
            ...this.results,
            heuristics: new Map(this.results.heuristics),
            circuitBreaker: new Map(this.circuitBreaker),
          });
        }
      };

      processChunk();
    });
  }

  protected notifyCallback(): void {
    if (!this.callback) return;
    if (!this.notifyCallbackScheduled) {
      this.notifyCallbackScheduled = true;
      const rAF = typeof requestAnimationFrame !== 'undefined'
        ? requestAnimationFrame
        : (cb: () => void) => setTimeout(cb, 0);
      rAF(() => {
        this.notifyCallbackScheduled = false;
        if (this.callback) {
          this.callback({
            ...this.results,
            heuristics: new Map(this.results.heuristics),
            circuitBreaker: new Map(this.circuitBreaker),
          });
        }
      });
    }
  }

  parseCitation(raw: string): ParsedCitation {
    return parseCitationText(raw);
  }

  getResults(): IntelligenceResults {
    return {
      ...this.results,
      heuristics: new Map(this.results.heuristics),
      circuitBreaker: new Map(this.circuitBreaker),
    };
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  cancelAllPending(): void {
    for (const [key, timerId] of this.pendingTimeouts) {
      clearTimeout(timerId);
    }
    this.pendingTimeouts.clear();
    // AUDIT(fix19): Cancel tracked requestIdleCallback handles.
    if (typeof cancelIdleCallback !== 'undefined') {
      for (const id of this.pendingIdleCallbacks) {
        cancelIdleCallback(id);
      }
    }
    this.pendingIdleCallbacks.clear();
  }

  cancelAll(): void {
    this.cancelAllPending();
    // FIXELEVEN: Don't clear debouncers — clearing them permanently breaks
    // scheduleRun() which needs them for future runs. Instead, recreate
    // them so they're fresh but functional.
    for (const [id, schedule] of Object.entries(ALGORITHM_SCHEDULE)) {
      const algoId = id as AlgorithmId;
      this.debouncers.set(
        algoId,
        debounce(() => this.executeAlgorithm(algoId), schedule.debounce)
      );
    }
  }

  dispose(): void {
    this.disposed = true;
    this._shouldRun = false;
    this.cancelAllPending();
    // FIXELEVEN: Same fix as cancelAll — don't clear debouncers on dispose
    // since they're lightweight closures. Just clear pending state.
    this.callback = null;
  }
}

// ── Worker‑backed scheduler ─────────────────────────────────────

export class IntelligenceSchedulerWithWorker extends IntelligenceScheduler {
  private worker: Worker | null = null;
  // FIX: Sequence counter to discard stale worker results.
  // Without this, rapid edits cause race conditions where older results
  // overwrite newer ones, causing visible UI flicker.
  private workerSequence = 0;
  private currentSequence = 0;

  init(callback: ResultCallback): void {
    // AUDIT(fix19): Terminate previous Worker if init() is called again
    // without an intervening dispose() (e.g., React StrictMode double-mount
    // without cleanup, or programmatic re-initialization). Without this,
    // the old Worker keeps running, consuming memory and CPU, and its
    // onmessage handler could deliver stale results that overwrite
    // fresh data from the new Worker.
    if (this.worker) {
      this.worker.onerror = null;
      this.worker.onmessage = null;
      this.worker.terminate();
      this.worker = null;
    }
    super.init(callback);
    // FIX: { type: 'module' } enables ES module imports inside the worker.
    // Without this, Turbopack generates importScripts() calls with absolute URLs
    // that fail on preview deployments (NetworkError: Failed to execute 'importScripts').
    // Module workers use native import, matching the latex worker pattern in useLatexWorker.ts.
    try {
      this.worker = new Worker(
        new URL('../workers/intelligence.worker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch (err) {
      // Worker failed to initialise (e.g. CSP restrictions, blob URL not
      // supported).  Fall back to null — the scheduler will still run
      // light algorithms on the main thread, and heavy ones are simply
      // skipped rather than crashing the entire app.
      console.warn('[intelligence] Failed to create Worker, running in degraded mode:', err);
      this.worker = null;
      return;
    }

    this.worker.onmessage = (e: MessageEvent<{ type: string; results: IntelligenceResults; sequence?: number }>) => {
      if (e.data.type === 'results') {
        // FIX: Discard stale results from outdated worker runs.
        // If the user edited after this worker was dispatched, its results
        // are stale and must be silently discarded.
        if (e.data.sequence !== undefined && e.data.sequence < this.currentSequence) {
          return; // Stale result — discard silently
        }
        this.results = { ...this.results, ...e.data.results };
        this.notifyCallback();
      }
    };
    // FIX: Handle Worker errors to prevent silent failure.
    // Previously, Worker crashes (e.g., import failures, runtime errors)
    // were silently swallowed — the panel would show an infinite spinner
    // with no results arriving. Now we log the error, prevent the unhandled
    // error from propagating, terminate the crashed worker, and mark heavy
    // algorithms as failed so the circuit breaker can track them.
    this.worker.onerror = (e: ErrorEvent) => {
      console.warn('[intelligence] Worker error:', e.message, e.filename, e.lineno);
      e.preventDefault(); // Prevent the error from propagating as unhandled

      // Terminate the crashed worker — subsequent scheduleRun calls will
      // silently skip postMessage (guarded by optional chaining) while
      // light algorithms continue to run on the main thread.
      if (this.worker) {
        this.worker.onerror = null;
        this.worker.onmessage = null;
        this.worker.terminate();
        this.worker = null;
      }

      // Mark heavy algorithms as failed so they don't silently produce stale results
      for (const id of ['semanticThesisGraph', 'writingCoach', 'passiveVoice', 'transitionAnalyzer', 'acronymChecker', 'latexHeuristics', 'deduplicator', 'keywordExtractor', 'readabilityScorer', 'sentenceLengthAnalyzer', 'sectionBalanceChecker'] as AlgorithmId[]) {
        const state = this.circuitBreaker.get(id);
        if (state) {
          const newFailures = state.failures + 1;
          this.circuitBreaker.set(id, { failures: newFailures, disabled: newFailures >= CIRCUIT_BREAKER_THRESHOLD });
        }
      }
      this.notifyCallback();
    };
  }

  dispose(): void {
    super.dispose();
    if (this.worker) {
      // FIX: Remove error handler before terminating to prevent
      // post-terminate error events from firing.
      this.worker.onerror = null;
      this.worker.onmessage = null;
      this.worker.terminate();
      this.worker = null;
    }
  }

  scheduleRun(step: number): void {
    // FIX: Do NOT call super.scheduleRun() — the worker handles ALL heavy
    // algorithms. Previously, calling super caused double execution:
    // main thread ran everything synchronously (freezing UI) AND worker
    // ran everything in background. Now only the worker runs, and we
    // only run light algorithms locally for immediate feedback.
    this.currentStep = step;
    if (!this._shouldRun) return;
    this.cancelAllPending();

    // Only schedule light, fast algorithms on the main thread.
    // Heavy algorithms (semanticGraph, writingCoach, passiveVoice, etc.)
    // are handled exclusively by the worker.
    const MAIN_THREAD_ALGORITHMS: Set<AlgorithmId> = new Set([
      'completenessScorer',
      'readingStats',
      'structureAnalyzer',
      'citationGraph',
      'citationParser',
    ]);

    const toSchedule: Array<{ id: AlgorithmId; schedule: AlgorithmSchedule }> = [];
    for (const [id, schedule] of Object.entries(ALGORITHM_SCHEDULE)) {
      const algoId = id as AlgorithmId;
      if (schedule.steps.includes(step) && MAIN_THREAD_ALGORITHMS.has(algoId)) {
        toSchedule.push({ id: algoId, schedule });
      }
    }

    toSchedule.sort((a, b) => a.schedule.priority - b.schedule.priority);

    for (const { id } of toSchedule) {
      const debounced = this.debouncers.get(id);
      if (debounced) {
        const priority = ALGORITHM_SCHEDULE[id].priority;
        const tierDelay = (priority - 1) * 200;
        const timerId = setTimeout(() => {
          if (!this.disposed && this._shouldRun) debounced();
          this.pendingTimeouts.delete(`schedule_${id}`);
        }, tierDelay);
        this.pendingTimeouts.set(`schedule_${id}`, timerId);
      }
    }

    // Send everything to the worker — it will handle all 13 algorithms
    // including the heavy ones that would freeze the main thread.
    if (this._shouldRun && step >= 1 && this.thesis) {
      this.workerSequence++;
      this.currentSequence = this.workerSequence;
      this.worker?.postMessage({
        thesis: this.thesis,
        templateId: this.templateId,
        sequence: this.workerSequence,
      });
    }
  }
}

// Singleton
export const intelligenceScheduler =
  typeof Worker !== 'undefined'
    ? new IntelligenceSchedulerWithWorker()
    : new IntelligenceScheduler();
