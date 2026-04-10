// ============================================================
// ThesisForge Core — Template Schema Definitions
// Templates are DATA; the generator is CODE.
// Never hardcode LaTeX per-template.
// ============================================================

export interface PackageDeclaration {
  name: string;
  options?: string[];
}

export interface TemplateSchema {
  id: string;
  label: string;
  description: string;
  icon: string;
  documentClass: string;
  classOptions: string[];
  requiredPackages: PackageDeclaration[];
  frontMatter: string[];
  bodyStructure: string[];
  backMatter: string[];
  citationStyle: string;
  defaultSpacing: string;
  abstractMaxWords: number;
  chapterCommand: string;
  hasDedication: boolean;
  hasGlossary: boolean;
  hasListings: boolean;
  hasAppendices: boolean;
  defaultTocDepth: number;
  defaults: TemplateDefaults;
  validators: {
    requiredFields: string[];
    optionalFields: string[];
  };
}

export interface TemplateDefaults {
  fontSize: string;
  paperSize: string;
  lineSpacing: string;
  marginSize: string;
  includeDedication: boolean;
  includeAcknowledgment: boolean;
  includeAppendices: boolean;
  includeListings: boolean;
  includeGlossary: boolean;
  citationStyle: string;
  figureNumbering: string;
  tableNumbering: string;
  tocDepth: number;
}

// ============================================================
// TEMPLATE_SCHEMAS — Declarative template definitions
// ============================================================

const commonPackages: PackageDeclaration[] = [
  { name: 'inputenc', options: ['utf8'] },
  { name: 'fontenc', options: ['T1'] },
  { name: 'lmodern' },
  { name: 'babel', options: ['english'] },
  { name: 'geometry' },
  { name: 'graphicx' },
  { name: 'amsmath' },
  { name: 'amssymb' },
  { name: 'amsthm' },
  { name: 'booktabs' },
  { name: 'array' },
  { name: 'multirow' },
  { name: 'longtable' },
  { name: 'setspace' },
  { name: 'xspace' },
  { name: 'microtype' },
  { name: 'caption', options: ['font=small', 'labelfont=bf'] },
];

