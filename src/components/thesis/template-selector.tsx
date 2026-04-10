"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { THESIS_TEMPLATES, WIZARD_STEPS } from "@/lib/thesis-types";
import { useThesisStore } from "@/lib/thesis-store";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  Building2,
  ScrollText,
  FileText,
  Check,
  Sparkles,
  Zap,
  ChevronDown,
  Star,
  BookOpen,
  Layers,
} from "lucide-react";

const templateIcons: Record<string, React.ElementType> = {
  bachelor: GraduationCap,
  master: Building2,
  phd: ScrollText,
  report: FileText,
};

const templateGradients: Record<string, string> = {
  bachelor: "from-blue-500/8 to-sky-500/5 border-blue-500/20 hover:border-blue-500/40",
  master: "from-violet-500/8 to-purple-500/5 border-violet-500/20 hover:border-violet-500/40",
  phd: "from-amber-500/8 to-orange-500/5 border-amber-500/20 hover:border-amber-500/40",
  report: "from-emerald-500/8 to-teal-500/5 border-emerald-500/20 hover:border-emerald-500/40",
};

const templateIconBg: Record<string, string> = {
  bachelor: "bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-blue-500/25 shadow-lg",
  master: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/25 shadow-lg",
  phd: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-500/25 shadow-lg",
  report: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/25 shadow-lg",
};

const templateBadgeColors: Record<string, string> = {
  bachelor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  master: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  phd: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  report: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const templateGlowColors: Record<string, string> = {
  bachelor: "ring-blue-500/30 shadow-blue-500/10",
  master: "ring-violet-500/30 shadow-violet-500/10",
  phd: "ring-amber-500/30 shadow-amber-500/10",
  report: "ring-emerald-500/30 shadow-emerald-500/10",
};

// Estimated page ranges per template type
const templateEstimates: Record<string, { chapters: number; pages: string }> = {
  bachelor: { chapters: 5, pages: "40–60" },
  master: { chapters: 6, pages: "60–100" },
  phd: { chapters: 7, pages: "100–200" },
  report: { chapters: 3, pages: "15–30" },
};

// Comparison rows for the comparison table
const comparisonRows: { label: string; key: string }[] = [
  { label: "Font Size", key: "fontSize" },
  { label: "Line Spacing", key: "lineSpacing" },
  { label: "Citation Style", key: "citationStyle" },
  { label: "Paper Size", key: "paperSize" },
  { label: "Margins", key: "marginSize" },
  { label: "Fig. Numbering", key: "figureNumbering" },
  { label: "ToC Depth", key: "tocDepth" },
  { label: "Dedication", key: "includeDedication" },
  { label: "Appendix", key: "includeAppendices" },
  { label: "Glossary", key: "includeGlossary" },
  { label: "Code Listings", key: "includeListings" },
];

function formatOptionValue(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "✓ Yes" : "✗ No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const labelMap: Record<string, string> = {
      single: "Single",
      onehalf: "1.5 Lines",
      double: "Double",
      normal: "Normal",
      narrow: "Narrow",
      wide: "Wide",
      "per-chapter": "Per Chapter",
      continuous: "Continuous",
      a4paper: "A4",
      letterpaper: "US Letter",
    };
    return labelMap[value] || value.toUpperCase();
  }
  return String(value);
}

