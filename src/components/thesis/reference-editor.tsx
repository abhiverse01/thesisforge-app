"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import type { ReferenceType, ThesisReference } from "@/lib/thesis-types";

const refTypeConfig: Record<
  ReferenceType,
  { label: string; icon: React.ElementType; color: string }
> = {
  article: { label: "Journal Article", icon: FileText, color: "text-sky-500" },
  book: { label: "Book", icon: BookOpen, color: "text-emerald-500" },
  inproceedings: { label: "Conference", icon: Library, color: "text-violet-500" },
  techreport: { label: "Tech Report", icon: FlaskConical, color: "text-amber-500" },
  thesis: { label: "Thesis", icon: GraduationCap, color: "text-rose-500" },
  online: { label: "Online Source", icon: Globe, color: "text-cyan-500" },
  misc: { label: "Other", icon: HelpCircle, color: "text-gray-500" },
};

type SortOrder = "default" | "year-asc" | "year-desc" | "author";

export function ReferenceEditor() {
  const {
    thesis,
    addReference,
    removeReference,
    updateReference,
    bulkImportReferences,
    nextStep,
    prevStep,
  } = useThesisStore();

  const [bulkImportText, setBulkImportText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [editMode, setEditMode] = useState(false);

  if (!thesis) return null;

  const { references } = thesis;

  const handleBulkImport = () => {
    if (!bulkImportText.trim()) return;

    const lines = bulkImportText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const imported = lines.map((line, idx) => {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      const splitIdx = yearMatch
        ? line.indexOf(yearMatch[0])
        : line.indexOf(",");
      const authorEnd = splitIdx !== -1 ? splitIdx : Math.min(50, line.length);
      const authors = line
        .substring(0, authorEnd)
        .replace(/[.,;:]$/, "")
        .trim() || "Unknown Author";

      const year = yearMatch ? yearMatch[0] : "2024";
      const title = line
        .replace(authors, "")
        .replace(year, "")
        .replace(/^[\s,.;:]+|[\s,.;:]+$/g, "")
        .trim() || "Untitled";

      return {
        id: `ref-bulk-${idx}-${Date.now()}`,
        type: "article" as ReferenceType,
        authors,
        title,
        year,
      };
    });

    bulkImportReferences(imported);
    setBulkImportText("");
    setShowBulkImport(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  const getSortedReferences = (): ThesisReference[] => {
    const refs = [...references];
    switch (sortOrder) {
      case "year-asc":
        return refs.sort((a, b) => parseInt(a.year || "0") - parseInt(b.year || "0"));
      case "year-desc":
        return refs.sort((a, b) => parseInt(b.year || "0") - parseInt(a.year || "0"));
      case "author":
        return refs.sort((a, b) => (a.authors || "").localeCompare(b.authors || ""));
      default:
        return refs;
    }
  };

  const sortedRefs = getSortedReferences();

  return (
    <div className="space-y-6">
      {/* Header */}
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
          References & Citations
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Add the sources cited in your thesis. Each reference will be formatted
          according to your chosen citation style.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Action bar */}
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
          <div className="flex-1" />
          <Badge variant="secondary" className="text-[10px] font-medium">
            {references.length} reference{references.length !== 1 ? "s" : ""}
          </Badge>
          {references.length > 1 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      if (sortOrder === "default") setSortOrder("year-asc");
                      else if (sortOrder === "year-asc") setSortOrder("year-desc");
                      else if (sortOrder === "year-desc") setSortOrder("author");
                      else setSortOrder("default");
                    }}
                  >
                    {sortOrder === "year-desc" ? (
                      <ArrowUpZA className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownAZ className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>
                    Sort:{" "}
                    {sortOrder === "default"
                      ? "Order added"
                      : sortOrder === "year-asc"
                        ? "Year (oldest first)"
                        : sortOrder === "year-desc"
                          ? "Year (newest first)"
                          : "Author name"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Click to cycle sort order
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {references.length > 1 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1 text-muted-foreground"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? "Expand All" : "Compact View"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{editMode ? "Show full editor for each reference" : "Show compact list"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Bulk Import Panel */}
        <AnimatePresence>
          {showBulkImport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Bulk Import References
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                    className="text-xs min-h-[100px] font-mono"
                    placeholder={`Paste references here (one per line):\nSmith, J. et al., "Machine Learning for Climate", Nature, 2024\nDoe, J., "Data Science Handbook", Springer, 2023`}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Import will attempt to extract authors, year, and title from each line.
                    Review imported entries and edit as needed.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkImport(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleBulkImport}
                      disabled={!bulkImportText.trim()}
                      className="text-xs"
                    >
                      Import {bulkImportText.trim().split("\n").filter(Boolean).length} references
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* References List */}
        <ScrollArea className="max-h-[calc(100vh-420px)]">
          <div className="space-y-3 pr-3">
            {references.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Quote className="w-10 h-10 text-muted-foreground/30" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      No references yet
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Click &quot;Add Reference&quot; or &quot;Bulk Import&quot; to
                      get started.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                {sortedRefs.map((ref, index) => {
                  const typeConfig = refTypeConfig[ref.type];
                  const TypeIcon = typeConfig.icon;

                  return (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          {/* Reference Header */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-muted-foreground">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {ref.title || "Untitled Reference"}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {ref.authors || "No author"} {ref.year ? `(${ref.year})` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[9px] shrink-0 gap-1">
                              <TypeIcon className={`w-3 h-3 ${typeConfig.color}`} />
                              {typeConfig.label}
                            </Badge>
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
                                  <DialogTitle>Delete Reference</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground">
                                  Are you sure you want to delete &quot;{ref.title}&quot;?
                                </p>
                                <div className="flex justify-end gap-2 mt-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeleteConfirm(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      removeReference(ref.id);
                                      setDeleteConfirm(null);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>

                          {/* Full editor (hidden in compact mode) */}
                          {!editMode && (
                            <>
                              <Separator />

                              {/* Reference Fields */}
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
                                      {Object.entries(refTypeConfig).map(
                                        ([key, cfg]) => (
                                          <SelectItem key={key} value={key}>
                                            <div className="flex items-center gap-2">
                                              <cfg.icon className="w-3 h-3" />
                                              {cfg.label}
                                            </div>
                                          </SelectItem>
                                        )
                                      )}
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

                                {/* Conditional fields based on type */}
                                {(ref.type === "article" ||
                                  ref.type === "inproceedings") && (
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
                                            : "bookTitle"]: e.target.value,
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

                                {ref.type === "book" && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-medium text-muted-foreground">
                                      Publisher
                                    </Label>
                                    <Input
                                      value={ref.publisher || ""}
                                      onChange={(e) =>
                                        updateReference(ref.id, {
                                          publisher: e.target.value,
                                        })
                                      }
                                      placeholder="Publisher Name"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                )}

                                {ref.type === "book" && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-medium text-muted-foreground">
                                      Edition
                                    </Label>
                                    <Input
                                      value={ref.edition || ""}
                                      onChange={(e) =>
                                        updateReference(ref.id, {
                                          edition: e.target.value,
                                        })
                                      }
                                      placeholder="e.g., 3rd"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                )}

                                {ref.type === "thesis" && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-medium text-muted-foreground">
                                      Institution / School
                                    </Label>
                                    <Input
                                      value={ref.school || ""}
                                      onChange={(e) =>
                                        updateReference(ref.id, {
                                          school: e.target.value,
                                        })
                                      }
                                      placeholder="University name"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                )}

                                {ref.type === "techreport" && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-medium text-muted-foreground">
                                      Institution
                                    </Label>
                                    <Input
                                      value={ref.publisher || ""}
                                      onChange={(e) =>
                                        updateReference(ref.id, {
                                          publisher: e.target.value,
                                        })
                                      }
                                      placeholder="Organization name"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                )}

                                {/* Year */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-medium text-muted-foreground">
                                    Year
                                  </Label>
                                  <Input
                                    value={ref.year}
                                    onChange={(e) =>
                                      updateReference(ref.id, {
                                        year: e.target.value,
                                      })
                                    }
                                    placeholder="2024"
                                    className="h-8 text-xs"
                                    maxLength={4}
                                  />
                                </div>

                                {/* Volume/Number */}
                                {(ref.type === "article" ||
                                  ref.type === "inproceedings") && (
                                  <>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-medium text-muted-foreground">
                                        Volume
                                      </Label>
                                      <Input
                                        value={ref.volume || ""}
                                        onChange={(e) =>
                                          updateReference(ref.id, {
                                            volume: e.target.value,
                                          })
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
                                        value={ref.pages || ""}
                                        onChange={(e) =>
                                          updateReference(ref.id, {
                                            pages: e.target.value,
                                          })
                                        }
                                        placeholder="e.g., 1--15"
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </>
                                )}

                                {/* DOI / URL */}
                                <div className="sm:col-span-2 space-y-1">
                                  <Label className="text-[10px] font-medium text-muted-foreground">
                                    DOI / URL
                                  </Label>
                                  <Input
                                    value={ref.doi || ref.url || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const isUrl = val.startsWith("http");
                                      updateReference(ref.id, isUrl
                                        ? { url: val, doi: undefined }
                                        : { doi: val, url: undefined }
                                      );
                                    }}
                                    placeholder="https://doi.org/10.1234/example or https://..."
                                    className="h-8 text-xs"
                                  />
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
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Navigation */}
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
