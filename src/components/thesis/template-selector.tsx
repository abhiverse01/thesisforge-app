"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { THESIS_TEMPLATES, WIZARD_STEPS, type ThesisType } from "@/lib/thesis-types";
import { useThesisStore } from "@/lib/thesis-store";
import { toast } from "sonner";
import { importFile, type ImportFileResult } from "@/core/importer";
import { ImportReviewModal } from "@/components/thesis/ImportReviewModal";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Building2,
  ScrollText,
  FileText,
  Check,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Star,
  BookOpen,
  Layers,
  CircleDot,
  Hexagon,
  Square,
  AlertTriangle,
  ArrowRight,
  Upload,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Template icon shapes — each template gets a distinctive icon
const templateIconConfig: Record<
  string,
  { Icon: LucideIcon; Wrapper: LucideIcon; label: string }
> = {
  bachelor: { Icon: GraduationCap, Wrapper: CircleDot, label: "Undergraduate" },
  master: { Icon: Building2, Wrapper: Hexagon, label: "Graduate" },
  phd: { Icon: ScrollText, Wrapper: Square, label: "Doctoral" },
  report: { Icon: FileText, Wrapper: Layers, label: "Technical" },
  conference: { Icon: BookOpen, Wrapper: Star, label: "Conference" },
};

// Estimated page ranges per template type
const templateEstimates: Record<string, { chapters: number; pages: string }> = {
  bachelor: { chapters: 5, pages: "40 - 60" },
  master: { chapters: 6, pages: "60 - 100" },
  phd: { chapters: 7, pages: "100 - 200" },
  report: { chapters: 3, pages: "15 - 30" },
  conference: { chapters: 5, pages: "6 - 12" },
};

// Feature list for the expandable "View all features" section
const featureLabels: Record<string, string[]> = {
  bachelor: [
    "IMRAD structure",
    "Title page & abstract",
    "Table of contents",
    "APA citations",
    "Bibliography",
  ],
  master: [
    "Extended abstract",
    "Literature review",
    "Methodology chapter",
    "Per-chapter numbering",
    "Dedication & appendix",
    "APA citations",
  ],
  phd: [
    "Comprehensive front matter",
    "Multiple content chapters",
    "Glossary & listings",
    "Per-chapter numbering",
    "Dedication & appendix",
    "IEEE citations",
    "Double spacing",
    "Wide margins",
  ],
  report: [
    "Streamlined formatting",
    "Technical paper focus",
    "IEEE citations",
    "Single spacing",
    "Compact structure",
  ],
  conference: [
    "IEEEtran format",
    "Two-column layout",
    "IEEE citations",
    "10pt font size",
    "Compact structure",
  ],
};

// "Best for" subtitles — concise guidance for each template type
const bestForLabels: Record<string, string> = {
  bachelor: "Best for: Undergraduate theses and final-year projects",
  master: "Best for: Graduate theses and engineering dissertations",
  phd: "Best for: Doctoral dissertations with comprehensive research",
  report: "Best for: Technical reports, lab reports, and documentation",
  conference: "Best for: IEEE conference papers and page-limited submissions",
};

// Document class per template type — for display
const docClassLabels: Record<string, string> = {
  bachelor: "report",
  master: "report",
  phd: "report",
  report: "article",
  conference: "IEEEtran",
};

// Chapter structure preview for each template type
const chapterStructureLabels: Record<string, string[]> = {
  bachelor: ["Introduction", "Literature Review", "Methodology", "Results & Discussion", "Conclusion"],
  master: ["Introduction", "Literature Review", "Methodology", "Results", "Discussion", "Conclusion"],
  phd: ["Introduction", "Background", "Literature Review", "Methodology", "Results", "Discussion", "Conclusion"],
  report: ["Introduction", "Methods", "Results & Discussion"],
  conference: ["Introduction", "Related Work", "Methodology", "Experiments", "Conclusion"],
};

