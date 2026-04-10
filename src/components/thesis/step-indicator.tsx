"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { useThesisStore } from "@/lib/thesis-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function canNavigation(
  selectedTemplate: string | null,
  stepId: number,
  currentStep: number
): boolean {
  if (stepId === 1) return true;
  if (!selectedTemplate) return false;
  return stepId <= currentStep;
}

interface StepIndicatorProps {
  className?: string;
}

export function StepIndicator({ className }: StepIndicatorProps) {
  const { currentStep, selectedTemplate, setStep } = useThesisStore();

  const totalSteps = WIZARD_STEPS.length;
  const completionPercent = Math.round(
    ((currentStep - 1) / (totalSteps - 1)) * 100
  );

  // Accurate progress line: percentage between first circle center (0%) and last circle center (100%)
  const progressPercent = useMemo(
    () => ((currentStep - 1) / (totalSteps - 1)) * 100,
    [currentStep, totalSteps]
  );

  return (
    <nav
      aria-label="Thesis creation progress"
      className={cn("w-full py-2", className)}
    >
      {/* Desktop view */}
      <div className="hidden md:block">
        {/* Completion percentage label */}
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-medium text-muted-foreground">
            Progress
          </p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-border overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${completionPercent}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              />
            </div>
            <motion.span
              key={completionPercent}
              initial={{ scale: 1.15, color: "var(--primary)" }}
              animate={{ scale: 1, color: "var(--muted-foreground)" }}
              transition={{ duration: 0.4 }}
              className="text-xs font-semibold tabular-nums min-w-[36px] text-right"
            >
              {completionPercent}%
            </motion.span>
          </div>
        </div>

        {/* Step circles with connecting line */}
        <div className="relative flex items-start justify-between">
          {/* Background line — spans center of first to center of last circle */}
          <div
            className="absolute top-[20px] left-[20px] right-[20px] h-[2px] bg-border rounded-full"
          />
          {/* Animated progress line — same positioning, width based on progress */}
          <motion.div
            className="absolute top-[20px] left-[20px] h-[2px] bg-primary rounded-full origin-left"
            initial={false}
            animate={{ scaleX: progressPercent / 100 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            style={{ width: "calc(100% - 40px)" }}
          />

          {WIZARD_STEPS.map((step, index) => {
            const Icon = stepIcons[index];
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const canNav = canNavigation(selectedTemplate, step.id, currentStep);

            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (canNav) {
                        setStep(step.id as 1 | 2 | 3 | 4 | 5 | 6);
                      }
                    }}
                    disabled={!canNav}
                    className={cn(
                      "flex flex-col items-center relative z-10 group outline-none w-[40px]",
                      canNav && "cursor-pointer",
                      !canNav && "cursor-default"
                    )}
                  >
                    {/* Step circle */}
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isCurrent ? 1.15 : 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 relative",
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary bg-primary text-primary-foreground step-active"
                            : canNav
                              ? "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                              : "border-border bg-card text-muted-foreground/40"
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
                          >
                            <Check className="w-4 h-4" strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="icon"
                            initial={{ scale: 0.5, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0.5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Icon className="w-4 h-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Step label */}
                    <motion.span
                      initial={false}
                      animate={{
                        opacity: isCurrent ? 1 : 0.55,
                        y: isCurrent ? 0 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "text-[11px] font-medium mt-2 text-center max-w-[72px] leading-tight transition-colors duration-300",
                        isCurrent
                          ? "text-primary font-semibold"
                          : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {step.name}
                    </motion.span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">
                      {step.id}. {step.name}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] text-primary font-medium">
                        → In Progress
                      </span>
                    )}
                    {!isCompleted && !isCurrent && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        ○ Upcoming
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Mobile view — Enhanced with step name abbreviations */}
      <div className="md:hidden">
        {/* Mobile progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${completionPercent}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>
          <motion.span
            key={`mob-${completionPercent}`}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-[10px] font-semibold text-primary tabular-nums"
          >
            {completionPercent}%
          </motion.span>
        </div>

        {/* Step name tabs — scrollable on mobile */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const canNav = canNavigation(selectedTemplate, step.id, currentStep);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (canNav) {
                    setStep(step.id as 1 | 2 | 3 | 4 | 5 | 6);
                  }
                }}
                disabled={!canNav}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-300 outline-none",
                  isCurrent &&
                    "bg-primary text-primary-foreground shadow-sm",
                  isCompleted &&
                    !isCurrent &&
                    "bg-primary/10 text-primary hover:bg-primary/15",
                  !isCurrent &&
                    !isCompleted &&
                    canNav &&
                    "bg-muted text-muted-foreground hover:bg-muted/80",
                  !isCurrent && !isCompleted && !canNav && "bg-muted text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 flex-shrink-0" strokeWidth={3} />
                ) : (
                  <span className="w-3 h-3 flex-shrink-0 flex items-center justify-center text-[9px] font-bold opacity-60">
                    {step.id}
                  </span>
                )}
                <span className="whitespace-nowrap">{step.name}</span>
              </button>
            );
          })}
        </div>

        {/* Current step info */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="text-center text-[11px] text-muted-foreground font-medium mt-2"
          >
            Step {currentStep} of {totalSteps} — {WIZARD_STEPS[currentStep - 1].description}
          </motion.p>
        </AnimatePresence>
      </div>
    </nav>
  );
}
