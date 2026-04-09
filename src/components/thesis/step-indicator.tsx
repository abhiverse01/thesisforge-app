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
  const { currentStep, selectedTemplate } = useThesisStore();

  return (
    <nav
      aria-label="Thesis creation progress"
      className={cn("w-full py-2", className)}
    >
      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border mx-16" />
        <div
          className="absolute top-5 left-16 h-0.5 bg-primary transition-all duration-500 ease-out mx-16"
          style={{
            width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * (100 - 12.5)}%`,
          }}
        />

        {WIZARD_STEPS.map((step, index) => {
          const Icon = stepIcons[index];
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isDisabled = step.id > 1 && !selectedTemplate;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center relative z-10 group"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted
                    ? "oklch(0.35 0.12 265)"
                    : isCurrent
                      ? "oklch(0.35 0.12 265)"
                      : isDisabled
                        ? "oklch(0.92 0.01 265)"
                        : "oklch(0.97 0.008 265)",
                  boxShadow: isCurrent
                    ? "0 4px 14px oklch(0.35 0.12 265 / 0.3)"
                    : "none",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary text-primary-foreground step-active"
                      : isDisabled
                        ? "border-muted bg-muted text-muted-foreground cursor-not-allowed"
                        : "border-border bg-card text-muted-foreground group-hover:border-primary/50"
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
                  opacity: isCurrent ? 1 : isDisabled ? 0.4 : 0.6,
                  y: isCurrent ? 0 : 2,
                }}
                className="text-[11px] font-medium mt-2 text-center max-w-[80px] leading-tight"
              >
                {step.name}
              </motion.span>
            </div>
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
                  "w-2 h-2 rounded-full transition-all duration-300",
                  currentStep === step.id
                    ? "w-6 bg-primary"
                    : currentStep > step.id
                      ? "bg-primary/60"
                      : "bg-border"
                )}
              />
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-3 transition-all duration-300",
                    currentStep > step.id ? "bg-primary/60" : "bg-border"
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
