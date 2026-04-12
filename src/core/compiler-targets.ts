// ============================================================
// ThesisForge Core — Multi-Compiler Output Engine (System 5)
// Provides compiler-specific configurations for pdflatex,
// xelatex, and lualatex. Includes package resolution, preamble
// generation, compilation recipes, and Unicode escape helpers.
// ============================================================

// ── Types ───────────────────────────────────────────────────

export type CompilerTarget = 'pdflatex' | 'xelatex' | 'lualatex';

export interface CompilerTargetConfig {
  target: CompilerTarget;
  documentClassOptions: string[];
  encodingPackages: string[];
  fontPackages: string[];
  mathFontPackages: string[];
  languagePackages: string[];
  skipPackages: string[];
  extraPackages: Array<{ name: string; options: string[] }>;
  preambleExtra: string[];
  serializerOptions: {
    escapeUnicode: boolean;
    allowRawUTF8: boolean;
  };
  compilationRecipe: {
    engine: string;
    passes: number;
    bibBackend: 'bibtex' | 'biber';
    extraFlags: string[];
  };
  description: string;
  recommendedFor: string[];
}

// ── Compiler Target Configurations ──────────────────────────

export const COMPILER_TARGETS: Record<CompilerTarget, CompilerTargetConfig> = {
  pdflatex: {
    target: 'pdflatex',
    documentClassOptions: [],
    encodingPackages: ['inputenc', 'fontenc'],
    fontPackages: ['lmodern'],
    mathFontPackages: [],
    languagePackages: [],
    skipPackages: ['fontspec', 'polyglossia', 'unicode-math', 'luatexja', 'xunicode'],
    extraPackages: [],
    preambleExtra: [],
    serializerOptions: {
      escapeUnicode: true,
      allowRawUTF8: false,
    },
    compilationRecipe: {
      engine: 'pdflatex',
      passes: 3,
      bibBackend: 'bibtex',
      extraFlags: [],
    },
    description:
      'Classic pdfLaTeX engine with 8-bit output. Best compatibility with legacy documents. Requires inputenc/fontenc for UTF-8 support and escapes non-ASCII characters.',
    recommendedFor: [
      'bachelor',
      'master',
      'phd',
      'conference',
      'report',
      'legacy',
      'english-only',
    ],
  },

  xelatex: {
    target: 'xelatex',
    documentClassOptions: [],
    encodingPackages: [],
    fontPackages: ['fontspec'],
    mathFontPackages: ['unicode-math'],
    languagePackages: ['polyglossia'],
    skipPackages: ['inputenc', 'fontenc', 'lmodern', 'babel'],
    extraPackages: [{ name: 'xunicode', options: [] }],
    preambleExtra: ['\\defaultfontfeatures{Ligatures=TeX}'],
    serializerOptions: {
      escapeUnicode: false,
      allowRawUTF8: true,
    },
    compilationRecipe: {
      engine: 'xelatex',
      passes: 3,
      bibBackend: 'biber',
      extraFlags: ['-shell-escape'],
    },
    description:
      'XeLaTeX engine with native Unicode and OpenType font support. Ideal for documents using system fonts, multilingual content, and modern typography.',
    recommendedFor: [
      'cjk',
      'multilingual',
      'opentype',
      'custom-fonts',
      'chinese',
      'japanese',
      'korean',
      'arabic',
      'devanagari',
    ],
  },

  lualatex: {
    target: 'lualatex',
    documentClassOptions: [],
    encodingPackages: [],
    fontPackages: ['fontspec'],
    mathFontPackages: ['unicode-math'],
    languagePackages: ['polyglossia'],
    skipPackages: ['inputenc', 'fontenc', 'lmodern', 'babel'],
    extraPackages: [
      { name: 'xunicode', options: [] },
      { name: 'luatexja', options: [] },
      { name: 'luacode', options: [] },
    ],
    preambleExtra: ['\\defaultfontfeatures{Ligatures=TeX}'],
    serializerOptions: {
      escapeUnicode: false,
      allowRawUTF8: true,
    },
    compilationRecipe: {
      engine: 'lualatex',
      passes: 3,
      bibBackend: 'biber',
      extraFlags: ['-shell-escape'],
    },
    description:
      'LuaLaTeX engine combining native Unicode support with embedded Lua scripting. Best for documents requiring programmatic typesetting, CJK via luatexja, or advanced custom logic.',
    recommendedFor: [
      'cjk',
      'multilingual',
      'opentype',
      'custom-fonts',
      'chinese',
      'japanese',
      'korean',
      'lua-scripting',
      'programmatic',
    ],
  },
};

