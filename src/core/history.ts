// ============================================================
// Godmode 4 — Undo / Redo History Stack
// Linear history with max 50 entries. Each push clears the redo stack.
// ============================================================

const MAX_HISTORY = 50;

export interface HistoryEntry {
  id: string;
  state: string; // JSON-serialized thesis state snapshot
  timestamp: number;
  description: string;
}

class HistoryStack {
  private past: HistoryEntry[] = [];
  private present: HistoryEntry | null = null;
  private future: HistoryEntry[] = [];

  /** Push current state. Clears redo stack. */
  push(state: object, description: string): void {
    const serialized = JSON.stringify(state);

    if (this.present) {
      // Avoid pushing duplicate states
      if (this.present.state === serialized) return;
      this.past.push(this.present);
      if (this.past.length > MAX_HISTORY) {
        this.past.shift();
      }
    }

    this.present = {
      id: crypto.randomUUID(),
      state: serialized,
      timestamp: Date.now(),
      description,
    };
    this.future = [];
  }

  /** Pop from past, move present to future. Returns the entry to undo TO. */
  undo(): HistoryEntry | null {
    if (!this.past.length || !this.present) return null;
    const entry = this.past.pop()!;
    this.future.unshift(this.present);
    this.present = entry;
    return entry;
  }

  /** Pop from future, move present to past. Returns the entry to redo TO. */
  redo(): HistoryEntry | null {
    if (!this.future.length || !this.present) return null;
    const entry = this.future.shift()!;
    this.past.push(this.present);
    this.present = entry;
    return entry;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  getUndoDescription(): string | null {
    if (!this.past.length) return null;
    return this.past[this.past.length - 1]?.description ?? null;
  }

  getRedoDescription(): string | null {
    if (!this.future.length) return null;
    return this.future[0]?.description ?? null;
  }

  get size(): number {
    return this.past.length + (this.present ? 1 : 0);
  }
}

export const historyStack = new HistoryStack();
