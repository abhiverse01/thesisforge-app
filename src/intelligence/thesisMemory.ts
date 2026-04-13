// ============================================================
// ThesisForge Intelligence — System 7: Thesis Memory
// Tracks all significant thesis-editing events, computes writing
// velocity, detects patterns, and generates actionable insights.
//
// Pure functions for logic, async only for IndexedDB (handled
// in persistence.ts). Zero new dependencies.
// ============================================================

import { countWords } from './structureAnalyzer';
import type { ThesisData, ThesisType } from '@/lib/thesis-types';

// ============================================================
// Types
// ============================================================

export type MemoryEventKind =
  | 'chapter-added'
  | 'chapter-retitled'
  | 'chapter-removed'
  | 'word-count-delta'
  | 'reference-added'
  | 'reference-removed'
  | 'score-change'
  | 'quality-gate-pass'
  | 'template-changed'
  | 'export-performed'
  | 'session-start'
  | 'session-end'
  | 'snapshot-created';

export interface MemoryEvent {
  id: string;
  kind: MemoryEventKind;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface WritingVelocity {
  date: string;           // YYYY-MM-DD
  wordsWritten: number;
  wordsDeleted: number;
  netWords: number;
  sessionsCount: number;
  activeMinutes: number;  // estimated
}

export interface SessionSummary {
  sessionId: string;
  startedAt: number;
  endedAt: number | null;
  wordsAdded: number;
  wordsDeleted: number;
  chaptersModified: string[];
  referencesAdded: number;
  scoreChange: { from: number; to: number } | null;
  events: number;
}

export interface MemoryInsight {
  id: string;
  type: 'warning' | 'tip' | 'achievement';
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface ThesisMemoryState {
  events: MemoryEvent[];
  currentSession: SessionSummary | null;
  velocity: WritingVelocity[];      // last 30 days
  insights: MemoryInsight[];
  exportHistory: Array<{ timestamp: number; qualityScore: number; wordCount: number }>;
}

// ============================================================
// Constants
// ============================================================

/** Maximum memory events to keep per draft (auto-prune oldest) */
const MAX_EVENTS_PER_DRAFT = 1000;

/** Minimum word count thresholds per thesis type (for "draft complete" insight) */
const MIN_WORD_COUNTS: Record<ThesisType, number> = {
  bachelor: 10_000,
  master: 20_000,
  phd: 50_000,
  report: 3_000,
  conference: 5_000,
};

/** Target word counts per chapter type (for "first chapter done" insight) */
const CHAPTER_TARGET_WORDS: Record<string, number> = {
  introduction: 2_000,
  literature: 4_000,
  background: 3_000,
  methodology: 3_000,
  results: 4_000,
  discussion: 3_000,
  conclusion: 1_500,
};

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function inferChapterKey(title: string): string | null {
  const t = title.toLowerCase();
  if (/intro/i.test(t)) return 'introduction';
  if (/background|related|literature|review/i.test(t)) return 'literature';
  if (/method|approach|design/i.test(t)) return 'methodology';
  if (/result|finding|experiment|eval/i.test(t)) return 'results';
  if (/discussion|analysis|interpretation/i.test(t)) return 'discussion';
  if (/conclu|summary|future/i.test(t)) return 'conclusion';
  return null;
}

/**
 * Get approximate target word count for a chapter based on title heuristic.
 */
function getChapterTarget(title: string): number {
  const key = inferChapterKey(title);
  if (key && CHAPTER_TARGET_WORDS[key]) return CHAPTER_TARGET_WORDS[key];
  // Default target for unclassifiable chapters
  return 2_500;
}

// ============================================================
// Event Recording
// ============================================================

/**
 * Create a new memory event with a unique ID and current timestamp.
 */
export function createMemoryEvent(
  kind: MemoryEventKind,
  data: Record<string, unknown>
): MemoryEvent {
  return {
    id: generateId(),
    kind,
    timestamp: Date.now(),
    data,
  };
}

// ============================================================
// Auto-Prune (cap events at MAX_EVENTS_PER_DRAFT)
// ============================================================

/**
 * Given all events sorted by timestamp ascending, return the subset
 * that should be kept (oldest trimmed if over the cap).
 */
export function pruneEvents(events: MemoryEvent[]): MemoryEvent[] {
  if (events.length <= MAX_EVENTS_PER_DRAFT) return events;
  // Keep the most recent MAX_EVENTS_PER_DRAFT events
  return events.slice(events.length - MAX_EVENTS_PER_DRAFT);
}

// ============================================================
// Velocity Computation
// ============================================================

/**
 * Compute daily writing velocity from memory events over the last N days.
 * Groups word-count-delta events by date and aggregates.
 */
export function computeVelocity(
  events: MemoryEvent[],
  days: number = 30
): WritingVelocity[] {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  // Collect word-count-delta events within the window
  const deltaEvents = events.filter(
    (e) => e.kind === 'word-count-delta' && e.timestamp >= cutoff
  );

  // Group by date
  const byDate = new Map<string, {
    written: number;
    deleted: number;
    sessions: Set<string>;
    minTs: number;
    maxTs: number;
  }>();

  // Also collect session boundaries for estimating active minutes
  const sessionStarts = new Map<string, number>();
  const sessionEnds = new Map<string, number>();
  for (const e of events) {
    if (e.timestamp < cutoff) continue;
    if (e.kind === 'session-start' && e.data.sessionId) {
      sessionStarts.set(e.data.sessionId as string, e.timestamp);
    }
    if (e.kind === 'session-end' && e.data.sessionId) {
      sessionEnds.set(e.data.sessionId as string, e.timestamp);
    }
  }

  for (const e of deltaEvents) {
    const date = toDateStr(e.timestamp);
    if (!byDate.has(date)) {
      byDate.set(date, { written: 0, deleted: 0, sessions: new Set(), minTs: e.timestamp, maxTs: e.timestamp });
    }
    const bucket = byDate.get(date)!;
    const delta = e.data.delta as number | undefined;
    if (delta !== undefined) {
      if (delta > 0) bucket.written += delta;
      else bucket.deleted += Math.abs(delta);
    }
    if (e.data.sessionId) {
      bucket.sessions.add(e.data.sessionId as string);
    }
    if (e.timestamp < bucket.minTs) bucket.minTs = e.timestamp;
    if (e.timestamp > bucket.maxTs) bucket.maxTs = e.timestamp;
  }

  // Build result: one entry per day in range
  const result: WritingVelocity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = toDateStr(now - i * 24 * 60 * 60 * 1000);
    const bucket = byDate.get(date);
    if (bucket) {
      // Estimate active minutes: use session durations, or fall back to time span / sessions
      let activeMinutes = 0;
      if (bucket.sessions.size > 0) {
        for (const sid of bucket.sessions) {
          const start = sessionStarts.get(sid);
          const end = sessionEnds.get(sid);
          if (start !== undefined && end !== undefined) {
            activeMinutes += Math.round((end - start) / 60_000);
          } else if (start !== undefined) {
            // Session not ended — use bucket maxTs as proxy
            activeMinutes += Math.min(120, Math.round((bucket.maxTs - start) / 60_000));
          }
        }
      } else {
        // No session info — rough estimate from time span
        activeMinutes = Math.min(480, Math.round((bucket.maxTs - bucket.minTs) / 60_000));
      }

      result.push({
        date,
        wordsWritten: bucket.written,
        wordsDeleted: bucket.deleted,
        netWords: bucket.written - bucket.deleted,
        sessionsCount: bucket.sessions.size,
        activeMinutes,
      });
    } else {
      result.push({
        date,
        wordsWritten: 0,
        wordsDeleted: 0,
        netWords: 0,
        sessionsCount: 0,
        activeMinutes: 0,
      });
    }
  }

