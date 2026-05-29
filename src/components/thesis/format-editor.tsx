"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { fadeVariants, fadeTransition } from "@/components/thesis/wizard/constants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  Heart,
  MessageSquareHeart,
  Info,
  Type,
  FileText,
  AlignJustify,
  Maximize2,
  Quote,
  Hash,
  BookOpen,
  BookMarked,
  Code,
  Eye,
  Layers,
  Settings2,
  ToggleLeft,
  Sparkles,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ============================================================
// Section icon mapping
// ============================================================
const SECTION_ICONS: Record<string, React.ElementType> = {
  typography: Type,
  "page-layout": Maximize2,
  citations: Quote,
  numbering: Hash,
  features: BookOpen,
};

// ============================================================
// Citation style visual metadata
// ============================================================
const CITATION_META: Record<string, { l: number; c: number; h: number; label: string }> = {
  apa: { l: 0.50, c: 0.22, h: 264, label: "APA" },
  ieee: { l: 0.55, c: 0.18, h: 155, label: "IEEE" },
  vancouver: { l: 0.62, c: 0.16, h: 230, label: "Vancouver" },
  chicago: { l: 0.55, c: 0.20, h: 42, label: "Chicago" },
  harvard: { l: 0.60, c: 0.18, h: 305, label: "Harvard" },
};

// ============================================================
// Citation example strings
// ============================================================
const CITATION_EXAMPLES: Record<string, { inText: string; fullRef: string }> = {
  apa: {
    inText: "(Smith, 2024, p. 15)",
    fullRef: 'Smith, J. A. (2024). Title of paper. Journal of Abbreviation, 1(1), 1-10.',
  },
  ieee: {
    inText: "[1]",
    fullRef: '[1] J. Smith, "Title of Paper," J. Abbrev., vol. 1, no. 1, pp. 1-10, 2024.',
  },
  vancouver: {
    inText: "[1]",
    fullRef: "Smith J. Title of paper. J Abbrev. 2024;1(1):1-10.",
  },
  chicago: {
    inText: "(Smith 2024, 15)",
    fullRef: 'Smith, John. "Title of Paper." Journal Abbreviation 1, no. 1 (2024): 1-10.',
  },
  harvard: {
    inText: "(Smith, 2024)",
    fullRef: "Smith, J. (2024) 'Title of paper', Journal Abbreviation, 1(1), pp. 1-10.",
  },
};

// ============================================================
// Toggle option visual metadata
// ============================================================
const TOGGLE_ICONS: Record<string, React.ElementType> = {
  includeDedication: Heart,
  includeAcknowledgment: MessageSquareHeart,
  includeAppendices: Layers,
  includeListings: FileCode2,
  includeGlossary: BookMarked,
};

// ============================================================
// Format section definitions
// ============================================================
interface FormatOptionDef {
  key: string;
  label: string;
  tooltip: string;
  latexCommand?: string;
  icon: React.ElementType;
}

