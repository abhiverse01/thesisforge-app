// ============================================================
// ThesisForge Store v2 — Zustand State Management with FSM
// 6-step wizard: Template → Metadata → Chapters → References → Format → Generate
//
// EXTENDED: Added pending delete with undo timer and referencesSkippable flag.
// ============================================================

import { create } from 'zustand';
import type {
  ThesisData,
  ThesisType,
  ThesisMetadata,
  ThesisChapter,
  ThesisSubSection,
  ThesisReference,
  ThesisAppendix,
  ThesisOptions,
  ReferenceType,
} from './thesis-types';
import { createDefaultThesisData } from './thesis-types';
import { transition, getProgressPercentage, type WizardStateName, TOTAL_WIZARD_STEPS } from '@/core/fsm';
import { sanitizeUserInput } from '@/utils/inputSanitizer';

import { validateStepForAdvance } from '@/core/fsmGuard';


const VALID_THESIS_TYPES: ThesisType[] = ['bachelor', 'master', 'phd', 'report', 'conference'];
function isValidThesisType(type: any): type is ThesisType {
  return VALID_THESIS_TYPES.includes(type);
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

// Map UI step numbers to FSM state names (6 steps, no ABSTRACT)
const STEP_TO_STATE: Record<number, WizardStateName> = {
  0: 'IDLE',
  1: 'TEMPLATE_SELECT',
  2: 'METADATA',
  3: 'CHAPTERS',
  4: 'REFERENCES',
  5: 'FORMAT',
  6: 'PREVIEW',
};

const STATE_TO_STEP: Record<WizardStateName, WizardStep> = {
  IDLE: 1,
  TEMPLATE_SELECT: 1,
  METADATA: 2,
  CHAPTERS: 3,
  REFERENCES: 4,
  FORMAT: 5,
  PREVIEW: 6,
};

// ============================================================
// Save status for the indicator
// ============================================================

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'quota-exceeded' | 'conflict';

/** Holds the pending-deleted item and its auto-commit timer */
interface PendingDelete<T> {
  /** The item awaiting permanent removal */
  item: T;
  /** setTimeout handle — when it fires, the delete is committed */
  timer: ReturnType<typeof setTimeout>;
}

interface ThesisStore {
  // Core state
  thesis: ThesisData | null;
  currentStep: WizardStep;
  selectedTemplate: ThesisType | null;
  saveStatus: SaveStatus;

  // Hydration guard — true after initial IndexedDB load completes
  // FIX(Production): Exposes hydration state so components (e.g. editor page)
  // can wait for the initial draft load before reading thesis data.
  _hydrated: boolean;
  setHydrated: () => void;

  // Wizard lifecycle
  wizardStarted: boolean;
  startWizard: () => void;

  // Wizard navigation (FSM-gated)
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: () => boolean;
  canGoToStep: (step: WizardStep) => boolean;

  // Template selection
  selectTemplate: (type: ThesisType) => void;

  // Metadata (includes abstract + keywords since they merged into this step)
  updateMetadata: (metadata: Partial<ThesisMetadata>) => void;
  setAbstract: (abstract: string) => void;
  setKeywords: (keywords: string[]) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;

  // Chapters
  addChapter: () => void;
  removeChapter: (id: string) => void;
  updateChapter: (id: string, updates: Partial<ThesisChapter>) => void;
  reorderChapters: (chapters: ThesisChapter[]) => void;
  addSubSection: (chapterId: string) => void;
  removeSubSection: (chapterId: string, subSectionId: string) => void;
  updateSubSection: (chapterId: string, subSectionId: string, updates: Partial<ThesisSubSection>) => void;

  // References
  addReference: () => void;
  removeReference: (id: string) => void;
  updateReference: (id: string, updates: Partial<ThesisReference>) => void;
  bulkImportReferences: (refs: ThesisReference[]) => void;

  // Appendices
  addAppendix: () => void;
  removeAppendix: (id: string) => void;
  updateAppendix: (id: string, updates: Partial<ThesisAppendix>) => void;

  // Options
  updateOptions: (options: Partial<ThesisOptions>) => void;

  // Save status
  setSaveStatus: (status: SaveStatus) => void;

  // Export generation state
  isGenerating: boolean;
  setGenerating: (generating: boolean) => void;

  // Undo support
  lastDeletedChapter: ThesisChapter | null;
  lastDeletedReference: ThesisReference | null;
  undoDeleteChapter: () => void;
  undoDeleteReference: () => void;

  // Pending delete with 5-second undo timer — prevents accidental permanent deletion
  pendingDeleteChapter: PendingDelete<ThesisChapter> | null;
  commitPendingChapterDelete: () => void;
  cancelPendingChapterDelete: () => void;

  pendingDeleteReference: PendingDelete<ThesisReference> | null;
  commitPendingReferenceDelete: () => void;
  cancelPendingReferenceDelete: () => void;

  // References skippable flag — when true, references step doesn't block advance
  referencesSkippable: boolean;
  setReferencesSkippable: (skippable: boolean) => void;

  // Export / Import
  exportProject: () => string;
  importProject: (jsonString: string) => boolean;

  // Completion
  getCompletionPercentage: () => number;

  // Progress
  getProgressPercent: () => number;

  // Navigation helpers
  goToHome: () => void;

  // Reset
  reset: () => void;

  // Validation
  lastErrors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  clearErrors: () => void;

  // FIX(ZONE-4A): Clear a specific field error when the user fixes it
  clearFieldError: (fieldPath: string) => void;

  // Sanitized field updates (Zone 6A/6C)
  updateChapterTitle: (id: string, rawTitle: string) => void;
  updateMetadataSanitized: (metadata: Partial<ThesisMetadata>) => void;
  updateChapterBody: (id: string, rawBody: string) => void;

  // Smart Import System
  applyImportData: (importData: {
    result: any;
    mappings: Array<{ field: string; value: string; apply: boolean }>;
  }) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** 5-second grace period before a pending delete is auto-committed */
const PENDING_DELETE_TIMEOUT_MS = 5000;

export const useThesisStore = create<ThesisStore>((set, get) => ({
  thesis: null,
  currentStep: 1,
  selectedTemplate: null,
  saveStatus: 'idle',
  _hydrated: false,
  isGenerating: false,
  wizardStarted: false,
  lastDeletedChapter: null,
  lastDeletedReference: null,
  lastErrors: {},
  pendingDeleteChapter: null,
  pendingDeleteReference: null,
  referencesSkippable: false,

  // ---- Wizard Lifecycle ----
  setHydrated: () => set({ _hydrated: true }),
  startWizard: () => set({ wizardStarted: true, currentStep: 1 }),

  // ---- Wizard Navigation (FSM-gated) ----
  setStep: (step) => {
    const { selectedTemplate, thesis, referencesSkippable } = get();
    if (!thesis) return;
    const targetState = STEP_TO_STATE[step] || 'IDLE';
    if (step > get().currentStep) {
      const validation = validateStepForAdvance(targetState, thesis, { referencesSkippable });
      if (!validation.canAdvance) {
        const errs: Record<string, string> = {};
        validation.issues.filter(i => i.severity === 'ERROR').forEach(i => { errs[i.field ?? '_step'] = i.message; });
        set({ lastErrors: errs });
        return;
      }
    }
    set({ currentStep: step, lastErrors: {} });
  },

  nextStep: () => {
    const { currentStep, selectedTemplate, thesis, referencesSkippable } = get();
    if (currentStep >= 6) return;
    // Step 1 (Template) → Step 2 (Metadata): only require a selected template.
    // The user hasn't entered metadata yet, so validating the target METADATA step
    // would block advance (title/author are empty). We only check template existence.
    if (currentStep === 1) {
      if (!selectedTemplate) {
        set({ lastErrors: { template: 'Select a template to continue.' } });
        return;
      }
      set({ currentStep: 2 as WizardStep, lastErrors: {} });
      return;
    }
    if (!thesis) return;
    const targetState = STEP_TO_STATE[currentStep + 1] || 'IDLE';
    const validation = validateStepForAdvance(targetState, thesis, { referencesSkippable });
    if (!validation.canAdvance) {
      const errs: Record<string, string> = {};
      validation.issues.filter(i => i.severity === 'ERROR').forEach(i => { errs[i.field ?? '_step'] = i.message; });
      set({ lastErrors: errs });
      return;
    }
    set({ currentStep: (currentStep + 1) as WizardStep, lastErrors: {} });
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep <= 1) return;
    set({ currentStep: (currentStep - 1) as WizardStep, lastErrors: {} });
  },

  canGoNext: () => {
    const { currentStep, selectedTemplate, thesis, referencesSkippable } = get();
    if (currentStep >= 6) return false;
    if (currentStep === 1) return !!selectedTemplate;
    if (currentStep === 2) {
      const meta = thesis?.metadata;
      return !!(meta?.title?.trim() && meta?.author?.trim());
    }
    // GODMODE: Step 3 (Chapters) must agree with validateChapters.
    // validateChapters returns ERROR when chapters.length === 0 or any chapter
    // has no title. Without this check, the Next button appears enabled but
    // nextStep() silently blocks — feels like a broken button.
    if (currentStep === 3) {
      if (!thesis?.chapters?.length) return false;
      const hasEmptyTitle = thesis.chapters.some((ch) => !ch.title?.trim());
      if (hasEmptyTitle) return false;
    }
    // FIXELEVEN: Added step 4 check — canGoNext must agree with nextStep's
    // validateStepForAdvance(). Without this, the Next button appears enabled
    // at step 4 when references are required but none exist, producing
    // validation errors instead of advancing.
    if (currentStep === 4 && !referencesSkippable) {
      return !!(thesis?.references?.length);
    }
    return true;
  },

  canGoToStep: (step) => {
    const { currentStep, selectedTemplate, thesis, referencesSkippable } = get();
    if (step <= currentStep) return true;
    if (step === 1) return true;
    if (!selectedTemplate) return false;
    if (step >= 2) {
      const meta = thesis?.metadata;
      if (!meta?.title?.trim() || !meta?.author?.trim()) return false;
    }
    if (step >= 3) {
      if (!thesis?.chapters?.length) return false;
    }
    // GODMODE 13: Check references requirement for step 4+ — previously canGoToStep
    // had no references check, allowing users to jump to step 5 with zero references
    // via "go to step" click, bypassing the validation that canGoNext enforces.
    if (step >= 4 && !referencesSkippable) {
      if (!(thesis?.references?.length)) return false;
    }
    return true;
  },

  // ---- Template Selection ----
  // FIX(ZONE-1C): Template switch resets template-specific fields (chapters, references)
  // and preserves only metadata (title/author are template-agnostic).
  // FIX: Removed `currentStep: 2` — clicking a template now only selects it for preview.
  // The user advances to step 2 via the Next/Continue button (wizard footer).
  selectTemplate: (type) => {
    const currentThesis = get().thesis;
    const newThesis = createDefaultThesisData(type);

    // Preserve metadata if switching templates mid-wizard
    if (currentThesis) {
      newThesis.metadata = {
        ...newThesis.metadata,
        // FIXELEVEN: Changed || to ?? — || treats empty string as falsy,
        // silently overwriting a user's deliberate empty value with the
        // template default. ?? only falls back on null/undefined.
        title: currentThesis.metadata.title ?? newThesis.metadata.title,
        author: currentThesis.metadata.author ?? newThesis.metadata.author,
      };
    }

    set({ selectedTemplate: type, thesis: newThesis, lastErrors: {}, referencesSkippable: false });
  },

  // ---- Metadata ----
  // FIX(ZONE-4A): Re-validate immediately on change, clear resolved errors.
  // Errors are only cleared for fields that are NOW valid; untouched fields
  // wait for NEXT to show errors (no surprise errors on first visit).
  updateMetadata: (metadata) =>
    set((s) => {
      if (!s.thesis) return {};
      const newThesis = {
        ...s.thesis,
        metadata: { ...s.thesis.metadata, ...metadata },
      };

      // Re-validate only previously-errored fields
      const filteredErrors: Record<string, string> = {};
      for (const [key, msg] of Object.entries(s.lastErrors)) {
        if (key === 'title' && !metadata.title?.trim()) {
          filteredErrors[key] = msg;
        } else if (key === 'author' && !metadata.author?.trim()) {
          filteredErrors[key] = msg;
        } else if (key === '_step' || key === 'templateId') {
          // Keep non-field errors until NEXT
        }
        // Otherwise the error is resolved — don't include it
      }

      return { thesis: newThesis, lastErrors: filteredErrors };
    }),

  // ---- Abstract (merged into metadata step) ----
  setAbstract: (abstract) =>
    set((s) => ({
      thesis: s.thesis ? { ...s.thesis, abstract } : null,
    })),
  setKeywords: (keywords) =>
    set((s) => ({
      thesis: s.thesis ? { ...s.thesis, keywords } : null,
    })),
  addKeyword: (keyword) =>
    set((s) => {
      if (!s.thesis) return {};
      const trimmed = keyword.trim();
      if (s.thesis.keywords.includes(trimmed) || !trimmed) return {};
      return { thesis: { ...s.thesis, keywords: [...s.thesis.keywords, trimmed] } };
    }),
  removeKeyword: (keyword) =>
    set((s) => ({
      thesis: s.thesis
        ? { ...s.thesis, keywords: s.thesis.keywords.filter((k) => k !== keyword) }
        : null,
    })),

  // ---- Chapters ----
  addChapter: () =>
    set((s) => {
      if (!s.thesis) return {};
      const newChapter: ThesisChapter = {
        id: `chapter-${generateId()}`,
        number: s.thesis.chapters.length + 1,
        title: `Chapter ${s.thesis.chapters.length + 1}`,
        content: '',
        subSections: [],
      };
      return {
        thesis: { ...s.thesis, chapters: [...s.thesis.chapters, newChapter] },
      };
    }),
  removeChapter: (id) => {
    const { thesis, pendingDeleteChapter } = get();
    if (!thesis) return;

    // Clear any existing pending delete to avoid conflicting timers
    if (pendingDeleteChapter) {
      clearTimeout(pendingDeleteChapter.timer);
    }

    const deleted = thesis.chapters.find((c) => c.id === id);
    if (!deleted) return;

    // Immediately hide the chapter from the list but don't remove from store yet
    const hiddenChapters = thesis.chapters
      .filter((c) => c.id !== id)
      .map((c, idx) => ({ ...c, number: idx + 1 }));

    // Set up a 5-second timer that auto-commits the delete
    const timer = setTimeout(() => {
      get().commitPendingChapterDelete();
    }, PENDING_DELETE_TIMEOUT_MS);

    set({
      thesis: { ...thesis, chapters: hiddenChapters },
      lastDeletedChapter: deleted,
      pendingDeleteChapter: { item: deleted, timer },
    });
  },
  updateChapter: (id, updates) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          chapters: s.thesis.chapters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        },
      };
    }),
  reorderChapters: (chapters) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          chapters: chapters.map((c, idx) => ({ ...c, number: idx + 1 })),
        },
      };
    }),

  // ---- SubSections ----
  addSubSection: (chapterId) =>
    set((s) => {
      if (!s.thesis) return {};
      const newSub: ThesisSubSection = {
        id: `subsection-${generateId()}`,
        title: 'New Section',
        content: '',
      };
      return {
        thesis: {
          ...s.thesis,
          chapters: s.thesis.chapters.map((c) =>
            c.id === chapterId ? { ...c, subSections: [...c.subSections, newSub] } : c
          ),
        },
      };
    }),
  removeSubSection: (chapterId, subSectionId) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          chapters: s.thesis.chapters.map((c) =>
            c.id === chapterId
              ? { ...c, subSections: c.subSections.filter((ss) => ss.id !== subSectionId) }
              : c
          ),
        },
      };
    }),
  updateSubSection: (chapterId, subSectionId, updates) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          chapters: s.thesis.chapters.map((c) =>
            c.id === chapterId
              ? {
                  ...c,
                  subSections: c.subSections.map((ss) =>
                    ss.id === subSectionId ? { ...ss, ...updates } : ss
                  ),
                }
              : c
          ),
        },
      };
    }),

  // ---- References ----
  addReference: () =>
    set((s) => {
      if (!s.thesis) return {};
      const newRef: ThesisReference = {
        id: `ref-${generateId()}`,
        type: 'article',
        authors: '',
        title: '',
        year: '',
        doi: '',
        url: '',
      };
      return {
        thesis: { ...s.thesis, references: [...s.thesis.references, newRef] },
      };
    }),
  removeReference: (id) => {
    const { thesis, pendingDeleteReference } = get();
    if (!thesis) return;

    // Clear any existing pending reference delete to avoid conflicting timers
    if (pendingDeleteReference) {
      clearTimeout(pendingDeleteReference.timer);
    }

    const deleted = thesis.references.find((r) => r.id === id);
    if (!deleted) return;

    // Immediately hide the reference from the list but don't remove from store yet
    const hiddenReferences = thesis.references.filter((r) => r.id !== id);

    // Set up a 5-second timer that auto-commits the delete
    const timer = setTimeout(() => {
      get().commitPendingReferenceDelete();
    }, PENDING_DELETE_TIMEOUT_MS);

    set({
      thesis: { ...thesis, references: hiddenReferences },
      lastDeletedReference: deleted,
      pendingDeleteReference: { item: deleted, timer },
    });
  },
  updateReference: (id, updates) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          references: s.thesis.references.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        },
      };
    }),
  bulkImportReferences: (refs) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          references: [...s.thesis.references, ...refs],
        },
      };
    }),

  // ---- Appendices ----
  addAppendix: () =>
    set((s) => {
      if (!s.thesis) return {};
      const newApp: ThesisAppendix = {
        id: `appendix-${generateId()}`,
        title: `Appendix ${s.thesis.appendices.length < 26 ? String.fromCharCode(65 + s.thesis.appendices.length) : String(s.thesis.appendices.length + 1)}`,
        content: '',
      };
      return {
        thesis: { ...s.thesis, appendices: [...s.thesis.appendices, newApp] },
      };
    }),
  removeAppendix: (id) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          appendices: s.thesis.appendices
            .filter((a) => a.id !== id)
            .map((a, idx) => ({ ...a, title: `Appendix ${String.fromCharCode(65 + idx)}` })),
        },
      };
    }),
  updateAppendix: (id, updates) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          appendices: s.thesis.appendices.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        },
      };
    }),

  // ---- Options ----
  updateOptions: (options) =>
    set((s) => {
      if (!s.thesis) return {};
      return {
        thesis: {
          ...s.thesis,
          options: { ...s.thesis.options, ...options },
        },
      };
    }),

  // ---- Save Status ----
  setSaveStatus: (status) => set({ saveStatus: status }),

  // ---- Export Generation State ----
  // FIX(ZONE-4B): isGenerating flag ensures spinner can always be reset
  setGenerating: (generating) => set({ isGenerating: generating }),

  // ---- Undo Support ----
  // FIXELEVEN: Undo now cancels the pending delete timer to prevent stale state.
  // Previously, undoing restored the chapter but left the pending delete timer running,
  // which would fire later and clear lastDeletedChapter/pendingDeleteChapter inconsistently.
  undoDeleteChapter: () =>
    set((s) => {
      if (!s.lastDeletedChapter || !s.thesis) return {};
      // Cancel pending delete timer if exists
      if (s.pendingDeleteChapter) {
        clearTimeout(s.pendingDeleteChapter.timer);
      }
      const restored = { ...s.lastDeletedChapter };
      const updatedChapters = [...s.thesis.chapters, restored].map((c, idx) => ({
        ...c,
        number: idx + 1,
      }));
      return {
        lastDeletedChapter: null,
        pendingDeleteChapter: null,
        thesis: { ...s.thesis, chapters: updatedChapters },
      };
    }),
  undoDeleteReference: () =>
    set((s) => {
      if (!s.lastDeletedReference || !s.thesis) return {};
      // Cancel pending delete timer if exists
      if (s.pendingDeleteReference) {
        clearTimeout(s.pendingDeleteReference.timer);
      }
      const restored = { ...s.lastDeletedReference };
      return {
        lastDeletedReference: null,
        pendingDeleteReference: null,
        thesis: {
          ...s.thesis,
          references: [...s.thesis.references, restored],
        },
      };
    }),

  // ---- Pending Delete: Chapter ----
  commitPendingChapterDelete: () =>
    set((s) => {
      // Clear the pending state — chapter was already removed from thesis.chapters
      // in removeChapter, so committing just means clearing the timer and pending ref
      if (!s.pendingDeleteChapter) return {};
      clearTimeout(s.pendingDeleteChapter.timer);
      return { pendingDeleteChapter: null, lastDeletedChapter: null };
    }),
  cancelPendingChapterDelete: () =>
    set((s) => {
      if (!s.pendingDeleteChapter || !s.thesis) return {};
      clearTimeout(s.pendingDeleteChapter.timer);
      // Restore the chapter by re-inserting it at its original position
      const restored = s.pendingDeleteChapter.item;
      const reinsertedChapters = [...s.thesis.chapters, restored]
        .sort((a, b) => a.number - b.number)
        .map((c, idx) => ({ ...c, number: idx + 1 }));
      return {
        pendingDeleteChapter: null,
        lastDeletedChapter: null,
        thesis: { ...s.thesis, chapters: reinsertedChapters },
      };
    }),

  // ---- Pending Delete: Reference ----
  commitPendingReferenceDelete: () =>
    set((s) => {
      // Reference was already removed from thesis.references in removeReference,
      // so committing just clears the timer, pending ref, AND the undo state.
      // FIX(Bug#6): Clear lastDeletedReference so the undo toast doesn't reappear
      // after the 5-second grace period expires.
      if (!s.pendingDeleteReference) return {};
      clearTimeout(s.pendingDeleteReference.timer);
      return { pendingDeleteReference: null, lastDeletedReference: null };
    }),
  cancelPendingReferenceDelete: () =>
    set((s) => {
      if (!s.pendingDeleteReference || !s.thesis) return {};
      clearTimeout(s.pendingDeleteReference.timer);
      // Restore the reference by re-appending it
      const restored = s.pendingDeleteReference.item;
      return {
        pendingDeleteReference: null,
        lastDeletedReference: null,
        thesis: {
          ...s.thesis,
          references: [...s.thesis.references, restored],
        },
      };
    }),

  // ---- References Skippable ----
  // Toggled by draft mode or user preference — prevents references from blocking advance
  setReferencesSkippable: (skippable: boolean) => set({ referencesSkippable: skippable }),

  // ---- Export / Import ----
  exportProject: () => {
    const { thesis, selectedTemplate, currentStep } = get();
    const projectData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      selectedTemplate,
      currentStep,
      thesis,
    };
    return JSON.stringify(projectData, null, 2);
  },
  importProject: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.thesis || !parsed.selectedTemplate) {
        return false;
      }
      // GODMODE 13: Validate imported thesis structure — a crafted or corrupted
      // JSON import can set arbitrary fields, causing crashes in downstream code
      // that expects specific types (arrays, objects with required keys).
      const thesis = parsed.thesis;
      if (typeof thesis !== 'object' || thesis === null) return false;
      // Ensure required array fields exist (downstream code calls .map/.length/.filter)
      if (!Array.isArray(thesis.chapters)) thesis.chapters = [];
      if (!Array.isArray(thesis.references)) thesis.references = [];
      if (!Array.isArray(thesis.keywords)) thesis.keywords = [];
      if (!Array.isArray(thesis.appendices)) thesis.appendices = [];
      // Ensure metadata is a valid object
      if (typeof thesis.metadata !== 'object' || thesis.metadata === null) {
        thesis.metadata = { title: '', author: '', university: '', supervisor: '', department: '', date: '', degree: '' };
      }
      set({
        thesis: parsed.thesis,
        selectedTemplate: parsed.selectedTemplate as ThesisType,
        currentStep: (parsed.currentStep > 6 ? 6 : parsed.currentStep || 1) as WizardStep,
        wizardStarted: true,
        _hydrated: true,
        lastDeletedChapter: null,
        lastDeletedReference: null,
        lastErrors: {},
      });
      return true;
    } catch {
      return false;
    }
  },

  // ---- Completion Percentage ----
  getCompletionPercentage: () => {
    const { thesis } = get();
    if (!thesis) return 0;
    const { metadata, abstract, keywords, chapters, references } = thesis;
    let filled = 0;
    const total = 8;
    if (metadata.title.trim()) filled++;
    if (metadata.author.trim()) filled++;
    if (metadata.university.trim()) filled++;
    if (metadata.supervisor.trim()) filled++;
    if (abstract.trim()) filled++;
    if (keywords.length > 0) filled++;
    if (chapters.some((ch) => ch.content.trim() || ch.subSections.some((ss) => ss.content.trim()))) filled++;
    if (references.length > 0) filled++;
    return Math.round((filled / total) * 100);
  },

  // ---- Progress (step / TOTAL_WIZARD_STEPS * 100) ----
  getProgressPercent: () => {
    const { currentStep } = get();
    return getProgressPercentage(currentStep);
  },

  // ---- Navigation Helpers ----
  goToHome: () => set({ wizardStarted: false, currentStep: 1, lastErrors: {} }),

  // ---- Reset ----
  // GODMODE 13: Clear pending-delete timers before resetting state.
  // Without this, orphaned setTimeout callbacks fire after reset, calling
  // commitPendingChapterDelete/ReferenceDelete on the reset (null) store.
  // The handlers bail on null check, but the timers leak up to 5 seconds
  // and can interleave with fresh pending-delete timers in rapid reset flows.
  reset: () => {
    const { pendingDeleteChapter, pendingDeleteReference } = get();
    if (pendingDeleteChapter) clearTimeout(pendingDeleteChapter.timer);
    if (pendingDeleteReference) clearTimeout(pendingDeleteReference.timer);
    set({
      thesis: null,
      currentStep: 1,
      selectedTemplate: null,
      wizardStarted: false,
      lastDeletedChapter: null,
      lastDeletedReference: null,
      lastErrors: {},
      saveStatus: 'idle',
      pendingDeleteChapter: null,
      pendingDeleteReference: null,
      referencesSkippable: false,
      _hydrated: false,
    });
  },

  // ---- Validation ----
  setErrors: (errors) => set({ lastErrors: errors }),
  clearErrors: () => set({ lastErrors: {} }),

  // FIX(ZONE-4A): Clear a specific field error when the user fixes it
  clearFieldError: (fieldPath: string) =>
    set((s) => {
      if (!(fieldPath in s.lastErrors)) return {};
      const { [fieldPath]: _, ...rest } = s.lastErrors;
      return { lastErrors: rest };
    }),

  // FIX(ZONE-6C): Whitespace-only title is normalized and rejected.
  // Always trims stored values, rejects blank-after-trim.
  updateChapterTitle: (id: string, rawTitle: string) =>
    set((s) => {
      if (!s.thesis) return {};
      const normalized = sanitizeUserInput(rawTitle, 'single-line').trim();
      if (normalized === '') {
        return { lastErrors: { ...s.lastErrors, [`chapter_${id}_title`]: 'Chapter title cannot be blank.' } };
      }
      const restErrors = { ...s.lastErrors };
      delete restErrors[`chapter_${id}_title`];
      return {
        thesis: {
          ...s.thesis,
          chapters: s.thesis.chapters.map((c) => (c.id === id ? { ...c, title: normalized } : c)),
        },
        lastErrors: restErrors,
      };
    }),

  // FIX(ZONE-6A): Sanitize metadata fields before storing.
  // Strips null bytes, zero-width chars, control chars, enforces length limits.
  updateMetadataSanitized: (metadata: Partial<ThesisMetadata>) =>
    set((s) => {
      if (!s.thesis) return {};
      const sanitized: Partial<ThesisMetadata> = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (typeof value !== 'string') continue;
        const fieldType = (key === 'title' || key === 'subtitle') ? 'title'
          : key === 'author' ? 'author'
          : key === 'year' ? 'year'
          : 'single-line';
        (sanitized as Record<string, string>)[key] = sanitizeUserInput(value, fieldType);
      }
      const newThesis = { ...s.thesis, metadata: { ...s.thesis.metadata, ...sanitized } };

      // Re-validate only previously-errored fields
      const filteredErrors: Record<string, string> = {};
      for (const [key, msg] of Object.entries(s.lastErrors)) {
        if (key === 'title' && !sanitized.title?.trim()) filteredErrors[key] = msg;
        else if (key === 'author' && !sanitized.author?.trim()) filteredErrors[key] = msg;
        else if (key === '_step' || key === 'templateId') { /* keep */ }
      }

      return { thesis: newThesis, lastErrors: filteredErrors };
    }),

  // FIX(ZONE-6A): Sanitize chapter body before storing (length cap, control chars)
  updateChapterBody: (id: string, rawBody: string) =>
    set((s) => {
      if (!s.thesis) return {};
      const sanitized = sanitizeUserInput(rawBody, 'chapter-body');
      return {
        thesis: {
          ...s.thesis,
          chapters: s.thesis.chapters.map((c) => (c.id === id ? { ...c, content: sanitized } : c)),
        },
      };
    }),

  // ---- Smart Import System: applyImport ----
  // Applies extracted data from PDF/tex import to the current thesis.
  // Triggered by ImportReviewModal via CustomEvent.
  // Receives mappings that are ALREADY filtered to apply=true by the modal.
  applyImportData: (importData: {
    result: any;
    mappings: Array<{ field: string; value: string; apply: boolean }>;
  }) =>
    set((s) => {
      const { result } = importData;
      let { mappings } = importData;

      // Runtime validation: ensure arrays exist to prevent crashes.
      // AUDIT(fix19): Create defensive copies WITHOUT mutating the caller's
      // importData.result object. Previous code mutated result.chapters/result.references
      // directly (result.chapters = []), violating the "defensive copy" comment.
      // If the caller holds a reference (e.g., an import review modal),
      // those mutations corrupted subsequent reads.
      const safeChapters = Array.isArray(result?.chapters) ? [...result.chapters] : [];
      const safeReferences = Array.isArray(result?.references) ? [...result.references] : [];

      // Determine the best template type:
      // 1. If user already has a template selected, keep it
      // 2. If import detected a template, use that
      // 3. Default to 'report' as a safe fallback
      const detectedType = isValidThesisType(result?.detectedTemplate)
        ? result.detectedTemplate
        : null;
      const effectiveType = s.selectedTemplate || detectedType || 'report';

      // If no thesis exists yet, create a default one so import data isn't silently dropped
      let newThesis = s.thesis
        ? { ...s.thesis }
        : createDefaultThesisData(effectiveType as ThesisType);

      // If a thesis exists but the detected template differs from the current type,
      // update the type (but don't reset chapters/references the user already has)
      if (s.thesis && detectedType && s.thesis.type !== detectedType) {
        newThesis.type = detectedType;
        // Update options to match the new template's defaults
        const fresh = createDefaultThesisData(detectedType);
        newThesis.options = fresh.options;
      }

      // ---- Apply metadata fields ----
      const metaMappings = mappings.filter(m => m.field.startsWith('metadata.') && m.apply);
      if (metaMappings.length > 0) {
        newThesis.metadata = { ...newThesis.metadata };
        for (const m of metaMappings) {
          const rawKey = m.field.replace('metadata.', '');
          const value = m.value;

          // Handle abstract specially — it's a top-level field, not on ThesisMetadata
          if (rawKey === 'abstract') {
            newThesis.abstract = value;
            continue;
          }

          // Handle degreeType — use it to infer the thesis type
          if (rawKey === 'degreeType' && value) {
            const typeMap: Record<string, ThesisType> = {
              bachelor: 'bachelor', master: 'master', phd: 'phd',
              report: 'report', conference: 'conference',
            };
            const inferred = typeMap[value.toLowerCase()];
            if (inferred) newThesis.type = inferred;
            continue;
          }

          // Map extracted field names to ThesisMetadata property names
          const fieldMap: Record<string, keyof ThesisMetadata> = {
            institution: 'university',
          };
          const thesisKey = fieldMap[rawKey] || (rawKey as keyof ThesisMetadata);

          // Only set if the field actually exists on ThesisMetadata
          if (thesisKey in newThesis.metadata) {
            (newThesis.metadata as unknown as Record<string, string>)[thesisKey] = value;
          }
        }
      }

      // Apply keywords (comma-separated string → string array)
      const keywordMapping = mappings.find(m => m.field === 'keywords' && m.apply);
      if (keywordMapping) {
        newThesis.keywords = keywordMapping.value
          .split(/[,;]/)
          .map(k => k.trim())
          .filter(Boolean);
      }

      // Apply chapters — only if the import found chapters.
      // Use safeChapters (defensive copy) to avoid mutating caller's data.
      if (safeChapters.length > 0) {
        newThesis.chapters = safeChapters.map((ch: any, i: number) => ({
          id:          ch.id || `imported-ch-${i}`,
          number:      i + 1,
          title:       ch.title || `Chapter ${i + 1}`,
          content:     ch.body || '',
          subSections: (ch.subsections || []).map((sub: any, j: number) => ({
            id:      sub.id || `imported-sub-${i}-${j}`,
            title:   sub.title || `Section ${j + 1}`,
            content: sub.body || '',
          })),
        }));
      }

      // Apply references — with smarter type inference.
      // Use safeReferences (defensive copy) to avoid mutating caller's data.
      if (safeReferences.length > 0) {
        newThesis.references = safeReferences.map((ref: any, i: number) => {
          // Infer reference type from available fields
          let refType: ReferenceType = 'misc';
          if (ref.school) refType = 'thesis';
          else if (ref.journal) refType = 'article';
          else if (ref.booktitle) refType = 'inproceedings';
          else if (ref.publisher && (ref.url || ref.doi)) refType = 'online';
          else if (ref.publisher) refType = 'book';
          else if (ref.type && ['article', 'book', 'inproceedings', 'techreport', 'thesis', 'online', 'misc'].includes(ref.type)) {
            refType = ref.type as ReferenceType;
          }

          return {
            id:        `imported-ref-${i}`,
            type:      refType,
            authors:   ref.author || '',
            title:     ref.title || ref.raw?.slice(0, 200) || '',
            year:      ref.year || '',
            journal:   ref.journal || '',
            bookTitle: ref.booktitle || '',
            volume:    ref.volume || '',
            pages:     ref.pages || '',
            doi:       ref.doi || '',
            url:       ref.url || '',
            publisher: ref.publisher || '',
            school:    ref.school || '',
          };
        });
      }

      // Apply custom commands from TeX import
      if (result.newcommands && Array.isArray(result.newcommands) && result.newcommands.length > 0) {
        newThesis.customCommands = result.newcommands.map((cmd: any) => {
          const argPart = cmd.numArgs > 0 ? `[${cmd.numArgs}]` : '';
          return `\\${cmd.variant || 'newcommand'}${cmd.starred ? '*' : ''}{${cmd.name}}${argPart}{${cmd.definition}}`;
        });
      }

      return {
        thesis: newThesis,
        selectedTemplate: effectiveType as ThesisType,
        wizardStarted: true,
        currentStep: 2 as WizardStep,
        lastErrors: {},
      };
    }),
}));

