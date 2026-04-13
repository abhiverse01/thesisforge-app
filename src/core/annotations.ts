// ============================================================
// ThesisForge Core — Collaborative Annotation Layer (System 6)
// Pure functions for annotation logic + IndexedDB persistence.
//
// Annotations represent supervisor feedback, self-notes, and
// structured review comments attached to thesis chapters.
//
// CRITICAL: All logic functions are pure. Persistence functions
// delegate to the shared IndexedDB layer from persistence.ts.
// ============================================================

import { getDB } from '@/core/persistence';
import type { IDBPDatabase } from 'idb';

// ============================================================
// Types
// ============================================================

export type AnnotationType = 'comment' | 'suggestion' | 'required-change' | 'praise';
export type AnnotationAuthor = 'Supervisor' | 'Co-supervisor' | 'Self' | string;

export interface Annotation {
  id: string;
  chapterId: string;
  subsectionId?: string;
  anchorText: string;       // first 60 chars of annotated text
  anchorOffset: number;     // character offset in chapter body
  type: AnnotationType;
  author: string;
  body: string;
  resolved: boolean;
  createdAt: number;
  resolvedAt?: number;
}

export interface AnnotationSummary {
  total: number;
  resolved: number;
  byType: Record<AnnotationType, number>;
  byAuthor: Record<string, number>;
  unresolvedRequired: number;  // required-change that aren't resolved
}

export interface AnnotationImportResult {
  imported: number;
  skipped: number;
  conflicts: number;
  details: string[];
}

// ============================================================
// Factory
// ============================================================

/**
 * Create a new Annotation with a unique ID and timestamp.
 */
export function createAnnotation(params: {
  chapterId: string;
  subsectionId?: string;
  anchorText: string;
  anchorOffset: number;
  type: AnnotationType;
  author: string;
  body: string;
}): Annotation {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    chapterId: params.chapterId,
    ...(params.subsectionId !== undefined ? { subsectionId: params.subsectionId } : {}),
    anchorText: params.anchorText,
    anchorOffset: params.anchorOffset,
    type: params.type,
    author: params.author,
    body: params.body,
    resolved: false,
    createdAt: Date.now(),
  };
}

// ============================================================
// Query
// ============================================================

/**
 * Filter annotations belonging to a specific chapter.
 */
export function getAnnotationsForChapter(
  annotations: Annotation[],
  chapterId: string,
): Annotation[] {
  return annotations.filter(a => a.chapterId === chapterId);
}

/**
 * Return only unresolved annotations.
 */
export function getUnresolvedAnnotations(annotations: Annotation[]): Annotation[] {
  return annotations.filter(a => !a.resolved);
}

/**
 * Compute a summary of annotation statistics.
 */
export function computeAnnotationSummary(annotations: Annotation[]): AnnotationSummary {
  const byType: Record<AnnotationType, number> = {
    'comment': 0,
    'suggestion': 0,
    'required-change': 0,
    'praise': 0,
  };
  const byAuthor: Record<string, number> = {};

  let resolved = 0;
  let unresolvedRequired = 0;

  for (const a of annotations) {
    byType[a.type]++;
    byAuthor[a.author] = (byAuthor[a.author] || 0) + 1;

    if (a.resolved) {
      resolved++;
    } else if (a.type === 'required-change') {
      unresolvedRequired++;
    }
  }

  return {
    total: annotations.length,
    resolved,
    byType,
    byAuthor,
    unresolvedRequired,
  };
}

// ============================================================
// Resolution
// ============================================================

/**
 * Mark an annotation as resolved. Returns a new object (immutable).
 */
export function resolveAnnotation(annotation: Annotation): Annotation {
  return {
    ...annotation,
    resolved: true,
    resolvedAt: Date.now(),
  };
}

/**
 * Mark an annotation as unresolved. Returns a new object (immutable).
 */
export function unresolveAnnotation(annotation: Annotation): Annotation {
  return {
    ...annotation,
    resolved: false,
    resolvedAt: undefined,
  };
}

// ============================================================
// Import
// ============================================================

/**
 * Merge incoming annotations into existing ones.
 * Idempotent — running twice with same data creates no duplicates.
 *
 * For each incoming annotation:
 * - If same chapterId + anchorText exists and body differs → conflict (skip)
 * - If same chapterId + anchorText exists and body matches → skip (duplicate)
 * - Otherwise → import
 */
