"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Quote,
  BookOpen,
  FileText,
  Globe,
  FlaskConical,
  GraduationCap,
  Library,
  HelpCircle,
  Upload,
  ArrowDownAZ,
  ArrowUpZA,
  Search,
  Copy,
  AlertTriangle,
  Undo2,
  X,
  Check,
} from "lucide-react";
import type { ReferenceType, ThesisReference } from "@/lib/thesis-types";

// ============================================================
// Reference type configuration with colors for stripes & badges
// ============================================================

const refTypeConfig: Record<
  ReferenceType,
  {
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    badgeBg: string;
  }
> = {
  article: {
    label: "Journal Article",
    shortLabel: "Article",
    icon: FileText,
    color: "text-sky-500",
    bgColor: "bg-sky-500",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  },
  book: {
    label: "Book",
    shortLabel: "Book",
    icon: BookOpen,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
    badgeBg:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  inproceedings: {
    label: "Conference",
    shortLabel: "Conference",
    icon: Library,
    color: "text-violet-500",
    bgColor: "bg-violet-500",
    badgeBg:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  },
  techreport: {
    label: "Tech Report",
    shortLabel: "Tech Rpt",
    icon: FlaskConical,
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    badgeBg:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  thesis: {
    label: "Thesis",
    shortLabel: "Thesis",
    icon: GraduationCap,
    color: "text-rose-500",
    bgColor: "bg-rose-500",
    badgeBg:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  },
  online: {
    label: "Online Source",
    shortLabel: "Online",
    icon: Globe,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500",
    badgeBg:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
  },
  misc: {
    label: "Other",
    shortLabel: "Other",
    icon: HelpCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-500",
    badgeBg:
      "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700",
  },
};

// ============================================================
// Sort options
// ============================================================

type SortOrder = "default" | "year-asc" | "year-desc" | "author" | "type" | "title";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "default", label: "Order added" },
  { value: "year-asc", label: "Year (oldest first)" },
  { value: "year-desc", label: "Year (newest first)" },
  { value: "author", label: "Author A\u2013Z" },
  { value: "type", label: "Reference type" },
  { value: "title", label: "Title A\u2013Z" },
];

const SORT_CYCLE: SortOrder[] = [
  "default",
  "year-desc",
  "year-asc",
  "author",
  "type",
  "title",
];

// ============================================================
// BibTeX & plain-text import parsers
// ============================================================

function parseBibTeXEntries(text: string): ThesisReference[] {
  const refs: ThesisReference[] = [];
  const entries = text.match(/@\w+\{[^@]+\}/g);
  if (!entries) return refs;

  for (const entry of entries) {
    const typeMatch = entry.match(/@(\w+)/);
    const bibType = typeMatch?.[1]?.toLowerCase() ?? "";

    // Strip the @type{key, prefix to isolate fields
    const content = entry.replace(/@\w+\{[^,]*,?\s*/, "");

    // Extract fields: field = {value} or field = "value" or field = number
    const fieldRegex =
      /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|(\d[\d,]*))/g;
    const fields: Record<string, string> = {};
    let fm: RegExpExecArray | null;
    while ((fm = fieldRegex.exec(content)) !== null) {
      const key = fm[1].toLowerCase();
      const value = (fm[2] || fm[3] || fm[4] || "").trim();
      if (key && value) fields[key] = value;
    }

    // Map BibTeX type to ReferenceType
    let type: ReferenceType = "article";
    if (bibType === "book") type = "book";
    else if (
      bibType === "inproceedings" ||
      bibType === "conference"
    )
      type = "inproceedings";
    else if (bibType === "techreport" || bibType === "tech")
      type = "techreport";
    else if (
      bibType === "phdthesis" ||
      bibType === "mastersthesis" ||
      bibType === "thesis"
    )
      type = "thesis";
    else if (
      bibType === "online" ||
      bibType === "url" ||
      bibType === "electronic" ||
      bibType === "www"
    )
      type = "online";
    else if (bibType === "misc") type = "misc";

    const rawUrl =
      fields.url ||
      (fields.howpublished
        ? fields.howpublished.replace(/\\url\{|\}/g, "")
        : "");

    refs.push({
      id: `ref-bib-${refs.length}-${Date.now()}`,
      type,
      authors: fields.author || "",
      title: fields.title || "",
      year: fields.year || "",
      journal: fields.journal || fields.journaltitle || "",
      bookTitle: fields.booktitle || "",
      publisher: fields.publisher || fields.institution || "",
      volume: fields.volume || "",
      number: fields.number || "",
      pages: fields.pages || "",
      doi: fields.doi || "",
      url: rawUrl,
      edition: fields.edition || "",
      school: fields.school || "",
      note: fields.note || "",
    });
  }

  return refs;
}

