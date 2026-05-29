"use client";

import React from "react";
import { motion } from "framer-motion";
import type { WizardStep } from "@/lib/thesis-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import { getStepLabel } from "./constants";

export interface WizardFooterProps {
  currentStep: WizardStep;
  canGoNext: () => boolean;
  prevStep: () => void;
  nextStep: () => void;
  handleExportZip: () => void;
  isGenerating: boolean;
  isNarrow: boolean;
  setShowGoHomeConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  goToHome: () => void;
}

/* ================================================================
   Step progress dots — compact visual progress indicator
   ================================================================ */
function StepDots({
  currentStep,
  totalSteps = 6,
  className,
}: {
  currentStep: WizardStep;
  totalSteps?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)} role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`Step ${currentStep} of ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = (i + 1) as WizardStep;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <span
                className={cn(
                  "w-2 h-px rounded-full transition-colors duration-300",
                  step <= currentStep
                    ? "bg-primary/40"
                    : "bg-border/60"
                )}
              />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    isCompleted && "bg-primary scale-[0.85]",
                    isCurrent && "bg-primary scale-110 shadow-[0_0_6px_oklch(0.50_0.22_264/0.4)]",
                    !isCurrent && !isCompleted && "bg-muted-foreground/25",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{getStepLabel(step)}</p>
              </TooltipContent>
            </Tooltip>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function WizardFooter({
  currentStep,
  canGoNext,
  prevStep,
  nextStep,
  handleExportZip,
  isGenerating,
  isNarrow,
  setShowGoHomeConfirm,
}: WizardFooterProps) {
  // Progress: step 1 = 0%, step 6 = 100%
  const progressPct = ((currentStep - 1) / 5) * 100;
  // Next step label for context-aware button text
  const nextStepLabel = currentStep < 6
    ? getStepLabel((currentStep + 1) as WizardStep)
    : null;

  return (
    <>
      {/* ── Mobile-only fixed footer ── */}
      <motion.footer
        data-wizard-footer-mobile
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-xl border-t border-border/30 relative md:hidden"
      >
        {/* Progress bar with glow */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-muted/60">
          <div
            className="h-full google-gradient transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step dots row */}
        <div className="flex justify-center pt-2.5 pb-1">
          <StepDots currentStep={currentStep} />
        </div>

        {/* Buttons row */}
        <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center gap-2 pt-1">
          {/* BACK */}
          <div className="flex-1 min-w-0">
            {currentStep === 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGoHomeConfirm(true)}
                className="w-full text-xs gap-1.5 text-muted-foreground h-11 rounded-xl transition-all duration-200 hover:bg-muted active:scale-[0.97]"
                aria-label="Return to homepage"
              >
                <HomeIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Home</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                className="w-full text-xs gap-1.5 h-11 rounded-xl transition-all duration-200 hover:bg-accent active:scale-[0.97]"
                aria-label={`Back to ${getStepLabel((currentStep - 1) as WizardStep)}`}
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Back</span>
              </Button>
            )}
          </div>

          {/* NEXT / EXPORT */}
          <div className="flex-[2] min-w-0">
            {currentStep < 6 ? (
              <Button
                size="sm"
                onClick={() => nextStep()}
                disabled={!canGoNext()}
                className={cn(
                  "w-full text-xs gap-1.5 font-semibold h-11 rounded-xl google-gradient text-white shadow-sm transition-all duration-300",
                  "hover:shadow-lg hover:shadow-primary/20 active:scale-[0.97]",
                  "disabled:shadow-none disabled:scale-100 disabled:saturate-[0.5]"
                )}
                aria-label={`Continue to ${nextStepLabel}`}
              >
                <span className="truncate">
                  {canGoNext() ? `Continue` : nextStepLabel ? `Complete ${getStepLabel(currentStep)}` : 'Continue'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleExportZip}
                disabled={isGenerating}
                className={cn(
                  "w-full text-xs gap-1.5 font-semibold h-11 rounded-xl google-gradient text-white shadow-sm transition-all duration-300",
                  "hover:shadow-lg hover:shadow-primary/20 active:scale-[0.97]",
                  "disabled:shadow-none disabled:scale-100"
                )}
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Export thesis</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.footer>

      {/* ── Desktop footer ── */}
      <motion.footer
        data-wizard-footer
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "tf-content-area shrink-0 z-10 border-t border-border/30 bg-background/90 backdrop-blur-2xl hidden md:block relative shadow-[0_-1px_0_oklch(from_var(--border)_l_c_h/0.3),0_-4px_16px_oklch(0_0_0/0.03)]",
          !isNarrow && "backdrop-saturate-[1.8]"
        )}
      >
        {/* Progress bar with glow on active segment */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-muted/60">
          <motion.div
            className="h-full google-gradient rounded-full"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className={cn(
          "px-4 sm:px-6 min-h-[72px] overflow-hidden flex items-center justify-between gap-3",
          "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        )}>
          {/* LEFT: BACK / HOME */}
          <div className="flex items-center gap-2 min-w-0 flex-1 shrink">
            {currentStep === 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGoHomeConfirm(true)}
                className="text-xs gap-1.5 text-muted-foreground min-h-[44px] sm:min-h-0 flex-1 sm:flex-none hover:bg-muted active:scale-[0.97] transition-all duration-200"
                aria-label="Return to homepage"
              >
                <HomeIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline truncate">Return to Homepage</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                className="text-xs gap-1.5 min-w-0 flex-1 sm:flex-none active:scale-[0.97] transition-all duration-200"
                aria-label={`Back to ${getStepLabel((currentStep - 1) as WizardStep)}`}
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Back</span>
              </Button>
            )}
          </div>

          {/* CENTER: Step dots + label */}
          <div className="flex items-center gap-3 shrink-0">
            <StepDots currentStep={currentStep} />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-foreground tabular-nums">
                Step {currentStep}
                <span className="text-muted-foreground font-normal">/6</span>
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                {getStepLabel(currentStep)}
              </span>
            </div>
          </div>

          {/* RIGHT: NEXT or EXPORT */}
          <div className="flex items-center gap-2 min-w-0 justify-end flex-1 shrink">
            {currentStep < 6 ? (
              <Button
                size="sm"
                onClick={() => nextStep()}
                disabled={!canGoNext()}
                className={cn(
                  "text-xs gap-1.5 min-w-0 sm:min-w-[140px] h-10 px-4 font-semibold flex-1 sm:flex-none rounded-xl google-gradient text-white shadow-sm transition-all duration-300",
                  "hover:shadow-lg hover:shadow-primary/20 active:scale-[0.97]",
                  "disabled:shadow-none disabled:scale-100 disabled:saturate-[0.5]"
                )}
                aria-label={`Continue to ${nextStepLabel}`}
              >
                <span className="truncate">Next</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleExportZip}
                disabled={isGenerating}
                className={cn(
                  "text-xs gap-1.5 font-semibold min-w-0 sm:min-w-[140px] h-10 px-4 flex-1 sm:flex-none rounded-xl google-gradient text-white shadow-sm transition-all duration-300",
                  "hover:shadow-lg hover:shadow-primary/20 active:scale-[0.97]",
                  "disabled:shadow-none disabled:scale-100"
                )}
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Export thesis</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.footer>
    </>
  );
}
