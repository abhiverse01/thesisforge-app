"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useThesisStore } from "@/lib/thesis-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download, FileText, FileDown, BookOpen, CheckCircle2,
  AlertTriangle, Info, Copy, Check, Sparkles, Loader2,
  AlertCircle, Layers, List, ChevronRight, Eye, Code,
  Users, GraduationCap, Hash, Code2, Circle, XCircle, ShieldCheck,
  Terminal, Heart, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateLatex } from "@/lib/latex-generator";
import { generateBibFromThesisReferences } from "@/core/bib";
import { lintLatex, lintSummary, type LintResult } from "@/core/linter";
import { exportThesis, exportTexOnly, exportBibOnly } from "@/core/export";
import { validateAll, type ValidationResult } from "@/core/validators";
import { countWords } from "@/utils/word-count";
import { WIZARD_STEPS, THESIS_TEMPLATES, ABSTRACT_WORD_LIMITS, MIN_REFERENCES } from "@/lib/thesis-types";
import type { ThesisReference, ThesisData } from "@/lib/thesis-types";

// ─── Animation ───────────────────────────────────────────────
const fadeVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};
const fadeTransition = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

// ─── Pre-flight checklist item definition ───────────────────
type CheckStatus = 'pending' | 'running' | 'passed' | 'failed';

interface PreflightCheck {
  id: string;
  label: string;
  category: 'metadata' | 'abstract' | 'chapters' | 'references' | 'format' | 'content';
  run: (data: ThesisData) => boolean;
}

// ─── 30 Pre-flight Quality Checks ───────────────────────────
const PREFLIGHT_CHECKS: PreflightCheck[] = [
  // ── Metadata Completeness (1-7) ──
  { id: 'pf-01', label: 'Title is not empty', category: 'metadata',
    run: (d) => !!d.metadata.title?.trim() },
  { id: 'pf-02', label: 'Author is not empty', category: 'metadata',
    run: (d) => !!d.metadata.author?.trim() },
  { id: 'pf-03', label: 'University is not empty', category: 'metadata',
    run: (d) => !!d.metadata.university?.trim() },
  { id: 'pf-04', label: 'Supervisor is not empty', category: 'metadata',
    run: (d) => !!d.metadata.supervisor?.trim() },
  { id: 'pf-05', label: 'Submission date is set', category: 'metadata',
    run: (d) => !!d.metadata.submissionDate?.trim() },
  { id: 'pf-06', label: 'Department is not empty', category: 'metadata',
    run: (d) => !!d.metadata.department?.trim() },
  { id: 'pf-07', label: 'Faculty is not empty', category: 'metadata',
    run: (d) => !!d.metadata.faculty?.trim() },

  // ── Abstract (8-11) ──
  { id: 'pf-08', label: 'Abstract has content', category: 'abstract',
    run: (d) => !!d.abstract?.trim() },
  { id: 'pf-09', label: 'Abstract is at least 50 words', category: 'abstract',
    run: (d) => countWords(d.abstract || '') >= 50 },
  { id: 'pf-10', label: 'Abstract within word limit', category: 'abstract',
    run: (d) => { const w = countWords(d.abstract || ''); const limit = ABSTRACT_WORD_LIMITS[d.type]; return w <= limit; } },
  { id: 'pf-11', label: 'Keywords are defined (≥3)', category: 'abstract',
    run: (d) => d.keywords.length >= 3 },

  // ── Chapter Structure (12-18) ──
  { id: 'pf-12', label: 'At least 3 chapters', category: 'chapters',
    run: (d) => d.chapters.length >= 3 },
  { id: 'pf-13', label: 'No empty chapter titles', category: 'chapters',
    run: (d) => d.chapters.every((ch) => !!ch.title?.trim()) },
  { id: 'pf-14', label: 'All chapters have content', category: 'chapters',
    run: (d) => d.chapters.every((ch) => !!ch.content?.trim() || ch.subSections.some((s) => !!s.content?.trim())) },
  { id: 'pf-15', label: 'First chapter is Introduction', category: 'chapters',
    run: (d) => { const first = d.chapters[0]?.title?.toLowerCase() || ''; return first.includes('introduction'); } },
  { id: 'pf-16', label: 'Last chapter is Conclusion', category: 'chapters',
    run: (d) => { const last = d.chapters[d.chapters.length - 1]?.title?.toLowerCase() || ''; return last.includes('conclusion'); } },
  { id: 'pf-17', label: 'No extremely long chapters (>15k words)', category: 'chapters',
    run: (d) => d.chapters.every((ch) => {
      const w = countWords(ch.content || '') + ch.subSections.reduce((s, ss) => s + countWords(ss.content || ''), 0);
      return w <= 15000;
    }) },
  { id: 'pf-18', label: 'No empty subsection titles', category: 'chapters',
    run: (d) => d.chapters.every((ch) => ch.subSections.every((ss) => !!ss.title?.trim())) },

  // ── References (19-23) ──
  { id: 'pf-19', label: 'Minimum references met', category: 'references',
    run: (d) => d.references.length >= MIN_REFERENCES[d.type] },
  { id: 'pf-20', label: 'All references have authors', category: 'references',
    run: (d) => d.references.every((r) => !!r.authors?.trim()) },
  { id: 'pf-21', label: 'All references have titles', category: 'references',
    run: (d) => d.references.every((r) => !!r.title?.trim()) },
  { id: 'pf-22', label: 'All references have years', category: 'references',
    run: (d) => d.references.every((r) => !!r.year?.trim()) },
  { id: 'pf-23', label: 'No duplicate reference titles', category: 'references',
    run: (d) => { const titles = d.references.map((r) => r.title?.trim().toLowerCase()).filter(Boolean); return new Set(titles).size === titles.length; } },

  // ── Format & Options (24-28) ──
  { id: 'pf-24', label: 'Citation style is configured', category: 'format',
    run: (d) => !!d.options.citationStyle },
  { id: 'pf-25', label: 'Font size is configured', category: 'format',
    run: (d) => !!d.options.fontSize },
  { id: 'pf-26', label: 'Paper size is set', category: 'format',
    run: (d) => !!d.options.paperSize },
  { id: 'pf-27', label: 'Line spacing is set', category: 'format',
    run: (d) => !!d.options.lineSpacing },
  { id: 'pf-28', label: 'TOC depth is reasonable (2-4)', category: 'format',
    run: (d) => d.options.tocDepth >= 2 && d.options.tocDepth <= 4 },

  // ── Content Quality (29-30) ──
  { id: 'pf-29', label: 'Margin size is configured', category: 'content',
    run: (d) => !!d.options.marginSize },
  { id: 'pf-30', label: 'Figure/table numbering is set', category: 'content',
    run: (d) => !!d.options.figureNumbering && !!d.options.tableNumbering },
];

