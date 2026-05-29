// ============================================================
// ThesisForge — Editor Bridge
// Translates between wizard ThesisData and editor files.
// This is the seam between the wizard world and the editor world.
//
// FIX: Proper error handling in export, remove dead ternary.
// ============================================================

import type { ThesisData } from '../lib/thesis-types';
import { generateLatex, generateBibtexFile } from '../lib/latex-generator';
import type { EditorFile } from '../lib/editor-store';
import JSZip from 'jszip';

export interface EditorInitData {
  files:   Record<EditorFile, string>;
  title:   string;
  author:  string;
  draftId: string;
}

/**
 * Convert wizard ThesisData into editor files.
 * Called when opening the editor from the wizard.
 */
export async function wizardToEditorFiles(
  data:    ThesisData,
  draftId: string
): Promise<EditorInitData> {
  const tex = generateLatex(data);
  const bib = generateBibtexFile(data);
  const readme = buildEditorReadme(data, tex);

  return {
    files: {
      'main.tex':       tex,
      'references.bib': bib,
      'readme.md':      readme,
    },
    title:   data.metadata?.title  || 'Untitled Thesis',
    author:  data.metadata?.author || '',
    draftId,
  };
}

/**
 * Export editor files as a ZIP download.
 * Lightweight alternative to exportThesis — works with raw tex/bib strings.
 */
export async function exportEditorZip(
  tex:    string,
  bib:    string,
  readme: string,
  filename = 'thesis.zip'
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('thesis');
  if (!folder) throw new Error('Failed to create ZIP folder');

  folder.file('main.tex', tex);
  folder.file('references.bib', bib);
  folder.file('README.md', readme);

  // Add Makefile for one-command compilation
  const compiler = tex.includes('fontspec') ? 'xelatex' : 'pdflatex';
  const bibTool = tex.includes('biblatex') ? 'biber' : 'bibtex';
  folder.file('Makefile', `# ThesisForge — Auto-generated Makefile
# Compiler: ${compiler}

.PHONY: all clean view

MAIN = main

all: $(MAIN).pdf

$(MAIN).pdf: $(MAIN).tex references.bib
\t${compiler} $(MAIN)
\t${bibTool} $(MAIN)
\t${compiler} $(MAIN)
\t${compiler} $(MAIN)

view: $(MAIN).pdf
\t@echo "Opening $(MAIN).pdf..."

clean:
\trm -f $(MAIN).aux $(MAIN).bbl $(MAIN).blg $(MAIN).log $(MAIN).out $(MAIN).toc $(MAIN).pdf
`);

  // Add figures placeholder
  const figuresFolder = folder.folder('figures');
  if (figuresFolder) {
    figuresFolder.file('PLACEHOLDER.txt',
      'Place your figures here.\nSupported formats: .pdf, .png, .jpg, .eps\n'
    );
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  try { document.body.removeChild(a); } catch {}
  // GODMODE 13: Bumped from 10s to 30s — large ZIPs on slow connections
  // need more time before the browser revokes the blob URL.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Export individual files from the editor (no ZIP, direct download).
 * Supports .tex, .bib, and .md file types.
 * FIX: Proper MIME types per file extension for correct browser handling.
 */
const FILE_MIME_TYPES: Record<string, string> = {
  '.tex': 'text/x-tex;charset=utf-8',
  '.bib': 'text/x-bibtex;charset=utf-8',
  '.md':  'text/markdown;charset=utf-8',
  '.txt': 'text/plain;charset=utf-8',
};

function getFileMimeType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return FILE_MIME_TYPES[ext] || 'text/plain;charset=utf-8';
}

export function exportSingleFile(content: string, filename: string): void {
  const mime = getFileMimeType(filename);
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  try { document.body.removeChild(a); } catch {}
  // GODMODE 13: Bumped from 10s to 30s for consistency with export.ts
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function buildEditorReadme(data: ThesisData, tex?: string): string {
  // Determine compiler based on packages used
  // FIX: Accept pre-generated tex to avoid redundant LaTeX generation
  const resolvedTex = tex || generateLatex(data);
  const usesFontspec = resolvedTex.includes('fontspec');
  const compiler = usesFontspec ? 'xelatex' : 'pdflatex';
  const bibliography = resolvedTex.includes('biblatex')
    ? 'biber'
    : 'bibtex';

  return `# ${data.metadata?.title || 'Thesis'}

## Compilation

### Quick (Overleaf)
Upload this folder as a ZIP to overleaf.com → New Project → Upload Project.

### Local (${compiler})
\`\`\`bash
${compiler} main.tex
${bibliography} main
${compiler} main.tex
${compiler} main.tex
\`\`\`

## Files
- \`main.tex\`        — Main thesis document
- \`references.bib\`  — Bibliography database
- \`figures/\`        — Place figure files here

Generated by ThesisForge
`;
}
