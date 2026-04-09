"use client";

import React from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ThesisOptions, CitationStyle } from "@/lib/thesis-types";

export function MetadataForm() {
  const { thesis, updateMetadata, nextStep, prevStep, updateOptions } =
    useThesisStore();

  if (!thesis) return null;

  const { metadata, options } = thesis;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
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
      </motion.div>

      <form onSubmit={handleSubmit}>
        <ScrollArea className="max-h-[calc(100vh-380px)] px-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-4">
            {/* Title & Subtitle */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Thesis Title
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-medium">
                    Title <span className="text-destructive">*</span>
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
                  <Label htmlFor="subtitle" className="text-xs font-medium">
                    Subtitle (optional)
                  </Label>
                  <Input
                    id="subtitle"
                    placeholder="A supplementary description of your thesis"
                    value={metadata.subtitle}
                    onChange={(e) => updateMetadata({ subtitle: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Author Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Author Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="author" className="text-xs font-medium">
                    Full Name <span className="text-destructive">*</span>
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
                  <Label htmlFor="authorId" className="text-xs font-medium">
                    Student ID (optional)
                  </Label>
                  <Input
                    id="authorId"
                    placeholder="e.g., 2024CS001"
                    value={metadata.authorId}
                    onChange={(e) => updateMetadata({ authorId: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Institution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  Institution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="university" className="text-xs font-medium">
                    University <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="university"
                    placeholder="e.g., University of Oxford"
                    value={metadata.university}
                    onChange={(e) => updateMetadata({ university: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="faculty" className="text-xs font-medium">
                    Faculty
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
                  <Label htmlFor="department" className="text-xs font-medium">
                    Department
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
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Supervisors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="supervisor" className="text-xs font-medium">
                        Supervisor <span className="text-destructive">*</span>
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
                      <Label htmlFor="supervisorTitle" className="text-xs font-medium">
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
                          <SelectItem value="Assoc. Prof.">Assoc. Professor</SelectItem>
                          <SelectItem value="Asst. Prof.">Asst. Professor</SelectItem>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Ms.">Ms.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="coSupervisor" className="text-xs font-medium">
                        Co-Supervisor (optional)
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
                      <Label htmlFor="coSupervisorTitle" className="text-xs font-medium">
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
                          <SelectItem value="Assoc. Prof.">Assoc. Professor</SelectItem>
                          <SelectItem value="Asst. Prof.">Asst. Professor</SelectItem>
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
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="submissionDate" className="text-xs font-medium">
                    Submission Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="submissionDate"
                    type="date"
                    value={metadata.submissionDate}
                    onChange={(e) =>
                      updateMetadata({ submissionDate: e.target.value })
                    }
                    required
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="graduationDate" className="text-xs font-medium">
                    Graduation Date (optional)
                  </Label>
                  <Input
                    id="graduationDate"
                    type="date"
                    value={metadata.graduationDate}
                    onChange={(e) =>
                      updateMetadata({ graduationDate: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs font-medium">
                    City / Location <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
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
                {options.includeDedication && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
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
                {options.includeAcknowledgment && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
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
              </CardContent>
            </Card>

            {/* Document Options */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Document Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Font Size</Label>
                    <Select
                      value={options.fontSize}
                      onValueChange={(val) =>
                        updateOptions({ fontSize: val as ThesisOptions["fontSize"] })
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
                        <SelectItem value="narrow">Narrow (0.75&quot;)</SelectItem>
                        <SelectItem value="normal">Normal (1&quot;)</SelectItem>
                        <SelectItem value="wide">Wide (1.25&quot;)</SelectItem>
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
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Include Appendices</Label>
                    <Switch
                      checked={options.includeAppendices}
                      onCheckedChange={(checked) =>
                        updateOptions({ includeAppendices: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Include Code Listings</Label>
                    <Switch
                      checked={options.includeListings}
                      onCheckedChange={(checked) =>
                        updateOptions({ includeListings: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Include Glossary</Label>
                    <Switch
                      checked={options.includeGlossary}
                      onCheckedChange={(checked) =>
                        updateOptions({ includeGlossary: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Per-Chapter Numbering
                    </Label>
                    <Switch
                      checked={
                        options.figureNumbering === "per-chapter"
                      }
                      onCheckedChange={(checked) =>
                        updateOptions({
                          figureNumbering: checked ? "per-chapter" : "continuous",
                          tableNumbering: checked ? "per-chapter" : "continuous",
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
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
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}
