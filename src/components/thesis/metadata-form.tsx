"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS, ABSTRACT_WORD_LIMITS } from "@/lib/thesis-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  User,
  Building,
  BookOpen,
  Calendar,
  MapPin,
  Heart,
  Settings,
  Check,
  CalendarIcon,
  Wand2,
  Type,
  Puzzle,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { countWords } from "@/utils/word-count";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ThesisOptions, CitationStyle } from "@/lib/thesis-types";
import { Progress } from "@/components/ui/progress";

const COMMON_UNIVERSITIES = [
  "University of Oxford",
  "University of Cambridge",
  "MIT",
  "Stanford University",
  "ETH Zurich",
  "University of Toronto",
  "TU Munich",
  "Imperial College London",
  "Harvard University",
  "University of California, Berkeley",
  "Carnegie Mellon University",
  "Georgia Institute of Technology",
  "University of Melbourne",
  "National University of Singapore",
  "Tsinghua University",
];

const COMMON_LOCATIONS = [
  "Oxford",
  "Cambridge",
  "London",
  "Boston",
  "Stanford",
  "Zurich",
  "Toronto",
  "Munich",
  "Berlin",
  "Paris",
  "Singapore",
  "Melbourne",
  "Beijing",
  "Tokyo",
  "Sydney",
];

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