export function importAnnotations(
  existing: Annotation[],
  incoming: Annotation[],
): AnnotationImportResult {
  const result: AnnotationImportResult = {
    imported: 0,
    skipped: 0,
    conflicts: 0,
    details: [],
  };

  // Build a lookup: `${chapterId}::${anchorText}` → annotation
  const lookup = new Map<string, Annotation>();
  for (const a of existing) {
    const key = `${a.chapterId}::${a.anchorText}`;
    lookup.set(key, a);
  }

  const toImport: Annotation[] = [];

  for (const incomingAnn of incoming) {
    const key = `${incomingAnn.chapterId}::${incomingAnn.anchorText}`;
    const existingAnn = lookup.get(key);

    if (existingAnn) {
      if (existingAnn.body !== incomingAnn.body) {
        // Conflict: same anchor but different body
        result.conflicts++;
        result.details.push(
          `Conflict: "${incomingAnn.anchorText.slice(0, 40)}" has conflicting bodies in ${incomingAnn.chapterId}`,
        );
      } else {
        // Duplicate: exact same anchor + body
        result.skipped++;
      }
    } else {
      // New annotation — safe to import
      toImport.push(incomingAnn);
      lookup.set(key, incomingAnn); // Track so later duplicates in incoming are caught
      result.imported++;
    }
  }

  // Mutate existing array in-place (standard array push pattern)
  existing.push(...toImport);

  return result;
}

// ============================================================
// Export to JSON
// ============================================================

/**
 * Serialize annotations to pretty-printed JSON.
 */
export function exportAnnotations(annotations: Annotation[]): string {
  return JSON.stringify(annotations, null, 2);
}

// ============================================================
// Import from JSON
// ============================================================

const REQUIRED_ANNOTATION_FIELDS: ReadonlyArray<keyof Annotation> = [
  'id', 'chapterId', 'anchorText', 'anchorOffset', 'type', 'author', 'body', 'resolved', 'createdAt',
];

/**
 * Parse a JSON string into validated annotations.
 * Each annotation must have all required fields with correct types.
 */
export function parseAnnotations(json: string): {
  annotations: Annotation[];
  errors: string[];
} {
  const annotations: Annotation[] = [];
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    errors.push(`Invalid JSON: ${(err as Error).message}`);
    return { annotations, errors };
  }

  if (!Array.isArray(parsed)) {
    errors.push('JSON root must be an array of annotations');
    return { annotations, errors };
  }

  const validTypes = new Set<string>(['comment', 'suggestion', 'required-change', 'praise']);

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`Index ${i}: not a valid object`);
      continue;
    }

    const obj = item as Record<string, unknown>;
    const fieldErrors: string[] = [];

    // Check required fields exist with correct types
    for (const field of REQUIRED_ANNOTATION_FIELDS) {
      if (obj[field] === undefined) {
        fieldErrors.push(`missing "${field}"`);
        continue;
      }
    }

    // Type-specific validation
    if (typeof obj.id !== 'string' || obj.id.length === 0) {
      fieldErrors.push('id must be a non-empty string');
    }
    if (typeof obj.chapterId !== 'string' || obj.chapterId.length === 0) {
      fieldErrors.push('chapterId must be a non-empty string');
    }
    if (typeof obj.anchorText !== 'string') {
      fieldErrors.push('anchorText must be a string');
    }
    if (typeof obj.anchorOffset !== 'number') {
      fieldErrors.push('anchorOffset must be a number');
    }
    if (!validTypes.has(obj.type as string)) {
      fieldErrors.push(`type must be one of: comment, suggestion, required-change, praise (got "${String(obj.type)}")`);
    }
    if (typeof obj.author !== 'string' || obj.author.length === 0) {
      fieldErrors.push('author must be a non-empty string');
    }
    if (typeof obj.body !== 'string') {
      fieldErrors.push('body must be a string');
    }
    if (typeof obj.resolved !== 'boolean') {
      fieldErrors.push('resolved must be a boolean');
    }
    if (typeof obj.createdAt !== 'number') {
      fieldErrors.push('createdAt must be a number');
    }

    if (fieldErrors.length > 0) {
      errors.push(`Index ${i}: ${fieldErrors.join('; ')}`);
      continue;
    }

    annotations.push({
      id: obj.id as string,
      chapterId: obj.chapterId as string,
      ...(obj.subsectionId !== undefined ? { subsectionId: obj.subsectionId as string } : {}),
      anchorText: obj.anchorText as string,
      anchorOffset: obj.anchorOffset as number,
      type: obj.type as AnnotationType,
      author: obj.author as string,
      body: obj.body as string,
      resolved: obj.resolved as boolean,
      createdAt: obj.createdAt as number,
      ...(obj.resolvedAt !== undefined ? { resolvedAt: obj.resolvedAt as number } : {}),
    });
  }

  return { annotations, errors };
}

