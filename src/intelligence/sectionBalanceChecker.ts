// ============================================================
// ThesisForge Intelligence — Algorithm: Section Balance Checker
// Analyzes LaTeX section/subsection nesting for structural issues.
// Pure function: input → result. No side effects.
// ============================================================

import type { SectionBalanceResult } from './types';

/** Heading levels in LaTeX. */
const HEADING_COMMANDS: Record<string, number> = {
  '\\chapter':        0,
  '\\section':        1,
  '\\subsection':     2,
  '\\subsubsection':  3,
  '\\paragraph':      4,
  '\\subparagraph':   5,
};

/** Strip LaTeX commands, leaving only structural headings and text. */
function stripLatexButKeepHeadings(text: string): string {
  return text
    .replace(/\$[^$]+\$/g, ' ')           // inline math
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')    // display math
    .replace(/\\(?!chapter|section|subsection|subsubsection|paragraph|subparagraph)[a-zA-Z]+\{[^}]*\}/g, ' ')
    .replace(/\\(?!chapter|section|subsection|subsubsection|paragraph|subparagraph)[a-zA-Z]+/g, ' ')
    .replace(/[{}\\]/g, ' ')                // stray braces/backslash
    .replace(/\[[^\]]*\]/g, ' ')           // [optional args]
    .replace(/%.*$/gm, ' ')                // comments
    .replace(/~+/g, ' ')                   // non-breaking spaces
    .replace(/\s+/g, ' ')
    .trim();
}

interface ParsedHeading {
  command: string;
  level: number;
  title: string;
  position: number;   // character offset in original body
}

interface ParsedSection {
  heading: ParsedHeading;
  childSections: ParsedSection[];
  hasContent: boolean;
}

/**
 * Parse LaTeX source into a flat list of headings.
 */
function parseHeadings(body: string): ParsedHeading[] {
  const headings: ParsedHeading[] = [];

  // Match heading commands: \command{title} or \command*{title}
  const headingRegex = /\\(chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(body)) !== null) {
    const cmd = '\\' + match[1];
    const level = HEADING_COMMANDS[cmd];
    if (level !== undefined) {
      headings.push({
        command: cmd,
        level,
        title: match[2].trim(),
        position: match.index,
      });
    }
  }

  return headings;
}

/**
 * Extract text content between two positions, stripping LaTeX.
 */
function extractTextBetween(body: string, start: number, end: number): string {
  const raw = body.slice(start, end);
  const clean = stripLatexButKeepHeadings(raw);
  // Remove heading titles themselves (they're not "content")
  const withoutHeadings = clean.replace(/\\(chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\s*\{[^}]*\}/g, ' ');
  return withoutHeadings.trim();
}

/**
 * Check if a section has meaningful body text.
 */
function hasBodyText(text: string): boolean {
  // A section has content if it has at least 20 characters of non-heading text
  return text.length > 20;
}

/**
 * Build a tree of sections to analyze nesting depth.
 */
function buildSectionTree(headings: ParsedHeading[], body: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];
    const endPos = nextHeading ? nextHeading.position : body.length;

    const textContent = extractTextBetween(body, heading.position + heading.command.length, endPos);

    // Find child sections (any heading with level > current)
    const children: ParsedSection[] = [];
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level > heading.level) {
        children.push({
          heading: headings[j],
          childSections: [],
          hasContent: hasBodyText(extractTextBetween(
            body,
            headings[j].position + headings[j].command.length,
            j + 1 < headings.length && headings[j + 1].level > headings[j].level
              ? headings[j + 1].position
              : j + 1 < headings.length
                ? headings[j + 1].position
                : body.length
          )),
        });
      } else if (headings[j].level <= heading.level) {
        break;
      }
    }

    sections.push({
      heading,
      childSections: children,
      hasContent: hasBodyText(textContent),
    });
  }

  return sections;
}

/**
 * Get maximum nesting depth of sections within a chapter.
 */
function maxNestingDepth(sections: ParsedSection[], baseLevel: number = 0): number {
  if (sections.length === 0) return 0;
  let maxDepth = 0;
  for (const section of sections) {
    const depth = section.childSections.length > 0
      ? 1 + maxNestingDepth(section.childSections, baseLevel + 1)
      : 0;
    maxDepth = Math.max(maxDepth, depth);
  }
  return maxDepth;
}

/**
 * Check section/subsection balance for LaTeX thesis chapters.
 *
 * Checks:
 * 1. Excessive nesting: >3 levels deep
 * 2. Single subsection: only 1 subsection (redundant)
 * 3. Orphaned sections: heading with no body text
 */
export function checkSectionBalance(
  chapters: Array<{ id: string; title: string; body: string }>
): SectionBalanceResult {
  const issues: SectionBalanceResult['issues'] = [];
  let totalSections = 0;
  let totalSubsections = 0;
  let maxNestingDepthGlobal = 0;
  let chaptersWithSingleSubsection = 0;
  let chaptersWithExcessiveNesting = 0;
  let orphanedSections = 0;

  for (const chapter of chapters) {
    const headings = parseHeadings(chapter.body);
    const tree = buildSectionTree(headings, chapter.body);

    // Count sections and subsections
    const sections = headings.filter(h => h.level === 1);
    const subsections = headings.filter(h => h.level === 2);
    totalSections += sections.length;
    totalSubsections += subsections.length;

    // Check excessive nesting (more than 3 levels deep from \section)
    const depth = maxNestingDepth(tree);
    maxNestingDepthGlobal = Math.max(maxNestingDepthGlobal, depth);

    if (depth > 3) {
      chaptersWithExcessiveNesting++;
      issues.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        type: 'excessive-nesting',
        message: `Chapter "${chapter.title}" has nesting depth of ${depth} levels (max recommended: 3). Consider flattening the structure.`,
        severity: 'warning',
      });
    }

    // Check single subsection
    if (subsections.length === 1) {
      chaptersWithSingleSubsection++;
      issues.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        type: 'single-subsection',
        message: `Chapter "${chapter.title}" has only one subsection ("${subsections[0].title}"). Consider integrating it directly into the chapter body.`,
        severity: 'info',
      });
    }

    // Check orphaned sections (heading with no body content)
    for (const section of tree) {
      if (!section.hasContent && section.heading.level >= 1) {
        orphanedSections++;
        const sectionType = section.heading.level === 1 ? 'section' : section.heading.level === 2 ? 'subsection' : 'subsubsection';
        issues.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          type: 'orphaned-section',
          message: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} "${section.heading.title}" in "${chapter.title}" has no body text between its heading and the next section.`,
          severity: 'warning',
        });
      }

      // Also check child sections for orphaned content
      for (const child of section.childSections) {
        if (!child.hasContent) {
          orphanedSections++;
          const sectionType = child.heading.level === 2 ? 'subsection' : 'subsubsection';
          issues.push({
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            type: 'orphaned-section',
            message: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} "${child.heading.title}" in "${chapter.title}" has no body text.`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return {
    issues,
    stats: {
      totalSections,
      totalSubsections,
      maxNestingDepth: maxNestingDepthGlobal,
      chaptersWithSingleSubsection,
      chaptersWithExcessiveNesting,
      orphanedSections,
    },
  };
}