// ── Accessor Functions ──────────────────────────────────────

/**
 * Returns the full compiler configuration for a given target.
 */
export function getCompilerTarget(target: CompilerTarget): CompilerTargetConfig {
  return COMPILER_TARGETS[target];
}

/**
 * Resolves a list of default packages against a compiler target.
 *
 * 1. Filters out packages listed in the target's skipPackages.
 * 2. Appends the target's extraPackages.
 * 3. Deduplicates by package name (first occurrence wins).
 *
 * @param defaultPackages - Base package list to resolve.
 * @param target          - The compiler target to resolve against.
 * @returns Deduplicated package list safe for the given target.
 */
export function resolvePackagesForTarget(
  defaultPackages: Array<{ name: string; options: string[] }>,
  target: CompilerTarget,
): Array<{ name: string; options: string[] }> {
  const config = COMPILER_TARGETS[target];
  const skipSet = new Set(config.skipPackages);

  // Step 1: Filter out skipped packages
  const filtered = defaultPackages.filter((pkg) => !skipSet.has(pkg.name));

  // Step 2: Append extra packages
  const combined = [...filtered, ...config.extraPackages];

  // Step 3: Deduplicate by name (first occurrence wins)
  const seen = new Set<string>();
  const deduped: Array<{ name: string; options: string[] }> = [];
  for (const pkg of combined) {
    if (!seen.has(pkg.name)) {
      seen.add(pkg.name);
      deduped.push(pkg);
    }
  }

  return deduped;
}

/**
 * Builds the complete preamble lines for a compiler target.
 *
 * Includes encoding packages, font packages, math font packages,
 * language packages, preamble extras, and optional custom font setup
 * (for xelatex/lualatex).
 */
export function buildPreambleForTarget(
  target: CompilerTarget,
  customMainFont?: string,
  customSansFont?: string,
  customMonoFont?: string,
): string[] {
  const config = COMPILER_TARGETS[target];
  const lines: string[] = [];

  // Encoding packages (e.g. inputenc, fontenc)
  for (const pkg of config.encodingPackages) {
    if (pkg === 'inputenc') {
      lines.push('\\usepackage[utf8]{inputenc}');
    } else if (pkg === 'fontenc') {
      lines.push('\\usepackage[T1]{fontenc}');
    } else {
      lines.push(`\\usepackage{${pkg}}`);
    }
  }

  // Font packages
  for (const pkg of config.fontPackages) {
    lines.push(`\\usepackage{${pkg}}`);
  }

  // Math font packages
  for (const pkg of config.mathFontPackages) {
    lines.push(`\\usepackage{${pkg}}`);
  }

  // Language packages
  for (const pkg of config.languagePackages) {
    lines.push(`\\usepackage{${pkg}}`);
  }

  // Preamble extras
  for (const line of config.preambleExtra) {
    lines.push(line);
  }

  // Custom font setup for Unicode engines
  const fontSetup = generateFontSetup(target, customMainFont, customSansFont, customMonoFont);
  lines.push(...fontSetup);

  return lines;
}

/**
 * Generates the shell commands needed to compile a document.
 *
 * Produces the full compilation recipe including engine passes
 * and bibliography processing.
 *
 * @param target         - The compiler target.
 * @param mainFile       - Base name of the main .tex file (default: "main").
 * @param hasReferences  - Whether to run bibliography backend (default: true).
 * @returns Array of shell command strings.
 */
export function getCompilationCommands(
  target: CompilerTarget,
  mainFile: string = 'main',
  hasReferences: boolean = true,
): string[] {
  const config = COMPILER_TARGETS[target];
  const { engine, passes, bibBackend, extraFlags } = config.compilationRecipe;
  const flagStr = extraFlags.length > 0 ? ' ' + extraFlags.join(' ') : '';
  const commands: string[] = [];

  // First pass
  commands.push(`${engine}${flagStr} ${mainFile}`);

  // Bibliography pass (if references exist)
  if (hasReferences) {
    commands.push(`${bibBackend} ${mainFile}`);
  }

  // Remaining passes
  for (let i = 1; i < passes; i++) {
    commands.push(`${engine}${flagStr} ${mainFile}`);
  }

  return commands;
}