// Shine effect component for selected card
function ShineEffect() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{
          translateX: ["-100%", "100%"],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 3,
        }}
      >
        <div
          className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          style={{
            transform: "skewX(-15deg)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export function TemplateSelector() {
  const { selectTemplate, selectedTemplate } = useThesisStore();
  const [compareOpen, setCompareOpen] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Step {WIZARD_STEPS[0].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Choose Your Thesis Template
        </h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          Select a thesis type that matches your academic requirements. Each
          template comes with a pre-configured structure optimized for its
          purpose.
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Zap className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Your progress auto-saves locally — come back anytime
          </span>
        </div>
      </motion.div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto">
        {THESIS_TEMPLATES.map((template, index) => {
          const Icon = templateIcons[template.type];
          const isSelected = selectedTemplate === template.type;
          const isHovered = hoveredType === template.type;
          const estimate = templateEstimates[template.type];
          const isMaster = template.type === "master";

          return (
            <motion.div
              key={template.type}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              onMouseEnter={() => setHoveredType(template.type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <Card
                onClick={() => selectTemplate(template.type)}
                className={cn(
                  "cursor-pointer transition-all duration-300 group relative overflow-hidden border-2",
                  "hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01]",
                  isSelected
                    ? cn(
                        "ring-2 shadow-xl surface-3",
                        templateGlowColors[template.type]
                      )
                    : cn(
                        "surface-1 hover:surface-2",
                        templateGradients[template.type]
                      )
                )}
              >
                {/* Gradient hover background */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${
                      template.type === "bachelor"
                        ? "oklch(0.488 0.217 264 / 0.04)"
                        : template.type === "master"
                          ? "oklch(0.541 0.281 293 / 0.04)"
                          : template.type === "phd"
                            ? "oklch(0.669 0.179 56 / 0.04)"
                            : "oklch(0.696 0.17 162 / 0.04)"
                    }, transparent 70%)`,
                  }}
                />

                {/* Shine effect on selected card */}
                <AnimatePresence>
                  {isSelected && <ShineEffect />}
                </AnimatePresence>

                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Larger icon with gradient background */}
                      <motion.div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                          templateIconBg[template.type],
                          isHovered && !isSelected && "scale-110 shadow-2xl"
                        )}
                        animate={
                          isSelected
                            ? { scale: [1, 1.08, 1] }
                            : isHovered
                              ? { scale: 1.08 }
                              : { scale: 1 }
                        }
                        transition={
                          isSelected
                            ? {
                                duration: 0.6,
                                repeat: Infinity,
                                repeatDelay: 2,
                              }
                            : { duration: 0.2 }
                        }
                      >
                        <Icon className="w-6 h-6" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] font-medium",
                              templateBadgeColors[template.type]
                            )}
                          >
                            {template.defaultStructure.chapterCount} chapters
                            {template.defaultStructure.hasAppendix
                              ? " + appendix"
                              : ""}
                          </Badge>
                          {isMaster && (
                            <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 font-semibold gap-0.5">
                              <Star className="w-2.5 h-2.5" />
                              Most Popular
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selected checkmark badge */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                          }}
                          className="flex items-center justify-center"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                            <Check
                              className="w-4 h-4 text-primary-foreground"
                              strokeWidth={3}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardHeader>

                <CardContent className="relative">
                  <CardDescription className="text-sm leading-relaxed">
                    {template.description}
                  </CardDescription>

                  {/* Quick config stats — compact row */}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-3 text-[10px] font-medium text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {template.defaultOptions.fontSize}
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {template.defaultOptions.lineSpacing === "onehalf"
                        ? "1.5"
                        : template.defaultOptions.lineSpacing}{" "}
                      spacing
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {template.defaultOptions.citationStyle?.toUpperCase()}
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {template.defaultOptions.paperSize === "a4paper"
                        ? "A4"
                        : "US Letter"}
                    </span>
                  </div>

                  {/* Preview indicator — chapter count and estimated pages */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Layers className="w-3 h-3" />
                      <span>
                        {estimate.chapters} chapters in template
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      <span>Est. {estimate.pages} pages</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Compare Templates — Collapsible comparison table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <Collapsible open={compareOpen} onOpenChange={setCompareOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg",
                "text-sm font-medium text-muted-foreground transition-all duration-200",
                "hover:text-foreground hover:bg-muted/60",
                "border border-dashed border-border hover:border-border"
              )}
            >
              <motion.div
                animate={{ rotate: compareOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
              {compareOpen ? "Hide" : "Show"} Template Comparison
            </button>
          </CollapsibleTrigger>

          <AnimatePresence>
            {compareOpen && (
              <CollapsibleContent forceMount asChild>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <Card className="mt-4 surface-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">
                        Template Comparison
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Side-by-side overview of default settings for each
                        template type
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto -mx-1">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold text-xs sticky left-0 bg-card min-w-[120px]">
                                Setting
                              </TableHead>
                              {THESIS_TEMPLATES.map((t) => (
                                <TableHead
                                  key={t.type}
                                  className={cn(
                                    "text-center text-xs font-semibold min-w-[110px]",
                                    selectedTemplate === t.type &&
                                      "text-primary"
                                  )}
                                >
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span>{t.name}</span>
                                    {selectedTemplate === t.type && (
                                      <Badge className="text-[8px] px-1.5 py-0 h-4">
                                        Selected
                                      </Badge>
                                    )}
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comparisonRows.map((row) => (
                              <TableRow key={row.key}>
                                <TableCell className="text-xs font-medium sticky left-0 bg-card">
                                  {row.label}
                                </TableCell>
                                {THESIS_TEMPLATES.map((t) => {
                                  const val =
                                    t.defaultOptions[
                                      row.key as keyof typeof t.defaultOptions
                                    ];
                                  const isSelected =
                                    selectedTemplate === t.type;
                                  return (
                                    <TableCell
                                      key={t.type}
                                      className={cn(
                                        "text-center text-[11px] tabular-nums",
                                        isSelected &&
                                          "bg-primary/5 font-medium"
                                      )}
                                    >
                                      {formatOptionValue(row.key, val)}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                            {/* Estimated pages row */}
                            <TableRow>
                              <TableCell className="text-xs font-medium sticky left-0 bg-card">
                                Est. Pages
                              </TableCell>
                              {THESIS_TEMPLATES.map((t) => (
                                <TableCell
                                  key={t.type}
                                  className={cn(
                                    "text-center text-[11px] font-medium",
                                    selectedTemplate === t.type &&
                                      "bg-primary/5 text-primary"
                                  )}
                                >
                                  {templateEstimates[t.type].pages}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </motion.div>
    </div>
  );
}
