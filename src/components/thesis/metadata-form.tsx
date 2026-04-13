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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
// ScrollArea removed - main element handles scrolling via h-screen layout
import { countWords } from "@/utils/word-count";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ThesisOptions, CitationStyle } from "@/lib/thesis-types";

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
  const { thesis, updateMetadata, updateOptions, setAbstract, addKeyword, removeKeyword } =
    useThesisStore();
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Step {WIZARD_STEPS[1].id} of {WIZARD_STEPS.length}
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          About Your Thesis
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
          Fill in the essential details about your thesis. This information will
          appear on the title page and in the document metadata.
        </p>
      </motion.div>

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
        <p className="text-xs text-muted-foreground text-center tabular-nums">
          {requiredFieldsFilled.filled}/{requiredFieldsFilled.total} required
          fields completed
        </p>
      </motion.div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            {/* ---- Title & Subtitle ---- */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Thesis Title
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Title <span className="text-destructive">*</span>
                    <FieldCheck filled={!!metadata.title.trim()} />
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., An Analysis of Machine Learning Approaches for Climate Prediction"
                    value={metadata.title}
                    onChange={(e) => updateMetadata({ title: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="subtitle"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Subtitle (optional)
                    <FieldCheck filled={!!metadata.subtitle.trim()} />
                  </Label>
                  <Input
                    id="subtitle"
                    placeholder="A supplementary description of your thesis"
                    value={metadata.subtitle}
                    onChange={(e) =>
                      updateMetadata({ subtitle: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ---- Author Info ---- */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Author Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="author"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Full Name <span className="text-destructive">*</span>
                    <FieldCheck filled={!!metadata.author.trim()} />
                  </Label>
                  <Input
                    id="author"
                    placeholder="e.g., John Doe"
                    value={metadata.author}
                    onChange={(e) => updateMetadata({ author: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="authorId"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Student ID (optional)
                    <FieldCheck filled={!!metadata.authorId.trim()} />
                  </Label>
                  <Input
                    id="authorId"
                    placeholder="e.g., 2024CS001"
                    value={metadata.authorId}
                    onChange={(e) =>
                      updateMetadata({ authorId: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ---- Institution ---- */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  Institution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="university"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    University <span className="text-destructive">*</span>
                    <FieldCheck filled={!!metadata.university.trim()} />
                  </Label>
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
                        className="text-sm pl-8"
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 h-8 w-8"
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
                            className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
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
                <div className="space-y-2">
                  <Label
                    htmlFor="faculty"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Faculty
                    <FieldCheck filled={!!metadata.faculty.trim()} />
                  </Label>
                  <Input
                    id="faculty"
                    placeholder="e.g., Faculty of Engineering"
                    value={metadata.faculty}
                    onChange={(e) => updateMetadata({ faculty: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="department"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Department
                    <FieldCheck filled={!!metadata.department.trim()} />
                  </Label>
                  <Input
                    id="department"
                    placeholder="e.g., Computer Science"
                    value={metadata.department}
                    onChange={(e) =>
                      updateMetadata({ department: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ---- Supervisors ---- */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Supervisors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="supervisor"
                        className="text-xs font-medium flex items-center gap-2"
                      >
                        Supervisor <span className="text-destructive">*</span>
                        <FieldCheck filled={!!metadata.supervisor.trim()} />
                      </Label>
                      <Input
                        id="supervisor"
                        placeholder="e.g., Prof. Jane Smith"
                        value={metadata.supervisor}
                        onChange={(e) =>
                          updateMetadata({ supervisor: e.target.value })
                        }
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="supervisorTitle"
                        className="text-xs font-medium"
                      >
                        Supervisor Title
                      </Label>
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
                          <SelectItem value="Assoc. Prof.">
                            Assoc. Professor
                          </SelectItem>
                          <SelectItem value="Asst. Prof.">
                            Asst. Professor
                          </SelectItem>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Ms.">Ms.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="coSupervisor"
                        className="text-xs font-medium flex items-center gap-2"
                      >
                        Co-Supervisor (optional)
                        <FieldCheck filled={!!metadata.coSupervisor.trim()} />
                      </Label>
                      <Input
                        id="coSupervisor"
                        placeholder="e.g., Dr. Alan Turing"
                        value={metadata.coSupervisor}
                        onChange={(e) =>
                          updateMetadata({ coSupervisor: e.target.value })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="coSupervisorTitle"
                        className="text-xs font-medium"
                      >
                        Co-Supervisor Title
                      </Label>
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
                          <SelectItem value="Assoc. Prof.">
                            Assoc. Professor
                          </SelectItem>
                          <SelectItem value="Asst. Prof.">
                            Asst. Professor
                          </SelectItem>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Ms.">Ms.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ---- Date & Location ---- */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="submissionDate"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Submission Date <span className="text-destructive">*</span>
                    <FieldCheck filled={!!metadata.submissionDate} />
                  </Label>
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
                <div className="space-y-2">
                  <Label
                    htmlFor="graduationDate"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Graduation Date (optional)
                    <FieldCheck filled={!!metadata.graduationDate} />
                  </Label>
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
                <div className="space-y-2">
                  <Label
                    htmlFor="location"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    City / Location <span className="text-destructive">*</span>
                    <FieldCheck filled={!!metadata.location.trim()} />
                  </Label>
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
                        className="text-sm pl-8"
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 h-8 w-8"
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
                            className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
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
              </CardContent>
            </Card>

            {/* ---- Dedication & Acknowledgment ---- */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Dedication & Acknowledgment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="switch-dedication"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Include Dedication
                  </Label>
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

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="switch-ack"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Include Acknowledgment
                  </Label>
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
              </CardContent>
            </Card>

            {/* ---- Abstract & Keywords ---- */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  Abstract & Keywords
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="abstract"
                      className="text-xs font-medium flex items-center gap-2"
                    >
                      Abstract
                    </Label>
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
                    className="text-sm min-h-[120px] resize-y"
                  />
                  {abstractWordCount > abstractWordLimit && (
                    <p className="text-xs text-[var(--color-text-warning)] mt-1">
                      Your abstract exceeds the recommended word limit ({abstractWordLimit} for this template). This is a soft cap — you can still proceed.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="keywords-input"
                    className="text-xs font-medium flex items-center gap-2"
                  >
                    Keywords
                  </Label>
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
                            className="text-primary/60 hover:text-primary ml-0.5"
                            aria-label={`Remove keyword: ${kw}`}
                          >
                            <span className="text-xs leading-none">&times;</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Separate keywords with commas or press Enter after each one. Keywords appear in the PDF metadata.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ---- Document Options ---- */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Document Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {/* Formatting sub-group */}
                <div className="space-y-3 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Type className="w-3 h-3" />
                    Formatting
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
  );
}
