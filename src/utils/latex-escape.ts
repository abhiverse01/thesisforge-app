// ============================================================
// LaTeX Escaping — Handles all special LaTeX characters
// CRITICAL: Never skip this. Always escape user input.
// ============================================================

/**
 * Escapes all special LaTeX characters in a string.
 * Order matters: backslash must be first to avoid double-escaping.
 *
 * FIX(ZONE-6B): Escaping \ must happen BEFORE { and } to prevent
 * double-escaping (e.g. \{ becoming \\\\{).
 * Order: \ → & → % → $ → # → _ → ^ → ~ → < > → { → }
 */
export function escapeLatex(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\textbackslash{}')  // MUST be first
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

/**
 * Sanitizes a BibTeX field value — handles LaTeX special chars
 * but preserves some that are valid in BibTeX contexts.
 */
export function sanitizeBibField(value: string): string {
  if (!value || typeof value !== 'string') return '';
  // In BibTeX, most special chars are OK inside {},
  // but we need to escape unmatched braces
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_');
}

/**
 * Sanitize a chapter body — escapes all LaTeX special characters.
 * Used to prevent LaTeX command injection in user-written content.
 *
 * FIX(ZONE-6B): User types \end{document} in chapter body →
 * the injected command terminates the document early. Now fully escaped.
 */
export function sanitizeChapterBody(body: string): string {
  if (!body || typeof body !== 'string') return '';
  return body
    .replace(/\\/g, '\\textbackslash{}')  // MUST be first
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

export function sanitizeFilename(name: string): string {
  if (!name) return 'thesis';
  return name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100) || 'thesis';
}
