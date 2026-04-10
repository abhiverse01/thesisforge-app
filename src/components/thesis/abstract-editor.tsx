"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Tag,
  X,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  AlignLeft,
  Check,
  BookOpen,
  Type,
  Hash,
  BarChart3,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Common stop words to filter for keyword suggestions
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
    nextStep,
    prevStep,
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

  const charCountNoSpaces = useMemo(
    () => (abstract ? abstract.replace(/\s/g, "").length : 0),
    [abstract]
  );

  const sentences = useMemo(() => extractSentences(abstract), [abstract]);

  const sentenceCount = useMemo(() => sentences.length, [sentences]);

  const avgWordsPerSentence = useMemo(
    () => (sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0),
    [wordCount, sentenceCount]
  );

  const readabilityLevel = useMemo(() => {
    if (sentenceCount === 0) return { label: "N/A", color: "text-muted-foreground", bg: "bg-muted" };
    const avg = wordCount / sentenceCount;
    if (avg <= 15)
      return { label: "Easy", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500" };
    if (avg <= 25)
      return { label: "Moderate", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500" };
    return { label: "Advanced", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500" };
  }, [wordCount, sentenceCount]);

  const suggestedKeywords = useMemo(() => extractSuggestedKeywords(abstract), [abstract]);

  const writingTip = useMemo(() => {
    if (wordCount === 0)
      return {
        text: "Start with your research problem — what question or gap does your thesis address?",
        icon: BookOpen,
        tone: "info",
      };
    if (wordCount < 50)
      return {
        text: "Good start! Now describe your methodology — how did you approach the research?",
        icon: BookOpen,
        tone: "info",
      };
    if (wordCount < 150)
      return {
        text: "Consider adding your key findings and results to strengthen the abstract.",
        icon: Lightbulb,
        tone: "info",
      };
    if (wordCount < 300)
      return {
        text: "Looking comprehensive! Add the implications of your findings for the field.",
        icon: Lightbulb,
        tone: "success",
      };
    if (wordCount < 500)
      return {
        text: "Great length! Make sure each sentence adds value — avoid redundancy.",
        icon: Lightbulb,
        tone: "success",
      };
    return {
      text: "Consider if your abstract could be more concise. Most journals recommend 150–300 words.",
      icon: Lightbulb,
      tone: "warning",
    };
  }, [wordCount]);

  // Progress bar markers
  const progressMarkers = useMemo(() => {
    return [
      { words: 150, label: "150" },
      { words: 250, label: "250" },
      { words: 350, label: "350" },
      { words: 500, label: "500" },
    ];
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 400);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  const isSuggested = (kw: string) =>
    suggestedKeywords.some((s) => s.toLowerCase() === kw.toLowerCase());

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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Abstract & Keywords
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Write a concise summary of your research. A strong abstract typically
          covers the problem, methodology, key findings, and implications.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Abstract */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-primary" />
                Abstract
                {wordCount >= 150 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  </motion.span>
                )}
              </CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {wordCount} words
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Empty state guide */}
            {!abstract.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-muted/50 border border-dashed"
              >
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Abstract Writing Guide
                </h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>
                    <span className="font-medium text-foreground">
                      Problem statement
                    </span>{" "}
                    — What research gap are you addressing?
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Methodology
                    </span>{" "}
                    — How did you conduct your research?
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Key findings
                    </span>{" "}
                    — What were the main results?
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Implications
                    </span>{" "}
                    — Why do your findings matter?
                  </li>
                </ol>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Target: 150–500 words. Start typing below to begin.
                </p>
              </motion.div>
            )}

            <Textarea
              ref={textareaRef}
              placeholder="Write your abstract here. A typical abstract ranges from 150 to 500 words, summarizing the purpose, methodology, key results, and conclusions of your research..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="text-sm min-h-[120px] resize-none leading-relaxed"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            />

            {/* Word count progress bar with markers */}
            {wordCount > 0 && (
              <div className="space-y-1.5">
                <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min((wordCount / 500) * 100, 100)}%`,
                      backgroundColor:
                        wordCount < 100
                          ? "oklch(0.7 0.15 60)"
                          : wordCount <= 500
                            ? "oklch(0.55 0.18 265)"
                            : "oklch(0.577 0.245 27.325)",
                    }}
                    transition={{ duration: 0.3 }}
                  />
                  {/* Markers */}
                  {progressMarkers.map((marker) => {
                    const pct = Math.min((marker.words / 500) * 100, 100);
                    return (
                      <div
                        key={marker.words}
                        className="absolute top-0 h-full"
                        style={{ left: `${pct}%` }}
                      >
                        <div className="w-px h-full bg-muted-foreground/30" />
                      </div>
                    );
                  })}
                </div>
                {/* Marker labels */}
                <div className="relative h-3">
                  {progressMarkers.map((marker) => {
                    const pct = Math.min((marker.words / 500) * 100, 100);
                    return (
                      <span
                        key={marker.words}
                        className="absolute text-[9px] text-muted-foreground/60 -translate-x-1/2 tabular-nums"
                        style={{ left: `${pct}%` }}
                      >
                        {marker.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats breakdown */}
            {wordCount > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Type className="w-3 h-3" />
                  <span>
                    <span className="font-medium text-foreground tabular-nums">
                      {wordCount}
                    </span>{" "}
                    words
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  <span>
                    <span className="font-medium text-foreground tabular-nums">
                      {charCount}
                    </span>{" "}
                    chars
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <AlignLeft className="w-3 h-3" />
                  <span>
                    <span className="font-medium text-foreground tabular-nums">
                      {sentenceCount}
                    </span>{" "}
                    sentences
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <BarChart3 className="w-3 h-3" />
                  <span>
                    <span className="font-medium text-foreground tabular-nums">
                      {avgWordsPerSentence}
                    </span>{" "}
                    avg/sent
                  </span>
                </div>
              </motion.div>
            )}

            {/* Readability indicator */}
            {sentenceCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50"
              >
                <div
                  className={`w-2 h-2 rounded-full ${readabilityLevel.bg}`}
                />
                <span className="text-xs">
                  Readability:{" "}
                  <span className={`font-medium ${readabilityLevel.color}`}>
                    {readabilityLevel.label}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    ({avgWordsPerSentence} words/sentence avg)
                  </span>
                </span>
              </motion.div>
            )}

            {/* Contextual writing tip */}
            {wordCount > 0 && (
              <motion.div
                key={writingTip.text}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                  writingTip.tone === "warning"
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                    : writingTip.tone === "success"
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                      : "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400"
                }`}
              >
                <writingTip.icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{writingTip.text}</span>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Keywords
                <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                  ({keywords.length})
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a keyword and press Enter"
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
                className="text-xs"
              >
                Add
              </Button>
            </div>

            {/* Suggested keywords */}
            {suggestedKeywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Suggested from your abstract
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedKeywords
                    .filter(
                      (sk) =>
                        !keywords.some(
                          (k) => k.toLowerCase() === sk.toLowerCase()
                        )
                    )
                    .slice(0, 5)
                    .map((sk) => (
                      <motion.button
                        key={sk}
                        type="button"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-primary/30 text-primary/70 hover:bg-primary/10 hover:border-primary/50 transition-colors flex items-center gap-1"
                        onClick={() => handleAddSuggestedKeyword(sk)}
                      >
                        + {sk}
                      </motion.button>
                    ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Keyword chips */}
            <AnimatePresence mode="popLayout">
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => {
                    const suggested = isSuggested(kw);
                    return (
                      <motion.div
                        key={kw}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
                        transition={{ duration: 0.2 }}
                      >
                        <Badge
                          variant="secondary"
                          className="text-xs px-2.5 py-0.5 gap-1 cursor-pointer hover:bg-destructive/10 group"
                          onClick={() => removeKeyword(kw)}
                        >
                          {kw}
                          {suggested && (
                            <span className="text-[9px] text-primary/50 font-normal">
                              AI
                            </span>
                          )}
                          <X className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No keywords added yet. Add 3–6 keywords that represent your
                  research.
                </p>
              )}
            </AnimatePresence>

            <p className="text-[11px] text-muted-foreground">
              Keywords help index your thesis in academic databases. Aim for 3–6
              relevant terms separated by your institution&apos;s style guide.
            </p>
          </CardContent>
        </Card>

        {/* Character count detail (collapsed) */}
        {wordCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="text-[11px] text-muted-foreground">
              Characters:{" "}
              <span className="tabular-nums font-medium text-foreground">
                {charCount}
              </span>{" "}
              (with spaces) /{" "}
              <span className="tabular-nums font-medium text-foreground">
                {charCountNoSpaces}
              </span>{" "}
              (without spaces)
            </p>
          </motion.div>
        )}

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
            {wordCount >= 150 ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Continue
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
