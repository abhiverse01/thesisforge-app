// ============================================================
// ThesisForge Core — FSM State Validator (Bug Hunt: Zone 1A)
// Run on every state object before it is written to storage or rendered.
// If it throws, the caller has a bug. No silent failures.
//
// EXTENDED: Added validateStepForAdvance() for 3-tier severity
// validation with optional references-skippable mode.
// ============================================================

import type { WizardState } from './fsm';
import type { ValidationIssue } from './validators';
import type { ThesisData } from '@/lib/thesis-types';
import {
  validateMetadata,
  validateAbstract,
  validateChapters,
  validateReferences,
  validateFormat,
} from './validators';

const VALID_STEPS: string[] = [
  'IDLE',
  'TEMPLATE_SELECT',
  'METADATA',
  'CHAPTERS',
  'REFERENCES',
  'FORMAT',
  'PREVIEW',
];

const REQUIRED_KEYS: (keyof WizardState)[] = [
  'step',
  'stepIndex',
  'data',
  'errors',
  'warnings',
];

export class StateError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'StateError';
  }
}

/**
 * Assert that a wizard state object is structurally valid.
 * Throws StateError if any invariant is violated.
 * Returns true if all checks pass.
 *
 * FIX(ZONE-1A): Validates FSM state before storage, rendering, and export.
 * Called inside transition(), loadFromStorage(), and exportThesis().
 */
export function assertValidState(state: unknown, context = 'unknown'): boolean {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new StateError(`[${context}] state is ${state === null ? 'null' : typeof state}`);
  }

  const s = state as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    if (!(key in s)) {
      throw new StateError(`[${context}] missing key: "${key}"`);
    }
  }

  if (!VALID_STEPS.includes(s.step as string)) {
    throw new StateError(`[${context}] invalid step: ${String(s.step)}`);
  }

  const stepIndex = s.stepIndex as number;
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex > 6) {
    throw new StateError(`[${context}] invalid stepIndex: ${stepIndex}`);
  }

  if (typeof s.data !== 'object' || s.data === null) {
    throw new StateError(`[${context}] data must be an object, got ${typeof s.data}`);
  }

  if (typeof s.errors !== 'object' || s.errors === null) {
    throw new StateError(`[${context}] errors must be an object`);
  }

  if (typeof s.warnings !== 'object' || s.warnings === null) {
    throw new StateError(`[${context}] warnings must be an object`);
  }

  // Validate data.templateId if present
  const templateId = (s.data as Record<string, unknown>).templateId;
  if (templateId !== undefined && templateId !== null) {
    if (!['bachelor', 'master', 'phd', 'report', 'conference'].includes(templateId as string)) {
      throw new StateError(`[${context}] unknown templateId: "${String(templateId)}"`);
    }
  }

  // Validate data.chapters if present
  const chapters = (s.data as Record<string, unknown>).chapters;
  if (chapters !== undefined) {
    if (!Array.isArray(chapters)) {
      throw new StateError(`[${context}] chapters must be array, got ${typeof chapters}`);
    }
  }

  // Validate data.references if present
  const references = (s.data as Record<string, unknown>).references;
  if (references !== undefined) {
    if (!Array.isArray(references)) {
      throw new StateError(`[${context}] references must be array`);
    }
  }

  return true;
}

// ============================================================
// Step-to-Validator Mapping — maps FSM state names to validator functions
// ============================================================

/** Maps each wizard step to its corresponding validator function */
const STEP_VALIDATORS: Record<string, (data: ThesisData) => { isValid: boolean; issues: ValidationIssue[] }> = {
  METADATA: validateMetadata,
  CHAPTERS: validateChapters,
  REFERENCES: validateReferences,
  FORMAT: validateFormat,
};

// ============================================================
// 3-Tier Advance Validation
// ============================================================

/**
 * Options for validateStepForAdvance — controls per-step override behavior
 */
interface AdvanceValidationOptions {
  /** When true, the REFERENCES step produces no ERROR issues (draft mode) */
  referencesSkippable?: boolean;
}

/**
 * Result of validateStepForAdvance — tells caller whether to allow wizard advance
 */
interface AdvanceValidationResult {
  /** Whether the user can proceed to the next step */
  canAdvance: boolean;
  /** All issues found (ERROR, WARNING, INFO) — shown in UI regardless of canAdvance */
  issues: ValidationIssue[];
}

/**
 * Validate a given wizard step for advancement using 3-tier severity rules.
 *
 * - ERROR issues block advance (unless overridden by options).
 * - WARNING and INFO issues never block advance.
 * - When referencesSkippable is true, the REFERENCES step never blocks.
 *
 * @param step - FSM state name (e.g. 'METADATA', 'CHAPTERS')
 * @param data - Full thesis data object
 * @param options - Override flags for step-specific behavior
 */
export function validateStepForAdvance(
  step: string,
  data: ThesisData,
  options?: AdvanceValidationOptions
): AdvanceValidationResult {
  // Steps without dedicated validators always allow advance
  const validator = STEP_VALIDATORS[step];
  if (!validator) {
    return { canAdvance: true, issues: [] };
  }

  const result = validator(data);

  // Filter issues: only ERROR severity blocks advance
  const errorIssues = result.issues.filter(i => i.severity === 'ERROR');

  // References step can be skipped in draft mode — treat all as WARNING
  if (step === 'REFERENCES' && options?.referencesSkippable) {
    return { canAdvance: true, issues: result.issues };
  }

  // canAdvance is false only when there are ERROR-severity issues
  return {
    canAdvance: errorIssues.length === 0,
    issues: result.issues,
  };
}
