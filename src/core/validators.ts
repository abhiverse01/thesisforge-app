// ============================================================
// ThesisForge Core — Validation Engine (3-Tier System)
// Every step has a validator that returns structured issues at
// three severity levels: ERROR blocks advance, WARNING allows
// advance but is shown, INFO is suggestion-only.
// Each step also returns a completionPct (0-100) for progress.
// ============================================================

import type { ThesisData } from '@/lib/thesis-types';
import { ABSTRACT_WORD_LIMITS } from '@/lib/thesis-types';

export interface ValidationIssue {
  field: string;
  message: string;
  /** ERROR blocks wizard advance; WARNING allows advance; INFO is suggestion only */
  severity: 'ERROR' | 'WARNING' | 'INFO';
  step: number;
}

export type ValidationResult = {
  errors: Record<string, string>;    // field → error message (ERROR severity)
  warnings: Record<string, string>;  // field → warning message (WARNING severity)
  isValid: boolean;                  // no errors (warnings and info are OK)
  issues: ValidationIssue[];
  /** 0-100 completion percentage for this step's data */
  completionPct: number;
};

// ============================================================
// Per-Step Validators
// ============================================================

/**
 * Validate metadata fields (Step 2).
 * Required: title, author
 * completionPct: based on filled required fields (title, author, university, supervisor)
 */
export function validateMetadata(data: ThesisData): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  const { metadata } = data;

  if (!metadata.title?.trim()) {
    errors.title = 'Title is required.';
    issues.push({ field: 'title', message: errors.title, severity: 'ERROR', step: 2 });
  } else if (metadata.title.trim().length < 5) {
    warnings.title = 'Title seems too short. Consider adding more detail.';
    issues.push({ field: 'title', message: warnings.title, severity: 'WARNING', step: 2 });
  }

  if (!metadata.author?.trim()) {
    errors.author = 'Author name is required.';
    issues.push({ field: 'author', message: errors.author, severity: 'ERROR', step: 2 });
  }

  if (metadata.authorId && !/^[A-Za-z0-9/-]+$/.test(metadata.authorId.trim())) {
    warnings.authorId = 'Student ID may contain unexpected characters.';
    issues.push({ field: 'authorId', message: warnings.authorId, severity: 'WARNING', step: 2 });
  }

  if (metadata.submissionDate) {
    const dateObj = new Date(metadata.submissionDate);
    if (isNaN(dateObj.getTime())) {
      errors.submissionDate = 'Please enter a valid submission date.';
      issues.push({ field: 'submissionDate', message: errors.submissionDate, severity: 'ERROR', step: 2 });
    }
  }

  if (metadata.graduationDate && isNaN(new Date(metadata.graduationDate).getTime())) {
    errors.graduationDate = 'Please enter a valid graduation date.';
    issues.push({ field: 'graduationDate', message: errors.graduationDate, severity: 'ERROR', step: 2 });
  }

  // INFO-level suggestions — only emitted when all required fields are filled
  if (!errors.title && !errors.author && !data.keywords?.length) {
    // keywords are on thesis root (ThesisData), not metadata — checked here for step-2 context
    issues.push({ field: 'keywords', message: 'Adding keywords improves discoverability.', severity: 'INFO', step: 2 });
  }
  if (!errors.title && !errors.author && !metadata.university?.trim()) {
    issues.push({ field: 'university', message: 'Adding university name strengthens your thesis identity.', severity: 'INFO', step: 2 });
  }
  if (!errors.title && !errors.author && !metadata.supervisor?.trim()) {
    issues.push({ field: 'supervisor', message: 'Adding a supervisor name is recommended for formal submissions.', severity: 'INFO', step: 2 });
  }

  // completionPct: 4 required/encouraged fields (title, author, university, supervisor)
  const requiredFields = [metadata.title, metadata.author, metadata.university, metadata.supervisor];
  const filledCount = requiredFields.filter(v => v?.trim()).length;
  const completionPct = Math.round((filledCount / requiredFields.length) * 100);

  return {
    errors,
    warnings,
    isValid: Object.keys(errors).length === 0,
    issues,
    completionPct,
  };
}

/**
 * Validate abstract content (Step 3).
 * Uses thesis-type-specific word limit from ABSTRACT_WORD_LIMITS.
 * INFO for empty abstract, WARNING when over limit or very short.
 * completionPct: based on word count vs type-specific limit.
 */
