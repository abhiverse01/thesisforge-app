// ============================================================
// ThesisForge Intelligence — Algorithm 9: Passive Voice Detector
// Detects overuse of passive voice in academic writing.
// Pure function: input → result. No side effects.
// ============================================================

export interface PassiveVoiceResult {
  chapterId: string;
  chapterTitle: string;
  passiveCount: number;
  totalSentences: number;
  passiveRatio: number;
  examples: string[];
  status: 'ok' | 'high' | 'very-high';
}

const PASSIVE_PATTERNS = [
  /\b(is|are|was|were|be|been|being)\s+(being\s+)?\w+ed\b/gi,
  /\b(is|are|was|were)\s+\w+en\b/gi,
  /\b(has|have|had)\s+been\s+\w+ed\b/gi,
  // Get-passives: "got published", "got rejected", "got accepted"
  /\b(got)\s+\w+(ed|en)\b/gi,
  // Irregular past participles after be-verbs
  /\b(was|were)\s+(written|made|taken|given|held|put|set|done|gone|come|become|begun|broken|chosen|driven|frozen|spoken|stolen|worn|borne|sworn|torn)\b/gi,
];

export function detectPassiveVoice(
  chapters: Array<{ id: string; title: string; body: string }>
): PassiveVoiceResult[] {
  return chapters
    .filter((ch) => ch.body && ch.body.trim().length > 100)
    .map((ch) => {
      const sentences = ch.body
        .replace(/\$[^$]+\$/g, '')
        .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
        .split(/[.!?]+\s+/)
        .filter((s) => s.trim().length > 20);

      const passiveSentences = sentences.filter((s) =>
        PASSIVE_PATTERNS.some((p) => {
          p.lastIndex = 0;
          return p.test(s);
        })
      );

      const ratio =
        sentences.length > 0
          ? passiveSentences.length / sentences.length
          : 0;

      return {
        chapterId: ch.id,
        chapterTitle: ch.title,
        passiveCount: passiveSentences.length,
        totalSentences: sentences.length,
        passiveRatio: Math.round(ratio * 100) / 100,
        examples: passiveSentences.slice(0, 3).map((s) => s.trim().slice(0, 120)),
        status: (ratio > 0.4 ? 'very-high' : ratio > 0.25 ? 'high' : 'ok') as PassiveVoiceResult['status'],
      };
    })
    .filter((r) => r.status !== 'ok');
}