// ============================================================
// Granular Zustand Selectors — prevent unnecessary re-renders
// Components should import only the slice they need.
// ============================================================

export const selectTemplate = (state: ThesisStore) => state.selectedTemplate;
export const selectCurrentStep = (state: ThesisStore) => state.currentStep;
export const selectThesis = (state: ThesisStore) => state.thesis;
export const selectWizardStarted = (state: ThesisStore) => state.wizardStarted;
export const selectChapters = (state: ThesisStore) => state.thesis?.chapters ?? [];
export const selectReferences = (state: ThesisStore) => state.thesis?.references ?? [];
export const selectMetadata = (state: ThesisStore) => state.thesis?.metadata ?? null;
export const selectSaveStatus = (state: ThesisStore) => state.saveStatus;
export const selectIsGenerating = (state: ThesisStore) => state.isGenerating;
export const selectLastErrors = (state: ThesisStore) => state.lastErrors;
export const selectOptions = (state: ThesisStore) => state.thesis?.options ?? null;

// Hook-style selectors for common patterns
export function useThesisTemplate() {
  return useThesisStore(selectTemplate);
}
export function useThesisChapters() {
  return useThesisStore(selectChapters);
}
export function useThesisReferences() {
  return useThesisStore(selectReferences);
}
export function useThesisMetadata() {
  return useThesisStore(selectMetadata);
}
