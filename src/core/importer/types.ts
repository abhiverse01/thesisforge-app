// ============================================================
// ThesisForge Import System — Type Definitions
// Types for importing PDF and .tex files into the thesis wizard.
// ============================================================

export type ImportSource = 'pdf' | 'tex';

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

export interface ImportResult {
  source:            ImportSource;
  fileName:          string;
  metadata:          ExtractedMetadata;
  chapters:          ExtractedChapter[];
  references:        ExtractedReference[];
  detectedTemplate:  'bachelor' | 'master' | 'phd' | 'report' | null;
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
}
