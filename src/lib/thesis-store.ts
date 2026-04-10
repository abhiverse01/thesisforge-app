// ============================================================
// Zustand Store — Thesis State Management (Enhanced)
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
  CitationStyle,
} from './thesis-types';
import { createDefaultThesisData } from './thesis-types';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

interface ThesisStore {
  // Core state
  thesis: ThesisData | null;
  currentStep: WizardStep;
  selectedTemplate: ThesisType | null;
  isGenerating: boolean;
  generatedLatex: string;
  showLatexPreview: boolean;

  // Wizard lifecycle
  wizardStarted: boolean;
  startWizard: () => void;

  // Wizard navigation
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Template selection
  selectTemplate: (type: ThesisType) => void;

  // Metadata
  updateMetadata: (metadata: Partial<ThesisMetadata>) => void;

  // Abstract
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

  // Generation
  setGenerating: (isGenerating: boolean) => void;
  setGeneratedLatex: (latex: string) => void;
  toggleLatexPreview: () => void;

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

  // Navigation helpers
  goToHome: () => void;

  // Reset
  reset: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useThesisStore = create<ThesisStore>((set, get) => ({
  thesis: null,
  currentStep: 1,
  selectedTemplate: null,
  isGenerating: false,
  generatedLatex: '',
  showLatexPreview: false,
  wizardStarted: false,

  // Undo state
  lastDeletedChapter: null,
  lastDeletedReference: null,

  // ---- Wizard Lifecycle ----
  startWizard: () => set({ wizardStarted: true, currentStep: 1 }),

  // ---- Wizard Navigation ----
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 6) as WizardStep })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) as WizardStep })),

  // ---- Template Selection ----
  selectTemplate: (type) => {
    const thesis = createDefaultThesisData(type);
    set({ selectedTemplate: type, thesis, currentStep: 2 });
  },

  // ---- Metadata ----
  updateMetadata: (metadata) =>
    set((s) => ({
      thesis: s.thesis ? { ...s.thesis, metadata: { ...s.thesis.metadata, ...metadata } } : null,
    })),

  // ---- Abstract ----
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
      if (s.thesis.keywords.includes(keyword.trim())) return {};
      return { thesis: { ...s.thesis, keywords: [...s.thesis.keywords, keyword.trim()] } };
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
      // Save deleted chapter for undo
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
      // Save deleted reference for undo
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

  // ---- Generation ----
  setGenerating: (isGenerating) => set({ isGenerating }),
  setGeneratedLatex: (generatedLatex) => set({ generatedLatex }),
  toggleLatexPreview: () => set((s) => ({ showLatexPreview: !s.showLatexPreview })),

  // ---- Undo Support ----
  undoDeleteChapter: () =>
    set((s) => {
      if (!s.lastDeletedChapter || !s.thesis) return {};
      const restored = { ...s.lastDeletedChapter };
      // Insert at the end and renumber
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
      version: 1,
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
        currentStep: (parsed.currentStep as WizardStep) ?? 1,
        wizardStarted: true,
        isGenerating: false,
        generatedLatex: '',
        showLatexPreview: false,
        lastDeletedChapter: null,
        lastDeletedReference: null,
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
    let total = 8;

    // 1. Title
    if (metadata.title.trim()) filled++;

    // 2. Author
    if (metadata.author.trim()) filled++;

    // 3. University
    if (metadata.university.trim()) filled++;

    // 4. Supervisor
    if (metadata.supervisor.trim()) filled++;

    // 5. Abstract
    if (abstract.trim()) filled++;

    // 6. Keywords
    if (keywords.length > 0) filled++;

    // 7. At least one chapter has content
    if (chapters.some((ch) => ch.content.trim() || ch.subSections.some((ss) => ss.content.trim()))) filled++;

    // 8. At least one reference
    if (references.length > 0) filled++;

    return Math.round((filled / total) * 100);
  },

  // ---- Navigation Helpers ----
  goToHome: () =>
    set({
      wizardStarted: false,
      currentStep: 1,
      // Keep thesis data intact so user doesn't lose progress
    }),

  // ---- Reset ----
  reset: () =>
    set({
      thesis: null,
      currentStep: 1,
      selectedTemplate: null,
      isGenerating: false,
      generatedLatex: '',
      showLatexPreview: false,
      wizardStarted: false,
      lastDeletedChapter: null,
      lastDeletedReference: null,
    }),
}));
