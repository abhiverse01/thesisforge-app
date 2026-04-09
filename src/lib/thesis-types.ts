// ============================================================
// Thesis Type Definitions — Production-grade type system
// ============================================================

export type ThesisType = 'bachelor' | 'master' | 'phd' | 'report';

export type ReferenceType =
  | 'article'
  | 'book'
  | 'inproceedings'
  | 'techreport'
  | 'thesis'
  | 'online'
  | 'misc';

export type CitationStyle = 'ieee' | 'apa' | 'vancouver' | 'chicago' | 'harvard';

export interface ThesisMetadata {
  title: string;
  subtitle: string;
  author: string;
  authorId: string;
  university: string;
  universityLogo: string;
  faculty: string;
  department: string;
  supervisor: string;
  supervisorTitle: string;
  coSupervisor: string;
  coSupervisorTitle: string;
  submissionDate: string;
  graduationDate: string;
  location: string;
  dedication: string;
  acknowledgment: string;
}

export interface ThesisChapter {
  id: string;
  number: number;
  title: string;
  content: string;
  subSections: ThesisSubSection[];
}

export interface ThesisSubSection {
  id: string;
  title: string;
  content: string;
}

export interface ThesisReference {
  id: string;
  type: ReferenceType;
  authors: string;
  title: string;
  journal?: string;
  bookTitle?: string;
  publisher?: string;
  year: string;
  volume?: string;
  number?: string;
  pages?: string;
  doi?: string;
  url?: string;
  note?: string;
  edition?: string;
  address?: string;
  school?: string;
  howPublished?: string;
  accessed?: string;
}

export interface ThesisAppendix {
  id: string;
  title: string;
  content: string;
}

export interface ThesisOptions {
  fontSize: '10pt' | '11pt' | '12pt';
  paperSize: 'a4paper' | 'letterpaper';
  lineSpacing: 'single' | 'onehalf' | 'double';
  marginSize: 'normal' | 'narrow' | 'wide';
  includeDedication: boolean;
  includeAcknowledgment: boolean;
  includeAppendices: boolean;
  includeListings: boolean;
  includeGlossary: boolean;
  citationStyle: CitationStyle;
  figureNumbering: 'per-chapter' | 'continuous';
  tableNumbering: 'per-chapter' | 'continuous';
  tocDepth: number;
}

export interface ThesisData {
  type: ThesisType;
  metadata: ThesisMetadata;
  abstract: string;
  keywords: string[];
  chapters: ThesisChapter[];
  references: ThesisReference[];
  appendices: ThesisAppendix[];
  options: ThesisOptions;
}

// Template display info
export interface ThesisTemplateInfo {
  type: ThesisType;
  name: string;
  description: string;
  icon: string;
  defaultOptions: Partial<ThesisOptions>;
  defaultStructure: {
    chapterCount: number;
    hasAppendix: boolean;
  };
}

// Step definitions for the wizard
export const WIZARD_STEPS = [
  { id: 1, name: 'Template', description: 'Choose your thesis type' },
  { id: 2, name: 'Metadata', description: 'Document information' },
  { id: 3, name: 'Abstract', description: 'Abstract & keywords' },
  { id: 4, name: 'Chapters', description: 'Write your content' },
  { id: 5, name: 'References', description: 'Manage citations' },
  { id: 6, name: 'Generate', description: 'Preview & download' },
] as const;

