// ============================================================
// ThesisForge Core — Wizard Finite State Machine
// Pure transition functions. No side effects in transitions.
// ============================================================

export type WizardStateName =
  | 'IDLE'
  | 'TEMPLATE_SELECT'
  | 'METADATA'
  | 'ABSTRACT'
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
  | 'START';

export interface WizardState {
  step: WizardStateName;
  stepIndex: number; // 0-based index for progress calculation
  data: Record<string, unknown>;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// State ordering for progression
export const STATE_ORDER: WizardStateName[] = [
  'IDLE',
  'TEMPLATE_SELECT',
  'METADATA',
  'ABSTRACT',
  'CHAPTERS',
  'REFERENCES',
  'FORMAT',
  'PREVIEW',
];

// Guard functions — return true if transition is allowed
export interface TransitionGuards {
  templateSelected: (data: Record<string, unknown>) => boolean;
  metadataValid: (data: Record<string, unknown>) => boolean;
  abstractValid: (data: Record<string, unknown>) => boolean;
  chaptersValid: (data: Record<string, unknown>) => boolean;
  referencesValid: (data: Record<string, unknown>) => boolean;
  formatValid: (data: Record<string, unknown>) => boolean;
}

const defaultGuards: TransitionGuards = {
  templateSelected: (data) => !!data.templateId && typeof data.templateId === 'string',
  metadataValid: (data) => {
    const meta = data.metadata as Record<string, unknown> | undefined;
    if (!meta) return false;
    return !!(meta.title && typeof meta.title === 'string' && meta.title.trim() &&
               meta.author && typeof meta.author === 'string' && meta.author.trim());
  },
  abstractValid: () => true, // Abstract is optional, warnings only
  chaptersValid: (data) => {
    const chapters = data.chapters as unknown[] | undefined;
    return !!chapters && Array.isArray(chapters) && chapters.length > 0;
  },
  referencesValid: () => true, // References are optional
  formatValid: () => true, // Format has sensible defaults
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

      // Apply guards
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
              errors: {
                ...state.errors,
                _step: 'Title and author name are required to continue.',
              },
            };
          }
          break;
        // Abstract, chapters, references, format — allow NEXT (warnings don't block)
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
      // Save is a side-effect handled externally; state stays the same
      return state;

    case 'RESET':
      return {
        step: 'IDLE',
        stepIndex: 0,
        data: {},
        errors: {},
        warnings: {},
      };

    default:
      return state;
  }
}

/**
 * Get the progress percentage (0-100) based on current step.
 */
export function getProgressPercentage(stepIndex: number): number {
  const totalSteps = STATE_ORDER.length - 1; // Exclude IDLE
  return Math.round((stepIndex / totalSteps) * 100);
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

  if (targetIdx <= currentIdx) return true; // Can always go back

  // Check all intermediate guards
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