const CATEGORY_LABELS: Record<string, string> = {
  metadata: 'Metadata',
  abstract: 'Abstract & Keywords',
  chapters: 'Chapter Structure',
  references: 'References',
  format: 'Page Format',
  content: 'Content Settings',
};

// ─── Progress stages ─────────────────────────────────────────
const PROGRESS_STAGES = [
  { label: "Preparing...", target: 0 },
  { label: "Building preamble...", target: 15 },
  { label: "Building chapters...", target: 45 },
  { label: "Building references...", target: 75 },
  { label: "Assembling document...", target: 88 },
  { label: "Done", target: 100 },
];

// Terminal stage display
type TerminalStatus = "info" | "success" | "warning" | "error";

const TERMINAL_STAGES: { label: string; status: TerminalStatus }[] = [
  { label: "$ pdflatex main.tex", status: "info" },
  { label: "  > Loading packages & preamble...", status: "info" },
  { label: "  > Building chapters...", status: "info" },
  { label: "  > Processing references & bibliography...", status: "info" },
  { label: "  > Assembling final document...", status: "info" },
  { label: "  ✓ Build complete — 0 errors", status: "success" },
];

// ─── Helpers ─────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatRefHuman(ref: ThesisReference, idx: number): string {
  const a = ref.authors?.trim() || "Unknown";
  const y = ref.year || "n.d.";
  const t = ref.title?.trim() || "Untitled";
  const parts: string[] = [];
  if (ref.journal) {
    const vol = ref.volume ? `, ${ref.volume}` : "";
    const num = ref.number ? `(${ref.number})` : "";
    const pg = ref.pages ? `, ${ref.pages}` : "";
    parts.push(`${a} (${y}). ${t}. ${ref.journal}${vol}${num}${pg}.`);
  } else if (ref.bookTitle) {
    parts.push(`${a} (${y}). ${t}. In ${ref.bookTitle}${ref.publisher ? `. ${ref.publisher}` : ""}.`);
  } else if (ref.publisher) {
    parts.push(`${a} (${y}). ${t}. ${ref.publisher}.`);
  } else if (ref.school) {
    parts.push(`${a} (${y}). ${t} [${ref.type === "thesis" ? "Doctoral dissertation" : "Thesis"}]. ${ref.school}.`);
  } else if (ref.url) {
    parts.push(`${a} (${y}). ${t}. Retrieved from ${ref.url}`);
  } else {
    parts.push(`${a} (${y}). ${t}.`);
  }
  if (ref.doi) parts[0] += ` doi:${ref.doi}`;
  return `[${idx + 1}] ${parts[0]}`;
}

function hasContent(ch: { content: string; subSections: { content: string }[] }): boolean {
  return !!(ch.content?.trim() || ch.subSections?.some((s) => s.content?.trim()));
}

function getTemplateLabel(type: string): string {
  return THESIS_TEMPLATES.find((t) => t.type === type)?.name ?? "Thesis";
}

