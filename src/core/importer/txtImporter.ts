// ============================================================
// ThesisForge Import — Plain Text Importer
// Parses .txt files to extract thesis metadata, chapters, and
// references from plain text using structural heuristics.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';
import { extractTitleSmart, extractAuthorsSmart, extractAbstractSmart, extractKeywordsSmart, extractInstitutionSmart, extractSupervisorSmart } from './contentIntelligence';

export async function importTXT(file: File): Promise<ImportResult> {
  const text = await file.text();
  return parsePlainText(text, file.name);
}

export function parsePlainText(text: string, fileName: string): ImportResult {
  const lines = text.split('\n');
  const metadata = extractPlainTextMetadata(lines);

  // GODMODE: Content intelligence fallback for plain text
  const fullText = lines.join('\n');
  if (!metadata.title) { const t = extractTitleSmart(fullText); if (t) metadata.title = t; }
  if (!metadata.author) { const a = extractAuthorsSmart(fullText); if (a.length > 0) metadata.author = a[0]; }
  if (!metadata.abstract) { const ab = extractAbstractSmart(fullText); if (ab) metadata.abstract = ab; }
  if (!metadata.keywords || metadata.keywords.length === 0) { const kw = extractKeywordsSmart(fullText, metadata); if (kw.length > 0) metadata.keywords = kw; }
  if (!metadata.institution) { const inst = extractInstitutionSmart(fullText); if (inst) metadata.institution = inst; }
  if (!metadata.supervisor) { const sup = extractSupervisorSmart(fullText); if (sup) metadata.supervisor = sup; }

  const chapters = extractPlainTextChapters(lines);
  const references = extractPlainTextReferences(lines);

  const detectedTemplate = detectTemplate(metadata, chapters);
  const confidence = scoreConfidence({ metadata, chapters, references });

  const warnings: string[] = [];
  if (lines.length < 20) warnings.push('Document appears to have very little content');
  if (!metadata.title) warnings.push('No clear title detected — consider adding a prominent title at the top');
  if (chapters.length === 0) warnings.push('No chapter headings detected — try using ALL CAPS or "Chapter X: Title" format for headings');

  return {
    source:          'txt',
    fileName,
    metadata,
    chapters,
    references,
    newcommands:     [],
    detectedTemplate,
    confidence,
    warnings,
    parseErrors:     [],
  };
}

// ---- Metadata Extraction ----

function extractPlainTextMetadata(lines: string[]) {
  const meta: Record<string, any> = {};
  const fullText = lines.join('\n');
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  // Title: first non-empty line that is short and looks like a title
  if (nonEmptyLines.length > 0) {
    const firstLine = nonEmptyLines[0].trim();
    if (firstLine.length >= 5 && firstLine.length <= 200) {
      meta.title = firstLine;
    }
  }

  // Look for an explicit "Title:" line
  const titleLine = lines.find(l => /^\s*title\s*[:：]\s*/i.test(l));
  if (titleLine) meta.title = titleLine.replace(/^\s*title\s*[:：]\s*/i, '').trim();

  // Author
  const authorLine = lines.find(l =>
    /^\s*(?:author|by|written by|submitted by)\s*[:：]?\s*/i.test(l) &&
    l.replace(/^\s*(?:author|by|written by|submitted by)\s*[:：]?\s*/i, '').trim().length > 2
  );
  if (authorLine) {
    meta.author = authorLine.replace(/^\s*(?:author|by|written by|submitted by)\s*[:：]?\s*/i, '').trim();
  }

  // Institution
  const instLine = lines.find(l =>
    /\b(?:university|college|institute|school)\b/i.test(l) &&
    l.split(' ').length <= 15
  );
  if (instLine) meta.institution = instLine.trim();

  // Supervisor
  const supLine = lines.find(l => /^\s*(?:supervisor|advisor|adviser)\s*[:：]\s*/i.test(l));
  if (supLine) meta.supervisor = supLine.replace(/^\s*(?:supervisor|advisor|adviser)\s*[:：]\s*/i, '').trim();

  // Abstract
  const abstractIdx = lines.findIndex(l => /^\s*abstract\s*[:：]?\s*$/i.test(l) || /^\s*abstract\s*[:：]/i.test(l));
  if (abstractIdx > -1) {
    const abstractParts: string[] = [];
    const abstractContent = lines[abstractIdx].includes(':')
      ? lines[abstractIdx].replace(/^\s*abstract\s*[:：]\s*/i, '')
      : '';

    if (abstractContent.length > 50) {
      abstractParts.push(abstractContent);
    }

    for (let i = abstractIdx + 1; i < lines.length && i < abstractIdx + 30; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Stop at the next structural heading
      if (/^(?:chapter|section|references|bibliography|introduction|conclusion)\b/i.test(line)) break;
      abstractParts.push(line);
    }
    if (abstractParts.length > 0) meta.abstract = abstractParts.join(' ');
  }

  // Keywords
  const kwLine = lines.find(l => /^\s*keywords?\s*[:：]/i.test(l));
  if (kwLine) {
    meta.keywords = kwLine.replace(/^\s*keywords?\s*[:：]\s*/i, '')
      .split(/[,;]/).map(k => k.trim()).filter(k => k.length > 1 && k.length < 60);
  }

  // Year
  const yearMatch = fullText.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) meta.year = yearMatch[1];

  // Degree detection
  const degreePatterns = [
    { re: /doctor of philosophy|ph\.?d/i, abbrev: 'phd', full: 'Doctor of Philosophy' },
    { re: /master of science|m\.?s\.?c/i, abbrev: 'master', full: 'Master of Science' },
    { re: /master of arts|m\.?a\b/i, abbrev: 'master', full: 'Master of Arts' },
    { re: /bachelor of science|b\.?s\.?c/i, abbrev: 'bachelor', full: 'Bachelor of Science' },
  ];
  for (const { re, abbrev, full } of degreePatterns) {
    if (re.test(fullText)) {
      meta.degreeAbbrev = abbrev;
      meta.degree = full;
      break;
    }
  }

  return meta;
}

