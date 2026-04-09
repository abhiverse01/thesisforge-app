"use client";

import React from "react";
import { motion } from "framer-motion";
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
  GraduationCap,
  Building2,
  ScrollText,
  FileText,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";

const templateIcons: Record<string, React.ElementType> = {
  bachelor: GraduationCap,
  master: Building2,
  phd: ScrollText,
  report: FileText,
};

const templateGradients: Record<string, string> = {
  bachelor: "from-blue-500/8 to-sky-500/5 border-blue-500/20 hover:border-blue-500/40",
  master: "from-indigo-500/8 to-violet-500/5 border-indigo-500/20 hover:border-indigo-500/40",
  phd: "from-amber-500/8 to-orange-500/5 border-amber-500/20 hover:border-amber-500/40",
  report: "from-emerald-500/8 to-teal-500/5 border-emerald-500/20 hover:border-emerald-500/40",
};

const templateIconBg: Record<string, string> = {
  bachelor: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  master: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
  phd: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  report: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
};

const templateBadgeColors: Record<string, string> = {
  bachelor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  master: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  phd: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  report: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export function TemplateSelector() {
  const { selectTemplate, selectedTemplate } = useThesisStore();

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
          Select a thesis type that matches your academic requirements.
          Each template comes with a pre-configured structure optimized for its purpose.
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Zap className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Your progress auto-saves locally — come back anytime
          </span>
        </div>
      </motion.div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {THESIS_TEMPLATES.map((template, index) => {
          const Icon = templateIcons[template.type];
          const isSelected = selectedTemplate === template.type;

          return (
            <motion.div
              key={template.type}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Card
                onClick={() => selectTemplate(template.type)}
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group relative overflow-hidden surface-1",
                  isSelected
                    ? "ring-2 ring-primary shadow-lg shadow-primary/5 surface-2"
                    : cn("border", templateGradients[template.type])
                )}
              >
                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                          templateIconBg[template.type]
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {template.name}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] mt-1 font-medium", templateBadgeColors[template.type])}
                        >
                          {template.defaultStructure.chapterCount} chapters
                          {template.defaultStructure.hasAppendix ? " + appendix" : ""}
                        </Badge>
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                      >
                        <ChevronRight className="w-4 h-4 text-primary-foreground" />
                      </motion.div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="relative">
                  <CardDescription className="text-sm leading-relaxed">
                    {template.description}
                  </CardDescription>

                  {/* Quick config preview */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                      {template.defaultOptions.fontSize}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                      {template.defaultOptions.lineSpacing} spacing
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                      {template.defaultOptions.citationStyle?.toUpperCase()}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                      {template.defaultOptions.paperSize}
                    </span>
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