export function MetadataForm() {
  const thesis = useThesisStore(s => s.thesis);
  const updateMetadata = useThesisStore(s => s.updateMetadata);
  const updateOptions = useThesisStore(s => s.updateOptions);
  const setAbstract = useThesisStore(s => s.setAbstract);
  const addKeyword = useThesisStore(s => s.addKeyword);
  const removeKeyword = useThesisStore(s => s.removeKeyword);
  const [suggestedUniversities, setSuggestedUniversities] = useState<
    string[]
  >([]);
  const [suggestedLocations, setSuggestedLocations] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  const _metadata = thesis?.metadata;

  // --- Completion tracking (hooks before conditional return) ---
  const requiredFieldsFilled = useMemo(() => {
    if (!_metadata)
      return { checks: {}, total: 0, filled: 0, allFilled: false };
    const checks = {
      title: !!_metadata.title.trim(),
      author: !!_metadata.author.trim(),
      university: !!_metadata.university.trim(),
      supervisor: !!_metadata.supervisor.trim(),
      date: !!_metadata.submissionDate,
      location: !!_metadata.location.trim(),
    };
    const keys = Object.keys(checks) as (keyof typeof checks)[];
    const filled = keys.filter((k) => checks[k]).length;
    return {
      checks,
      total: keys.length,
      filled,
      allFilled: filled === keys.length,
    };
  }, [_metadata]);

  if (!thesis) return null;

  const { metadata, options } = thesis;

  // Abstract word count with template-aware limit
  const abstractWordLimit = ABSTRACT_WORD_LIMITS[thesis.type] || 300;
  const abstractWordCount = countWords(thesis.abstract || '');

  // Auto-fill suggestions
  const handleSuggestUniversity = () => {
    const pool = [...COMMON_UNIVERSITIES].sort(() => 0.5 - Math.random());
    if (metadata.university.trim()) {
      const query = metadata.university.toLowerCase();
      const matches = COMMON_UNIVERSITIES.filter((u) =>
        u.toLowerCase().includes(query)
      );
      setSuggestedUniversities(
        matches.length > 0 ? matches.slice(0, 5) : pool.slice(0, 5)
      );
    } else {
      setSuggestedUniversities(pool.slice(0, 5));
    }
    setSuggestedLocations([]);
  };

  const handleSuggestLocation = () => {
    const pool = [...COMMON_LOCATIONS].sort(() => 0.5 - Math.random());
    if (metadata.location.trim()) {
      const query = metadata.location.toLowerCase();
      const matches = COMMON_LOCATIONS.filter((l) =>
        l.toLowerCase().includes(query)
      );
      setSuggestedLocations(
        matches.length > 0 ? matches.slice(0, 5) : pool.slice(0, 5)
      );
    } else {
      setSuggestedLocations(pool.slice(0, 5));
    }
    setSuggestedUniversities([]);
  };

  const requiredPct =
    requiredFieldsFilled.total > 0
      ? (requiredFieldsFilled.filled / requiredFieldsFilled.total) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Step header — left-aligned */}
      <div className="mb-8">
        <p className="tf-micro-label mb-2">Step 2 of {WIZARD_STEPS.length}</p>
        <h1 className="tf-heading mb-3">Define Your Thesis</h1>
        <p className="text-sm text-muted-foreground">Fill in the essential details about your thesis.</p>
      </div>

      {/* Subtle progress bar below header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-1"
      >
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[var(--c-brand-600,#534AB7)]"
            animate={{ width: `${requiredPct}%` }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          />
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {requiredFieldsFilled.filled}/{requiredFieldsFilled.total} required
          fields completed
        </p>
      </motion.div>

      <div className="space-y-10">

        {/* ═══════════════════════════════════════════════
            GROUP 1: IDENTITY — Title, Subtitle, Author Info
            ═══════════════════════════════════════════════ */}
        <div>
          <p className="tf-micro-label mb-4">Identity</p>
          <hr className="mb-6 border-border/50" />

          {/* Title + Subtitle — full width */}
          <div className="space-y-4 mb-6">
            <div className="tf-field-group">
              <label htmlFor="title" className="tf-field-label flex items-center gap-2">
                Title <span className="text-destructive">*</span>
                <FieldCheck filled={!!metadata.title.trim()} />
              </label>
              <Input
                id="title"
                placeholder="e.g., An Analysis of Machine Learning Approaches for Climate Prediction"
                value={metadata.title}
                onChange={(e) => updateMetadata({ title: e.target.value })}
                required
                autoCapitalize="words"
                className="text-sm"
              />
              <p className="tf-field-helper">The full title of your thesis as it appears on the title page.</p>
            </div>

            <div className="tf-field-group">
              <label htmlFor="subtitle" className="tf-field-label flex items-center gap-2">
                Subtitle (optional)
                <FieldCheck filled={!!metadata.subtitle.trim()} />
              </label>
              <Input
                id="subtitle"
                placeholder="A supplementary description of your thesis"
                value={metadata.subtitle}
                onChange={(e) =>
                  updateMetadata({ subtitle: e.target.value })
                }
                autoCapitalize="sentences"
                className="text-sm"
              />
            </div>
          </div>

          {/* Author + Student ID — two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="tf-field-group">
              <label htmlFor="author" className="tf-field-label flex items-center gap-2">
                Full Name <span className="text-destructive">*</span>
                <FieldCheck filled={!!metadata.author.trim()} />
              </label>
              <Input
                id="author"
                placeholder="e.g., John Doe"
                value={metadata.author}
                onChange={(e) => updateMetadata({ author: e.target.value })}
                required
                autoComplete="name"
                autoCapitalize="words"
                className="text-sm"
              />
            </div>
            <div className="tf-field-group">
              <label htmlFor="authorId" className="tf-field-label flex items-center gap-2">
                Student ID (optional)
                <FieldCheck filled={!!metadata.authorId.trim()} />
              </label>
              <Input
                id="authorId"
                placeholder="e.g., 2024CS001"
                value={metadata.authorId}
                onChange={(e) =>
                  updateMetadata({ authorId: e.target.value })
                }
                autoCapitalize="characters"
                autoCorrect="off"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            GROUP 2: INSTITUTION — Uni, Supervisors, Date & Location
            ═══════════════════════════════════════════════ */}
        <div>
          <p className="tf-micro-label mb-4">Institution</p>
          <hr className="mb-6 border-border/50" />

          {/* University + Department — two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="tf-field-group">
              <label htmlFor="university" className="tf-field-label flex items-center gap-2">
                University <span className="text-destructive">*</span>
                <FieldCheck filled={!!metadata.university.trim()} />
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <GraduationCap className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="university"
                    placeholder="e.g., University of Oxford"
                    value={metadata.university}
                    onChange={(e) =>
                      updateMetadata({ university: e.target.value })
                    }
                    required
                    autoComplete="organization"
                    autoCapitalize="words"
                    className="text-sm pl-8"
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-11 w-11 sm:h-8 sm:w-8"
                      onClick={handleSuggestUniversity}
                    >
                      <Wand2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Suggest university</TooltipContent>
                </Tooltip>
              </div>
              <AnimatePresence>
                {suggestedUniversities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-1"
                  >
                    {suggestedUniversities.map((uni) => (
                      <button
                        key={uni}
                        type="button"
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[44px] flex items-center sm:min-h-0"
                        onClick={() => {
                          updateMetadata({ university: uni });
                          setSuggestedUniversities([]);
                        }}
                      >
                        {uni}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="tf-field-group">
              <label htmlFor="department" className="tf-field-label flex items-center gap-2">
                Department <span className="text-muted-foreground font-normal">(optional)</span>
                <FieldCheck filled={!!metadata.department.trim()} />
              </label>
              <Input
                id="department"
                placeholder="e.g., Computer Science"
                value={metadata.department}
                onChange={(e) =>
                  updateMetadata({ department: e.target.value })
                }
                autoCapitalize="words"
                className="text-sm"
              />
            </div>
          </div>

          {/* Faculty — full width */}
          <div className="tf-field-group mb-4">
            <label htmlFor="faculty" className="tf-field-label flex items-center gap-2">
              Faculty <span className="text-muted-foreground font-normal">(optional)</span>
              <FieldCheck filled={!!metadata.faculty.trim()} />
            </label>
            <Input
              id="faculty"
              placeholder="e.g., Faculty of Engineering"
              value={metadata.faculty}
              onChange={(e) => updateMetadata({ faculty: e.target.value })}
              autoCapitalize="words"
              className="text-sm"
            />
          </div>

          {/* Supervisor + Co-Supervisor — two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="tf-field-group">
              <label htmlFor="supervisor" className="tf-field-label flex items-center gap-2">
                Supervisor <span className="text-destructive">*</span>
                <FieldCheck filled={!!metadata.supervisor.trim()} />
              </label>
              <Input
                id="supervisor"
                placeholder="e.g., Prof. Jane Smith"
                value={metadata.supervisor}
                onChange={(e) =>
                  updateMetadata({ supervisor: e.target.value })
                }
                required
                autoComplete="name"
                autoCapitalize="words"
                className="text-sm"
              />
            </div>
            <div className="tf-field-group">
              <label htmlFor="coSupervisor" className="tf-field-label flex items-center gap-2">
                Co-Supervisor (optional)
                <FieldCheck filled={!!metadata.coSupervisor.trim()} />
              </label>
              <Input
                id="coSupervisor"
                placeholder="e.g., Dr. Alan Turing"
                value={metadata.coSupervisor}
                onChange={(e) =>
                  updateMetadata({ coSupervisor: e.target.value })
                }
                autoComplete="name"
                autoCapitalize="words"
                className="text-sm"
              />
            </div>
          </div>

          {/* Supervisor titles — two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="tf-field-group">
              <label htmlFor="supervisorTitle" className="tf-field-label">
                Supervisor Title <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Select
                value={metadata.supervisorTitle}
                onValueChange={(val) =>
                  updateMetadata({ supervisorTitle: val })
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prof.">Professor</SelectItem>
                  <SelectItem value="Dr.">Doctor</SelectItem>
                  <SelectItem value="Assoc. Prof.">Assoc. Professor</SelectItem>
                  <SelectItem value="Asst. Prof.">Asst. Professor</SelectItem>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="tf-field-group">
              <label htmlFor="coSupervisorTitle" className="tf-field-label">
                Co-Supervisor Title <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Select
                value={metadata.coSupervisorTitle}
                onValueChange={(val) =>
                  updateMetadata({ coSupervisorTitle: val })
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prof.">Professor</SelectItem>
                  <SelectItem value="Dr.">Doctor</SelectItem>
                  <SelectItem value="Assoc. Prof.">Assoc. Professor</SelectItem>
                  <SelectItem value="Asst. Prof.">Asst. Professor</SelectItem>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submission Date + Location — two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="tf-field-group">
              <label htmlFor="submissionDate" className="tf-field-label flex items-center gap-2">
                Submission Date <span className="text-destructive">*</span>
                <FieldCheck filled={!!metadata.submissionDate} />
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="submissionDate"
                  type="date"
                  value={metadata.submissionDate}
                  onChange={(e) =>
                    updateMetadata({ submissionDate: e.target.value })
                  }
                  required
                  className="text-sm pl-8"
                />
              </div>
            </div>
            <div className="tf-field-group">
              <label htmlFor="location" className="tf-field-label flex items-center gap-2">
                City / Location <span className="text-destructive">*</span>
                <FieldCheck filled={!!metadata.location.trim()} />
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="location"
                    placeholder="e.g., London"
                    value={metadata.location}
                    onChange={(e) =>
                      updateMetadata({ location: e.target.value })
                    }
                    required
                    autoComplete="address-level2"
                    autoCapitalize="words"
                    className="text-sm pl-8"
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-11 w-11 sm:h-8 sm:w-8"
                      onClick={handleSuggestLocation}
                    >
                      <Wand2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Suggest location</TooltipContent>
                </Tooltip>
              </div>
              <AnimatePresence>
                {suggestedLocations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-1"
                  >
                    {suggestedLocations.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[44px] flex items-center sm:min-h-0"
                        onClick={() => {
                          updateMetadata({ location: loc });
                          setSuggestedLocations([]);
                        }}
                      >
                        {loc}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Graduation Date — secondary field */}
          <div className="tf-field-group mt-4">
            <label htmlFor="graduationDate" className="tf-field-label flex items-center gap-2">
              Graduation Date (optional)
              <FieldCheck filled={!!metadata.graduationDate} />
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="graduationDate"
                type="date"
                value={metadata.graduationDate}
                onChange={(e) =>
                  updateMetadata({ graduationDate: e.target.value })
                }
                className="text-sm pl-8"
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            GROUP 3: DOCUMENT — Dedication, Abstract, Options
            ═══════════════════════════════════════════════ */}
        <div>
          <p className="tf-micro-label mb-4">Document</p>
          <hr className="mb-6 border-border/50" />

          {/* Dedication & Acknowledgment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="tf-field-group">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="switch-dedication" className="tf-field-label cursor-pointer">
                  Include Dedication
                </label>
                <Switch
                  id="switch-dedication"
                  checked={options.includeDedication}
                  onCheckedChange={(checked) =>
                    updateOptions({ includeDedication: checked })
                  }
                />
              </div>
              <AnimatePresence>
                {options.includeDedication && (
                  <motion.div
                    key="dedication"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Textarea
                      placeholder="e.g., To my parents, for their unwavering support..."
                      value={metadata.dedication}
                      onChange={(e) =>
                        updateMetadata({ dedication: e.target.value })
                      }
                      className="text-sm min-h-[60px]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="tf-field-group">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="switch-ack" className="tf-field-label cursor-pointer">
                  Include Acknowledgment
                </label>
                <Switch
                  id="switch-ack"
                  checked={options.includeAcknowledgment}
                  onCheckedChange={(checked) =>
                    updateOptions({ includeAcknowledgment: checked })
                  }
                />
              </div>
              <AnimatePresence>
                {options.includeAcknowledgment && (
                  <motion.div
                    key="acknowledgment"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Textarea
                      placeholder="I would like to express my gratitude to..."
                      value={metadata.acknowledgment}
                      onChange={(e) =>
                        updateMetadata({ acknowledgment: e.target.value })
                      }
                      className="text-sm min-h-[80px]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Abstract & Keywords — full width */}
          <div className="space-y-4 mb-6">
            <div className="tf-field-group">
              <div className="flex items-center justify-between">
                <label htmlFor="abstract" className="tf-field-label flex items-center gap-2">
                  Abstract
                </label>
                {thesis.abstract.trim() && (
                  <span className={cn(
                    "text-xs font-medium tabular-nums",
                    abstractWordCount > abstractWordLimit
                      ? "text-[var(--color-text-warning)]"
                      : "text-muted-foreground"
                  )}>
                    {abstractWordCount} / {abstractWordLimit} words
                    {abstractWordCount > abstractWordLimit && " (over limit)"}
                  </span>
                )}
              </div>
              <Textarea
                id="abstract"
                placeholder="Write your abstract here. Summarize the research problem, methodology, key findings, and conclusions..."
                value={thesis.abstract}
                onChange={(e) => {
                  setAbstract(e.target.value);
                }}
                className="text-sm min-h-[160px] resize-y focus-visible:border-l-2 focus-visible:border-l-primary"
              />
              {/* Live word and character count below abstract */}
              {thesis.abstract.length > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{abstractWordCount} word{abstractWordCount !== 1 ? 's' : ''}</span>
                  <span className={abstractWordCount > abstractWordLimit ? "text-[var(--color-text-warning)]" : ""}>{abstractWordCount} / {abstractWordLimit}</span>
                </div>
              )}
              {thesis.abstract.trim() && (
                <div className="relative mt-1">
                  <motion.div
                    animate={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* WHY: Pulsing glow when word count is within ±5 of the target limit */}
                    {abstractWordCount >= abstractWordLimit - 5 && abstractWordCount <= abstractWordLimit + 5 && abstractWordCount > 0 && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        style={{ boxShadow: abstractWordCount > abstractWordLimit
                          ? "0 0 8px 2px rgba(239,68,68,0.3)"
                          : "0 0 8px 2px rgba(34,197,94,0.3)" }}
                      />
                    )}
                    <Progress
                      value={Math.min(abstractWordCount, abstractWordLimit)}
                      className={cn(
                        "h-1.5 rounded-full",
                        abstractWordCount > abstractWordLimit
                          ? "[&>[data-slot=progress-indicator]]:bg-[var(--color-text-warning,#eab308)]"
                          : ""
                      )}
                    />
                  </motion.div>
                </div>
              )}
              {abstractWordCount > abstractWordLimit && (
                <p className="text-xs text-[var(--color-text-warning)] mt-1">
                  Your abstract exceeds the recommended word limit ({abstractWordLimit} for this template). This is a soft cap — you can still proceed.
                </p>
              )}
            </div>

            {/* Keywords */}
            <div className="tf-field-group">
              <label htmlFor="keywords-input" className="tf-field-label flex items-center gap-2">
                Keywords
              </label>
              <Input
                id="keywords-input"
                placeholder="Type a keyword and press Enter to add it..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && keywordInput.trim()) {
                    e.preventDefault();
                    addKeyword(keywordInput.trim());
                    setKeywordInput("");
                  }
                }}
                autoCapitalize="off"
                className="text-sm"
              />
              {thesis.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {thesis.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center sm:min-h-0 sm:min-w-0 text-primary/60 hover:text-primary ml-0.5 transition-colors"
                        aria-label={`Remove keyword: ${kw}`}
                      >
                        <span className="text-xs leading-none">&times;</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="tf-field-helper">Separate keywords with commas or press Enter after each one. Keywords appear in the PDF metadata.</p>
            </div>
          </div>

          {/* Document Options */}
          <div className="space-y-0">
            {/* Formatting sub-group */}
            <div className="space-y-3 pb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Type className="w-3 h-3" />
                Formatting
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="tf-field-group">
                  <Label className="text-xs font-medium text-muted-foreground">Font Size</Label>
                  <Select
                    value={options.fontSize}
                    onValueChange={(val) =>
                      updateOptions({
                        fontSize: val as ThesisOptions["fontSize"],
                      })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10pt">10pt -- Compact</SelectItem>
                      <SelectItem value="11pt">11pt -- Standard</SelectItem>
                      <SelectItem value="12pt">12pt -- Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="tf-field-group">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Line Spacing
                  </Label>
                  <Select
                    value={options.lineSpacing}
                    onValueChange={(val) =>
                      updateOptions({
                        lineSpacing: val as ThesisOptions["lineSpacing"],
                      })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="onehalf">1.5 Lines</SelectItem>
                      <SelectItem value="double">Double</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="tf-field-group">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Page Margins
                  </Label>
                  <Select
                    value={options.marginSize}
                    onValueChange={(val) =>
                      updateOptions({
                        marginSize: val as ThesisOptions["marginSize"],
                      })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="narrow">
                        Narrow (0.75&quot;)
                      </SelectItem>
                      <SelectItem value="normal">
                        Normal (1&quot;)
                      </SelectItem>
                      <SelectItem value="wide">
                        Wide (1.25&quot;)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="tf-field-group">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Paper Size
                  </Label>
                  <Select
                    value={options.paperSize}
                    onValueChange={(val) =>
                      updateOptions({
                        paperSize: val as ThesisOptions["paperSize"],
                      })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4paper">
                        A4 (210 x 297mm)
                      </SelectItem>
                      <SelectItem value="letterpaper">
                        US Letter (8.5 x 11&quot;)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Academic sub-group */}
            <div className="space-y-3 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <GraduationCap className="w-3 h-3" />
                Academic
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="tf-field-group">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Citation Style
                  </Label>
                  <Select
                    value={options.citationStyle}
                    onValueChange={(val) =>
                      updateOptions({
                        citationStyle: val as CitationStyle,
                      })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apa">APA</SelectItem>
                      <SelectItem value="ieee">IEEE</SelectItem>
                      <SelectItem value="vancouver">Vancouver</SelectItem>
                      <SelectItem value="chicago">Chicago</SelectItem>
                      <SelectItem value="harvard">Harvard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="tf-field-group">
                  <Label className="text-xs font-medium text-muted-foreground">TOC Depth</Label>
                  <Select
                    value={String(options.tocDepth)}
                    onValueChange={(val) =>
                      updateOptions({ tocDepth: parseInt(val) })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 -- Chapters only</SelectItem>
                      <SelectItem value="2">2 -- Sections</SelectItem>
                      <SelectItem value="3">3 -- Subsections</SelectItem>
                      <SelectItem value="4">4 -- Sub-subsections</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-0.5">
                  <div className="flex items-center justify-between w-full gap-3">
                    <Label
                      htmlFor="switch-numbering"
                      className="text-xs font-medium cursor-pointer"
                    >
                      Per-Chapter Numbering
                    </Label>
                    <Switch
                      id="switch-numbering"
                      checked={options.figureNumbering === "per-chapter"}
                      onCheckedChange={(checked) =>
                        updateOptions({
                          figureNumbering: checked
                            ? "per-chapter"
                            : "continuous",
                          tableNumbering: checked
                            ? "per-chapter"
                            : "continuous",
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Features sub-group */}
            <div className="space-y-3 pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Puzzle className="w-3 h-3" />
                Features
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="switch-appendices"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Include Appendices
                  </Label>
                  <Switch
                    id="switch-appendices"
                    checked={options.includeAppendices}
                    onCheckedChange={(checked) =>
                      updateOptions({ includeAppendices: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="switch-listings"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Include Code Listings
                  </Label>
                  <Switch
                    id="switch-listings"
                    checked={options.includeListings}
                    onCheckedChange={(checked) =>
                      updateOptions({ includeListings: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="switch-glossary"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Include Glossary
                  </Label>
                  <Switch
                    id="switch-glossary"
                    checked={options.includeGlossary}
                    onCheckedChange={(checked) =>
                      updateOptions({ includeGlossary: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
