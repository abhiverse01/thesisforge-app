<div align="center">

# ThesisForge

**AST-Based Academic LaTeX Thesis Generator**

[Live Demo](https://thesisforge-web.vercel.app) · Built by [Abhishek Shah](https://abhishekshah.vercel.app) · v2.0

[Report Bug](mailto:abhishek.aimarine@gmail.com) · [Blog & Guides](https://thesisforge-web.vercel.app/blog) · [Templates](https://thesisforge-web.vercel.app/templates/bachelors)

<img src="https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js" alt="Next.js" /> <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React" /> <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" /> <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Zustand-5.0-orange?style=flat-square" alt="Zustand" /> <img src="https://img.shields.io/badge/Framer_Motion-12-ff69b4?style=flat-square" alt="Framer Motion" />

</div>

---

## Table of Contents

- [What is ThesisForge?](#what-is-thesisforge)
- [Live Demo & Links](#live-demo--links)
- [How It Works](#how-it-works)
- [Architecture Overview](#architecture-overview)
- [The Thesis Engine](#the-thesis-engine)
  - [AST Pipeline](#ast-pipeline)
  - [LaTeX Output Quality Contract](#latex-output-quality-contract)
  - [Bibliography Engine](#bibliography-engine)
  - [Compilation Simulator](#compilation-simulator)
  - [Intelligence Layer](#intelligence-layer)
  - [Thesis Memory System](#thesis-memory-system)
  - [Writing Coach](#writing-coach)
- [The UI & Design System](#the-ui--design-system)
- [The 6-Step Wizard](#the-6-step-wizard)
- [Version Comparison & Diff](#version-comparison--diff)
- [Persistence & Data Safety](#persistence--data-safety)
- [State Management](#state-management)
- [Validation Engine](#validation-engine)
- [SEO Infrastructure](#seo-infrastructure)
- [Content Pages](#content-pages)
- [Hidden Features & Easter Eggs](#hidden-features--easter-eggs)
- [Templates](#templates)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Contributing](#contributing)

---

## What is ThesisForge?

ThesisForge is a **production-grade, browser-based academic thesis generator** that produces **compilable LaTeX code** without requiring any LaTeX knowledge. You choose a template, fill in your content through an intuitive wizard interface, and export a ready-to-compile `.zip` archive containing `main.tex`, `references.bib`, and a `README.md`.

It is **100% client-side** — no server processing, no accounts, no data leaves your browser. Everything runs locally in a single Next.js application powered by a sophisticated Abstract Syntax Tree (AST) pipeline, a Finite State Machine (FSM) for wizard navigation, a 4-pass compilation simulator, an 8-algorithm intelligence layer, and a thesis memory system that tracks your writing patterns over time and generates actionable insights.

### Key Principles

- **No LaTeX knowledge required** — The wizard handles everything
- **Zero server dependency for export** — All LaTeX generation and ZIP packaging runs in the browser
- **Persistence by default** — Auto-saves to IndexedDB; resume from any device
- **Intelligence over enforcement** — Suggestions guide, never block
- **Data safety** — Input sanitization, quota handling, emergency backups, and cross-tab conflict detection
- **Privacy-first** — All data stays in your browser; nothing is sent to any server

---

## Live Demo & Links

| Resource | URL |
|----------|-----|
| **Live App** | [thesisforge-web.vercel.app](https://thesisforge-web.vercel.app) |
| **Bachelor's Template** | [thesisforge-web.vercel.app/templates/bachelors](https://thesisforge-web.vercel.app/templates/bachelors) |
| **Master's Template** | [thesisforge-web.vercel.app/templates/masters](https://thesisforge-web.vercel.app/templates/masters) |
| **PhD Template** | [thesisforge-web.vercel.app/templates/phd](https://thesisforge-web.vercel.app/templates/phd) |
| **Research Report** | [thesisforge-web.vercel.app/templates/research-report](https://thesisforge-web.vercel.app/templates/research-report) |
| **Blog & Guides** | [thesisforge-web.vercel.app/blog](https://thesisforge-web.vercel.app/blog) |
| **ThesisForge vs Overleaf** | [thesisforge-web.vercel.app/vs/overleaf](https://thesisforge-web.vercel.app/vs/overleaf) |
| **LaTeX vs Word** | [thesisforge-web.vercel.app/vs/word](https://thesisforge-web.vercel.app/vs/word) |
| **APA Citation Style** | [thesisforge-web.vercel.app/citation-styles/apa](https://thesisforge-web.vercel.app/citation-styles/apa) |
| **IEEE Citation Style** | [thesisforge-web.vercel.app/citation-styles/ieee](https://thesisforge-web.vercel.app/citation-styles/ieee) |
| **Sitemap** | [thesisforge-web.vercel.app/sitemap.xml](https://thesisforge-web.vercel.app/sitemap.xml) |
| **robots.txt** | [thesisforge-web.vercel.app/robots.txt](https://thesisforge-web.vercel.app/robots.txt) |

---

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Template    │────▶│   Metadata   │────▶│   Chapters   │────▶│  References  │────▶│   Format     │────▶│   Generate   │
│   Selection   │     │   & Abstract  │     │   Editor     │     │   Manager    │     │   Config     │     │   & Export    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
    Step 1               Step 2               Step 3               Step 4               Step 5               Step 6
```

1. **Choose a template** — Bachelor's, Master's, PhD, or Research Report
2. **Fill in metadata** — Title, author, university, abstract, keywords, supervisor
3. **Write chapters** — Add, reorder (drag & drop), edit with subsections
4. **Manage references** — Add citations with type-specific fields, BibTeX validation
5. **Configure format** — Font size, paper size, spacing, margins, citation style, numbering
6. **Generate & export** — Quality contract verification → Compilation simulation → ZIP download → Compile on Overleaf

---

## Architecture Overview

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main entry — wizard orchestrator (1100+ lines)
│   ├── layout.tsx                # Root layout (Poppins font, theme, JSON-LD, toasters)
│   ├── globals.css               # OKLCH color system, animations, typography scale (1284 lines)
│   ├── opengraph-image.tsx       # Dynamic OG image generator (server-rendered SVG)
│   ├── robots.ts                 # SEO robots.txt configuration
│   ├── sitemap.ts                # 14-page XML sitemap
│   ├── api/
│   │   ├── route.ts              # AI-powered API (z-ai-web-dev-sdk)
│   │   └── generate-latex/route.ts  # Server-side LaTeX generation endpoint
│   ├── blog/                     # SEO blog pages
│   │   ├── page.tsx              # Blog index
│   │   └── [slug]/page.tsx       # Individual blog posts
│   ├── citation-styles/          # Citation style SEO pages
│   │   └── [style]/page.tsx      # APA, IEEE, Chicago, Harvard, Vancouver
│   ├── templates/                # Template showcase SEO pages
│   │   └── [slug]/page.tsx       # Per-template detail pages
│   └── vs/                       # VS comparison SEO pages
│       └── [slug]/page.tsx       # ThesisForge vs Overleaf, LaTeX vs Word, etc.
│
├── core/                         # Pure business logic — zero UI dependency
│   ├── fsm.ts                    # Finite State Machine (wizard navigation)
│   ├── fsmGuard.ts               # FSM state validator (Zone 1A)
│   ├── ast.ts                    # AST node types & factory functions (22 node types)
│   ├── ast-builder.ts            # ThesisData → AST builder
│   ├── serializer.ts             # AST → .tex string serializer
│   ├── validators.ts             # Per-step field validators
│   ├── persistence.ts            # IndexedDB engine (drafts, snapshots, settings, memory)
│   ├── history.ts                # Undo/Redo stack (50 entries)
│   ├── export.ts                 # Export pipeline (ZIP, TEX-only, Bib-only)
│   ├── bib.ts                    # BibTeX generator (field-level validation)
│   ├── linter.ts                 # Post-generation LaTeX lint engine (12 rules)
│   ├── compilation-simulator.ts  # 4-pass compilation prediction engine
│   ├── latexAssertions.ts        # 30-check quality contract
│   ├── annotations.ts            # Annotation system
│   ├── compiler-targets.ts       # Compiler target definitions
│   ├── thesis-timeline.ts        # Thesis timeline visualization
│   └── templates.ts              # Declarative template schema definitions
│
├── engine/                       # Layer 5: Document Intelligence
│   ├── intelligence.ts           # 7 intelligence rules (cross-refs, orphans, etc.)
│   ├── escape.ts                 # LaTeX body/meta escape functions
│   └── packages.ts               # Package metadata
│
├── intelligence/                 # 8-algorithm analysis layer + Memory
│   ├── scheduler.ts              # Step-aware debounce scheduler (requestIdleCallback)
│   ├── types.ts                  # Shared types for all algorithms
│   ├── index.ts                  # Barrel exports
│   ├── citationParser.ts         # Algorithm 1: Citation text parser
│   ├── deduplicator.ts           # Algorithm 2: Reference deduplicator (Jaro-Winkler)
│   ├── structureAnalyzer.ts      # Algorithm 3: Chapter structure analysis
│   ├── keywordExtractor.ts       # Algorithm 4: Keyword extraction
│   ├── citationGraph.ts          # Algorithm 5: Citation cross-reference graph
│   ├── completenessScorer.ts     # Algorithm 6: Weighted completeness rubric
│   ├── latexHeuristics.ts        # Algorithm 7: LaTeX pattern detection & auto-fix
│   ├── readingStats.ts           # Algorithm 8: Reading time & sentence analysis
│   ├── thesisMemory.ts           # System 7: Thesis memory (writing patterns, insights)
│   ├── semanticGraph.ts          # Semantic graph analysis
│   └── writingCoach.ts           # Writing coach with contextual tips
│
├── lib/                          # Data layer & utilities
│   ├── thesis-types.ts           # TypeScript type system & template definitions
│   ├── thesis-store.ts           # Zustand store (700 lines, FSM-gated navigation)
│   ├── latex-generator.ts        # Public LaTeX generation API
│   ├── db.ts                     # Prisma database client
│   └── utils.ts                  # Tailwind merge & general utilities
│
├── components/
│   ├── thesis/                   # Domain-specific thesis components (14 files)
│   └── ui/                       # shadcn/ui primitives (45+ components)
│
├── hooks/                        # React hooks (use-toast, use-mobile)
├── utils/                        # Utility functions (debounce, sanitizer, word-count, etc.)
├── tests/                        # Test files (FSM guard tests)
├── ui/                           # Design tokens (OKLCH color palette, 145 lines)
└── prisma/                       # Database schema
```

---

## The Thesis Engine

### AST Pipeline

ThesisForge does **not** build LaTeX via string concatenation. It uses a proper **Abstract Syntax Tree (AST)** with 22 typed node kinds:

```
ThesisData → AST Builder → AST Nodes → Serializer → .tex string
```

**Core node types:**

| Node Type | Purpose |
|-----------|---------|
| `Document` | Root container |
| `Preamble` | Document class, packages, macros |
| `DocumentClass` | `\documentclass[options]{name}` |
| `PackageImport` | `\usepackage[options]{name}` |
| `Command` | Generic `\name[opt]{arg}` |
| `Environment` | `\begin{name}...\end{name}` |
| `Text` | Escaped text content |
| `Comment` | `% ...` |
| `MacroDef` | `\newcommand{name}{def}` |

**Extended node types (Engine v2):**

| Node Type | Purpose |
|-----------|---------|
| `Math` | `$...$` and `\[...\]` |
| `Verbatim` | `\verbatim` / `\begin{lstlisting}` |
| `List` | `itemize` / `enumerate` / `description` |
| `Figure` | `\begin{figure}` with caption/label |
| `Table` | `\begin{table}` with headers/rows |
| `Citation` | `\citep`, `\citet`, `\citeauthor` |
| `Label` / `Ref` | `\label{}` and `\cref{}` |
| `Footnote` | `\footnote{}` |
| `RawLaTeX` | Passthrough for advanced users |

### LaTeX Output Quality Contract

Every generated document must pass **30 automated checks** before export. These are grouped into categories:

| Category | Checks | Severity | Description |
|----------|--------|----------|-------------|
| **Compilability** | C01–C07 | Error | Balanced braces, matched environments, correct document structure |
| **Package Integrity** | P01–P05 | Error/Warning | Required packages present, no duplicates, hyperref loading order |
| **Structure** | S01–S07 | Error/Warning | No empty chapters, TOC present, bibliography coherent |
| **Bibliography** | B01–B03 | Warning | No undefined citations, no duplicate BibTeX keys |
| **Metadata** | M01–M04 | Warning | PDF metadata in hypersetup, fancyhdr page style |
| **Quality** | Q01–Q05 | Info | Quote style, microtype, bibliography style |
| **Advanced** | A01–A03 | Info | Labels exist, abstract content, line length |

Errors **block** export. Warnings and info surface in the UI but allow the user to proceed.

### Bibliography Engine

The bibliography is where most student LaTeX breaks. ThesisForge makes it **unbreakable**:

- **8 entry types**: `article`, `book`, `inproceedings`, `techreport`, `phdthesis`, `mastersthesis`, `online`, `misc`
- **Field-level validation**: Required fields per entry type are checked before export
- **Field-specific sanitization**: Author fields handle `and`/`&` separators; titles escape `&` and `%`; pages normalize to en-dashes; URLs percent-encode spaces; years are digits-only
- **TODO placeholders**: Missing required fields generate `{TODO: Add field}` instead of producing invalid BibTeX
- **Cite key generation**: Deterministic keys from `author + year + titleWord` with accent normalization and non-alphanumeric stripping
- **Duplicate detection**: Jaro-Winkler similarity scoring flags potential duplicate references

### Compilation Simulator

A **4-pass pure-function analysis engine** that predicts real `pdflatex` compilation outcomes from raw `.tex` and `.bib` strings — without needing an actual TeX distribution:

| Pass | Name | What It Checks |
|------|------|---------------|
| **Pass 1** | Tokenizer | Character-by-character scanning for brace, bracket, environment, and math balance |
| **Pass 2** | Package Resolver | Extracts `\usepackage` calls, detects 5+ known package conflicts (subfig/subcaption, natbib/biblatex, etc.), validates load-order rules (natbib before hyperref, hyperref before cleveref), and flags unknown packages |
| **Pass 3** | Command Validator | Cross-references 200+ LaTeX built-in commands, maps 60+ packages to their provided commands, detects unknown commands, resolves `\label`/`\ref`/`\cref` cross-references, and reports unresolved references |
| **Pass 4** | BibTeX Resolver | Parses all citation commands from `.tex`, extracts BibTeX keys from `.bib`, validates citation-key cross-references, and checks for `\bibliography`/`\bibliographystyle` consistency |

The simulator produces a `SimulationResult` containing errors, warnings, info messages, estimated page count (~300 words/page), a compilation recipe (pdflatex → bibtex → pdflatex x2), package summary, label summary, and citation summary. It knows 80+ LaTeX packages and 200+ built-in commands.

### Intelligence Layer

The intelligence system runs **8 independent algorithms** orchestrated by a step-aware scheduler:

| # | Algorithm | Triggered On | Debounce | Description |
|---|-----------|-------------|----------|-------------|
| 1 | Citation Parser | Step 4 | 500ms | Parses raw citation text into structured fields |
| 2 | Deduplicator | Step 4 | 1000ms | Detects duplicate references using Jaro-Winkler distance |
| 3 | Structure Analyzer | Steps 3, 6 | 1500ms | Analyzes word count distribution across chapters |
| 4 | Keyword Extractor | Steps 3, 6 | 2000ms | Extracts keywords from chapter content |
| 5 | Citation Graph | Steps 3, 4, 6 | 800ms | Maps citation → reference relationships |
| 6 | Completeness Scorer | All steps | 300ms | Weighted rubric scoring thesis completeness |
| 7 | LaTeX Heuristics | Step 3 | 800ms | Detects common LaTeX anti-patterns with auto-fix |
| 8 | Reading Stats | Steps 3, 6 | 500ms | Word counts, reading time, sentence length analysis |

**Engine Intelligence (Layer 5)** runs at export time and adds 7 additional rules:

- Cross-reference validation (`\ref{}` targets exist)
- Orphan section detection (1-2 sentence sections)
- Citation density check (too many or too few citations per chapter)
- Abstract quality gate (5 required elements: context, gap, method, result, impact)
- Conclusion completeness check (summary, contribution, limitations, future work, impact)
- Chapter word count check (minimum thresholds per chapter type)
- Structure balance analysis (flags chapters >40% or <5% of total)

**Scheduler features:**
- `requestIdleCallback` for non-blocking execution
- Per-algorithm debounce timers
- Step-aware: only runs relevant algorithms for the current wizard step
- Results aggregated in a single callback

### Thesis Memory System

A sophisticated event-tracking and pattern-detection system (System 7) that monitors your writing behavior over time and generates actionable insights:

**14 event types tracked:**
`chapter-added`, `chapter-retitled`, `chapter-removed`, `word-count-delta`, `reference-added`, `reference-removed`, `score-change`, `quality-gate-pass`, `template-changed`, `export-performed`, `session-start`, `session-end`, `snapshot-created`

**10 insight-detection rules:**

| Rule | Type | Trigger |
|------|------|---------|
| Stagnation Detection | Warning | Same chapter edited 5+ sessions without +100 words |
| Score Regression | Warning | Completeness score dropped >10 since last session |
| Reference Hoarding | Tip | 8+ references added without content increase in 24h |
| First Chapter Complete | Achievement | Any chapter reaches 90% of target word count |
| Draft Complete | Achievement | Total words exceeds minimum for thesis type |
| Writing Streak | Achievement | 3+ consecutive days with >50 net words |
| Citation Coverage | Achievement | Every chapter has at least one citation |
| Score Milestones | Achievement | Score crosses 50, 70, or 90 for the first time |
| Long Session Warning | Tip | Session >60 min with <50 words added |
| Rapid Deletion | Tip | More words deleted than written in a session |

**Writing velocity computation:**
- Tracks daily words written, deleted, and net across 30-day windows
- Estimates active minutes per day from session boundaries
- Categorizes velocity as high (500+ words/day), moderate (100+), low (10+), or stalled

**Session summaries:**
- Each writing session is tracked with start/end events
- Previous session summary displayed as toast on re-open
- Records words added/deleted, chapters modified, references added, and score changes

### Writing Coach

A contextual writing assistance system that provides real-time tips based on the current editing context. The coach analyzes your writing patterns, chapter structure, and content quality to surface relevant suggestions, style improvements, and academic writing best practices — all without interrupting your flow.

---

## The UI & Design System

### Visual Design Language

ThesisForge uses a **Google Material Design-inspired** visual system built on **OKLCH color space** for perceptually uniform colors across light and dark themes:

- **Primary**: `oklch(0.50 0.22 264)` — Deep blue
- **Surface elevation**: 4 levels of shadow (`--shadow-sm` through `--shadow-xl`)
- **Typography**: 8-level scale using Poppins (Google Fonts, weights 300–800)
- **Design tokens**: 145-line CSS token layer with brand palette, semantic surfaces, text colors, borders, status fills, spacing grid, radius levels, elevation shadows, z-index scale, and motion timing
- **Animations**: Custom motion language with 12+ named keyframe animations
- **Glass effects**: Frosted glass header on scroll (`backdrop-blur-xl`)
- **Gradient accents**: Google-style multi-stop gradient for primary CTAs
- **Micro-interactions**: `card-hover`, `card-shimmer`, `card-lift`, `cta-pulse` CSS classes

### Dark Mode

Full dark mode support with:
- True dark background (`oklch(0.105 0.015 260)`)
- Brighter blue primary for contrast (`oklch(0.65 0.22 259)`)
- Elevated shadow opacity for depth perception
- All semantic colors recalibrated for dark backgrounds
- Class-based switching via `next-themes` with `suppressHydrationWarning`

### Motion System

The animation system uses CSS custom properties for timing and respects `prefers-reduced-motion: reduce`:

| Animation | Purpose | Trigger |
|-----------|---------|---------|
| `tf-fade-up` | Panels/cards entering from below | Step transitions |
| `tf-pop` | Modals and dropdowns | Dialogs |
| `tf-slide-right` | Intelligence sidebar | Toggle panel |
| `tf-step-enter/exit` | Wizard step changes | Navigation |
| `tf-ring-pulse` | Score ring level-up moment | Completeness ≥ 90 |
| `tf-shimmer` | Skeleton loading states | Data loading |
| `tf-chapter-in` | Chapter items appearing | Add/reorder |
| `tf-export-success` | Export confirmation checkmark | Download complete |
| `ctaPulse` | Primary CTA button attention | Homepage |
| `floatShape1/2` | Floating geometric shapes | Hero section |
| `breathe` | Pulsing opacity | Decorative elements |

### Homepage Features

- **Word-by-word hero animation**: Title and subtitle animate word-by-word with staggered 40ms delays using Framer Motion
- **Animated stat counters**: `requestAnimationFrame`-powered cubic-eased number counting when elements enter viewport, with `<noscript>` fallback for SEO
- **Floating geometric shapes**: 8 soft-edged circles and squares with OKLCH colors and staggered float animations
- **Progressive disclosure**: "Learn More" toggle with smooth height animation
- **Draft detection**: Checks IndexedDB on mount and shows "Resume saved draft" with pulsing indicator if data exists
- **SEO footer**: Sitemap-style link block with templates, citation styles, and guides for crawlability
- **Trust badges**: Overleaf compatibility, compilable LaTeX, and no-account-required badges

### Component Library

Built on **shadcn/ui** with **45+ Radix UI primitives** including: accordion, alert-dialog, carousel, chart, collapsible, command palette, context-menu, drawer, dropdown-menu, hover-card, input-otp, menubar, navigation-menu, resizable panels, sheet, sonner toast, table, tabs, toggle-group, and more.

---

## The 6-Step Wizard

The wizard is governed by a **Finite State Machine (FSM)** with 7 states and 6 user-facing steps:

```
IDLE → TEMPLATE_SELECT → METADATA → CHAPTERS → REFERENCES → FORMAT → PREVIEW
```

### Navigation Guards

| Transition | Guard | Behavior |
|-----------|-------|----------|
| IDLE → TEMPLATE_SELECT | None | Always allowed |
| TEMPLATE_SELECT → METADATA | Template selected | Blocks if no template |
| METADATA → CHAPTERS | Title + author filled | Blocks with error |
| CHAPTERS → REFERENCES | Chapters exist | Warning only |
| REFERENCES → FORMAT | — | Always allowed |
| FORMAT → PREVIEW | — | Always allowed |

**Back navigation** is always allowed (never guarded). **Jump navigation** validates all intermediate steps.

### Step Details

#### Step 1: Template Selection

Choose from 4 academic templates. Each template sets:
- Document class and class options
- Required LaTeX packages
- Default chapter structure (pre-populated with subsections)
- Formatting defaults (font, spacing, margins, citation style)
- Required and optional metadata fields

Each template card shows a colored dot badge, hover shimmer effect, and links to a dedicated SEO landing page.

#### Step 2: Metadata & Abstract

- Title, subtitle, author, student ID
- University, faculty, department
- Supervisor and co-supervisor with titles
- Submission and graduation dates
- Abstract with word limit enforcement per template type
- Keywords with add/remove
- Dedication and acknowledgment text
- Input sanitization (Zone 6A) on all fields

#### Step 3: Chapter Editor

- Add, remove, reorder chapters via **drag & drop** (`@dnd-kit`)
- Edit chapter title and body content
- Add/remove/reorder subsections within chapters
- Subsection content editing
- LaTeX-aware content (pass-through for advanced users)
- Smart paste detection with brand-color flash animation
- Inline undo on delete (toast with "Undo" action)

#### Step 4: Reference Manager

- Add references with **type-specific fields** (8 types)
- Field-level BibTeX validation with error messages
- Smart author field handling (`and` separators)
- DOI and URL validation
- Year format enforcement (4 digits)
- Bulk import capability
- Jaro-Winkler duplicate detection
- Inline undo on delete

#### Step 5: Format Configuration

- Font size (10pt, 11pt, 12pt)
- Paper size (A4, Letter)
- Line spacing (single, one-half, double)
- Margin size (normal, narrow, wide)
- Citation style (IEEE, APA, Vancouver, Chicago, Harvard)
- Figure and table numbering (per-chapter, continuous)
- Toggle: dedication, acknowledgment, appendices, listings, glossary
- TOC depth (1-4)

#### Step 6: Generate & Export

- Pre-export 30-check quality contract
- 4-pass compilation simulation (tokenizer → packages → commands → BibTeX)
- Engine intelligence analysis (7 rules)
- LaTeX lint check (12 rules)
- Inline preview of generated code with syntax highlighting
- One-click ZIP download containing `main.tex`, `references.bib`, `README.md`, and `figures/` directory
- Export warnings displayed inline (don't block)
- Export recorded in thesis memory system

---

## Version Comparison & Diff

ThesisForge includes a **full version comparison dialog** (ThesisDiff) that lets you compare any two snapshots or the current state:

**Comparison dimensions (20+):**
- Total word count, abstract words, chapter count, reference count, appendix count, keywords count
- 7 metadata fields (title, author, university, department, faculty, supervisor, submission date)
- 13 formatting options (font size, paper size, line spacing, margin size, citation style, figure/table numbering, TOC depth, dedication, acknowledgment, appendices, listings, glossary)

**Visual analysis:**
- **Bar chart**: Per-chapter word count comparison using Recharts, with A/B overlay and delta tooltip
- **Dimension table**: Color-coded change indicators (green for added, red for removed, amber for changed)
- **Chapter details**: Expandable accordion per chapter showing word counts, section counts, and title changes
- **Reference changes**: Lists added and removed references with author, title, and year

**Snapshot management:**
- Select from saved snapshots or compare against "Current State (live)"
- Snapshots loaded from IndexedDB with tagged labels and timestamps
- Skeleton loading states during comparison computation

---

## Persistence & Data Safety

### IndexedDB Storage

All data is stored in **IndexedDB** (not localStorage) via the `idb` library for large thesis storage:

| Store | Purpose | Key |
|-------|---------|-----|
| `drafts` | Current draft state | `__current__` |
| `snapshots` | Manual save points | `snap-{timestamp}-{random}` |
| `settings` | App settings | Setting key |
| `memory` | Thesis memory events | Draft ID |

### Auto-Save

- Triggers 1 second after any state change (debounced)
- Silent save — no toast on auto-save
- Save status indicator in the header (idle → saving → saved → error)
- First successful auto-save shows "Auto-save is on" toast (one-time)
- Monotonic version counter for cross-tab conflict detection

### Schema Migrations

- **Additive-only**: New stores are added, never deleted
- **Version 1**: Initial `drafts` and `settings` stores
- **Version 2**: Added `snapshots` store + localStorage migration
- **Version 3**: Added `version` field for conflict detection
- **Version 4**: Added `memory` store for thesis memory events

### In-Memory Fallback (Private Mode)

When IndexedDB is unavailable (private browsing, blocked by policy), the system falls back to an **in-memory Map-based database**. Data persists within the session but is lost on tab close. The UI detects this and adjusts behavior accordingly.

### Cross-Tab Conflict Detection

Each save increments a **monotonic version counter** stored in both IndexedDB and `sessionStorage`. On load, if the stored version is more than 1 ahead of the last known version, a conflict is flagged and the newer data is accepted.

### Emergency Backup

If IndexedDB storage quota is exceeded (`QuotaExceededError`), an **emergency JSON download** is triggered automatically — the user's data is never silently lost.

### Input Sanitization (Zone 6A)

Every user input field is sanitized before storage:
- Null bytes and control characters stripped
- Zero-width characters (U+200B, U+FEFF, U+00AD) stripped
- Line endings normalized to `\n`
- Field-specific length limits (title: 500, author: 300, abstract: 5000, chapter body: 200,000)
- Field-type rules: single-line flattening, year digit-only, cite-key alphanumeric

### Draft Restoration (Zone 5A)

Data loaded from IndexedDB is **never trusted raw**. Every field is sanitized with safe fallbacks:
- Type checking on all fields (ThesisType, chapter structure, options)
- Default values for missing or corrupt fields
- Reference type validation against known BibTeX entry types
- Numeric range validation (step index, chapter numbers)

### `beforeunload` Warning

When a wizard session is active, closing the tab shows a browser-native "Leave site?" warning to prevent accidental data loss.

---

## State Management

### Zustand Store (`thesis-store.ts`)

A 700-line Zustand store manages the entire application state:

- **Core state**: `thesis`, `currentStep`, `selectedTemplate`, `saveStatus`
- **Wizard lifecycle**: `startWizard()`, `goToHome()`, `reset()`
- **FSM-gated navigation**: `nextStep()`, `prevStep()`, `setStep()`, `canGoNext()`, `canGoToStep()`
- **CRUD operations**: Chapters, subsections, references, appendices, metadata, options
- **Undo support**: `lastDeletedChapter`, `lastDeletedReference`, `undoDeleteChapter()`, `undoDeleteReference()`
- **Export/Import**: `exportProject()` → JSON, `importProject()` → restore
- **Sanitized updates**: `updateChapterTitle()`, `updateMetadataSanitized()`, `updateChapterBody()` — these sanitize input before storing
- **Completion tracking**: `getCompletionPercentage()`, `getProgressPercent()`

### Undo/Redo History Stack

A linear history stack with **50 entries max**:
- Each meaningful state change pushes a snapshot (debounced at 500ms)
- `push()` clears the redo stack (standard undo/redo behavior)
- Duplicate state detection skips redundant pushes
- `undo()` and `redo()` return the entry to restore to
- Bound to `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` keyboard shortcuts

---

## Validation Engine

Validation operates at **4 layers**:

### 1. FSM Guards

Transition guards block navigation to the next step when required fields are empty. Run on every `NEXT` event.

### 2. Per-Step Validators

Structured validators return `ValidationResult` objects with separate `errors` and `warnings`:
- **Metadata**: Required fields (title, author), date validation, student ID format
- **Abstract**: Word count warnings (too short, too long), keyword suggestion
- **Chapters**: Required titles, empty content detection, subsection title validation
- **References**: Duplicate detection, citation/reference mismatch
- **Format**: Unusual margin warnings

### 3. LaTeX Lint Engine

12 post-generation rules check the `.tex` string:
- Unmatched braces, missing documentclass, missing begin/end document
- Missing bibliography when citations exist
- Smart quote detection, unescaped ampersands
- Long lines, double-space after period
- Package loading order (hyperref, natbib)
- Empty chapter detection

### 4. Quality Contract

30 automated checks (see [LaTeX Output Quality Contract](#latex-output-quality-contract)).

---

## SEO Infrastructure

ThesisForge has a comprehensive, production-grade SEO infrastructure:

### Metadata API

- `metadataBase` set to `https://thesisforge-web.vercel.app`
- Dynamic title templates: `%s | ThesisForge`
- 15 targeted keywords covering all major thesis-related search terms
- Full OpenGraph tags (type, locale, URL, site name, title, description, images)
- Twitter card configuration (`summary_large_image`)
- Canonical URL via `alternates.canonical`
- Google-specific robot directives (`max-image-preview: large`, `max-snippet: -1`)

### JSON-LD Structured Data

3 server-rendered JSON-LD schemas in `<head>`:

| Schema | Type | Purpose |
|--------|------|---------|
| `SoftwareApplication` | WebApplication | Rich result with features, pricing (free), author |
| `HowTo` | Tutorial | 6-step "How to Generate a LaTeX Thesis" guide |
| `FAQPage` | FAQ | 8 frequently asked questions with structured answers |

### Dynamic OG Image

Server-rendered via `opengraph-image.tsx` using Next.js Image Response API. Generates a branded SVG document icon with title, description, and URL — no external service dependency.

### hreflang Tags

```
<link rel="alternate" hreflang="en" href="https://thesisforge-web.vercel.app" />
<link rel="alternate" hreflang="x-default" href="https://thesisforge-web.vercel.app" />
```

### Sitemap

XML sitemap with 14 entries, priority-weighted:
- Homepage: priority 1.0, weekly
- 4 template pages: priority 0.8–0.9, monthly
- 5 citation style pages: priority 0.7, monthly
- 3 comparison pages: priority 0.6, monthly
- Blog index: priority 0.7, weekly

### robots.txt

Full crawl allowance for all user agents with sitemap reference.

### Content Pages

SEO-optimized programmatic landing pages:
- **Template showcase** (`/templates/[slug]`): Dedicated pages for each template type
- **Citation style guide** (`/citation-styles/[style]`): APA, IEEE, Chicago, Harvard, Vancouver
- **VS comparison** (`/vs/[slug]`): ThesisForge vs Overleaf, LaTeX vs Word, LaTeX vs LaTeX Templates
- **Blog** (`/blog`, `/blog/[slug]`): Guides and articles

---

## Content Pages

### Template Pages

Each template has a dedicated SEO landing page with:
- Template description and academic use case
- Feature list and formatting defaults
- Citation style compatibility
- CTA to start with that template

| Page | Slug |
|------|------|
| Bachelor's Thesis | `/templates/bachelors` |
| Master's Thesis | `/templates/masters` |
| PhD Dissertation | `/templates/phd` |
| Research Report | `/templates/research-report` |

### Citation Style Pages

Each citation style has a dedicated guide page:
- APA, IEEE, Chicago, Harvard, Vancouver
- Format examples and usage guidance
- Linked from homepage footer for crawlability

### Comparison Pages

Competitive comparison pages:
- ThesisForge vs Overleaf
- LaTeX vs Word for Thesis
- LaTeX vs LaTeX Templates

---

## Hidden Features & Easter Eggs

### Konami Code

Type `↑ ↑ ↓ ↓ ← → ← → B A` to reveal a secret Easter egg dialog. Detected via a keyboard buffer that shifts when full.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo last action |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+S` | Save manual snapshot to IndexedDB |
| `Ctrl+Enter` | Go to next step |
| `Ctrl+←/→` | Previous/Next step |
| `Ctrl+/` | Open shortcuts dialog |
| `?` | Open shortcuts dialog |
| `Escape` | Go home (from Step 1) |

### Manual Snapshots (`Ctrl+S`)

Creates a named save point in IndexedDB's `snapshots` store. Each snapshot gets a unique ID (e.g., `snap-1712938456123-a7b3f`). The store supports `listSnapshots()`, `restoreSnapshot(id)`, and `deleteSnapshot(id)`.

### Project Export/Import

- **Export**: Downloads entire thesis state as versioned JSON (`thesisforge-{date}.json`)
- **Import**: Restores from exported JSON with version and template validation
- File format: `{ version: 2, exportedAt, selectedTemplate, currentStep, thesis }`

### Drag & Drop Chapter Reordering

Chapters can be reordered via drag handles using `@dnd-kit`. Chapter numbers are automatically recalculated after reorder.

### Smart Paste Detection

When pasting large text into a field, the field briefly flashes with a brand-color highlight animation (`field-fill-flash`) to indicate the paste was detected.

### Score Ring Level-Up Celebration

When the completeness score crosses 90 for the first time, the Intelligence Panel's ring animates with a **confetti burst** (8 colored particles emanating outward) and a toast notification announces "Export ready!"

### Save Status Indicator

A pulsing save indicator in the header shows real-time persistence status with color transitions: `idle` → `saving` (spinner) → `saved` (checkmark) → `error` (alert) → back to `idle`.

### Responsive Design

- **Mobile**: Sheet-based hamburger menu, full-width layout, stacked components
- **Tablet**: Adaptive grid layouts, collapsible intelligence panel
- **Desktop**: Full grid with inline intelligence sidebar (320px), multi-column layouts
- **Frosted header**: `backdrop-blur-xl` activates on scroll (detected via scroll event)

---

## Templates

| Template | Document Class | Sides | Default Spacing | Abstract Limit | Features |
|----------|---------------|-------|-----------------|---------------|----------|
| **Bachelor's** | `report` | oneside | onehalf | 300 words | IMRAD structure, APA citations |
| **Master's** | `report` | oneside | onehalf | 500 words | Dedication, appendices, per-chapter numbering |
| **PhD** | `report` | twoside | double | 700 words | Nomenclature, glossary, listings, wide margins |
| **Research Report** | `article` | — | single | 250 words | Concise, `\section`-based, minimal |

Each template pre-populates:
- Complete chapter structure with academic subsections
- Appropriate formatting defaults
- Required/optional field definitions for validation
- Package requirements specific to the template type
- Dedicated SEO landing page with use case description

---

## Tech Stack

### Core

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1 | React framework with App Router |
| **React** | 19.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first CSS (CSS-first config, `@theme` directive, OKLCH colors) |
| **shadcn/ui** | latest | 45+ Radix UI components |
| **Zustand** | 5.0 | State management |
| **Framer Motion** | 12.x | Animations |
| **Prisma** | 6.11 | Database ORM |

### Specialized Libraries

| Library | Purpose |
|---------|---------|
| `idb` | IndexedDB wrapper with Promise API |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag & drop chapter reordering |
| `jszip` | Client-side ZIP generation |
| `zod` | Schema validation |
| `react-hook-form` + `@hookform/resolvers` | Form management |
| `recharts` | Data visualization (version comparison charts) |
| `sonner` | Toast notifications |
| `next-themes` | Dark mode support |
| `lucide-react` | Icon library (45+ icons) |
| `date-fns` | Date formatting |
| `sharp` | Image processing |
| `react-resizable-panels` | Resizable panel layouts |
| `z-ai-web-dev-sdk` | AI model integration |

### Development

| Tool | Purpose |
|------|---------|
| **Bun** | JavaScript runtime & package manager |
| **ESLint** | Code linting |
| **PostCSS** | CSS processing |
| **tw-animate-css** | Tailwind CSS animation utilities |

---

## Project Structure

```
thesisforge/
├── prisma/
│   └── schema.prisma           # Database schema
├── public/
│   └── robots.txt              # SEO crawl rules (generated by app/robots.ts)
├── src/
│   ├── app/                    # Next.js App Router (routes, API, layouts)
│   ├── components/
│   │   ├── thesis/             # 14 domain-specific components
│   │   └── ui/                 # 45+ shadcn/ui primitives
│   ├── core/                   # Pure business logic (15 files)
│   ├── engine/                 # Document intelligence (3 files)
│   ├── hooks/                  # React hooks (2 files)
│   ├── intelligence/           # 12 files (8 algorithms + memory + graph + coach)
│   ├── lib/                    # Data layer (5 files)
│   ├── tests/                  # FSM guard tests
│   ├── ui/                     # OKLCH design tokens (145 lines)
│   └── utils/                  # Utility functions (6 files)
├── download/                   # Generated exports
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
└── next.config.ts
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- A modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/abhishekshah/thesisforge.git
cd thesisforge

# Install dependencies
bun install

# Set up the database (if using server features)
bun run db:push

# Start the development server
bun run dev
```

### Development

```bash
# Run linter
bun run lint

# Build for production
bun run build

# Start production server
bun run start
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. All LaTeX generation code goes through the AST pipeline — never concatenate strings
2. All user input must be sanitized before storage (use `sanitizeUserInput()`)
3. New templates must define both `TemplateSchema` and `ThesisTemplateInfo`
4. Intelligence algorithms must be pure functions (input → output, no side effects)
5. Memory events must use `createMemoryEvent()` and respect the `MAX_EVENTS_PER_DRAFT` cap
6. Tests for FSM guards go in `src/tests/`
7. Design tokens go in `src/ui/tokens.css` — never hardcode colors in components

---

<div align="center">

**Built with care by [Abhishek Shah](https://abhishekshah.vercel.app)**

[abhishek.aimarine@gmail.com](mailto:abhishek.aimarine@gmail.com) · [abhishekshah.vercel.app](https://abhishekshah.vercel.app)

<sub>Built with Next.js, Tailwind CSS, shadcn/ui, Zustand, Framer Motion, and an unhealthy amount of attention to LaTeX details.</sub>

</div>