// ============================================================
// Generate review.tex content (for AST pipeline)
// ============================================================

/**
 * Generate LaTeX source content for a structured review document.
 * The returned string is designed to be wrapped in an AST TextNode
 * (with `escaped: true`) and serialized through the AST pipeline.
 *
 * Organizes annotations by type into named sections, listing each
 * annotation with its author, anchor context, and body text.
 */
export function generateReviewTexContent(
  annotations: Annotation[],
  thesisTitle: string,
): string {
  const lines: string[] = [];

  // LaTeX-escape helper for inline text
  const esc = (s: string): string =>
    s.replace(/\\/g, '\\textbackslash{}')
     .replace(/\{/g, '\\{')
     .replace(/\}/g, '\\}')
     .replace(/&/g, '\\&')
     .replace(/%/g, '\\%')
     .replace(/\$/g, '\\$')
     .replace(/#/g, '\\#')
     .replace(/_/g, '\\_')
     .replace(/\^/g, '\\textasciicircum{}')
     .replace(/~/g, '\\textasciitilde{}');

  const escTitle = esc(thesisTitle);

  lines.push(`% ============================================================`);
  lines.push(`% Review Document — ${escTitle}`);
  lines.push(`% Generated by ThesisForge Annotation Layer`);
  lines.push(`% ============================================================`);
  lines.push('');
  lines.push(`\\chapter*{Supervisor Review}`);
  lines.push(`\\addcontentsline{toc}{chapter}{Supervisor Review}`);
  lines.push('');

  const summary = computeAnnotationSummary(annotations);
  lines.push(`\\noindent\\textbf{Summary:} ${summary.total} total annotations; `);
  lines.push(`${summary.resolved} resolved; ${summary.total - summary.resolved} outstanding`);
  lines.push(`${summary.unresolvedRequired > 0 ? `; \\textcolor{red}{${summary.unresolvedRequired} required changes pending}` : '.'}`);
  lines.push('');
  lines.push('\\bigskip');

  // Group annotations by type
  const typeLabels: Record<AnnotationType, { title: string; color?: string }> = {
    'required-change': { title: 'Required Changes', color: 'red' },
    'suggestion': { title: 'Suggestions', color: 'orange' },
    'comment': { title: 'General Comments' },
    'praise': { title: 'Strengths Noted', color: 'green!60!black' },
  };

  // Process types in a meaningful order
  const typeOrder: AnnotationType[] = ['required-change', 'suggestion', 'comment', 'praise'];

  for (const type of typeOrder) {
    const group = annotations.filter(a => a.type === type);
    if (group.length === 0) continue;

    const label = typeLabels[type];
    lines.push('');
    lines.push(`\\section*{${label.title}}`);

    if (label.color) {
      lines.push(`\\addcontentsline{toc}{section}{${label.title}}`);
    }

    lines.push('');

    for (let i = 0; i < group.length; i++) {
      const ann = group[i];
      const statusMark = ann.resolved
        ? '\\textcolor{green!60!black}{\\ding{51}}'
        : '\\textcolor{red}{\\ding{55}}';

      lines.push(`\\noindent\\textbf{${i + 1}.} ${statusMark} \\textit{${esc(ann.author)}}`);
      lines.push('');

      if (ann.anchorText) {
        lines.push(`\\begin{quote}`);
        lines.push(`\\small\\texttt{"${esc(ann.anchorText.length > 80 ? ann.anchorText.slice(0, 77) + '...' : ann.anchorText)}"}`);
        lines.push(`\\end{quote}`);
      }

      lines.push(esc(ann.body));
      lines.push('');

      if (ann.resolved && ann.resolvedAt) {
        const resolvedDate = new Date(ann.resolvedAt).toLocaleDateString('en-GB', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
        lines.push(`\\hfill\\scriptsize\\textit{Resolved: ${resolvedDate}}`);
      }

      lines.push('');
      lines.push('\\hrulefill');
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================
// Anchor text extraction helper
// ============================================================

/**
 * Extract text around a given offset, trimming to word boundaries,
 * limited to maxLength characters. Useful for creating anchor snippets.
 */
export function extractAnchorText(
  fullText: string,
  offset: number,
  maxLength: number = 60,
): string {
  if (!fullText || fullText.length === 0) return '';

  // Clamp offset to valid range
  const safeOffset = Math.max(0, Math.min(offset, fullText.length - 1));

  // Calculate window: try to center around offset
  const halfLen = Math.floor(maxLength / 2);
  let start = safeOffset - halfLen;
  let end = safeOffset + halfLen;

  // Expand to maxLength if start/end were clamped
  if (start < 0) {
    end = Math.min(fullText.length, end - start);
    start = 0;
  }
  if (end > fullText.length) {
    start = Math.max(0, start - (end - fullText.length));
    end = fullText.length;
  }

  // Trim to word boundaries: move start forward to next space
  if (start > 0) {
    const spaceIdx = fullText.indexOf(' ', start);
    if (spaceIdx !== -1 && spaceIdx < safeOffset) {
      start = spaceIdx + 1;
    }
  }

  // Trim end to last space before maxLength
  let text = fullText.slice(start, end);
  if (end < fullText.length && text.length > maxLength) {
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.6) {
      text = text.slice(0, lastSpace);
    }
  }

  // Hard cap
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
  }

  return text.trim();
}

// ============================================================
// Persistence Functions (IndexedDB)
// ============================================================

// Minimal type interface for the memory fallback DB
interface MemoryLikeDB {
  _isMemoryFallback?: boolean;
  put(storeName: string, value: unknown): Promise<unknown>;
  get(storeName: string, key: string): Promise<unknown>;
  getAll(storeName: string): Promise<unknown[]>;
  delete(storeName: string, key: string): Promise<void>;
}

/**
 * Save a single annotation to IndexedDB.
 */
export async function saveAnnotation(annotation: Annotation): Promise<void> {
  try {
    const db = await getDB();
    if ((db as MemoryLikeDB)._isMemoryFallback) {
      await (db as MemoryLikeDB).put('annotations', annotation);
    } else {
      await (db as IDBPDatabase).put('annotations', annotation);
    }
  } catch (err) {
    console.error('[Annotations] saveAnnotation failed:', err);
  }
}

/**
 * Load annotations, optionally filtered by chapterId.
 */
export async function loadAnnotations(chapterId?: string): Promise<Annotation[]> {
  try {
    const db = await getDB();

    if ((db as MemoryLikeDB)._isMemoryFallback) {
      const all = await (db as MemoryLikeDB).getAll('annotations') as Annotation[];
      if (chapterId !== undefined) {
        return all.filter(a => a.chapterId === chapterId);
      }
      return all;
    }

    // Real IndexedDB path
    if (chapterId !== undefined) {
      const range = IDBKeyRange.only(chapterId);
      return (db as IDBPDatabase).getAllFromIndex('annotations', 'chapterId', range) as Promise<Annotation[]>;
    }

    return (db as IDBPDatabase).getAll('annotations') as Promise<Annotation[]>;
  } catch (err) {
    console.error('[Annotations] loadAnnotations failed:', err);
    return [];
  }
}

/**
 * Load all annotations (no filtering).
 */
export async function loadAllAnnotations(): Promise<Annotation[]> {
  return loadAnnotations(undefined);
}

/**
 * Delete a single annotation by ID.
 */
export async function deleteAnnotation(id: string): Promise<void> {
  try {
    const db = await getDB();
    if ((db as MemoryLikeDB)._isMemoryFallback) {
      await (db as MemoryLikeDB).delete('annotations', id);
    } else {
      await (db as IDBPDatabase).delete('annotations', id);
    }
  } catch (err) {
    console.error('[Annotations] deleteAnnotation failed:', err);
  }
}