function parsePlainLines(text: string): ThesisReference[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : "";
      const doiMatch = line.match(/(10\.\d{4,}\/[^\s,;]+)/);
      const doi = doiMatch ? doiMatch[1] : "";

      let remaining = line;
      if (doi) remaining = remaining.replace(doi, "");
      if (year) remaining = remaining.replace(year, "");

      // Try quoted title
      const titleMatch = remaining.match(
        /["\u201c\u201d]([^\u201c\u201d"]+)["\u201d\u201c]|'([^']+)'/,
      );
      let title = "";
      if (titleMatch) {
        title = (titleMatch[1] || titleMatch[2]).trim();
        remaining = remaining.replace(titleMatch[0], " ");
      }

      const parts = remaining
        .split(/[;,]/)
        .map((p) => p.trim())
        .filter(Boolean);
      let authors =
        parts[0]?.replace(/^\s*\d+[\.\)]\s*/, "") || "Unknown Author";

      if (!title) {
        title =
          parts
            .slice(1)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim() || "Untitled";
      }

      return {
        id: `ref-line-${idx}-${Date.now()}`,
        type: "article" as ReferenceType,
        authors: authors.replace(/[.,;:]+$/, "").trim(),
        title,
        year,
        doi,
      };
    });
}

function parseImportText(text: string): ThesisReference[] {
  const bibtex = parseBibTeXEntries(text);
  if (bibtex.length > 0) return bibtex;
  return parsePlainLines(text);
}

// ============================================================
// Validation helpers
// ============================================================

function isYearValid(year: string): boolean {
  if (!year) return true; // empty is ok
  return /^\d{4}$/.test(year);
}

function isDoiValid(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  return /^10\.\d{4,}\/\S+$/.test(value);
}

// ============================================================
// Component
// ============================================================

