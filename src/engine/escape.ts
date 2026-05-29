// ============================================================
// ThesisForge Engine — The Escaper
// The most critical function in the engine.
// A bug here corrupts every document.
//
// SMART ESCAPER: Splits text into LaTeX-command and plain-text
// segments. Only escapes plain text — never touches existing LaTeX.
// ============================================================

/**
 * Comprehensive LaTeX escape map.
 * ORDER IS CRITICAL — backslash must be first.
 * Applied to plain-text segments only (not LaTeX commands).
 */
export const LATEX_ESCAPE_MAP: Array<[RegExp, string]> = [
  // Control characters — MUST be first
  [/\\/g,                '\\textbackslash{}'],   // 1. backslash — FIRST
  [/\{/g,                '\\{'],                  // 2. open brace
  [/\}/g,                '\\}'],                  // 3. close brace

  // Special LaTeX characters
  [/\^/g,                '\\textasciicircum{}'],  // 4. caret (not \^{} — breaks in text)
  [/~/g,                 '\\textasciitilde{}'],   // 5. tilde (non-breaking space)
  [/&/g,                 '\\&'],                 // 6. ampersand
  [/%/g,                 '\\%'],                 // 7. percent
  [/\$/g,                '\\$'],                 // 8. dollar
  [/#/g,                 '\\#'],                 // 9. hash
  [/_/g,                 '\\_'],                 // 10. underscore

  // Brackets and pipe
  [/</g,                 '\\textless{}'],         // 11. less than
  [/>/g,                 '\\textgreater{}'],      // 12. greater than
  [/\|/g,                '\\textbar{}'],          // 13. pipe

  // Typography — smart quotes
  [/\u201C/g,            '``'],                   // 14. opening double quote (")
  [/\u201D/g,            "''"],                   // 15. closing double quote (")
  [/\u2018/g,            '`'],                    // 16. opening single quote (')
  [/\u2019/g,            "'"],                    // 17. closing single quote (')

  // Straight quotes — handled in post-processing (convertStraightQuotes)
  // Not in the map because position-aware conversion (opening vs closing)
  // requires alternating state, which reduce() can't do per-replacement.

  // Dashes
  [/\u2014/g,            '---'],                  // 19. em dash (—)
  [/\u2013/g,            '--'],                   // 20. en dash (–)

  // Ellipsis
  [/\u2026/g,            '\\ldots{}'],            // 21. Unicode ellipsis (…)
  [/\.\.\./g,            '\\ldots{}'],            // 22. ASCII ellipsis (...)

  // Non-breaking space and invisible chars
  [/\u00A0/g,            '~'],                    // non-breaking space
  [/\u200B/g,            ''],                     // zero-width space (remove)
  [/\uFEFF/g,            ''],                     // BOM (remove)
  [/\u2012/g,            '--'],                   // figure dash
  // Guillemets (French/Spanish quotes)
  [/\u00AB/g,            '\\guillemotleft{}'],    // «
  [/\u00BB/g,            '\\guillemotright{}'],   // »
  // Inverted punctuation (Spanish) — backtick BEFORE the character in LaTeX
  [/\u00BF/g,            '`?'],                   // ¿
  [/\u00A1/g,            '`!'],                   // ¡

  // Copyright, trademark, degree
  [/\u00A9/g,            '\\textcopyright{}'],    // copyright (©)
  [/\u00AE/g,            '\\textregistered{}'],   // registered (®)
  [/\u2122/g,            '\\texttrademark{}'],    // trademark (™)
  [/\u00B0/g,            '\\textdegree{}'],       // degree (°)
  // Bullet point
  [/\u2022/g,            '\\textbullet{}'],       // •

  // Typography extras
  [/\u00A7/g,            '\\S{}'],                // § section sign
  [/\u00B6/g,            '\\P{}'],                // ¶ pilcrow
  [/\u2020/g,            '\\dag{}'],              // † dagger
  [/\u2021/g,            '\\ddag{}'],             // ‡ double dagger

  // Math operators
  [/\u00B1/g,            '$\\pm$'],               // 27. plus-minus (±)
  [/\u00D7/g,            '$\\times$'],            // 28. multiply (×)
  [/\u00F7/g,            '$\\div$'],              // 29. divide (÷)

  // Greek letters (lowercase)
  [/\u03B1/g,            '$\\alpha$'],            // α
  [/\u03B2/g,            '$\\beta$'],             // β
  [/\u03B3/g,            '$\\gamma$'],            // γ
  [/\u03B4/g,            '$\\delta$'],            // δ
  [/\u03B5/g,            '$\\varepsilon$'],       // ε
  [/\u03B6/g,            '$\\zeta$'],             // ζ
  [/\u03B7/g,            '$\\eta$'],              // η
  [/\u03B8/g,            '$\\theta$'],            // θ
  [/\u03B9/g,            '$\\iota$'],             // ι
  [/\u03BA/g,            '$\\kappa$'],            // κ
  [/\u03BB/g,            '$\\lambda$'],           // λ
  [/\u03BC/g,            '$\\mu$'],               // μ
  [/\u03BD/g,            '$\\nu$'],               // ν
  [/\u03BE/g,            '$\\xi$'],               // ξ
  [/\u03C0/g,            '$\\pi$'],               // π
  [/\u03C1/g,            '$\\rho$'],              // ρ
  [/\u03C3/g,            '$\\sigma$'],            // σ
  [/\u03C4/g,            '$\\tau$'],              // τ
  [/\u03C5/g,            '$\\upsilon$'],          // υ
  [/\u03C6/g,            '$\\varphi$'],           // φ
  [/\u03C7/g,            '$\\chi$'],              // χ
  [/\u03C8/g,            '$\\psi$'],              // ψ
  [/\u03C9/g,            '$\\omega$'],            // ω

  // Greek letters (uppercase)
  [/\u0393/g,            '$\\Gamma$'],            // Γ
  [/\u0394/g,            '$\\Delta$'],            // Δ
  [/\u0398/g,            '$\\Theta$'],            // Θ
  [/\u039B/g,            '$\\Lambda$'],           // Λ
  [/\u039E/g,            '$\\Xi$'],               // Ξ
  [/\u03A0/g,            '$\\Pi$'],               // Π
  [/\u03A3/g,            '$\\Sigma$'],            // Σ
  [/\u03A6/g,            '$\\Phi$'],              // Φ
  [/\u03A8/g,            '$\\Psi$'],              // Ψ
  [/\u03A9/g,            '$\\Omega$'],            // Ω

  // Math symbols
  [/\u221E/g,            '$\\infty$'],            // ∞
  [/\u221A/g,            '$\\sqrt{}$'],           // √
  [/\u222B/g,            '$\\int$'],              // ∫
  [/\u2211/g,            '$\\sum$'],              // ∑
  [/\u220F/g,            '$\\prod$'],             // ∏
  [/\u2208/g,            '$\\in$'],               // ∈
  [/\u2209/g,            '$\\notin$'],            // ∉
  [/\u2282/g,            '$\\subset$'],           // ⊂
  [/\u2283/g,            '$\\supset$'],           // ⊃
  [/\u2229/g,            '$\\cap$'],              // ∩
  [/\u222A/g,            '$\\cup$'],              // ∪
  [/\u2192/g,            '$\\rightarrow$'],      // →
  [/\u2190/g,            '$\\leftarrow$'],       // ←
  [/\u2194/g,            '$\\leftrightarrow$'],  // ↔
  [/\u2191/g,            '$\\uparrow$'],         // ↑
  [/\u2193/g,            '$\\downarrow$'],       // ↓
  [/\u21D2/g,            '$\\Rightarrow$'],      // ⇒
  [/\u21D0/g,            '$\\Leftarrow$'],       // ⇐
  [/\u2264/g,            '$\\leq$'],              // ≤
  [/\u2265/g,            '$\\geq$'],              // ≥
  [/\u2260/g,            '$\\neq$'],              // ≠
  [/\u2248/g,            '$\\approx$'],           // ≈
  [/\u2200/g,            '$\\forall$'],           // ∀
  [/\u2203/g,            '$\\exists$'],           // ∃
  [/\u2205/g,            '$\\emptyset$'],         // ∅
  [/\u2207/g,            '$\\nabla$'],            // ∇

  // Accented Latin characters — common in author names, titles, references
  // Uppercase accented
  [/\u00C0/g,            '\\`{A}'],               // À
  [/\u00C1/g,            "\\'{A}"],               // Á
  [/\u00C2/g,            '\\^{A}'],               // Â
  [/\u00C3/g,            '\\~{A}'],               // Ã
  [/\u00C4/g,            '\\"{A}'],               // Ä
  [/\u00C5/g,            '\\AA{}'],                // Å
  [/\u00C6/g,            '\\AE{}'],                // Æ
  [/\u00C7/g,            '\\c{C}'],                // Ç
  [/\u00C8/g,            '\\`{E}'],               // È
  [/\u00C9/g,            "\\'{E}"],               // É
  [/\u00CA/g,            '\\^{E}'],               // Ê
  [/\u00CB/g,            '\\"{E}'],               // Ë
  [/\u00CC/g,            '\\`{I}'],               // Ì
  [/\u00CD/g,            "\\'{I}"],               // Í
  [/\u00CE/g,            '\\^{I}'],               // Î
  [/\u00CF/g,            '\\"{I}'],               // Ï
  [/\u00D0/g,            '\\DH{}'],               // Ð
  [/\u00D1/g,            '\\~{N}'],               // Ñ
  [/\u00D2/g,            '\\`{O}'],               // Ò
  [/\u00D3/g,            "\\'{O}"],               // Ó
  [/\u00D4/g,            '\\^{O}'],               // Ô
  [/\u00D5/g,            '\\~{O}'],               // Õ
  [/\u00D6/g,            '\\"{O}'],               // Ö
  [/\u00D8/g,            '\\O{}'],                // Ø
  [/\u00D9/g,            '\\`{U}'],               // Ù
  [/\u00DA/g,            "\\'{U}"],               // Ú
  [/\u00DB/g,            '\\^{U}'],               // Û
  [/\u00DC/g,            '\\"{U}'],               // Ü
  [/\u00DD/g,            "\\'{Y}"],               // Ý
  [/\u00DE/g, '\\TH{}'], // Þ
  [/\u00DF/g,            '\\ss{}'],                // ß

  // Lowercase accented
  [/\u00E0/g,            '\\`{a}'],               // à
  [/\u00E1/g,            "\\'{a}"],               // á
  [/\u00E2/g,            '\\^{a}'],               // â
  [/\u00E3/g,            '\\~{a}'],               // ã
  [/\u00E4/g,            '\\"{a}'],               // ä
  [/\u00E5/g,            '\\aa{}'],                // å
  [/\u00E6/g,            '\\ae{}'],                // æ
  [/\u00E7/g,            '\\c{c}'],                // ç
  [/\u00E8/g,            '\\`{e}'],               // è
  [/\u00E9/g,            "\\'{e}"],               // é
  [/\u00EA/g,            '\\^{e}'],               // ê
  [/\u00EB/g,            '\\"{e}'],               // ë
  [/\u00EC/g,            '\\`{\\i}'],             // ì
  [/\u00ED/g,            "\\'{\\i}"],             // í
  [/\u00EE/g,            '\\^{\\i}'],             // î
  [/\u00EF/g,            '\\"{\\i}'],             // ï
  [/\u00F0/g,            '\\dh{}'],               // ð
  [/\u00F1/g,            '\\~{n}'],               // ñ
  [/\u00F2/g,            '\\`{o}'],               // ò
  [/\u00F3/g,            "\\'{o}"],               // ó
  [/\u00F4/g,            '\\^{o}'],               // ô
  [/\u00F5/g,            '\\~{o}'],               // õ
  [/\u00F6/g,            '\\"{o}'],               // ö
  [/\u00F8/g,            '\\o{}'],                // ø
  [/\u00F9/g,            '\\`{u}'],               // ù
  [/\u00FA/g,            "\\'{u}"],               // ú
  [/\u00FB/g,            '\\^{u}'],               // û
  [/\u00FC/g,            '\\"{u}'],               // ü
  [/\u00FD/g,            "\\'{y}"],               // ý
  // FIX: \u00FE is þ (thorn), not ÿ. \u00FF is ÿ (y-diaeresis).
  [/\u00FF/g,            '\\"{y}'],               // ÿ
  [/\u00FE/g,            '\\th{}'],               // þ (thorn)
];

/**
 * Regex that matches LaTeX commands and environments.
 * Segments matching this are preserved as-is (not escaped).
 */
const LATEX_COMMAND_RE = /\\[a-zA-Z]+(?:\[[^\]]*\])?(?:\{(?:[^{}]|\{[^{}]*\}|\{(?:[^{}]|\{[^{}]*\})*\})*\})*|\$[^$]+\$|\$\$[^$]+\$\$/g;