  return result;
}

/**
 * Categorize current writing velocity.
 */
export function getCurrentVelocity(
  wordsPerDay: number
): 'high' | 'moderate' | 'low' | 'stalled' {
  if (wordsPerDay >= 500) return 'high';
  if (wordsPerDay >= 100) return 'moderate';
  if (wordsPerDay >= 10) return 'low';
  return 'stalled';
}

// ============================================================
// Insight Generation
// ============================================================

/**
 * Generate insights from memory events and current thesis data.
 * Implements 8+ pattern-detection rules.
 */
export function generateInsights(
  events: MemoryEvent[],
  thesis: ThesisData
): MemoryInsight[] {
  const insights: MemoryInsight[] = [];
  const now = Date.now();

  // Only look at events from the last 14 days for most patterns
  const recentWindow = 14 * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter((e) => e.timestamp >= now - recentWindow);
  // Extended window (30 days) for streak detection
  const streakEvents = events.filter((e) => e.timestamp >= now - 30 * 24 * 60 * 60 * 1000);

  // ── Rule 1: Stagnation ──
  // Same chapter edited 5+ sessions without +100 words total
  const stagnationInsight = detectStagnation(recentEvents);
  if (stagnationInsight) insights.push(stagnationInsight);

  // ── Rule 2: Score Regression ──
  // Score dropped > 10 since last session
  const regressionInsight = detectScoreRegression(recentEvents);
  if (regressionInsight) insights.push(regressionInsight);

  // ── Rule 3: Reference Hoarding ──
  // 8+ refs added, 0 content increase
  const hoardingInsight = detectReferenceHoarding(recentEvents);
  if (hoardingInsight) insights.push(hoardingInsight);

  // ── Rule 4: First Chapter Done ──
  // Any chapter > 90% of target word count
  const chapterDoneInsight = detectFirstChapterDone(events, thesis);
  if (chapterDoneInsight) insights.push(chapterDoneInsight);

  // ── Rule 5: Draft Complete ──
  // Total words > min for thesis type
  const draftCompleteInsight = detectDraftComplete(thesis);
  if (draftCompleteInsight) insights.push(draftCompleteInsight);

  // ── Rule 6: Writing Streak ──
  // 3+ consecutive days with > 50 words
  const streakInsight = detectWritingStreak(streakEvents);
  if (streakInsight) insights.push(streakInsight);

  // ── Rule 7: Citation Coverage ──
  // All chapters have ≥ 1 citation
  const citationInsight = detectCitationCoverage(thesis, events);
  if (citationInsight) insights.push(citationInsight);

  // ── Rule 8: Score Milestone ──
  // Score crosses 50, 70, or 90 for first time
  const milestoneInsights = detectScoreMilestones(events);
  insights.push(...milestoneInsights);

  // ── Rule 9: Session Length Warning ──
  // Very long session without significant progress (bonus rule)
  const sessionLengthInsight = detectLongSessionWarning(recentEvents);
  if (sessionLengthInsight) insights.push(sessionLengthInsight);

  // ── Rule 10: Rapid Deletion ──
  // More words deleted than written in a session (bonus rule)
  const rapidDeletionInsight = detectRapidDeletion(recentEvents);
  if (rapidDeletionInsight) insights.push(rapidDeletionInsight);

  return insights;
}

// ── Insight Rule Implementations ──

/**
 * Rule 1: Detect chapters that have been edited across 5+ sessions
 * without a cumulative word count increase of 100+ words.
 */
function detectStagnation(events: MemoryEvent[]): MemoryInsight | null {
  // Collect per-chapter word deltas grouped by session
  const chapterSessions = new Map<string, Set<string>>();
  const chapterWordDeltas = new Map<string, number>();

  let currentSessionId: string | null = null;
  for (const e of events) {
    if (e.kind === 'session-start' && e.data.sessionId) {
      currentSessionId = e.data.sessionId as string;
    }
    if (e.kind === 'session-end') {
      currentSessionId = null;
    }
    if (e.kind === 'word-count-delta' && e.data.chapterId && currentSessionId) {
      const chId = e.data.chapterId as string;
      const delta = (e.data.delta as number) || 0;

      if (!chapterSessions.has(chId)) chapterSessions.set(chId, new Set());
      chapterSessions.get(chId)!.add(currentSessionId);

      if (!chapterWordDeltas.has(chId)) chapterWordDeltas.set(chId, 0);
      chapterWordDeltas.set(chId, chapterWordDeltas.get(chId)! + delta);
    }
  }

  for (const [chId, sessions] of chapterSessions) {
    if (sessions.size >= 5) {
      const netDelta = chapterWordDeltas.get(chId) || 0;
      if (netDelta < 100) {
        // Find chapter title from a recent word-count-delta event
        const latestEvent = events
          .filter((e) => e.kind === 'word-count-delta' && e.data.chapterId === chId)
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        const chapterTitle = (latestEvent?.data.chapterTitle as string) || chId;
        return {
          id: generateId(),
          type: 'warning',
          message: `Consider restructuring "${chapterTitle}" — you've been editing it across ${sessions.size} sessions without increasing content significantly.`,
          data: { chapterId: chId, chapterTitle, sessionsCount: sessions.size, netWords: netDelta },
          timestamp: Date.now(),
        };
      }
    }
  }
  return null;
}

/**
 * Rule 2: Detect score drops > 10 points since last session.
 */
function detectScoreRegression(events: MemoryEvent[]): MemoryInsight | null {
  // Find the last two score-change events
  const scoreEvents = events
    .filter((e) => e.kind === 'score-change')
    .sort((a, b) => b.timestamp - a.timestamp);

  if (scoreEvents.length < 2) return null;

  const latest = scoreEvents[0];
  const previous = scoreEvents[1];

  const latestScore = latest.data.score as number;
  const previousScore = previous.data.score as number;
  const drop = previousScore - latestScore;

  if (drop > 10) {
    return {
      id: generateId(),
      type: 'warning',
      message: `Your completeness score dropped ${drop} points since your last session (from ${previousScore} to ${latestScore}). Review recent changes.`,
      data: { from: previousScore, to: latestScore, drop },
      timestamp: Date.now(),
    };
  }
  return null;
}

/**
 * Rule 3: Detect 8+ references added without content increase.
 */
function detectReferenceHoarding(events: MemoryEvent[]): MemoryInsight | null {
  const recentWindow = 24 * 60 * 60 * 1000; // Last 24 hours
  const recent = events.filter((e) => e.timestamp >= Date.now() - recentWindow);

  const refsAdded = recent.filter((e) => e.kind === 'reference-added').length;
  const wordDeltas = recent.filter((e) => e.kind === 'word-count-delta');
  const totalWordIncrease = wordDeltas.reduce(
    (sum, e) => sum + Math.max(0, (e.data.delta as number) || 0), 0
  );

  if (refsAdded >= 8 && totalWordIncrease === 0) {
    return {
      id: generateId(),
      type: 'tip',
      message: `You've added ${refsAdded} references without increasing chapter content — consider integrating them into your text.`,
      data: { refsAdded, wordIncrease: totalWordIncrease },
      timestamp: Date.now(),
    };
  }
  return null;
}

/**
 * Rule 4: Detect when any chapter reaches 90% of its target word count.
 * Only triggers once per chapter (using an existing quality-gate-pass event as seen flag).
 */
function detectFirstChapterDone(
  events: MemoryEvent[],
  thesis: ThesisData
): MemoryInsight | null {
  const alreadyAchieved = new Set<string>();
  // Check for existing achievement events to avoid duplicates
  for (const e of events) {
    if (e.kind === 'quality-gate-pass' && e.data.rule === 'first-chapter-done') {
      alreadyAchieved.add(e.data.chapterId as string);
    }
  }

  for (const ch of thesis.chapters) {
    if (alreadyAchieved.has(ch.id)) continue;

    const wordCount = countWords(ch.content) +
      ch.subSections.reduce((sum, ss) => sum + countWords(ss.content), 0);
    const target = getChapterTarget(ch.title);

    if (wordCount >= target * 0.9) {
      return {
        id: generateId(),
        type: 'achievement',
        message: `"${ch.title}" is looking complete (${wordCount.toLocaleString()} words — ${Math.round((wordCount / target) * 100)}% of target)! Nice milestone.`,
        data: { chapterId: ch.id, chapterTitle: ch.title, words: wordCount, target, pct: Math.round((wordCount / target) * 100) },
        timestamp: Date.now(),
      };
    }
  }
  return null;
}

/**
 * Rule 5: Detect when total word count exceeds minimum for thesis type.
 */
function detectDraftComplete(thesis: ThesisData): MemoryInsight | null {
  const totalWords = thesis.chapters.reduce(
    (sum, ch) =>
      sum +
      countWords(ch.content) +
      ch.subSections.reduce((s, ss) => s + countWords(ss.content), 0),
    0
  );

  const minimum = MIN_WORD_COUNTS[thesis.type];
  if (totalWords >= minimum) {
    return {
      id: generateId(),
      type: 'achievement',
      message: `You've reached ${totalWords.toLocaleString()} words — the minimum for a ${thesis.type} thesis! First draft complete.`,
      data: { words: totalWords, minimum, type: thesis.type },
      timestamp: Date.now(),
    };
  }
  return null;
}

/**
 * Rule 6: Detect writing streaks — 3+ consecutive days with > 50 net words.
 */
function detectWritingStreak(events: MemoryEvent[]): MemoryInsight | null {
  // Build a set of active dates with > 50 net words
  const dailyNet = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'word-count-delta') {
      const date = toDateStr(e.timestamp);
      const delta = (e.data.delta as number) || 0;
      dailyNet.set(date, (dailyNet.get(date) || 0) + delta);
    }
  }

  // Get sorted unique dates
  const activeDates = [...dailyNet.entries()]
    .filter(([, net]) => net > 50)
    .map(([date]) => date)
    .sort();

  if (activeDates.length < 3) return null;

  // Find longest consecutive streak ending today or yesterday
  const today = toDateStr(Date.now());
  const yesterday = toDateStr(Date.now() - 24 * 60 * 60 * 1000);

  let bestStreak = 0;
  let bestEnd = '';

  let currentStreak = 0;
  let prevDate = '';

  for (const date of activeDates) {
    if (prevDate) {
      const prev = new Date(prevDate);
      const curr = new Date(date);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    prevDate = date;

    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
      bestEnd = date;
    }
  }

  // Only show if streak is recent (ends today or yesterday)
  if (bestStreak >= 3 && (bestEnd === today || bestEnd === yesterday)) {
    return {
      id: generateId(),
      type: 'achievement',
      message: `You've been writing for ${bestStreak} consecutive days! Keep the momentum going.`,
      data: { streak: bestStreak, endDate: bestEnd },
      timestamp: Date.now(),
    };
  }
  return null;
}

