"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  LayoutTemplate,
  Brain,
  Zap,
  Shield,
  Star,
  Moon,
  Sun,
  HelpCircle,
  FileText,
  BookOpen,
  Quote,
  Sliders,
  Download,
  Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useThesisStore } from "@/lib/thesis-store";
import type { WizardStep } from "@/lib/thesis-store";

// ============================================================
// Navigation Rail — 52px persistent left sidebar
// ============================================================

interface RailItem {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  scrollTo?: string;
  step?: WizardStep;
  isComplete?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

// Homepage rail items — map to actual homepage sections (7 sections)
const homepageRailItems: Omit<RailItem, "isActive">[] = [
  { icon: Sparkles, tooltip: "Hero", scrollTo: "#hero" },
  { icon: Zap, tooltip: "How it works", scrollTo: "#how-it-works" },
  { icon: LayoutTemplate, tooltip: "Templates", scrollTo: "#templates" },
  { icon: Brain, tooltip: "AI Features", scrollTo: "#intelligence" },
  { icon: Shield, tooltip: "Privacy", scrollTo: "#privacy" },
  { icon: Download, tooltip: "Export", scrollTo: "#export" },
  { icon: Star, tooltip: "Why ThesisForge", scrollTo: "#why" },
];

// Wizard rail items — 6 steps with completion state
const wizardStepConfig: { step: WizardStep; icon: React.ComponentType<{ className?: string }>; tooltip: string }[] = [
  { step: 1, icon: LayoutTemplate, tooltip: "1 \u00b7 Template" },
  { step: 2, icon: FileText, tooltip: "2 \u00b7 Metadata" },
  { step: 3, icon: BookOpen, tooltip: "3 \u00b7 Chapters" },
  { step: 4, icon: Quote, tooltip: "4 \u00b7 References" },
  { step: 5, icon: Sliders, tooltip: "5 \u00b7 Formatting" },
  { step: 6, icon: Download, tooltip: "6 \u00b7 Export" },
];

export function NavigationRail() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const wizardStarted = useThesisStore((s) => s.wizardStarted);
  const currentStep = useThesisStore((s) => s.currentStep);
  const setStep = useThesisStore((s) => s.setStep);
  const canGoToStep = useThesisStore((s) => s.canGoToStep);
  const thesis = useThesisStore((s) => s.thesis);

  // Ref to the scroll container — main element is the scroll context
  const scrollRootRef = useRef<HTMLElement | null>(null);

  // Track which homepage section is active via IntersectionObserver
  const [activeSection, setActiveSection] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch: defer theme-dependent rendering until client mounts
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration guard: must detect client mount
  useEffect(() => { setMounted(true); }, []);

  // Resolve the scroll container — main is overflow-y:auto, so it's the
  // intersection root, NOT the viewport. Using root:null (viewport) causes
  // all sections to appear visible simultaneously since main clips its children.
  useEffect(() => {
    scrollRootRef.current = document.querySelector('main.tf-content-area');
  }, []);

  // Track which homepage section is active via scroll position.
  // FIX: Replaced IntersectionObserver with scroll event listener.
  // IntersectionObserver with thresholds keeps the first section "active" even
  // when scrolled past because the full-viewport hero remains partially visible.
  useEffect(() => {
    const rootEl = scrollRootRef.current;
    if (!rootEl) return;
    const sections = rootEl.querySelectorAll("[data-rail-section]");
    if (!sections.length) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rootRect = rootEl.getBoundingClientRect();
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < sections.length; i++) {
          const rect = sections[i].getBoundingClientRect();
          const dist = Math.abs(rect.top - rootRect.top);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        setActiveSection(bestIdx);
        ticking = false;
      });
    };

    rootEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => rootEl.removeEventListener('scroll', handleScroll);
  }, [wizardStarted]);

  // Smooth scroll to a section
  const scrollToSection = useCallback((scrollTo: string) => {
    const el = document.querySelector(scrollTo);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Determine step completion (simple heuristic — step is complete if currentStep > that step)
  const isStepComplete = useCallback(
    (step: WizardStep) => currentStep > step,
    [currentStep]
  );

  // Determine if a step can be navigated to
  const handleStepClick = useCallback(
    (step: WizardStep) => {
      if (step === currentStep) return;
      if (step < currentStep || canGoToStep(step)) {
        setStep(step);
      }
    },
    [currentStep, setStep, canGoToStep]
  );

  const items: RailItem[] = wizardStarted
    ? wizardStepConfig.map((cfg) => ({
        ...cfg,
        isComplete: isStepComplete(cfg.step),
        isActive: currentStep === cfg.step,
        onClick: () => handleStepClick(cfg.step),
      }))
    : homepageRailItems.map((item, idx) => ({
        ...item,
        isActive: activeSection === idx,
        onClick: item.scrollTo ? () => scrollToSection(item.scrollTo!) : undefined,
      }));

  return (
    <aside
      className={cn(
        "tf-rail hidden md:flex",
      )}
    >
      <div className="flex flex-col items-center w-full h-full">
        {/* Main navigation items */}
        <div className="flex flex-col items-center gap-0.5 flex-1 pt-3">
          {items.map((item, idx) => (
            <button
              key={idx}
              data-active={item.isActive ? "true" : undefined}
              data-tooltip={item.tooltip}
              onClick={item.onClick}
              className={cn(
                "tf-rail-btn relative",
                item.isActive && "tf-rail-btn--active"
              )}
              aria-label={item.tooltip}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {/* Completion badge for wizard steps */}
              {wizardStarted && item.isComplete && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center pointer-events-none ring-2 ring-background">
                  <Check className="w-2 h-2 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Bottom actions — divider + theme + help */}
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-2" />
        <div className="flex flex-col items-center gap-0.5 pb-3">
          <button
            data-tooltip={mounted && resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="tf-rail-btn"
            aria-label="Toggle theme"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
          </button>
          {wizardStarted && (
            <button
              data-tooltip="Keyboard shortcuts (?)"
              onClick={() => {
                // GODMODE FIX: Use CustomEvent instead of synthetic KeyboardEvent.
                // Synthetic keydown events may not be caught by React's event delegation,
                // causing the shortcuts dialog to never open. CustomEvent guarantees
                // delivery to any listener on the document.
                document.dispatchEvent(new CustomEvent('tf:toggle-shortcuts'));
              }}
              className="tf-rail-btn"
              aria-label="Keyboard shortcuts"
            >
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