export const THESIS_TEMPLATES: ThesisTemplateInfo[] = [
  {
    type: 'bachelor',
    name: "Bachelor's Thesis",
    description: 'Standard undergraduate thesis template with IMRAD structure. Includes title page, abstract, table of contents, and bibliography.',
    icon: '🎓',
    defaultOptions: {
      fontSize: '12pt',
      paperSize: 'a4paper',
      lineSpacing: 'onehalf',
      marginSize: 'normal',
      includeDedication: false,
      includeAcknowledgment: true,
      includeAppendices: false,
      includeListings: false,
      includeGlossary: false,
      citationStyle: 'apa',
      figureNumbering: 'continuous',
      tableNumbering: 'continuous',
      tocDepth: 3,
    },
    defaultStructure: { chapterCount: 4, hasAppendix: false },
  },
  {
    type: 'master',
    name: "Master's Thesis",
    description: 'Comprehensive graduate thesis template with extended abstract, literature review, methodology, results, and discussion chapters.',
    icon: '🏛️',
    defaultOptions: {
      fontSize: '12pt',
      paperSize: 'a4paper',
      lineSpacing: 'onehalf',
      marginSize: 'normal',
      includeDedication: true,
      includeAcknowledgment: true,
      includeAppendices: true,
      includeListings: false,
      includeGlossary: false,
      citationStyle: 'apa',
      figureNumbering: 'per-chapter',
      tableNumbering: 'per-chapter',
      tocDepth: 3,
    },
    defaultStructure: { chapterCount: 5, hasAppendix: true },
  },
  {
    type: 'phd',
    name: 'PhD Dissertation',
    description: 'Full doctoral dissertation template with comprehensive front matter, multiple content chapters, and extensive back matter.',
    icon: '📋',
    defaultOptions: {
      fontSize: '12pt',
      paperSize: 'a4paper',
      lineSpacing: 'double',
      marginSize: 'wide',
      includeDedication: true,
      includeAcknowledgment: true,
      includeAppendices: true,
      includeListings: true,
      includeGlossary: true,
      citationStyle: 'ieee',
      figureNumbering: 'per-chapter',
      tableNumbering: 'per-chapter',
      tocDepth: 3,
    },
    defaultStructure: { chapterCount: 6, hasAppendix: true },
  },
  {
    type: 'report',
    name: 'Research Report',
    description: 'Concise research report template ideal for technical papers, lab reports, or project documentation with streamlined formatting.',
    icon: '📄',
    defaultOptions: {
      fontSize: '11pt',
      paperSize: 'a4paper',
      lineSpacing: 'single',
      marginSize: 'normal',
      includeDedication: false,
      includeAcknowledgment: false,
      includeAppendices: false,
      includeListings: false,
      includeGlossary: false,
      citationStyle: 'ieee',
      figureNumbering: 'continuous',
      tableNumbering: 'continuous',
      tocDepth: 2,
    },
    defaultStructure: { chapterCount: 3, hasAppendix: false },
  },
];

