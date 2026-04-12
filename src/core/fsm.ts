// ============================================================
// ThesisForge Core — Wizard Finite State Machine (v2)
// 6-step wizard: IDLE → TEMPLATE_SELECT → METADATA → CHAPTERS → REFERENCES → FORMAT → PREVIEW
// Pure transition functions. No side effects in transitions.
// ============================================================

export type WizardStateName =
  | 'IDLE'
  | 'TEMPLATE_SELECT'
  | 'METADATA'
  | 'CHAPTERS'
  | 'REFERENCES'
  | 'FORMAT'
  | 'PREVIEW';

export type WizardEvent =
  | 'NEXT'
  | 'BACK'
  | 'JUMP'
  | 'SAVE'
  | 'RESET'
  | 'START'
  | 'STEP_HEALTH_CHECK'
  | 'AUTOFILL';

export interface WizardState {
  step: WizardStateName;
  stepIndex: number;
  data: Record<string, unknown>;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// ============================================================
// Step Health Scoring
// ============================================================

export interface StepHealth {
  step: WizardStateName;
  score: number; // 0-100
  issues: string[];
}

export function computeStepHealth(step: WizardStateName, data: Record<string, unknown>): StepHealth {
  const issues: string[] = [];

  switch (step) {
    case 'IDLE':
      return { step, score: 0, issues: ['Wizard has not started.'] };

    case 'TEMPLATE_SELECT': {
      const hasTemplate = !!data.templateId && typeof data.templateId === 'string' && data.templateId.trim() !== '';
      if (!hasTemplate) {
        issues.push('No template selected.');
      }
      return { step, score: hasTemplate ? 100 : 0, issues };
    }

    case 'METADATA': {
      const meta = data.metadata as Record<string, unknown> | undefined;
      if (!meta || typeof meta !== 'object') {
        return { step, score: 0, issues: ['No metadata provided.'] };
      }

      const requiredFields = ['title', 'author', 'university', 'supervisor'];
      let filledCount = 0;
      for (const field of requiredFields) {
        const val = meta[field];
        if (typeof val === 'string' && val.trim() !== '') {
          filledCount++;
        } else {
          issues.push(`Missing required field: ${field}`);
        }
      }

      const score = Math.round((filledCount / requiredFields.length) * 100);
      return { step, score, issues };
    }

    case 'CHAPTERS': {
      const chapters = data.chapters as Array<Record<string, unknown>> | undefined;
      if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
        return { step, score: 0, issues: ['No chapters defined.'] };
      }

      let totalChapters = chapters.length;
      let filledChapters = 0;

      for (const ch of chapters) {
        const content = ch.content as string | undefined;
        const hasContent = typeof content === 'string' && content.trim().length > 0;
        if (hasContent) {
          filledChapters++;
        } else {
          issues.push(`Chapter "${typeof ch.title === 'string' ? ch.title : 'Untitled'}" has no content.`);
        }
      }

      // Score: 50% for having chapters at all, 50% for content fill ratio
      const existenceScore = 50;
      const fillScore = totalChapters > 0 ? Math.round((filledChapters / totalChapters) * 50) : 0;
      return { step, score: existenceScore + fillScore, issues };
    }

    case 'REFERENCES': {
      const references = data.references as Array<Record<string, unknown>> | undefined;
      if (!references || !Array.isArray(references) || references.length === 0) {
        return { step, score: 0, issues: ['No references added.'] };
      }

      let completeCount = 0;
      for (let i = 0; i < references.length; i++) {
        const ref = references[i];
        const hasAuthors = typeof ref.authors === 'string' && ref.authors.trim() !== '';
        const hasTitle = typeof ref.title === 'string' && ref.title.trim() !== '';
        const hasYear = typeof ref.year === 'string' && ref.year.trim() !== '';

        if (hasAuthors && hasTitle && hasYear) {
          completeCount++;
        } else {
          const missing: string[] = [];
          if (!hasAuthors) missing.push('authors');
          if (!hasTitle) missing.push('title');
          if (!hasYear) missing.push('year');
          issues.push(`Reference #${i + 1} is incomplete (missing: ${missing.join(', ')}).`);
        }
      }

      // Score: 30% for having references, 70% for completeness
      const existenceScore = Math.min(30, Math.round((references.length / 5) * 30));
      const completenessScore = references.length > 0 ? Math.round((completeCount / references.length) * 70) : 0;
      return { step, score: existenceScore + completenessScore, issues };
    }

    case 'FORMAT': {
      const options = data.options as Record<string, unknown> | undefined;
      if (!options || typeof options !== 'object') {
        return { step, score: 0, issues: ['No format options configured.'] };
      }

      const formatFields = ['fontSize', 'paperSize', 'lineSpacing', 'marginSize', 'citationStyle'];
      let configuredCount = 0;
      for (const field of formatFields) {
        const val = options[field];
        if (val !== undefined && val !== null && typeof val === 'string' && val.trim() !== '') {
          configuredCount++;
        } else {
          issues.push(`Format option "${field}" is not configured.`);
        }
      }

      const score = Math.round((configuredCount / formatFields.length) * 100);
      return { step, score, issues };
    }

    case 'PREVIEW':
      return { step, score: 100, issues: [] };

    default:
      return { step, score: 0, issues: [`Unknown step: ${step}`] };
  }
}

