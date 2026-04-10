// ============================================================
// ThesisForge Core — LaTeX Contract Assertions (Bug Hunt: Zone 3A)
// Run these on the serialized .tex string before offering for download.
// Failed assertions block export and surface as errors.
// ============================================================

export interface LatexContractError {
  code: string;
  message: string;
}

/**
 * Assert LaTeX output contract. Returns an array of errors (empty = clean).
 *
 * FIX(ZONE-3A): Post-generation assertions catch structural LaTeX errors
 * before the user downloads a broken .tex file.
 */
export function assertLatexContract(tex: string, bib: string): LatexContractError[] {
  const errors: LatexContractError[] = [];

  // Assertion 1: Balanced braces
  let depth = 0;
  for (const ch of tex) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) {
      errors.push({ code: 'E001', message: "Unexpected '}' — more closing than opening braces." });
      break;
    }
  }
  if (depth !== 0 && !errors.some(e => e.code === 'E001')) {
    errors.push({ code: 'E001', message: `Unmatched braces: ${depth > 0 ? 'missing' : 'extra'} ${Math.abs(depth)} closing brace(s).` });
  }

  // Assertion 2: \begin / \end symmetry
  const begins = (tex.match(/\\begin\{([^}]+)\}/g) || []).map(m => m.slice(7, -1));
  const ends = (tex.match(/\\end\{([^}]+)\}/g) || []).map(m => m.slice(5, -1));
  if (begins.length !== ends.length) {
    errors.push({ code: 'E002', message: `\\begin/\\end mismatch: ${begins.length} opens, ${ends.length} closes.` });
  }

  // Assertion 3: \documentclass present exactly once
  const dcCount = (tex.match(/\\documentclass/g) || []).length;
  if (dcCount !== 1) {
    errors.push({ code: 'E003', message: `Expected exactly 1 \\documentclass, found ${dcCount}.` });
  }

  // Assertion 4: \begin{document} present
  if (!tex.includes('\\begin{document}')) {
    errors.push({ code: 'E004', message: 'Missing \\begin{document}.' });
  }

  // Assertion 5: \end{document} is the last non-whitespace line
  const trimmed = tex.trimEnd();
  if (!trimmed.endsWith('\\end{document}')) {
    errors.push({ code: 'E005', message: '\\end{document} must be the last line.' });
  }

  // Assertion 6: No raw unescaped special chars in text nodes
  // (These slip through if escapeLatex() was not called on user input)
  const dangerousPattern = /(?<!\\)[&%$#_^~](?!\{)/g;
  const dangerMatches = [...tex.matchAll(dangerousPattern)];
  if (dangerMatches.length > 0) {
    // Filter out matches inside comment lines
    const realDangers = dangerMatches.filter(m => {
      const lineStart = tex.lastIndexOf('\n', m.index) + 1;
      const linePrefix = tex.slice(lineStart, m.index).trimStart();
      return !linePrefix.startsWith('%');
    });
    if (realDangers.length > 0) {
      errors.push({
        code: 'E006',
        message: `Unescaped special character(s): ${realDangers.map(m => `"${m[0]}" at offset ${m.index}`).slice(0, 3).join(', ')}`,
      });
    }
  }

  // Assertion 7: Citation keys in \cite{} exist in .bib
  const citedKeys = [...tex.matchAll(/\\cite[a-z]*\{([^}]+)\}/g)]
    .flatMap(m => m[1].split(',').map(k => k.trim()));
  const definedKeys = new Set([...bib.matchAll(/@\w+\{([^,]+),/g)].map(m => m[1].trim()));
  const undefinedKeys = citedKeys.filter(k => k && !definedKeys.has(k));
  if (undefinedKeys.length > 0) {
    errors.push({ code: 'E007', message: `Undefined citation keys: ${undefinedKeys.join(', ')}` });
  }

  // Assertion 8: No empty \chapter{} or \section{}
  const emptySection = tex.match(/\\(?:chapter|section|subsection)\{\s*\}/);
  if (emptySection) {
    errors.push({ code: 'E008', message: `Empty section command: ${emptySection[0]}` });
  }

  // Assertion 9: \bibliography{} present when references exist
  if (bib.trim().length > 0 && !tex.includes('\\bibliography{') && !tex.includes('\\begin{thebibliography}')) {
    errors.push({ code: 'E009', message: 'References exist but \\bibliography{} or thebibliography is missing from document.' });
  }

  return errors;
}
