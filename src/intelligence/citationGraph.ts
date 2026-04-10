// ============================================================
// ThesisForge Intelligence — Algorithm 5: Citation Graph Analyzer
// Build a bipartite graph of \cite{} keys → reference keys.
// Detect orphans: cited but undefined, defined but never cited.
// Pure function. No side effects. No DOM access.
// ============================================================

import type { CitationGraphResult } from './types';
import type { ThesisReference } from '@/lib/thesis-types';
import { generateCiteKey } from '@/core/bib';

/**
 * Build the citation graph and find mismatches between
 * cited keys in chapter bodies and defined reference keys.
 *
 * Edge cases:
 * - No chapters → empty graph, no undefined citations
 * - No references → all citations are undefined
 * - Chapters with no \cite commands → empty citedKeys
 * - References with no title/author → generateCiteKey still produces a key
 *
 * Performance budget: < 4ms for up to 50 chapters + 50 references
 */
export function buildCitationGraph(
  chapters: Array<{ content: string; subSections?: Array<{ content: string }> }>,
  references: ThesisReference[]
): CitationGraphResult {
  // Extract all \cite{key} and \cite{key1,key2} from chapter bodies
  const citedKeys = new Set<string>();
  const citationPattern =
    /\\cite(?:p|t|author|year|alp|num)?\{([^}]+)\}/g;

  for (const ch of chapters) {
    // Search in chapter content
    let match: RegExpExecArray | null;
    const body = ch.content || '';
    while ((match = citationPattern.exec(body)) !== null) {
      match[1]
        .split(',')
        .map((k) => k.trim())
        .forEach((k) => {
          if (k) citedKeys.add(k);
        });
    }

    // Search in subsections too
    if (ch.subSections) {
      for (const ss of ch.subSections) {
        const subBody = ss.content || '';
        while ((match = citationPattern.exec(subBody)) !== null) {
          match[1]
            .split(',')
            .map((k) => k.trim())
            .forEach((k) => {
              if (k) citedKeys.add(k);
            });
        }
      }
    }
  }

  // Generate cite keys for all references
  const refKeys = new Map<string, string>();
  for (const ref of references) {
    const key = generateCiteKeyFromRef(ref);
    refKeys.set(ref.id, key);
  }

  const definedKeys = new Set(refKeys.values());

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