export function validateAbstract(data: ThesisData): ValidationResult {
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  // Use the thesis type's word limit instead of hardcoded default
  const wordLimit = ABSTRACT_WORD_LIMITS[data.type] ?? 300;
  const wordCount = data.abstract.trim().split(/\s+/).filter(w => w).length;

  // INFO: empty abstract is not an error but user should know
  if (!data.abstract.trim()) {
    issues.push({ field: 'abstract', message: `An abstract of up to ${wordLimit} words is recommended. Leave blank to add later.`, severity: 'INFO', step: 3 });
    return {
      errors: {},
      warnings,
      isValid: true,
      issues,
      completionPct: 0,
    };
  }

  if (wordCount > wordLimit) {
    warnings.abstract = `Abstract exceeds the recommended ${wordLimit} words (current: ${wordCount}). This is OK for submission, but consider trimming.`;
    issues.push({ field: 'abstract', message: warnings.abstract, severity: 'WARNING', step: 3 });
  }

  if (wordCount < 50 && wordCount > 0) {
    warnings.abstract = `Abstract is very short (${wordCount} words). A typical abstract should be at least 100 words.`;
    issues.push({ field: 'abstract', message: warnings.abstract, severity: 'WARNING', step: 3 });
  }

  if (data.keywords.length === 0) {
    warnings.keywords = 'Consider adding keywords for better discoverability.';
    issues.push({ field: 'keywords', message: warnings.keywords, severity: 'WARNING', step: 3 });
  }

  // completionPct: clamp word count ratio to 100
  const completionPct = Math.min(Math.round((wordCount / wordLimit) * 100), 100);

  return {
    errors: {},
    warnings,
    isValid: true, // Abstract never blocks navigation
    issues,
    completionPct,
  };
}

/**
 * Validate chapters (Step 4).
 * At least one chapter required (ERROR).
 * completionPct: (filled chapters / total chapters) * 100.
 */
export function validateChapters(data: ThesisData): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  if (!data.chapters || data.chapters.length === 0) {
    errors.chapters = 'Add at least one chapter.';
    issues.push({ field: 'chapters', message: errors.chapters, severity: 'ERROR', step: 4 });
    return { errors, warnings, isValid: false, issues, completionPct: 0 };
  }

  let filledChapterCount = 0; // tracks chapters with any content for completionPct

  data.chapters.forEach((ch, i) => {
    if (!ch.title?.trim()) {
      const field = `chapters[${i}].title`;
      errors[field] = `Chapter ${i + 1} needs a title.`;
      issues.push({ field, message: errors[field], severity: 'ERROR', step: 4 });
    }

    // Check for empty content
    const hasContent = ch.content?.trim() || ch.subSections?.some(ss => ss.content?.trim());
    if (!hasContent) {
      const field = `chapters[${i}].content`;
      warnings[field] = `Chapter ${i + 1} "${ch.title || 'Untitled'}" has no content yet.`;
      issues.push({ field, message: warnings[field], severity: 'WARNING', step: 4 });
    } else {
      // Chapter has content — counts toward completion
      filledChapterCount++;
    }

    // Check subsection titles
    ch.subSections?.forEach((ss, j) => {
      if (!ss.title?.trim()) {
        const field = `chapters[${i}].subSections[${j}].title`;
        errors[field] = `Subsection ${j + 1} in Chapter ${i + 1} needs a title.`;
        issues.push({ field, message: errors[field], severity: 'ERROR', step: 4 });
      }
    });
  });

  // completionPct: ratio of filled chapters to total chapters
  const completionPct = Math.round((filledChapterCount / data.chapters.length) * 100);

  return {
    errors,
    warnings,
    isValid: Object.keys(errors).length === 0,
    issues,
    completionPct,
  };
}

/**
 * Validate references (Step 5).
 * References are optional, but individual entries must be valid.
 * completionPct: min(references.length / 5, 1) * 100.
 */