// ---- Chapter Extraction ----

function extractPlainTextChapters(lines: string[]): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];

  // Pattern 1: "Chapter 1: Title" or "CHAPTER 1: TITLE"
  const chapterRe = /^\s*(?:chapter|ch\.?)\s+(\d+|[IVX]+)\s*[:.\-—–]\s*(.+)/i;
  // Pattern 2: "1. Title" or "1 Title" (numbered sections)
  const numberedRe = /^\s*(\d+)\.\s+([A-Z][A-Za-z\s&:–—]{5,80})$/;
  // Pattern 3: ALL CAPS lines (common in plain text theses)
  const allCapsRe = /^([A-Z][A-Z\s&:–—]{8,80})$/;

  // Build a combined list of heading positions
  const headingPositions: Array<{ title: string; index: number }> = [];
  const skipTitles = /^(abstract|acknowledgements?|dedication|table of contents|contents|references|bibliography|appendix|keywords?|list of|figures|tables)$/i;

  // Join with indices for multiline pattern matching
  const joinedText = lines.join('\n');

  // Scan all patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let match: RegExpExecArray | null = null;

    // Try chapter pattern first
    match = chapterRe.exec(line);
    if (match) {
      const title = match[2].trim();
      if (skipTitles.test(title)) continue;
      headingPositions.push({ title, index: i });
      continue;
    }

    // Try numbered pattern
    match = numberedRe.exec(line);
    if (match) {
      const title = match[2].trim();
      if (skipTitles.test(title)) continue;
      headingPositions.push({ title, index: i });
      continue;
    }

    // Try ALL CAPS (must be a standalone line, not the first line which is likely the title)
    if (i > 2 && allCapsRe.test(line)) {
      const title = line.trim();
      if (skipTitles.test(title)) continue;
      // Require at least 2 words to avoid false positives from acronyms
      if (title.split(/\s+/).length < 2) continue;
      // Exclude common non-heading ALL CAPS lines
      if (/^(ABSTRACT|INTRODUCTION|CONCLUSION|REFERENCES|BIBLIOGRAPHY|ACKNOWLEDGMENT|TABLE OF CONTENTS|LIST OF|APPENDIX)$/i.test(title)) continue;
      // Only add if the next non-empty line has content
      const nextContent = lines.slice(i + 1).find(l => l.trim().length > 10);
      if (nextContent) {
        headingPositions.push({ title, index: i });
        continue;
      }
    }
  }

  // Try underlined headings (multiline)
  let underMatch;
  const ulRe = /^([A-Za-z][A-Za-z\s&:–—]{5,80})\n\s*[-=]{3,}/gm;
  while ((underMatch = ulRe.exec(joinedText)) !== null) {
    const title = underMatch[1].trim();
    if (skipTitles.test(title)) continue;
    const lineIdx = joinedText.slice(0, underMatch.index).split('\n').length - 1;
    // Check if we already have a heading at this position
    if (!headingPositions.some(h => Math.abs(h.index - lineIdx) < 3)) {
      headingPositions.push({ title, index: lineIdx });
    }
  }

  // Sort by position
  headingPositions.sort((a, b) => a.index - b.index);

  // Build chapters
  for (let i = 0; i < headingPositions.length; i++) {
    const start = headingPositions[i].index + 1;
    const end = i + 1 < headingPositions.length ? headingPositions[i + 1].index : lines.length;

    const bodyParts: string[] = [];
    const subHeadings: Array<{ title: string; index: number }> = [];

    for (let j = start; j < end; j++) {
      const line = lines[j].trim();
      if (!line) continue;

      // Skip lines that match other heading patterns (sub-headings)
      const subMatch = chapterRe.exec(line);
      if (!subMatch) {
        const numMatch = /^\s*(\d{1,2}\.\d{1,2})\s+([A-Z][A-Za-z\s&:–—]{5,60})$/.exec(line);
        if (numMatch) {
          subHeadings.push({ title: numMatch[2].trim(), index: j });
          continue;
        }
      }
      if (subMatch) continue;

      bodyParts.push(line);
    }

    const body = bodyParts.join('\n\n').trim();
    if (body.split(' ').length < 15) continue;

    const subsections = subHeadings.slice(0, 8).map((sub, si) => {
      const subStart = sub.index + 1;
      const subEnd = si + 1 < subHeadings.length ? subHeadings[si + 1].index : end;
      const subParts: string[] = [];
      for (let k = subStart; k < subEnd; k++) {
        if (lines[k].trim()) subParts.push(lines[k].trim());
      }
      return {
        title: sub.title,
        body: subParts.join('\n\n').trim().slice(0, 2000),
      };
    });

    chapters.push({
      title: headingPositions[i].title,
      body,
      order: i,
      level: 'chapter',
      subsections,
    });
  }

  return chapters;
}

