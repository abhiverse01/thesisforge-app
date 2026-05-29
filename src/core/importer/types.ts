// ============================================================
// ThesisForge Import System — Type Definitions
// Types for importing PDF and .tex files into the thesis wizard.
// ============================================================

export type ImportSource = 'pdf' | 'tex' | 'docx' | 'md' | 'txt';

export interface ExtractedMetadata {
  title?:        string;
  subtitle?:     string;
  author?:       string;
  institution?:  string;
  faculty?:      string;
  department?:   string;
  supervisor?:   string;
  year?:         string;
  abstract?:     string;
  keywords?:     string[];
  degree?:       string;
  degreeAbbrev?: string;
  journal?:     string;
  school?:      string;
  publisher?:   string;
  doi?:         string;
  url?:         string;
}

export interface ExtractedChapter {
  title:        string;
  body:         string;
  order:        number;
  level:        'chapter' | 'section';
  subsections:  Array<{ title: string; body: string }>;
}

export interface ExtractedReference {
  type:       string;
  author?:    string;
  title?:     string;
  year?:      string;
  journal?:   string;
  booktitle?: string;
  volume?:    string;
  pages?:     string;
  doi?:       string;
  url?:       string;
  publisher?: string;
  school?:    string;
  raw?:       string;
}

export interface ExtractedCommand {
  /** Command name including backslash, e.g. "\\mycmd" */
  name:       string;
  /** Number of arguments (0 if none specified) */
  numArgs:    number;
  /** Raw LaTeX definition body (may contain #1, #2, etc.) */
  definition: string;
  /** Original variant used: 'newcommand', 'renewcommand' */
  variant:    'newcommand' | 'renewcommand';
  /** Whether the starred form was used */
  starred:    boolean;
}

export interface ImportResult {
  source:            ImportSource;
  fileName:          string;
  metadata:          ExtractedMetadata;
  chapters:          ExtractedChapter[];
  references:        ExtractedReference[];
  newcommands:       ExtractedCommand[];
  detectedTemplate:  'bachelor' | 'master' | 'phd' | 'report' | 'conference' | null;
  confidence:        ImportConfidence;
  warnings:          string[];
  parseErrors:       string[];
}

export interface ImportConfidence {
  overall:   number;
  metadata:  Record<string, number>;
  chapters:  number;
  references: number;
}

export interface FieldMapping {
  field:      string;
  value:      string;
  confidence: number;
  source:     string;
  apply:      boolean;
  needsReview?: boolean;
}