/**
 * Rule 7: Detect when all chapters have at least one citation.
 */
function detectCitationCoverage(
  thesis: ThesisData,
  events: MemoryEvent[]
): MemoryInsight | null {
  if (thesis.chapters.length === 0) return null;

  // Check if we already showed this achievement
  const alreadyShown = events.some(
    (e) => e.kind === 'quality-gate-pass' && e.data.rule === 'full-citation-coverage'
  );
  if (alreadyShown) return null;

  const citationPattern = /\\cite(?:p|t|author|year|alp|num)?\{/;
  let chaptersWithCitations = 0;

  for (const ch of thesis.chapters) {
    const fullText = [
      ch.content || '',
      ...ch.subSections.map((ss) => ss.content || ''),
    ].join(' ');
    if (citationPattern.test(fullText)) {
      chaptersWithCitations++;
    }
  }

  if (chaptersWithCitations === thesis.chapters.length) {
    return {
      id: generateId(),
      type: 'achievement',
      message: 'Every chapter now has citations. Your argumentation is well-supported.',
      data: { chapters: thesis.chapters.length },
      timestamp: Date.now(),
    };
  }
  return null;
}

/**
 * Rule 8: Detect when score crosses 50, 70, or 90 for the first time.
 * Can produce multiple milestones.
 */
function detectScoreMilestones(events: MemoryEvent[]): MemoryInsight[] {
  const milestones: number[] = [50, 70, 90];
  const insights: MemoryInsight[] = [];

  // Collect all score-change events sorted by timestamp
  const scoreEvents = events
    .filter((e) => e.kind === 'score-change')
    .sort((a, b) => a.timestamp - b.timestamp);

  if (scoreEvents.length === 0) return insights;

  // Collect already-achieved milestones
  const achievedMilestones = new Set<number>();
  for (const e of events) {
    if (e.kind === 'quality-gate-pass' && e.data.rule === 'score-milestone') {
      achievedMilestones.add(e.data.milestone as number);
    }
  }

  // Find the highest score ever achieved
  let highestScore = 0;
  for (const e of scoreEvents) {
    const score = e.data.score as number;
    if (score > highestScore) {
      for (const m of milestones) {
        if (score >= m && highestScore < m && !achievedMilestones.has(m)) {
          const encouragement =
            m === 50
              ? "You're halfway there — keep filling in the details!"
              : m === 70
                ? 'Almost done! Just a few more fields to complete.'
                : 'Excellent work! Your thesis is looking publication-ready.';

          insights.push({
            id: generateId(),
            type: 'achievement',
            message: `Completeness score reached ${m}! ${encouragement}`,
            data: { milestone: m, score },
            timestamp: Date.now(),
          });
        }
      }
      highestScore = score;
    }
  }

  return insights;
}

/**
 * Rule 9 (bonus): Detect very long sessions (>60 min) with <50 words added.
 */
function detectLongSessionWarning(events: MemoryEvent[]): MemoryInsight | null {
  const sessionStartMap = new Map<string, number>();
  const sessionWordDeltas = new Map<string, number>();

  for (const e of events) {
    if (e.kind === 'session-start' && e.data.sessionId) {
      sessionStartMap.set(e.data.sessionId as string, e.timestamp);
    }
    if (e.kind === 'word-count-delta' && e.data.sessionId) {
      const sid = e.data.sessionId as string;
      sessionWordDeltas.set(
        sid,
        (sessionWordDeltas.get(sid) || 0) + ((e.data.delta as number) || 0)
      );
    }
  }

  // Only check the most recent session
  const recentStart = events
    .filter((e) => e.kind === 'session-start')
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!recentStart) return null;
  const sid = recentStart.data.sessionId as string;
  const startTime = sessionStartMap.get(sid);
  if (!startTime) return null;

  const elapsed = (Date.now() - startTime) / 60_000; // minutes
  const wordsAdded = sessionWordDeltas.get(sid) || 0;

  if (elapsed > 60 && wordsAdded < 50) {
    return {
      id: generateId(),
      type: 'tip',
      message: `You've been working for ${Math.round(elapsed)} minutes with only ${wordsAdded} words added. Consider taking a break or switching tasks.`,
      data: { sessionId: sid, elapsedMinutes: Math.round(elapsed), wordsAdded },
      timestamp: Date.now(),
    };
  }
  return null;
}