// Default chapter structures per thesis type
export function getDefaultChapters(type: ThesisType): ThesisChapter[] {
  const chapterMap: Record<ThesisType, { title: string; subsections: { title: string }[] }[]> = {
    bachelor: [
      { title: 'Introduction', subsections: [{ title: 'Background' }, { title: 'Problem Statement' }, { title: 'Objectives' }] },
      { title: 'Literature Review', subsections: [{ title: 'Related Work' }] },
      { title: 'Methodology', subsections: [{ title: 'Research Design' }, { title: 'Data Collection' }] },
      { title: 'Results and Discussion', subsections: [{ title: 'Findings' }, { title: 'Analysis' }] },
      { title: 'Conclusion', subsections: [{ title: 'Summary' }, { title: 'Future Work' }] },
    ],
    master: [
      { title: 'Introduction', subsections: [{ title: 'Background' }, { title: 'Problem Statement' }, { title: 'Research Questions' }, { title: 'Contributions' }] },
      { title: 'Literature Review', subsections: [{ title: 'Theoretical Framework' }, { title: 'Related Work' }, { title: 'Research Gap' }] },
      { title: 'Methodology', subsections: [{ title: 'Research Design' }, { title: 'Data Collection' }, { title: 'Analysis Methods' }] },
      { title: 'Results', subsections: [{ title: 'Descriptive Results' }, { title: 'Key Findings' }] },
      { title: 'Discussion', subsections: [{ title: 'Interpretation' }, { title: 'Implications' }, { title: 'Limitations' }] },
      { title: 'Conclusion', subsections: [{ title: 'Summary' }, { title: 'Future Work' }] },
    ],
    phd: [
      { title: 'Introduction', subsections: [{ title: 'Background and Motivation' }, { title: 'Problem Statement' }, { title: 'Research Questions' }, { title: 'Contributions' }, { title: 'Publications' }] },
      { title: 'Literature Review', subsections: [{ title: 'Theoretical Framework' }, { title: 'State of the Art' }, { title: 'Research Gaps' }] },
      { title: 'Methodology', subsections: [{ title: 'Research Philosophy' }, { title: 'Research Design' }, { title: 'Data Collection' }, { title: 'Analysis Framework' }] },
      { title: 'Results I', subsections: [{ title: 'Experiment Setup' }, { title: 'Findings' }, { title: 'Validation' }] },
      { title: 'Results II', subsections: [{ title: 'Extended Analysis' }, { title: 'Comparative Study' }] },
      { title: 'Discussion', subsections: [{ title: 'Synthesis' }, { title: 'Theoretical Implications' }, { title: 'Practical Implications' }, { title: 'Limitations' }] },
      { title: 'Conclusion', subsections: [{ title: 'Summary of Contributions' }, { title: 'Future Research Directions' }] },
    ],
    report: [
      { title: 'Introduction', subsections: [{ title: 'Purpose' }, { title: 'Scope' }] },
      { title: 'Methods', subsections: [{ title: 'Approach' }, { title: 'Tools' }] },
      { title: 'Results', subsections: [{ title: 'Findings' }] },
    ],
  };

  return chapterMap[type].map((ch, idx) => ({
    id: `chapter-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    number: idx + 1,
    title: ch.title,
    content: '',
    subSections: ch.subsections.map((ss, ssIdx) => ({
      id: `subsection-${idx + 1}-${ssIdx + 1}-${Math.random().toString(36).slice(2, 7)}`,
      title: ss.title,
      content: '',
    })),
  }));
}

export function createDefaultThesisData(type: ThesisType): ThesisData {
  const template = THESIS_TEMPLATES.find((t) => t.type === type)!;
  return {
    type,
    metadata: {
      title: '',
      subtitle: '',
      author: '',
      authorId: '',
      university: '',
      universityLogo: '',
      faculty: '',
      department: '',
      supervisor: '',
      supervisorTitle: 'Prof.',
      coSupervisor: '',
      coSupervisorTitle: 'Dr.',
      submissionDate: new Date().toISOString().split('T')[0],
      graduationDate: '',
      location: '',
      dedication: '',
      acknowledgment: '',
    },
    abstract: '',
    keywords: [],
    chapters: getDefaultChapters(type),
    references: [],
    appendices: [],
    options: {
      fontSize: template.defaultOptions.fontSize as ThesisOptions['fontSize'],
      paperSize: template.defaultOptions.paperSize as ThesisOptions['paperSize'],
      lineSpacing: template.defaultOptions.lineSpacing as ThesisOptions['lineSpacing'],
      marginSize: template.defaultOptions.marginSize as ThesisOptions['marginSize'],
      includeDedication: template.defaultOptions.includeDedication ?? false,
      includeAcknowledgment: template.defaultOptions.includeAcknowledgment ?? false,
      includeAppendices: template.defaultOptions.includeAppendices ?? false,
      includeListings: template.defaultOptions.includeListings ?? false,
      includeGlossary: template.defaultOptions.includeGlossary ?? false,
      citationStyle: template.defaultOptions.citationStyle as CitationStyle,
      figureNumbering: template.defaultOptions['figureNumbering'] as ThesisOptions['figureNumbering'],
      tableNumbering: template.defaultOptions['tableNumbering'] as ThesisOptions['tableNumbering'],
      tocDepth: template.defaultOptions.tocDepth ?? 3,
    },
  };
}