// ─── Component ───────────────────────────────────────────────
export function GeneratePreview() {
  const router = useRouter();
  const thesis = useThesisStore(s => s.thesis);
  const selectedTemplate = useThesisStore(s => s.selectedTemplate);
  const isGenerating = useThesisStore(s => s.isGenerating);
  const setGenerating = useThesisStore(s => s.setGenerating);
  const [latex, setLatex] = useState("");
  const [bib, setBib] = useState("");
  const [lintResult, setLintResult] = useState<LintResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const confettiShown = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const initialGenerated = useRef(false);

  // ── Pre-flight checklist state ──
  const [checkResults, setCheckResults] = useState<Map<string, CheckStatus>>(new Map());
  const [preflightRunning, setPreflightRunning] = useState(false);
  const preflightTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── IntersectionObserver for sidebar active state ──
  useEffect(() => {
    if (activeTab !== "preview" || !previewRef.current) return;
    const container = previewRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { root: container, rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    container.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab, hasGenerated]);

  // ── Generation logic ──
  const runGeneration = useCallback(async () => {
    if (!thesis) return;
    setGenerating(true);
    setProgress(0);
    setProgressLabel(PROGRESS_STAGES[0].label);
    await new Promise((r) => requestAnimationFrame(r));

    try {
      for (let i = 1; i < PROGRESS_STAGES.length - 1; i++) {
        setProgress(PROGRESS_STAGES[i].target);
        setProgressLabel(PROGRESS_STAGES[i].label);
        await new Promise((r) => setTimeout(r, 80));
      }
      const tex = generateLatex(thesis);
      const bibContent = generateBibFromThesisReferences(thesis.references);
      const lint = lintLatex(tex);
      const validation = validateAll(thesis);
      setLatex(tex);
      setBib(bibContent);
      setLintResult(lint);
      setValidationResult(validation);
      setHasGenerated(true);
      setProgress(100);
      setProgressLabel(PROGRESS_STAGES[PROGRESS_STAGES.length - 1].label);

      if (!confettiShown.current) { confettiShown.current = true; triggerConfetti(); }
      const summary = lintSummary(lint);
      if (lint.hasErrors) toast.warning("Generated with issues", { description: summary, duration: 4000 });
      else if (lint.warnings.length > 0) toast.success("LaTeX generated", { description: summary, duration: 3000 });
      else toast.success("LaTeX generated successfully", { description: "No issues found. Ready to download!", duration: 3000 });
    } catch (err) {
      setHasGenerated(false);
      toast.error("Generation failed", { description: err instanceof Error ? err.message : "An unknown error occurred.", duration: 4000 });
    } finally {
      setGenerating(false);
    }
  }, [thesis, setGenerating]);

  // ── Auto-generate on mount ──
  useEffect(() => {
    if (!thesis || isGenerating || initialGenerated.current) return;
    initialGenerated.current = true;
    runGeneration();
  }, [thesis, isGenerating, runGeneration]);

  // ── Export handlers ──
  const exportingZipRef = useRef(false);
  const exportingTexRef = useRef(false);
  const exportingBibRef = useRef(false);

  const handleExportZip = useCallback(async () => {
    if (!thesis || !selectedTemplate) { toast.error("No thesis to export"); return; }
    if (exportingZipRef.current) return;
    exportingZipRef.current = true;
    setGenerating(true);
    try {
      const result = await exportThesis(thesis, selectedTemplate);
      if (result.errors && result.errors.length > 0) {
        toast.warning("Exported with warnings", { description: `Downloaded, but ${result.errors.length} issue(s) found. Review before compiling.`, duration: 5000 });
      } else {
        toast.success("Your thesis is ready", { description: "Compile it in Overleaf to get your PDF.", duration: 5000 });
      }
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Failed to create ZIP file.", duration: 4000 });
    } finally {
      setGenerating(false);
      exportingZipRef.current = false;
    }
  }, [thesis, selectedTemplate, setGenerating]);

  const handleExportTex = useCallback(async () => {
    if (!thesis) return;
    if (exportingTexRef.current) return;
    exportingTexRef.current = true;
    try { await exportTexOnly(thesis); toast.success("TEX downloaded", { duration: 2000 }); }
    catch { toast.error("Export failed", { duration: 3000 }); }
    finally { exportingTexRef.current = false; }
  }, [thesis]);

  const handleExportBib = useCallback(async () => {
    if (!thesis) return;
    if (exportingBibRef.current) return;
    exportingBibRef.current = true;
    try { await exportBibOnly(thesis); toast.success("BIB downloaded", { duration: 2000 }); }
    catch { toast.error("Export failed", { duration: 3000 }); }
    finally { exportingBibRef.current = false; }
  }, [thesis]);

  const handleCopy = useCallback(async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(`${type} copied`, { duration: 1500 });
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Copy failed", { duration: 2000 }); }
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = previewRef.current?.querySelector(`#${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ── Computed stats ──
  const totalWords = useMemo(() => {
    if (!thesis) return 0;
    return thesis.chapters.reduce(
      (sum, ch) => sum + countWords(ch.content || "") + ch.subSections.reduce((ss, s) => ss + countWords(s.content || ""), 0), 0,
    );
  }, [thesis]);

  const abstractWords = useMemo(() => countWords(thesis?.abstract || ""), [thesis]);

  const navItems = useMemo(() => {
    if (!thesis) return [];
    const items: { id: string; label: string }[] = [{ id: "sec-title", label: "Title Page" }];
    if (thesis.abstract?.trim()) items.push({ id: "sec-abstract", label: "Abstract" });
    items.push({ id: "sec-contents", label: "Contents" });
    thesis.chapters.forEach((ch) => items.push({ id: `sec-ch-${ch.id}`, label: ch.title || `Chapter ${ch.number}` }));
    if (thesis.references.length > 0) items.push({ id: "sec-references", label: "References" });
    if (thesis.appendices.length > 0) items.push({ id: "sec-appendices", label: "Appendices" });
    return items;
  }, [thesis]);

  // ── Pre-flight checklist runner ──
  const runPreflightChecks = useCallback(() => {
    if (!thesis || preflightRunning) return;
    setPreflightRunning(true);
    const pendingMap = new Map<string, CheckStatus>();
    for (const check of PREFLIGHT_CHECKS) { pendingMap.set(check.id, 'pending'); }
    setCheckResults(pendingMap);

    PREFLIGHT_CHECKS.forEach((check, index) => {
      const runningTimer = setTimeout(() => {
        setCheckResults((prev) => { const next = new Map(prev); next.set(check.id, 'running'); return next; });
        const resolveTimer = setTimeout(() => {
          let passed = false;
          try { passed = check.run(thesis); } catch { passed = false; }
          setCheckResults((prev) => { const next = new Map(prev); next.set(check.id, passed ? 'passed' : 'failed'); return next; });
          if (index === PREFLIGHT_CHECKS.length - 1) { setPreflightRunning(false); }
        }, 50);
        preflightTimers.current.push(resolveTimer);
      }, index * 100);
      preflightTimers.current.push(runningTimer);
    });
  }, [thesis, preflightRunning]);

  useEffect(() => {
    return () => { preflightTimers.current.forEach(clearTimeout); };
  }, []);

  const hasRunPreflight = checkResults.size > 0;

  const preflightPassed = useMemo(() => {
    let passed = 0;
    let total = 0;
    checkResults.forEach((status) => {
      if (status === 'passed') passed++;
      if (status === 'passed' || status === 'failed') total++;
    });
    return { passed, total, allPassed: total > 0 && passed === total };
  }, [checkResults]);

  // Health score: 0-100 based on preflight
  const healthScore = useMemo(() => {
    if (!hasRunPreflight) return null;
    const { passed, total } = preflightPassed;
    if (total === 0) return null;
    return Math.round((passed / PREFLIGHT_CHECKS.length) * 100);
  }, [preflightPassed, checkResults, hasRunPreflight]);

  const checksByCategory = useMemo(() => {
    const groups: Record<string, PreflightCheck[]> = {};
    for (const check of PREFLIGHT_CHECKS) {
      if (!groups[check.category]) groups[check.category] = [];
      groups[check.category].push(check);
    }
    return groups;
  }, []);

  // FIX: visibleTerminalStages useMemo MUST be before the conditional return below.
  // React's rules of hooks require the same number of hooks to run on every render.
  // Previously this useMemo was after `if (!thesis) return null`, causing a
  // "Rendered fewer hooks than expected" crash when thesis transitions from null to non-null.
  const visibleTerminalStages = useMemo(() => {
    if (!isGenerating && !hasGenerated) return [];
    const stages = [...TERMINAL_STAGES];
    if (lintResult && lintResult.hasErrors) {
      stages[stages.length - 1] = { label: `  ✗ Build complete — ${lintResult.errors.length} error(s)`, status: "error" as TerminalStatus };
    } else if (lintResult && lintResult.warnings.length > 0) {
      stages[stages.length - 1] = { label: `  ⚠ Build complete — ${lintResult.warnings.length} warning(s)`, status: "warning" as TerminalStatus };
    }
    return stages;
  }, [isGenerating, hasGenerated, lintResult]);

  if (!thesis) return null;

  const templateName = getTemplateLabel(thesis.type);
  const lintIssueCount = lintResult ? lintResult.all.length : 0;
  const exportHasWarnings = hasRunPreflight && !preflightPassed.allPassed;

  return (
    <motion.div variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTransition} className="space-y-6">
      {/* ── Left-aligned step title ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-8">
          <p className="tf-micro-label mb-2">Step 6 of {WIZARD_STEPS.length}</p>
          <h1 className="tf-heading mb-3">Preview &amp; Export</h1>
          <p className="text-sm text-muted-foreground">Review, lint, and download your thesis files.</p>
        </div>
      </motion.div>

      {/* Stats Bar (left-aligned) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {esc(templateName)}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {thesis.chapters.length} chapter{thesis.chapters.length !== 1 ? "s" : ""}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {totalWords.toLocaleString()} words</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {thesis.references.length} reference{thesis.references.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Terminal-style Compile Output ── */}
      {isGenerating && (
        <div className="tf-terminal">
          {visibleTerminalStages.slice(0, Math.max(1, Math.ceil((progress / 100) * TERMINAL_STAGES.length))).map((stage, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: i * 0.08 }}
              className={cn(
                stage.status === "error" && "error",
                stage.status === "warning" && "warning",
                stage.status === "success" && "success",
              )}
            >
              {stage.label}
            </motion.div>
          ))}
          {progress < 100 && (
            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              ▌
            </motion.div>
          )}
        </div>
      )}

      {/* ── Thesis Health Score Bar ── */}
      {healthScore !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className={cn(
                "w-3.5 h-3.5",
                healthScore >= 80 ? "text-emerald-500" : healthScore >= 50 ? "text-amber-500" : "text-red-500",
              )} />
              <span className="text-[13px] font-medium">Thesis Health</span>
            </div>
            <span className={cn(
              "text-xs font-semibold tabular-nums",
              healthScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : healthScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400",
            )}>
              {healthScore}/100
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                healthScore >= 80 ? "bg-emerald-500" : healthScore >= 50 ? "bg-amber-500" : "bg-red-500",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${healthScore}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* ── Pre-flight Quality Checks ── */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Pre-flight Quality Checks
            </CardTitle>
            {hasRunPreflight && preflightPassed.total > 0 && (
              <Badge variant={preflightPassed.allPassed ? 'default' : 'destructive'} className="text-xs gap-1">
                {preflightPassed.passed} of {PREFLIGHT_CHECKS.length} passed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {!hasRunPreflight && (
            <Button variant="outline" className="w-full gap-2 text-sm border-dashed min-h-[48px]" onClick={runPreflightChecks} disabled={isGenerating}>
              <ShieldCheck className="w-4 h-4" />
              Run Pre-flight Checks
            </Button>
          )}

          {hasRunPreflight && !preflightRunning && (
            <Button variant="ghost" size="sm" className="w-full gap-2 text-xs text-muted-foreground min-h-[44px]" onClick={runPreflightChecks} disabled={isGenerating}>
              Re-run checks
            </Button>
          )}

          {preflightRunning && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running checks...
            </div>
          )}

          {hasRunPreflight && (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-none">
              {Object.entries(checksByCategory).map(([category, checks]) => (
                <div key={category}>
                  <p className="tf-micro-label mb-1.5 text-[10px]">{CATEGORY_LABELS[category] || category}</p>
                  <div className="space-y-1">
                    {checks.map((check, idx) => {
                      const status = checkResults.get(check.id) || 'pending';
                      const StatusIcon =
                        status === 'running' ? Loader2 :
                        status === 'passed' ? CheckCircle2 :
                        status === 'failed' ? XCircle :
                        Circle;
                      const statusColor =
                        status === 'running' ? 'text-muted-foreground animate-spin' :
                        status === 'passed' ? 'text-emerald-500' :
                        status === 'failed' ? 'text-red-500' :
                        'text-muted-foreground/40';
                      const badgeVariant =
                        status === 'passed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        status === 'failed' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                        'bg-muted text-muted-foreground';

                      return (
                        <motion.div
                          key={check.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.03, ease: [0.22, 1, 0.36, 1] }}
                          className="flex items-center gap-2.5 py-1"
                        >
                          <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", statusColor)} />
                          <span className="flex-1 text-xs text-foreground/80">{check.label}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", badgeVariant)}>
                            {status === 'pending' ? 'Pending' : status === 'running' ? 'Running' : status === 'passed' ? 'Pass' : 'Fail'}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasRunPreflight && !preflightRunning && preflightPassed.total === PREFLIGHT_CHECKS.length && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className={cn(
                "rounded-lg p-3 text-center text-sm font-medium",
                preflightPassed.allPassed
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
              )}
            >
              {preflightPassed.allPassed ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  All checks passed! Ready to export.
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {PREFLIGHT_CHECKS.length - preflightPassed.passed} check{PREFLIGHT_CHECKS.length - preflightPassed.passed !== 1 ? 's' : ''} need attention
                </span>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Lint Banner */}
      <div className="h-6 flex items-center">
        {hasGenerated && lintResult && (
          lintIssueCount === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 w-full">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-medium">All clear — ready to export</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 w-full">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{lintIssueCount} issue{lintIssueCount !== 1 ? "s" : ""} found — review before compiling</span>
            </div>
          )
        )}
      </div>

      {/* Validation Warnings */}
      {validationResult && validationResult.warnings && Object.keys(validationResult.warnings).length > 0 && (
        <Card className="border-amber-500/30 bg-[var(--color-fill-warning)]">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-text-warning)]" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1">
              {Object.values(validationResult.warnings).map((msg, i) => (
                <p key={i} className="text-xs text-muted-foreground">{msg}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ── */}
      {hasGenerated && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-3 gap-2 overflow-x-auto">
            <TabsList className="h-9 shrink-0">
              <TabsTrigger value="preview" className="text-xs gap-1.5 px-3">
                <Eye className="w-3.5 h-3.5" />
                Thesis Preview
              </TabsTrigger>
              <TabsTrigger value="tex" className="text-xs gap-1.5 px-3">
                <Code className="w-3.5 h-3.5" />
                LaTeX Source
              </TabsTrigger>
              <TabsTrigger value="bib" className="text-xs gap-1.5 px-3">
                <BookOpen className="w-3.5 h-3.5" />
                References
              </TabsTrigger>
              <TabsTrigger value="lint" className="text-xs gap-1.5 px-3" disabled={!lintResult || lintResult.all.length === 0}>
                <Layers className="w-3.5 h-3.5" />
                Lint
                {lintResult && lintResult.all.length > 0 && (
                  <Badge variant={lintResult.hasErrors ? "destructive" : "secondary"} className="ml-1 h-4 px-1 text-[10px]">
                    {lintResult.all.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {(activeTab === "tex" || activeTab === "bib") && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground shrink-0"
                    onClick={() => handleCopy(activeTab === "tex" ? latex : bib, activeTab === "tex" ? "LaTeX" : "BibTeX")}>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copied ? "Copied!" : "Copy to clipboard"}</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* ── Thesis Preview Tab ── */}
          <TabsContent value="preview" className="mt-0">
            <div className="flex gap-4">
              <nav className="hidden lg:block w-48 shrink-0">
                <div className="sticky top-24">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                    <List className="w-3 h-3" /> Navigation
                  </p>
                  <div className="space-y-0.5">
                    {navItems.map((item) => (
                      <button key={item.id} type="button" onClick={() => scrollToSection(item.id)}
                        className={cn(
                          "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors truncate",
                          activeSection === item.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}>
                        {activeSection === item.id && <span className="w-1 h-1 rounded-full bg-primary shrink-0" />}
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </nav>

              {/* Preview Pane */}
              <div ref={previewRef} className="flex-1 min-w-0 rounded-xl border border-border/50 bg-card/30 overflow-y-auto scrollbar-none max-h-[calc(100dvh-280px)] max-h-[calc(100vh-280px)]">
                <div className="max-w-2xl mx-auto py-8 px-6 space-y-8">
                  {/* Title Page */}
                  <section id="sec-title" data-section className="text-center pb-8 border-b-2 border-border/40">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">{esc(thesis.metadata.university)}</p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{esc(thesis.metadata.title || "Untitled Thesis")}</h1>
                    <p className="text-sm text-muted-foreground font-medium mb-6">{esc(templateName)}</p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center justify-center gap-2"><Users className="w-3.5 h-3.5" /> <span>{esc(thesis.metadata.author || "Unknown Author")}</span></p>
                      {thesis.metadata.supervisor && <p>Supervisor: {esc(thesis.metadata.supervisor)}</p>}
                      {thesis.metadata.submissionDate && <p>{esc(thesis.metadata.submissionDate)}</p>}
                    </div>
                  </section>

                  {/* Abstract */}
                  {thesis.abstract?.trim() && (
                    <section id="sec-abstract" data-section className="space-y-3">
                      <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Abstract</h3>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{esc(thesis.abstract)}</p>
                      <p className="text-[10px] text-muted-foreground">{abstractWords.toLocaleString()} words</p>
                    </section>
                  )}

                  {/* Table of Contents */}
                  <section id="sec-contents" data-section className="space-y-3">
                    <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Contents</h3>
                    <div className="space-y-1.5">
                      {thesis.chapters.map((ch, i) => {
                        const chWords = countWords(ch.content || "") + ch.subSections.reduce((s, ss) => s + countWords(ss.content || ""), 0);
                        return (
                          <div key={ch.id} className="flex items-center justify-between text-sm group cursor-pointer hover:text-primary transition-colors"
                            onClick={() => scrollToSection(`sec-ch-${ch.id}`)}>
                            <span className="truncate flex-1">{i + 1}. {esc(ch.title || `Chapter ${ch.number}`)}</span>
                            <span className="text-xs text-muted-foreground/50 tabular-nums shrink-0 ml-2">{chWords.toLocaleString()} words</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Chapters */}
                  {thesis.chapters.map((ch) => (
                    <section key={ch.id} id={`sec-ch-${ch.id}`} data-section className="space-y-3">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground shrink-0">Chapter {ch.number}</span>
                        <h2 className="text-lg font-semibold tracking-tight">{esc(ch.title)}</h2>
                      </div>
                      {hasContent(ch) ? (
                        <>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{esc(ch.content)}</div>
                          {ch.subSections.map((ss) => (
                            <div key={ss.id} className="mt-3 ml-4">
                              <h4 className="text-sm font-medium mb-1">{esc(ss.title)}</h4>
                              {ss.content?.trim() ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">{esc(ss.content)}</p>
                              ) : (
                                <div className="border border-dashed border-muted-foreground/30 rounded-lg min-h-[80px] flex items-center justify-center">
                                  <p className="text-xs italic text-muted-foreground/60">No content added yet.</p>
                                </div>
                              )}
                            </div>
                          ))}
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {(countWords(ch.content || "") + ch.subSections.reduce((s, ss) => s + countWords(ss.content || ""), 0)).toLocaleString()} words
                          </p>
                        </>
                      ) : (
                        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg min-h-[80px] flex items-center justify-center bg-muted/20">
                          <p className="text-sm italic text-muted-foreground/50">No content added yet.</p>
                        </div>
                      )}
                    </section>
                  ))}

                  {/* References */}
                  {thesis.references.length > 0 && (
                    <section id="sec-references" data-section className="space-y-3">
                      <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">References</h3>
                      <ol className="space-y-2 list-none">
                        {thesis.references.map((ref, i) => (
                          <li key={ref.id} className="text-sm leading-relaxed text-foreground/80 pl-6 -indent-6">{formatRefHuman(ref, i)}</li>
                        ))}
                      </ol>
                    </section>
                  )}

                  {/* Appendices */}
                  {thesis.appendices.length > 0 && (
                    <section id="sec-appendices" data-section className="space-y-3">
                      <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Appendices</h3>
                      {thesis.appendices.map((app) => (
                        <div key={app.id} className="space-y-2">
                          <h4 className="text-sm font-semibold">{esc(app.title)}</h4>
                          {app.content?.trim() ? (
                            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">{esc(app.content)}</div>
                          ) : (
                            <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg min-h-[80px] flex items-center justify-center bg-muted/20">
                              <p className="text-sm italic text-muted-foreground/50">No content added yet.</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </section>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── LaTeX Source Tab ── */}
          <TabsContent value="tex" className="mt-0">
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                <span className="text-xs font-mono text-muted-foreground">main.tex</span>
                <span className="text-xs font-mono text-muted-foreground tabular-nums">{latex.split("\n").length} lines</span>
              </div>
              <div className="max-h-[500px] overflow-auto scrollbar-none p-4">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words"><code>{latex}</code></pre>
              </div>
            </div>
          </TabsContent>

          {/* ── BibTeX Tab ── */}
          <TabsContent value="bib" className="mt-0">
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                <span className="text-xs font-mono text-muted-foreground">references.bib</span>
                <span className="text-xs font-mono text-muted-foreground tabular-nums">{bib.split("\n").length} lines</span>
              </div>
              <div className="max-h-[500px] overflow-auto scrollbar-none p-4">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words"><code>{bib}</code></pre>
              </div>
            </div>
          </TabsContent>

          {/* ── Lint Tab ── */}
          <TabsContent value="lint" className="mt-0">
            <Card className="border-border/50">
              <CardContent className="p-4">
                {lintResult && lintResult.all.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-8 h-8 text-[var(--color-text-success)] mx-auto mb-2" />
                    <p className="text-sm font-medium">All clear!</p>
                    <p className="text-xs text-muted-foreground mt-1">No issues found in your LaTeX code.</p>
                  </div>
                ) : lintResult ? (
                  <div className="space-y-3">
                    {lintResult.errors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" /> Errors ({lintResult.errors.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                          {lintResult.errors.map((issue) => (
                            <div key={issue.id} className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                              <code className="text-xs font-mono bg-destructive/10 text-destructive px-1 py-0.5 rounded shrink-0">{issue.id}</code>
                              <span className="text-xs">{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {lintResult.warnings.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--color-text-warning)] mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5" /> Warnings ({lintResult.warnings.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                          {lintResult.warnings.map((issue) => (
                            <div key={issue.id} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--color-fill-warning)] border border-amber-500/20">
                              <code className="text-xs font-mono bg-[var(--color-fill-warning)] text-[var(--color-text-warning)] px-1 py-0.5 rounded shrink-0">{issue.id}</code>
                              <span className="text-xs">{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {lintResult.infos?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" /> Info ({lintResult.infos.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                          {(lintResult.infos ?? []).map((issue) => (
                            <div key={issue.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                              <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded shrink-0">{issue.id}</code>
                              <span className="text-xs text-muted-foreground">{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Separator />

      {/* ── Export File Card ── */}
      {hasGenerated && (
        <div className="bg-card border rounded-xl p-4 space-y-4">
          {/* File header with traffic-light dots */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">thesis-export.zip</p>
                {/* Traffic light dots */}
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contains: main.tex, references.bib, README.md, Makefile, CHECKLIST.txt
              </p>
            </div>
          </div>

          {/* File details grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="font-semibold tabular-nums">{latex.length.toLocaleString()}</p>
              <p className="text-muted-foreground">chars .tex</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="font-semibold tabular-nums">{bib.length.toLocaleString()}</p>
              <p className="text-muted-foreground">chars .bib</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="font-semibold tabular-nums">{totalWords.toLocaleString()}</p>
              <p className="text-muted-foreground">words</p>
            </div>
            <div className="hidden sm:block bg-muted/30 rounded-lg p-2 text-center">
              <p className="font-semibold tabular-nums">{thesis.chapters.length}</p>
              <p className="text-muted-foreground">chapters</p>
            </div>
            <div className="hidden sm:block bg-muted/30 rounded-lg p-2 text-center">
              <p className="font-semibold tabular-nums">{thesis.references.length}</p>
              <p className="text-muted-foreground">references</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Export ZIP */}
            <motion.div
              animate={!prefersReducedMotion && exportSuccess ? {
                boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0)', '0 0 0 4px rgba(16, 185, 129, 0.3)', '0 0 0 0 rgba(16, 185, 129, 0)'],
              } : {}}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="rounded-lg"
            >
              <Button onClick={handleExportZip} className="gap-2 text-sm font-semibold w-full h-11 px-6" disabled={isGenerating}>
                <motion.span
                  animate={!prefersReducedMotion && exportSuccess ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="inline-flex items-center"
                >
                  {exportSuccess ? (<><Check className="w-4 h-4" /> Downloaded!</>) : (<><FileDown className="w-4 h-4" /> Export ZIP</>)}
                </motion.span>
              </Button>
            </motion.div>

            {/* Copy main.tex */}
            <Button variant="outline" onClick={() => handleCopy(latex, 'LaTeX source')} className="gap-2 text-sm h-9" disabled={!hasGenerated || isGenerating}>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              Copy main.tex
            </Button>

            {/* Open in Overleaf */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const { saveDraft } = await import('@/core/persistence');
                      const state = useThesisStore.getState();
                      const step = state.currentStep;
                      if (state.thesis && state.selectedTemplate) {
                        await saveDraft(state.thesis, state.selectedTemplate, step);
                      }
                    } catch { /* non-critical */ }
                    router.push('/editor?source=wizard');
                  }}
                  className="gap-2 text-sm h-9 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                  disabled={isGenerating}
                >
                  <ExternalLink className="w-4 h-4 text-primary" />
                  Open in Overleaf
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open the generated LaTeX in the full-featured Monaco editor</TooltipContent>
            </Tooltip>
          </div>

          {/* Secondary actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleExportTex} disabled={isGenerating}>
              <FileText className="w-3.5 h-3.5" />.tex only
            </Button>
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleExportBib} disabled={isGenerating || thesis.references.length === 0}>
              <BookOpen className="w-3.5 h-3.5" />.bib only
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => handleCopy(bib, 'BibTeX')} disabled={!hasGenerated || isGenerating || thesis.references.length === 0}>
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              Copy .bib
            </Button>
          </div>
        </div>
      )}

      {/* Sticky Export CTA */}
      {hasGenerated && (
        <div className="sticky bottom-0 z-10 bg-background/92 backdrop-blur-sm border-t px-4 py-3 flex items-center justify-between gap-4 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8">
          <div className="text-xs text-muted-foreground">
            {lintResult && lintResult.all.length === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready to compile
              </span>
            ) : lintResult && lintResult.all.length > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {lintResult.all.length} issue{lintResult.all.length !== 1 ? 's' : ''} to review
              </span>
            ) : (
              <span>Generating preview...</span>
            )}
          </div>
          <Button onClick={handleExportZip} size="sm" className="gap-2 text-xs font-semibold shrink-0 h-9 px-4" disabled={isGenerating}>
            {exportSuccess ? (<><Check className="w-3 h-3 h-3.5" /> Downloaded!</>) : (<><FileDown className="w-3.5 h-3.5" /> Export ZIP</>)}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Confetti (client-side only) ─────────────────────────────
function triggerConfetti() {
  if (typeof window === "undefined") return;
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
  document.body.appendChild(container);

  for (let i = 0; i < 60; i++) {
    const particle = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 500;
    const duration = 1500 + Math.random() * 2000;
    const size = 4 + Math.random() * 6;
    particle.style.cssText = `position:absolute;left:${left}%;top:-10px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};opacity:0.9;animation:confetti-fall ${duration}ms ease-in ${delay}ms forwards;`;
    container.appendChild(particle);
  }

  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = `@keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 0.9; } 100% { transform: translateY(100vh) rotate(${360 + Math.random() * 360}deg); opacity: 0; } }`;
    document.head.appendChild(style);
  }
  setTimeout(() => { container.remove(); }, 4000);
}