// ============================================================
// Jump Validation
// ============================================================

export interface JumpValidation {
  canJump: boolean;
  incompleteSteps: Array<{ step: WizardStateName; stepIndex: number; issues: string[] }>;
}

export function validateJump(
  currentStep: WizardStateName,
  targetStep: WizardStateName,
  data: Record<string, unknown>,
  guards: TransitionGuards = defaultGuards
): JumpValidation {
  const currentIdx = STATE_ORDER.indexOf(currentStep);
  const targetIdx = STATE_ORDER.indexOf(targetStep);

  // Can always jump backwards or to current step
  if (targetIdx <= currentIdx) {
    return { canJump: true, incompleteSteps: [] };
  }

  // Validate all intermediate steps between current+1 and target
  const incompleteSteps: JumpValidation['incompleteSteps'] = [];

  for (let i = currentIdx + 1; i < targetIdx; i++) {
    const stepName = STATE_ORDER[i];
    const stepHealth = computeStepHealth(stepName, data);

    // For critical guard steps, use guards; for others use health scoring
    let stepIsValid = false;
    switch (stepName) {
      case 'TEMPLATE_SELECT':
        stepIsValid = guards.templateSelected(data);
        break;
      case 'METADATA':
        stepIsValid = guards.metadataValid(data);
        break;
      case 'CHAPTERS':
        stepIsValid = guards.chaptersValid(data);
        break;
      default:
        // Non-blocking steps: consider valid if health score >= 0
        stepIsValid = true;
        break;
    }

    if (!stepIsValid) {
      incompleteSteps.push({
        step: stepName,
        stepIndex: i,
        issues: stepHealth.issues.length > 0 ? stepHealth.issues : [`Step "${stepName}" is not yet complete.`],
      });
    }
  }

  return {
    canJump: incompleteSteps.length === 0,
    incompleteSteps,
  };
}

// State ordering — 6 wizard steps (IDLE is state 0, not a user-facing step)
export const STATE_ORDER: WizardStateName[] = [
  'IDLE',
  'TEMPLATE_SELECT',
  'METADATA',
  'CHAPTERS',
  'REFERENCES',
  'FORMAT',
  'PREVIEW',
];

export const TOTAL_WIZARD_STEPS = 6;

// Guard functions — return true if transition is allowed
export interface TransitionGuards {
  templateSelected: (data: Record<string, unknown>) => boolean;
  metadataValid: (data: Record<string, unknown>) => boolean;
  chaptersValid: (data: Record<string, unknown>) => boolean;
}

const defaultGuards: TransitionGuards = {
  templateSelected: (data) => !!data.templateId && typeof data.templateId === 'string',
  metadataValid: (data) => {
    const meta = data.metadata as Record<string, unknown> | undefined;
    if (!meta) return false;
    return !!(meta.title && typeof meta.title === 'string' && meta.title.trim() &&
               meta.author && typeof meta.author === 'string' && meta.author.trim());
  },
  chaptersValid: (data) => {
    const chapters = data.chapters as unknown[] | undefined;
    return !!chapters && Array.isArray(chapters) && chapters.length > 0;
  },
};

// ============================================================
// FSM Transition Function — PURE, no side effects
// ============================================================