export function validateReferences(data: ThesisData): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  if (!data.references || data.references.length === 0) {
    // Check for citations without references before returning
    const allContent = data.chapters.map(c => c.content).join(' ');
    const citeMatches = allContent.match(/\\cite(?:p|t|author|year|alp|alps|num|online|url)?\{([^}]+)\}/g) || [];
    const individualCiteKeys = new Set<string>();
    for (const match of citeMatches) {
      const innerMatch = match.match(/\\cite(?:p|t|author|year|alp|alps|num|online|url)?\{([^}]+)\}/);
      if (innerMatch) {
        innerMatch[1].split(',').map(k => k.trim()).forEach(k => {
          if (k) individualCiteKeys.add(k);
        });
      }
    }
    const totalCitations = individualCiteKeys.size;
    if (totalCitations > 0) {
      warnings._citations = `Found ${totalCitations} unique citation key(s) but no references added.`;
      issues.push({ field: '_citations', message: warnings._citations, severity: 'WARNING', step: 5 });
    }

    warnings.references = 'No references added yet. You can add them later or compile without.';
    issues.push({ field: 'references', message: warnings.references, severity: 'WARNING', step: 5 });
    return { errors, warnings, isValid: true, issues, completionPct: 0 };
  }

  // Check for duplicate cite keys
  const seenKeys = new Set<string>();
  data.references.forEach((ref, i) => {
    const key = `${ref.authors}-${ref.year}-${ref.title}`.toLowerCase();
    if (seenKeys.has(key)) {
      const field = `references[${i}]`;
      warnings[field] = `Possible duplicate reference: "${ref.title}"`;
      issues.push({ field, message: warnings[field], severity: 'WARNING', step: 5 });
    }
    seenKeys.add(key);
  });

  // Check for citations that reference keys not in the bibliography
  const allContent = data.chapters.map(c => c.content).join(' ');
  const citeMatches = allContent.match(/\\cite(?:p|t|author|year|alp|alps|num|online|url)?\{([^}]+)\}/g) || [];
  const individualCiteKeys = new Set<string>();
  for (const match of citeMatches) {
    const innerMatch = match.match(/\\cite(?:p|t|author|year|alp|alps|num|online|url)?\{([^}]+)\}/);
    if (innerMatch) {
      innerMatch[1].split(',').map(k => k.trim()).forEach(k => {
        if (k) individualCiteKeys.add(k);
      });
    }
  }
  const refKeys = new Set(data.references.map(r => r.id));
  const unmatchedCiteKeys = [...individualCiteKeys].filter(k => !refKeys.has(k));
  if (unmatchedCiteKeys.length > 0) {
    warnings._citations = `Citation keys not found in references: ${unmatchedCiteKeys.slice(0, 5).join(', ')}${unmatchedCiteKeys.length > 5 ? ` (+${unmatchedCiteKeys.length - 5} more)` : ''}.`;
    issues.push({ field: '_citations', message: warnings._citations, severity: 'WARNING', step: 5 });
  }

  // completionPct: scales with reference count, capped at 5 references = 100%
  const completionPct = Math.min(Math.round((data.references.length / 5) * 100), 100);

  return {
    errors,
    warnings,
    isValid: Object.keys(errors).length === 0,
    issues,
    completionPct,
  };
}

/**
 * Validate format options (Step 6/7).
 * Most options have defaults, so this mostly warns about unusual choices.
 * completionPct: always 100 since all options have sensible defaults.
 */
export function validateFormat(data: ThesisData): ValidationResult {
  const warnings: Record<string, string> = {};
  const issues: ValidationIssue[] = [];

  const { options } = data;

  if (options.marginSize === 'narrow') {
    warnings.marginSize = 'Narrow margins may cause layout issues. Consider "normal" or "wide".';
    issues.push({ field: 'marginSize', message: warnings.marginSize, severity: 'WARNING', step: 7 });
  }

  // All format fields have defaults — always 100% complete
  const completionPct = 100;

  return {
    errors: {},
    warnings,
    isValid: true,
    issues,
    completionPct,
  };
}

/**
 * Run all validators and return combined results.
 * Overall completionPct is the average of individual step percentages.
 */
export function validateAll(data: ThesisData): ValidationResult {
  const metadata = validateMetadata(data);
  const abstract = validateAbstract(data);
  const chapters = validateChapters(data);
  const references = validateReferences(data);
  const format = validateFormat(data);

  // Average completion across all 5 validation steps
  const completionPct = Math.round(
    (metadata.completionPct + abstract.completionPct + chapters.completionPct + references.completionPct + format.completionPct) / 5
  );

  return {
    errors: { ...metadata.errors, ...chapters.errors },
    warnings: { ...metadata.warnings, ...abstract.warnings, ...chapters.warnings, ...references.warnings, ...format.warnings },
    isValid: metadata.isValid && chapters.isValid,
    issues: [...metadata.issues, ...abstract.issues, ...chapters.issues, ...references.issues, ...format.issues],
    completionPct,
  };
}
