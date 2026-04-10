"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { WIZARD_STEPS } from "@/lib/thesis-types";
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
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Settings,
  Check,
  CalendarIcon,
  Wand2,
  Eye,
  Type,
  AlignJustify,
  FileText,
  ListTree,
  Puzzle,
  GraduationCap,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    <AnimatePresence>
      {filled && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="inline-flex items-center justify-center"
        >
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function SectionProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-auto text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
          {completed}/{total}{" "}
          <span className="hidden sm:inline">fields</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{pct}% complete</TooltipContent>
    </Tooltip>
  );
}

export function MetadataForm() {
  const { thesis, updateMetadata, nextStep, prevStep, updateOptions } =
    useThesisStore();
  const [showPreview, setShowPreview] = useState(false);
  const [suggestedUniversities, setSuggestedUniversities] = useState<
    string[]
  >([]);
  const [suggestedLocations, setSuggestedLocations] = useState<string[]>([]);

  const _metadata = thesis?.metadata;
  const _options = thesis?.options;

  // --- Completion tracking (hooks before conditional return) ---
  const requiredFieldsFilled = useMemo(() => {
    if (!_metadata) return { checks: {}, total: 0, filled: 0, allFilled: false };
    const checks = {
      title: !!_metadata.title.trim(),
      author: !!_metadata.author.trim(),
      university: !!_metadata.university.trim(),
      supervisor: !!_metadata.supervisor.trim(),
      date: !!_metadata.submissionDate,
      location: !!_metadata.location.trim(),
    };
    const total = Object.keys(checks).length as (keyof typeof checks)[];
    const filled = total.filter((k) => checks[k]).length;
    return { checks, total: total.length, filled, allFilled: filled === total.length };
  }, [_metadata]);

  // Section progress counters
  const titleProgress = useMemo(() => {
    if (!_metadata) return { completed: 0, total: 2 };
    let c = 0;
    if (_metadata.title.trim()) c++;
    if (_metadata.subtitle.trim()) c++;
    return { completed: c, total: 2 };
  }, [_metadata]);

  const authorProgress = useMemo(() => {
    if (!_metadata) return { completed: 0, total: 2 };
    let c = 0;
    if (_metadata.author.trim()) c++;
    if (_metadata.authorId.trim()) c++;
    return { completed: c, total: 2 };
  }, [_metadata]);

  const institutionProgress = useMemo(() => {
    if (!_metadata) return { completed: 0, total: 3 };
    let c = 0;
    if (_metadata.university.trim()) c++;
    if (_metadata.faculty.trim()) c++;
    if (_metadata.department.trim()) c++;
    return { completed: c, total: 3 };
  }, [_metadata]);

  const supervisorProgress = useMemo(() => {
    if (!_metadata) return { completed: 0, total: 3 };
    let c = 0;
    if (_metadata.supervisor.trim()) c++;
    if (_metadata.supervisorTitle) c++;
    if (_metadata.coSupervisor.trim()) c++;
    return { completed: c, total: 3 };
  }, [_metadata]);

  const dateProgress = useMemo(() => {
    if (!_metadata) return { completed: 0, total: 3 };
    let c = 0;
    if (_metadata.submissionDate) c++;
    if (_metadata.graduationDate) c++;
    if (_metadata.location.trim()) c++;
    return { completed: c, total: 3 };
  }, [_metadata]);

  if (!thesis) return null;

  const { metadata, options } = thesis;

  // Auto-fill suggestions
  const handleSuggestUniversity = () => {
    if (metadata.university.trim()) {
      const query = metadata.university.toLowerCase();
      const matches = COMMON_UNIVERSITIES.filter((u) =>
        u.toLowerCase().includes(query)
      );
      if (matches.length > 0) {
        setSuggestedUniversities(matches.slice(0, 5));
      } else {
        setSuggestedUniversities(
          COMMON_UNIVERSITIES.sort(() => 0.5 - Math.random()).slice(0, 5)
        );
      }
    } else {
      setSuggestedUniversities(
        COMMON_UNIVERSITIES.sort(() => 0.5 - Math.random()).slice(0, 5)
      );
    }
    setSuggestedLocations([]);
  };

  const handleSuggestLocation = () => {
    if (metadata.location.trim()) {
      const query = metadata.location.toLowerCase();
      const matches = COMMON_LOCATIONS.filter((l) =>
        l.toLowerCase().includes(query)
      );
      if (matches.length > 0) {
        setSuggestedLocations(matches.slice(0, 5));
      } else {
        setSuggestedLocations(
          COMMON_LOCATIONS.sort(() => 0.5 - Math.random()).slice(0, 5)
        );
      }
    } else {
      setSuggestedLocations(
        COMMON_LOCATIONS.sort(() => 0.5 - Math.random()).slice(0, 5)
      );
    }
    setSuggestedUniversities([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  // Format date for preview
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Not set";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    } catch {
      return dateStr;
    }
  };

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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Document Metadata
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Fill in your thesis details. This information will appear on the title
          page and in the document metadata.
        </p>
        {/* Overall required fields progress */}
        <motion.div
          className="flex items-center justify-center gap-2 pt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              animate={{
                width: `${(requiredFieldsFilled.filled / requiredFieldsFilled.total) * 100}%`,
              }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
            {requiredFieldsFilled.filled}/{requiredFieldsFilled.total} required
          </span>
        </motion.div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <ScrollArea className="max-h-[calc(100vh-420px)] px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-4">
            {/* Title & Subtitle */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Thesis Title
                  </CardTitle>
                  <SectionProgress
                    completed={titleProgress.completed}
                    total={titleProgress.total}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="title"
                    className="text-xs font-medium flex items-center gap-1.5"
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
                <div className="space-y-1.5">
                  <Label
                    htmlFor="subtitle"
                    className="text-xs font-medium flex items-center gap-1.5"
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

            {/* Author Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Author Information
                  </CardTitle>
                  <SectionProgress
                    completed={authorProgress.completed}
                    total={authorProgress.total}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="author"
                    className="text-xs font-medium flex items-center gap-1.5"
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
                <div className="space-y-1.5">
                  <Label
                    htmlFor="authorId"
                    className="text-xs font-medium flex items-center gap-1.5"
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

            {/* Institution */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" />
                    Institution
                  </CardTitle>
                  <SectionProgress
                    completed={institutionProgress.completed}
                    total={institutionProgress.total}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="university"
                    className="text-xs font-medium flex items-center gap-1.5"
                  >
                    University <span className="text-destructive">*</span>
                    <FieldCheck filled={!!metadata.university.trim()} />
                  </Label>
                  <div className="flex gap-1.5">
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
                          className="shrink-0 h-9 w-9"
                          onClick={handleSuggestUniversity}
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-500" />
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
                            className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
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
                <div className="space-y-1.5">
                  <Label
                    htmlFor="faculty"
                    className="text-xs font-medium flex items-center gap-1.5"
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
                <div className="space-y-1.5">
                  <Label
                    htmlFor="department"
                    className="text-xs font-medium flex items-center gap-1.5"
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

            {/* Supervisors */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Supervisors
                  </CardTitle>
                  <SectionProgress
                    completed={supervisorProgress.completed}
                    total={supervisorProgress.total}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="supervisor"
                        className="text-xs font-medium flex items-center gap-1.5"
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
                    <div className="space-y-1.5">
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
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="coSupervisor"
                        className="text-xs font-medium flex items-center gap-1.5"
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
                    <div className="space-y-1.5">
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

            {/* Date & Location */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Date & Location
                  </CardTitle>
                  <SectionProgress
                    completed={dateProgress.completed}
                    total={dateProgress.total}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="submissionDate"
                    className="text-xs font-medium flex items-center gap-1.5"
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
                <div className="space-y-1.5">
                  <Label
                    htmlFor="graduationDate"
                    className="text-xs font-medium flex items-center gap-1.5"
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
                <div className="space-y-1.5">
                  <Label
                    htmlFor="location"
                    className="text-xs font-medium flex items-center gap-1.5"
                  >
                    City / Location <span className="text-destructive">*</span>
                    <FieldCheck filled={!!metadata.location.trim()} />
                  </Label>
                  <div className="flex gap-1.5">
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
                          className="shrink-0 h-9 w-9"
                          onClick={handleSuggestLocation}
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-500" />
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
                            className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
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

            {/* Dedication & Acknowledgment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Dedication & Acknowledgment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Include Dedication</Label>
                  <Switch
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
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{
                        opacity: 1,
                        height: "auto",
                        marginTop: 4,
                      }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
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

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Include Acknowledgment
                  </Label>
                  <Switch
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
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{
                        opacity: 1,
                        height: "auto",
                        marginTop: 4,
                      }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
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

            {/* Document Options — Organized into sub-groups */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Document Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Formatting sub-group */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Type className="w-3.5 h-3.5" />
                    Formatting
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Font Size</Label>
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
                          <SelectItem value="10pt">10pt — Compact</SelectItem>
                          <SelectItem value="11pt">11pt — Standard</SelectItem>
                          <SelectItem value="12pt">12pt — Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Line Spacing</Label>
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
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Page Margins</Label>
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
                          <SelectItem value="normal">Normal (1&quot;)</SelectItem>
                          <SelectItem value="wide">
                            Wide (1.25&quot;)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Paper Size</Label>
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
                          <SelectItem value="a4paper">A4 (210 × 297mm)</SelectItem>
                          <SelectItem value="letterpaper">
                            US Letter (8.5 × 11&quot;)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Academic sub-group */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Academic
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Citation Style</Label>
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
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">TOC Depth</Label>
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
                          <SelectItem value="1">1 — Chapters only</SelectItem>
                          <SelectItem value="2">2 — Sections</SelectItem>
                          <SelectItem value="3">3 — Subsections</SelectItem>
                          <SelectItem value="4">4 — Sub-subsections</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-0.5">
                      <div className="flex items-center justify-between w-full">
                        <Label className="text-xs font-medium">
                          Per-Chapter Numbering
                        </Label>
                        <Switch
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Puzzle className="w-3.5 h-3.5" />
                    Features
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        Include Appendices
                      </Label>
                      <Switch
                        checked={options.includeAppendices}
                        onCheckedChange={(checked) =>
                          updateOptions({ includeAppendices: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        Include Code Listings
                      </Label>
                      <Switch
                        checked={options.includeListings}
                        onCheckedChange={(checked) =>
                          updateOptions({ includeListings: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        Include Glossary
                      </Label>
                      <Switch
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

            {/* Preview Title Page */}
            <Card className="md:col-span-2">
              <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center w-full text-left group"
                    >
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        Preview Title Page
                      </CardTitle>
                      <motion.div
                        animate={{ rotate: showPreview ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-auto"
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="border rounded-lg bg-white dark:bg-zinc-950 p-6 sm:p-8 max-w-lg mx-auto shadow-sm">
                      <div className="text-center space-y-4">
                        {metadata.university && (
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                            {metadata.university}
                          </p>
                        )}
                        {metadata.faculty && (
                          <p className="text-[11px] text-muted-foreground">
                            {metadata.faculty}
                            {metadata.department
                              ? ` — ${metadata.department}`
                              : ""}
                          </p>
                        )}
                        <div className="my-6">
                          <h3 className="text-lg sm:text-xl font-bold leading-tight">
                            {metadata.title || "Your Thesis Title"}
                          </h3>
                          {metadata.subtitle && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              {metadata.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            <span className="font-medium text-foreground">
                              {metadata.author || "Author Name"}
                            </span>
                          </p>
                          {metadata.authorId && (
                            <p>Student ID: {metadata.authorId}</p>
                          )}
                          <div className="pt-2 space-y-0.5">
                            {metadata.supervisor && (
                              <p>
                                Supervisor: {metadata.supervisorTitle}{" "}
                                {metadata.supervisor}
                              </p>
                            )}
                            {metadata.coSupervisor && (
                              <p>
                                Co-Supervisor: {metadata.coSupervisorTitle}{" "}
                                {metadata.coSupervisor}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="pt-4 text-xs text-muted-foreground space-y-0.5">
                          <p>{formatDate(metadata.submissionDate)}</p>
                          {metadata.location && <p>{metadata.location}</p>}
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground mt-2">
                      This is a simplified preview. The final LaTeX output will
                      follow your institution&apos;s title page template.
                    </p>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
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
            {requiredFieldsFilled.allFilled ? (
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
