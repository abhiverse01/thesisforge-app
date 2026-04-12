// ============================================================
// ThesisForge Core — System 4: Thesis Timeline Engine
// Generates chapter-by-chapter writing plans with milestones,
// risk assessment, and deadline tracking.
// Pure function. No side effects. No DOM access. No network.
// Performance budget: < 10ms for any input.
// ============================================================

// --- Types ---

export interface ChapterPlan {
  chapterId: string;
  chapterTitle: string;
  currentWords: number;
  targetWords: number;
  completionPct: number;      // 0-100
  estimatedHoursRemaining: number;
  status: 'empty' | 'started' | 'substantial' | 'near-complete' | 'complete';
}

export interface Milestone {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
  achievedAt?: number;         // timestamp
  targetDate?: number;         // timestamp (for deadline-based milestones)
  category: 'content' | 'quality' | 'citation' | 'export';
}

export type RiskLevel = 'on-track' | 'at-risk' | 'critical';

export interface TimelinePlan {
  currentWordCount: number;
  targetWordCount: number;
  wordsRemaining: number;
  estimatedHoursRemaining: number;
  suggestedDailyWordTarget: number;
  chapterPlans: ChapterPlan[];
  milestones: Milestone[];
  riskLevel: RiskLevel;
  deadlineReachable: boolean | null;  // null if no deadline set
  daysRemaining: number | null;        // null if no deadline set
  writingVelocityWordsPerDay: number;  // computed from memory events if available
  compilerTarget: 'pdflatex' | 'xelatex' | 'lualatex';
}

// --- Constants ---

export const WRITING_VELOCITY = {
  draft: 250,       // words/hour for first draft
  revision: 150,    // words/hour for revisions
  research: 100,    // words/hour when content requires new research
} as const;

export const TARGET_WORD_COUNTS: Record<string, { min: number; max: number; ideal: number }> = {
  bachelor:  { min: 10_000, max: 20_000, ideal: 15_000 },
  master:    { min: 20_000, max: 40_000, ideal: 30_000 },
  phd:       { min: 60_000, max: 100_000, ideal: 80_000 },
  report:    { min: 3_000,  max: 8_000,  ideal: 5_000 },
  conference: { min: 4_000, max: 8_000, ideal: 6_000 },
};

// Chapter weight distribution per thesis type (% of total words)
export const CHAPTER_WEIGHTS: Record<string, Record<string, number>> = {
  bachelor: {
    introduction: 0.15,
    literature: 0.25,
    methodology: 0.20,
    results: 0.25,
    conclusion: 0.15,
  },
  master: {
    introduction: 0.10,
    literature: 0.20,
    methodology: 0.20,
    results: 0.20,
    discussion: 0.15,
    conclusion: 0.15,
  },
  phd: {
    introduction: 0.08,
    literature: 0.18,
    methodology: 0.18,
    'results-1': 0.15,
    'results-2': 0.12,
    discussion: 0.14,
    conclusion: 0.15,
  },
  report: {
    introduction: 0.15,
    methods: 0.25,
    results: 0.40,
    conclusion: 0.20,
  },
  conference: {
    introduction: 0.15,
    related: 0.20,
    methodology: 0.25,
    results: 0.25,
    conclusion: 0.15,
  },
};

// --- Internal constants ---

const MS_PER_DAY = 86400_000; // 1000 * 60 * 60 * 24
const MAX_PRACTICAL_DAILY_VELOCITY = 2000; // ~8 hrs writing/day at 250 w/h
const DEFAULT_DAILY_VELOCITY = 500; // ~2 hrs writing/day at 250 w/h

// --- Word count helper ---

/**
 * Count words in a chapter (content + all subsections).
 * Uses simple whitespace split, filtering empty strings.
 *
 * @param chapter - Chapter with content and optional sub-sections
 * @returns Total word count across all content
 */
