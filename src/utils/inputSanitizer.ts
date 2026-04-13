// ============================================================
// ThesisForge — Input Sanitizer (Bug Hunt: Zone 6A)
// Run on every user input field before storing.
// Prevents null bytes, zero-width chars, control chars, and length overflow.
// ============================================================

/**
 * Sanitize user input before storing in state.
 *
 * FIX(ZONE-6A): Strips dangerous characters, normalizes line endings,
 * and enforces length limits per field type.
 *
 * @param raw - Raw user input string
 * @param fieldType - Type of field for specific rules
 * @returns Sanitized string safe for storage
 */
export function sanitizeUserInput(raw: unknown, fieldType: InputFieldType = 'text'): string {
  if (typeof raw !== 'string') return '';

  let s = raw;

  // 1. Normalize line endings
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Strip null bytes and other control characters (keep \n and \t)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Strip zero-width characters (U+200B, U+FEFF, etc.)
  s = s.replace(/[\u200B-\u200F\uFEFF\u00AD]/g, '');

  // 4. Field-specific rules
  if (fieldType === 'single-line') {
    s = s.replace(/\n/g, ' ').trim(); // flatten to single line
  }

  if (fieldType === 'year') {
    s = s.replace(/\D/g, '').slice(0, 4); // digits only, max 4
  }

  if (fieldType === 'cite-key') {
    s = s.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  }

  // 5. Length limits per field type
  const limit = LENGTH_LIMITS[fieldType] || LENGTH_LIMITS['default'];
  s = s.slice(0, limit);

  return s;
}

export type InputFieldType =
  | 'text'
  | 'single-line'
  | 'year'
  | 'cite-key'
  | 'title'
  | 'author'
  | 'abstract'
  | 'chapter-body'
  | 'default';

const LENGTH_LIMITS: Record<InputFieldType, number> = {
  'title': 500,
  'author': 300,
  'abstract': 5000,
  'chapter-body': 200000,
  'single-line': 500,
  'year': 4,
  'cite-key': 40,
  'text': 10000,
  'default': 10000,
};
