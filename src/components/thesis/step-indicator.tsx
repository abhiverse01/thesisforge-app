"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { useThesisStore, type WizardStep } from "@/lib/thesis-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  UserRound,
  BookOpen,
  Quote,
  Download,
  Check,
  Settings,
} from "lucide-react";

// 6 step icons: Template, Metadata, Chapters, References, Format, Generate
const stepIcons = [
  FileText,
  UserRound,
  BookOpen,
  Quote,
  Settings,
  Download,
];

const stepAbbreviations = [
  "Template",
  "Metadata",
  "Chapters",
  "Refs",
  "Format",
  "Generate",
];

interface StepIndicatorProps {
  className?: string;
}

export function StepIndicator({ className }: StepIndicatorProps) {
  const { currentStep, canGoToStep, setStep } = useThesisStore();

  const totalSteps = WIZARD_STEPS.length;
  const completionPercent = Math.round(
    ((currentStep - 1) / (totalSteps - 1)) * 100
  );

  const progressPercent = useMemo(
    () => ((currentStep - 1) / (totalSteps - 1)) * 100,
    [currentStep, totalSteps]
  );

  const tooltipSide = "bottom" as const;

  return (
    <nav
      aria-label="Thesis creation progress"
      className={cn("w-full py-2", className)}
    >
      {/* Desktop view */}
      <div className="hidden md:block">
        {/* Completion label with mini progress bar */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs font-medium text-muted-foreground">
            Progress
          </p>
          <div className="flex items-center gap-2.5">
            <div className="h-[3px] w-24 rounded-full bg-primary/15 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                layout
                initial={false}
                animate={{ width: `${completionPercent}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              />
            </div>
            <motion.span
              key={completionPercent}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="text-xs font-semibold tabular-nums min-w-[36px] text-right text-foreground"
            >
              {completionPercent}%
            </motion.span>
          </div>
        </div>

        {/* Step circles with connecting line */}
        <div className="relative flex items-start justify-between">
          {/* Background line */}
          <div
            className="absolute top-[22px] left-[22px] right-[22px] h-[3px] bg-primary/15 rounded-full"
          />
          {/* Animated progress line */}
          <motion.div
            className="absolute top-[22px] left-[22px] h-[3px] bg-primary rounded-full origin-left"
            layout
            initial={false}
            animate={{ scaleX: progressPercent / 100 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            style={{ width: "calc(100% - 44px)" }}
          />

          {WIZARD_STEPS.map((step, index) => {
            const Icon = stepIcons[index];
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const canNav = canGoToStep(step.id as WizardStep);

            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (canNav) {
                        setStep(step.id as WizardStep);
                      }
                    }}
                    disabled={!canNav}
                    className={cn(
                      "flex flex-col items-center relative z-10 group outline-none",
                      canNav && "cursor-pointer",
                      !canNav && "cursor-default opacity-45"
                    )}
                  >
                    {/* Step circle */}
                    <motion.div
                      layout
                      initial={false}
                      animate={{
                        scale: isCurrent ? 1.12 : 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors duration-200 relative",
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : canNav
                              ? "border-muted-foreground/30 bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                              : "border-border bg-muted/30 text-muted-foreground/40"
                      )}
                    >
                      <AnimatePresence mode="wait">
                        {isCompleted ? (
                          <motion.span
                            key="check"
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 90 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 15,
                            }}
                            className="flex items-center justify-center"
                          >
                            <Check className="w-5 h-5" strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="step-content"
                            initial={{ scale: 0.5, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0.5 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col items-center leading-none"
                          >
                            <span className="text-xs font-semibold tracking-wider opacity-60">
                              {step.id}
                            </span>
                            <Icon className="w-4 h-4 mt-px" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Step label */}
                    <span
                      className={cn(
                        "text-xs font-medium mt-2 text-center max-w-[72px] leading-tight transition-colors duration-200",
                        isCurrent
                          ? "text-primary font-semibold"
                          : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {step.name}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side={tooltipSide}
                  className="text-center max-w-[200px]"
                >
                  <div className="flex items-center justify-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">
                      Step {step.id}: {step.name}
                    </span>
                    {isCompleted && (
                      <span className="text-xs text-[var(--color-text-brand)] font-medium">
                        Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-xs text-primary font-medium">
                        In Progress
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        {/* "Step X of 7" label */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-xs font-medium text-primary tabular-nums">
            {completionPercent}%
          </span>
        </div>

        {/* Mobile progress bar */}
        <div className="h-[3px] rounded-full bg-primary/15 overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-primary"
            layout
            initial={false}
            animate={{ width: `${completionPercent}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>

        {/* Step number tabs — scrollable row with abbreviated names */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const canNav = canGoToStep(step.id as WizardStep);

            return (
              <motion.button
                key={step.id}
                type="button"
                onClick={() => {
                  if (canNav) {
                    setStep(step.id as WizardStep);
                  }
                }}
                disabled={!canNav}
                layout
                whileTap={canNav ? { scale: 0.96 } : undefined}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out outline-none",
                  isCurrent &&
                    "bg-primary text-primary-foreground shadow-sm",
                  isCompleted &&
                    !isCurrent &&
                    "bg-primary/10 text-primary",
                  !isCurrent &&
                    !isCompleted &&
                    canNav &&
                    "bg-muted text-muted-foreground",
                  !isCurrent && !isCompleted && !canNav && "bg-muted/50 text-muted-foreground/40"
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                    isCurrent
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-muted-foreground/10 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3" strokeWidth={3} />
                  ) : (
                    step.id
                  )}
                </span>
                <span className="whitespace-nowrap tracking-wide">
                  {stepAbbreviations[index]}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Current step description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="text-center text-xs text-muted-foreground font-medium mt-2"
          >
            {WIZARD_STEPS[currentStep - 1].description}
          </motion.p>
        </AnimatePresence>
      </div>
    </nav>
  );
}
