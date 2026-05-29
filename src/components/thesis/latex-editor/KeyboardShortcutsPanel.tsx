// ============================================================
// ThesisForge — Keyboard Shortcuts Panel
// Documents all available editor keyboard shortcuts.
// ENHANCED: Organized by category, includes editor-native shortcuts.
// ============================================================

'use client';

import { useEditorStore } from '../../../lib/editor-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';

const SHORTCUT_GROUPS = [
  {
    label: 'Compilation & Lint',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'],       label: 'Run compilation simulation' },
      { keys: ['Ctrl', 'S'],           label: 'Lint + auto-save' },
    ],
  },
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'G'],           label: 'Go to line' },
      { keys: ['Ctrl', 'Home'],        label: 'Go to file start' },
      { keys: ['Ctrl', 'End'],         label: 'Go to file end' },
      { keys: ['Home'],                label: 'Go to line start' },
      { keys: ['End'],                 label: 'Go to line end' },
      { keys: ['Ctrl', 'F'],           label: 'Find' },
      { keys: ['Ctrl', 'H'],           label: 'Find & Replace' },
    ],
  },
  {
    label: 'Editor Panels',
    shortcuts: [
      { keys: ['Ctrl', 'B'],           label: 'Toggle sidebar (alias)' },
      { keys: ['Ctrl', '\\'],          label: 'Toggle sidebar' },
      { keys: ['Ctrl', 'J'],           label: 'Toggle diagnostics panel' },
      { keys: ['Ctrl', 'P'],           label: 'Toggle preview panel' },
      { keys: ['?'],                   label: 'Show this shortcuts dialog' },
    ],
  },
  {
    label: 'Editing',
    shortcuts: [
      { keys: ['Ctrl', 'Z'],           label: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'],  label: 'Redo' },
      { keys: ['Ctrl', '/'],           label: 'Toggle line comment' },
      { keys: ['Ctrl', 'D'],           label: 'Select next occurrence' },
      { keys: ['Ctrl', 'Shift', 'K'],  label: 'Delete line' },
      { keys: ['Ctrl', 'Shift', 'L'],  label: 'Select all occurrences' },
      { keys: ['Ctrl', 'L'],           label: 'Select current line' },
      { keys: ['Alt', 'Up/Down'],       label: 'Move line up/down' },
      { keys: ['Ctrl', ']'],           label: 'Indent line' },
      { keys: ['Ctrl', '['],           label: 'Outdent line' },
      { keys: ['Tab'],                 label: 'Accept snippet / indent' },
      { keys: ['Shift', 'Tab'],        label: 'Outdent' },
    ],
  },
  {
    label: 'Advanced',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'P'],  label: 'Command palette' },
      { keys: ['F1'],                  label: 'Command palette (alias)' },
      { keys: ['Ctrl', 'K'],           label: 'Quick open' },
      { keys: ['Ctrl', 'Shift', 'M'],  label: 'Toggle minimap' },
      { keys: ['Ctrl', 'Shift', 'W'],  label: 'Toggle word wrap' },
    ],
  },
];

export function KeyboardShortcutsPanel() {
  const ui        = useEditorStore(s => s.ui);
  const setUI     = useEditorStore(s => s.setUI);
  const isOpen    = ui.shortcutsOpen;

  const totalShortcuts = SHORTCUT_GROUPS.reduce((sum, g) => sum + g.shortcuts.length, 0);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => setUI({ shortcutsOpen: open })}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {totalShortcuts} shortcuts available in the LaTeX editor
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.label}>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {group.label}
              </h3>
              <div className="space-y-0.5">
                {group.shortcuts.map(({ keys, label }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-0.5">
                      {keys.map((k, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="text-[9px] text-muted-foreground/50 mx-0.5">+</span>
                          )}
                          <kbd
                            className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded text-[10px] font-mono bg-muted border border-border text-foreground"
                          >
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
