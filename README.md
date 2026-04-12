<h1 align="center">ThesisForge</h1>

<p align="center">
  <strong>AST-Based Academic LaTeX Thesis Generator</strong>
</p>

<p align="center">
  <a href="https://thesisforge-web.vercel.app">Live Demo</a> &middot;
  Built by <a href="https://abhishekshah.vercel.app">Abhishek Shah</a> &middot;
  v2.0
</p>

## Table of Contents

- [What is ThesisForge?](#what-is-thesisforge)
- [How It Works](#how-it-works)
- [Architecture Overview](#architecture-overview)
- [The Thesis Engine](#the-thesis-engine)
  - [AST Pipeline](#ast-pipeline)
  - [LaTeX Output Quality Contract](#latex-output-quality-contract)
  - [Bibliography Engine](#bibliography-engine)
  - [Intelligence Layer](#intelligence-layer)
- [The UI & Design System](#the-ui--design-system)
- [The 6-Step Wizard](#the-6-step-wizard)
- [Persistence & Data Safety](#persistence--data-safety)
- [State Management](#state-management)
- [Validation Engine](#validation-engine)
- [Hidden Features & Easter Eggs](#hidden-features--easter-eggs)
- [Templates](#templates)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

## What is ThesisForge?

ThesisForge is a **production-grade, browser-based academic thesis generator** that produces **compilable LaTeX code** without requiring any LaTeX knowledge. You choose a template, fill in your content through an intuitive wizard interface, and export a ready-to-compile `.zip` archive containing `main.tex`, `references.bib`, and a `README.md`.

It is **100% client-side** — no server processing, no accounts, no data leaves your browser. Everything runs locally in a single Next.js application powered by a sophisticated Abstract Syntax Tree (AST) pipeline, a Finite State Machine (FSM) for wizard navigation, and an 8-algorithm intelligence layer that provides real-time academic writing guidance.

### Key Principles

- **No LaTeX knowledge required** — The wizard handles everything
- **Zero server dependency for export** — All LaTeX generation and ZIP packaging runs in the browser
- **Persistence by default** — Auto-saves to IndexedDB; resume from any device
- **Intelligence over enforcement** — Suggestions guide, never block
- **Data safety** — Input sanitization, quota handling, emergency backups, and cross-tab conflict detection

## How It Works

```
┌──────────────┐     ┌──────────────┐      ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      ┌──────────────┐
│   Template   │────▶│   Metadata   │────▶│   Chapters  │────▶│  References  │────▶│   Format     │────▶│   Generate   │
│   Selection  │     │   & Abstract │      │   Editor     │     │   Manager    │     │   Config     │      │   & Export   │
└──────────────┘     └──────────────┘      └──────────────┘     └──────────────┘     └──────────────┘      └──────────────┘
    Step 1               Step 2                 Step 3               Step 4               Step 5               Step 6
```

1. **Choose a template** — Bachelor's, Master's, PhD, or Research Report
2. **Fill in metadata** — Title, author, university, abstract, keywords, supervisor
3. **Write chapters** — Add, reorder (drag & drop), edit with subsections
4. **Manage references** — Add citations with type-specific fields, BibTeX validation
5. **Configure format** — Font size, paper size, spacing, margins, citation style, numbering
6. **Generate & export** — Quality contract verification → ZIP download → Compile on Overleaf

---

## Architecture Overview

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main entry — wizard orchestrator
│   ├── layout.tsx                # Root layout (Poppins font, theme, toasters)
│   ├── globals.css               # OKLCH color system, animations, typography scale
│   └── api/
│       ├── route.ts              # AI-powered API (z-ai-web-dev-sdk)
│       └── generate-latex/route.ts  # Server-side LaTeX generation endpoint
│
├── core/                         # Pure business logic — zero UI dependency
│   ├── fsm.ts                    # Finite State Machine (wizard navigation)
│   ├── fsmGuard.ts               # FSM state validator (Zone 1A)
│   ├── ast.ts                    # AST node types & factory functions (22 node types)
│   ├── ast-builder.ts            # ThesisData → AST builder
│   ├── serializer.ts             # AST → .tex string serializer
│   ├── validators.ts             # Per-step field validators
│   ├── persistence.ts            # IndexedDB engine (drafts, snapshots, settings)
│   ├── history.ts                # Undo/Redo stack (50 entries)
│   ├── export.ts                 # Export pipeline (ZIP, TEX-only, Bib-only)
│   ├── bib.ts                    # BibTeX generator (field-level validation)
│   ├── linter.ts                 # Post-generation LaTeX lint engine (12 rules)
│   ├── latexAssertions.ts        # 30-check quality contract
│   └── templates.ts              # Declarative template schema definitions
│
├── engine/                       # Layer 5: Document Intelligence
│   ├── intelligence.ts           # 7 intelligence rules (cross-refs, orphans, etc.)
│   ├── escape.ts                 # LaTeX body/meta escape functions
│   └── packages.ts               # Package metadata
│
├── intelligence/                 # 8 algorithm analysis layer
│   ├── scheduler.ts              # Step-aware debounce scheduler (requestIdleCallback)
│   ├── types.ts                  # Shared types for all algorithms
│   ├── index.ts                  # Barrel exports
│   ├── citationParser.ts         # Algorithm 1: Citation text parser
│   ├── deduplicator.ts           # Algorithm 2: Reference deduplicator (Jaro-Winkler)
│   ├── structureAnalyzer.ts      # Algorithm 3: Chapter structure analysis
│   ├── keywordExtractor.ts       # Algorithm 4: Keyword extraction
│   ├── citationGraph.ts          # Algorithm 5: Citation cross-reference graph
│   ├── completenessScorer.ts    # Algorithm 6: Weighted completeness rubric
│   ├── latexHeuristics.ts        # Algorithm 7: LaTeX pattern detection & auto-fix
│   └── readingStats.ts           # Algorithm 8: Reading time & sentence analysis
│
├── lib/                          # Data layer & utilities
│   ├── thesis-types.ts           # TypeScript type system & template definitions
│   ├── thesis-store.ts           # Zustand store (700 lines, FSM-gated navigation)
│   ├── latex-generator.ts        # Public LaTeX generation API
│   ├── db.ts                     # Prisma database client
│   └── utils.ts                  # Tailwind merge & general utilities
│
├── components/
│   ├── thesis/                   # Domain-specific thesis components (13 files)
│   └── ui/                       # shadcn/ui primitives (45+ components)
│
├── hooks/                        # React hooks (use-toast, use-mobile)
├── utils/                        # Utility functions (debounce, sanitizer, word-count)
├── tests/                        # Test files (FSM guard tests)
└── ui/                           # Design tokens (OKLCH color palette)
```


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

Every generated document must pass **30 automated checks** before export. These are grouped into 5 categories:

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

- **7 entry types**: `article`, `book`, `inproceedings`, `techreport`, `phdthesis`, `mastersthesis`, `online`, `misc`
- **Field-level validation**: Required fields per entry type are checked before export
- **Field-specific sanitization**: Author fields handle `and`/`&` separators; titles escape `&` and `%`; pages normalize to en-dashes; URLs percent-encode spaces; years are digits-only
- **TODO placeholders**: Missing required fields generate `{TODO: Add field}` instead of producing invalid BibTeX
- **Cite key generation**: Deterministic keys from `author + year + titleWord` with accent normalization and non-alphanumeric stripping
- **Duplicate detection**: Jaro-Winkler similarity scoring flags potential duplicate references

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

## The UI & Design System

### Visual Design Language

ThesisForge uses a **Google Material Design-inspired** visual system built on **OKLCH color space** for perceptually uniform colors across light and dark themes:

- **Primary**: `oklch(0.50 0.22 264)` — Deep blue
- **Surface elevation**: 4 levels of shadow (`--shadow-sm` through `--shadow-xl`)
- **Typography**: 10-level scale using Poppins (Google Fonts)
- **Animations**: Custom motion language with 12+ named keyframe animations
- **Glass effects**: Frosted glass header on scroll (`backdrop-blur-xl`)
- **Gradient accents**: Google-style multi-stop gradient for primary CTAs

### Dark Mode

Full dark mode support with:
- True dark background (`oklch(0.105 0.015 260)`)
- Brighter blue primary for contrast (`oklch(0.65 0.22 259)`)
- Elevated shadow opacity for depth perception
- All semantic colors recalibrated for dark backgrounds

### Motion System

The animation system uses CSS custom properties for timing:

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

All animations respect `prefers-reduced-motion: reduce`.

### Component Library

Built on **shadcn/ui** with **45+ Radix UI primitives** including: accordion, alert-dialog, carousel, chart, collapsible, command palette, context-menu, drawer, dropdown-menu, hover-card, input-otp, menubar, navigation-menu, resizable panels, sheet, sonner toast, table, tabs, toggle-group, and more.


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

#### Step 2: Metadata & Abstract
- Title, subtitle, author, student ID
- University, faculty, department
- Supervisor and co-supervisor with titles
- Submission and graduation dates
- Abstract with word limit enforcement per template type
- Keywords with add/remove
- Dedication and acknowledgment text

#### Step 3: Chapter Editor
- Add, remove, reorder chapters via **drag & drop** (`@dnd-kit`)
- Edit chapter title and body content
- Add/remove/reorder subsections within chapters
- Subsection content editing
- LaTeX-aware content (pass-through for advanced users)

#### Step 4: Reference Manager
- Add references with **type-specific fields** (7 types)
- Field-level BibTeX validation with error messages
- Smart author field handling (`and` separators)
- DOI and URL validation
- Year format enforcement (4 digits)
- Bulk import capability
- Inline undo on delete (toast with "Undo" action)

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
- Engine intelligence analysis (7 rules)
- LaTeX lint check (12 rules)
- Inline preview of generated code
- One-click ZIP download containing `main.tex`, `references.bib`, `README.md`, and `figures/` directory
- Export warnings displayed inline (don't block)

## Persistence & Data Safety

### IndexedDB Storage

All data is stored in **IndexedDB** (not localStorage) via the `idb` library for large thesis storage:

| Store | Purpose | Key |
|-------|---------|-----|
| `drafts` | Current draft state | `__current__` |
| `snapshots` | Manual save points | `snap-{timestamp}-{random}` |
| `settings` | App settings | Setting key |

### Auto-Save

- Triggers 1 second after any state change (debounced)
- Silent save — no toast on auto-save
- Save status indicator in the header (idle → saving → saved → idle)
- First successful auto-save shows "Auto-save is on" toast (one-time)

### Schema Migrations

- **Additive-only**: New stores are added, never deleted
- Version 1: Initial `drafts` and `settings` stores
- Version 2: Added `snapshots` store + localStorage migration
- Version 3: Added `version` field for conflict detection

### In-Memory Fallback (Private Mode)

When IndexedDB is unavailable (private browsing, blocked by policy), the system falls back to an **in-memory Map-based database**. Data persists within the session but is lost on tab close. The UI detects this and adjusts behavior accordingly.

### Cross-Tab Conflict Detection

Each save increments a **monotonic version counter** stored in both IndexedDB and `sessionStorage`. On load, if the stored version is more than 1 ahead of the last known version, a conflict is flagged and the newer data is accepted.

### Emergency Backup

If IndexedDB storage quota is exceeded (`QuotaExceededError`), an **emergency JSON download** is triggered automatically — the user's data is never silently lost.

### Input Sanitisation (Zone 6A)

Every user input field is sanitised before storage:
- Null bytes and control characters stripped
- Zero-width characters (U+200B, U+FEFF, U+00AD) stripped
- Line endings normalised to `\n`
- Field-specific length limits (title: 500, author: 300, abstract: 5000, chapter body: 200,000)
- Field-type rules: single-line flattening, year digit-only, cite-key alphanumeric

### Draft Restoration (Zone 5A)

Data loaded from IndexedDB is **never trusted raw**. Every field is sanitised with safe fallbacks:
- Type checking on all fields (ThesisType, chapter structure, options)
- Default values for missing or corrupt fields
- Reference type validation against known BibTeX entry types
- Numeric range validation (step index, chapter numbers)

### `beforeunload` Warning

When a wizard session is active, closing the tab shows a browser-native "Leave site?" warning to prevent accidental data loss.

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

### Word-by-Word Hero Animation

The homepage hero heading and subtitle animate word-by-word with staggered delays (40ms per word) using Framer Motion, creating a typewriter-like reveal effect.

### Animated Stat Counters

The homepage stats section uses `requestAnimationFrame` for smooth cubic-eased number counting animations when elements enter the viewport.

### Save Status Indicator

A pulsing save indicator in the header shows real-time persistence status with color transitions: `idle` → `saving` (spinner) → `saved` (checkmark) → `error` (alert) → back to `idle`.

### Responsive Design

- **Mobile**: Sheet-based hamburger menu, full-width layout, stacked components
- **Tablet**: Adaptive grid layouts, collapsible intelligence panel
- **Desktop**: Full grid with inline intelligence sidebar (320px), multi-column layouts
- **Frosted header**: `backdrop-blur-xl` activates on scroll (detected via scroll event)

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

## Tech Stack

### Core

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1 | React framework with App Router |
| **React** | 19.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **shadcn/ui** | latest | 45+ Radix UI components |
| **Zustand** | 5.0 | State management |
| **Framer Motion** | 12.x | Animations |
| **Prisma** | 6.11 | Database ORM |

### Specialised Libraries

| Library | Purpose |
|---------|---------|
| `idb` | IndexedDB wrapper with Promise API |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag & drop chapter reordering |
| `jszip` | Client-side ZIP generation |
| `zod` | Schema validation |
| `react-hook-form` + `@hookform/resolvers` | Form management |
| `@mdxeditor/editor` | Markdown editor component |
| `sonner` | Toast notifications |
| `next-themes` | Dark mode support |
| `lucide-react` | Icon library |
| `date-fns` | Date formatting |
| `recharts` | Data visualization |
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

## Project Structure

```
thesisforge/
├── prisma/
│   └── schema.prisma           # Database schema
├── public/
│   ├── logo.svg                # ThesisForge logo
│   └── robots.txt              # SEO crawl rules
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/
│   │   ├── thesis/             # 13 domain-specific components
│   │   └── ui/                 # 45+ shadcn/ui primitives
│   ├── core/                   # Pure business logic (12 files)
│   ├── engine/                 # Document intelligence (3 files)
│   ├── hooks/                  # React hooks (2 files)
│   ├── intelligence/           # 8 algorithm analysis layer (9 files)
│   ├── lib/                    # Data layer (5 files)
│   ├── tests/                  # FSM guard tests
│   ├── ui/                     # OKLCH design tokens
│   └── utils/                  # Utility functions (5 files)
├── download/                   # Generated exports
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
└── next.config.ts
```

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
bun run db: push

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

## Contributing

Contributions are welcome! Please follow these guidelines:

1. All LaTeX generation code goes through the AST pipeline — never concatenate strings
2. All user input must be sanitised before storage (use `sanitizeUserInput()`)
3. New templates must define both `TemplateSchema` and `ThesisTemplateInfo`
4. Intelligence algorithms must be pure functions (input → output, no side effects)
5. Tests for FSM guards go in `src/tests/`

## License

This project is built by [Abhishek Shah](https://abhishekshah.vercel.app). Contact: [abhishek.aimarine@gmail.com](mailto:abhishek.aimarine@gmail.com)

<p align="center">
  <sub>Built with Next.js, Tailwind CSS, shadcn/ui, Zustand, Framer Motion, and an unhealthy amount of attention to LaTeX details.</sub>
</p>
