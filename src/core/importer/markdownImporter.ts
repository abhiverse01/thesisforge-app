// ============================================================
// ThesisForge Import — Markdown Importer
// Parses .md files to extract thesis metadata, chapters, and
// references using common Markdown heading conventions.
// ============================================================

import type { ImportResult, ExtractedChapter, ExtractedReference } from './types';
import { detectTemplate } from './templateDetector';
import { scoreConfidence } from './confidenceScorer';
import { extractTitleSmart, extractAuthorsSmart, extractAbstractSmart, extractKeywordsSmart } from './contentIntelligence';

export async function importMarkdown(file: File): Promise<ImportResult> {
  const text = await file.text();
  return parseMarkdown(text, file.name);
}

export function parseMarkdown(md: string, fileName: string): ImportResult {
  const lines = md.split('\n');
  const metadata = extractMarkdownMetadata(md);

  // GODMODE: Content intelligence fallback for Markdown
  if (!metadata.title) { const t = extractTitleSmart(md); if (t) metadata.title = t; }
  if (!metadata.author) { const a = extractAuthorsSmart(md); if (a.length > 0) metadata.author = a[0]; }
  if (!metadata.abstract) { const ab = extractAbstractSmart(md); if (ab) metadata.abstract = ab; }
  if (!metadata.keywords || metadata.keywords.length === 0) { const kw = extractKeywordsSmart(md, metadata); if (kw.length > 0) metadata.keywords = kw; }

  const chapters = extractMarkdownChapters(lines);
  const references = extractMarkdownReferences(lines);

  const detectedTemplate = detectTemplate(metadata, chapters);
  const confidence = scoreConfidence({ metadata, chapters, references });

  const warnings: string[] = [];
  if (lines.length < 20) warnings.push('Document appears to have very little content');
  if (!metadata.title) warnings.push('No title detected — consider adding a top-level # Heading or YAML frontmatter title');
  if (chapters.length === 0) warnings.push('No chapter headings found — use ## or ### headings to define chapters');

  return {
    source:          'md',
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

// ---- YAML Frontmatter Parser ----

function parseFrontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/m);
  if (!match) return {};

  const fields: Record<string, string> = {};
  const fmLines = match[1].split('\n');
  let currentKey = '';
  let currentValue = '';

  for (const line of fmLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      // Continuation of previous value (indented line)
      if (currentKey && line.startsWith('  ')) {
        currentValue += ' ' + line.trim();
      }
      continue;
    }

    // Save previous key-value
    if (currentKey && currentValue) {
      let value = currentValue.trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (currentKey && value) fields[currentKey] = value;
    }

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    currentValue = line.slice(colonIdx + 1).trim();
    currentKey = key;
  }

  // Don't forget the last key-value
  if (currentKey && currentValue) {
    let value = currentValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (currentKey && value) fields[currentKey] = value;
  }

  return fields;
}

// ---- Metadata Extraction ----

