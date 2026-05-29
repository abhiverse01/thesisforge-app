"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Pencil,
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
  Search,
  Copy,
  X,
  Zap,
  AlertTriangle,
  Check,
  ChevronRight,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import type { ReferenceType, ThesisReference, ThesisType } from "@/lib/thesis-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MIN_REFERENCES } from "@/lib/thesis-types";
import { detectDuplicatesWithMerge } from "@/intelligence/deduplicator";

// ============================================================
// Reference type configuration
// ============================================================

const refTypeConfig: Record<
  ReferenceType,
  {
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }
> = {
  article: {
    label: "Journal Article",
    shortLabel: "Article",
    icon: FileText,
    color: "text-[var(--c-brand-600,#534AB7)]",
    bgColor: "bg-[var(--c-brand-600,#534AB7)]",
  },
  book: {
    label: "Book",
    shortLabel: "Book",
    icon: BookOpen,
    color: "text-[var(--color-text-success)]",
    bgColor: "bg-[var(--color-text-success)]",
  },
  inproceedings: {
    label: "Conference",
    shortLabel: "Conference",
    icon: Library,
    color: "text-violet-500",
    bgColor: "bg-violet-500",
  },
  techreport: {
    label: "Tech Report",
    shortLabel: "Tech Rpt",
    icon: FlaskConical,
    color: "text-[var(--color-text-warning)]",
    bgColor: "bg-[var(--color-text-warning)]",
  },
  thesis: {
    label: "Thesis",
    shortLabel: "Thesis",
    icon: GraduationCap,
    color: "text-rose-500",
    bgColor: "bg-rose-500",
  },
  online: {
    label: "Online Source",
    shortLabel: "Online",
    icon: Globe,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500",
  },
  dataset: {
    label: "Dataset",
    shortLabel: "Dataset",
    icon: FlaskConical,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
  },
  software: {
    label: "Software",
    shortLabel: "Software",
    icon: Zap,
    color: "text-orange-500",
    bgColor: "bg-orange-500",
  },
  misc: {
    label: "Other",
    shortLabel: "Other",
    icon: HelpCircle,
    color: "text-slate-500",
    bgColor: "bg-slate-500",
  },
};

function typeColorClass(type: ReferenceType): string {
  const map: Partial<Record<ReferenceType, string>> = {
    article: "bg-[var(--c-brand-600,#534AB7)]/10 text-[var(--c-brand-600,#534AB7)]",
    book: "bg-[var(--color-text-success)]/10 text-[var(--color-text-success)]",
    inproceedings: "bg-violet-500/10 text-violet-500",
    techreport: "bg-[var(--color-text-warning)]/10 text-[var(--color-text-warning)]",
    thesis: "bg-rose-500/10 text-rose-500",
    online: "bg-cyan-500/10 text-cyan-500",
    dataset: "bg-emerald-500/10 text-emerald-500",
    software: "bg-orange-500/10 text-orange-500",
    misc: "bg-slate-500/10 text-slate-500",
  };
  return map[type] || "bg-muted text-muted-foreground";
}

// ============================================================
// Sort options (3 max)
// ============================================================

type SortOrder = "default" | "year-desc" | "author";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "default", label: "Order added" },
  { value: "year-desc", label: "Year (newest first)" },
  { value: "author", label: "Author A\u2013Z" },
];

const SORT_CYCLE: SortOrder[] = ["default", "year-desc", "author"];

// ============================================================
// BibTeX & plain-text import parsers
// ============================================================

function detectCitationFormat(raw: string): 'bibtex' | 'vancouver' | 'mla' | 'apa' {
  if (raw.trim().startsWith("@")) return "bibtex";
  if (/^\w+\s\w,/.test(raw)) return "vancouver";
  if (/^"[^"]+"\s/.test(raw.trim())) return "mla";
  return "apa";
}

function parseVancouverLine(line: string, idx: number): ThesisReference {
  const yearMatch = line.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : "";
  const firstDot = line.indexOf('. ');
  let authors = "Unknown Author";
  let remaining = line;
  if (firstDot > 0) {
    authors = line.slice(0, firstDot).trim();
    remaining = line.slice(firstDot + 2);
  }
  const secondDot = remaining.indexOf('. ');
  let title = "";
  if (secondDot > 0) {
    title = remaining.slice(0, secondDot).trim();
    remaining = remaining.slice(secondDot + 2);
  } else {
    title = remaining.replace(/[.;,]+\s*$/, '').trim();
    remaining = "";
  }
  if (!title) {
    title = remaining ? remaining.split(/[\d;]/)[0].trim() : "Untitled";
  }
  const journalMatch = remaining.match(/^([^.]+?)[.;,]/);
  const journal = journalMatch ? journalMatch[1].trim() : undefined;
  return {
    id: `ref-line-${idx}-${Date.now()}`,
    type: "article" as ReferenceType,
    authors: authors.replace(/[.,;:]+$/, "").trim(),
    title,
    year,
    journal,
  };
}

