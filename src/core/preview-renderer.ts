// ============================================================
// ThesisForge — PDF Preview Renderer
// Converts ThesisData into a self-contained HTML string
// that looks like a rendered PDF page (A4 paper layout).
// ============================================================

import type { ThesisData, ThesisChapter, ThesisReference } from '@/lib/thesis-types';

export interface PreviewConfig {
  fontSize: '10pt' | '11pt' | '12pt';
  lineSpacing: 'single' | 'onehalf' | 'double';
  paperSize: 'a4' | 'letter';
}

const DEFAULT_CONFIG: PreviewConfig = {
  fontSize: '12pt',
  lineSpacing: 'onehalf',
  paperSize: 'a4',
};

// ── HTML escaping ────────────────────────────────────────────
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Line height mapping ─────────────────────────────────────
function lineHeight(spacing: PreviewConfig['lineSpacing']): string {
  switch (spacing) {
    case 'single':  return '1.5';
    case 'onehalf': return '1.8';
    case 'double':  return '2.2';
  }
}

// ── Font size mapping (px) ──────────────────────────────────
function fontSizePx(size: PreviewConfig['fontSize']): string {
  switch (size) {
    case '10pt': return '13.3px';
    case '11pt': return '14.7px';
    case '12pt': return '16px';
  }
}

// ── Paper dimensions ────────────────────────────────────────
function paperDimensions(size: PreviewConfig['paperSize']): { width: string; minHeight: string } {
  switch (size) {
    case 'a4':
      return { width: '210mm', minHeight: '297mm' };
    case 'letter':
      return { width: '8.5in', minHeight: '11in' };
  }
}

