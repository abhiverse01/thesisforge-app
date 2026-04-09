"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useThesisStore } from "@/lib/thesis-store";
import { StepIndicator } from "@/components/thesis/step-indicator";
import { TemplateSelector } from "@/components/thesis/template-selector";
import { MetadataForm } from "@/components/thesis/metadata-form";
import { AbstractEditor } from "@/components/thesis/abstract-editor";
import { ChapterEditor } from "@/components/thesis/chapter-editor";
import { ReferenceEditor } from "@/components/thesis/reference-editor";
import { GeneratePreview } from "@/components/thesis/generate-preview";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Moon,
  Sun,
  RotateCcw,
  Mail,
  ExternalLink,
  Keyboard,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const pageVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

// Konami Code: ↑↑↓↓←→←→BA
const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "KeyB", "KeyA",
];

export default function Home() {
  const { currentStep, selectedTemplate, reset, thesis, nextStep, prevStep } =
    useThesisStore();
  const { theme, setTheme } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const konamiBuffer = useRef<string[]>([]);
  const isFirstRender = useRef(true);

  // ---- Local Storage Persistence ----
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const saved = localStorage.getItem("thesisforge_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.thesis && parsed.selectedTemplate && parsed.currentStep) {
            useThesisStore.setState({
              thesis: parsed.thesis,
              selectedTemplate: parsed.selectedTemplate,
              currentStep: parsed.currentStep,
            });
          }
        } catch {
          // Invalid saved state, ignore
        }
      }
    }
  }, []);

  // Auto-save on every state change (debounced)
  useEffect(() => {
    if (!thesis) return;
    const timeout = setTimeout(() => {
      const state = useThesisStore.getState();
      if (state.thesis) {
        localStorage.setItem(
          "thesisforge_state",
          JSON.stringify({
            thesis: state.thesis,
            selectedTemplate: state.selectedTemplate,
            currentStep: state.currentStep,
          })
        );
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [thesis, currentStep]);

  // ---- Keyboard Shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Konami code detection
      konamiBuffer.current.push(e.code);
      if (konamiBuffer.current.length > KONAMI_CODE.length) {
        konamiBuffer.current.shift();
      }
      if (
        konamiBuffer.current.length === KONAMI_CODE.length &&
        konamiBuffer.current.every((k, i) => k === KONAMI_CODE[i])
      ) {
        setShowEasterEgg(true);
        konamiBuffer.current = [];
      }

      // Don't trigger shortcuts when typing in inputs/textareas
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "ArrowRight":
          case "ArrowDown":
            e.preventDefault();
            if (selectedTemplate) nextStep();
            break;
          case "ArrowLeft":
          case "ArrowUp":
            e.preventDefault();
            prevStep();
            break;
          case "/":
            e.preventDefault();
            setShowShortcuts(true);
            break;
        }
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTemplate, nextStep, prevStep]);

  // Clear saved state on reset
  const handleReset = useCallback(() => {
    localStorage.removeItem("thesisforge_state");
    reset();
  }, [reset]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <TemplateSelector />;
      case 2:
        return <MetadataForm />;
      case 3:
        return <AbstractEditor />;
      case 4:
        return <ChapterEditor />;
      case 5:
        return <ReferenceEditor />;
      case 6:
        return <GeneratePreview />;
      default:
        return <TemplateSelector />;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen flex flex-col bg-pattern">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl surface-1">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight leading-none">
                  ThesisForge
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 hidden sm:block">
                  Instant LaTeX Thesis Creator
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedTemplate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-xs gap-1.5 text-muted-foreground h-8"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">New Thesis</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Start a new thesis</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <span className="kbd">Ctrl</span> + <span className="kbd">←</span> goes back
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShortcuts(true)}
                    className="h-8 w-8 p-0 text-muted-foreground"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Keyboard shortcuts</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Press <span className="kbd">?</span>
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="h-8 w-8 p-0"
                    aria-label="Toggle theme"
                  >
                    <Sun className="w-4 h-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Toggle {theme === "dark" ? "light" : "dark"} mode</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Step Indicator */}
            <AnimatePresence mode="wait">
              {selectedTemplate && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StepIndicator />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t mt-auto bg-background/60 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Left side — Product tagline */}
              <div className="text-center sm:text-left">
                <p className="text-[11px] text-muted-foreground">
                  Paste content → Download <code className="text-[10px] bg-secondary px-1 py-0.5 rounded font-mono">.tex</code> → Compile in any LaTeX editor → Get your PDF
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Auto-saved locally. Your data stays in your browser.
                </p>
              </div>

              {/* Right side — Developer credit */}
              <div className="flex items-center gap-2.5">
                <div className="w-px h-6 bg-border hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">AS</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold leading-none">
                      Abhishek Shah
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <a
                        href="mailto:abhishek.aimarine@gmail.com"
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5"
                      >
                        <Mail className="w-2.5 h-2.5" />
                        Email
                      </a>
                      <span className="text-[10px] text-muted-foreground/30">·</span>
                      <a
                        href="https://abhishekshah.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Portfolio
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom brand line */}
            <div className="mt-3 pt-3 border-t flex items-center justify-center gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground/70">
                ThesisForge
              </span>
              <span className="text-[10px] text-muted-foreground/40">
                · Crafted with precision by{" "}
                <a
                  href="https://abhishekshah.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline underline-offset-2 decoration-muted-foreground/30 hover:decoration-primary"
                >
                  Abhishek Shah
                </a>
              </span>
              <span className="text-[10px] text-muted-foreground/40">
                · © {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </footer>

        {/* Keyboard Shortcuts Dialog */}
        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Keyboard className="w-4 h-4 text-primary" />
                Keyboard Shortcuts
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Go to next step</span>
                <div className="flex gap-1">
                  <span className="kbd">Ctrl</span>
                  <span className="kbd">→</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Go to previous step</span>
                <div className="flex gap-1">
                  <span className="kbd">Ctrl</span>
                  <span className="kbd">←</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Show this help</span>
                <div className="flex gap-1">
                  <span className="kbd">Ctrl</span>
                  <span className="kbd">/</span>
                </div>
              </div>
              <div className="border-t pt-3 mt-3">
                <p className="text-[10px] text-muted-foreground/60 italic">
                  💡 Pro tip: Your progress is auto-saved to local storage. Come back anytime.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Easter Egg Dialog */}
        <Dialog open={showEasterEgg} onOpenChange={setShowEasterEgg}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-primary" />
                You found the secret!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                👋 Hey there! You discovered the hidden Konami Code easter egg.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">ThesisForge</strong> was crafted with obsessive attention to detail by{" "}
                <a
                  href="https://abhishekshah.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Abhishek Shah
                </a>
                . Every pixel, every transition, every line of code was designed to make creating LaTeX theses effortless.
              </p>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[11px] text-primary font-medium">
                  Fun fact: This app generates clean, compilable LaTeX that works
                  perfectly in Overleaf, TeXStudio, and any other LaTeX editor.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
