"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
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
  GraduationCap,
  BookOpen,
  FlaskConical,
  FileText,
  CheckCircle2,
  FileDown,
  Zap,
  Shield,
  Users,
  Globe,
} from "lucide-react";

// ============================================================
// Data
// ============================================================

const features = [
  {
    icon: ClipboardList,
    title: "Standard Templates",
    description:
      "Choose from Bachelor's, Master's, PhD, or Research Report templates with pre-configured academic structures.",
    badge: "4 Types",
  },
  {
    icon: PenTool,
    title: "Step-by-Step Editor",
    description:
      "Fill in your content through an intuitive 6-step wizard. No LaTeX syntax knowledge required.",
    badge: "6 Steps",
  },
  {
    icon: Download,
    title: "One-Click Export",
    description:
      "Download compilable .tex and .bib files ready for Overleaf, TeXStudio, or any LaTeX editor.",
    badge: ".tex + .bib",
  },
  {
    icon: Save,
    title: "Auto-Save & Resume",
    description:
      "Your progress is saved locally. Close the tab and come back anytime — your draft is always there.",
    badge: "Persistent",
  },
];

const useCases = [
  {
    icon: GraduationCap,
    title: "Bachelor Students",
    description: "Streamline your undergraduate thesis with the IMRAD structure and automatic formatting.",
    color: "from-blue-500/10 to-blue-600/5 dark:from-blue-400/10 dark:to-blue-500/5",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Master Students",
    description: "Comprehensive graduate thesis support with extended abstract, literature review, and appendices.",
    color: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-400/10 dark:to-emerald-500/5",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: FlaskConical,
    title: "PhD Researchers",
    description: "Full doctoral dissertation template with front matter, multiple chapters, glossary, and listings.",
    color: "from-amber-500/10 to-amber-600/5 dark:from-amber-400/10 dark:to-amber-500/5",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: FileText,
    title: "Lab Reports",
    description: "Concise research report template ideal for technical papers, lab reports, or project documentation.",
    color: "from-rose-500/10 to-rose-600/5 dark:from-rose-400/10 dark:to-rose-500/5",
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
];

const stats = [
  { value: 4, suffix: "", label: "Templates" },
  { value: 6, suffix: "-Step", label: "Wizard" },
  { value: 100, suffix: "%", label: "Browser-Based" },
  { value: 0, suffix: "", label: "Account Required", isSpecial: true },
];

const steps = [
  {
    step: "1",
    title: "Choose Template",
    desc: "Pick from 4 academic thesis types tailored to your degree level",
    icon: ClipboardList,
  },
  {
    step: "2",
    title: "Fill Content",
    desc: "Add metadata, chapters, references, and fine-tune formatting options",
    icon: PenTool,
  },
  {
    step: "3",
    title: "Download LaTeX",
    desc: "Get production-ready .tex and .bib files compiled and ready to go",
    icon: Download,
  },
];

const trustBadges = [
  {
    icon: Globe,
    title: "Works with Overleaf",
    desc: "Export directly to your Overleaf projects",
  },
  {
    icon: FileDown,
    title: "Compilable LaTeX",
    desc: "Clean, standards-compliant LaTeX output",
  },
  {
    icon: Shield,
    title: "No Account Required",
    desc: "Everything runs locally in your browser",
  },
];

// ============================================================
// Animation Variants
// ============================================================

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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

// ============================================================
// Floating Shapes Configuration
// ============================================================

const floatingShapes = [
  {
    shape: "circle" as const,
    size: 18,
    color: "oklch(0.488 0.217 264 / 0.12)",
    x: "10%",
    y: "20%",
    anim: "floatShape1",
    delay: "0s",
  },
  {
    shape: "square" as const,
    size: 14,
    color: "oklch(0.60 0.18 305 / 0.10)",
    x: "85%",
    y: "15%",
    anim: "floatShape2",
    delay: "1s",
  },
  {
    shape: "circle" as const,
    size: 10,
    color: "oklch(0.55 0.20 42 / 0.12)",
    x: "75%",
    y: "65%",
    anim: "floatShape1",
    delay: "2s",
  },
  {
    shape: "square" as const,
    size: 12,
    color: "oklch(0.60 0.18 155 / 0.10)",
    x: "15%",
    y: "70%",
    anim: "floatShape2",
    delay: "0.5s",
  },
  {
    shape: "circle" as const,
    size: 8,
    color: "oklch(0.488 0.217 264 / 0.08)",
    x: "50%",
    y: "10%",
    anim: "floatShape1",
    delay: "1.5s",
  },
  {
    shape: "square" as const,
    size: 16,
    color: "oklch(0.65 0.19 305 / 0.08)",
    x: "90%",
    y: "45%",
    anim: "floatShape2",
    delay: "0.8s",
  },
];

// ============================================================
// Counter Hook
// ============================================================

function useCounter(target: number, inView: boolean, duration = 1500, special = false) {
  const [count, setCount] = useState(0);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!inView || special || animatedRef.current) return;
    animatedRef.current = true;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [inView, target, duration, special]);

  return count;
}

// ============================================================
// Stat Counter Component
// ============================================================

