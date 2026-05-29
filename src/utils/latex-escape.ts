// ============================================================
// Utility: Filename Sanitization
// The canonical LaTeX escaping logic lives in @/engine/escape.
// ============================================================

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
