"use client";

import React from "react";
import { motion } from "framer-motion";
import { useThesisStore } from "@/lib/thesis-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  ArrowRight,
  ClipboardList,
  PenTool,
  Download,
  Save,
  Mail,
  ExternalLink,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    emoji: "📋",
    title: "Standard Templates",
    description:
      "Choose from Bachelor's, Master's, PhD, or Research Report templates with pre-configured structures.",
  },
  {
    icon: PenTool,
    emoji: "✍️",
    title: "Step-by-Step Editor",
    description:
      "Fill in your content through an intuitive 6-step wizard. No LaTeX syntax needed.",
  },
  {
    icon: Download,
    emoji: "📥",
    title: "One-Click Export",
    description:
      "Download compilable .tex and .bib files ready for Overleaf, TeXStudio, or any LaTeX editor.",
  },
  {
    icon: Save,
    emoji: "💾",
    title: "Auto-Save",
    description:
      "Your progress is saved locally. Close the tab and come back anytime.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Homepage() {
  const { startWizard } = useThesisStore();

  const hasSavedState =
    typeof window !== "undefined" &&
    !!localStorage.getItem("thesisforge_state");

  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          {/* Logo/brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6"
          >
            Create Your Thesis in{" "}
            <span className="google-gradient-text hero-gradient">
              Minutes
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Select a template, fill in your content, and download
            production-ready LaTeX code. No LaTeX knowledge required.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center gap-3"
          >
            <Button
              onClick={startWizard}
              size="lg"
              className="h-14 px-10 rounded-xl text-base font-semibold gap-2 hover:scale-[1.02] transition-transform duration-200 surface-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>

            {hasSavedState && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={() => {
                  const saved = localStorage.getItem("thesisforge_state");
                  if (saved) {
                    try {
                      const parsed = JSON.parse(saved);
                      if (parsed.thesis && parsed.selectedTemplate) {
                        useThesisStore.setState({
                          thesis: parsed.thesis,
                          selectedTemplate: parsed.selectedTemplate,
                          currentStep: parsed.currentStep,
                          wizardStarted: true,
                        });
                      }
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-primary"
              >
                Start from saved draft?
              </motion.button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12"
          >
            Everything you need
          </motion.h2>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <Card className="h-full surface-1 hover:surface-2 transition-all duration-300">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl shrink-0 mt-0.5">
                        {feature.emoji}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold mb-1.5">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 border-t">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12"
          >
            How it works
          </motion.h2>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4"
          >
            {[
              {
                step: "1",
                title: "Choose Template",
                desc: "Pick from 4 academic thesis types",
              },
              {
                step: "2",
                title: "Fill Content",
                desc: "Add metadata, chapters, and references",
              },
              {
                step: "3",
                title: "Download LaTeX",
                desc: "Get production-ready .tex and .bib files",
              },
            ].map((step, idx) => (
              <motion.div
                key={step.step}
                variants={item}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
                  {step.step}
                </div>
                <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
                {idx < 2 && (
                  <div className="hidden sm:block text-muted-foreground/30 text-2xl mt-4">
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Developer Credit */}
      <section className="py-10 border-t">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            Built by{" "}
            <strong className="text-foreground font-semibold">
              Abhishek Shah
            </strong>
          </p>
          <div className="flex items-center justify-center gap-3 mt-1.5">
            <a
              href="mailto:abhishek.aimarine@gmail.com"
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              abhishek.aimarine@gmail.com
            </a>
            <span className="text-muted-foreground/30">·</span>
            <a
              href="https://abhishekshah.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              abhishekshah.vercel.app
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