export function ReferenceEditor() {
  const {
    thesis,
    addReference,
    removeReference,
    updateReference,
    bulkImportReferences,
    undoDeleteReference,
    lastDeletedReference,
    nextStep,
    prevStep,
  } = useThesisStore();

  // ----- State (ALL hooks before conditional return) -----
  const [compactView, setCompactView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkImportText, setBulkImportText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ThesisReference[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [expandedRefId, setExpandedRefId] = useState<string | null>(null);

  // ----- Derived data (safe even when thesis is null) -----
  const references = thesis?.references ?? [];

  // Type distribution counts
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<ReferenceType, number>> = {};
    for (const ref of references) {
      counts[ref.type] = (counts[ref.type] || 0) + 1;
    }
    return counts;
  }, [references]);

  const activeTypes = useMemo(
    () =>
      (Object.entries(typeCounts) as [ReferenceType, number][]).filter(
        ([, c]) => c > 0,
      ),
    [typeCounts],
  );

  // Search filtering
  const filteredRefs = useMemo(() => {
    if (!searchQuery.trim()) return references;
    const q = searchQuery.toLowerCase();
    return references.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.authors?.toLowerCase().includes(q) ||
        r.year?.includes(q),
    );
  }, [references, searchQuery]);

  // Sorting
  const sortedRefs = useMemo(() => {
    const refs = [...filteredRefs];
    switch (sortOrder) {
      case "year-asc":
        return refs.sort(
          (a, b) =>
            parseInt(a.year || "0") - parseInt(b.year || "0"),
        );
      case "year-desc":
        return refs.sort(
          (a, b) =>
            parseInt(b.year || "0") - parseInt(a.year || "0"),
        );
      case "author":
        return refs.sort((a, b) =>
          (a.authors || "").localeCompare(b.authors || ""),
        );
      case "type":
        return refs.sort(
          (a, b) =>
            a.type.localeCompare(b.type) ||
            (a.year || "").localeCompare(b.year || ""),
        );
      case "title":
        return refs.sort((a, b) =>
          (a.title || "").localeCompare(b.title || ""),
        );
      default:
        return refs;
    }
  }, [filteredRefs, sortOrder]);

  // Duplicate detection map: refId → duplicate ref
  const duplicateMap = useMemo(() => {
    const map = new Map<string, ThesisReference>();
    for (const ref of references) {
      if (!ref.title?.trim() || !ref.year?.trim()) continue;
      const dup = references.find(
        (r) =>
          r.id !== ref.id &&
          r.title?.trim() === ref.title.trim() &&
          r.year?.trim() === ref.year?.trim(),
      );
      if (dup) map.set(ref.id, dup);
    }
    return map;
  }, [references]);

  // Current sort label
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortOrder)?.label ?? "Order added";

  // ----- Conditional return AFTER all hooks -----
  if (!thesis) return null;

  // ----- Handlers -----
  const findDuplicate = (refId: string): ThesisReference | null =>
    duplicateMap.get(refId) ?? null;

  const handleDuplicate = (ref: ThesisReference) => {
    const copy: ThesisReference = {
      ...ref,
      id: `ref-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${ref.title || "Untitled"} (Copy)`,
    };
    bulkImportReferences([copy]);
  };

  const handleParsePreview = () => {
    if (!bulkImportText.trim()) return;
    const parsed = parseImportText(bulkImportText);
    setImportPreview(parsed);
    setShowImportPreview(true);
  };

  const handleConfirmImport = () => {
    bulkImportReferences(importPreview);
    setBulkImportText("");
    setShowBulkImport(false);
    setShowImportPreview(false);
    setImportPreview([]);
  };

  const handleCancelImport = () => {
    setBulkImportText("");
    setShowBulkImport(false);
    setShowImportPreview(false);
    setImportPreview([]);
  };

  const handleSortCycle = () => {
    const idx = SORT_CYCLE.indexOf(sortOrder);
    setSortOrder(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  };

  const toggleCompactView = () => {
    setCompactView(!compactView);
    setExpandedRefId(null);
  };

  const handleDeleteReference = (id: string) => {
    removeReference(id);
    setDeleteConfirm(null);
    if (expandedRefId === id) setExpandedRefId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Step {WIZARD_STEPS[4].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          References &amp; Citations
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Add the sources cited in your thesis. Each reference will be
          formatted according to your chosen citation style.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ---------- Action Row 1: Buttons + Search ---------- */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1.5 text-sm"
            onClick={addReference}
          >
            <Plus className="w-4 h-4" />
            Add Reference
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-sm"
            onClick={() => setShowBulkImport(!showBulkImport)}
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8 text-xs"
              placeholder="Search by title, author, or year\u2026"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Count badge */}
          <Badge variant="secondary" className="text-[10px] font-medium shrink-0">
            {searchQuery.trim()
              ? `${sortedRefs.length} of ${references.length}`
              : `${references.length} reference${references.length !== 1 ? "s" : ""}`}
          </Badge>
        </div>

        {/* ---------- Action Row 2: Type pills + Sort + Compact toggle ---------- */}
        {references.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
            {/* Type distribution pills */}
            {activeTypes.map(([type, count]) => {
              const cfg = refTypeConfig[type];
              return (
                <Badge
                  key={type}
                  variant="outline"
                  className={`text-[10px] gap-1 ${cfg.badgeBg}`}
                >
                  {count} {cfg.shortLabel}
                  {count !== 1 ? "s" : ""}
                </Badge>
              );
            })}

            <div className="flex-1" />

            {/* Sort controls */}
            {references.length > 1 && (
              <>
                <Badge
                  variant="outline"
                  className="text-[10px] text-muted-foreground hidden sm:inline-flex"
                >
                  {sortOrder === "default" ? "" : "Sort: "}
                  {sortLabel}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleSortCycle}
                      >
                        {sortOrder === "year-asc" ? (
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                        ) : sortOrder === "year-desc" ? (
                          <ArrowUpZA className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Sort: {sortLabel}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Click to cycle sort order
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {/* Compact / Expand toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1 text-muted-foreground"
                    onClick={toggleCompactView}
                  >
                    {compactView ? "Expand All" : "Compact View"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>
                    {compactView
                      ? "Show full editor for each reference"
                      : "Show compact list view"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* ---------- Undo delete banner ---------- */}
        <AnimatePresence>
          {lastDeletedReference && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 p-3 rounded-lg border text-sm bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-amber-800 dark:text-amber-200 text-xs truncate">
                Reference &ldquo;{lastDeletedReference.title || "Untitled"}
                &rdquo; was deleted.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900 shrink-0"
                onClick={undoDeleteReference}
              >
                <Undo2 className="w-3 h-3" />
                Undo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Bulk Import Panel ---------- */}
        <AnimatePresence>
          {showBulkImport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">
                    Bulk Import References
                  </h3>

                  {!showImportPreview ? (
                    <>
                      <Textarea
                        value={bulkImportText}
                        onChange={(e) => setBulkImportText(e.target.value)}
                        className="text-xs min-h-[120px] font-mono"
                        placeholder={`Paste references here. Supports BibTeX or one-per-line:\n\n@article{smith2024,\n  author = {Smith, J.},\n  title = {A Great Paper},\n  journal = {Nature},\n  year = {2024}\n}\n\nDoe, J., "Data Science Handbook", Springer, 2023`}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Paste BibTeX entries or plain-text lines (one reference
                        per line). BibTeX is auto-detected and parsed for type,
                        authors, title, journal, year, and DOI.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setShowBulkImport(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="text-xs"
                          disabled={!bulkImportText.trim()}
                          onClick={handleParsePreview}
                        >
                          <Search className="w-3.5 h-3.5 mr-1" />
                          Parse &amp; Preview
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Import Preview */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-medium">
                            Parsed{" "}
                            <strong>{importPreview.length}</strong>{" "}
                            reference
                            {importPreview.length !== 1 ? "s" : ""}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-7 text-[10px]"
                            onClick={() => setShowImportPreview(false)}
                          >
                            Edit
                          </Button>
                        </div>

                        {importPreview.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                            No valid references found. Make sure each entry has
                            at least a title or author.
                          </p>
                        ) : (
                          <ScrollArea className="max-h-48">
                            <div className="space-y-1.5 pr-2">
                              {importPreview.map((ref, idx) => {
                                const cfg = refTypeConfig[ref.type];
                                const TypeIcon = cfg.icon;
                                return (
                                  <div
                                    key={`${ref.id}-${idx}`}
                                    className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/50"
                                  >
                                    <TypeIcon
                                      className={`w-3.5 h-3.5 ${cfg.color} shrink-0`}
                                    />
                                    <span className="truncate flex-1">
                                      <span className="font-medium">
                                        {ref.authors || "Unknown"}
                                      </span>
                                      {ref.authors ? " \u2014 " : ""}
                                      <span>
                                        {ref.title || "Untitled"}
                                      </span>
                                      {ref.year && (
                                        <span className="text-muted-foreground">
                                          {" "}
                                          ({ref.year})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={handleCancelImport}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="text-xs"
                          disabled={importPreview.length === 0}
                          onClick={handleConfirmImport}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Import {importPreview.length} reference
                          {importPreview.length !== 1 ? "s" : ""}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- References List ---------- */}
        <ScrollArea className="max-h-[calc(100vh-460px)]">
          <div className="space-y-3 pr-3">
            {references.length === 0 ? (
              /* ---- Empty state with guide ---- */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                      <Quote className="w-8 h-8 text-primary/30" />
                    </div>
                    <div className="text-center max-w-md space-y-2">
                      <h3 className="text-sm font-semibold">
                        No references yet
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Start building your bibliography. Add references manually
                        or bulk import from BibTeX and plain text.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={addReference}
                        className="gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add Reference
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowBulkImport(true)}
                        className="gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        Bulk Import
                      </Button>
                    </div>

                    {/* Example BibTeX */}
                    <div className="w-full max-w-md mt-2">
                      <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        Example BibTeX entries
                      </p>
                      <pre className="text-[10px] font-mono text-muted-foreground bg-muted/50 rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
{`@article{smith2024,
  author = {Smith, J. and Doe, A.},
  title = {Machine Learning Applications},
  journal = {Nature},
  year = {2024}
}

@book{johnson2023,
  author = {Johnson, R.},
  title = {Data Science Handbook},
  publisher = {Springer},
  year = {2023}
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : sortedRefs.length === 0 ? (
              /* ---- No search results ---- */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-10 space-y-2">
                    <Search className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No matching references
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      No references match &ldquo;{searchQuery}&rdquo;. Try a
                      different search term.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 text-xs"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* ---- Reference cards ---- */
              <AnimatePresence mode="popLayout">
                {sortedRefs.map((ref, index) => {
                  const typeConfig = refTypeConfig[ref.type];
                  const TypeIcon = typeConfig.icon;
                  const duplicate = findDuplicate(ref.id);
                  const isExpanded =
                    !compactView || expandedRefId === ref.id;
                  const yearValid = isYearValid(ref.year);
                  const doiValue = ref.doi || ref.url || "";
                  const doiValid = isDoiValid(doiValue);

                  return (
                    <motion.div
                      key={ref.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden hover:shadow-sm transition-shadow">
                        <CardContent className="p-0">
                          <div className="flex">
                            {/* Left color stripe */}
                            <div
                              className={`w-1.5 shrink-0 self-stretch ${typeConfig.bgColor}`}
                            />

                            <div className="p-4 space-y-0 flex-1 min-w-0">
                              {/* ---- Reference Header ---- */}
                              <div className="flex items-center gap-2 sm:gap-3">
                                {/* Number badge */}
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-muted-foreground">
                                    {index + 1}
                                  </span>
                                </div>

                                {/* Title + Author */}
                                <button
                                  type="button"
                                  className="flex-1 min-w-0 text-left"
                                  onClick={() => {
                                    if (compactView) {
                                      setExpandedRefId(
                                        expandedRefId === ref.id
                                          ? null
                                          : ref.id,
                                      );
                                    } else {
                                      setExpandedRefId(
                                        expandedRefId === ref.id
                                          ? null
                                          : ref.id,
                                      );
                                    }
                                  }}
                                >
                                  <p className="text-sm font-medium truncate leading-snug">
                                    {ref.title || "Untitled Reference"}
                                    {ref.title?.endsWith(" (Copy)") && (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}
                                        (Copy)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {ref.authors || "No author"}
                                    {ref.year
                                      ? ` (${ref.year})`
                                      : ""}
                                    {ref.journal && (
                                      <span className="text-muted-foreground/60">
                                        {" "}
                                        &middot; {ref.journal}
                                      </span>
                                    )}
                                    {ref.bookTitle && (
                                      <span className="text-muted-foreground/60">
                                        {" "}
                                        &middot; {ref.bookTitle}
                                      </span>
                                    )}
                                  </p>
                                </button>

                                {/* Duplicate warning badge */}
                                {duplicate && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 shrink-0 hidden sm:inline-flex"
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                    Duplicate
                                  </Badge>
                                )}

                                {/* Type badge */}
                                <Badge
                                  variant="outline"
                                  className="text-[9px] shrink-0 gap-1"
                                >
                                  <TypeIcon
                                    className={`w-3 h-3 ${typeConfig.color}`}
                                  />
                                  {typeConfig.label}
                                </Badge>

                                {/* Expand / Collapse toggle */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0"
                                        onClick={() =>
                                          setExpandedRefId(
                                            isExpanded && compactView
                                              ? null
                                              : isExpanded && !compactView
                                                ? ref.id
                                                : ref.id,
                                          )
                                        }
                                      >
                                        <motion.div
                                          animate={{
                                            rotate: isExpanded ? 180 : 0,
                                          }}
                                          transition={{
                                            duration: 0.2,
                                          }}
                                        >
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </motion.div>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>
                                        {isExpanded
                                          ? "Collapse"
                                          : "Expand"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {/* Duplicate button */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                                        onClick={() =>
                                          handleDuplicate(ref)
                                        }
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>Duplicate reference</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {/* Delete button */}
                                <Dialog
                                  open={deleteConfirm === ref.id}
                                  onOpenChange={(open) =>
                                    setDeleteConfirm(open ? ref.id : null)
                                  }
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Delete Reference
                                      </DialogTitle>
                                    </DialogHeader>
                                    <p className="text-sm text-muted-foreground">
                                      Are you sure you want to delete
                                      &ldquo;{ref.title || "Untitled"}
                                      &rdquo;?
                                    </p>
                                    <div className="flex justify-end gap-2 mt-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setDeleteConfirm(null)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                          handleDeleteReference(ref.id)
                                        }
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>

                              {/* ---- Duplicate inline warning (compact) ---- */}
                              {duplicate && isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="flex items-center gap-2 mt-2 px-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                      A reference with the same title and year
                                      already exists. Consider merging or
                                      differentiating them.
                                    </p>
                                  </div>
                                </motion.div>
                              )}

                              {/* ---- Animated Editor Fields ---- */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{
                                      height: 0,
                                      opacity: 0,
                                    }}
                                    animate={{
                                      height: "auto",
                                      opacity: 1,
                                    }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                      duration: 0.25,
                                      ease: "easeInOut",
                                    }}
                                    className="overflow-hidden"
                                  >
                                    <div className="space-y-3 pt-3">
                                      <Separator />

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Type */}
                                        <div className="space-y-1">
                                          <Label className="text-[10px] font-medium text-muted-foreground">
                                            Type
                                          </Label>
                                          <Select
                                            value={ref.type}
                                            onValueChange={(val) =>
                                              updateReference(ref.id, {
                                                type: val as ReferenceType,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {Object.entries(
                                                refTypeConfig,
                                              ).map(([key, cfg]) => (
                                                <SelectItem
                                                  key={key}
                                                  value={key}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <cfg.icon className="w-3 h-3" />
                                                    {cfg.label}
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* Authors */}
                                        <div className="space-y-1">
                                          <Label className="text-[10px] font-medium text-muted-foreground">
                                            Authors
                                          </Label>
                                          <Input
                                            value={ref.authors}
                                            onChange={(e) =>
                                              updateReference(ref.id, {
                                                authors: e.target.value,
                                              })
                                            }
                                            placeholder="Author, A. B. and Author, C."
                                            className="h-8 text-xs"
                                          />
                                        </div>

                                        {/* Title */}
                                        <div className="sm:col-span-2 space-y-1">
                                          <Label className="text-[10px] font-medium text-muted-foreground">
                                            Title
                                          </Label>
                                          <Input
                                            value={ref.title}
                                            onChange={(e) =>
                                              updateReference(ref.id, {
                                                title: e.target.value,
                                              })
                                            }
                                            placeholder="Title of the work"
                                            className="h-8 text-xs"
                                          />
                                        </div>

                                        {/* Journal / BookTitle (conditional) */}
                                        {(ref.type === "article" ||
                                          ref.type ===
                                            "inproceedings") && (
                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-medium text-muted-foreground">
                                              {ref.type === "article"
                                                ? "Journal"
                                                : "Conference / Book Title"}
                                            </Label>
                                            <Input
                                              value={
                                                ref.type === "article"
                                                  ? ref.journal || ""
                                                  : ref.bookTitle || ""
                                              }
                                              onChange={(e) =>
                                                updateReference(ref.id, {
                                                  [ref.type === "article"
                                                    ? "journal"
                                                    : "bookTitle"]:
                                                    e.target.value,
                                                })
                                              }
                                              placeholder={
                                                ref.type === "article"
                                                  ? "Journal Name"
                                                  : "Conference Proceedings"
                                              }
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                        )}

                                        {/* Publisher (book, techreport) */}
                                        {(ref.type === "book" ||
                                          ref.type === "techreport") && (
                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-medium text-muted-foreground">
                                              {ref.type === "book"
                                                ? "Publisher"
                                                : "Institution"}
                                            </Label>
                                            <Input
                                              value={
                                                ref.publisher || ""
                                              }
                                              onChange={(e) =>
                                                updateReference(ref.id, {
                                                  publisher:
                                                    e.target.value,
                                                })
                                              }
                                              placeholder={
                                                ref.type === "book"
                                                  ? "Publisher Name"
                                                  : "Organization name"
                                              }
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                        )}

                                        {/* Edition (book) */}
                                        {ref.type === "book" && (
                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-medium text-muted-foreground">
                                              Edition
                                            </Label>
                                            <Input
                                              value={
                                                ref.edition || ""
                                              }
                                              onChange={(e) =>
                                                updateReference(ref.id, {
                                                  edition:
                                                    e.target.value,
                                                })
                                              }
                                              placeholder="e.g., 3rd"
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                        )}

                                        {/* School (thesis) */}
                                        {ref.type === "thesis" && (
                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-medium text-muted-foreground">
                                              Institution / School
                                            </Label>
                                            <Input
                                              value={
                                                ref.school || ""
                                              }
                                              onChange={(e) =>
                                                updateReference(ref.id, {
                                                  school:
                                                    e.target.value,
                                                })
                                              }
                                              placeholder="University name"
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                        )}

                                        {/* Year with validation */}
                                        <div className="space-y-1">
                                          <Label className="text-[10px] font-medium text-muted-foreground">
                                            Year
                                          </Label>
                                          <Input
                                            value={ref.year}
                                            onChange={(e) => {
                                              const val = e.target.value
                                                .replace(/[^\d]/g, "")
                                                .slice(0, 4);
                                              updateReference(ref.id, {
                                                year: val,
                                              });
                                            }}
                                            placeholder="2024"
                                            className={`h-8 text-xs ${
                                              !yearValid
                                                ? "border-red-300 focus-visible:ring-red-300 dark:border-red-700"
                                                : ""
                                            }`}
                                            inputMode="numeric"
                                          />
                                          {!yearValid && (
                                            <p className="text-[10px] text-red-500">
                                              Year must be a 4-digit number
                                            </p>
                                          )}
                                        </div>

                                        {/* Volume / Number / Pages (article, inproceedings) */}
                                        {(ref.type === "article" ||
                                          ref.type ===
                                            "inproceedings") && (
                                          <>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] font-medium text-muted-foreground">
                                                Volume
                                              </Label>
                                              <Input
                                                value={
                                                  ref.volume || ""
                                                }
                                                onChange={(e) =>
                                                  updateReference(
                                                    ref.id,
                                                    {
                                                      volume:
                                                        e.target.value,
                                                    },
                                                  )
                                                }
                                                placeholder="e.g., 42"
                                                className="h-8 text-xs"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] font-medium text-muted-foreground">
                                                Pages
                                              </Label>
                                              <Input
                                                value={
                                                  ref.pages || ""
                                                }
                                                onChange={(e) =>
                                                  updateReference(
                                                    ref.id,
                                                    {
                                                      pages:
                                                        e.target.value,
                                                    },
                                                  )
                                                }
                                                placeholder="e.g., 1--15"
                                                className="h-8 text-xs"
                                              />
                                            </div>
                                          </>
                                        )}

                                        {/* DOI / URL with validation */}
                                        <div className="sm:col-span-2 space-y-1">
                                          <Label className="text-[10px] font-medium text-muted-foreground">
                                            DOI / URL
                                          </Label>
                                          <Input
                                            value={doiValue}
                                            onChange={(e) => {
                                              const val =
                                                e.target.value;
                                              const isUrl =
                                                val.startsWith("http");
                                              updateReference(
                                                ref.id,
                                                isUrl
                                                  ? {
                                                      url: val,
                                                      doi: undefined,
                                                    }
                                                  : {
                                                      doi: val,
                                                      url: undefined,
                                                    },
                                              );
                                            }}
                                            placeholder="https://doi.org/10.1234/example or https://..."
                                            className={`h-8 text-xs ${
                                              !doiValid
                                                ? "border-red-300 focus-visible:ring-red-300 dark:border-red-700"
                                                : ""
                                            }`}
                                          />
                                          {doiValue && !doiValid && (
                                            <p className="text-[10px] text-red-500">
                                              Invalid format. Enter a DOI
                                              (e.g. 10.XXXX/...) or a URL
                                              starting with https://
                                            </p>
                                          )}
                                        </div>

                                        {/* Note */}
                                        <div className="sm:col-span-2 space-y-1">
                                          <Label className="text-[10px] font-medium text-muted-foreground">
                                            Note (optional)
                                          </Label>
                                          <Input
                                            value={ref.note || ""}
                                            onChange={(e) =>
                                              updateReference(ref.id, {
                                                note: e.target.value,
                                              })
                                            }
                                            placeholder="Additional notes"
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* ---------- Navigation ---------- */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            className="text-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button type="submit" className="text-sm">
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}
