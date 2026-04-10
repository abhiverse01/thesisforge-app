"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { THESIS_TEMPLATES } from "@/lib/thesis-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Type,
  FileText,
  AlignJustify,
  Maximize2,
  Quote,
  Hash,
  BookOpen,
  List,
  Code,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fadeVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const fadeTransition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as const,
};

interface FormatOptionDef {
  key: string;
  label: string;
  tooltip: string;
  latexCommand?: string;
  icon: React.ElementType;
}

const FORMAT_SECTIONS = [
  {
    title: "Typography & Layout",
    options: [
      {
        key: "fontSize",
        label: "Font Size",
        tooltip: "Base font size for the document. 12pt is standard for most theses. LaTeX command: \\documentclass[12pt,...]",
        latexCommand: "\\documentclass[{fontSize},...]{report}",
        icon: Type,
      },
      {
        key: "paperSize",
        label: "Paper Size",
        tooltip: "Standard paper size. A4 is used worldwide; Letter is standard in North America.",
        latexCommand: "\\documentclass[...,{paperSize}]{report}",
        icon: FileText,
      },
      {
        key: "lineSpacing",
        label: "Line Spacing",
        tooltip: "onehalf is standard for theses. double is common for PhD dissertations. Uses the setspace package.",
        latexCommand: "\\onehalfspacing / \\doublespacing",
        icon: AlignJustify,
      },
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
    title: "Bibliography & Numbering",
    options: [
      {
        key: "citationStyle",
        label: "Citation Style",
        tooltip: "Bibliography style for reference formatting. plainnat is the most common with natbib.",
        latexCommand: "\\bibliographystyle{citationStyle}",
        icon: Quote,
      },
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
    tooltip: "Adds a dedication page after the title page. The text is centered vertically.",
    latexCommand: "\\begin{dedication}...",
  },
  {
    key: "includeAcknowledgment",
    label: "Acknowledgments",
    tooltip: "Adds an acknowledgments section in the front matter with a TOC entry.",
    latexCommand: "\\chapter*{Acknowledgments}",
  },
  {
    key: "includeAppendices",
    label: "Appendices",
    tooltip: "Enables the appendix section after the bibliography. Uses \\appendix command.",
    latexCommand: "\\appendix \\chapter{...}",
  },
  {
    key: "includeListings",
    label: "Code Listings",
    tooltip: "Adds the listings package with pre-configured syntax highlighting settings.",
    latexCommand: "\\usepackage{listings} \\lstset{...}",
  },
  {
    key: "includeGlossary",
    label: "Glossary",
    tooltip: "Adds glossary support using the glossaries package. Useful for PhD theses.",
    latexCommand: "\\usepackage{glossaries}",
  },
];

export function FormatEditor() {
  const { thesis, updateOptions, selectedTemplate } = useThesisStore();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const options = thesis?.options;
  const template = THESIS_TEMPLATES.find((t) => t.type === selectedTemplate);

  const preamblePreview = useMemo(() => {
    if (!options) return '';
    const lines = [
      `\\documentclass[${options.fontSize},${options.paperSize}]{report}`,
      `\\usepackage[${options.marginSize}]{geometry}`,
    ];
    if (options.lineSpacing === 'onehalf') lines.push('\\onehalfspacing');
    else if (options.lineSpacing === 'double') lines.push('\\doublespacing');
    lines.push(`\\bibliographystyle{${options.citationStyle}}`);
    lines.push(`\\setcounter{tocdepth}{${options.tocDepth}}`);
    return lines.join('\n');
  }, [options]);

  if (!thesis) return null;

  const handleChange = (key: string, value: string | number | boolean) => {
    updateOptions({ [key]: value });
  };

  const handleToggle = (key: string, checked: boolean) => {
    updateOptions({ [key]: checked });
    toast.info(`${checked ? 'Enabled' : 'Disabled'}`, {
      description: `${key.replace(/([A-Z])/g, ' $1').trim()}`,
      duration: 1500,
    });
  };

  return (
    <motion.div
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={fadeTransition}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Format & Layout</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure your thesis formatting options. Changes are reflected in the generated LaTeX code.
          {template && (
            <span className="ml-1 text-primary">
              Defaults loaded for {template.name}.
            </span>
          )}
        </p>
      </div>

      {/* Main Options */}
      {FORMAT_SECTIONS.map((section) => (
        <Card key={section.title} className="border-border/50 bg-card/50">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {section.options.map((opt) => {
              const Icon = opt.icon;
              return (
                <div key={opt.key} className="flex items-start gap-3">
                  <div className="shrink-0 mt-2.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label htmlFor={opt.key} className="text-xs font-medium">
                        {opt.label}
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex text-muted-foreground hover:text-foreground transition-colors">
                            <Info className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[280px]">
                          <p className="text-xs leading-relaxed">{opt.tooltip}</p>
                          {opt.latexCommand && (
                            <code className="mt-1.5 block text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                              {opt.latexCommand.replace(`{${opt.key}}`, `{${options[opt.key as keyof typeof options]}}`)}
                            </code>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {opt.key === 'tocDepth' ? (
                      <Select
                        value={String(options.tocDepth)}
                        onValueChange={(v) => handleChange('tocDepth', parseInt(v, 10))}
                      >
                        <SelectTrigger id={opt.key} className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((d) => (
                            <SelectItem key={d} value={String(d)} className="text-xs">
                              {d} {d === 1 ? '(Chapters only)' : d === 2 ? '(Chapters + Sections)' : d === 3 ? '(Chapters + Sections + Subsections)' : '(All levels)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select
                        value={String(options[opt.key as keyof typeof options])}
                        onValueChange={(v) => handleChange(opt.key, v)}
                      >
                        <SelectTrigger id={opt.key} className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {opt.key === 'fontSize' && ['10pt', '11pt', '12pt'].map((v) => (
                            <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                          ))}
                          {opt.key === 'paperSize' && ['a4paper', 'letterpaper'].map((v) => (
                            <SelectItem key={v} value={v} className="text-xs">{v === 'a4paper' ? 'A4 (International)' : 'US Letter'}</SelectItem>
                          ))}
                          {opt.key === 'lineSpacing' && [
                            { val: 'single', label: 'Single' },
                            { val: 'onehalf', label: '1.5 Lines' },
                            { val: 'double', label: 'Double' },
                          ].map(({ val, label }) => (
                            <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                          ))}
                          {opt.key === 'marginSize' && [
                            { val: 'narrow', label: 'Narrow (0.75in)' },
                            { val: 'normal', label: 'Normal (1in)' },
                            { val: 'wide', label: 'Wide (1.25in)' },
                          ].map(({ val, label }) => (
                            <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                          ))}
                          {opt.key === 'citationStyle' && [
                            { val: 'apa', label: 'APA' },
                            { val: 'ieee', label: 'IEEE' },
                            { val: 'vancouver', label: 'Vancouver' },
                            { val: 'chicago', label: 'Chicago' },
                            { val: 'harvard', label: 'Harvard' },
                          ].map(({ val, label }) => (
                            <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                          ))}
                          {opt.key === 'figureNumbering' && ['continuous', 'per-chapter'].map((v) => (
                            <SelectItem key={v} value={v} className="text-xs">{v === 'continuous' ? 'Continuous (Fig. 5)' : 'Per Chapter (Fig. 2.3)'}</SelectItem>
                          ))}
                          {opt.key === 'tableNumbering' && ['continuous', 'per-chapter'].map((v) => (
                            <SelectItem key={v} value={v} className="text-xs">{v === 'continuous' ? 'Continuous (Table 7)' : 'Per Chapter (Table 3.1)'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Toggle Options */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Document Sections</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {TOGGLE_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id={opt.key}
                    checked={options[opt.key as keyof typeof options] as boolean}
                    onCheckedChange={(checked) => handleToggle(opt.key, checked)}
                  />
                  <Label htmlFor={opt.key} className="text-xs font-medium cursor-pointer">
                    {opt.label}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[260px]">
                      <p className="text-xs leading-relaxed">{opt.tooltip}</p>
                      <code className="mt-1 block text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{opt.latexCommand}</code>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced: Preamble Preview */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2 group">
            <Code className="w-4 h-4" />
            <span>LaTeX Preamble Preview</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-border/50 bg-card/50 mt-2">
            <CardContent className="p-4">
              <pre className="latex-code-block text-xs rounded-lg p-4 overflow-x-auto">
                <code>{preamblePreview}</code>
              </pre>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>


    </motion.div>
  );
}
