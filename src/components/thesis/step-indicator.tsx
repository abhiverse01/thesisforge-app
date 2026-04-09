"use client";

import React from "react";
import { motion } from "framer-motion";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { useThesisStore } from "@/lib/thesis-store";
import { cn } from "@/lib/utils";
import {
  FileText,
  UserRound,
  AlignLeft,
  BookOpen,
  Quote,
  Download,
  Check,
} from "lucide-react";

const stepIcons = [FileText, UserRound, AlignLeft, BookOpen, Quote, Download];

interface StepIndicatorProps {
  className?: string;
}

export function StepIndicator({ className }: StepIndicatorProps) {
  const { currentStep, selectedTemplate, setStep } = useThesisStore();

  return (
    <nav
      aria-label="Thesis creation progress"
      className={cn("w-full py-2", className)}
    >
      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Background line — spans from first to last circle center */}
        <div className="absolute top-5 left-[calc(10%-20px)] right-[calc(10%-20px)] h-[2px] bg-border" />
        {/* Progress line — width based on current step progress */}
        <div
          className="absolute top-5 left-[calc(10%-20px)] h-[2px] bg-primary transition-all duration-500 ease-out"
          style={{
            width: `${(currentStep - 1) / (WIZARD_STEPS.length - 1) * 80}%`,
          }}
        />

        {WIZARD_STEPS.map((step, index) => {
          const Icon = stepIcons[index];
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const canNavigate = isCompleted || step.id === currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (canNavigation(selectedTemplate, step.id, currentStep)) {
                  setStep(step.id as 1|2|3|4|5|6);
                }
              }}
              disabled={!canNavigation(selectedTemplate, step.id, currentStep)}
              className="flex flex-col items-center relative z-10 group outline-none"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.12 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary text-primary-foreground step-active"
                      : "border-border bg-card text-muted-foreground group-hover:border-primary/40 group-hover:bg-primary/5"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </motion.div>
              <motion.span
                initial={false}
                animate={{
                  opacity: isCurrent ? 1 : 0.5,
                }}
                className={cn(
                  "text-[11px] font-medium mt-2 text-center max-w-[80px] leading-tight transition-colors",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.name}
              </motion.span>
            </button>
          );
        })}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          {WIZARD_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  currentStep === step.id
                    ? "w-6 bg-primary"
                    : currentStep > step.id
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-border"
                )}
              />
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-3 transition-all duration-300",
                    currentStep > step.id ? "bg-primary/50" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground font-medium">
          Step {currentStep} of {WIZARD_STEPS.length} — {WIZARD_STEPS[currentStep - 1].name}
        </p>
      </div>
    </nav>
  );
}

function canNavigation(
  selectedTemplate: string | null,
  stepId: number,
  currentStep: number
): boolean {
  if (stepId === 1) return true;
  if (!selectedTemplate) return false;
  return stepId <= currentStep;
}
