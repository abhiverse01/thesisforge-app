'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StepNavTabBarProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  canGoToStep: (step: number) => boolean;
}

const STEPS = [
  { step: 1, shortLabel: 'Template', icon: '1' },
  { step: 2, shortLabel: 'Metadata', icon: '2' },
  { step: 3, shortLabel: 'Chapters', icon: '3' },
  { step: 4, shortLabel: 'Refs', icon: '4' },
  { step: 5, shortLabel: 'Format', icon: '5' },
  { step: 6, shortLabel: 'Export', icon: '6' },
];

export function StepNavMobileLabel({ currentStep }: { currentStep: number }) {
  const label = STEPS.find((s) => s.step === currentStep)?.shortLabel ?? `Step ${currentStep}`;

  return (
    <div className="md:hidden text-center mt-2">
      <span className="text-xs font-medium text-muted-foreground">
        Step {currentStep} of 6 —
      </span>
      <span className="text-xs font-medium text-foreground ml-1">
        {label}
      </span>
    </div>
  );
}

export function StepNavTabBar({ currentStep, onStepClick, canGoToStep }: StepNavTabBarProps) {
  return (
    <nav className="md:hidden flex items-center gap-1 px-2 py-1 overflow-x-auto scrollbar-none">
      {STEPS.map(({ step, shortLabel, icon }, stepIndex) => {
        const isActive = step === currentStep;
        const isAccessible = canGoToStep(step);
        const isCompleted = step < currentStep;

        return (
          <React.Fragment key={step}>
            <button
              onClick={() => isAccessible && onStepClick(step)}
              disabled={!isAccessible}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[52px] min-h-[44px] transition-colors text-center shrink-0',
                isActive && 'bg-primary/10 text-primary',
                isCompleted && isAccessible && !isActive && 'text-muted-foreground hover:bg-muted',
                !isActive && !isCompleted && isAccessible && 'text-muted-foreground hover:bg-muted',
                !isAccessible && 'text-muted-foreground/40 pointer-events-none'
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && isAccessible && !isActive && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
                  !isActive && !isCompleted && isAccessible && 'bg-muted text-muted-foreground',
                  !isAccessible && 'bg-muted/50 text-muted-foreground/40'
                )}
              >
                {isCompleted && !isActive ? (
                  <motion.svg
                    key="check"
                    className="w-3 h-3 text-emerald-500"
                    viewBox="0 0 12 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3 }}
                  ><path d="M1 5L4.5 8.5L11 1.5" /></motion.svg>
                ) : (
                  <span className="tf-nums">{icon}</span>
                )}
              </span>
              <span className={cn(
                'text-[10px] leading-tight font-medium truncate max-w-[52px]',
                isActive && 'text-primary',
              )}>
                {shortLabel}
              </span>
            </button>
            {stepIndex < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-0.5 transition-colors duration-500 pointer-events-none",
                  stepIndex < currentStep
                    ? "bg-primary/60"
                    : "bg-border/40"
                )}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