function parseMlaLine(line: string, idx: number): ThesisReference {
  const yearMatch = line.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : "";
  const doiMatch = line.match(/(10\.\d{4,}\/[^\s,;]+)/);
  const doi = doiMatch ? doiMatch[1] : "";
  const titleMatch = line.match(/["\u201c\u201d]([^\u201c\u201d"]+)["\u201d\u201c]/);
  let title = "";
  if (titleMatch) {
    title = titleMatch[1].trim();
  }
  let authors = "Unknown Author";
  if (titleMatch) {
    const beforeTitle = line.slice(0, titleMatch.index).replace(/[.,;:]+$/, "").trim();
    if (beforeTitle) authors = beforeTitle;
  }
  let journal: string | undefined;
  if (titleMatch) {
    const afterTitle = line.slice((titleMatch.index || 0) + titleMatch[0].length);
    const journalMatch = afterTitle.match(/^\.\s*([^,]+)/);
    if (journalMatch) {
      journal = journalMatch[1].replace(/^["\s]+/, "").trim();
    }
  }
  return {
    id: `ref-line-${idx}-${Date.now()}`,
    type: "article" as ReferenceType,
    authors,
    title,
    year,
    doi,
    journal,
  };
}

function parseBibTeXEntries(text: string): ThesisReference[] {
  const refs: ThesisReference[] = [];
  const entries = text.match(/@\w+\{[^@]+\}/g);
  if (!entries) return refs;
  for (const entry of entries) {
    const typeMatch = entry.match(/@(\w+)/);
    const bibType = typeMatch?.[1]?.toLowerCase() ?? "";
    const content = entry.replace(/@\w+\{[^,]*,?\s*/, "");
    const fieldRegex =
      /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|(\d[\d,]*))/g;
    const fields: Record<string, string> = {};
    let fm: RegExpExecArray | null;
    while ((fm = fieldRegex.exec(content)) !== null) {
      const key = fm[1].toLowerCase();
      const value = (fm[2] || fm[3] || fm[4] || "").trim();
      if (key && value) fields[key] = value;
    }
    let type: ReferenceType = "article";
    if (bibType === "book") type = "book";
    else if (bibType === "inproceedings" || bibType === "conference") type = "inproceedings";
    else if (bibType === "techreport" || bibType === "tech") type = "techreport";
    else if (bibType === "phdthesis" || bibType === "mastersthesis" || bibType === "thesis") type = "thesis";
    else if (bibType === "online" || bibType === "url" || bibType === "electronic" || bibType === "www") type = "online";
    else if (bibType === "misc") type = "misc";
    const rawUrl = fields.url || (fields.howpublished ? fields.howpublished.replace(/\\url\{|\}/g, "") : "");
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
  const format = detectCitationFormat(text);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (format === 'vancouver') {
    return lines.map((line, idx) => parseVancouverLine(line, idx));
  }
  if (format === 'mla') {
    return lines.map((line, idx) => parseMlaLine(line, idx));
  }
  return lines.map((line, idx) => {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : "";
      const doiMatch = line.match(/(10\.\d{4,}\/[^\s,;]+)/);
      const doi = doiMatch ? doiMatch[1] : "";
      let remaining = line;
      if (doi) remaining = remaining.replace(doi, "");
      if (year) remaining = remaining.replace(year, "");
      const titleMatch = remaining.match(/["\u201c\u201d]([^\u201c\u201d"]+)["\u201d\u201c]|'([^']+)'/);
      let title = "";
      if (titleMatch) {
        title = (titleMatch[1] || titleMatch[2]).trim();
        remaining = remaining.replace(titleMatch[0], " ");
      }
      const parts = remaining.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
      let authors = parts[0]?.replace(/^\s*\d+[\.\)]\s*/, "") || "Unknown Author";
      if (!title) {
        title = parts.slice(1).join(" ").replace(/\s+/g, " ").trim() || "Untitled";
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
  if (!year) return true;
  return /^\d{4}$/.test(year);
}

// ============================================================
// BibTeX Preview Generator
// ============================================================

function generateBibTeXPreview(ref: ThesisReference): string {
  const bibType = ref.type === 'inproceedings' ? 'inproceedings' :
                 ref.type === 'techreport' ? 'techreport' :
                 ref.type === 'thesis' ? 'phdthesis' : ref.type;
  const fields: string[] = [];
  if (ref.authors) fields.push(`  author = {${ref.authors}}`);
  if (ref.title) fields.push(`  title = {${ref.title}}`);
  if (ref.journal) fields.push(`  journal = {${ref.journal}}`);
  if (ref.bookTitle) fields.push(`  booktitle = {${ref.bookTitle}}`);
  if (ref.year) fields.push(`  year = {${ref.year}}`);
  if (ref.volume) fields.push(`  volume = {${ref.volume}}`);
  if (ref.number) fields.push(`  number = {${ref.number}}`);
  if (ref.pages) fields.push(`  pages = {${ref.pages}}`);
  if (ref.publisher) fields.push(`  publisher = {${ref.publisher}}`);
  if (ref.school) fields.push(`  school = {${ref.school}}`);
  if (ref.doi) fields.push(`  doi = {${ref.doi}}`);
  if (ref.url) fields.push(`  url = {${ref.url}}`);
  if (ref.note) fields.push(`  note = {${ref.note}}`);
  if (ref.edition) fields.push(`  edition = {${ref.edition}}`);
  const label = ref.authors ? ref.authors.split(/[,;]/)[0]?.trim().split(' ').pop()?.toLowerCase() : 'key';
  const yearSuffix = ref.year || 'XXXX';
  return `@${bibType}{${label}${yearSuffix},\n${fields.join(',\n')}\n}`;
}

// ============================================================
// Component
// ============================================================

export function ReferenceEditor() {
  const thesis = useThesisStore(s => s.thesis);
  const selectedTemplate = useThesisStore(s => s.selectedTemplate);
  const addReference = useThesisStore(s => s.addReference);
  const removeReference = useThesisStore(s => s.removeReference);
  const updateReference = useThesisStore(s => s.updateReference);
  const bulkImportReferences = useThesisStore(s => s.bulkImportReferences);

  // ----- State (ALL hooks before conditional return) -----
  const [compactView, setCompactView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [typeFilter, setTypeFilter] = useState<ReferenceType | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkImportText, setBulkImportText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [expandedRefId, setExpandedRefId] = useState<string | null>(null);
  const [parsedFields, setParsedFields] = useState<Set<string>>(new Set());
  const [quickAddInput, setQuickAddInput] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const quickAddIgnoreBlur = useRef(false);

  // ----- Derived data (safe even when thesis is null) -----
  const references = thesis?.references ?? [];
  const minRefs = selectedTemplate ? MIN_REFERENCES[selectedTemplate] : 0;

  // ----- Duplicate detection -----
  const { duplicates, mergeSuggestions } = useMemo(() => {
    if (references.length < 2) return { duplicates: [], mergeSuggestions: [] };
    return detectDuplicatesWithMerge(references);
  }, [references]);

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

  // Search + type filtering
  const filteredRefs = useMemo(() => {
    let result = references;
    if (typeFilter !== 'all') result = result.filter(r => r.type === typeFilter);
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.authors?.toLowerCase().includes(q) ||
        r.year?.includes(q),
    );
  }, [references, searchQuery, typeFilter]);

  // Sorting
  const sortedRefs = useMemo(() => {
    const refs = [...filteredRefs];
    switch (sortOrder) {
      case "year-desc":
        return refs.sort((a, b) => parseInt(b.year || "0") - parseInt(a.year || "0"));
      case "author":
        return refs.sort((a, b) => (a.authors || "").localeCompare(b.authors || ""));
      default:
        return refs;
    }
  }, [filteredRefs, sortOrder]);

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortOrder)?.label ?? "Order added";

  // Type filter button labels — derived from active types for the filter pills
  const typeFilterPills = useMemo(() => {
    const activeTypeKeys = (Object.entries(typeCounts) as [ReferenceType, number][])
      .filter(([, c]) => c > 0)
      .map(([t]) => t);
    const ordered: ReferenceType[] = ['article', 'book', 'inproceedings'];
    return ordered
      .filter(t => activeTypeKeys.includes(t) || t === 'misc')
      .map(t => ({
        type: t as ReferenceType,
        label: refTypeConfig[t].shortLabel,
        count: typeCounts[t] || 0,
      }));
  }, [typeCounts]);

  // The reference currently being edited in the Sheet
  const editingRef = editingRefId ? references.find(r => r.id === editingRefId) : null;

  // ----- Conditional return AFTER all hooks -----
  if (!thesis) return null;

  // ----- Handlers -----
  const handleDuplicate = (ref: ThesisReference) => {
    const copy: ThesisReference = {
      ...ref,
      id: `ref-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${ref.title || "Untitled"} (Copy)`,
    };
    bulkImportReferences([copy]);
    toast.success('Reference duplicated', {
      description: `"${ref.title || "Untitled"} (Copy)" has been added.`,
      duration: 2000,
    });
  };

  const handleQuickAdd = () => {
    if (!quickAddInput.trim()) return;
    const parsed = parseImportText(quickAddInput);
    if (parsed.length > 0) {
      bulkImportReferences(parsed);
      toast.success(`Added ${parsed.length} reference${parsed.length > 1 ? 's' : ''}`, { duration: 2000 });
      setQuickAddInput("");
    }
  };

  const handleBulkImport = () => {
    if (!bulkImportText.trim()) return;
    const parsed = parseImportText(bulkImportText);
    if (parsed.length > 0) {
      bulkImportReferences(parsed);
      setBulkImportText("");
      setShowBulkImport(false);
      toast.success(`Imported ${parsed.length} reference${parsed.length > 1 ? 's' : ''}`, {
        description: 'References have been added to your bibliography.',
        duration: 3000,
      });
      const fieldsToFlash = new Set<string>();
      parsed.forEach((ref) => {
        if (ref.authors) fieldsToFlash.add(`${ref.id}:authors`);
        if (ref.title) fieldsToFlash.add(`${ref.id}:title`);
        if (ref.year) fieldsToFlash.add(`${ref.id}:year`);
        if (ref.journal) fieldsToFlash.add(`${ref.id}:journal`);
        if (ref.bookTitle) fieldsToFlash.add(`${ref.id}:bookTitle`);
        if (ref.publisher) fieldsToFlash.add(`${ref.id}:publisher`);
        if (ref.doi) fieldsToFlash.add(`${ref.id}:doi`);
        if (ref.url) fieldsToFlash.add(`${ref.id}:url`);
      });
      setParsedFields(fieldsToFlash);
      setTimeout(() => { setParsedFields(new Set()); }, 600);
    }
  };

  const handleSortCycle = () => {
    const idx = SORT_CYCLE.indexOf(sortOrder);
    setSortOrder(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  };

  const toggleCompactView = () => {
    setCompactView(!compactView);
    setExpandedRefId(null);
  };

  const handleDeleteReference = (id: string, title: string) => {
    removeReference(id);
    setDeleteConfirm(null);
    if (expandedRefId === id) setExpandedRefId(null);
    if (editingRefId === id) { setEditingRefId(null); setSheetOpen(false); }
    toast.warning("Reference removed", {
      description: `"${title || 'Untitled'}" has been deleted.`,
      duration: 3000,
    });
  };

  const handleAddReference = () => {
    addReference();
    const state = useThesisStore.getState();
    const refs = state.thesis?.references ?? [];
    const newRef = refs[refs.length - 1];
    if (newRef) {
      setEditingRefId(newRef.id);
      setSheetOpen(true);
    }
  };

  const handleOpenEditor = (refId: string) => {
    setEditingRefId(refId);
    setSheetOpen(true);
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="space-y-6">
      {/* ---------- Left-aligned step title ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="tf-micro-label">Step 4 of {WIZARD_STEPS.length}</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--c-brand-600,#534AB7)]" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="tf-heading mb-3">Manage Your Bibliography</h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Add references by pasting citations, importing BibTeX, or entering them manually.
                Each reference will be included in your generated thesis.
              </p>
            </div>
            {/* Stats badge — shows count vs minimum required */}
            {minRefs > 0 && (
              <div className={cn(
                "shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
                references.length >= minRefs
                  ? "border-[oklch(0.722_0.19_149/0.2)] bg-[oklch(0.722_0.19_149/0.06)]"
                  : references.length > 0
                    ? "border-[oklch(0.795_0.184_86/0.2)] bg-[oklch(0.795_0.184_86/0.06)]"
                    : "border-border/40 bg-muted/30"
              )}>
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center",
                  references.length >= minRefs ? "bg-[oklch(0.722_0.19_149/0.15)]" : "bg-muted/50"
                )}>
                  {references.length >= minRefs ? (
                    <ShieldCheck className="w-3 h-3 text-[oklch(0.522_0.177_149)]" />
                  ) : (
                    <ClipboardList className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums leading-none">
                    {references.length}<span className="text-muted-foreground font-normal">/{minRefs}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">references</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="space-y-5">
        {/* ---------- Quick Add Paste Row ---------- */}
        <div className="space-y-1.5">
          <Label className="tf-field-label">Quick Add</Label>
          <div className="relative rounded-xl border border-[var(--c-brand-600,#534AB7)]/20 bg-primary/5 focus-within:border-[var(--c-brand-600,#534AB7)]/40 transition-colors">
            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-brand-600,#534AB7)] pointer-events-none" />
            <Input
              ref={quickAddRef}
              value={quickAddInput}
              onChange={(e) => setQuickAddInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); quickAddIgnoreBlur.current = true; handleQuickAdd(); } }}
              onBlur={() => { if (quickAddIgnoreBlur.current) { quickAddIgnoreBlur.current = false; return; } if (quickAddInput.trim()) handleQuickAdd(); }}
              className="pl-10 h-12 sm:h-10 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-xl"
              placeholder="Paste a citation to instantly add it — APA, Vancouver, MLA, or BibTeX"
            />
          </div>
        </div>

        {/* ---------- Action Row: Buttons + Search ---------- */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            className="gap-2 text-sm h-10 px-5 font-semibold rounded-xl google-gradient border-0 shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.97] transition-[transform,box-shadow] duration-200"
            onClick={handleAddReference}
          >
            <Plus className="w-4 h-4" />
            Add Reference
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-sm h-10 px-4 rounded-xl border-primary/20 hover:border-primary/30 hover:bg-primary/8 active:scale-[0.97] transition-all duration-200"
            onClick={() => setShowBulkImport(!showBulkImport)}
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>

          {/* Search bar */}
          <div className="flex-1 min-w-[200px] max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 text-sm rounded-xl border-border/50 bg-muted/20 focus:bg-background transition-colors"
                placeholder="Search by title, author, or year..."
                aria-label="Search references"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---------- Type filter pills + Sort + Compact toggle ---------- */}
        {references.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
            {/* Filter pills: All · Article · Book · Conference · Other */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full transition-colors min-h-[28px]",
                  typeFilter === 'all'
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                All
              </button>
              {typeFilterPills.map(({ type, label, count }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full transition-colors min-h-[28px] flex items-center gap-1",
                    typeFilter === type
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {label}
                  <span className="tabular-nums opacity-70">{count}</span>
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {references.length > 1 && (
              <>
                <Badge variant="outline" className="text-xs text-muted-foreground hidden sm:inline-flex">
                  {sortOrder === "default" ? "" : "Sort: "}
                  {sortLabel}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 min-h-[44px] min-w-[44px]" onClick={handleSortCycle}>
                        <ArrowDownAZ className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Sort: {sortLabel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Click to cycle sort order</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground min-h-[44px]" onClick={toggleCompactView}>
                    {compactView ? "Expand All" : "Compact View"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{compactView ? "Show full editor for each reference" : "Show compact list view"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* ---------- Bulk Import Panel ---------- */}
        <AnimatePresence>
          {showBulkImport && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
              <Card className="bg-primary/[0.02] border-primary/10">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Bulk Import References</h3>
                  <Textarea
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                    className="text-xs min-h-[120px] font-mono"
                    placeholder={`Paste references here. Supports BibTeX or one-per-line:\n\n@article{smith2024,\n  author = {Smith, J.},\n  title = {A Great Paper},\n  journal = {Nature},\n  year = {2024}\n}\n\nDoe, J., "Data Science Handbook", Springer, 2023`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste BibTeX entries or plain-text lines (one reference per line). BibTeX is auto-detected.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowBulkImport(false)}>Cancel</Button>
                    <Button type="button" size="sm" className="text-xs" disabled={!bulkImportText.trim()} onClick={handleBulkImport}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Import
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Duplicate Warning ---------- */}
        {duplicates.length > 0 && (
          <div className="rounded-xl border border-[oklch(0.795_0.184_86/0.2)] bg-[oklch(0.795_0.184_86/0.06)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[oklch(0.795_0.184_86/0.15)] border border-[oklch(0.795_0.184_86/0.2)] flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-[oklch(0.655_0.215_41)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {duplicates.length} Duplicate{duplicates.length !== 1 ? 's' : ''} Detected
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Some references appear to be duplicates. You can resolve them automatically or review manually.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 h-9 text-xs gap-1.5 rounded-xl border-[oklch(0.795_0.184_86/0.2)] hover:bg-[oklch(0.795_0.184_86/0.1)] active:scale-[0.97] transition-all duration-200"
                  onClick={() => {
                    const idsToRemove = new Set<string>();
                    for (const merge of mergeSuggestions) {
                      const keepIdx = merge.suggestedTarget;
                      const removeIdx = keepIdx === merge.indexA ? merge.indexB : merge.indexA;
                      const refToRemove = references[removeIdx];
                      if (refToRemove) idsToRemove.add(refToRemove.id);
                    }
                    for (const id of idsToRemove) { removeReference(id); }
                    toast.success(`Resolved ${idsToRemove.size} duplicate${idsToRemove.size !== 1 ? 's' : ''}`, { duration: 3000 });
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Resolve All Duplicates
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- References List ---------- */}
        <div className="space-y-2">
          {references.length === 0 ? (
            /* ---- Empty state ---- */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-gradient-to-b from-[var(--c-brand-600,#534AB7)]/[0.03] to-transparent">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 bg-gradient-to-br from-[var(--c-brand-600,#534AB7)]/15 to-[var(--c-brand-600,#534AB7)]/5 ring-1 ring-[var(--c-brand-600,#534AB7)]/20">
                  <Quote className="w-9 h-9 text-[var(--c-brand-600,#534AB7)]" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">No references added</h3>
                <p className="text-xs text-muted-foreground max-w-[260px] mb-1">
                  Your thesis will have no bibliography section. You can add references later.
                </p>
                <p className="text-xs text-muted-foreground max-w-[240px] mb-5">
                  Paste a citation or fill in the fields manually.
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddReference} className="gap-2 rounded-2xl google-gradient border-0 shadow-md">
                    <Plus className="w-3.5 h-3.5" />Add a reference
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowBulkImport(true)} className="gap-2 border-primary/20">
                    <Upload className="w-3.5 h-3.5" />Bulk Import
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : sortedRefs.length === 0 ? (
            /* ---- No search results ---- */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10 space-y-2">
              <Search className="w-6 h-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No matching references</p>
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setSearchQuery("")}>Clear search</Button>
            </motion.div>
          ) : (
            <>
              {/* ---- Desktop Table Layout (md+) ---- */}
              <div className="hidden md:block rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-8">#</th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-24">Type</th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">Authors</th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-16">Year</th>
                      <th className="w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {sortedRefs.map((ref, index) => {
                        const typeConfig = refTypeConfig[ref.type];
                        return (
                          <motion.tr
                            key={ref.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="border-b border-border/30 group cursor-pointer hover:bg-muted/20 transition-colors duration-150"
                            onClick={() => handleOpenEditor(ref.id)}
                          >
                            <td className="py-3 px-3 text-muted-foreground/40 tabular-nums text-xs">{index + 1}</td>
                            <td className="py-3 px-3">
                              <span className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1",
                                typeColorClass(ref.type)
                              )}>
                                {(() => { const TypeIcon = typeConfig.icon; return <TypeIcon className="w-2.5 h-2.5" />; })()}
                                {typeConfig.shortLabel}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-medium truncate max-w-[300px]">{ref.title || "Untitled"}</td>
                            <td className="py-3 px-3 text-muted-foreground truncate max-w-[180px]">{ref.authors || "—"}</td>
                            <td className="py-3 px-3 font-mono text-muted-foreground tabular-nums text-xs">{ref.year || "—"}</td>
                            <td className="py-2.5 px-2">
                              <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="p-1.5 rounded-md hover:bg-accent w-7 h-7 flex items-center justify-center transition-colors" aria-label="Edit" onClick={() => handleOpenEditor(ref.id)}>
                                        <Pencil className="w-3 h-3 text-muted-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="p-1.5 rounded-md hover:bg-accent w-7 h-7 flex items-center justify-center transition-colors" aria-label="Duplicate" onClick={() => handleDuplicate(ref)}>
                                        <Copy className="w-3 h-3 text-muted-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Duplicate</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive w-7 h-7 flex items-center justify-center transition-colors" aria-label="Delete" onClick={() => setDeleteConfirm(ref.id)}>
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* ---- Mobile Card Layout (<md) ---- */}
              <div className="md:hidden space-y-2">
                <AnimatePresence mode="popLayout">
                  {sortedRefs.map((ref) => {
                    const typeConfig = refTypeConfig[ref.type];
                    const TypeIcon = typeConfig.icon;
                    return (
                      <motion.div
                        key={ref.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="overflow-hidden hover:bg-accent/50 active:scale-[0.995] transition-all duration-150" onClick={() => handleOpenEditor(ref.id)}>
                          <CardContent className="p-0">
                            <div className="flex">
                              <div className={cn("w-1 shrink-0 self-stretch", typeConfig.bgColor, "opacity-60")} />
                              <div className="p-3 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px] font-medium shrink-0 gap-1">
                                    <TypeIcon className={cn("w-2.5 h-2.5", typeConfig.color)} />
                                    {typeConfig.shortLabel}
                                  </Badge>
                                  <p className="text-sm font-medium truncate leading-snug flex-1">
                                    {ref.title || "Untitled Reference"}
                                  </p>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button type="button" className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors -mr-1" aria-label="Delete" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(ref.id); }}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                                <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                                  {ref.authors || "No author"}{ref.year ? ` (${ref.year})` : ""}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Delete Confirmation Dialog — polished */}
              <Dialog open={!!deleteConfirm} onOpenChange={(open) => setDeleteConfirm(open ? deleteConfirm : null)}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl p-0 overflow-hidden gap-0 border-border/40 shadow-xl">
                  {/* Red gradient accent bar */}
                  <div
                    className="h-1 w-full"
                    style={{
                      background: 'linear-gradient(90deg, oklch(0.577 0.245 27.325), oklch(0.55 0.22 22))',
                    }}
                  />
                  <div className="px-6 pt-5 pb-2">
                    <DialogHeader className="space-y-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/15 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5 text-destructive" />
                        </div>
                        <div className="min-w-0">
                          <DialogTitle className="text-base font-bold text-foreground leading-snug">
                            Delete Reference
                          </DialogTitle>
                        </div>
                      </div>
                      <DialogDescription className="sr-only">
                        Confirm deletion of a reference
                      </DialogDescription>
                      <p className="text-[13px] text-muted-foreground leading-relaxed pl-[52px]">
                        Are you sure you want to delete &ldquo;{references.find(r => r.id === deleteConfirm)?.title || "Untitled"}&rdquo;? This action cannot be undone.
                      </p>
                    </DialogHeader>
                  </div>
                  <div className="px-6 pb-6 pt-3 space-y-2.5">
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => { if (deleteConfirm) handleDeleteReference(deleteConfirm, references.find(r => r.id === deleteConfirm)?.title || ""); }}
                      className="w-full h-12 rounded-xl text-sm font-semibold gap-2.5 border-0 hover:shadow-lg active:scale-[0.98] transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Reference
                      <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setDeleteConfirm(null)}
                      className="w-full h-11 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all duration-200"
                    >
                      Cancel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* ---------- Reference Editor Sheet (Enhanced Godmode) ---------- */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingRefId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg sm:w-[520px] overflow-y-auto p-0 flex flex-col !rounded-l-2xl border-l-0 shadow-2xl shadow-black/10">
          {/* ── Enhanced Header with gradient ── */}
          <SheetHeader className="shrink-0 pb-4 border-b border-border/30 bg-gradient-to-b from-primary/[0.03] to-transparent">
            <div className="flex items-center gap-3 mb-1">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5",
                editingRef && refTypeConfig[editingRef.type]?.bgColor ? `${refTypeConfig[editingRef.type].bgColor}/20` : "bg-primary/15"
              )}>
                {editingRef && (() => {
                  const TypeIcon = refTypeConfig[editingRef.type]?.icon || FileText;
                  return <TypeIcon className={cn("w-[18px] h-[18px]", editingRef && refTypeConfig[editingRef.type]?.color ? refTypeConfig[editingRef.type].color : "text-primary")} />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-[15px] font-semibold tracking-tight">{editingRef ? "Edit Reference" : "New Reference"}</SheetTitle>
                <SheetDescription className="text-[11px] text-muted-foreground/70 mt-0.5">Fill in the bibliographic details below.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* ── Scrollable form body with enhanced spacing ── */}
          {editingRef && (
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4 space-y-6">

              {/* ── Section: Reference Type ── */}
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Reference Type</span>
                </div>
                <Select value={editingRef.type} onValueChange={(val) => updateReference(editingRef.id, { type: val as ReferenceType })}>
                  <SelectTrigger className="h-11 text-sm rounded-xl border-border/50 bg-muted/20 shadow-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(refTypeConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key} className="rounded-lg py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${cfg.color} 15%, transparent)` }}>
                            <cfg.icon className="w-3 h-3" style={{ color: cfg.color }} />
                          </div>
                          <span className="font-medium">{cfg.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Section: Core Details ── */}
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <FileText className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Core Details</span>
                </div>
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="tf-field-label flex items-center gap-1">
                      Authors <span className="text-destructive/60 text-[10px]">*</span>
                    </Label>
                    <Input
                      value={editingRef.authors}
                      onChange={(e) => updateReference(editingRef.id, { authors: e.target.value })}
                      placeholder="Author, A. B. and Author, C."
                      className={cn(
                        "h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all",
                        parsedFields.has(`${editingRef.id}:authors`) && "field-fill-flash"
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="tf-field-label flex items-center gap-1">
                      Title <span className="text-destructive/60 text-[10px]">*</span>
                    </Label>
                    <Input
                      value={editingRef.title}
                      onChange={(e) => updateReference(editingRef.id, { title: e.target.value })}
                      placeholder="Title of the work"
                      className={cn(
                        "h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all",
                        parsedFields.has(`${editingRef.id}:title`) && "field-fill-flash"
                      )}
                    />
                  </div>
                  {editingRef.type === "article" && (
                    <div className="space-y-1.5">
                      <Label className="tf-field-label">Journal</Label>
                      <Input
                        value={editingRef.journal || ""}
                        onChange={(e) => updateReference(editingRef.id, { journal: e.target.value })}
                        placeholder="Journal Name"
                        className={cn(
                          "h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all",
                          parsedFields.has(`${editingRef.id}:journal`) && "field-fill-flash"
                        )}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="tf-field-label">Year</Label>
                      <Input
                        value={editingRef.year}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                          updateReference(editingRef.id, { year: val });
                        }}
                        placeholder="2024"
                        className={cn(
                          "h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all",
                          !isYearValid(editingRef.year) && "border-destructive/50 focus-visible:ring-destructive/50"
                        )}
                        inputMode="numeric"
                      />
                      {!isYearValid(editingRef.year) && (
                        <p className="text-[11px] text-destructive mt-0.5">Enter a 4-digit year</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="tf-field-label">Pages</Label>
                      <Input
                        value={editingRef.pages || ""}
                        onChange={(e) => updateReference(editingRef.id, { pages: e.target.value })}
                        placeholder="1--15"
                        className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section: Publication Details ── */}
              {(editingRef.type === "article" || editingRef.type === "inproceedings" || editingRef.type === "book" || editingRef.type === "thesis" || editingRef.type === "techreport") && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <Globe className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Publication</span>
                  </div>
                  <div className="space-y-3.5">
                    {(editingRef.type === "article" || editingRef.type === "inproceedings") && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="tf-field-label">Volume</Label>
                          <Input
                            value={editingRef.volume || ""}
                            onChange={(e) => updateReference(editingRef.id, { volume: e.target.value })}
                            placeholder="42"
                            className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                          />
                        </div>
                        {editingRef.type === "article" && (
                          <div className="space-y-1.5">
                            <Label className="tf-field-label">Number</Label>
                            <Input
                              value={editingRef.number || ""}
                              onChange={(e) => updateReference(editingRef.id, { number: e.target.value })}
                              placeholder="3"
                              className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {editingRef.type === "inproceedings" && (
                      <div className="space-y-1.5">
                        <Label className="tf-field-label">Conference / Book Title</Label>
                        <Input
                          value={editingRef.bookTitle || ""}
                          onChange={(e) => updateReference(editingRef.id, { bookTitle: e.target.value })}
                          placeholder="Proceedings of..."
                          className={cn(
                            "h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all",
                            parsedFields.has(`${editingRef.id}:bookTitle`) && "field-fill-flash"
                          )}
                        />
                      </div>
                    )}
                    {editingRef.type === "book" && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="tf-field-label">Publisher</Label>
                          <Input
                            value={editingRef.publisher || ""}
                            onChange={(e) => updateReference(editingRef.id, { publisher: e.target.value })}
                            placeholder="Publisher Name"
                            className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="tf-field-label">Edition</Label>
                          <Input
                            value={editingRef.edition || ""}
                            onChange={(e) => updateReference(editingRef.id, { edition: e.target.value })}
                            placeholder="e.g., 3rd"
                            className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                          />
                        </div>
                      </>
                    )}
                    {editingRef.type === "thesis" && (
                      <div className="space-y-1.5">
                        <Label className="tf-field-label">School / University</Label>
                        <Input
                          value={editingRef.school || ""}
                          onChange={(e) => updateReference(editingRef.id, { school: e.target.value })}
                          placeholder="MIT"
                          className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                        />
                      </div>
                    )}
                    {editingRef.type === "techreport" && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="tf-field-label">Institution</Label>
                          <Input
                            value={editingRef.publisher || ""}
                            onChange={(e) => updateReference(editingRef.id, { publisher: e.target.value })}
                            placeholder="MIT"
                            className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="tf-field-label">Address</Label>
                          <Input
                            value={(editingRef as ThesisReference & { address?: string }).address || ""}
                            onChange={(e) => updateReference(editingRef.id, { address: e.target.value } as Partial<ThesisReference>)}
                            placeholder="City, Country"
                            className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                          />
                        </div>
                      </>
                    )}
                    {editingRef.type === "book" && (
                      <div className="space-y-1.5">
                        <Label className="tf-field-label">Address</Label>
                        <Input
                          value={(editingRef as ThesisReference & { address?: string }).address || ""}
                          onChange={(e) => updateReference(editingRef.id, { address: e.target.value } as Partial<ThesisReference>)}
                          placeholder="City, Country"
                          className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Section: Online / Misc Fields ── */}
              {(editingRef.type === "online" || editingRef.type === "misc") && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <HelpCircle className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      {editingRef.type === "online" ? "Online Source" : "Details"}
                    </span>
                  </div>
                  <div className="space-y-3.5">
                    {editingRef.type === "online" && (
                      <div className="space-y-1.5">
                        <Label className="tf-field-label">Access Date</Label>
                        <Input
                          value={(editingRef as ThesisReference & { accessed?: string }).accessed || ""}
                          onChange={(e) => updateReference(editingRef.id, { accessed: e.target.value } as Partial<ThesisReference>)}
                          placeholder="2024-01-15"
                          className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                        />
                      </div>
                    )}
                    {editingRef.type === "misc" && (
                      <div className="space-y-1.5">
                        <Label className="tf-field-label">How Published</Label>
                        <Input
                          value={(editingRef as ThesisReference & { howPublished?: string }).howPublished || ""}
                          onChange={(e) => updateReference(editingRef.id, { howPublished: e.target.value } as Partial<ThesisReference>)}
                          placeholder="Self-published"
                          className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Section: Identifiers ── */}
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Identifiers</span>
                </div>
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="tf-field-label">DOI</Label>
                    <Input
                      value={editingRef.doi || ""}
                      onChange={(e) => updateReference(editingRef.id, { doi: e.target.value })}
                      placeholder="10.1234/example"
                      className={cn(
                        "h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all",
                        parsedFields.has(`${editingRef.id}:doi`) && "field-fill-flash"
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="tf-field-label">URL</Label>
                    <Input
                      value={editingRef.url || ""}
                      onChange={(e) => updateReference(editingRef.id, { url: e.target.value })}
                      placeholder="https://..."
                      className={cn(
                        "h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all",
                        parsedFields.has(`${editingRef.id}:url`) && "field-fill-flash"
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="tf-field-label">Note (optional)</Label>
                    <Input
                      value={editingRef.note || ""}
                      onChange={(e) => updateReference(editingRef.id, { note: e.target.value })}
                      placeholder="Additional notes"
                      className="h-11 text-sm rounded-xl border-border/50 bg-muted/10 shadow-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-background transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* ── BibTeX Preview ── */}
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">BibTeX Preview</span>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/30 p-3.5 relative group">
                  <pre className="font-mono text-[11px] leading-[1.7] text-muted-foreground whitespace-pre-wrap break-all">{generateBibTeXPreview(editingRef)}</pre>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generateBibTeXPreview(editingRef));
                      toast.success("BibTeX copied", { duration: 1500 });
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Copy BibTeX"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Enhanced Footer ── */}
          <div className="shrink-0 border-t border-border/30 bg-gradient-to-t from-muted/20 to-transparent px-5 py-3.5 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editingRef) {
                  removeReference(editingRef.id);
                  setSheetOpen(false);
                  setEditingRefId(null);
                  toast.success("Reference deleted", { duration: 2000 });
                }
              }}
              className="gap-1.5 text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-10 px-3 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2 text-xs font-semibold min-h-[44px] px-6 rounded-xl google-gradient border-0 shadow-md hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-[transform,box-shadow] duration-200"
              onClick={() => {
                setSheetOpen(false);
                setEditingRefId(null);
                toast.success("Reference saved", { duration: 1500 });
              }}
            >
              <Check className="w-3.5 h-3.5" />
              Save Reference
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