/**
 * Generates font configuration commands based on the compiler target.
 *
 * For pdflatex: no font configuration (uses lmodern from fontPackages).
 * For xelatex/lualatex: issues \setmainfont, \setsansfont, \setmonofont
 * when custom fonts are provided.
 */
export function generateFontSetup(
  target: CompilerTarget,
  mainFont?: string,
  sansFont?: string,
  monoFont?: string,
): string[] {
  const lines: string[] = [];

  // pdflatex does not support fontspec commands
  if (target === 'pdflatex') {
    return lines;
  }

  if (mainFont) {
    lines.push(`\\setmainfont{${mainFont}}`);
  }
  if (sansFont) {
    lines.push(`\\setsansfont{${sansFont}}`);
  }
  if (monoFont) {
    lines.push(`\\setmonofont{${monoFont}}`);
  }

  return lines;
}

/**
 * Returns a human-readable description of a compiler target.
 */
export function getTargetDescription(target: CompilerTarget): string {
  return COMPILER_TARGETS[target].description;
}

/**
 * Recommends a compiler target based on thesis type.
 *
 * - bachelor / master / phd / conference / report → pdflatex (safe default)
 * - cjk / chinese / japanese / korean → xelatex
 * - Default: pdflatex
 */
export function getTargetRecommendation(thesisType: string): CompilerTarget {
  const type = thesisType.toLowerCase().trim();

  // CJK content types require Unicode-native engines
  if (['cjk', 'chinese', 'japanese', 'korean', 'arabic', 'devanagari'].includes(type)) {
    return 'xelatex';
  }

  // Everything else defaults to pdflatex for maximum compatibility
  return 'pdflatex';
}

// ── Unicode Escape Helpers (pdflatex mode) ──────────────────

/**
 * Whether non-ASCII characters must be escaped for the given target.
 * Only pdflatex returns true.
 */
export function shouldEscapeUnicode(target: CompilerTarget): boolean {
  return COMPILER_TARGETS[target].serializerOptions.escapeUnicode;
}

/**
 * Maps common non-ASCII Unicode code points to their LaTeX equivalents.
 *
 * Covers 80+ characters including:
 * - Latin accented letters (é, è, ê, ë, à, ù, ò, ì, ñ, ü, ö, ä, ç, ß, etc.)
 * - Greek letters as inline math
 * - Arrows, math operators, and symbols
 * - Dashes, smart quotes, and currency symbols
 * - Copyright, trademark, and ellipsis
 */