function StatCounter({ stat, index }: { stat: typeof stats[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const count = useCounter(stat.value, isInView, 1500, stat.isSpecial);

  return (
    <motion.div
      ref={ref}
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="text-center p-4 sm:p-6"
    >
      <div className="text-3xl sm:text-4xl lg:text-5xl font-bold google-gradient-text mb-2">
        {stat.isSpecial ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Zero
          </motion.span>
        ) : (
          <>
            {count}
            {stat.suffix}
          </>
        )}
      </div>
      <p className="text-sm sm:text-base text-muted-foreground font-medium">
        {stat.label}
      </p>
    </motion.div>
  );
}

// ============================================================
// Homepage Component
// ============================================================

export function Homepage() {
  const { startWizard } = useThesisStore();

  const hasSavedState =
    typeof window !== "undefined" &&
    !!localStorage.getItem("thesisforge_state");

  const heroRef = useRef<HTMLElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });

  const subtitleWords = [
    "Select", "a", "template,", "fill", "in", "your", "content,", "and",
    "download", "production-ready", "LaTeX", "code.", "No", "LaTeX",
    "knowledge", "required.",
  ];

  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col">
      {/* ============================================================ */}
      {/* Hero Section */}
      {/* ============================================================ */}
      <section
        ref={heroRef}
        className="relative flex-1 flex items-center justify-center py-20 sm:py-28 lg:py-32 overflow-hidden"
      >
        {/* Floating Geometric Shapes */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {floatingShapes.map((shape, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: shape.x,
                top: shape.y,
                width: shape.size,
                height: shape.size,
                backgroundColor: shape.color,
                borderRadius: shape.shape === "circle" ? "50%" : "4px",
                animation: `${shape.anim} ${8 + i * 2}s ease-in-out infinite`,
                animationDelay: shape.delay,
                opacity: 0,
                animationFillMode: "both",
              }}
            />
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Logo / Brand */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-10"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/10 mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8"
          >
            Create Your Thesis{" "}
            <br className="hidden sm:block" />
            in{" "}
            <span className="google-gradient-text hero-gradient inline-block">
              Minutes
            </span>
          </motion.h1>

          {/* Subtitle with staggered word animation */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12"
          >
            {heroInView &&
              subtitleWords.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.4 + i * 0.04,
                    ease: "easeOut",
                  }}
                  className="inline-block mr-[0.25em]"
                >
                  {word}
                </motion.span>
              ))}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <Button
              onClick={startWizard}
              size="lg"
              className="h-14 px-10 rounded-xl text-base font-semibold gap-2 hover:scale-[1.02] transition-transform duration-200 surface-2 cta-pulse"
            >
              <Zap className="w-5 h-5" />
              Get Started — It&apos;s Free
              <ArrowRight className="w-5 h-5" />
            </Button>

            {hasSavedState && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
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
                      // ignore corrupted state
                    }
                  }
                }}
                className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-primary/5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Resume saved draft
              </motion.button>
            )}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Stats Counter Section */}
      {/* ============================================================ */}
      <section className="py-12 sm:py-16 border-y bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <StatCounter key={stat.label} stat={stat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Features Grid */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Everything you need
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              From template selection to LaTeX export, ThesisForge handles the entire thesis creation pipeline.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <Card className="h-full card-hover group relative overflow-hidden border-border/50 bg-card/50 hover:bg-card transition-all duration-300">
                  {/* Subtle gradient on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.02] pointer-events-none" />
                  <CardContent className="relative p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 mt-0.5 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-sm font-semibold">
                            {feature.title}
                          </h3>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary">
                            {feature.badge}
                          </span>
                        </div>
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

      {/* ============================================================ */}
      {/* Perfect For Section */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24 bg-muted/30 border-y">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Perfect for
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              Tailored templates for every academic level and use case.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {useCases.map((useCase) => (
              <motion.div key={useCase.title} variants={item}>
                <Card className={`h-full card-hover group border-border/50 bg-gradient-to-br ${useCase.color} transition-all duration-300`}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 mt-0.5 w-10 h-10 rounded-lg ${useCase.iconBg} flex items-center justify-center`}>
                        <useCase.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-1">
                          {useCase.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {useCase.description}
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

      {/* ============================================================ */}
      {/* How It Works */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              How it works
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              Three simple steps to a polished, compilable thesis.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative"
          >
            {/* Connecting line (desktop) */}
            <div className="hidden sm:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
              {steps.map((step, idx) => (
                <motion.div
                  key={step.step}
                  variants={item}
                  className="text-center relative"
                >
                  {/* Step number circle */}
                  <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground font-bold text-xl mb-5 ring-4 ring-primary/10">
                    {step.step}
                  </div>
                  {/* Step icon */}
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted mb-3">
                    <step.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                    {step.desc}
                  </p>
                  {/* Arrow (mobile) */}
                  {idx < 2 && (
                    <div className="sm:hidden text-muted-foreground/30 text-2xl mt-4">
                      ↓
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Trust / Credibility Badges */}
      {/* ============================================================ */}
      <section className="py-12 sm:py-16 border-y bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {trustBadges.map((badge) => (
              <motion.div
                key={badge.title}
                variants={item}
                className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <badge.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{badge.title}</h4>
                  <p className="text-xs text-muted-foreground">{badge.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Developer Credit */}
      {/* ============================================================ */}
      <section className="py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Built with care by</span>
          </div>
          <p className="text-sm">
            <strong className="text-foreground font-semibold">
              Abhishek Shah
            </strong>
          </p>
          <div className="flex items-center justify-center gap-3 mt-2">
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
          <p className="text-[10px] text-muted-foreground/50 mt-3">
            ThesisForge — Open-source academic LaTeX thesis generator
          </p>
        </div>
      </section>
    </div>
  );
}
