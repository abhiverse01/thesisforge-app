"use client";

import React, { useState } from "react";
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
  GraduationCap,
  Building2,
  ScrollText,
  FileText,
  Check,
  Sparkles,
  ChevronDown,
  Star,
  BookOpen,
  Layers,
  CircleDot,
  Hexagon,
  Square,
  type LucideIcon,
} from "lucide-react";

// Template icon shapes — each template gets a distinctive icon + wrapper shape
const templateIconConfig: Record<
  string,
  { Icon: LucideIcon; Wrapper: LucideIcon; label: string }
> = {
  bachelor: { Icon: GraduationCap, Wrapper: CircleDot, label: "Undergraduate" },
  master: { Icon: Building2, Wrapper: Hexagon, label: "Graduate" },
  phd: { Icon: ScrollText, Wrapper: Square, label: "Doctoral" },
  report: { Icon: FileText, Wrapper: Layers, label: "Technical" },
};

const templateColors: Record<string, string> = {
  bachelor: "blue",
  master: "violet",
  phd: "amber",
  report: "emerald",
};

const templateGradients: Record<string, string> = {
  bachelor: "from-blue-500/8 to-sky-500/5 border-blue-500/20 hover:border-blue-500/40",
  master: "from-violet-500/8 to-purple-500/5 border-violet-500/20 hover:border-violet-500/40",
  phd: "from-amber-500/8 to-orange-500/5 border-amber-500/20 hover:border-amber-500/40",
  report: "from-emerald-500/8 to-teal-500/5 border-emerald-500/20 hover:border-emerald-500/40",
};

const templateIconBg: Record<string, string> = {
  bachelor: "bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-blue-500/20 shadow-md",
  master: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/20 shadow-md",
  phd: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-500/20 shadow-md",
  report: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/20 shadow-md",
};

const templateBadgeColors: Record<string, string> = {
  bachelor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  master: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  phd: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  report: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const templateGlowColors: Record<string, string> = {
  bachelor: "ring-blue-500/25 shadow-blue-500/8",
  master: "ring-violet-500/25 shadow-violet-500/8",
  phd: "ring-amber-500/25 shadow-amber-500/8",
  report: "ring-emerald-500/25 shadow-emerald-500/8",
};

// Estimated page ranges per template type
const templateEstimates: Record<string, { chapters: number; pages: string }> = {
  bachelor: { chapters: 5, pages: "40 - 60" },
  master: { chapters: 6, pages: "60 - 100" },
  phd: { chapters: 7, pages: "100 - 200" },
  report: { chapters: 3, pages: "15 - 30" },
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
};

export function TemplateSelector() {
  const { selectTemplate, selectedTemplate } = useThesisStore();
  const [featuresOpen, setFeaturesOpen] = useState<string | null>(null);
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
          Choose Your Template
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
          Each template is pre-configured for its academic level with the right
          formatting, structure, and citation style. Pick one to get started.
        </p>
      </motion.div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto">
        {THESIS_TEMPLATES.map((template, index) => {
          const iconConfig = templateIconConfig[template.type];
          const isSelected = selectedTemplate === template.type;
          const isHovered = hoveredType === template.type;
          const estimate = templateEstimates[template.type];
          const isMaster = template.type === "master";
          const isFeaturesOpen = featuresOpen === template.type;

          return (
            <motion.div
              key={template.type}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              onMouseEnter={() => setHoveredType(template.type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <Card
                onClick={() => selectTemplate(template.type)}
                className={cn(
                  "cursor-pointer transition-all duration-300 group relative overflow-hidden border-2 min-h-[180px]",
                  "hover:shadow-lg hover:scale-[1.01]",
                  isSelected
                    ? cn(
                        "ring-2 shadow-lg",
                        templateGlowColors[template.type]
                      )
                    : cn(
                        templateGradients[template.type]
                      )
                )}
              >
                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon with distinctive gradient background */}
                      <motion.div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                          templateIconBg[template.type]
                        )}
                        animate={
                          isHovered && !isSelected
                            ? { scale: 1.08 }
                            : { scale: 1 }
                        }
                        transition={{ duration: 0.2 }}
                      >
                        <iconConfig.Icon className="w-6 h-6" />
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
                            {iconConfig.label}
                          </Badge>
                          {isMaster && (
                            <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 font-semibold gap-0.5">
                              <Star className="w-2.5 h-2.5" />
                              Popular
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selection indicator — clean check badge */}
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
                        >
                          <div className="flex items-center justify-center">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check
                                  className="w-3 h-3 text-primary-foreground"
                                  strokeWidth={3}
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-primary">
                                Selected
                              </span>
                            </div>
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

                  {/* Quick config stats */}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-3 text-[10px] font-medium text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {template.defaultOptions.fontSize}
                    </span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {template.defaultOptions.lineSpacing === "onehalf"
                        ? "1.5"
                        : template.defaultOptions.lineSpacing}{" "}
                      spacing
                    </span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {template.defaultOptions.citationStyle?.toUpperCase()}
                    </span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {template.defaultOptions.paperSize === "a4paper"
                        ? "A4"
                        : "Letter"}
                    </span>
                  </div>

                  {/* Bottom row: estimated chapters + pages + expandable features */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Layers className="w-3 h-3" />
                      <span>{estimate.chapters} chapters</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      <span>{estimate.pages} pages</span>
                    </div>

                    {/* Expandable features toggle */}
                    <Collapsible
                      open={isFeaturesOpen}
                      onOpenChange={(open) =>
                        setFeaturesOpen(open ? template.type : null)
                      }
                      className="ml-auto"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "flex items-center gap-1 text-[10px] font-medium transition-colors",
                            isFeaturesOpen
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {isFeaturesOpen ? "Less" : "Features"}
                          <motion.div
                            animate={{ rotate: isFeaturesOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </motion.div>
                        </button>
                      </CollapsibleTrigger>

                      <AnimatePresence>
                        {isFeaturesOpen && (
                          <CollapsibleContent forceMount asChild>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ul className="mt-2 space-y-1">
                                {featureLabels[template.type].map(
                                  (feature) => (
                                    <li
                                      key={feature}
                                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                                    >
                                      <Check className="w-2.5 h-2.5 text-primary/60 flex-shrink-0" />
                                      {feature}
                                    </li>
                                  )
                                )}
                              </ul>
                            </motion.div>
                          </CollapsibleContent>
                        )}
                      </AnimatePresence>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
