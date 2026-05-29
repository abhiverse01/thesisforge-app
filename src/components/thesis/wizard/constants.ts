"use client";

import type { WizardStep } from "@/lib/thesis-store";

// ============================================================
// FLUIDITY: Animation Variants — cubic-bezier spring for natural, bouncy motion
// ============================================================

/** cubic-bezier spring for natural, bouncy motion */
export const fadeVariants = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

export const fadeTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const,
};

// ============================================================
// Step Navigation Data
// ============================================================

export const STEP_NAV: {
  step: WizardStep;
  name: string;
  description: string;
}[] = [
  { step: 1, name: "Template", description: "Choose thesis type" },
  { step: 2, name: "Metadata", description: "Title, abstract & info" },
  { step: 3, name: "Chapters", description: "Write content" },
  { step: 4, name: "References", description: "Manage citations" },
  { step: 5, name: "Format", description: "Configure output" },
  { step: 6, name: "Generate", description: "Preview & export" },
];

/** Helper to get step label */
export function getStepLabel(step: WizardStep): string {
  return STEP_NAV.find((s) => s.step === step)?.name ?? `Step ${step}`;
}

// ============================================================
// Konami Code
// ============================================================

export const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];

// ============================================================
// History helpers — serialize / restore thesis state
// ============================================================

import { historyStack } from "@/core/history";
import { useThesisStore } from "@/lib/thesis-store";
import { toast } from "sonner";

export function captureState(): string {
  const s = useThesisStore.getState();
  return JSON.stringify({
    thesis: s.thesis,
    selectedTemplate: s.selectedTemplate,
    currentStep: s.currentStep,
    wizardStarted: s.wizardStarted,
  });
}

export function restoreState(entry: { state: string; description: string }, isUndo: boolean): void {
  try {
    const parsed = JSON.parse(entry.state);
    useThesisStore.setState({
      thesis: parsed.thesis,
      selectedTemplate: parsed.selectedTemplate,
      currentStep: parsed.currentStep,
      wizardStarted: parsed.wizardStarted,
      lastErrors: {},
      lastDeletedChapter: null,
      lastDeletedReference: null,
    });
    toast.success(isUndo ? "Undone" : "Redone", {
      description: entry.description,
      duration: 2000,
    });
  } catch {
    toast.error("History restore failed", { duration: 2000 });
  }
}

// ============================================================
// Navbar Date — Greeting Messages
// ============================================================

export function getGreetingMessage(now: Date): string {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdayIdx = now.getDay(); // 0=Sun
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Seasonal greetings
  if (month === 1 && day === 1) return "Happy New Year! 🎉";
  if (month === 2 && day === 14) return "Happy Valentine's Day! 💝";
  if (month === 10 && day === 31) return "Happy Halloween! 🎃";
  if (month === 12 && day === 25) return "Merry Christmas! 🎄";

  // Day greetings — personalized for Thu-Sun, generic for Mon-Wed
  const dayGreetings = ["Happy Thursday!", "Happy Friday!", "Happy Saturday!", "Happy Sunday!"];
  if (dayGreetings.some(g => g.includes(weekdayNames[weekdayIdx]))) {
    return `Happy ${weekdayNames[weekdayIdx]}!`;
  }

  // Generic fallbacks
  const fallbacks = ["Writing day!", "Thesis time!", "You've got this!", "Keep going!", "Almost there!", "Make it count!"];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