// ---- Reference Extraction ----

function extractPlainTextReferences(lines: string[]): ExtractedReference[] {
  const refs: ExtractedReference[] = [];

  // Find references section
  let refStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^(references|bibliography|works?\s+cited)\s*[:：]?\s*$/i.test(lines[i].trim())) {
      refStartIdx = i + 1;
      break;
    }
  }

  if (refStartIdx === -1) return refs;

  // Collect reference entries — numbered or continuous paragraphs
  let currentRef = '';
  for (let i = refStartIdx; i < lines.length && refs.length < 60; i++) {
    const line = lines[i].trim();

    // Stop at next major heading
    if (/^(?:chapter|section|appendix)\b/i.test(line)) break;

    const numMatch = line.match(/^\s*\d+[\.\)]\s+/);
    if (numMatch && currentRef) {
      if (currentRef.length > 20) {
        refs.push({ type: 'misc', raw: currentRef, ...guessRefFields(currentRef) });
      }
      currentRef = line.replace(/^\s*\d+[\.\)]\s+/, '');
    } else if (line) {
      currentRef += (currentRef ? ' ' : '') + line;
    }
  }

  if (currentRef.length > 20) {
    refs.push({ type: 'misc', raw: currentRef, ...guessRefFields(currentRef) });
  }

  return refs;
}

function guessRefFields(line: string): Partial<ExtractedReference> {
  const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
  const authorMatch = line.match(/^([A-Z][a-z]+,?\s+[A-Z]\.(?:\s+[A-Z]\.?)*(?:\s+[A-Z][a-z]+,?)*)/);
  const titleMatch = line.match(/"([^"]{10,100})"|'([^']{10,100})'/);

  return {
    year:   yearMatch?.[1],
    author: authorMatch?.[1],
    title:  titleMatch?.[1] || titleMatch?.[2],
  };
}
