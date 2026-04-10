"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Tag,
  X,
  Lightbulb,
  Check,
  Type,
  Hash,
  AlignLeft,
  BarChart3,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought", "used",
  "it", "its", "this", "that", "these", "those", "i", "me", "my", "myself",
  "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself",
  "he", "him", "his", "himself", "she", "her", "hers", "herself", "they",
  "them", "their", "theirs", "themselves", "what", "which", "who", "whom",
  "when", "where", "why", "how", "all", "each", "every", "both", "few",
  "more", "most", "other", "some", "such", "no", "nor", "not", "only",
  "own", "same", "so", "than", "too", "very", "just", "because", "about",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "also", "while", "however", "although",
  "using", "based", "propose", "proposed", "proposes", "show", "shows",
  "shown", "result", "results", "method", "methods", "approach", "data",
  "study", "paper", "new", "one", "two", "three", "first", "second",
  "well", "use", "used", "make", "made", "find", "found", "many",
  "much", "get", "got", "go", "went", "come", "came", "take", "took",
]);

function extractSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractSuggestedKeywords(text: string): string[] {
  if (!text || text.trim().length < 20) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

export function AbstractEditor() {
  const {
    thesis,
    setAbstract,
    addKeyword,
    removeKeyword,
  } = useThesisStore();
  const [keywordInput, setKeywordInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const abstract = thesis?.abstract ?? "";
  const keywords = thesis?.keywords ?? [];

  const handleAddKeyword = useCallback(() => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      addKeyword(kw);
      setKeywordInput("");
    }
  }, [keywordInput, keywords, addKeyword]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddKeyword();
      }
    },
    [handleAddKeyword]
  );

  // --- All useMemo hooks must be before conditional return ---

  const wordCount = useMemo(
    () =>
      abstract
        ? abstract.trim().split(/\s+/).filter(Boolean).length
        : 0,
    [abstract]
  );

  const charCount = useMemo(
    () => (abstract ? abstract.length : 0),
    [abstract]
  );

  const sentences = useMemo(() => extractSentences(abstract), [abstract]);

  const sentenceCount = useMemo(() => sentences.length, [sentences]);

  const avgWordsPerSentence = useMemo(
    () => (sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0),
    [wordCount, sentenceCount]
  );

  const readabilityLevel = useMemo(() => {
    if (sentenceCount === 0)
      return { label: "N/A", color: "text-muted-foreground", dot: "bg-muted-foreground" };
    const avg = wordCount / sentenceCount;
    if (avg <= 15)
      return { label: "Easy", color: "text-[var(--color-text-success)]", dot: "bg-[var(--color-text-success)]" };
    if (avg <= 25)
      return { label: "Moderate", color: "text-[var(--color-text-warning)]", dot: "bg-[var(--color-text-warning)]" };
    return { label: "Advanced", color: "text-[var(--color-text-danger)]", dot: "bg-[var(--color-text-danger)]" };
  }, [wordCount, sentenceCount]);

  const suggestedKeywords = useMemo(
    () => extractSuggestedKeywords(abstract),
    [abstract]
  );

  const writingTip = useMemo(() => {
    if (wordCount === 0)
      return "Start with your research problem -- what question or gap does your thesis address?";
    if (wordCount < 50)
      return "Good start. Next, describe your methodology -- how did you approach the research?";
    if (wordCount < 150)
      return "Consider adding your key findings and results to strengthen the abstract.";
    if (wordCount < 300)
      return "Looking comprehensive. Add the implications of your findings for the field.";
    if (wordCount < 500)
      return "Great length. Make sure each sentence adds value -- avoid redundancy.";
    return "Consider if your abstract could be more concise. Most journals recommend 150-300 words.";
  }, [wordCount]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.max(150, Math.min(el.scrollHeight, 500));
    el.style.height = `${newHeight}px`;
  }, [abstract]);

  const handleAddSuggestedKeyword = useCallback(
    (kw: string) => {
      const normalized = kw.trim().toLowerCase();
      if (normalized && !keywords.some((k) => k.toLowerCase() === normalized)) {
        addKeyword(normalized);
      }
    },
    [keywords, addKeyword]
  );

  // --- Conditional return AFTER all hooks ---

  if (!thesis) return null;

  const progressPct = Math.min((wordCount / 500) * 100, 100);

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
          Step {WIZARD_STEPS[2].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Abstract & Keywords
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Write a concise summary of your research. A strong abstract typically
          covers the problem, methodology, key findings, and implications.
        </p>
      </motion.div>

      <div className="space-y-4">
        {/* ---- Abstract ---- */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-primary" />
                Abstract
                <FieldCheck filled={wordCount >= 150} />
              </CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {wordCount} words
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              ref={textareaRef}
              placeholder="Write your abstract here. A typical abstract ranges from 150 to 500 words, summarizing the purpose, methodology, key results, and conclusions of your research..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="text-sm min-h-[150px] resize-none leading-relaxed"
              style={{ maxHeight: "500px", overflowY: "auto" }}
            />

            {/* Simple progress bar (no markers) */}
            {wordCount > 0 && (
              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Stats grid: 2x2 mobile, 4-col desktop */}
            {wordCount > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Type className="w-3 h-3 shrink-0" />
                  <span className="font-medium text-foreground tabular-nums">{wordCount}</span> words
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash className="w-3 h-3 shrink-0" />
                  <span className="font-medium text-foreground tabular-nums">{charCount}</span> chars
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlignLeft className="w-3 h-3 shrink-0" />
                  <span className="font-medium text-foreground tabular-nums">{sentenceCount}</span> sentences
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BarChart3 className="w-3 h-3 shrink-0" />
                  <span className="font-medium text-foreground tabular-nums">{avgWordsPerSentence}</span> avg/sent
                </div>
              </div>
            )}

            {/* Readability + Writing tip combined row */}
            {wordCount > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-2 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${readabilityLevel.dot}`} />
                  Readability:{" "}
                  <span className={`font-medium ${readabilityLevel.color}`}>
                    {readabilityLevel.label}
                  </span>
                </span>
                <span className="hidden sm:inline text-muted-foreground/40">--</span>
                <span className="flex items-start gap-1 sm:items-center">
                  <Lightbulb className="w-3 h-3 shrink-0 mt-0.5 sm:mt-0 text-muted-foreground/60" />
                  {writingTip}
                </span>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* ---- Keywords ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Keywords
              {keywords.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  ({keywords.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add a keyword and press Enter"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim()}
                className="text-xs shrink-0"
              >
                Add
              </Button>
            </div>

            {/* Suggested keywords */}
            {suggestedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords
                  .filter(
                    (sk) =>
                      !keywords.some((k) => k.toLowerCase() === sk.toLowerCase())
                  )
                  .slice(0, 5)
                  .map((sk) => (
                    <button
                      key={sk}
                      type="button"
                      className="text-xs px-2 py-0.5 rounded-full border border-dashed border-primary/30 text-primary/70 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                      onClick={() => handleAddSuggestedKeyword(sk)}
                    >
                      + {sk}
                    </button>
                  ))}
              </div>
            )}

            {suggestedKeywords.length > 0 && keywords.length > 0 && (
              <Separator />
            )}

            {/* Keyword chips */}
            <AnimatePresence mode="popLayout">
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <motion.div
                      key={kw}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Badge
                        variant="secondary"
                        className="text-xs px-3 py-0.5 gap-1 cursor-pointer hover:bg-destructive/10 group"
                        onClick={() => removeKeyword(kw)}
                      >
                        {kw}
                        <X className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No keywords yet. Aim for 3-6 relevant terms for your thesis.
                </p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

/* Reuse the same FieldCheck from metadata form concept */
function FieldCheck({ filled }: { filled: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-3.5 h-3.5 shrink-0 transition-opacity duration-200 ${
        filled ? "opacity-100" : "opacity-0"
      }`}
    >
      <Check className="w-3 h-3 text-[var(--color-text-success)]" />
    </span>
  );
}
