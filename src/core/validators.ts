// ============================================================
// ThesisForge Core — Validation Engine
// Every step has a validator that returns structured errors, not booleans.
// Warnings show inline but allow NEXT. Errors block NEXT.
// ============================================================

import type { ThesisData } from '@/lib/thesis-types';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  step: number;
}

export type ValidationResult = {
  errors: Record<string, string>;    // field → error message
  warnings: Record<string, string>;  // field → warning message
  isValid: boolean;                  // no errors (warnings OK)
  issues: ValidationIssue[];
};

// ============================================================
// Per-Step Validators
// ============================================================

/**
 * Validate metadata fields (Step 2).
 * Required: title, author
 */
export function validateMetadata(data: ThesisData): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  const { metadata } = data;

  if (!metadata.title?.trim()) {
    errors.title = 'Title is required.';
    issues.push({ field: 'title', message: errors.title, severity: 'error', step: 2 });
  } else if (metadata.title.trim().length < 5) {
    warnings.title = 'Title seems too short. Consider adding more detail.';
    issues.push({ field: 'title', message: warnings.title, severity: 'warning', step: 2 });
  }

  if (!metadata.author?.trim()) {
    errors.author = 'Author name is required.';
    issues.push({ field: 'author', message: errors.author, severity: 'error', step: 2 });
  }

  if (metadata.authorId && !/^[A-Za-z0-9/-]+$/.test(metadata.authorId.trim())) {
    warnings.authorId = 'Student ID may contain unexpected characters.';
    issues.push({ field: 'authorId', message: warnings.authorId, severity: 'warning', step: 2 });
  }

  if (metadata.submissionDate) {
    const dateObj = new Date(metadata.submissionDate);
    if (isNaN(dateObj.getTime())) {
      errors.submissionDate = 'Please enter a valid submission date.';
      issues.push({ field: 'submissionDate', message: errors.submissionDate, severity: 'error', step: 2 });
    }
  }

  if (metadata.graduationDate && isNaN(new Date(metadata.graduationDate).getTime())) {
    errors.graduationDate = 'Please enter a valid graduation date.';
    issues.push({ field: 'graduationDate', message: errors.graduationDate, severity: 'error', step: 2 });
  }

  return {
    errors,
    warnings,
    isValid: Object.keys(errors).length === 0,
    issues,
  };
}

/**
 * Validate abstract content (Step 3).
 * Soft limit: abstractMaxWords (warning only).
 */
export function validateAbstract(data: ThesisData): ValidationResult {
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  const wordLimit = 300; // Default bachelor limit
  const wordCount = data.abstract.trim().split(/\s+/).filter(w => w).length;

  if (data.abstract.trim() && wordCount > wordLimit) {
    warnings.abstract = `Abstract exceeds the recommended ${wordLimit} words (current: ${wordCount}). This is OK for submission, but consider trimming.`;
    issues.push({ field: 'abstract', message: warnings.abstract, severity: 'warning', step: 3 });
  }

  if (data.abstract.trim() && wordCount < 50 && wordCount > 0) {
    warnings.abstract = `Abstract is very short (${wordCount} words). A typical abstract should be at least 100 words.`;
    issues.push({ field: 'abstract', message: warnings.abstract, severity: 'warning', step: 3 });
  }

  if (data.keywords.length === 0 && data.abstract.trim()) {
    warnings.keywords = 'Consider adding keywords for better discoverability.';
    issues.push({ field: 'keywords', message: warnings.keywords, severity: 'warning', step: 3 });
  }

  return {
    errors: {},
    warnings,
    isValid: true, // Abstract never blocks navigation
    issues,
  };
}

/**
 * Validate chapters (Step 4).
 * At least one chapter required.
 */