export const TEMPLATE_SCHEMAS: Record<string, TemplateSchema> = {
  bachelor: {
    id: 'bachelor',
    label: "Bachelor's Thesis",
    description: 'Standard undergraduate thesis with IMRAD structure. Includes title page, abstract, TOC, and bibliography.',
    icon: '🎓',
    documentClass: 'report',
    classOptions: ['12pt', 'a4paper', 'oneside'],
    requiredPackages: commonPackages,
    frontMatter: ['titlepage', 'abstract', 'tableofcontents', 'listoffigures', 'listoftables'],
    bodyStructure: ['introduction', 'literature review', 'methodology', 'results', 'discussion', 'conclusion'],
    backMatter: ['bibliography'],
    citationStyle: 'plainnat',
    defaultSpacing: 'onehalfspacing',
    abstractMaxWords: 300,
    chapterCommand: '\\chapter',
    hasDedication: false,
    hasGlossary: false,
    hasListings: false,
    hasAppendices: false,
    defaultTocDepth: 3,
    defaults: {
      fontSize: '12pt',
      paperSize: 'a4paper',
      lineSpacing: 'onehalf',
      marginSize: 'normal',
      includeDedication: false,
      includeAcknowledgment: true,
      includeAppendices: false,
      includeListings: false,
      includeGlossary: false,
      citationStyle: 'plainnat',
      figureNumbering: 'continuous',
      tableNumbering: 'continuous',
      tocDepth: 3,
    },
    validators: {
      requiredFields: ['title', 'author', 'university', 'supervisor'],
      optionalFields: ['subtitle', 'department', 'faculty', 'coSupervisor', 'location', 'dedication', 'acknowledgment'],
    },
  },

  master: {
    id: 'master',
    label: "Master's Thesis",
    description: 'Comprehensive graduate thesis with extended abstract, literature review, methodology, results, and discussion.',
    icon: '🏛️',
    documentClass: 'report',
    classOptions: ['12pt', 'a4paper', 'oneside'],
    requiredPackages: [
      ...commonPackages,
      { name: 'chngcntr' },
    ],
    frontMatter: ['titlepage', 'dedication', 'abstract', 'acknowledgments', 'tableofcontents', 'listoffigures', 'listoftables'],
    bodyStructure: ['introduction', 'literature review', 'methodology', 'results', 'discussion', 'conclusion'],
    backMatter: ['bibliography', 'appendix'],
    citationStyle: 'plainnat',
    defaultSpacing: 'onehalfspacing',
    abstractMaxWords: 500,
    chapterCommand: '\\chapter',
    hasDedication: true,
    hasGlossary: false,
    hasListings: false,
    hasAppendices: true,
    defaultTocDepth: 3,
    defaults: {
      fontSize: '12pt',
      paperSize: 'a4paper',
      lineSpacing: 'onehalf',
      marginSize: 'normal',
      includeDedication: true,
      includeAcknowledgment: true,
      includeAppendices: true,
      includeListings: false,
      includeGlossary: false,
      citationStyle: 'plainnat',
      figureNumbering: 'per-chapter',
      tableNumbering: 'per-chapter',
      tocDepth: 3,
    },
    validators: {
      requiredFields: ['title', 'author', 'university', 'supervisor', 'department'],
      optionalFields: ['subtitle', 'faculty', 'coSupervisor', 'location', 'dedication', 'acknowledgment'],
    },
  },

  phd: {
    id: 'phd',
    label: 'PhD Dissertation',
    description: 'Full doctoral dissertation with comprehensive front matter, multiple chapters, glossary, and extensive back matter.',
    icon: '📋',
    documentClass: 'report',
    classOptions: ['12pt', 'a4paper', 'twoside'],
    requiredPackages: [
      ...commonPackages,
      { name: 'chngcntr' },
      { name: 'nomencl' },
      { name: 'glossaries' },
      { name: 'glossary-supersortorder' },
    ],
    frontMatter: ['titlepage', 'dedication', 'abstract', 'acknowledgments', 'tableofcontents', 'listoffigures', 'listoftables', 'listofabbreviations', 'nomenclature'],
    bodyStructure: ['introduction', 'literature review', 'methodology', 'results I', 'results II', 'discussion', 'conclusion'],
    backMatter: ['bibliography', 'appendix'],
    citationStyle: 'plainnat',
    defaultSpacing: 'doublespacing',
    abstractMaxWords: 700,
    chapterCommand: '\\chapter',
    hasDedication: true,
    hasGlossary: true,
    hasListings: true,
    hasAppendices: true,
    defaultTocDepth: 3,
    defaults: {
      fontSize: '12pt',
      paperSize: 'a4paper',
      lineSpacing: 'double',
      marginSize: 'wide',
      includeDedication: true,
      includeAcknowledgment: true,
      includeAppendices: true,
      includeListings: true,
      includeGlossary: true,
      citationStyle: 'plainnat',
      figureNumbering: 'per-chapter',
      tableNumbering: 'per-chapter',
      tocDepth: 3,
    },
    validators: {
      requiredFields: ['title', 'author', 'university', 'supervisor', 'department', 'faculty'],
      optionalFields: ['subtitle', 'coSupervisor', 'location', 'dedication', 'acknowledgment'],
    },
  },

  report: {
    id: 'report',
    label: 'Research Report',
    description: 'Concise research report ideal for technical papers, lab reports, or project documentation.',
    icon: '📄',
    documentClass: 'article',
    classOptions: ['11pt', 'a4paper'],
    requiredPackages: commonPackages.filter(p => !['amsthm', 'setspace'].some(ex => p.name === ex)),
    frontMatter: ['titlepage', 'abstract', 'tableofcontents'],
    bodyStructure: ['introduction', 'methods', 'results', 'discussion', 'conclusion'],
    backMatter: ['bibliography'],
    citationStyle: 'plainnat',
    defaultSpacing: 'single',
    abstractMaxWords: 250,
    chapterCommand: '\\section',
    hasDedication: false,
    hasGlossary: false,
    hasListings: false,
    hasAppendices: false,
    defaultTocDepth: 2,
    defaults: {
      fontSize: '11pt',
      paperSize: 'a4paper',
      lineSpacing: 'single',
      marginSize: 'normal',
      includeDedication: false,
      includeAcknowledgment: false,
      includeAppendices: false,
      includeListings: false,
      includeGlossary: false,
      citationStyle: 'plainnat',
      figureNumbering: 'continuous',
      tableNumbering: 'continuous',
      tocDepth: 2,
    },
    validators: {
      requiredFields: ['title', 'author'],
      optionalFields: ['subtitle', 'university', 'department', 'supervisor', 'location'],
    },
  },
};

/**
 * Get all template schemas as an array.
 */
export function getAllTemplates(): TemplateSchema[] {
  return Object.values(TEMPLATE_SCHEMAS);
}

/**
 * Resolve a template schema by ID.
 */
export function getTemplateSchema(id: string): TemplateSchema | undefined {
  return TEMPLATE_SCHEMAS[id];
}

/**
 * Get the default chapter titles for a given template type.
 */
export function getDefaultChapterTitles(templateId: string): string[] {
  const schema = TEMPLATE_SCHEMAS[templateId];
  return schema ? [...schema.bodyStructure] : [];
}
