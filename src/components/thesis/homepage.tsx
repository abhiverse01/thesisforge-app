"use client";

import Image from "next/image";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { toast } from "sonner";
import { importFile, type ImportFileResult } from "@/core/importer";
import { loadDraft } from "@/core/persistence";
import { THESIS_TEMPLATES, getDefaultChapters, type ThesisType } from "@/lib/thesis-types";
import { Button } from "@/components/ui/button";
import { ImportReviewModal } from "@/components/thesis/ImportReviewModal";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ArrowRight,
  ClipboardList,
  Download,
  Upload,
  Zap,
  Users,
  Code2,
  Target,
  Clock,
  BarChart3,
  Network,
  Lightbulb,
  AlertTriangle,
  GitBranch,
  Type,
  Tag,
  Copy,
  Wand2,
  Share2,
  FileSearch,
  Lock,
  HardDrive,
  WifiOff,
  Globe,
  FileText,
  BookOpen,
  Brain,
  Mail,
  ExternalLink,
} from "lucide-react";

// ============================================================
// Data
// ============================================================

const wizardSteps = [
  { icon: ClipboardList, label: "Template", desc: "Choose your format" },
  { icon: Users, label: "Metadata", desc: "Fill in details" },
  { icon: FileText, label: "Chapters", desc: "Write content" },
  { icon: BookOpen, label: "References", desc: "Add citations" },
  { icon: Sparkles, label: "Format", desc: "Configure style" },
  { icon: Download, label: "Export", desc: "Download .tex" },
];

