"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/thesis/Logo";
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  BookOpen,
  Sparkles,
  FileText,
  Quote,
  Users,
  ExternalLink,
  Mail,
  GraduationCap,
  ChevronRight,
} from "lucide-react";

// ============================================================
// Blog Post Data — Placeholder content for future real articles
// ============================================================

const blogPosts = [
  {
    slug: "how-to-write-bachelors-thesis-latex",
    title: "How to Write a Bachelor's Thesis in LaTeX",
    excerpt:
      "A step-by-step walkthrough for undergraduate students who need to write a professional thesis in LaTeX. Choose the right template, structure your chapters, and export a compilable document.",
    date: "2025-04-15",
    readTime: "5 min read",
    category: "Getting Started",
    categoryColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: Sparkles,
  },
  {
    slug: "apa-vs-ieee-vs-chicago-citation-styles",
    title: "APA vs IEEE vs Chicago Citation Styles",
    excerpt:
      "Understanding the differences between APA, IEEE, and Chicago citation styles and when to use each one. ThesisForge handles all three automatically.",
    date: "2025-04-10",
    readTime: "8 min read",
    category: "Comparison",
    categoryColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: Quote,
  },
  {
    slug: "import-existing-thesis-thesisforge",
    title: "Import Your Existing Thesis into ThesisForge",
    excerpt:
      "Already started writing? Import your PDF, DOCX, TEX, or Markdown files into ThesisForge and continue editing with our step-by-step wizard.",
    date: "2025-04-05",
    readTime: "6 min read",
    category: "Guide",
    categoryColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: BookOpen,
  },
  {
    slug: "phd-dissertation-structure-chapter-guide",
    title: "PhD Dissertation Structure: Chapter-by-Chapter Guide",
    excerpt:
      "Everything you need to know about structuring a PhD dissertation. From the abstract to the appendices, we cover every chapter with practical tips.",
    date: "2025-03-28",
    readTime: "10 min read",
    category: "Guide",
    categoryColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    icon: GraduationCap,
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

// ============================================================
// Blog Page Component
// ============================================================

export default function BlogPage() {

  return (
    <div className="min-h-screen flex flex-col bg-pattern">
      {/* ============================================================ */}
      {/* Navbar */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl backdrop-saturate-[1.8]">
        <nav
          className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo + Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo size="sm" />
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Blog
            </span>
          </Link>

          {/* Back to ThesisForge CTA */}
          <Link
            href="/"
            className="gap-1.5 h-8 text-xs border border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-colors inline-flex items-center rounded-md px-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to ThesisForge</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </nav>
      </header>

      {/* ============================================================ */}
      {/* Hero Header */}
      {/* ============================================================ */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* Radial gradient depth ring behind hero */}
        <div
          className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="w-[500px] h-[400px] rounded-full opacity-[0.05]"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.65 0.22 264), transparent 70%)",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
          >
            {/* Decorative section number */}
            <span className="block text-xs font-semibold text-muted-foreground/40 tracking-widest uppercase mb-3">
              Blog
            </span>
            <div
              className="w-10 h-[2px] mx-auto mb-4 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
              aria-hidden="true"
            />

            {/* Page Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-4 text-balance">
              ThesisForge{" "}
              <span
                className="google-gradient-text"
                style={{ color: "var(--c-brand-600, #534AB7)" }}
              >
                Blog
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Practical guides on LaTeX thesis writing, citation style tutorials,
              template tips, and academic writing advice.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Blog Post Cards */}
      {/* ============================================================ */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
          >
            {blogPosts.map((post) => (
              <motion.div key={post.slug} variants={item}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block h-full"
                >
                  <div className="h-full card-hover group relative overflow-hidden border border-border/50 bg-card/50 hover:bg-card rounded-xl transition-[background-color,box-shadow] duration-200">
                    {/* Subtle gradient border on hover */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ring-1 ring-primary/20" />
                    {/* Subtle gradient on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.02] pointer-events-none rounded-xl" />

                    <div className="relative p-5 sm:p-6 flex flex-col h-full">
                      {/* Category tag + Reading time */}
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
                            post.categoryColor
                          )}
                        >
                          {post.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
                          <Clock className="w-3 h-3" />
                          {post.readTime}
                        </span>
                      </div>

                      {/* Post Icon + Title */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                          style={{
                            background:
                              "var(--color-fill-brand, rgba(83, 74, 183, 0.1))",
                          }}
                        >
                          <post.icon
                            className="w-4 h-4"
                            style={{
                              color: "var(--c-brand-600, #534AB7)",
                            }}
                          />
                        </div>
                        <h2 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                      </div>

                      {/* Excerpt */}
                      <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>

                      {/* Date + Read more arrow */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
                        <time
                          className="text-xs text-muted-foreground/60"
                          dateTime={post.date}
                        >
                          {new Date(post.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5">
                          Read
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* ============================================================ */}
          {/* Explore More Resources */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-16"
          >
            <div className="w-10 h-[2px] mx-auto mb-4 bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden="true" />
            <h2 className="section-heading text-xl sm:text-2xl text-center mb-8">
              Explore ThesisForge
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/templates/bachelors"
                className="group block p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-[background-color,box-shadow] duration-200 card-hover"
              >
                <GraduationCap
                  className="w-5 h-5 mb-2"
                  style={{ color: "var(--c-brand-600, #534AB7)" }}
                />
                <h3 className="text-sm font-semibold mb-1">
                  Thesis Templates
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bachelor, Master, PhD, Research Report, and Conference Paper
                  templates — free and ready to use.
                </p>
              </Link>
              <Link
                href="/citation-styles/apa"
                className="group block p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-[background-color,box-shadow] duration-200 card-hover"
              >
                <Quote
                  className="w-5 h-5 mb-2"
                  style={{ color: "var(--c-brand-600, #534AB7)" }}
                />
                <h3 className="text-sm font-semibold mb-1">
                  Citation Style Guides
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  APA, IEEE, Chicago, Harvard, and Vancouver citation styles
                  explained with examples.
                </p>
              </Link>
              <Link
                href="/vs/overleaf"
                className="group block p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-[background-color,box-shadow] duration-200 card-hover"
              >
                <FileText
                  className="w-5 h-5 mb-2"
                  style={{ color: "var(--c-brand-600, #534AB7)" }}
                />
                <h3 className="text-sm font-semibold mb-1">
                  Tool Comparisons
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Honest comparisons: ThesisForge vs Overleaf, Word, and LaTeX
                  Templates.
                </p>
              </Link>
            </div>
          </motion.div>

          {/* Back to ThesisForge — prominent CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-16 text-center"
          >
            <div className="inline-flex flex-col items-center gap-3 p-6 sm:p-8 rounded-2xl border border-border/50 bg-card/50">
              <p className="text-sm text-muted-foreground">
                Ready to write your thesis?
              </p>
          <Link
            href="/"
            className="gap-2 rounded-2xl google-gradient border-0 shadow-lg hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] transition-[transform,box-shadow] duration-200 inline-flex items-center justify-center px-6 h-10 text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Back to ThesisForge
            <ArrowRight className="w-4 h-4" />
          </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Footer — Matching homepage style */}
      {/* ============================================================ */}
      <nav
        className="py-10 border-t bg-muted/20"
        aria-label="Footer navigation"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Templates */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Templates
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/templates/bachelors"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Bachelor&apos;s Thesis
                  </a>
                </li>
                <li>
                  <a
                    href="/templates/masters"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Master&apos;s Thesis
                  </a>
                </li>
                <li>
                  <a
                    href="/templates/phd"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    PhD Dissertation
                  </a>
                </li>
                <li>
                  <a
                    href="/templates/research-report"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Research Report
                  </a>
                </li>
                <li>
                  <a
                    href="/templates/conference"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Conference Paper
                  </a>
                </li>
              </ul>
            </div>
            {/* Citation Styles */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Citation Styles
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/citation-styles/apa"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    APA Style
                  </a>
                </li>
                <li>
                  <a
                    href="/citation-styles/ieee"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    IEEE Style
                  </a>
                </li>
                <li>
                  <a
                    href="/citation-styles/chicago"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Chicago Style
                  </a>
                </li>
                <li>
                  <a
                    href="/citation-styles/harvard"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Harvard Style
                  </a>
                </li>
                <li>
                  <a
                    href="/citation-styles/vancouver"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Vancouver Style
                  </a>
                </li>
              </ul>
            </div>
            {/* Guides */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Guides
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/vs/overleaf"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    ThesisForge vs Overleaf
                  </a>
                </li>
                <li>
                  <a
                    href="/vs/word"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    LaTeX vs Word for Thesis
                  </a>
                </li>
                <li>
                  <a
                    href="/vs/latex-templates"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    ThesisForge vs LaTeX Templates
                  </a>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Blog &amp; Guides
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Developer Credit */}
      <section className="py-10 border-t">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Built with care by</span>
          </div>
          <p className="text-sm">
            <strong className="text-foreground font-semibold">
              Abhishek Shah
            </strong>
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-muted/80 text-muted-foreground border border-border/50">
              v2.0
            </span>
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
            <a
              href="mailto:abhishek.aimarine@gmail.com"
              className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              abhishek.aimarine@gmail.com
            </a>
            <span className="text-muted-foreground/30">&middot;</span>
            <a
              href="https://abhishekshah.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              abhishekshah.vercel.app
            </a>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-3">
            ThesisForge v2.0 &mdash; AST-based academic LaTeX thesis generator
          </p>
        </div>
      </section>
    </div>
  );
}
