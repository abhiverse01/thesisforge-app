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

  // Straight quotes — convert to smart quotes via two-pass approach
  // First pass: every " becomes `` 
  [/"/g,                 '``'],                   // 18. straight double quote → opening
  // Second pass (handled after reduce below): convert every other `` to ''

  // Dashes
  [/\u2014/g,            '---'],                  // 19. em dash (—)
  [/\u2013/g,            '--'],                   // 20. en dash (–)

  // Ellipsis
  [/\u2026/g,            '\\ldots{}'],            // 21. Unicode ellipsis (…)
  [/\.\.\./g,            '\\ldots{}'],            // 22. ASCII ellipsis (...)

  // Copyright, trademark, degree
  [/\u00A9/g,            '\\textcopyright{}'],    // 23. copyright (©)
  [/\u00AE/g,            '\\textregistered{}'],   // 24. registered (®)
  [/\u2122/g,            '\\texttrademark{}'],    // 25. trademark (™)
  [/\u00B0/g,            '\\textdegree{}'],       // 26. degree (°)

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
  [/\u00D7/g,            '$\\times$'],            // × (duplicate safety)
];

/**
 * Regex that matches LaTeX commands and environments.
 * Segments matching this are preserved as-is (not escaped).
 */
const LATEX_COMMAND_RE = /\\[a-zA-Z]+(?:\[[^\]]*\])?(?:\{[^{}]*\})*|\$[^$]+\$|\$\$[^$]+\$\$/g;

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
    // Apply all escape rules to plain-text segments
    let escaped = LATEX_ESCAPE_MAP.reduce(
      (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
      seg.content
    );
    // Second pass: convert every other `` back to '' for proper smart quotes
    // Pattern: every `` that is followed by another `` (or end of string) is closing
    escaped = escaped.replace(/``(?!``)/g, "''");
    return escaped;
  }).join('');
}

/**
 * Simple escaper for metadata fields (title, author, etc.).
 * These fields are typically short and don't contain LaTeX commands.
 * Uses a simpler, faster approach than escapeLatexBody.
 */
export function escapeLatexMeta(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
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
 * Legacy-compatible escaper.
 * Maps to the original escapeLatex() signature for backward compatibility.
 * Delegates to escapeLatexBody for full smart escaping.
 */
export function escapeLatex(str: string): string {
  return escapeLatexBody(str);
}