const algorithmCards = [
  { icon: Target, name: "Completeness Scorer", desc: "8-dimension thesis completeness check", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { icon: Clock, name: "Reading Stats", desc: "Word count, reading time, long sentences", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { icon: BarChart3, name: "Structure Analyzer", desc: "Chapter balance and word distribution", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { icon: Network, name: "Citation Graph", desc: "Reference coverage and citation mapping", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { icon: Lightbulb, name: "Writing Coach", desc: "23-check academic writing quality", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { icon: AlertTriangle, name: "Passive Voice", desc: "Overuse detection with examples", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { icon: GitBranch, name: "Transition Analyzer", desc: "Paragraph flow and connectivity", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { icon: Type, name: "Acronym Checker", desc: "Definition consistency tracking", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  { icon: Tag, name: "Keyword Extractor", desc: "TF-IDF keyword extraction and cross-check", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { icon: Copy, name: "Deduplicator", desc: "Reference fuzzy matching and merge suggestions", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { icon: Wand2, name: "LaTeX Heuristics", desc: "12 auto-fix rules for common LaTeX errors", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { icon: Share2, name: "Semantic Graph", desc: "Cross-chapter semantic similarity analysis", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  { icon: FileSearch, name: "Citation Parser", desc: "BibTeX field validation and normalization", color: "bg-lime-500/10 text-lime-600 dark:text-lime-400" },
];

const TEMPLATE_META: Record<ThesisType, { wordCount: string; timeEstimate: string }> = {
  bachelor: { wordCount: "10k–20k words", timeEstimate: "2–3 months" },
  master: { wordCount: "20k–40k words", timeEstimate: "4–6 months" },
  phd: { wordCount: "60k–100k words", timeEstimate: "1–3 years" },
  report: { wordCount: "3k–8k words", timeEstimate: "1–4 weeks" },
  conference: { wordCount: "4k–8k words", timeEstimate: "2–6 weeks" },
};

const whyFeatures = [
  { icon: Sparkles, title: "No LaTeX Knowledge Required", desc: "Write in plain text, get perfectly formatted LaTeX output automatically." },
  { icon: Globe, title: "Browser-Based, Zero Install", desc: "Everything runs in your browser. No downloads, no setup, no dependencies." },
  { icon: Brain, title: "13 Intelligence Analyzers", desc: "Completeness scoring, writing coach, citation graph, and 10 more analysis tools built in." },
  { icon: Download, title: "Export Ready for Overleaf", desc: "Generated .tex and .bib files are ready to upload to Overleaf and compile immediately." },
];

const trustCards = [
  { icon: Lock, title: "No Upload", desc: "Your thesis never leaves your browser. All generation runs locally with zero server uploads." },
  { icon: HardDrive, title: "Local Save", desc: "Drafts are saved to IndexedDB on your device. No cloud dependency, no account needed." },
  { icon: WifiOff, title: "Works Offline", desc: "After the first load, the entire app works without an internet connection." },
];

// ============================================================
// Section Configuration
// ============================================================

const SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "how-it-works", label: "How it works" },
  { id: "templates", label: "Templates" },
  { id: "intelligence", label: "AI Features" },
  { id: "privacy", label: "Privacy" },
  { id: "export", label: "Export" },
  { id: "why", label: "Why ThesisForge" },
] as const;

// ============================================================
// Animation Variants
// ============================================================

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const staggerContainerReduced = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0 },
  },
};

const itemFade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const itemFadeReduced = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0, transition: { duration: 0 } },
};

// ============================================================
// LaTeX Code Lines for Section 6
// ============================================================

const latexLines = [
  { tokens: [{ type: "cmd", text: "\\documentclass" }, { type: "opt", text: "[a4paper,12pt]" }, { type: "arg", text: "{report}" }] },
  { tokens: [{ type: "cmd", text: "\\usepackage" }, { type: "opt", text: "[utf8]" }, { type: "arg", text: "{inputenc}" }] },
  { tokens: [{ type: "cmd", text: "\\usepackage" }, { type: "opt", text: "[style=apa]" }, { type: "arg", text: "{biblatex}" }] },
  { tokens: [{ type: "cmd", text: "\\usepackage" }, { type: "arg", text: "{graphicx}" }] },
  { tokens: [{ type: "cmd", text: "\\usepackage" }, { type: "arg", text: "{hyperref}" }] },
  { tokens: [{ type: "cmd", text: "\\addbibresource" }, { type: "arg", text: "{references.bib}" }] },
  { tokens: [{ type: "plain", text: "" }] },
  { tokens: [{ type: "cmd", text: "\\title" }, { type: "arg", text: "{Your Thesis Title}" }] },
  { tokens: [{ type: "cmd", text: "\\author" }, { type: "arg", text: "{Author Name}" }] },
  { tokens: [{ type: "cmd", text: "\\date" }, { type: "arg", text: "{2025}" }] },
  { tokens: [{ type: "plain", text: "" }] },
  { tokens: [{ type: "cmd", text: "\\begin" }, { type: "opt", text: "{document}" }] },
  { tokens: [{ type: "cmd", text: "\\maketitle" }] },
  { tokens: [{ type: "cmd", text: "\\tableofcontents" }] },
  { tokens: [{ type: "plain", text: "" }] },
  { tokens: [{ type: "cmd", text: "\\chapter" }, { type: "arg", text: "{Introduction}" }] },
  { tokens: [{ type: "plain", text: "  Background and motivation for the research." }] },
  { tokens: [{ type: "plain", text: "" }] },
  { tokens: [{ type: "cmd", text: "\\chapter" }, { type: "arg", text: "{Literature Review}" }] },
  { tokens: [{ type: "plain", text: "  Review of related work and state of the art." }] },
  { tokens: [{ type: "plain", text: "" }] },
  { tokens: [{ type: "cmd", text: "\\chapter" }, { type: "arg", text: "{Methodology}" }] },
  { tokens: [{ type: "plain", text: "  Research design and data collection methods." }] },
  { tokens: [{ type: "plain", text: "" }] },
  { tokens: [{ type: "cmd", text: "\\printbibliography" }] },
  { tokens: [{ type: "cmd", text: "\\end" }, { type: "opt", text: "{document}" }] },
];

// ============================================================
// Animated Hero Logo — Split + Reveal on hover
// ============================================================

function HeroLogo() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      className="mb-3 flex justify-center"
    >
      <div
        className="group relative cursor-pointer inline-flex items-center justify-center"
        style={{ perspective: "800px" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchEnd={() => setTimeout(() => setHovered(false), 1500)}
      >
        <div
          className="relative flex items-center"
          style={{
            transition: "gap 600ms cubic-bezier(0.22,1,0.36,1)",
            gap: hovered ? "16px" : "0px",
          }}
        >
          {/* Logo card container */}
          <div
            className="w-20 h-20 rounded-2xl border flex items-center justify-center shrink-0 animate-[tf-float_4s_ease-in-out_infinite]"
            style={{
              background: "var(--color-fill-brand)",
              borderColor: "var(--color-border-brand)",
              borderStyle: "solid",
              borderWidth: "1px",
            }}
          >
            <Image
              src="/logo.png"
              alt="ThesisForge"
              width={64}
              height={64}
              className="w-9 h-9 object-contain"
              priority
              style={{
                transition: "transform 500ms cubic-bezier(0.22,1,0.36,1), opacity 400ms ease",
                transform: hovered ? "scale(1.08)" : "scale(1)",
                opacity: hovered ? 0 : 1,
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                clipPath: "inset(0 0 48% 0)",
                transformOrigin: "center bottom",
                transition: "opacity 500ms cubic-bezier(0.22,1,0.36,1), transform 600ms cubic-bezier(0.22,1,0.36,1)",
                opacity: hovered ? 1 : 0,
                transform: hovered ? "translateY(-3px)" : "translateY(0)",
              }}
            >
              <Image
                src="/logo.png"
                alt=""
                width={64}
                height={64}
                className="w-9 h-9 object-contain"
                aria-hidden="true"
                style={{
                  marginTop: "2px",
                  transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)",
                  transform: hovered ? "scale(1.1) rotate(-6deg)" : "scale(1) rotate(0deg)",
                }}
              />
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                clipPath: "inset(48% 0 0 0)",
                transformOrigin: "center top",
                transition: "opacity 500ms cubic-bezier(0.22,1,0.36,1), transform 600ms cubic-bezier(0.22,1,0.36,1)",
                opacity: hovered ? 1 : 0,
                transform: hovered ? "translateY(3px)" : "translateY(0)",
              }}
            >
              <Image
                src="/logo.png"
                alt=""
                width={64}
                height={64}
                className="w-9 h-9 object-contain"
                aria-hidden="true"
                style={{
                  marginTop: "-2px",
                  transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)",
                  transform: hovered ? "scale(1.1) rotate(6deg)" : "scale(1) rotate(0deg)",
                }}
              />
            </div>
            <div
              className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[1.5px] pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent, var(--c-brand-600), transparent)",
                transition: "opacity 500ms cubic-bezier(0.22,1,0.36,1)",
                opacity: hovered ? 1 : 0,
              }}
            />
          </div>
          {/* Brand text reveal */}
          <div
            className="overflow-hidden flex items-center"
            style={{
              maxWidth: hovered ? "200px" : "0px",
              opacity: hovered ? 1 : 0,
              transition: "max-width 600ms cubic-bezier(0.22,1,0.36,1), opacity 400ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div className="flex flex-col items-start whitespace-nowrap pl-4 pr-1">
              <span
                className="text-2xl font-semibold tracking-tight text-foreground"
                style={{
                  transition: "transform 600ms cubic-bezier(0.22,1,0.36,1), opacity 400ms ease",
                  transform: hovered ? "translateX(0)" : "translateX(12px)",
                  opacity: hovered ? 1 : 0,
                }}
              >
                Thesis<span style={{ color: "var(--c-brand-600)" }}>Forge</span>
              </span>
              <span
                className="text-[11px] text-muted-foreground -mt-0.5 tracking-wide"
                style={{
                  transition: "transform 600ms cubic-bezier(0.22,1,0.36,1) 80ms, opacity 400ms ease 80ms",
                  transform: hovered ? "translateX(0)" : "translateX(12px)",
                  opacity: hovered ? 1 : 0,
                }}
              >
                Free LaTeX Thesis Generator
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Homepage Component
// ============================================================

export function Homepage() {
  const router = useRouter();
  const { startWizard } = useThesisStore();
  const prefersReducedMotion = useReducedMotion();

  // --- Existing state ---
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportFileResult | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const thesisImportRef = useRef<HTMLInputElement>(null);
  const [hasSavedState, setHasSavedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // --- New state ---
  const [activeDot, setActiveDot] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState<ThesisType>("bachelor");
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Refs for section inView ---
  const stepsRef = useRef<HTMLElement>(null);
  const stepsInView = useInView(stepsRef, { once: true, margin: "-20%" });
  const intelRef = useRef<HTMLElement>(null);
  const intelInView = useInView(intelRef, { once: true, margin: "-20%" });
  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-20%" });

  // --- Existing effects ---
  useEffect(() => {
    setMounted(true);
    loadDraft()
      .then((result) => setHasSavedState(!!result?.thesis))
      .catch(() => setHasSavedState(false));
  }, []);

  // --- Scroll-based active section tracking ---
  // FIX: Replaced IntersectionObserver with scroll event listener.
  // IntersectionObserver with threshold [0.2, 0.5, 0.8] keeps the hero section
  // "active" even when scrolled past because 20% of the full-viewport hero
  // remains visible. Scroll listener checks which section's top is closest to
  // the scroll container's visible top, giving instant accurate tracking.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rootEl = document.querySelector('main.tf-content-area');
    const sections = container.querySelectorAll("[data-rail-section]");
    if (!sections.length || !rootEl) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rootRect = rootEl.getBoundingClientRect();
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < sections.length; i++) {
          const rect = sections[i].getBoundingClientRect();
          // Distance of section top from container visible top
          const dist = Math.abs(rect.top - rootRect.top);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        setActiveDot(bestIdx);
        ticking = false;
      });
    };

    rootEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Set initial state
    return () => rootEl.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Keyboard navigation ---
  const scrollToSection = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, SECTIONS.length - 1));
    const el = document.getElementById(SECTIONS[clamped].id);
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }, [prefersReducedMotion]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        scrollToSection(activeDot + 1);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToSection(activeDot - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeDot, scrollToSection]);

  // --- Animation helpers ---
  const stagger = prefersReducedMotion ? staggerContainerReduced : staggerContainer;
  const itemAnim = prefersReducedMotion ? itemFadeReduced : itemFade;

  // --- Template data for Section 3 ---
  const selectedTemplateData = THESIS_TEMPLATES.find((t) => t.type === activeTemplate);
  const templateChapters = getDefaultChapters(activeTemplate);

  const subtitleWords = [
    "Generate", "a", "complete", "LaTeX", "thesis", "in", "minutes.",
    "Export", ".tex", "+", ".bib", "ready", "for", "Overleaf.",
  ];

  return (
    <div className="relative">
      {/* ================================================================ */}
      {/* Snap Scroll Container */}
      {/* ================================================================ */}
      <div ref={containerRef} className="tf-snap-container">
        {/* ============================================================ */}
        {/* SECTION 1 — HERO */}
        {/* ============================================================ */}
        <section className="tf-snap-section min-h-[100dvh] min-h-[100svh] scroll-mt-16" id="hero" data-rail-section aria-labelledby="section-hero-heading">
          <div className="relative flex-1 flex items-center justify-center overflow-hidden px-4 sm:px-6">
            {/* Radial gradient orb — visible on both mobile and desktop */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <div
                className="w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full opacity-[0.08] sm:opacity-[0.06]"
                style={{
                  background: "radial-gradient(ellipse at center, oklch(0.65 0.22 264), transparent 70%)",
                }}
              />
            </div>

            <div className="relative max-w-3xl mx-auto text-center">
              {/* Logo */}
              <HeroLogo />

              {/* Badge pill */}
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-primary/8 text-primary border border-primary/15 mb-4"
              >
                Free &middot; No Account &middot; No Cloud
              </motion.span>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.1] text-balance mb-4"
                id="section-hero-heading"
              >
                {"Free LaTeX Thesis Generator".split(" ").map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{
                      duration: 0.35,
                      delay: mounted ? 0.2 + i * 0.04 : 0,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block mr-[0.22em]"
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-sm sm:text-[15px] text-muted-foreground max-w-xl mx-auto leading-relaxed mb-4"
              >
                {subtitleWords.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                    transition={{
                      duration: 0.25,
                      delay: mounted ? 0.45 + i * 0.03 : 0,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                    className="inline-block mr-[0.22em]"
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-col items-center gap-3 w-full max-w-md mx-auto mt-6 sm:mt-0"
              >
                {/* Primary CTA */}
                <Button
                  onClick={startWizard}
                  size="lg"
                  className="w-full h-12 px-6 rounded-2xl text-sm font-semibold gap-2.5 hover:scale-[1.02] active:scale-[0.98] transition-[transform,box-shadow] duration-200 surface-2 cta-pulse google-gradient border-0 shadow-md hover:shadow-lg hover:shadow-primary/25"
                >
                  <Zap className="w-4 h-4" />
                  Get Started &mdash; It&apos;s Free
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* Secondary actions */}
                <div className="flex items-center gap-2 w-full">
                  <input
                    ref={thesisImportRef}
                    type="file"
                    accept=".pdf,.tex,.docx,.doc,.md,.txt"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      e.target.value = "";
                      setImporting(true);
                      try {
                        if (files.length === 1) {
                          const result = await importFile(files[0]);
                          setImportResult(result);
                          setImportModalOpen(true);
                        } else {
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
                              toast.error(`Skipped "${file.name}": ${err.message || "Import failed"}`, { duration: 3000 });
                            }
                          }
                          if (bestResult) {
                            const mergedResult = {
                              ...bestResult,
                              result: { ...bestResult.result, chapters: allChapters, references: allReferences, warnings: [`Merged ${files.length} files`, ...allWarnings] },
                            };
                            setImportResult(mergedResult);
                            setImportModalOpen(true);
                          }
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Import failed", { duration: 3000 });
                      } finally {
                        setImporting(false);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => thesisImportRef.current?.click()}
                    disabled={importing}
                    className="flex-1 gap-2 h-12 min-h-[44px] px-4 text-sm border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors active:bg-primary/10"
                  >
                    {importing ? <span className="animate-spin">&#10227;</span> : <Upload className="w-4 h-4" />}
                    <span className="hidden sm:inline">Import Thesis</span>
                    <span className="sm:hidden">Import</span>
                  </Button>
                  <div className="w-px h-8 bg-border/40 flex-shrink-0" />
                  <Button
                    variant="outline"
                    onClick={() => router.push("/editor")}
                    className="flex-1 gap-2 h-12 min-h-[44px] px-4 text-sm border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-colors active:bg-primary/10"
                  >
                    <Code2 className="w-4 h-4 text-primary" />
                    <span className="hidden sm:inline">LaTeX Editor</span>
                    <span className="sm:hidden">Editor</span>
                  </Button>
                </div>
                <span className="text-[11px] text-muted-foreground/70">
                  Import supports .pdf, .tex, .docx, .md, .txt files
                </span>

                {/* Resume draft */}
                {hasSavedState && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                    onClick={async () => {
                      try {
                        const result = await loadDraft();
                        if (result?.thesis) {
                          useThesisStore.setState({
                            thesis: result.thesis,
                            selectedTemplate: result.templateId,
                            currentStep: Math.min(Math.max(result.step, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6,
                            wizardStarted: true,
                          });
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    className="group inline-flex items-center gap-2 px-4 py-3 rounded-full bg-primary/8 border border-primary/20 text-sm font-medium text-primary cursor-pointer hover:bg-primary/12 transition-colors min-h-[44px]"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Resume your thesis
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </motion.div>


            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 2 — HOW IT WORKS */}
        {/* ============================================================ */}
        <section ref={stepsRef} className="relative scroll-mt-16 py-16 sm:py-20" id="how-it-works" data-rail-section aria-labelledby="section-how-it-works-heading">
          <div className="px-4 sm:px-6">
            <div className="max-w-5xl w-full mx-auto">
              <div className="text-center mb-3">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={stepsInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4 }}
                  className="block tf-micro-label mb-2"
                >
                  How It Works
                </motion.span>
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="tf-heading mb-2 font-bold"
                  id="section-how-it-works-heading"
                >
                  Six steps to your thesis
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="text-sm sm:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed"
                >
                  A guided wizard walks you through every stage, from template to downloadable LaTeX.
                </motion.p>
              </div>

              {/* Desktop: 6 columns connected by line */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate={stepsInView ? "show" : "hidden"}
                className="hidden md:flex items-start justify-center relative"
              >
                {/* Connecting line behind steps */}
                <div className="absolute top-[18px] left-[calc(12.5%+18px)] right-[calc(12.5%+18px)] h-px bg-border/50" aria-hidden="true" />
                {wizardSteps.map((step, i) => (
                  <motion.div key={step.label} variants={itemAnim} className="flex-1 flex flex-col items-center relative z-10">
                    <div className="w-9 h-9 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center mb-3 relative">
                      <span className="text-xs font-bold font-mono text-primary tabular-nums">{i + 1}</span>
                    </div>
                    <step.icon className="w-[18px] h-[18px] text-primary mb-1.5" aria-hidden="true" />
                    <span className="text-sm font-semibold text-foreground text-center">{step.label}</span>
                    <span className="text-[13px] text-muted-foreground text-center mt-0.5">{step.desc}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Mobile: vertical list with left border line */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate={stepsInView ? "show" : "hidden"}
                className="md:hidden relative ml-4"
              >
                {/* Left border line */}
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/50" aria-hidden="true" />
                {wizardSteps.map((step, i) => (
                  <motion.div key={step.label} variants={itemAnim} className="flex items-start gap-4 py-4 relative">
                    {/* Dot on the line */}
                    <div className="w-[11px] h-[11px] rounded-full bg-background border-2 border-primary/40 flex items-center justify-center shrink-0 mt-0.5 relative z-10">
                      <span className="text-[7px] font-bold font-mono text-primary">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <step.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span className="text-sm font-semibold">{step.label}</span>
                      </div>
                      <span className="text-[13px] text-muted-foreground">{step.desc}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Start button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="text-center mt-4"
              >
                <Button
                  onClick={startWizard}
                  className="h-11 px-6 rounded-lg text-sm font-semibold gap-2 hover:scale-[1.02] transition-[transform,box-shadow] duration-200 bg-primary text-primary-foreground border-0 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] min-h-[44px]"
                >
                  Start with wizard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 3 — TEMPLATES */}
        {/* ============================================================ */}
        <section className="py-24 sm:py-32" id="templates" data-rail-section aria-labelledby="section-templates-heading">
          <div className="px-4 sm:px-6">
            <div className="max-w-5xl w-full mx-auto">
              <div className="text-center mb-5">
                <span className="block tf-micro-label mb-2">Templates</span>
                <h2 className="tf-heading mb-2 font-bold" id="section-templates-heading">Choose your format</h2>
                <p className="text-sm sm:text-[15px] text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Five academic template types with pre-configured chapter structures, formatting defaults, and realistic word counts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-4 md:gap-5">
                {/* Left: template list */}
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
                  {THESIS_TEMPLATES.map((tmpl) => {
                    const meta = TEMPLATE_META[tmpl.type];
                    return (
                      <button
                        key={tmpl.type}
                        onClick={() => setActiveTemplate(tmpl.type)}
                        className={cn(
                          "flex md:flex-col items-center md:items-start gap-3 md:gap-2.5 px-4 py-3 md:px-5 md:py-4 rounded-lg md:rounded-none text-left shrink-0 min-h-[44px] transition-all duration-150",
                          activeTemplate === tmpl.type
                            ? "border-l-[3px] border-l-primary bg-primary/8 shadow-sm"
                            : "border-l-[3px] border-l-transparent hover:bg-muted/50"
                        )}
                      >
                        <span className="text-xl" aria-hidden="true">{tmpl.icon}</span>
                        <div className="md:mt-1">
                          <span className={cn("text-sm font-semibold block", activeTemplate === tmpl.type ? "text-primary" : "text-foreground")}>
                            {tmpl.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground hidden md:block">
                            {tmpl.defaultStructure.chapterCount} chapters
                            {tmpl.defaultStructure.hasAppendix ? " + appendix" : ""}
                          </span>
                          <div className="hidden md:flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              {meta.wordCount}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {meta.timeEstimate}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right: preview panel */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTemplate}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 min-h-[380px] flex flex-col hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-300"
                  >
                    {selectedTemplateData && (() => {
                      const meta = TEMPLATE_META[selectedTemplateData.type];
                      return (
                        <>
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl" aria-hidden="true">{selectedTemplateData.icon}</span>
                              <div>
                                <h3 className="text-base font-semibold">{selectedTemplateData.name}</h3>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                                    <FileText className="w-3 h-3" />
                                    {meta.wordCount}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {meta.timeEstimate}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {selectedTemplateData.description}
                          </p>

                          {/* Chapter structure */}
                          <div className="mb-4">
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">
                              Chapter Structure
                            </span>
                            <div className="space-y-1.5">
                              {templateChapters.map((ch, i) => (
                                <div key={ch.id} className="flex items-center gap-2 text-[13px]">
                                  <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 tabular-nums">
                                    {i + 1}
                                  </span>
                                  <span className="text-muted-foreground">{ch.title}</span>
                                </div>
                              ))}
                              {selectedTemplateData.defaultStructure.hasAppendix && (
                                <div className="flex items-center gap-2 text-[13px]">
                                  <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">A</span>
                                  <span className="text-muted-foreground">Appendices</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Format defaults */}
                          <div className="mt-auto">
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">
                              Format Defaults
                            </span>
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                                {selectedTemplateData.defaultOptions.fontSize}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                                {selectedTemplateData.defaultOptions.paperSize}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                                {selectedTemplateData.defaultOptions.lineSpacing} spacing
                              </span>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                                {selectedTemplateData.defaultOptions.citationStyle?.toUpperCase() ?? "APA"} citations
                              </span>
                              {selectedTemplateData.defaultOptions.includeGlossary && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                                  glossary
                                </span>
                              )}
                            </div>
                            <Button
                              onClick={startWizard}
                              className="w-full h-10 rounded-lg text-sm font-semibold gap-2 hover:scale-[1.01] transition-[transform,box-shadow] duration-200 bg-primary text-primary-foreground border-0 hover:shadow-md hover:shadow-primary/15 active:scale-[0.98] min-h-[44px]"
                            >
                              Start with this template
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 4 — INTELLIGENCE / AI FEATURES */}
        {/* ============================================================ */}
        <section ref={intelRef} className="py-24 sm:py-32" id="intelligence" data-rail-section aria-labelledby="section-intelligence-heading">
          <div className="px-4 sm:px-6">
            <div className="max-w-6xl w-full mx-auto">
              <div className="text-center mb-5">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={intelInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4 }}
                  className="block tf-micro-label mb-2"
                >
                  AI Features
                </motion.span>
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={intelInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="tf-heading mb-2 font-bold"
                  id="section-intelligence-heading"
                >
                  13 Intelligence Algorithms
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={intelInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="text-sm sm:text-[15px] text-muted-foreground max-w-lg mx-auto leading-relaxed"
                >
                  Every thesis is analyzed by 13 specialized algorithms that check structure, quality, citations, and LaTeX correctness.
                </motion.p>
              </div>

              <motion.div
                variants={stagger}
                initial="hidden"
                animate={intelInView ? "show" : "hidden"}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
              >
                {algorithmCards.map((algo) => (
                  <motion.div
                    key={algo.name}
                    variants={itemAnim}
                    className="group relative flex items-start gap-3 p-5 sm:p-6 rounded-xl border border-border/40 bg-card/50 hover:bg-card/80 hover:border-primary/20 hover:shadow-sm transition-all duration-150 overflow-hidden"
                  >
                    {/* Subtle gradient shimmer on hover */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.03]" />
                    <div className={cn("shrink-0 w-11 h-11 rounded-lg flex items-center justify-center relative z-[1]", algo.color)}>
                      <algo.icon className="w-[18px] h-[18px]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 relative z-[1]">
                      <h3 className="text-sm font-medium mb-0.5">{algo.name}</h3>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{algo.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Summary stats bar */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={intelInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-8 flex justify-center"
              >
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-muted/60 border border-border/40 text-xs font-medium text-muted-foreground">
                  <span className="text-foreground font-semibold">13</span> Algorithms
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-foreground font-semibold">8</span> Quality Dimensions
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-foreground font-semibold">23</span> Writing Checks
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-foreground font-semibold">12</span> Auto-fix Rules
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 5 — PRIVACY & TRUST */}
        {/* ============================================================ */}
        <section className="py-20 sm:py-24" id="privacy" data-rail-section aria-labelledby="section-privacy-heading">
          <div className="px-4 sm:px-6">
            <div className="max-w-3xl w-full mx-auto">
              <div className="text-center mb-3">
                <span className="block tf-micro-label mb-2">Privacy &amp; Trust</span>
                <h2 className="tf-heading mb-2 font-bold" id="section-privacy-heading">Your thesis stays yours</h2>
                <p className="text-sm sm:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                  No account. No cloud. Your thesis data never leaves your browser.
                </p>
              </div>

              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-20%" }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {trustCards.map((card) => (
                  <motion.div
                    key={card.title}
                    variants={itemAnim}
                    className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 text-center hover:bg-card hover:border-primary/15 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <card.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5">{card.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Technical note */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="text-center font-mono text-[10px] text-muted-foreground/50 mt-4 tracking-wide"
              >
                IndexedDB &middot; Web Workers &middot; No external API calls
              </motion.p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 6 — EXPORT & EDITOR */}
        {/* ============================================================ */}
        <section className="py-20 sm:py-24" id="export" data-rail-section aria-labelledby="section-export-heading">
          <div className="px-4 sm:px-6">
            <div className="max-w-3xl w-full mx-auto">
              <div className="text-center mb-3">
                <span className="block tf-micro-label mb-2">Export &amp; Editor</span>
                <h2 className="tf-heading mb-2 font-bold" id="section-export-heading">Production-ready LaTeX</h2>
                <p className="text-sm sm:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Download compilable .tex and .bib files that open directly in Overleaf.
                </p>
              </div>

              {/* LaTeX code preview */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <Globe className="w-3 h-3" />
                    Overleaf Compatible
                  </div>
                  <span className="text-xs text-muted-foreground">main.tex</span>
                </div>
                <div className="rounded-xl border border-border/30 bg-foreground/[0.03] dark:bg-foreground/95 p-4 sm:p-5 overflow-x-auto max-h-[45vh] overflow-y-auto">
                  <pre className="font-mono text-xs sm:text-[13px] leading-[1.7]">
                    <code>
                      {latexLines.map((line, i) => (
                        <span key={i} className="block">
                          {line.tokens.map((token, j) => {
                            switch (token.type) {
                              case "cmd":
                                return <span key={j} className="text-[oklch(0.72_0.14_200)]">{token.text}</span>;
                              case "opt":
                                return <span key={j} className="text-[oklch(0.68_0.12_150)]">{token.text}</span>;
                              case "arg":
                                return <span key={j} className="text-[oklch(0.80_0.06_80)]">{token.text}</span>;
                              default:
                                return <span key={j}>{token.text}</span>;
                            }
                          })}
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>
              </motion.div>

              {/* Compatibility badge */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-center mt-3"
              >
                <span className="inline-flex items-center gap-3 px-4 py-2 rounded-full text-xs font-medium bg-muted/60 border border-border/40 text-muted-foreground">
                  Compiles on Overleaf &middot; .tex + .bib &middot; ZIP
                </span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 7 — WHY THESISFORGE + FOOTER */}
        {/* ============================================================ */}
        <section className="py-20 sm:py-24" id="why" data-rail-section aria-labelledby="section-why-heading">
          <div className="px-4 sm:px-6">
            <div className="max-w-5xl w-full mx-auto">
            {/* CTA content */}
            <div ref={ctaRef} className="text-center max-w-xl mx-auto flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={ctaInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              >
                {/* Badge */}
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
                  Free forever. No account.
                </span>

                <h2 className="tf-heading mb-3 font-bold text-pretty" id="section-why-heading">
                  Start your thesis today.
                </h2>
                <p className="text-sm sm:text-[15px] text-muted-foreground max-w-sm mx-auto leading-relaxed mb-3">
                  Generate professional, compilable LaTeX code in minutes. No LaTeX experience needed.
                </p>

                <Button
                  onClick={startWizard}
                  size="lg"
                  className="h-14 px-10 rounded-2xl text-base font-semibold gap-2.5 hover:scale-[1.03] transition-[transform,box-shadow] duration-200 surface-2 cta-pulse google-gradient border-0 shadow-lg hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98]"
                >
                  <Zap className="w-5 h-5" />
                  Start Building Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>

            {/* Feature Cards — Why ThesisForge */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate={ctaInView ? "show" : "hidden"}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl w-full mx-auto mt-4 mb-4"
            >
              {whyFeatures.map((card) => (
                <motion.div
                  key={card.title}
                  variants={itemAnim}
                  className="bg-muted/20 rounded-xl border border-border/50 p-4 hover:border-primary/20 hover:bg-muted/30 transition-colors duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <card.icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold mb-0.5">{card.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            </div>{/* end max-w-5xl wrapper */}
          </div>
        </section>
      </div>

      {/* ============================================================ */}
      {/* Footer — Polished, Production-Grade Design */}
      {/* ============================================================ */}
      <footer className="w-full shrink-0 border-t border-border/30 relative overflow-hidden">
        {/* Gradient glow line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 2%, oklch(0.50 0.22 264 / 0.3) 25%, oklch(0.60 0.18 305 / 0.25) 50%, oklch(0.50 0.22 264 / 0.2) 75%, transparent 98%)',
          }}
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          {/* Top row: Brand + Developer credit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-8">
            {/* Brand identity — enhanced with subtle glow */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border"
                style={{
                  background: "var(--color-fill-brand)",
                  borderColor: "var(--color-border-brand)",
                  borderStyle: "solid",
                  borderWidth: "1px",
                }}
              >
                <Image src="/logo.png" alt="ThesisForge" width={24} height={24} className="w-6 h-6 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground tracking-tight">Thesis<span className="text-primary">Forge</span></span>
                <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  Free &middot; Open Source &middot; Works Offline
                </span>
              </div>
            </div>

            {/* Developer credit — refined pill */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-muted/30 border border-border/25 hover:bg-muted/50 hover:border-border/40 transition-all duration-200">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.50 0.22 264 / 0.12), oklch(0.60 0.18 305 / 0.12))',
                    border: '1px solid oklch(0.50 0.22 264 / 0.15)',
                  }}
                >
                  <span className="text-[10px] font-bold text-primary">AS</span>
                </div>
                <a
                  href="https://abhishekshah.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Abhishek Shah
                </a>
              </div>
              <div className="flex items-center gap-0.5">
                <a
                  href="mailto:abhishek.aimarine@gmail.com"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all duration-200"
                  title="Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://abhishekshah.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all duration-200"
                  title="Portfolio"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Navigation links — 4-column grid */}
          <nav className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-8" aria-label="Footer navigation">
            {/* Templates */}
            <div>
              <h4 className="text-[11px] font-bold text-foreground/80 uppercase tracking-widest mb-3">Templates</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Bachelor's Thesis", href: "/templates/bachelors" },
                  { label: "Master's Thesis", href: "/templates/masters" },
                  { label: "PhD Dissertation", href: "/templates/phd" },
                  { label: "Research Report", href: "/templates/research-report" },
                  { label: "Conference Paper", href: "/templates/conference" },
                ].map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-sm text-muted-foreground/70 hover:text-primary transition-colors duration-150">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Citation Styles */}
            <div>
              <h4 className="text-[11px] font-bold text-foreground/80 uppercase tracking-widest mb-3">Citation Styles</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "APA Style", href: "/citation-styles/apa" },
                  { label: "IEEE Style", href: "/citation-styles/ieee" },
                  { label: "Chicago Style", href: "/citation-styles/chicago" },
                  { label: "Harvard Style", href: "/citation-styles/harvard" },
                  { label: "Vancouver Style", href: "/citation-styles/vancouver" },
                ].map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-sm text-muted-foreground/70 hover:text-primary transition-colors duration-150">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Guides */}
            <div>
              <h4 className="text-[11px] font-bold text-foreground/80 uppercase tracking-widest mb-3">Guides</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "ThesisForge vs Overleaf", href: "/vs/overleaf" },
                  { label: "LaTeX vs Word for Thesis", href: "/vs/word" },
                  { label: "Blog & Guides", href: "/blog" },
                  { label: "LaTeX Editor", href: "/editor" },
                ].map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-sm text-muted-foreground/70 hover:text-primary transition-colors duration-150">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-[11px] font-bold text-foreground/80 uppercase tracking-widest mb-3">Legal</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Terms & Conditions", href: "/terms" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Cookie Policy", href: "/cookies" },
                  { label: "Acceptable Use", href: "/acceptable-use" },
                ].map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-sm text-muted-foreground/70 hover:text-primary transition-colors duration-150">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Bottom bar — version + pipeline + copyright */}
          <div className="border-t border-border/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono font-semibold text-primary/60 bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded">v2.0</span>
              <span className="text-[11px] text-muted-foreground/30">
                Paste &rarr; <code className="font-mono text-[10px] bg-muted/40 text-muted-foreground/40 px-1.5 py-0.5 rounded">.tex</code> &rarr; Compile &rarr; PDF
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground/25">
              &copy; {new Date().getFullYear()} ThesisForge by Abhishek Shah
            </span>
          </div>
        </div>
      </footer>

      {/* ================================================================ */}
      {/* Scroll Dot Navigation */}
      {/* ================================================================ */}
      <div className="tf-scroll-dots" aria-label="Section navigation">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            className={cn("tf-scroll-dot", activeDot === i && "tf-scroll-dot--active")}
            onClick={() => scrollToSection(i)}
            aria-label={s.label}
          />
        ))}
      </div>

      {/* Import Review Modal */}
      <ImportReviewModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        imported={importResult}
      />
    </div>
  );
}
