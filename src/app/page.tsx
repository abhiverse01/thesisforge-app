"use client";

import React from "react";
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
import { FileText, Moon, Sun, RotateCcw } from "lucide-react";

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export default function Home() {
  const { currentStep, selectedTemplate, reset } = useThesisStore();
  const { theme, setTheme } = useTheme();

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight leading-none">
                ThesisForge
              </span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Instant LaTeX Thesis Creator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedTemplate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="text-xs gap-1.5 text-muted-foreground h-8"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">New Thesis</span>
              </Button>
            )}
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Step Indicator (show after template selection) */}
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
      <footer className="border-t mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            ThesisForge — Generate production-ready LaTeX thesis documents
            instantly.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Paste content → Download .tex → Compile in any LaTeX editor → Get
            your PDF
          </p>
        </div>
      </footer>
    </div>
  );
}
