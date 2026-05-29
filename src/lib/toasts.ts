// ============================================================
// ThesisForge — Typed Toast Helpers
// Wraps sonner toast() with contextual actions for common flows.
// ============================================================

import { toast } from 'sonner';

export const notify = {
  /** Auto-dismissing save confirmation */
  saved: () =>
    toast.success('Draft saved', { duration: 2000 }),

  /** Export success with Overleaf link */
  exported: (filename: string) =>
    toast.success('Thesis downloaded', {
      description: `${filename} — open in Overleaf to compile`,
      duration: 5000,
      action: {
        label:   'Open Overleaf',
        onClick: () => window.open('https://www.overleaf.com/project', '_blank'),
      },
    }),

  /** Import success with field/chapter count */
  importSuccess: (
    fileName: string,
    fieldsApplied: number,
    chaptersImported: number
  ) =>
    toast.success(`Imported ${fileName}`, {
      description: `${fieldsApplied} fields applied, ${chaptersImported} chapters filled in`,
      duration: 6000,
    }),

  /** Storage quota exceeded with backup download */
  quotaExceeded: (onDownload: () => void) =>
    toast.error('Storage full', {
      description: 'Your draft was downloaded as a backup',
      duration: Infinity,
      action: { label: 'Download backup', onClick: onDownload },
    }),

  /** Undo-able item deletion */
  undoDelete: (label: string, onUndo: () => void) =>
    toast(`"${label}" removed`, {
      duration: 4000,
      action: { label: 'Undo', onClick: onUndo },
    }),

  /** Lint issues found before export */
  lintError: (count: number, onFix: () => void) =>
    toast.warning(`${count} issue${count > 1 ? 's' : ''} found before export`, {
      description: 'Fix these to ensure clean compilation',
      duration: 8000,
      action: { label: 'Show issues', onClick: onFix },
    }),
};
