// ============================================================
// ThesisForge Core — Template Schema Definitions
// Templates are DATA; the generator is CODE.
// Never hardcode LaTeX per-template.
// ============================================================

import type { CompilationRecipe } from '@/lib/thesis-types';

export interface PackageDeclaration {
  name: string;
  options?: string[];
}

export interface TemplateSchema {
  id: string;
  parent?: string;
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
  compilationRecipe: CompilationRecipe;
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
    compilationRecipe: {
      compiler: 'pdflatex',
      passes: 4,
      bibBackend: 'bibtex',
    },
  },

  master: {
    id: 'master',
    parent: 'bachelor',
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
    compilationRecipe: {
      compiler: 'pdflatex',
      passes: 4,
      bibBackend: 'bibtex',
    },
  },

  phd: {
    id: 'phd',
    parent: 'master',
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
    compilationRecipe: {
      compiler: 'pdflatex',
      passes: 4,
      bibBackend: 'bibtex',
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
    compilationRecipe: {
      compiler: 'pdflatex',
      passes: 2,
    },
  },

  conference: {
    id: 'conference',
    label: 'Conference Paper',
    description: 'Standard conference paper using IEEEtran or acmart. Single/double column toggle.',
    icon: '📝',
    documentClass: 'IEEEtran',
    classOptions: ['10pt', 'a4paper', 'conference', 'twocolumn'],
    requiredPackages: [
      { name: 'inputenc', options: ['utf8'] },
      { name: 'fontenc', options: ['T1'] },
      { name: 'lmodern' },
      { name: 'amsmath' },
      { name: 'amssymb' },
      { name: 'graphicx' },
      { name: 'booktabs' },
      { name: 'hyperref' },
      { name: 'url' },
      { name: 'balance' },
    ],
    frontMatter: ['titlepage'],
    bodyStructure: ['introduction', 'related work', 'methodology', 'results', 'conclusion'],
    backMatter: ['bibliography'],
    citationStyle: 'ieeetr',
    defaultSpacing: 'single',
    abstractMaxWords: 250,
    chapterCommand: '\\section',
    hasDedication: false,
    hasGlossary: false,
    hasListings: false,
    hasAppendices: false,
    defaultTocDepth: 2,
    defaults: {
      fontSize: '10pt',
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
    validators: {
      requiredFields: ['title', 'author'],
      optionalFields: ['university', 'department'],
    },
    compilationRecipe: {
      compiler: 'pdflatex',
      passes: 2,
      bibBackend: 'bibtex',
    },
  },
};

// ============================================================
// Template Inheritance Resolver
// ============================================================

/**
 * Resolve a template schema by ID, merging parent defaults for
 * fields not explicitly defined in the child template.
 *
 * Inheritance chain: phd → master → bachelor, master → bachelor.
 * The child's own values always take precedence over the parent's.
 */
export function resolveTemplate(id: string): TemplateSchema {
  const direct = TEMPLATE_SCHEMAS[id];
  if (!direct) {
    throw new Error(`Unknown template ID: "${id}"`);
  }

  // No parent — return as-is
  if (!direct.parent) {
    return direct;
  }

  // Resolve the full inheritance chain (guard against cycles)
  const visited = new Set<string>();
  let currentId: string | undefined = direct.parent;

  const ancestorDefaults: Array<{ id: string; defaults: TemplateDefaults }> = [];

  while (currentId !== undefined) {
    if (visited.has(currentId)) {
      throw new Error(`Circular template inheritance detected involving "${currentId}"`);
    }
    visited.add(currentId);

    const ancestor = TEMPLATE_SCHEMAS[currentId];
    if (!ancestor) {
      throw new Error(`Parent template "${currentId}" not found`);
    }

    ancestorDefaults.unshift({ id: currentId, defaults: ancestor.defaults });

    currentId = ancestor.parent;
  }

  // Merge defaults: for each TemplateDefaults key, use the child's value if present,
  // otherwise fall back to the nearest ancestor that defines it.
  const defaultKeys = Object.keys(direct.defaults) as (keyof TemplateDefaults)[];
  const mergedDefaults = { ...direct.defaults } as Record<keyof TemplateDefaults, unknown>;

  // Start from the root ancestor and work towards the immediate parent
  // so that closer ancestors override more distant ones
  for (const ancestor of ancestorDefaults) {
    for (const key of defaultKeys) {
      if (mergedDefaults[key] === undefined || mergedDefaults[key] === null) {
        mergedDefaults[key] = ancestor.defaults[key];
      }
    }
  }

  return {
    ...direct,
    defaults: mergedDefaults as TemplateDefaults,
  };
}

/**
 * Get all template schemas as an array.
 */
export function getAllTemplates(): TemplateSchema[] {
  return Object.values(TEMPLATE_SCHEMAS);
}

/**
 * Resolve a template schema by ID (direct lookup, no inheritance merge).
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