/**
 * Rule 10 (bonus): Detect sessions where more words were deleted than written.
 */
function detectRapidDeletion(events: MemoryEvent[]): MemoryInsight | null {
  // Group word deltas by session
  const sessionDeltas = new Map<string, { added: number; deleted: number }>();

  let currentSessionId: string | null = null;
  for (const e of events) {
    if (e.kind === 'session-start' && e.data.sessionId) {
      currentSessionId = e.data.sessionId as string;
    }
    if (e.kind === 'session-end') {
      currentSessionId = null;
    }
    if (e.kind === 'word-count-delta' && currentSessionId) {
      if (!sessionDeltas.has(currentSessionId)) {
        sessionDeltas.set(currentSessionId, { added: 0, deleted: 0 });
      }
      const bucket = sessionDeltas.get(currentSessionId)!;
      const delta = (e.data.delta as number) || 0;
      if (delta > 0) bucket.added += delta;
      else bucket.deleted += Math.abs(delta);
    }
  }

  // Check the most recent session with activity
  const recentDeltas = [...sessionDeltas.entries()]
    .filter(([, d]) => d.deleted > 0)
    .sort((a, b) => {
      // Sort by finding the session's latest event timestamp
      const aLatest = events
        .filter((e) => e.data.sessionId === a[0])
        .sort((x, y) => y.timestamp - x.timestamp)[0]?.timestamp || 0;
      const bLatest = events
        .filter((e) => e.data.sessionId === b[0])
        .sort((x, y) => y.timestamp - x.timestamp)[0]?.timestamp || 0;
      return bLatest - aLatest;
    });

  if (recentDeltas.length === 0) return null;

  const [, latest] = recentDeltas[0];
  if (latest.deleted > latest.added && latest.deleted > 200) {
    return {
      id: generateId(),
      type: 'tip',
      message: `In your recent session, you deleted ${latest.deleted} words while adding ${latest.added}. Restructuring? Make sure you don't lose important content.`,
      data: { wordsAdded: latest.added, wordsDeleted: latest.deleted },
      timestamp: Date.now(),
    };
  }
  return null;
}

