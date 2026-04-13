// ============================================================
// ThesisForge Intelligence — Algorithm 11: Acronym Consistency Checker
// Detects acronyms used without being defined on first use.
// Pure function: input → result. No side effects.
// ============================================================

export interface AcronymIssue {
  acronym: string;
  firstUse: string;
  defined: boolean;
  chapters: string[];
}

const ACRONYM_RE = /\b([A-Z]{2,6})\b/g;
const DEFINITION_RE = /\b[A-Z][a-z]+(?: [A-Za-z]+){1,5}\s+\(([A-Z]{2,6})\)|\b([A-Z]{2,6})\s+\([A-Z][a-z].+?\)/g;
const SKIP_WORDS = new Set(['I', 'A', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'X']);

export function checkAcronyms(
  chapters: Array<{ id: string; title: string; body: string }>
): AcronymIssue[] {
  const defined = new Set<string>();
  const firstSeen: Record<string, string> = {};
  const allChapters: Record<string, string[]> = {};

  for (const ch of chapters) {
    let defMatch;
    DEFINITION_RE.lastIndex = 0;
    while ((defMatch = DEFINITION_RE.exec(ch.body)) !== null) {
      const acronym = defMatch[1] || defMatch[2];
      if (acronym && acronym.length >= 2) defined.add(acronym);
    }

    ACRONYM_RE.lastIndex = 0;
    let match;
    while ((match = ACRONYM_RE.exec(ch.body)) !== null) {
      const acronym = match[1];
      if (acronym.length < 2 || SKIP_WORDS.has(acronym)) continue;
      if (!firstSeen[acronym]) firstSeen[acronym] = ch.id;
      if (!allChapters[acronym]) allChapters[acronym] = [];
      if (!allChapters[acronym].includes(ch.id)) allChapters[acronym].push(ch.id);
    }
  }

  return Object.entries(firstSeen)
    .filter(
      ([acronym]) =>
        !defined.has(acronym) && (allChapters[acronym]?.length || 0) > 1
    )
    .map(([acronym, firstChapter]) => ({
      acronym,
      firstUse: firstChapter,
      defined: false,
      chapters: allChapters[acronym] || [],
    }))
    .slice(0, 15);
}