export function TemplateSelector() {
  const selectTemplate = useThesisStore(s => s.selectTemplate);
  const selectedTemplate = useThesisStore(s => s.selectedTemplate);
  const thesis = useThesisStore(s => s.thesis);
  const [confirmSwitch, setConfirmSwitch] = useState<{ oldType: string; newType: string } | null>(null);

  // ---- Thesis file import state (same capability as homepage) ----
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportFileResult | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const thesisImportRef = useRef<HTMLInputElement>(null);

  const handleThesisFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    setImporting(true);
    try {
      let bestResult: ImportFileResult | null = null;
      const allChapters: any[] = [];
      const allReferences: any[] = [];
      const allWarnings: string[] = [];

      for (const file of files) {
        try {
          const result = await importFile(file);
          if (!bestResult) bestResult = result;
          if (result.result.chapters) allChapters.push(...result.result.chapters);
          if (result.result.references) allReferences.push(...result.result.references);
          if (result.result.warnings) allWarnings.push(...result.result.warnings);
        } catch (err: any) {
          toast.error(`Skipped "${file.name}": ${err.message || 'Import failed'}`, { duration: 3000 });
        }
      }

      if (bestResult) {
        const mergedResult = {
          ...bestResult,
          result: {
            ...bestResult.result,
            chapters: allChapters,
            references: allReferences,
            warnings: [`Merged ${files.length} files`, ...allWarnings],
          },
        };
        setImportResult(mergedResult);
        setImportModalOpen(true);
      } else {
        toast.error('All files failed to import. Check the files and try again.', { duration: 4000 });
      }
    } catch (err: any) {
      toast.error(err.message || 'Import failed', { duration: 3000 });
    } finally {
      setImporting(false);
    }
  }, []);

  // WHY: Determine what data exists so the confirmation dialog can list what will be reset
  const currentDataCounts = thesis ? {
    chapters: thesis.chapters.length,
    references: thesis.references.length,
    hasAbstract: !!thesis.abstract.trim(),
    hasKeywords: thesis.keywords.length > 0,
  } : null;

  // Resolve current template for preview panel
  const currentTemplate = THESIS_TEMPLATES.find(t => t.type === selectedTemplate);

  return (
    <div className="space-y-6">
      {/* Hidden file input for thesis file import (multi-format: .pdf, .tex, .docx, .md, .txt) */}
      <input
        ref={thesisImportRef}
        type="file"
        accept=".pdf,.tex,.docx,.doc,.md,.txt"
        multiple
        onChange={handleThesisFileSelect}
        className="hidden"
      />

      {/* Import Review Modal — same modal used on homepage */}
      <ImportReviewModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        imported={importResult}
      />

      {/* Step header — left-aligned */}
      <div className="mb-8">
        <p className="tf-micro-label mb-2">Step 1 of {WIZARD_STEPS.length}</p>
        <h1 className="tf-heading mb-3">Choose Your Canvas</h1>
        <p className="text-sm text-muted-foreground mb-8">Each template is pre-configured for its academic level with the right formatting, structure, and citation style.</p>
      </div>

      {/* Import Thesis Files — above the selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Button
          variant="outline"
          onClick={() => thesisImportRef.current?.click()}
          disabled={importing}
          className="gap-2 h-10 px-4 text-sm border-border hover:border-primary/30 hover:bg-accent transition-colors"
        >
          {importing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>Import Existing Thesis</span>
          <span className="text-[11px] text-muted-foreground/60">.pdf .tex .docx .md .txt</span>
        </Button>
      </motion.div>

      {/* Two-column layout: list + preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex flex-col md:flex-row gap-6"
      >
        {/* Mobile: horizontal scrolling template strip */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {THESIS_TEMPLATES.map(template => {
            const iconConfig = templateIconConfig[template.type];
            const estimate = templateEstimates[template.type];
            return (
              <button
                key={template.type}
                onClick={() => {
                  // Already selected — do nothing (don't destroy data)
                  if (selectedTemplate === template.type) return;
                  if (selectedTemplate && currentDataCounts) {
                    setConfirmSwitch({ oldType: selectedTemplate, newType: template.type });
                  } else {
                    selectTemplate(template.type);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150 min-w-[180px] flex-shrink-0",
                  selectedTemplate === template.type
                    ? "bg-primary/8 border border-primary/20"
                    : "bg-muted/30 border border-transparent hover:bg-accent"
                )}
              >
                <iconConfig.Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{template.name}</p>
                  <p className="text-[11px] text-muted-foreground">{estimate.pages} pages</p>
                </div>
                {selectedTemplate === template.type && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="ml-auto flex-shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>

        {/* Left: Vertical template list (desktop) */}
        <div className="hidden md:flex flex-col gap-1 w-64 flex-shrink-0">
          {THESIS_TEMPLATES.map(template => {
            const iconConfig = templateIconConfig[template.type];
            const estimate = templateEstimates[template.type];
            return (
              <button
                key={template.type}
                onClick={() => {
                  // Already selected — do nothing (don't destroy data)
                  if (selectedTemplate === template.type) return;
                  if (selectedTemplate && currentDataCounts) {
                    setConfirmSwitch({ oldType: selectedTemplate, newType: template.type });
                  } else {
                    selectTemplate(template.type);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150",
                  selectedTemplate === template.type
                    ? "bg-primary/8 border-l-[3px] border-l-primary pl-[10px]"
                    : "hover:bg-accent border-l-[3px] border-l-transparent"
                )}
              >
                <iconConfig.Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-[11px] text-muted-foreground">{estimate.pages} pages</p>
                </div>
                {selectedTemplate === template.type && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="ml-auto flex-shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Preview panel with AnimatePresence crossfade */}
        <div className="flex-1 bg-muted/20 rounded-2xl p-6 border border-border min-h-[320px]">
          {currentTemplate ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTemplate}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Template name and badge */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {(() => {
                      const iconConfig = templateIconConfig[currentTemplate.type];
                      return <iconConfig.Icon className="w-5 h-5 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{currentTemplate.name}</h3>
                    <p className="text-xs text-muted-foreground">{templateIconConfig[currentTemplate.type].label}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentTemplate.description}
                </p>

                {/* Format defaults as tags */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground tabular-nums">
                    {currentTemplate.defaultOptions.fontSize}
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground tabular-nums">
                    {currentTemplate.defaultOptions.lineSpacing === "onehalf"
                      ? "1.5"
                      : currentTemplate.defaultOptions.lineSpacing}{" "}
                    spacing
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    {currentTemplate.defaultOptions.citationStyle?.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground tabular-nums">
                    {currentTemplate.defaultOptions.paperSize === "a4paper"
                      ? "A4"
                      : "Letter"}
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-mono">
                    {docClassLabels[currentTemplate.type]}
                  </span>
                </div>

                {/* Chapter structure list */}
                <div>
                  <p className="tf-field-label mb-2">Chapter Structure</p>
                  <ul className="space-y-1">
                    {chapterStructureLabels[currentTemplate.type]?.map((ch, idx) => (
                      <li key={ch} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="w-5 h-5 rounded bg-primary/8 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                          {idx + 1}
                        </span>
                        {ch}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    {templateEstimates[currentTemplate.type].chapters} chapters
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    {templateEstimates[currentTemplate.type].pages} pages
                  </span>
                </div>

                {/* Best for */}
                <p className="text-xs text-muted-foreground/70 italic">
                  {bestForLabels[currentTemplate.type]}
                </p>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="tf-empty h-full min-h-[280px]">
              <div className="tf-empty__icon-wrap">
                <Sparkles className="tf-empty__icon w-5 h-5" />
              </div>
              <p className="tf-empty__title">Select a template to see its preview</p>
              <p className="tf-empty__desc">Each template comes with pre-configured structure and formatting.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* WHY: Confirmation dialog when switching to a different template with existing data */}
      <Dialog open={!!confirmSwitch} onOpenChange={(open) => !open && setConfirmSwitch(null)}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden gap-0 border-border/40 shadow-xl">
          {/* Amber gradient accent bar — signals caution (template switch) */}
          <div
            className="h-1 w-full"
            style={{
              background: 'linear-gradient(90deg, oklch(0.795 0.184 86), oklch(0.655 0.215 41))',
            }}
          />

          {/* Header section with icon container + title */}
          <div className="px-6 pt-5 pb-2">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[oklch(0.795_0.184_86/0.1)] border border-[oklch(0.795_0.184_86/0.15)] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[oklch(0.655_0.215_41)]" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold text-foreground leading-snug">
                    Switch Template?
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="sr-only">
                Confirm switching to a different thesis template
              </DialogDescription>
              <p className="text-[13px] text-muted-foreground leading-relaxed pl-[52px]">
                Switching from{" "}
                <span className="font-medium text-foreground/80">
                  {THESIS_TEMPLATES.find(t => t.type === confirmSwitch?.oldType)?.name}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground/80">
                  {THESIS_TEMPLATES.find(t => t.type === confirmSwitch?.newType)?.name}
                </span>{" "}
                will reset some data.
              </p>
            </DialogHeader>
          </div>

          {/* Preserved vs Reset info cards */}
          <div className="px-6 pt-4 pb-2 space-y-2.5">
            {/* WHY: Show what will be preserved vs reset so user can make an informed decision */}
            <div className="rounded-xl border border-[oklch(0.722_0.19_149/0.2)] bg-[oklch(0.722_0.19_149/0.06)] p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md bg-[oklch(0.722_0.19_149/0.15)] flex items-center justify-center">
                  <Check className="w-3 h-3 text-[oklch(0.522_0.177_149)]" />
                </div>
                <p className="text-xs font-semibold text-[oklch(0.522_0.177_149)]">
                  Preserved
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[oklch(0.722_0.19_149/0.4)] shrink-0" />
                  Title{thesis?.metadata.title ? <span className="text-foreground/60">: &ldquo;{thesis.metadata.title.slice(0, 40)}{thesis.metadata.title.length > 40 ? '...' : ''}&rdquo;</span> : ''}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[oklch(0.722_0.19_149/0.4)] shrink-0" />
                  Author{thesis?.metadata.author ? <span className="text-foreground/60">: &ldquo;{thesis.metadata.author}&rdquo;</span> : ''}
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-destructive/15 bg-destructive/5 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                </div>
                <p className="text-xs font-semibold text-destructive">
                  Will be Reset
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {currentDataCounts && currentDataCounts.chapters > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-destructive/30 shrink-0" />
                    Chapters ({currentDataCounts.chapters})
                  </li>
                )}
                {currentDataCounts && currentDataCounts.references > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-destructive/30 shrink-0" />
                    References ({currentDataCounts.references})
                  </li>
                )}
                {currentDataCounts?.hasAbstract && (
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-destructive/30 shrink-0" />
                    Abstract
                  </li>
                )}
                {currentDataCounts?.hasKeywords && (
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-destructive/30 shrink-0" />
                    Keywords ({thesis?.keywords.length})
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-destructive/30 shrink-0" />
                  Format options
                </li>
              </ul>
            </div>
          </div>

          {/* Action buttons — full-width, stacked */}
          <div className="px-6 pb-6 pt-3 space-y-2.5">
            <Button
              size="lg"
              onClick={() => {
                if (confirmSwitch) {
                  selectTemplate(confirmSwitch.newType as ThesisType);
                  setConfirmSwitch(null);
                }
              }}
              className="w-full h-12 rounded-xl text-sm font-semibold gap-2.5 border-0 hover:shadow-lg hover:shadow-[oklch(0.50_0.22_264/0.2)] active:scale-[0.98] transition-all duration-200 text-white"
              style={{
                background: 'linear-gradient(135deg, oklch(0.50 0.22 264), oklch(0.55 0.20 280))',
              }}
            >
              Switch to {THESIS_TEMPLATES.find(t => t.type === confirmSwitch?.newType)?.name}
              <ArrowRight className="w-4 h-4 ml-auto opacity-60" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setConfirmSwitch(null)}
              className="w-full h-11 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all duration-200"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
