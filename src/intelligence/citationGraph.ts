// ============================================================
// ThesisForge Intelligence — Algorithm 5: Citation Graph Analyzer
// Build a bipartite graph of \cite{} keys → reference keys.
// Detect orphans: cited but undefined, defined but never cited.
// Detect citation clusters and chapters without citations.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { CitationGraphResult } from './types';
import type { ThesisReference, ThesisChapter } from '@/lib/thesis-types';
import { generateCiteKey } from '@/core/bib';

/**
 * Build the citation graph and find mismatches between
 * cited keys in chapter bodies and defined reference keys.
 *
 * Features:
 * - Full bipartite graph: chapters → citations → references
 * - Per-chapter citation counts
 * - Chapters with zero citations (critical warning)
 * - References never cited (orphans)
 * - Citation clusters suggesting missing related work
 * - DOT format export for graph visualization
 *
 * Edge cases:
 * - No chapters → empty graph, no undefined citations
 * - No references → all citations are undefined
 * - Chapters with no \cite commands → empty citedKeys per chapter
 * - References with no title/author → generateCiteKey still produces a key
 *
 * Performance budget: < 4ms for up to 50 chapters + 50 references
 */
export function buildCitationGraph(
  chapters: Array<{ id?: string; title?: string; content: string; subSections?: Array<{ content: string }> }>,
  references: ThesisReference[]
): CitationGraphResult {
  // Extract all \cite{key} and \cite{key1,key2} from chapter bodies
  const citedKeys = new Set<string>();
  const citationPattern =
    /\\cite(?:p|t|author|year|alp|num)?\{([^}]+)\}/g;

  // Track per-chapter citations: chapterId → Set<key>
  const chapterCitations = new Map<string, Set<string>>();
  // Track reference → chapters: key → Set<chapterId>
  const refToChapters = new Map<string, Set<string>>();

  for (const ch of chapters) {
    const chapterId = ch.id || '';
    const chapterKeys = new Set<string>();

    // Search in chapter content
    const body = ch.content || '';
    let match: RegExpExecArray | null;

    // Reset lastIndex for reuse of global regex
    citationPattern.lastIndex = 0;
    while ((match = citationPattern.exec(body)) !== null) {
      match[1]
        .split(',')
        .map((k) => k.trim())
        .forEach((k) => {
          if (k) {
            citedKeys.add(k);
            chapterKeys.add(k);
            // Track which chapters cite each reference
            if (!refToChapters.has(k)) refToChapters.set(k, new Set());
            refToChapters.get(k)!.add(chapterId);
          }
        });
    }

    // Search in subsections too
    if (ch.subSections) {
      for (const ss of ch.subSections) {
        const subBody = ss.content || '';
        citationPattern.lastIndex = 0;
        while ((match = citationPattern.exec(subBody)) !== null) {
          match[1]
            .split(',')
            .map((k) => k.trim())
            .forEach((k) => {
              if (k) {
                citedKeys.add(k);
                chapterKeys.add(k);
                if (!refToChapters.has(k)) refToChapters.set(k, new Set());
                refToChapters.get(k)!.add(chapterId);
              }
            });
        }
      }
    }

    if (chapterId) {
      chapterCitations.set(chapterId, chapterKeys);
    }
  }

  // Generate cite keys for all references
  const refKeys = new Map<string, string>();
  for (const ref of references) {
    const key = generateCiteKeyFromRef(ref);
    refKeys.set(ref.id, key);
  }

  const definedKeys = new Set(refKeys.values());

  // Per-chapter citation counts (Map<string, number>)
  const perChapterCitations = new Map<string, number>();
  for (const [chapterId, keys] of chapterCitations) {
    perChapterCitations.set(chapterId, keys.size);
  }

  // Chapters with zero citations (critical warning)
  const chaptersWithoutCitations: string[] = [];
  for (const ch of chapters) {
    const chapterId = ch.id || '';
    if (chapterId) {
      const count = perChapterCitations.get(chapterId) || 0;
      if (count === 0 && (ch.content || '').trim().length > 50) {
        chaptersWithoutCitations.push(chapterId);
      }
    }
  }

  // Citation clusters: references cited together across multiple chapters
  // This can suggest related work patterns
  const citationClusters: CitationGraphResult['citationClusters'] = [];
  for (const [key, chapterIds] of refToChapters) {
    if (chapterIds.size >= 2) {
      citationClusters.push({
        referenceKey: key,
        chapterIds: [...chapterIds],
        count: chapterIds.size,
      });
    }
  }
  // Sort clusters by count descending
  citationClusters.sort((a, b) => b.count - a.count);

  // Build DOT export function
  function exportAsDot(): string {
    const lines: string[] = [];
    lines.push('digraph CitationGraph {');
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');
    lines.push('');

    // Chapter nodes
    lines.push('  // Chapters');
    for (const ch of chapters) {
      const chId = ch.id || 'unknown';
      const chTitle = (ch.title || chId).replace(/"/g, '\\"');
      const citationCount = perChapterCitations.get(chId) || 0;
      const color = citationCount === 0 ? 'red' : 'lightblue';
      lines.push(`  "ch_${chId}" [label="${chTitle}\\n(${citationCount} citations)", style=filled, fillcolor=${color}];`);
    }
    lines.push('');

    // Reference nodes
    lines.push('  // References');
    for (const [refId, key] of refKeys) {
      const isOrphan = !citedKeys.has(key);
      const isUndefined = !definedKeys.has(key);
      let color = 'lightgreen';
      let label = key;
      if (isOrphan) {
        color = 'orange';
        label = `${key} (uncited)`;
      }
      if (isUndefined) {
        color = 'red';
        label = `${key} (undefined)`;
      }
      lines.push(`  "ref_${key}" [label="${label}", style=filled, fillcolor=${color}];`);
    }
    lines.push('');

    // Edges: chapters → references
    lines.push('  // Citation edges');
    for (const [chapterId, keys] of chapterCitations) {
      for (const key of keys) {
        lines.push(`  "ch_${chapterId}" -> "ref_${key}";`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  return {
    citedKeys,
    definedKeys,

    // Cited but not defined → LaTeX undefined citation error
    undefinedCitations: [...citedKeys].filter((k) => !definedKeys.has(k)),

    // Defined but never cited → unused reference (warning, not error)
    uncitedReferences: [...definedKeys].filter((k) => !citedKeys.has(k)),

    // Stats
    totalCitations: citedKeys.size,
    totalReferences: definedKeys.size,
    citationRatio:
      definedKeys.size > 0
        ? Math.round((citedKeys.size / definedKeys.size) * 100)
        : 0,

    // New fields
    perChapterCitations,
    chaptersWithoutCitations,
    citationClusters,
    exportAsDot,
  };
}

/**
 * Deduplicate cite keys by appending letters (a, b, c, ...) to duplicates.
 * Returns a new array with unique cite keys assigned.
 */
export function deduplicateCiteKeys(
  references: ThesisReference[]
): Array<ThesisReference & { citeKey: string }> {
  const seen: Record<string, number> = {};
  return references.map((ref) => {
    let key = generateCiteKeyFromRef(ref);
    if (seen[key] !== undefined) {
      seen[key]++;
      key = `${key}${String.fromCharCode(96 + seen[key])}`; // smith2021a, smith2021b
    } else {
      seen[key] = 0;
    }
    return { ...ref, citeKey: key };
  });
}

/**
 * Generate a cite key from a ThesisReference using the same logic as bib.ts.
 */
function generateCiteKeyFromRef(ref: ThesisReference): string {
  // Use the existing generateCiteKey from bib.ts by converting to its expected format
  return generateCiteKey({
    authors: ref.authors || '',
    title: ref.title || '',
    year: ref.year || '',
  });
}