export function countChapterWords(chapter: {
  content: string;
  subSections: ReadonlyArray<{ content: string }>;
}): number {
  const mainWords = chapter.content
    ? chapter.content.split(/\s+/).filter(Boolean).length
    : 0;
  const subWords = (chapter.subSections || []).reduce((sum, ss) => {
    return sum + (ss.content ? ss.content.split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  return mainWords + subWords;
}

// --- Internal helpers ---

/**
 * Matching rules for mapping chapter titles to weight keys.
 * Rules are evaluated in priority order. Each rule tests a regex
 * against the title and attempts to assign a preferred weight key.
 * The first available (unused) key wins.
 */
const MATCHING_RULES: ReadonlyArray<{
  test: RegExp;
  keys: readonly string[];
}> = [
  // Introduction — highest priority, unique keyword
  { test: /intro/i, keys: ['introduction'] },
  // Conclusion / Summary / Future work — unique keywords
  { test: /conclu|summary|future/i, keys: ['conclusion'] },
  // Discussion when it's the primary topic (title starts with it)
  { test: /^discussion|^analysis|^interpretation/i, keys: ['discussion'] },
  // Methodology / Methods — "design" and "approach" are strong signals
  { test: /method|approach|design|procedure/i, keys: ['methodology', 'methods'] },
  // Results — checked before unanchored discussion so "Results and Discussion"
  // maps to results, while "Discussion of Results" maps to discussion (rule above)
  { test: /result|finding|experiment|eval/i, keys: ['results-1', 'results-2', 'results'] },
  // Discussion as secondary keyword (title contains but doesn't start with it)
  { test: /discussion|analysis|interpretation/i, keys: ['discussion'] },
  // Literature / Related work / Background — lowest priority to avoid
  // false positives with titles like "Discussion of Related Approaches"
  { test: /literature|related|review|background|state of the art/i, keys: ['related', 'literature'] },
];

/**
 * Match a chapter title to a weight key using keyword-based fuzzy matching.
 * Each weight key can only be used once per thesis.
 *
 * @param title    - Chapter title (case-insensitive)
 * @param weightKeys - Available weight keys for this thesis type
 * @param usedKeys - Set of weight keys already assigned to other chapters
 * @returns Matched weight key, or null if no match found
 */
function matchWeightKey(
  title: string,
  weightKeys: readonly string[],
  usedKeys: Set<string>
): string | null {
  const t = title.toLowerCase().trim();

  for (const rule of MATCHING_RULES) {
    if (!rule.test.test(t)) continue;
    for (const key of rule.keys) {
      if (weightKeys.includes(key) && !usedKeys.has(key)) {
        return key;
      }
    }
  }

  return null;
}

/**
 * Determine chapter status from completion percentage.
 *
 * - empty: 0%
 * - started: 1-30%
 * - substantial: 30-70%
 * - near-complete: 70-90%
 * - complete: 90%+
 */
function getChapterStatus(pct: number): ChapterPlan['status'] {
  if (pct >= 90) return 'complete';
  if (pct >= 70) return 'near-complete';
  if (pct >= 30) return 'substantial';
  if (pct >= 1) return 'started';
  return 'empty';
}

/**
 * Compute days remaining until a deadline.
 * Returns 0 if the deadline has already passed.
 */
function computeDaysRemaining(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / MS_PER_DAY));
}

/**
 * Clamp a number between a minimum and maximum value.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// --- Chapter plan builder ---

/**
 * Build per-chapter plans by matching each chapter title to a weight key
 * from the CHAPTER_WEIGHTS distribution for the given thesis type.
 */
function buildChapterPlans(
  chapters: ReadonlyArray<{
    id: string;
    title: string;
    content: string;
    subSections: ReadonlyArray<{ content: string }>;
  }>,
  weightMap: Record<string, number>,
  targetWordCount: number
): ChapterPlan[] {
  const weightKeys = Object.keys(weightMap);
  const usedKeys = new Set<string>();

  return chapters.map((ch) => {
    const currentWords = countChapterWords(ch);
    const matchedKey = matchWeightKey(ch.title, weightKeys, usedKeys);

    let targetWords: number;
    let completionPct: number;
    let estimatedHoursRemaining: number;

    if (matchedKey) {
      usedKeys.add(matchedKey);
      targetWords = Math.round(targetWordCount * weightMap[matchedKey]);
      completionPct =
        targetWords > 0
          ? Math.min(100, Math.round((currentWords / targetWords) * 100))
          : 100;
      estimatedHoursRemaining =
        Math.max(0, targetWords - currentWords) / WRITING_VELOCITY.draft;
    } else {
      // Unmatched chapter (appendix, acknowledgments, etc.)
      targetWords = 0;
      completionPct = currentWords > 0 ? 100 : 0;
      estimatedHoursRemaining = 0;
    }

    return {
      chapterId: ch.id,
      chapterTitle: ch.title,
      currentWords,
      targetWords,
      completionPct,
      estimatedHoursRemaining: Math.round(estimatedHoursRemaining * 10) / 10,
      status: getChapterStatus(completionPct),
    };
  });
}

// --- Milestone builder ---

/**
 * Generate all milestones and determine which are achieved.
 */
function buildMilestones(params: {
  totalWords: number;
  targetMin: number;
  chapterPlans: readonly ChapterPlan[];
  hasCitationCoverage: boolean;
  qualityContractPassed: boolean;
  completenessScore: number;
  compilationSimPassed: boolean;
  submissionDeadline?: number;
  nowMs: number;
}): Milestone[] {
  const {
    totalWords,
    targetMin,
    chapterPlans,
    hasCitationCoverage,
    qualityContractPassed,
    completenessScore,
    compilationSimPassed,
    submissionDeadline,
    nowMs,
  } = params;

  const milestones: Milestone[] = [];

  // 1. First chapter complete — any chapter ≥ 90% of its target
  const firstChapterComplete = chapterPlans.some(
    (cp) => cp.targetWords > 0 && cp.completionPct >= 90
  );
  milestones.push({
    id: 'first-chapter-complete',
    label: 'First chapter complete',
    description:
      'At least one chapter has reached 90% of its target word count.',
    achieved: firstChapterComplete,
    achievedAt: firstChapterComplete ? nowMs : undefined,
    category: 'content',
  });

  // 2. Half draft complete — total words ≥ 50% of target min
  const halfDraftThreshold = Math.round(targetMin * 0.5);
  const halfDraftComplete = totalWords >= halfDraftThreshold;
  milestones.push({
    id: 'half-draft-complete',
    label: 'Half draft complete',
    description: `Total word count reached 50% of the minimum target (${halfDraftThreshold.toLocaleString()} words).`,
    achieved: halfDraftComplete,
    achievedAt: halfDraftComplete ? nowMs : undefined,
    category: 'content',
  });

  // 3. Draft complete — total words ≥ target min
  const draftComplete = totalWords >= targetMin;
  milestones.push({
    id: 'draft-complete',
    label: 'Draft complete',
    description: `Total word count reached the minimum target (${targetMin.toLocaleString()} words).`,
    achieved: draftComplete,
    achievedAt: draftComplete ? nowMs : undefined,
    category: 'content',
  });

  // 4. Citation coverage achieved — all chapters have ≥ 1 citation
  milestones.push({
    id: 'citation-coverage',
    label: 'Citation coverage achieved',
    description: 'Every chapter contains at least one citation.',
    achieved: hasCitationCoverage,
    achievedAt: hasCitationCoverage ? nowMs : undefined,
    category: 'citation',
  });

  // 5. Quality contract green — all checks pass
  milestones.push({
    id: 'quality-contract',
    label: 'Quality contract green',
    description: 'All quality checks have passed.',
    achieved: qualityContractPassed,
    achievedAt: qualityContractPassed ? nowMs : undefined,
    category: 'quality',
  });

  // 6. Export ready — completeness ≥ 90 AND compilation passes
  const exportReady = completenessScore >= 90 && compilationSimPassed;
  milestones.push({
    id: 'export-ready',
    label: 'Export ready',
    description:
      'Completeness score \u2265 90 and the compilation simulation passes.',
    achieved: exportReady,
    achievedAt: exportReady ? nowMs : undefined,
    category: 'export',
  });

  // 7. Final submission — only if a deadline is set
  if (submissionDeadline != null) {
    const finalSubmission = nowMs >= submissionDeadline;
    milestones.push({
      id: 'final-submission',
      label: 'Final submission',
      description: 'The submission deadline has been reached.',
      achieved: finalSubmission,
      achievedAt: finalSubmission ? nowMs : undefined,
      targetDate: submissionDeadline,
      category: 'export',
    });
  }

  return milestones;
}

// --- Risk computation ---

/**
 * Compute risk level based on deadline constraints and writing velocity.
 *
 * - on-track: No deadline, or reachable at ≤ 1.5× current velocity
 * - at-risk: Deadline requires > 1.5× current velocity but is theoretically
 *   achievable at maximum practical velocity (2000 words/day)
 * - critical: Deadline has passed, or impossible even at maximum velocity
 */
function computeRiskLevel(params: {
  deadlineReachable: boolean | null;
  daysRemaining: number | null;
  wordsRemaining: number;
  velocityWordsPerDay: number;
}): RiskLevel {
  const { deadlineReachable, daysRemaining, wordsRemaining, velocityWordsPerDay } =
    params;

  // No deadline → always on-track
  if (deadlineReachable === null || daysRemaining === null) {
    return 'on-track';
  }

  // Deadline has passed → critical
  if (daysRemaining <= 0) {
    return 'critical';
  }

  // Required daily velocity to meet the deadline
  const requiredVelocity = wordsRemaining / daysRemaining;

  // No historical velocity data — check against max practical velocity
  if (velocityWordsPerDay <= 0) {
    return requiredVelocity > MAX_PRACTICAL_DAILY_VELOCITY ? 'critical' : 'at-risk';
  }

  // Within 1.5× current velocity → on-track
  if (requiredVelocity <= velocityWordsPerDay * 1.5) {
    return 'on-track';
  }

  // Achievable at max practical velocity → at-risk
  if (requiredVelocity <= MAX_PRACTICAL_DAILY_VELOCITY) {
    return 'at-risk';
  }

  // Impossible → critical
  return 'critical';
}

// --- Main function ---

/**
 * Generate a complete thesis timeline plan.
 *
 * Produces chapter-by-chapter writing targets, milestone tracking,
 * deadline risk assessment, and daily word-count suggestions.
 *
 * @param params - Timeline generation parameters
 * @returns Complete timeline plan with chapter plans, milestones, and risk assessment
 *
 * Edge cases:
 * - Empty chapters → empty chapterPlans array, milestones still generated
 * - Unknown thesis type → falls back to bachelor profile
 * - No deadline → deadlineReachable = null, risk = on-track
 * - Zero total words → wordsRemaining = target, high daily target
 * - Deadline in the past → daysRemaining = 0, risk = critical
 */
export function generateTimeline(params: {
  thesisType: string;
  chapters: ReadonlyArray<{
    id: string;
    title: string;
    content: string;
    subSections: ReadonlyArray<{ content: string }>;
  }>;
  totalWords: number;
  completenessScore: number;
  hasCitationCoverage: boolean;     // all chapters have ≥ 1 citation
  qualityContractPassed: boolean;   // all checks pass
  compilationSimPassed: boolean;    // compilation simulator passes
  submissionDeadline?: number;      // timestamp, optional
  daysSinceFirstSave?: number;      // days since first auto-save
  memoryVelocityWordsPerDay?: number; // from memory system, if available
  compilerTarget?: 'pdflatex' | 'xelatex' | 'lualatex';
}): TimelinePlan {
  const {
    thesisType,
    chapters,
    totalWords,
    completenessScore,
    hasCitationCoverage,
    qualityContractPassed,
    compilationSimPassed,
    submissionDeadline,
    daysSinceFirstSave,
    memoryVelocityWordsPerDay,
    compilerTarget = 'pdflatex',
  } = params;

  const nowMs = Date.now();

  // --- Resolve target profile ---
  const targetInfo = TARGET_WORD_COUNTS[thesisType] || TARGET_WORD_COUNTS.bachelor;
  const targetWordCount = targetInfo.ideal;
  const wordsRemaining = Math.max(0, targetWordCount - totalWords);

  // --- Resolve chapter weight distribution ---
  const weightMap = CHAPTER_WEIGHTS[thesisType] || CHAPTER_WEIGHTS.bachelor;

  // --- Build chapter plans ---
  const chapterPlans = buildChapterPlans(chapters, weightMap, targetWordCount);

  // --- Total estimated hours remaining (sum of all chapters) ---
  const estimatedHoursRemaining = chapterPlans.reduce(
    (sum, cp) => sum + cp.estimatedHoursRemaining,
    0
  );

  // --- Compute writing velocity (words per day) ---
  let writingVelocityWordsPerDay: number;
  if (memoryVelocityWordsPerDay != null && memoryVelocityWordsPerDay > 0) {
    writingVelocityWordsPerDay = memoryVelocityWordsPerDay;
  } else if (daysSinceFirstSave != null && daysSinceFirstSave > 0) {
    writingVelocityWordsPerDay = Math.round(totalWords / daysSinceFirstSave);
  } else {
    writingVelocityWordsPerDay = DEFAULT_DAILY_VELOCITY;
  }

  // --- Deadline calculations ---
  let daysRemaining: number | null = null;
  let deadlineReachable: boolean | null = null;
  let suggestedDailyWordTarget: number;

  if (submissionDeadline != null) {
    daysRemaining = computeDaysRemaining(submissionDeadline, nowMs);

    if (daysRemaining > 0 && writingVelocityWordsPerDay > 0) {
      deadlineReachable =
        wordsRemaining / writingVelocityWordsPerDay <= daysRemaining;
    } else if (daysRemaining <= 0) {
      deadlineReachable = false;
    }
    // else: deadlineReachable stays null (unknown feasibility)

    suggestedDailyWordTarget =
      daysRemaining > 0
        ? clamp(
            Math.ceil(wordsRemaining / daysRemaining),
            100,
            2000
          )
        : 2000; // past deadline: suggest aggressive pace
  } else {
    // No deadline: 30-day default plan with a floor of 200 words/day
    suggestedDailyWordTarget = Math.max(
      200,
      Math.ceil(wordsRemaining / 30)
    );
  }

  // --- Build milestones ---
  const milestones = buildMilestones({
    totalWords,
    targetMin: targetInfo.min,
    chapterPlans,
    hasCitationCoverage,
    qualityContractPassed,
    completenessScore,
    compilationSimPassed,
    submissionDeadline,
    nowMs,
  });

  // --- Compute risk level ---
  const riskLevel = computeRiskLevel({
    deadlineReachable,
    daysRemaining,
    wordsRemaining,
    velocityWordsPerDay: writingVelocityWordsPerDay,
  });

  return {
    currentWordCount: totalWords,
    targetWordCount,
    wordsRemaining,
    estimatedHoursRemaining: Math.round(estimatedHoursRemaining * 10) / 10,
    suggestedDailyWordTarget,
    chapterPlans,
    milestones,
    riskLevel,
    deadlineReachable,
    daysRemaining,
    writingVelocityWordsPerDay,
    compilerTarget,
  };
}
