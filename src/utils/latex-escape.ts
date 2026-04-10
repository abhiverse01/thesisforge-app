// ============================================================
// LaTeX Escaping — Handles all special LaTeX characters
// CRITICAL: Never skip this. Always escape user input.
// ============================================================

/**
 * Escapes all special LaTeX characters in a string.
 * Order matters: backslash must be first to avoid double-escaping.
 */
export function escapeLatex(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\textbackslash{}')
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
 * Sanitizes a filename for use in ZIP export.
 */
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