export const UNICODE_ESCAPE_MAP: ReadonlyMap<number, string> = new Map<number, string>([
  // ── Latin Accented Letters ─────────────────────────────────
  // A-ring, A-umlaut, etc.
  [0x00C0, '\\"{A}'],       // À
  [0x00C1, "\\'{A}"],       // Á
  [0x00C2, '\\^{A}'],       // Â
  [0x00C3, '\\~{A}'],       // Ã
  [0x00C4, '\\"{A}'],       // Ä
  [0x00C5, '\\r{A}'],       // Å
  [0x00C6, '\\AE{}'],       // Æ
  [0x00C7, '\\c{C}'],       // Ç
  [0x00C8, '\\"{E}'],       // È
  [0x00C9, "\\'{E}"],       // É
  [0x00CA, '\\^{E}'],       // Ê
  [0x00CB, '\\"{E}'],       // Ë
  [0x00CC, '\\"{I}'],       // Ì
  [0x00CD, "\\'{I}"],       // Í
  [0x00CE, '\\^{I}'],       // Î
  [0x00CF, '\\"{I}'],       // Ï
  [0x00D0, '\\DH{}'],       // Ð
  [0x00D1, '\\~{N}'],       // Ñ
  [0x00D2, '\\"{O}'],       // Ò
  [0x00D3, "\\'{O}"],       // Ó
  [0x00D4, '\\^{O}'],       // Ô
  [0x00D5, '\\~{O}'],       // Õ
  [0x00D6, '\\"{O}'],       // Ö
  [0x00D8, '\\O{}'],        // Ø
  [0x00D9, '\\"{U}'],       // Ù
  [0x00DA, "\\'{U}"],       // Ú
  [0x00DB, '\\^{U}'],       // Û
  [0x00DC, '\\"{U}'],       // Ü
  [0x00DD, "\\'{Y}"],       // Ý
  [0x00DE, '\\TH{}'],       // Þ
  [0x00DF, '\\ss{}'],       // ß
  [0x00E0, '\\"{a}'],       // à
  [0x00E1, "\\'{a}"],       // á
  [0x00E2, '\\^{a}'],       // â
  [0x00E3, '\\~{a}'],       // ã
  [0x00E4, '\\"{a}'],       // ä
  [0x00E5, '\\r{a}'],       // å
  [0x00E6, '\\ae{}'],       // æ
  [0x00E7, '\\c{c}'],       // ç
  [0x00E8, '\\"{e}'],       // è
  [0x00E9, "\\'{e}"],       // é
  [0x00EA, '\\^{e}'],       // ê
  [0x00EB, '\\"{e}'],       // ë
  [0x00EC, '\\"{\\i}'],     // ì
  [0x00ED, "\\'{\\i}"],     // í
  [0x00EE, '\\^{\\i}'],     // î
  [0x00EF, '\\"{\\i}'],     // ï
  [0x00F0, '\\dh{}'],       // ð
  [0x00F1, '\\~{n}'],       // ñ
  [0x00F2, '\\"{o}'],       // ò
  [0x00F3, "\\'{o}"],       // ó
  [0x00F4, '\\^{o}'],       // ô
  [0x00F5, '\\~{o}'],       // õ
  [0x00F6, '\\"{o}'],       // ö
  [0x00F8, '\\o{}'],        // ø
  [0x00F9, '\\"{u}'],       // ù
  [0x00FA, "\\'{u}"],       // ú
  [0x00FB, '\\^{u}'],       // û
  [0x00FC, '\\"{u}'],       // ü
  [0x00FD, "\\'{y}"],       // ý
  [0x00FE, '\\th{}'],       // þ
  [0x00FF, '\\"{y}'],       // ÿ

  // ── Greek Letters (inline math) ────────────────────────────
  [0x03B1, '$\\alpha$'],     // α
  [0x03B2, '$\\beta$'],      // β
  [0x03B3, '$\\gamma$'],     // γ
  [0x03B4, '$\\delta$'],     // δ
  [0x03B5, '$\\varepsilon$'],// ε
  [0x03B6, '$\\zeta$'],      // ζ
  [0x03B7, '$\\eta$'],       // η
  [0x03B8, '$\\theta$'],     // θ
  [0x03B9, '$\\iota$'],      // ι
  [0x03BA, '$\\kappa$'],     // κ
  [0x03BB, '$\\lambda$'],    // λ
  [0x03BC, '$\\mu$'],        // μ
  [0x03BD, '$\\nu$'],        // ν
  [0x03BE, '$\\xi$'],        // ξ
  [0x03C0, '$\\pi$'],        // π
  [0x03C1, '$\\rho$'],       // ρ
  [0x03C2, '$\\varsigma$'],  // ς
  [0x03C3, '$\\sigma$'],     // σ
  [0x03C4, '$\\tau$'],       // τ
  [0x03C5, '$\\upsilon$'],   // υ
  [0x03C6, '$\\phi$'],       // φ
  [0x03C7, '$\\chi$'],       // χ
  [0x03C8, '$\\psi$'],       // ψ
  [0x03C9, '$\\omega$'],     // ω
  [0x0393, '$\\Gamma$'],     // Γ
  [0x0394, '$\\Delta$'],     // Δ
  [0x0398, '$\\Theta$'],     // Θ
  [0x039B, '$\\Lambda$'],    // Λ
  [0x039E, '$\\Xi$'],        // Ξ
  [0x03A0, '$\\Pi$'],        // Π
  [0x03A3, '$\\Sigma$'],     // Σ
  [0x03A5, '$\\Upsilon$'],   // Υ
  [0x03A6, '$\\Phi$'],       // Φ
  [0x03A8, '$\\Psi$'],       // Ψ
  [0x03A9, '$\\Omega$'],     // Ω

  // ── Arrows ─────────────────────────────────────────────────
  [0x2192, '$\\rightarrow$'],  // →
  [0x2190, '$\\leftarrow$'],   // ←
  [0x2194, '$\\leftrightarrow$'], // ↔
  [0x21D2, '$\\Rightarrow$'],  // ⇒
  [0x21D0, '$\\Leftarrow$'],   // ⇐
  [0x21D4, '$\\Leftrightarrow$'], // ⇔
  [0x2191, '$\\uparrow$'],     // ↑
  [0x2193, '$\\downarrow$'],   // ↓

  // ── Math Operators & Symbols ───────────────────────────────
  [0x00D7, '$\\times$'],     // ×
  [0x00F7, '$\\div$'],       // ÷
  [0x00B1, '$\\pm$'],        // ±
  [0x2264, '$\\leq$'],       // ≤
  [0x2265, '$\\geq$'],       // ≥
  [0x2260, '$\\neq$'],       // ≠
  [0x2248, '$\\approx$'],    // ≈
  [0x221E, '$\\infty$'],     // ∞
  [0x2208, '$\\in$'],        // ∈
  [0x2203, '$\\exists$'],    // ∃
  [0x2200, '$\\forall$'],    // ∀
  [0x2202, '$\\partial$'],   // ∂
  [0x2207, '$\\nabla$'],     // ∇
  [0x2211, '$\\sum$'],       // ∑
  [0x220F, '$\\prod$'],      // ∏
  [0x222B, '$\\int$'],       // ∫
  [0x221A, '$\\sqrt{}$'],    // √
  [0x2220, '$\\angle$'],     // ∠
  [0x00B0, '$^{\\circ}$'],   // °
  [0x00B2, '$^{2}$'],        // ²
  [0x00B3, '$^{3}$'],        // ³
  [0x00B9, '$^{1}$'],        // ¹

  // ── Dashes ─────────────────────────────────────────────────
  [0x2014, '---'],           // — (em dash)
  [0x2013, '--'],            // – (en dash)

  // ── Smart Quotes ───────────────────────────────────────────
  [0x201C, '``'],            // " (left double)
  [0x201D, "''"],            // " (right double)
  [0x2018, '`'],             // ' (left single)
  [0x2019, "'"],             // ' (right single)

  // ── Currency Symbols ───────────────────────────────────────
  [0x20AC, '\\euro{}'],      // €
  [0x00A3, '\\pounds{}'],    // £
  [0x00A5, '\\yen{}'],       // ¥
  [0x20A9, '\\won{}'],       // ₩
  [0x20B9, '\\rupee{}'],     // ₹
  [0x00A2, '\\textcent{}'],  // ¢

  // ── Copyright, Trademark, etc. ────────────────────────────
  [0x00A9, '\\textcopyright{}'], // ©
  [0x00AE, '\\textregistered{}'], // ®
  [0x2122, '\\texttrademark{}'], // ™
  [0x00A0, '~'],             // non-breaking space

  // ── Punctuation & Misc ─────────────────────────────────────
  [0x2026, '\\ldots{}'],     // … (ellipsis)
  [0x00AB, '\\guillemotleft{}'],  // «
  [0x00BB, '\\guillemotright{}'], // »
  [0x00A1, '!`'],            // ¡ (inverted exclamation)
  [0x00BF, '?`'],            // ¿ (inverted question)
  [0x00AC, '\\neg{}'],       // ¬ (logical not)
  [0x00AE, '\\textregistered{}'], // ®
  [0x0153, '\\oe{}'],        // œ
  [0x0152, '\\OE{}'],        // Œ
  [0x0178, '\\"{Y}'],       // Ÿ
]);

/**
 * Escapes non-ASCII Unicode characters in a string for pdflatex.
 *
 * Iterates through each character in the input string. Characters
 * with code points above 0x7E are looked up in UNICODE_ESCAPE_MAP.
 * Characters without a mapping are left as-is and tracked.
 *
 * @param text - The input string that may contain Unicode characters.
 * @returns An object with:
 *   - escaped: The string with all mappable characters replaced by LaTeX equivalents.
 *   - unknownChars: Array of Unicode code points that had no mapping.
 */
export function escapeUnicodeForPdflatex(text: string): { escaped: string; unknownChars: number[] } {
  let escaped = '';
  const unknownChars: number[] = [];

  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === undefined || code <= 0x7E) {
      // ASCII printable — pass through
      escaped += char;
      continue;
    }

    const replacement = UNICODE_ESCAPE_MAP.get(code);
    if (replacement !== undefined) {
      escaped += replacement;
    } else {
      // No mapping — keep original and record the code point
      escaped += char;
      unknownChars.push(code);
    }
  }

  return { escaped, unknownChars };
}
