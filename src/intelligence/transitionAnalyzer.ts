// ============================================================
// ThesisForge Intelligence — Algorithm 10: Transition Word Analyzer
// Detects low transition word density in chapters.
// Pure function: input → result. No side effects.
// ============================================================

export interface TransitionResult {
  chapterId: string;
  chapterTitle: string;
  transitionCount: number;
  density: number;
  wordCount: number;
  status: 'low' | 'ok' | 'high';
  suggestion: string | null;
}

const TRANSITION_WORDS = new Set([
  'however', 'therefore', 'furthermore', 'moreover', 'consequently',
  'additionally', 'nevertheless', 'nonetheless', 'subsequently', 'thus',
  'hence', 'accordingly', 'meanwhile', 'conversely', 'similarly',
  'in contrast', 'in addition', 'as a result', 'for example', 'for instance',
  'in conclusion', 'to summarize', 'in summary', 'finally', 'firstly',
  'secondly', 'thirdly', 'in particular', 'specifically', 'notably',
]);

export function analyzeTransitions(
  chapters: Array<{ id: string; title: string; body: string }>
): TransitionResult[] {
  return chapters
    .map((ch) => {
      const words = (ch.body || '').toLowerCase().split(/\s+/);
      const wordCount = words.length;
      if (wordCount < 100) return null;

      let transitionCount = 0;
      const bodyLower = ch.body.toLowerCase();
      TRANSITION_WORDS.forEach((tw) => {
        const regex = new RegExp(`\\b${tw}\\b`, 'gi');
        const matches = bodyLower.match(regex);
        if (matches) transitionCount += matches.length;
      });

      const density = transitionCount / (wordCount / 100);

      return {
        chapterId: ch.id,
        chapterTitle: ch.title,
        transitionCount,
        density: Math.round(density * 10) / 10,
        wordCount,
        status: density < 1.0 ? ('low' as const) : density > 5.0 ? ('high' as const) : ('ok' as const),
        suggestion:
          density < 1.0
            ? 'Consider adding transition words to improve chapter flow.'
            : null,
      };
    })
    .filter((r): r is TransitionResult => r !== null);
}
