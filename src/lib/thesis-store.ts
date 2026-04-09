// ============================================================
// Zustand Store — Thesis State Management
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
      return {
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
      return {
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

  // ---- Reset ----
  reset: () =>
    set({
      thesis: null,
      currentStep: 1,
      selectedTemplate: null,
      isGenerating: false,
      generatedLatex: '',
      showLatexPreview: false,
    }),
}));