export function transition(
  state: WizardState,
  event: WizardEvent,
  guards: TransitionGuards = defaultGuards,
  jumpTarget?: number
): WizardState {
  const currentIdx = STATE_ORDER.indexOf(state.step);

  switch (event) {
    case 'START':
      if (state.step === 'IDLE') {
        return { ...state, step: 'TEMPLATE_SELECT', stepIndex: 1, errors: {}, warnings: {} };
      }
      return state;

    case 'NEXT': {
      if (currentIdx >= STATE_ORDER.length - 1) return state;

      const nextStepName = STATE_ORDER[currentIdx + 1];

      // Apply guards only for blocking steps
      switch (state.step) {
        case 'TEMPLATE_SELECT':
          if (!guards.templateSelected(state.data)) {
            return {
              ...state,
              errors: { templateId: 'Please select a thesis template to continue.' },
            };
          }
          break;
        case 'METADATA':
          if (!guards.metadataValid(state.data)) {
            return {
              ...state,
              errors: { _step: 'Title and author name are required to continue.' },
            };
          }
          break;
        // Chapters, references, format — allow NEXT (warnings don't block)
      }

      return {
        ...state,
        step: nextStepName,
        stepIndex: currentIdx + 1,
        errors: {},
      };
    }

    case 'BACK': {
      if (currentIdx <= 1) return state; // Can't go back from TEMPLATE_SELECT
      const prevStepName = STATE_ORDER[currentIdx - 1];
      return {
        ...state,
        step: prevStepName,
        stepIndex: currentIdx - 1,
        errors: {},
      };
    }

    case 'JUMP': {
      if (jumpTarget === undefined || jumpTarget < 1 || jumpTarget >= STATE_ORDER.length) {
        return state;
      }

      // Guard: all steps before the target must be valid
      for (let i = 1; i < jumpTarget; i++) {
        const stepName = STATE_ORDER[i];
        switch (stepName) {
          case 'TEMPLATE_SELECT':
            if (!guards.templateSelected(state.data)) {
              return { ...state, errors: { _jump: 'Complete template selection first.' } };
            }
            break;
          case 'METADATA':
            if (!guards.metadataValid(state.data)) {
              return { ...state, errors: { _jump: 'Complete required metadata fields first.' } };
            }
            break;
        }
      }

      return {
        ...state,
        step: STATE_ORDER[jumpTarget],
        stepIndex: jumpTarget,
        errors: {},
      };
    }

    case 'SAVE':
      return state;

    case 'RESET':
      return {
        step: 'IDLE',
        stepIndex: 0,
        data: {},
        errors: {},
        warnings: {},
      };

    case 'STEP_HEALTH_CHECK': {
      // Return current state with health data embedded in warnings
      const health = computeStepHealth(state.step, state.data);
      return {
        ...state,
        errors: {},
        warnings: {
          _healthScore: String(health.score),
          _healthIssues: health.issues.join(' | '),
        },
      };
    }

    case 'AUTOFILL': {
      // Autofill is computed externally; return state unchanged
      return state;
    }

    default: {
      const _exhaustive: never = event;
      return state;
    }
  }
}

/**
 * Get progress percentage (0-100) based on current step.
 * 6 wizard steps: step 1 = 0%, step 6 = 100%
 */
export function getProgressPercentage(stepIndex: number): number {
  const totalSteps = TOTAL_WIZARD_STEPS;
  return Math.round(((stepIndex - 1) / (totalSteps - 1)) * 100);
}

/**
 * Get step index from state name.
 */
export function getStepIndex(stateName: WizardStateName): number {
  return STATE_ORDER.indexOf(stateName);
}

/**
 * Check if a step is reachable from the current step.
 */
export function isStepReachable(
  currentStep: WizardStateName,
  targetStep: WizardStateName,
  data: Record<string, unknown>,
  guards: TransitionGuards = defaultGuards
): boolean {
  const currentIdx = STATE_ORDER.indexOf(currentStep);
  const targetIdx = STATE_ORDER.indexOf(targetStep);

  if (targetIdx <= currentIdx) return true;

  for (let i = currentIdx + 1; i <= targetIdx; i++) {
    const stepName = STATE_ORDER[i];
    switch (stepName) {
      case 'TEMPLATE_SELECT':
        if (!guards.templateSelected(data)) return false;
        break;
      case 'METADATA':
        if (!guards.metadataValid(data)) return false;
        break;
    }
  }

  return true;
}