// ============================================================
// Session Summary
// ============================================================

/**
 * Start a new writing session.
 */
export function startSession(): SessionSummary {
  return {
    sessionId: generateId(),
    startedAt: Date.now(),
    endedAt: null,
    wordsAdded: 0,
    wordsDeleted: 0,
    chaptersModified: [],
    referencesAdded: 0,
    scoreChange: null,
    events: 0,
  };
}

/**
 * End a session and compute final summary from events.
 */
export function endSession(
  summary: SessionSummary,
  events: MemoryEvent[]
): SessionSummary {
  const delta = computeSessionDelta(events);
  return {
    ...summary,
    endedAt: Date.now(),
    wordsAdded: delta.wordsAdded,
    wordsDeleted: delta.wordsDeleted,
    chaptersModified: delta.chaptersModified,
    referencesAdded: delta.referencesAdded,
    scoreChange: delta.scoreChange,
    events: events.length,
  };
}

/**
 * Compute session delta from events that occurred during a session.
 * Filters events by session ID or by timestamp range.
 */
export function computeSessionDelta(
  events: MemoryEvent[]
): {
  wordsAdded: number;
  wordsDeleted: number;
  chaptersModified: string[];
  referencesAdded: number;
  scoreChange: { from: number; to: number } | null;
} {
  let wordsAdded = 0;
  let wordsDeleted = 0;
  const chaptersModifiedSet = new Set<string>();
  let referencesAdded = 0;
  let scoreChange: { from: number; to: number } | null = null;

  const scoreValues: number[] = [];

  for (const e of events) {
    switch (e.kind) {
      case 'word-count-delta': {
        const delta = (e.data.delta as number) || 0;
        if (delta > 0) wordsAdded += delta;
        else wordsDeleted += Math.abs(delta);
        if (e.data.chapterId) chaptersModifiedSet.add(e.data.chapterId as string);
        break;
      }
      case 'chapter-added':
      case 'chapter-retitled':
      case 'chapter-removed': {
        if (e.data.chapterId) chaptersModifiedSet.add(e.data.chapterId as string);
        break;
      }
      case 'reference-added': {
        referencesAdded++;
        break;
      }
      case 'score-change': {
        if (typeof e.data.score === 'number') {
          scoreValues.push(e.data.score);
        }
        break;
      }
    }
  }

  if (scoreValues.length >= 2) {
    // Score changed during session — use first and last values
    const sortedScores = [...scoreValues];
    scoreChange = { from: sortedScores[0], to: sortedScores[sortedScores.length - 1] };
  } else if (scoreValues.length === 1) {
    // Only one score event — compare with previous session
    scoreChange = { from: scoreValues[0], to: scoreValues[0] };
  }

  return {
    wordsAdded,
    wordsDeleted,
    chaptersModified: [...chaptersModifiedSet],
    referencesAdded,
    scoreChange,
  };
}