export function validateChapters(data: ThesisData): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  if (!data.chapters || data.chapters.length === 0) {
    errors.chapters = 'Add at least one chapter.';
    issues.push({ field: 'chapters', message: errors.chapters, severity: 'error', step: 4 });
    return { errors, warnings, isValid: false, issues };
  }

  data.chapters.forEach((ch, i) => {
    if (!ch.title?.trim()) {
      const field = `chapters[${i}].title`;
      errors[field] = `Chapter ${i + 1} needs a title.`;
      issues.push({ field, message: errors[field], severity: 'error', step: 4 });
    }

    // Check for empty content
    const hasContent = ch.content?.trim() || ch.subSections?.some(ss => ss.content?.trim());
    if (!hasContent) {
      const field = `chapters[${i}].content`;
      warnings[field] = `Chapter ${i + 1} "${ch.title || 'Untitled'}" has no content yet.`;
      issues.push({ field, message: warnings[field], severity: 'warning', step: 4 });
    }

    // Check subsection titles
    ch.subSections?.forEach((ss, j) => {
      if (!ss.title?.trim()) {
        const field = `chapters[${i}].subSections[${j}].title`;
        errors[field] = `Subsection ${j + 1} in Chapter ${i + 1} needs a title.`;
        issues.push({ field, message: errors[field], severity: 'error', step: 4 });
      }
    });
  });

  return {
    errors,
    warnings,
    isValid: Object.keys(errors).length === 0,
    issues,
  };
}

/**
 * Validate references (Step 5).
 * References are optional, but individual entries must be valid.
 */
export function validateReferences(data: ThesisData): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  if (!data.references || data.references.length === 0) {
    warnings.references = 'No references added yet. You can add them later or compile without.';
    issues.push({ field: 'references', message: warnings.references, severity: 'warning', step: 5 });
    return { errors, warnings, isValid: true, issues };
  }

  // Check for duplicate cite keys
  const seenKeys = new Set<string>();
  data.references.forEach((ref, i) => {
    const key = `${ref.authors}-${ref.year}-${ref.title}`.toLowerCase();
    if (seenKeys.has(key)) {
      const field = `references[${i}]`;
      warnings[field] = `Possible duplicate reference: "${ref.title}"`;
      issues.push({ field, message: warnings[field], severity: 'warning', step: 5 });
    }
    seenKeys.add(key);
  });

  // Check for citations without references
  const allContent = data.chapters.map(c => c.content).join(' ');
  const citeMatches = allContent.match(/\\cite[tp]?\{([^}]+)\}/g) || [];
  if (citeMatches.length > 0 && data.references.length === 0) {
    warnings._citations = `Found ${citeMatches.length} citation(s) but no references added.`;
    issues.push({ field: '_citations', message: warnings._citations, severity: 'warning', step: 5 });
  }

  return {
    errors,
    warnings,
    isValid: Object.keys(errors).length === 0,
    issues,
  };
}

/**
 * Validate format options (Step 6/7).
 * Most options have defaults, so this mostly warns about unusual choices.
 */
export function validateFormat(data: ThesisData): ValidationResult {
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  const { options } = data;

  if (options.marginSize === 'narrow') {
    warnings.marginSize = 'Narrow margins may cause layout issues. Consider "normal" or "wide".';
    issues.push({ field: 'marginSize', message: warnings.marginSize, severity: 'warning', step: 7 });
  }

  return {
    errors: {},
    warnings,
    isValid: true,
    issues,
  };
}

/**
 * Run all validators and return combined results.
 */
export function validateAll(data: ThesisData): ValidationResult {
  const metadata = validateMetadata(data);
  const abstract = validateAbstract(data);
  const chapters = validateChapters(data);
  const references = validateReferences(data);
  const format = validateFormat(data);

  return {
    errors: { ...metadata.errors, ...chapters.errors },
    warnings: { ...metadata.warnings, ...abstract.warnings, ...chapters.warnings, ...references.warnings, ...format.warnings },
    isValid: metadata.isValid && chapters.isValid,
    issues: [...metadata.issues, ...abstract.issues, ...chapters.issues, ...references.issues, ...format.issues],
  };
}
