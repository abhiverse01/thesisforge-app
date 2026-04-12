"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download, FileText, FileDown, BookOpen, CheckCircle2,
  AlertTriangle, Info, Copy, Check, Sparkles, Loader2,
  AlertCircle, Layers, List, ChevronRight, Eye, Code,
  Users, GraduationCap, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateLatex } from "@/lib/latex-generator";
import { generateBibFromThesisReferences } from "@/core/bib";
import { lintLatex, lintSummary, type LintResult } from "@/core/linter";
import { exportThesis, exportTexOnly, exportBibOnly } from "@/core/export";
import { validateAll, type ValidationResult } from "@/core/validators";
import { countWords } from "@/utils/word-count";
import { WIZARD_STEPS, THESIS_TEMPLATES } from "@/lib/thesis-types";
import type { ThesisReference } from "@/lib/thesis-types";

// ─── Animation ───────────────────────────────────────────────
const fadeVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};
const fadeTransition = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

// ─── Progress stages ─────────────────────────────────────────
const PROGRESS_STAGES = [
  { label: "Preparing...", target: 0 },
  { label: "Building preamble...", target: 15 },
  { label: "Building chapters...", target: 45 },
  { label: "Building references...", target: 75 },
  { label: "Assembling document...", target: 88 },
  { label: "Done", target: 100 },
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
  const { thesis, selectedTemplate, isGenerating, setGenerating } = useThesisStore();
  const [latex, setLatex] = useState("");
  const [bib, setBib] = useState("");
  const [lintResult, setLintResult] = useState<LintResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const confettiShown = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const initialGenerated = useRef(false);

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
  const handleExportZip = useCallback(async () => {
    if (!thesis || !selectedTemplate) { toast.error("No thesis to export"); return; }
    setGenerating(true);
    try {
      const result = await exportThesis(thesis, selectedTemplate);
      if (result.errors && result.errors.length > 0) {
        toast.warning("Exported with warnings", {
          description: `Downloaded, but ${result.errors.length} issue(s) found. Review before compiling.`,
          duration: 5000,
        });
      } else {
        toast.success("Your thesis is ready", { description: "Compile it in Overleaf to get your PDF.", duration: 5000 });
      }
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Failed to create ZIP file.", duration: 4000 });
    } finally {
      setGenerating(false);
    }
  }, [thesis, selectedTemplate, setGenerating]);

  const handleExportTex = useCallback(async () => {
    if (!thesis) return;
    try { await exportTexOnly(thesis); toast.success("TEX downloaded", { duration: 2000 }); }
    catch { toast.error("Export failed", { duration: 3000 }); }
  }, [thesis]);

  const handleExportBib = useCallback(async () => {
    if (!thesis) return;
    try { await exportBibOnly(thesis); toast.success("BIB downloaded", { duration: 2000 }); }
    catch { toast.error("Export failed", { duration: 3000 }); }
  }, [thesis]);

  // ── Copy handler with feedback ──
  const handleCopy = useCallback(async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(`${type} copied`, { duration: 1500 });
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Copy failed", { duration: 2000 }); }
  }, []);

  // ── Sidebar scroll-to ──
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

  // ── Sidebar nav items ──
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

  if (!thesis) return null;

  const templateName = getTemplateLabel(thesis.type);
  const lintIssueCount = lintResult ? lintResult.all.length : 0;

  return (
    <motion.div variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTransition} className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Step {WIZARD_STEPS[5].id} of {WIZARD_STEPS.length}
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Preview and Export</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            Review your structured thesis, check lint status, and download your files.
          </p>
        </motion.div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {esc(templateName)}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {thesis.chapters.length} chapter{thesis.chapters.length !== 1 ? "s" : ""}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {totalWords.toLocaleString()} words</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {thesis.references.length} reference{thesis.references.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Progress Bar */}
      {isGenerating && (
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium flex items-center gap-1.5">
                {progress < 100 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                {progressLabel}
              </span>
              <span className="tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lint Banner (fixed 48px slot) */}
      <div className="h-12 flex items-center">
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
        {hasGenerated && !lintResult && (
          <div className="h-12" />
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
              {/* Left Sidebar (desktop only) */}
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
              <div ref={previewRef} className="flex-1 min-w-0 rounded-xl border border-border/50 bg-card/30 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 280px)" }}>
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
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground shrink-0">
                          Chapter {ch.number}
                        </span>
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
                          <li key={ref.id} className="text-sm leading-relaxed text-foreground/80 pl-6 -indent-6">
                            {formatRefHuman(ref, i)}
                          </li>
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
              <div className="max-h-[500px] overflow-auto p-4">
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
              <div className="max-h-[500px] overflow-auto p-4">
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
                        <div className="space-y-2 max-h-48 overflow-y-auto">
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
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {lintResult.warnings.map((issue) => (
                            <div key={issue.id} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--color-fill-warning)] border border-amber-500/20">
                              <code className="text-xs font-mono bg-[var(--color-fill-warning)] text-[var(--color-text-warning)] px-1 py-0.5 rounded shrink-0">{issue.id}</code>
                              <span className="text-xs">{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {lintResult.infos.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" /> Info ({lintResult.infos.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {lintResult.infos.map((issue) => (
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

      {/* Export Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" /> Download
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button onClick={handleExportZip} className="gap-2 text-xs font-semibold" size="lg" disabled={isGenerating}>
            {exportSuccess ? (<><Check className="w-4 h-4" /> Downloaded!</>) : (<><FileDown className="w-4 h-4" /> Export ZIP</>)}
          </Button>
          <Button variant="outline" onClick={handleExportTex} className="gap-2 text-xs" disabled={isGenerating}>
            <FileText className="w-4 h-4" /> main.tex only
          </Button>
          <Button variant="outline" onClick={handleExportBib} className="gap-2 text-xs" disabled={isGenerating || thesis.references.length === 0}>
            <BookOpen className="w-4 h-4" /> references.bib only
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ZIP includes: main.tex + references.bib + README.md with compilation instructions. Works on Overleaf, TeXStudio, or any LaTeX editor.
        </p>
      </div>
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