// ============================================================
// Previous Session Summary (for Toast on Session Start)
// ============================================================

/**
 * Get a summary of the previous session for display as a toast.
 * Looks for the last session-end event and its preceding session-start.
 */
export function getPreviousSessionSummary(events: MemoryEvent[]): {
  wordsDelta: number;
  chaptersChanged: number;
  scoreDelta: { from: number; to: number } | null;
} | null {
  if (events.length === 0) return null;

  // Find the most recent session-end event
  const sessionEnds = events
    .filter((e) => e.kind === 'session-end')
    .sort((a, b) => b.timestamp - a.timestamp);

  if (sessionEnds.length === 0) return null;

  const lastEnd = sessionEnds[0];
  const sessionId = lastEnd.data.sessionId as string;
  if (!sessionId) return null;

  // Find the matching session-start
  const sessionStart = events.find(
    (e) => e.kind === 'session-start' && e.data.sessionId === sessionId
  );
  if (!sessionStart) return null;

  // Collect all events between session start and end
  const sessionEvents = events.filter(
    (e) => e.timestamp >= sessionStart.timestamp && e.timestamp <= lastEnd.timestamp
  );

  const delta = computeSessionDelta(sessionEvents);

  return {
    wordsDelta: delta.wordsAdded - delta.wordsDeleted,
    chaptersChanged: delta.chaptersModified.length,
    scoreDelta: delta.scoreChange,
  };
}

// ============================================================
// Export History
// ============================================================

/**
 * Record a thesis export as a memory event.
 */
export function recordExport(
  score: number,
  wordCount: number
): MemoryEvent {
  return createMemoryEvent('export-performed', { score, wordCount });
}

/**
 * Extract export history from all memory events.
 */
export function getExportHistory(
  events: MemoryEvent[]
): ThesisMemoryState['exportHistory'] {
  return events
    .filter((e) => e.kind === 'export-performed')
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((e) => ({
      timestamp: e.timestamp,
      qualityScore: (e.data.score as number) || 0,
      wordCount: (e.data.wordCount as number) || 0,
    }));
}

// ============================================================
// Full State Builder
// ============================================================

/**
 * Build the full ThesisMemoryState from events + current session + thesis data.
 */
export function buildMemoryState(
  events: MemoryEvent[],
  currentSession: SessionSummary | null,
  thesis: ThesisData
): ThesisMemoryState {
  return {
    events,
    currentSession,
    velocity: computeVelocity(events),
    insights: generateInsights(events, thesis),
    exportHistory: getExportHistory(events),
  };
}