/**
 * Escape LaTeX special characters in plain text segments only.
 * Preserves existing LaTeX commands, environments, and math inline.
 *
 * This is the SMART escaper — it splits text into LaTeX-command and
 * plain-text segments, then only escapes the plain-text parts.
 */
export function escapeLatexBody(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const segments: Array<{ type: 'text' | 'latex'; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  LATEX_COMMAND_RE.lastIndex = 0;

  while ((match = LATEX_COMMAND_RE.exec(text)) !== null) {
    // Plain text before this command
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // The LaTeX command itself — preserve exactly
    segments.push({ type: 'latex', content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text after last command
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments.map(seg => {
    if (seg.type === 'latex') return seg.content;
    // Apply escape rules to plain-text segments in TWO PHASES to prevent
    // brace re-escape corruption:
    //   Phase 1: Escape backslashes and braces FIRST (\ → \textbackslash{}, {} → \{ \})
    //   Phase 2: Apply all other rules (which may introduce {} in command
    //           arguments, but Phase 1 is already done so they are safe).
    // FIXELEVEN: Added backslash escaping in Phase 1. Previously, bare backslashes
    // not followed by a letter (e.g., \ followed by space or at end-of-string)
    // were not matched by the LaTeX command regex and landed in plain-text
    // segments unescaped, causing "missing $ inserted" LaTeX errors.
    let escaped = seg.content
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}');
    // Phase 2: Skip the first 3 entries (backslash + braces) since we handled
    // them in Phase 1 already. Index 3 = caret, which starts the remaining rules.
    escaped = LATEX_ESCAPE_MAP.slice(3).reduce(
      (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
      escaped
    );
    // Smart straight quote conversion (post-processing)
    escaped = convertStraightQuotes(escaped);
    return escaped;
  }).join('');
}

/**
 * Convert straight double quotes (") to LaTeX smart quotes (`` and '').
 * Alternates between opening and closing based on position within each segment.
 * Assumes quotes come in pairs; odd quotes default to opening.
 */
function convertStraightQuotes(text: string): string {
  // Don't touch if no straight double quotes exist
  if (!text.includes('"')) return text;

  let isOpening = true; // First quote in a segment is opening
  return text.replace(/"/g, () => {
    const replacement = isOpening ? '``' : "''";
    isOpening = !isOpening;
    return replacement;
  });
}

/**
 * Simple escaper for metadata fields (title, author, etc.).
 * These fields are typically short and don't contain LaTeX commands.
 * Uses a simpler, faster approach than escapeLatexBody.
 *
 * CRITICAL: Uses a placeholder for backslash to prevent double-escaping
 * of the braces in \textbackslash{}.
 */
export function escapeLatexMeta(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // Phase 1: Replace backslash with a temporary placeholder.
  // This prevents the braces in \textbackslash{} from being
  // double-escaped when we process { and } later.
  const BACKSLASH_PLACEHOLDER = '\x00BSPH\x00';
  let result = text.replace(/\\/g, BACKSLASH_PLACEHOLDER);

  // Phase 2: Escape braces (now safe — no \textbackslash{} interference)
  result = result
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');

  // Phase 3: Escape all other special characters
  result = result
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
    .replace(/\|/g, '\\textbar{}');

  // Phase 4: Replace placeholder with actual backslash command
  result = result.split(BACKSLASH_PLACEHOLDER).join('\\textbackslash{}');

  return result;
}

/**
 * Legacy-compatible escaper.
 * Maps to the original escapeLatex() signature for backward compatibility.
 * Delegates to escapeLatexBody for full smart escaping.
 */
export function escapeLatex(str: string): string {
  return escapeLatexBody(str);
}

/**
 * URL-safe escaper for use inside \url{} and \href{}{} arguments.
 * BibTeX URLs and hyperref URL arguments are verbatim — they must NOT
 * have %, #, _, &, $, {, } escaped. Only minimal sanitization.
 *
 * @param url - Raw URL string
 * @returns URL safe for LaTeX \url{} and \href{} arguments
 */
export function escapeLatexUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  // In \url{} context, only backslash and unbalanced braces need handling.
  // Everything else (%, #, _, &, $) is literal inside \url{}.
  return url
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

/**
 * Escape text for BibTeX field values.
 * Similar to escapeLatexMeta but preserves % in URLs and does NOT
 * escape & inside \url{} arguments.
 *
 * @param value - Raw field value
 * @param fieldName - Optional field name for context-aware escaping
 * @returns Value safe for BibTeX {...} braces
 */
export function escapeBibTeXField(value: string, fieldName?: string): string {
  if (!value || typeof value !== 'string') return '';
  // URL fields are verbatim in BibTeX — no escaping needed
  if (fieldName === 'url' || fieldName === 'doi' || fieldName === 'eprint') {
    return value;
  }
  // howpublished with \url{} — detect and preserve
  if (fieldName === 'howpublished' && value.includes('\\url{')) {
    return value;
  }
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}