function extractMarkdownMetadata(md: string) {
  const meta: Record<string, any> = {};
  const fm = parseFrontmatter(md);
  const lines = md.split('\n');

  // Title: from frontmatter, or first H1
  if (fm.title) {
    meta.title = fm.title;
  } else {
    const h1 = lines.find(l => /^#\s+[^#]/.test(l));
    if (h1) meta.title = h1.replace(/^#\s+/, '').trim();
  }

  // Author
  if (fm.author) {
    meta.author = fm.author;
  } else {
    const authorLine = lines.find(l => /^\s*author[s]?\s*[:：]/i.test(l));
    if (authorLine) meta.author = authorLine.replace(/^\s*author[s]?\s*[:：]\s*/i, '').trim();
  }

  // Institution
  if (fm.institution || fm.university) {
    meta.institution = fm.institution || fm.university;
  } else {
    const instLine = lines.find(l => /\b(?:university|college|institute|school)\b/i.test(l) && l.split(' ').length <= 15);
    if (instLine) meta.institution = instLine.trim();
  }

  // Supervisor
  if (fm.supervisor || fm.advisor) {
    meta.supervisor = fm.supervisor || fm.advisor;
  } else {
    const supLine = lines.find(l => /^\s*(?:supervisor|advisor|adviser)\s*[:：]/i.test(l));
    if (supLine) meta.supervisor = supLine.replace(/^\s*(?:supervisor|advisor|adviser)\s*[:：]\s*/i, '').trim();
  }

  // Department
  if (fm.department) meta.department = fm.department;
  if (fm.faculty) meta.faculty = fm.faculty;

  // Subtitle
  if (fm.subtitle) meta.subtitle = fm.subtitle;

  // Year
  if (fm.year) {
    meta.year = String(fm.year).match(/\d{4}/)?.[0] || fm.year;
  } else {
    const yearMatch = md.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) meta.year = yearMatch[1];
  }

  // Abstract: look for ## Abstract section
  const abstractIdx = lines.findIndex(l => /^##\s+abstract\b/i.test(l));
  if (abstractIdx > -1) {
    const abstractParts: string[] = [];
    for (let i = abstractIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^##\s/.test(line) && !/^##\s+abstract\b/i.test(line)) break;
      if (line.trim() && !line.startsWith('#')) abstractParts.push(line.trim());
    }
    if (abstractParts.length > 0) meta.abstract = abstractParts.join(' ');
  }

  // Keywords
  if (fm.keywords) {
    meta.keywords = fm.keywords.split(/[,;]/).map(k => k.trim()).filter(Boolean);
  } else {
    const kwLine = lines.find(l => /^\s*keywords?\s*[:：]/i.test(l));
    if (kwLine) {
      meta.keywords = kwLine.replace(/^\s*keywords?\s*[:：]\s*/i, '')
        .split(/[,;]/).map(k => k.trim()).filter(k => k.length > 1);
    }
  }

  // Degree detection
  const degreePatterns = [
    { re: /doctor of philosophy|ph\.?d/i, abbrev: 'phd', full: 'Doctor of Philosophy' },
    { re: /master of science|m\.?s\.?c/i, abbrev: 'master', full: 'Master of Science' },
    { re: /master of arts|m\.?a\b/i, abbrev: 'master', full: 'Master of Arts' },
    { re: /bachelor of science|b\.?s\.?c/i, abbrev: 'bachelor', full: 'Bachelor of Science' },
  ];
  for (const { re, abbrev, full } of degreePatterns) {
    if (re.test(md)) {
      meta.degreeAbbrev = abbrev;
      meta.degree = full;
      break;
    }
  }

  return meta;
}

// ---- Chapter Extraction ----

function extractMarkdownChapters(lines: string[]): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];

  // Find H2 headings as chapter boundaries (skip H1 which is typically the title)
  const headingPositions: Array<{ title: string; index: number }> = [];
  const skipHeadings = /^(abstract|acknowledgements?|dedication|table of contents|references|bibliography|appendix|keywords?|list of)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match H2 (## ) or H3 (### ) as chapter/section boundaries
    const h2Match = line.match(/^##\s+(?!#)(.+)/);
    const h3Match = !h2Match ? line.match(/^###\s+(?!#)(.+)/) : null;

    if (h2Match) {
      const title = h2Match[1].trim();
      if (skipHeadings.test(title)) continue;
      headingPositions.push({ title, index: i });
    }
  }

  // Fallback: if no H2, use H3
  if (headingPositions.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const h3Match = lines[i].match(/^###\s+(?!#)(.+)/);
      if (h3Match) {
        const title = h3Match[1].trim();
        if (skipHeadings.test(title)) continue;
        headingPositions.push({ title, index: i });
      }
    }
  }

  // Second fallback: if no H2 or H3, try H1 (excluding the first H1 which is typically the title)
  if (headingPositions.length === 0) {
    const h1Positions: Array<{ title: string; index: number }> = [];
    for (let i = 0; i < lines.length; i++) {
      const h1Match = lines[i].match(/^#\s+(?!#)(.+)/);
      if (h1Match) {
        const title = h1Match[1].trim();
        if (skipHeadings.test(title)) continue;
        h1Positions.push({ title, index: i });
      }
    }
    // Skip first H1 (title) and use the rest as chapters
    if (h1Positions.length > 1) {
      headingPositions.push(...h1Positions.slice(1));
    }
  }

  // Build chapters
  for (let i = 0; i < headingPositions.length; i++) {
    const start = headingPositions[i].index + 1;
    const end = i + 1 < headingPositions.length ? headingPositions[i + 1].index : lines.length;

    const bodyParts: string[] = [];
    const subHeadings: Array<{ title: string; index: number }> = [];

    for (let j = start; j < end; j++) {
      const line = lines[j];

      // Sub-sections are H3 under an H2
      if (/^###\s+(?!#)(.+)/.test(line)) {
        const subTitle = line.replace(/^###\s+(?!#)/, '').trim();
        subHeadings.push({ title: subTitle, index: j });
      } else if (!/^#{1,4}\s/.test(line)) {
        // Non-heading lines become body content
        if (line.trim()) bodyParts.push(line.trim());
      }
    }

    const body = bodyParts.join('\n\n').trim();
    if (body.split(' ').length < 15) continue;

    const subsections = subHeadings.slice(0, 8).map((sub, si) => {
      const subStart = sub.index + 1;
      const subEnd = si + 1 < subHeadings.length ? subHeadings[si + 1].index : end;
      const subParts: string[] = [];
      for (let k = subStart; k < subEnd; k++) {
        if (!/^#{1,4}\s/.test(lines[k]) && lines[k].trim()) {
          subParts.push(lines[k].trim());
        }
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

function extractMarkdownReferences(lines: string[]): ExtractedReference[] {
  const refs: ExtractedReference[] = [];

  // Find the references section
  let refStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+(references|bibliography|works?\s+cited)\b/i.test(lines[i])) {
      refStartIdx = i + 1;
      break;
    }
  }

  if (refStartIdx === -1) return refs;

  // Collect reference entries
  let currentRef = '';
  for (let i = refStartIdx; i < lines.length && refs.length < 60; i++) {
    const line = lines[i];

    // Stop at next H2
    if (/^##\s+(?!#)/.test(line)) break;

    // Numbered references like "1. Author, Title..."
    const numMatch = line.match(/^\s*\d+[\.\)]\s+/);
    if (numMatch && currentRef) {
      // Push previous ref
      if (currentRef.length > 20) {
        refs.push({ type: 'misc', raw: currentRef, ...guessRefFields(currentRef) });
      }
      currentRef = line.replace(/^\s*\d+[\.\)]\s+/, '').trim();
    } else if (line.trim()) {
      currentRef += (currentRef ? ' ' : '') + line.trim();
    }
  }

  // Push last ref
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