// ── Simple markdown-to-HTML converter ───────────────────────
// Handles ## and ### headings, bold, italic, paragraphs
function renderMarkdown(text: string): string {
  if (!text.trim()) return '';

  const lines = text.split('\n');
  const htmlParts: string[] = [];
  let inParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Close paragraph if we hit a heading or blank line
    if (inParagraph && (trimmed === '' || trimmed.startsWith('###') || trimmed.startsWith('##'))) {
      htmlParts.push('</p>');
      inParagraph = false;
    }

    // Blank line — skip
    if (trimmed === '') continue;

    // H3 heading
    if (trimmed.startsWith('### ')) {
      const headingText = esc(trimmed.slice(4)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      htmlParts.push(`<h3 style="font-size:1.05em;font-weight:600;margin:16px 0 8px 0;color:#374151;">${headingText}</h3>`);
      continue;
    }

    // H2 heading
    if (trimmed.startsWith('## ')) {
      const headingText = esc(trimmed.slice(3)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      htmlParts.push(`<h2 style="font-size:1.15em;font-weight:700;margin:20px 0 10px 0;color:#1f2937;">${headingText}</h2>`);
      continue;
    }

    // Regular text — inline formatting
    const formattedLine = esc(trimmed)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:0.9em;font-family:monospace;">$1</code>');

    if (!inParagraph) {
      htmlParts.push(`<p style="margin:0 0 6px 0;">${formattedLine}`);
      inParagraph = true;
    } else {
      // Continue same paragraph (double newline separates paragraphs in markdown,
      // but we're being lenient here for thesis content)
      htmlParts.push(`<br/>${formattedLine}`);
    }
  }

  if (inParagraph) {
    htmlParts.push('</p>');
  }

  return htmlParts.join('\n');
}

// ── Title page ──────────────────────────────────────────────
function renderTitlePage(data: ThesisData): string {
  const { metadata } = data;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:297mm;padding:60mm 25mm 40mm 25mm;text-align:center;">
      ${metadata.university ? `<div style="font-size:1.1em;color:#6b7280;margin-bottom:30px;letter-spacing:0.05em;">${esc(metadata.university)}</div>` : ''}
      ${metadata.faculty ? `<div style="font-size:0.9em;color:#9ca3af;margin-bottom:40px;">${esc(metadata.faculty)}</div>` : ''}

      <div style="font-size:2em;font-weight:700;color:#111827;margin-bottom:12px;line-height:1.3;">
        ${esc(metadata.title || 'Untitled Thesis')}
      </div>
      ${metadata.subtitle ? `<div style="font-size:1.2em;color:#6b7280;margin-bottom:40px;font-style:italic;">${esc(metadata.subtitle)}</div>` : ''}

      <div style="width:60px;height:2px;background:linear-gradient(to right,transparent,#d1d5db,transparent);margin-bottom:40px;"></div>

      <div style="font-size:1.1em;color:#374151;margin-bottom:8px;">${esc(metadata.author || 'Author Name')}</div>
      ${metadata.authorId ? `<div style="font-size:0.85em;color:#9ca3af;margin-bottom:30px;">${esc(metadata.authorId)}</div>` : ''}

      ${metadata.supervisor ? `
        <div style="font-size:0.9em;color:#6b7280;margin-top:30px;">
          Supervisor: <span style="color:#374151;">${esc(metadata.supervisorTitle)} ${esc(metadata.supervisor)}</span>
        </div>
      ` : ''}
      ${metadata.coSupervisor ? `
        <div style="font-size:0.9em;color:#6b7280;margin-top:6px;">
          Co-Supervisor: <span style="color:#374151;">${esc(metadata.coSupervisorTitle)} ${esc(metadata.coSupervisor)}</span>
        </div>
      ` : ''}

      ${metadata.submissionDate ? `
        <div style="font-size:0.85em;color:#9ca3af;margin-top:40px;">${esc(metadata.submissionDate)}</div>
      ` : ''}
      ${metadata.location ? `<div style="font-size:0.85em;color:#9ca3af;">${esc(metadata.location)}</div>` : ''}
    </div>
  `;
}

// ── Abstract page ───────────────────────────────────────────
function renderAbstract(data: ThesisData): string {
  if (!data.abstract.trim() && data.keywords.length === 0) return '';

  return `
    <div style="padding:30mm 25mm;">
      <h1 style="font-size:1.6em;font-weight:700;color:#111827;margin-bottom:20px;text-align:center;">Abstract</h1>
      <div style="max-width:160mm;margin:0 auto;text-align:justify;">
        ${renderMarkdown(data.abstract)}
        ${data.keywords.length > 0 ? `
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
            <span style="font-weight:600;color:#374151;">Keywords:</span>
            <span style="color:#6b7280;">${data.keywords.map(k => esc(k)).join(', ')}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ── Single chapter ──────────────────────────────────────────
function renderChapter(chapter: ThesisChapter, isAbstract: boolean = false): string {
  const parts: string[] = [];

  // Chapter heading
  if (!isAbstract) {
    parts.push(`
      <div style="margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid #e5e7eb;">
        <div style="font-size:0.8em;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Chapter ${chapter.number}</div>
        <h1 style="font-size:1.5em;font-weight:700;color:#111827;margin:0;line-height:1.3;">${esc(chapter.title)}</h1>
      </div>
    `);
  }

  // Chapter body content
  if (chapter.content.trim()) {
    parts.push(`<div style="text-align:justify;margin-bottom:16px;">${renderMarkdown(chapter.content)}</div>`);
  }

  // Subsections
  for (const sub of chapter.subSections) {
    if (sub.content.trim() || sub.title) {
      parts.push(`
        <div style="margin-bottom:16px;margin-top:20px;">
          <h2 style="font-size:1.15em;font-weight:600;color:#374151;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #f3f4f6;">${esc(sub.title)}</h2>
          ${sub.content.trim() ? `<div style="text-align:justify;">${renderMarkdown(sub.content)}</div>` : ''}
        </div>
      `);
    }
  }

  return parts.join('\n');
}

// ── References section ──────────────────────────────────────
function renderReferences(references: ThesisReference[]): string {
  if (references.length === 0) return '';

  const items = references.map((ref, i) => {
    const parts: string[] = [];
    parts.push(`<span style="color:#6b7280;">[${i + 1}]</span>`);

    if (ref.authors) parts.push(`<span>${esc(ref.authors)}</span>`);
    if (ref.title) parts.push(`<em>"${esc(ref.title)}"</em>`);

    const venue: string[] = [];
    if (ref.journal) venue.push(esc(ref.journal));
    if (ref.bookTitle) venue.push(`In <em>${esc(ref.bookTitle)}</em>`);
    if (ref.publisher) venue.push(esc(ref.publisher));
    if (ref.school) venue.push(esc(ref.school));
    if (ref.volume) venue.push(`vol. ${esc(ref.volume)}`);
    if (ref.number) venue.push(`no. ${esc(ref.number)}`);
    if (ref.pages) venue.push(`pp. ${esc(ref.pages)}`);

    if (venue.length > 0) {
      parts.push(`<span style="color:#4b5563;">${venue.join(', ')}</span>`);
    }

    if (ref.year) parts.push(`<span style="color:#4b5563;">(${esc(ref.year)})</span>`);

    return `<li style="margin-bottom:10px;padding-left:8px;line-height:1.6;">${parts.join(' ')}</li>`;
  });

  return `
    <div style="padding:30mm 25mm;">
      <h1 style="font-size:1.6em;font-weight:700;color:#111827;margin-bottom:24px;text-align:center;">References</h1>
      <ol style="list-style:none;counter-reset:ref;padding:0;max-width:170mm;margin:0 auto;">
        ${items.join('\n')}
      </ol>
    </div>
  `;
}

// ── Tex outline mode ────────────────────────────────────────
export function renderTexOutline(texContent: string): string {
  const lines = texContent.split('\n');
  const chapters: { level: number; title: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Match \chapter{...}
    const chapterMatch = trimmed.match(/\\chapter\*?\{([^}]+)\}/);
    if (chapterMatch) {
      chapters.push({ level: 1, title: chapterMatch[1], line: i + 1 });
      continue;
    }

    // Match \section{...}
    const sectionMatch = trimmed.match(/\\section\*?\{([^}]+)\}/);
    if (sectionMatch) {
      chapters.push({ level: 2, title: sectionMatch[1], line: i + 1 });
      continue;
    }

    // Match \subsection{...}
    const subsectionMatch = trimmed.match(/\\subsection\*?\{([^}]+)\}/);
    if (subsectionMatch) {
      chapters.push({ level: 3, title: subsectionMatch[1], line: i + 1 });
      continue;
    }

    // Match \subsubsection{...}
    const subsubsectionMatch = trimmed.match(/\\subsubsection\*?\{([^}]+)\}/);
    if (subsubsectionMatch) {
      chapters.push({ level: 4, title: subsubsectionMatch[1], line: i + 1 });
      continue;
    }

    // Match \paragraph{...}
    const paragraphMatch = trimmed.match(/\\paragraph\*?\{([^}]+)\}/);
    if (paragraphMatch) {
      chapters.push({ level: 5, title: paragraphMatch[1], line: i + 1 });
      continue;
    }

    // Match ## and ### and #### markdown headings
    const mdH2Match = trimmed.match(/^##\s+(.+)/);
    if (mdH2Match) {
      chapters.push({ level: 2, title: mdH2Match[1], line: i + 1 });
      continue;
    }
    const mdH3Match = trimmed.match(/^###\s+(.+)/);
    if (mdH3Match) {
      chapters.push({ level: 3, title: mdH3Match[1], line: i + 1 });
      continue;
    }
    const mdH4Match = trimmed.match(/^####\s+(.+)/);
    if (mdH4Match) {
      chapters.push({ level: 4, title: mdH4Match[1], line: i + 1 });
      continue;
    }
  }

  if (chapters.length === 0) {
    return `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-family:system-ui,sans-serif;">
        <div style="text-align:center;">
          <div style="font-size:2rem;margin-bottom:12px;opacity:0.4;">📄</div>
          <div style="font-size:0.9rem;">No document structure detected</div>
          <div style="font-size:0.75rem;margin-top:4px;opacity:0.6;">Use \\chapter{} or ## headings in your .tex file</div>
        </div>
      </div>
    `;
  }

  const items = chapters.map(item => {
    const indent = Math.min((item.level - 1) * 18, 72);
    const fontSize = item.level === 1 ? '1em' : item.level === 2 ? '0.9em' : item.level <= 3 ? '0.82em' : '0.78em';
    const fontWeight = item.level <= 2 ? (item.level === 1 ? '700' : '600') : '400';
    const color = item.level === 1 ? '#111827' : item.level === 2 ? '#374151' : item.level === 3 ? '#6b7280' : '#9ca3af';
    const bgStyle = item.level === 1 ? 'background:#f9fafb;' : '';

    return `
      <div style="display:flex;align-items:center;padding:${item.level <= 2 ? '8px' : '5px'} 12px;border-radius:6px;margin-bottom:2px;${bgStyle}">
        <span style="font-size:${fontSize};font-weight:${fontWeight};color:${color};padding-left:${indent}px;flex:1;">${esc(item.title)}</span>
        <span style="font-size:0.7em;color:#d1d5db;font-family:monospace;">L${item.line}</span>
      </div>
    `;
  });

  return `
    <div style="padding:24px 16px;font-family:system-ui,sans-serif;">
      <div style="font-size:0.75em;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;padding:0 12px;">
        Document Structure (${chapters.length} section${chapters.length !== 1 ? 's' : ''})
      </div>
      ${items.join('\n')}
    </div>
  `;
}

// ── Main renderer ───────────────────────────────────────────
export function renderThesisToHTML(data: ThesisData, config: PreviewConfig = DEFAULT_CONFIG): string {
  const { width, minHeight } = paperDimensions(config.paperSize);
  const fs = fontSizePx(config.fontSize);
  const lh = lineHeight(config.lineSpacing);

  // Gather all page sections
  const sections: string[] = [];

  // Title page
  sections.push(renderTitlePage(data));

  // Abstract
  const abstractHTML = renderAbstract(data);
  if (abstractHTML) sections.push(abstractHTML);

  // Chapters
  for (const chapter of data.chapters) {
    sections.push(`
      <div style="padding:30mm 25mm;page-break-before:always;">
        ${renderChapter(chapter)}
      </div>
    `);
  }

  // References
  const refsHTML = renderReferences(data.references);
  if (refsHTML) sections.push(refsHTML);

  // Dedication
  if (data.metadata.dedication?.trim()) {
    sections.push(`
      <div style="display:flex;align-items:center;justify-content:center;min-height:200mm;padding:60mm 25mm;text-align:center;font-style:italic;color:#6b7280;">
        ${esc(data.metadata.dedication)}
      </div>
    `);
  }

  // Acknowledgment
  if (data.metadata.acknowledgment?.trim()) {
    sections.push(`
      <div style="padding:30mm 25mm;">
        <h1 style="font-size:1.6em;font-weight:700;color:#111827;margin-bottom:20px;text-align:center;">Acknowledgments</h1>
        <div style="text-align:justify;max-width:160mm;margin:0 auto;">${renderMarkdown(data.metadata.acknowledgment)}</div>
      </div>
    `);
  }

  const body = sections.join('');
  const totalPages = sections.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(data.metadata.title || 'Thesis Preview')}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: #6b7280; }
  body {
    font-family: Georgia, 'Times New Roman', Times, serif;
    font-size: ${fs};
    line-height: ${lh};
    color: #1f2937;
    -webkit-font-smoothing: antialiased;
  }
  .paper {
    background: #ffffff;
    width: ${width};
    min-height: ${minHeight};
    margin: 12px auto;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .page-footer {
    text-align: center;
    font-size: 0.75em;
    color: #d1d5db;
    padding: 16px 0;
    font-family: system-ui, -apple-system, sans-serif;
    border-top: 1px solid #f3f4f6;
  }
  @media print {
    html { background: white; }
    .paper { box-shadow: none; margin: 0; border-radius: 0; }
    .page-footer { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
<div class="paper">
  ${body}
  <div class="page-footer">
    Generated by ThesisForge &mdash; ${totalPages} page${totalPages !== 1 ? 's' : ''}
  </div>
</div>
</body>
</html>`;
}
