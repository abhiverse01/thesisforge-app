// ============================================================
// ThesisForge Store v2 — Zustand State Management with FSM
// 6-step wizard: Template → Metadata → Chapters → References → Format → Generate
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
} from './thesis-types';
import { createDefaultThesisData } from './thesis-types';
import { transition, getProgressPercentage, type WizardStateName, STATE_ORDER, TOTAL_WIZARD_STEPS } from '@/core/fsm';

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

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ThesisStore {
  // Core state
  thesis: ThesisData | null;
  currentStep: WizardStep;
  selectedTemplate: ThesisType | null;
  saveStatus: SaveStatus;

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

  // Undo support
  lastDeletedChapter: ThesisChapter | null;
  lastDeletedReference: ThesisReference | null;
  undoDeleteChapter: () => void;
  undoDeleteReference: () => void;

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
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useThesisStore = create<ThesisStore>((set, get) => ({
  thesis: null,
  currentStep: 1,
  selectedTemplate: null,
  saveStatus: 'idle',
  wizardStarted: false,
  lastDeletedChapter: null,
  lastDeletedReference: null,
  lastErrors: {},

  // ---- Wizard Lifecycle ----
  startWizard: () => set({ wizardStarted: true, currentStep: 1 }),

  // ---- Wizard Navigation (FSM-gated) ----
  setStep: (step) => {
    const { selectedTemplate, thesis } = get();
    const fsmData: Record<string, unknown> = {
      templateId: selectedTemplate,
      metadata: thesis?.metadata || {},
      chapters: thesis?.chapters || [],
    };

    const currentState = STEP_TO_STATE[get().currentStep] || 'IDLE';
    const targetState = STEP_TO_STATE[step] || 'IDLE';

    const result = transition(
      { step: currentState, stepIndex: get().currentStep, data: fsmData, errors: {}, warnings: {} },
      step > get().currentStep ? 'NEXT' : step < get().currentStep ? 'BACK' : 'JUMP',
      undefined,
      STATE_ORDER.indexOf(targetState)
    );

    if (Object.keys(result.errors).length > 0) {
      set({ lastErrors: result.errors });
      return;
    }

    set({ currentStep: step, lastErrors: {} });
  },

  nextStep: () => {
    const { currentStep, selectedTemplate, thesis } = get();
    if (currentStep >= 6) return;

    const fsmData: Record<string, unknown> = {
      templateId: selectedTemplate,
      metadata: thesis?.metadata || {},
      chapters: thesis?.chapters || [],
    };

    const currentState = STEP_TO_STATE[currentStep] || 'IDLE';
    const result = transition(
      { step: currentState, stepIndex: currentStep, data: fsmData, errors: {}, warnings: {} },
      'NEXT'
    );

    if (Object.keys(result.errors).length > 0) {
      set({ lastErrors: result.errors });
      return;
    }

    const newStep = Math.min(currentStep + 1, 6) as WizardStep;
    set({ currentStep: newStep, lastErrors: {} });
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep <= 1) return;
    set({ currentStep: (currentStep - 1) as WizardStep, lastErrors: {} });
  },

  canGoNext: () => {
    const { currentStep, selectedTemplate, thesis } = get();
    if (currentStep >= 6) return false;
    if (currentStep === 1) return !!selectedTemplate;
    if (currentStep === 2) {
      const meta = thesis?.metadata;
      return !!(meta?.title?.trim() && meta?.author?.trim());
    }
    return true;
  },

  canGoToStep: (step) => {
    const { currentStep, selectedTemplate, thesis } = get();
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
    return true;
  },

  // ---- Template Selection ----
  selectTemplate: (type) => {
    const thesis = createDefaultThesisData(type);
    set({ selectedTemplate: type, thesis, currentStep: 2, lastErrors: {} });
  },

  // ---- Metadata ----
  updateMetadata: (metadata) =>
    set((s) => ({
      thesis: s.thesis ? { ...s.thesis, metadata: { ...s.thesis.metadata, ...metadata } } : null,
    })),

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
  removeChapter: (id) =>
    set((s) => {
      if (!s.thesis) return {};
      const deleted = s.thesis.chapters.find((c) => c.id === id) ?? null;
      return {
        lastDeletedChapter: deleted,
        thesis: {
          ...s.thesis,
          chapters: s.thesis.chapters
            .filter((c) => c.id !== id)
            .map((c, idx) => ({ ...c, number: idx + 1 })),
        },
      };
    }),
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
      };
      return {
        thesis: { ...s.thesis, references: [...s.thesis.references, newRef] },
      };
    }),
  removeReference: (id) =>
    set((s) => {
      if (!s.thesis) return {};
      const deleted = s.thesis.references.find((r) => r.id === id) ?? null;
      return {
        lastDeletedReference: deleted,
        thesis: {
          ...s.thesis,
          references: s.thesis.references.filter((r) => r.id !== id),
        },
      };
    }),
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
        title: `Appendix ${String.fromCharCode(65 + s.thesis.appendices.length)}`,
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

  // ---- Undo Support ----
  undoDeleteChapter: () =>
    set((s) => {
      if (!s.lastDeletedChapter || !s.thesis) return {};
      const restored = { ...s.lastDeletedChapter };
      const updatedChapters = [...s.thesis.chapters, restored].map((c, idx) => ({
        ...c,
        number: idx + 1,
      }));
      return {
        lastDeletedChapter: null,
        thesis: { ...s.thesis, chapters: updatedChapters },
      };
    }),
  undoDeleteReference: () =>
    set((s) => {
      if (!s.lastDeletedReference || !s.thesis) return {};
      const restored = { ...s.lastDeletedReference };
      return {
        lastDeletedReference: null,
        thesis: {
          ...s.thesis,
          references: [...s.thesis.references, restored],
        },
      };
    }),

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
      set({
        thesis: parsed.thesis,
        selectedTemplate: parsed.selectedTemplate as ThesisType,
        currentStep: (parsed.currentStep > 6 ? 6 : parsed.currentStep || 1) as WizardStep,
        wizardStarted: true,
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
  goToHome: () => set({ wizardStarted: false, currentStep: 1 }),

  // ---- Reset ----
  reset: () =>
    set({
      thesis: null,
      currentStep: 1,
      selectedTemplate: null,
      wizardStarted: false,
      lastDeletedChapter: null,
      lastDeletedReference: null,
      lastErrors: {},
      saveStatus: 'idle',
    }),

  // ---- Validation ----
  setErrors: (errors) => set({ lastErrors: errors }),
  clearErrors: () => set({ lastErrors: {} }),
}));