const FORMAT_SECTIONS: {
  id: string;
  title: string;
  options: FormatOptionDef[];
}[] = [
  {
    id: "typography",
    title: "Typography",
    options: [
      {
        key: "fontSize",
        label: "Font Size",
        tooltip: "Base font size for the document. 12pt is standard for most theses. LaTeX command: \\documentclass[12pt,...]",
        latexCommand: "\\documentclass[{fontSize},...]{report}",
        icon: Type,
      },
      {
        key: "lineSpacing",
        label: "Line Spacing",
        tooltip: "onehalf is standard for theses. double is common for PhD dissertations. Uses the setspace package.",
        latexCommand: "\\onehalfspacing / \\doublespacing",
        icon: AlignJustify,
      },
      {
        key: "paperSize",
        label: "Paper Size",
        tooltip: "Standard paper size. A4 is used worldwide; Letter is standard in North America.",
        latexCommand: "\\documentclass[...,{paperSize}]{report}",
        icon: FileText,
      },
    ],
  },
  {
    id: "page-layout",
    title: "Page Layout",
    options: [
      {
        key: "marginSize",
        label: "Margins",
        tooltip: "Page margins via geometry package. Normal = 1in, Narrow = 0.75in, Wide = 1.25in.",
        latexCommand: "\\usepackage[{marginSize}]{geometry}",
        icon: Maximize2,
      },
    ],
  },
  {
    id: "citations",
    title: "Citations",
    options: [
      {
        key: "citationStyle",
        label: "Citation Style",
        tooltip: "Bibliography style for reference formatting. plainnat is the most common with natbib.",
        latexCommand: "\\bibliographystyle{citationStyle}",
        icon: Quote,
      },
    ],
  },
  {
    id: "numbering",
    title: "Numbering",
    options: [
      {
        key: "figureNumbering",
        label: "Figure Numbering",
        tooltip: "per-chapter: Figure 2.3. continuous: Figure 5. Uses chngcntr package.",
        latexCommand: "\\counterwithin{figure}{chapter}",
        icon: Hash,
      },
      {
        key: "tableNumbering",
        label: "Table Numbering",
        tooltip: "per-chapter: Table 3.1. continuous: Table 7. Uses chngcntr package.",
        latexCommand: "\\counterwithin{table}{chapter}",
        icon: Hash,
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    options: [
      {
        key: "tocDepth",
        label: "TOC Depth",
        tooltip: "Maximum heading level shown in Table of Contents. 3 = chapters + sections + subsections.",
        latexCommand: "\\setcounter{tocdepth}{tocDepth}",
        icon: BookOpen,
      },
    ],
  },
];

const TOGGLE_OPTIONS = [
  {
    key: "includeDedication",
    label: "Dedication Page",
    description: "Adds a dedication page after the title page.",
    tooltip: "Adds a dedication page after the title page. The text is centered vertically.",
    latexCommand: "\\begin{dedication}...",
  },
  {
    key: "includeAcknowledgment",
    label: "Acknowledgments",
    description: "Adds an acknowledgments section in the front matter.",
    tooltip: "Adds an acknowledgments section in the front matter with a TOC entry.",
    latexCommand: "\\chapter*{Acknowledgments}",
  },
  {
    key: "includeAppendices",
    label: "Appendices",
    description: "Enables appendix section after the bibliography.",
    tooltip: "Enables the appendix section after the bibliography. Uses \\appendix command.",
    latexCommand: "\\appendix \\chapter{...}",
  },
  {
    key: "includeListings",
    label: "Code Listings",
    description: "Adds listings package with syntax highlighting.",
    tooltip: "Adds the listings package with pre-configured syntax highlighting settings.",
    latexCommand: "\\usepackage{listings} \\lstset{...}",
  },
  {
    key: "includeGlossary",
    label: "Glossary",
    description: "Adds glossary support using glossaries package.",
    tooltip: "Adds glossary support using the glossaries package. Useful for PhD theses.",
    latexCommand: "\\usepackage{glossaries}",
  },
];

// ============================================================
// TOC depth labels
// ============================================================
const TOC_DEPTH_LABELS: Record<number, string> = {
  1: "Chapters only",
  2: "Chapters + Sections",
  3: "Chapters + Sections + Subsections",
  4: "All heading levels",
};

// ============================================================
// FormatEditor Component
// ============================================================
export function FormatEditor() {
  const thesis = useThesisStore((s) => s.thesis);
  const updateOptions = useThesisStore((s) => s.updateOptions);
  const selectedTemplate = useThesisStore((s) => s.selectedTemplate);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const preamblePreview = useMemo(() => {
    const opts = thesis?.options;
    if (!opts) return "";
    const lines = [
      `\\documentclass[${opts.fontSize},${opts.paperSize}]{report}`,
      `\\usepackage[${opts.marginSize}]{geometry}`,
    ];
    if (opts.lineSpacing === "onehalf") lines.push("\\usepackage{setspace}");
    else if (opts.lineSpacing === "double") lines.push("\\usepackage{setspace}");
    lines.push(`\\bibliographystyle{${opts.citationStyle}}`);
    if (opts.lineSpacing === "onehalf") lines.push("\\onehalfspacing");
    else if (opts.lineSpacing === "double") lines.push("\\doublespacing");
    if (opts.figureNumbering === "per-chapter")
      lines.push("\\usepackage{chngcntr} \\counterwithin{figure}{chapter}");
    if (opts.tableNumbering === "per-chapter")
      lines.push("\\counterwithin{table}{chapter}");
    lines.push(`\\setcounter{tocdepth}{${opts.tocDepth}}`);
    if (opts.includeListings) lines.push("\\usepackage{listings}");
    if (opts.includeGlossary) lines.push("\\usepackage{glossaries} \\makeglossaries");
    return lines.join("\n");
  }, [thesis?.options]);

  if (!thesis) return null;

  const options = thesis.options;

  const handleChange = (key: string, value: string | number | boolean) => {
    updateOptions({ [key]: value });
  };

  const handleToggle = (key: string, checked: boolean, label: string) => {
    updateOptions({ [key]: checked });
    toast.info(checked ? "Enabled" : "Disabled", {
      description: label,
      duration: 1500,
    });
  };

  // A4 preview calculations
  const paperSize = options.paperSize || "a4paper";
  const marginSize = options.marginSize || "normal";
  const marginPx = marginSize === "narrow" ? 6 : marginSize === "wide" ? 12 : 8;
  const lineCount =
    options.lineSpacing === "double"
      ? 18
      : options.lineSpacing === "onehalf"
        ? 24
        : 32;

  // Active toggle count for summary
  const activeToggleCount = TOGGLE_OPTIONS.filter(
    (opt) => options[opt.key as keyof typeof options] as boolean
  ).length;

  return (
    <motion.div
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={fadeTransition}
      className="space-y-5"
    >
      {/* ── Step Header ── */}
      <div className="flex items-start justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="tf-micro-label mb-2">
            Step {5} of {WIZARD_STEPS.length}
          </p>
          <h1 className="tf-heading mb-3">Format Your Thesis</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            Configure typography, layout, citations, and document options. Changes are
            reflected in the LaTeX preamble preview below.
          </p>
        </motion.div>

        {/* A4 Preview Card */}
        <div
          className="w-28 h-40 rounded-xl border border-border/50 bg-muted/20 flex-shrink-0 p-3 relative overflow-hidden hidden sm:flex flex-col items-center justify-center gap-2 shadow-sm"
          aria-label={`Document preview: ${paperSize === "a4paper" ? "A4" : "US Letter"} paper, ${marginSize} margins`}
        >
          {/* Paper outline */}
          <div
            className="absolute inset-0 border-[3px] border-primary/15 rounded-lg"
            style={{
              margin: marginPx,
              transition: "margin 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
          {/* Fake text lines */}
          <div className="relative z-10 w-full">
            <div className="h-1.5 w-3/4 bg-foreground/10 rounded-full mb-1.5 mx-auto" />
            {Array.from({ length: Math.min(lineCount, 14) }).map((_, i) => (
              <div
                key={i}
                className="h-px bg-foreground/12 mb-1 rounded"
                style={{
                  width: i === lineCount - 1 ? "60%" : "100%",
                  marginLeft: i === lineCount - 1 ? "auto" : undefined,
                  marginRight: i === lineCount - 1 ? "auto" : undefined,
                }}
              />
            ))}
          </div>
          {/* Label */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
            <span className="text-[8px] font-mono font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {paperSize === "a4paper" ? "A4" : "Letter"}
            </span>
            <span className="text-[8px] font-mono text-muted-foreground/40">
              {marginSize}
            </span>
          </div>
        </div>
      </div>

      {/* ── Format Setting Cards ── */}
      <div className="space-y-3">
        {FORMAT_SECTIONS.map((section, sIdx) => {
          const SectionIcon = SECTION_ICONS[section.id] ?? Settings2;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: sIdx * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="tf-card"
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/12 flex items-center justify-center shrink-0">
                  <SectionIcon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground tracking-tight">
                  {section.title}
                </p>
              </div>

              {/* Options */}
              <div className="px-5 pb-4 pt-1 space-y-0.5">
                {section.options.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <div
                      key={opt.key}
                      className="flex items-center justify-between gap-3 min-h-[48px] py-1.5 rounded-lg transition-colors duration-150 hover:bg-muted/40"
                    >
                      {/* Label + Icon + Tooltip */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                          <OptIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <Label
                          htmlFor={opt.key}
                          className="text-[13px] font-medium text-foreground cursor-pointer"
                        >
                          {opt.label}
                        </Label>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors duration-150 active:scale-[0.92]"
                                aria-label={`More info about ${opt.label}`}
                              >
                                <Info className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[300px] rounded-xl"
                            >
                              <p className="text-xs leading-relaxed text-popover-foreground">
                                {opt.tooltip}
                              </p>
                              {opt.latexCommand && (
                                <code className="mt-2 block text-[11px] font-mono bg-muted px-2.5 py-1 rounded-lg text-muted-foreground">
                                  {opt.latexCommand.replace(
                                    `{${opt.key}}`,
                                    `{${options[opt.key as keyof typeof options]}}`
                                  )}
                                </code>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Control */}
                      <div className="shrink-0 w-44">
                        {opt.key === "tocDepth" ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground leading-snug">
                                {TOC_DEPTH_LABELS[options.tocDepth] ??
                                  "All levels"}
                              </span>
                              <span className="text-xs font-bold tabular-nums text-primary">
                                {options.tocDepth}
                              </span>
                            </div>
                            <Slider
                              value={[options.tocDepth]}
                              onValueChange={(v) =>
                                handleChange("tocDepth", v[0])
                              }
                              min={1}
                              max={4}
                              step={1}
                              className="w-full"
                              aria-label="Table of contents depth"
                            />
                          </div>
                        ) : (
                          <Select
                            value={String(
                              options[opt.key as keyof typeof options]
                            )}
                            onValueChange={(v) => handleChange(opt.key, v)}
                          >
                            <SelectTrigger
                              id={opt.key}
                              className="h-11 text-[13px] rounded-lg border-border/50 focus:ring-2 focus:ring-ring/20"
                              aria-label={`${opt.label}: ${options[opt.key as keyof typeof options]}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {opt.key === "fontSize" &&
                                ["10pt", "11pt", "12pt"].map((v) => (
                                  <SelectItem
                                    key={v}
                                    value={v}
                                    className="text-[13px] rounded-lg"
                                  >
                                    {v}
                                  </SelectItem>
                                ))}
                              {opt.key === "paperSize" &&
                                ["a4paper", "letterpaper"].map((v) => (
                                  <SelectItem
                                    key={v}
                                    value={v}
                                    className="text-[13px] rounded-lg"
                                  >
                                    {v === "a4paper"
                                      ? "A4 (International)"
                                      : "US Letter"}
                                  </SelectItem>
                                ))}
                              {opt.key === "lineSpacing" &&
                                [
                                  { val: "single", label: "Single" },
                                  { val: "onehalf", label: "1.5 Lines" },
                                  { val: "double", label: "Double" },
                                ].map(({ val, label }) => (
                                  <SelectItem
                                    key={val}
                                    value={val}
                                    className="text-[13px] rounded-lg"
                                  >
                                    {label}
                                  </SelectItem>
                                ))}
                              {opt.key === "marginSize" &&
                                [
                                  { val: "narrow", label: "Narrow (0.75in)" },
                                  { val: "normal", label: "Normal (1in)" },
                                  { val: "wide", label: "Wide (1.25in)" },
                                ].map(({ val, label }) => (
                                  <SelectItem
                                    key={val}
                                    value={val}
                                    className="text-[13px] rounded-lg"
                                  >
                                    {label}
                                  </SelectItem>
                                ))}
                              {opt.key === "citationStyle" &&
                                [
                                  { val: "apa", label: "APA" },
                                  { val: "ieee", label: "IEEE" },
                                  {
                                    val: "vancouver",
                                    label: "Vancouver",
                                  },
                                  {
                                    val: "chicago",
                                    label: "Chicago",
                                  },
                                  {
                                    val: "harvard",
                                    label: "Harvard",
                                  },
                                ].map(({ val, label }) => (
                                  <SelectItem
                                    key={val}
                                    value={val}
                                    className="text-[13px] rounded-lg"
                                  >
                                    {label}
                                  </SelectItem>
                                ))}
                              {opt.key === "figureNumbering" &&
                                [
                                  "continuous",
                                  "per-chapter",
                                ].map((v) => (
                                  <SelectItem
                                    key={v}
                                    value={v}
                                    className="text-[13px] rounded-lg"
                                  >
                                    {v === "continuous"
                                      ? "Continuous (Fig. 5)"
                                      : "Per Chapter (Fig. 2.3)"}
                                  </SelectItem>
                                ))}
                              {opt.key === "tableNumbering" &&
                                [
                                  "continuous",
                                  "per-chapter",
                                ].map((v) => (
                                  <SelectItem
                                    key={v}
                                    value={v}
                                    className="text-[13px] rounded-lg"
                                  >
                                    {v === "continuous"
                                      ? "Continuous (Table 7)"
                                      : "Per Chapter (Table 3.1)"}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Citation Style Example Preview ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.35,
          delay: FORMAT_SECTIONS.length * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="tf-card"
      >
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/12 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground tracking-tight">
            Citation Preview
          </p>
          <AnimatePresence mode="wait">
            <motion.span
              key={options.citationStyle}
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.2 }}
              className="tf-badge ml-auto"
              style={{
                background: (() => {
                  const m = CITATION_META[options.citationStyle];
                  return `oklch(${m?.l ?? 0.5} ${m?.c ?? 0.1} ${m?.h ?? 260} / 0.12)`;
                })(),
                color: (() => {
                  const m = CITATION_META[options.citationStyle];
                  return `oklch(${m?.l ?? 0.5} ${m?.c ?? 0.1} ${m?.h ?? 260})`;
                })(),
              }}
            >
              {CITATION_META[options.citationStyle]?.label ?? options.citationStyle.toUpperCase()}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="px-5 pb-4 pt-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={options.citationStyle}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              {/* In-text citation */}
              <div className="rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                  In-text Citation
                </p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {CITATION_EXAMPLES[options.citationStyle]?.inText ?? ""}
                </p>
              </div>
              {/* Full reference */}
              <div className="rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                  Full Reference
                </p>
                <p className="text-[12px] text-muted-foreground font-mono leading-relaxed">
                  {CITATION_EXAMPLES[options.citationStyle]?.fullRef ?? ""}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Document Sections Toggle Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.35,
          delay: (FORMAT_SECTIONS.length + 1) * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="tf-card"
      >
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/12 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground tracking-tight">
            Document Sections
          </p>
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground font-medium">
            {activeToggleCount} of {TOGGLE_OPTIONS.length} enabled
          </span>
        </div>
        <div className="px-5 pb-4 pt-1">
          <div className="space-y-0.5">
            {TOGGLE_OPTIONS.map((opt) => {
              const ToggleIcon =
                TOGGLE_ICONS[opt.key] ?? ToggleLeft;
              const isChecked = options[
                opt.key as keyof typeof options
              ] as boolean;
              return (
                <div
                  key={opt.key}
                  className={cn(
                    "flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl transition-all duration-200",
                    isChecked
                      ? "bg-primary/4"
                      : "hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200",
                        isChecked
                          ? "bg-primary/12 border border-primary/15"
                          : "bg-muted/60 border border-transparent"
                      )}
                    >
                      <ToggleIcon
                        className={cn(
                          "w-3.5 h-3.5 transition-colors duration-200",
                          isChecked
                            ? "text-primary"
                            : "text-muted-foreground/60"
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <Label
                        htmlFor={opt.key}
                        className="text-[13px] font-medium text-foreground cursor-pointer leading-tight"
                      >
                        {opt.label}
                      </Label>
                      <p className="text-[11px] text-muted-foreground/70 leading-snug mt-0.5 hidden sm:block">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors duration-150 active:scale-[0.92]"
                            aria-label={`More info about ${opt.label}`}
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-[260px] rounded-xl"
                        >
                          <p className="text-xs leading-relaxed text-popover-foreground">
                            {opt.tooltip}
                          </p>
                          <code className="mt-2 block text-[11px] font-mono bg-muted px-2.5 py-1 rounded-lg text-muted-foreground">
                            {opt.latexCommand}
                          </code>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Switch
                      id={opt.key}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleToggle(opt.key, checked, opt.label)
                      }
                      aria-label={`Toggle ${opt.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── LaTeX Preamble Preview ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.35,
          delay: (FORMAT_SECTIONS.length + 2) * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="tf-card"
      >
        <Collapsible
          open={showAdvanced}
          onOpenChange={setShowAdvanced}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 w-full px-5 py-4 text-left group transition-colors duration-150 hover:bg-muted/30 rounded-t-[calc(var(--radius)+8px)]"
              aria-expanded={showAdvanced}
              aria-label="Toggle LaTeX preamble preview"
            >
              <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center shrink-0 transition-colors duration-150 group-hover:border-primary/15">
                <Code className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  LaTeX Preamble Preview
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  Auto-generated from your format settings
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  showAdvanced && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <AnimatePresence initial={false}>
            {showAdvanced && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4">
                    <div className="tf-terminal rounded-lg">
                      <pre className="text-xs leading-relaxed">
                        <code>{preamblePreview}</code>
                      </pre>
                    </div>
                  </div>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </motion.div>
    </motion.div>
  );
}
