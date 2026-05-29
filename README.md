<p align="center">
  <img src="public/logo.svg" alt="ThesisForge Logo" width="80" height="80" />
</p>

<h1 align="center">ThesisForge</h1>

<p align="center">
  <strong>Free Browser-Based LaTeX Thesis Generator</strong><br/>
  Generate a complete, compilable LaTeX thesis in minutes. No LaTeX knowledge required.
</p>

<p align="center">
  <a href="https://thesisforge-web.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/Live-Demo-534AB7?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Framer_Motion-12-FF0055?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#tech-stack">Tech Stack</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#css--design-system">Design System</a> &middot;
  <a href="#intelligence-panel">Intelligence</a> &middot;
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#deployment">Deployment</a>
</p>

---

## Demo

**Live:** [thesisforge-web.vercel.app](https://thesisforge-web.vercel.app)

ThesisForge runs entirely in your browser. No account, no cloud — your thesis data never leaves your device. Open the live demo, walk through the 6-step wizard, and export a compilable `.tex` + `.bib` ZIP file ready for [Overleaf](https://overleaf.com), TeXStudio, or any LaTeX editor.

---

## Features

### Templates & Wizard

- 🎓 **5 thesis templates** — Bachelor's, Master's, PhD, Research Report, Conference Paper with pre-configured academic structures and formatting defaults
- 📋 **6-step guided wizard** — Template selection, metadata, chapters, references, formatting, and export — no LaTeX syntax required
- 📝 **Chapter editor with drag-and-drop** — Reorder chapters and subsections with `@dnd-kit`

### Intelligence & Writing Assistance

- 🧠 **AI intelligence panel** — 13 analysis algorithms running in a Web Worker with debounced scheduling and circuit-breaker fault tolerance
- ✍️ **Writing coach** — 23 structural, argument, citation, language, and academic-style checks with actionable suggestions
- 🔍 **Passive voice detection** — Identifies excessive passive voice per chapter with inline suggestions
- 🔗 **Transition analysis** — Evaluates paragraph-to-paragraph logical flow quality
- 🏷️ **Acronym consistency checker** — Flags acronyms used before definition and inconsistent usage
- ⚙️ **LaTeX heuristics** — 12 auto-fixable rules for smart quotes, percent signs, deprecated commands, and common syntax mistakes
- 🔄 **Reference deduplicator** — Exact, normalized, and fuzzy matching to find duplicate bibliography entries with merge suggestions
- 📊 **Keyword extractor** — TF-IDF-based keyword extraction with cross-check against user-specified keywords

### Editor & Export

- 💻 **Monaco-based LaTeX editor** — Syntax highlighting, autocomplete, real-time lint diagnostics, 50+ academic snippets
- 🕸️ **Real-time citation graph** — Network analysis of in-text citations vs bibliography, with DOT format export for Graphviz
- 📚 **BibTeX reference manager** — 9 reference types (article, book, inproceedings, techreport, thesis, online, misc, dataset, software)
- 📄 **PDF import support** — Import from `.pdf`, `.tex`, `.docx`, `.md`, `.txt` with intelligent content extraction and multi-file merge
- 📤 **Overleaf-compatible export** — Downloadable ZIP containing `main.tex` + `references.bib` that compiles without errors

### Privacy & Performance

- 💾 **IndexedDB auto-save** — Resume your thesis anytime. No account, no cloud storage
- 📱 **Offline-capable** — 100% client-side. Once loaded, works without an internet connection (PWA-ready with web app manifest)
- 🌙 **Dark/light theme** — System-preference detection with Google Material Design elevation shadows
- 📐 **Mobile-first responsive design** — Touch-friendly 44px tap targets, safe-area aware, optimized for all viewports

---

## Tech Stack

| Category | Technology | Details |
|----------|-----------|---------|
| **Framework** | Next.js 16.1 + Turbopack | App Router, standalone output, `next/og` dynamic images |
| **UI** | React 19, TypeScript 5 | React Compiler for automatic memoization |
| **Styling** | Tailwind CSS 4, shadcn/ui | CSS-first `@theme` config, 40+ Radix primitives |
| **Animation** | Framer Motion 12, tw-animate-css | Shared layout transitions, AnimatePresence |
| **Editor** | Monaco Editor 4.7 | Custom LaTeX + BibTeX tokenizers, diagnostics panel |
| **Database** | Prisma 6 (SQLite) | Optional server-side persistence |
| **State** | Zustand 5 | Granular selectors, FSM-gated wizard navigation |
| **Icons** | Lucide React | Consistent icon system across all components |
| **Forms** | React Hook Form 7 + Zod 4 | Schema validation for all wizard inputs |
| **DnD** | @dnd-kit/core + sortable | Chapter and reference reordering |
| **AI** | 13 custom NLP algorithms | Web Worker scheduler with circuit-breaker |
| **PDF** | pdfjs-dist 5 | Web Worker for async PDF text extraction |
| **Charts** | Recharts 2.15 | Intelligence panel visualizations |
| **Runtime** | Bun / Node.js | Bun for local dev, Node for production |

---

## Architecture

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (SEO, JSON-LD, PWA, fonts)
│   ├── page.tsx                  # Homepage + 6-step wizard
│   ├── globals.css               # Design system, themes, animations
│   ├── editor/                   # Standalone Monaco LaTeX editor
│   ├── templates/[slug]/         # SEO template landing pages
│   ├── citation-styles/[style]/  # Citation style reference pages
│   ├── blog/                     # Blog index + [slug] posts
│   ├── vs/[slug]/                # Comparison pages (vs Overleaf, Word, LaTeX)
│   └── api/                      # API routes (health, generate-latex)
│
├── components/
│   ├── thesis/                   # React domain components
│   │   ├── homepage.tsx          # Landing page (hero, features, stats, CTA)
│   │   ├── template-selector.tsx # Step 1: Choose thesis type
│   │   ├── metadata-form.tsx     # Step 2: Title, abstract, author
│   │   ├── chapter-editor.tsx    # Step 3: Write chapter content
│   │   ├── reference-editor.tsx  # Step 4: Manage references
│   │   ├── format-editor.tsx     # Step 5: Configure output format
│   │   ├── generate-preview.tsx  # Step 6: Preview and export
│   │   ├── intelligence-panel.tsx# AI writing assistant sidebar
│   │   ├── latex-editor/         # Monaco editor (10 components)
│   │   └── wizard/               # Wizard shell (header, footer, hooks, nav)
│   │
│   └── ui/                       # shadcn/ui primitives (40+ components)
│
├── intelligence/                 # NLP analysis algorithms + scheduler
│   ├── scheduler.ts              # Debounced pipeline with circuit breaker
│   ├── writingCoach.ts           # 23 academic writing checks
│   ├── semanticGraph.ts          # Semantic thesis graph (DOT export)
│   ├── passiveVoiceDetector.ts   # Passive voice identification
│   ├── transitionAnalyzer.ts     # Paragraph transition quality
│   ├── acronymChecker.ts         # Acronym consistency
│   ├── latexHeuristics.ts        # 12 auto-fixable LaTeX rules
│   ├── deduplicator.ts           # Reference deduplication
│   ├── keywordExtractor.ts       # TF-IDF keyword extraction
│   ├── citationGraph.ts          # Citation network analysis
│   ├── completenessScorer.ts     # 8-dimension completeness scoring
│   ├── structureAnalyzer.ts      # Document structure balance
│   ├── readingStats.ts           # Reading time + chapter health
│   └── types.ts                  # Shared type definitions
│
├── core/                         # LaTeX AST builder, parser, export, persistence
│   ├── ast.ts                    # Abstract syntax tree for LaTeX
│   ├── ast-builder.ts            # AST builder from thesis data
│   ├── fsm.ts                    # Finite state machine for wizard flow
│   ├── linter.ts                 # 36-rule lint engine (4 severity levels)
│   ├── export.ts                 # ZIP export (main.tex + references.bib)
│   ├── bib.ts                    # BibTeX generation (9 reference types)
│   ├── persistence.ts            # IndexedDB auto-save & snapshots
│   ├── history.ts                # Undo/redo state stack
│   ├── templates.ts              # LaTeX template renderer (5 types)
│   ├── compilation-simulator.ts  # Simulated LaTeX compilation
│   └── importer/                 # Multi-format import (PDF, TeX, DOCX, MD, TXT)
│
├── lib/                          # Utilities, stores, config
│   ├── thesis-store.ts           # Zustand store (FSM-gated wizard state)
│   ├── editor-store.ts           # Zustand store (LaTeX editor state)
│   ├── thesis-types.ts           # TypeScript type system
│   ├── latex-generator.ts        # High-level LaTeX orchestrator
│   ├── config.ts                 # Site URL and app configuration
│   ├── monaco-setup.ts           # Monaco editor configuration
│   └── utils.ts                  # Utility functions (cn, debounce, etc.)
│
├── workers/                      # Web Workers
│   ├── intelligence.worker.ts    # Intelligence pipeline (off main thread)
│   ├── latexWorker.ts            # LaTeX processing worker
│   └── importWorker.ts           # File import worker
│
├── ui/
│   └── tokens.css                # Design tokens (colors, type, spacing, motion)
│
├── hooks/                        # Custom React hooks
├── utils/                        # Pure utility functions
└── engine/                       # LaTeX generation engine (escape, packages)
```

### Data Flow

```
User Input (Wizard Steps)
       │
       ▼
Zustand Store (thesis-store.ts)
  ├── FSM-gated navigation (fsm.ts)
  ├── Input sanitization + validation
  └── Granular selectors
       │
       ├──► Intelligence Pipeline (13 algorithms, Web Worker)
       │      ├── Light algorithms: main thread (immediate feedback)
       │      └── Heavy algorithms: Web Worker (non-blocking)
       │
       ├──► IndexedDB Persistence (auto-save)
       │
       ├──► LaTeX Generation Engine
       │      ├── Smart escaper (100+ Unicode mappings)
       │      ├── Template renderer (5 thesis types)
       │      ├── BibTeX generator (9 ref types)
       │      └── Lint engine (36 rules)
       │
       └──► ZIP Export (main.tex + references.bib)
```

---

## CSS & Design System

ThesisForge uses a carefully crafted design system built on **Tailwind CSS 4 with CSS-first configuration**.

### Theme Configuration

The entire theme is defined inline via Tailwind CSS 4's `@theme` directive in `globals.css` — no JavaScript config file needed. Theme tokens map to CSS custom properties that swap automatically between light and dark mode:

```css
/* globals.css — CSS-first Tailwind v4 config */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: 'Poppins', 'Inter', 'SF Pro Text', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  /* ... full semantic color mapping */
}
```

### OKLCH Color Space

All theme tokens use the [OKLCH color space](https://oklch.com/) for perceptually uniform colors. Both light and dark themes define complete palettes:

- **Light** — Warmer white background (`oklch(0.990 0.002 80)`), vibrant blue primary (`oklch(0.50 0.22 264)`)
- **Dark** — True dark background (`oklch(0.105 0.015 260)`), brighter primary for contrast (`oklch(0.65 0.22 259)`)

### Design Tokens (`src/ui/tokens.css`)

A complete token system covering every design dimension:

| Token Category | Examples |
|---------------|----------|
| **Color** | Brand palette (50-900), semantic surfaces, text hierarchy, status fills, borders |
| **Typography** | 9-step type scale (11px–38px), 3 weights, 3 line heights, 4 tracking values |
| **Spacing** | 4px grid system (`--space-1` through `--space-24`) |
| **Radius** | 6 steps from `sm` (4px) to `full` (9999px) |
| **Elevation** | 4 shadow levels with theme-aware opacity (Google Material Design) |
| **Z-index** | 8-step scale from `base` (0) to `tooltip` (600) |
| **Motion** | 6 duration presets (80ms–700ms), 5 easing curves (snap, smooth, bounce, etc.) |

### Google Material Design Elevation

Shadow tokens follow Google's Material Design elevation system with light/dark-aware opacity:

```css
:root {
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.05), 0 1px 3px 0 oklch(0 0 0 / 0.03);
  --shadow-lg: 0 2px 6px 0 oklch(0 0 0 / 0.07), 0 10px 15px -3px oklch(0 0 0 / 0.04);
}
.dark {
  --shadow-lg: 0 2px 6px 0 oklch(0 0 0 / 0.3), 0 10px 15px -3px oklch(0 0 0 / 0.2);
}
```

### Custom CSS Animations

A named motion language (`tf-` prefix) for consistent, performant animations:

| Animation | Usage |
|-----------|-------|
| `tf-fade-up` | Fade + slide up entrance |
| `tf-pop` | Scale-in pop effect |
| `tf-slide-right` | Slide from right |
| `tf-exit` | Scale-down exit |
| `tf-step-enter` | Wizard step transition (enter) |
| `tf-step-exit` | Wizard step transition (exit) |
| `tf-count-up` | Score ring counter animation |
| `tf-ring-pulse` | Level-up ring pulse |
| `tf-shimmer` | Loading shimmer |
| `tf-chapter-in` | Chapter slide-in |
| `tf-export-success` | Export success scale bounce |

All animations respect `prefers-reduced-motion: reduce`.

### Sheet/Dialog Animation System

Tailwind CSS v4 pure CSS animations with `!important` guarantees for animation overrides on Radix UI Sheet and Dialog components. Entry/exit animations use `data-state` attribute selectors for zero-jank transitions.

### Mobile Performance Optimizations

- **Backdrop blur reduction** — `blur(16px)` reduced to `blur(8px)` on screens < 768px, including `.tf-glass`, `.backdrop-blur-xl`, and merged saturate classes
- **GPU hints** — `will-change: auto` on Framer Motion layout elements to prevent unnecessary GPU layer promotion
- **Hover suppression** — Touch device hover effects disabled via `@media (hover: hover)` to prevent sticky hover after tap
- **Floating shapes hidden on mobile** — 8 CSS shape animations disabled below `md` breakpoint to prevent compositing jank on mid-range GPUs

### Custom Scrollbar

6px round scrollbar with primary color on hover, dark-mode aware:

```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: oklch(0.78 0.01 247); border-radius: var(--radius-md); }
::-webkit-scrollbar-thumb:hover { background: var(--primary); }
```

### Accessibility

- **44px touch targets** — All interactive elements in footers, sheets, dialogs, and nav meet minimum 44px tap target on `@media (pointer: coarse)`
- **WCAG focus rings** — 2px solid `var(--ring)` with 2px offset on all interactive elements via `:focus-visible`
- **Reduced motion** — Global `@media (prefers-reduced-motion: reduce)` kills all animations and transitions with `!important`
- **iOS zoom prevention** — Input font-size enforced at `max(16px, 1rem) !important` outside `@layer` to override Tailwind utilities
- **Safe-area aware** — Custom utilities (`.pb-safe`, `.pt-safe`) respect notch and home indicator on iOS

---

## Intelligence Panel

The intelligence panel is an AI-powered writing assistant with **13 analysis algorithms** orchestrated by a priority-based scheduler. Light algorithms run on the main thread for instant feedback; heavy algorithms run in a dedicated **Web Worker** to avoid blocking the UI.

### Scheduler Architecture

```
IntelligenceSchedulerWithWorker
  ├── Main Thread (light, immediate):
  │     completenessScorer, readingStats, structureAnalyzer,
  │     citationGraph, citationParser
  │
  └── Web Worker (heavy, non-blocking):
        semanticThesisGraph, writingCoach, passiveVoice,
        transitionAnalyzer, acronymChecker, keywordExtractor,
        deduplicator, latexHeuristics
```

Each algorithm has a **priority tier** (0–3) and **debounce interval**. The scheduler uses `requestIdleCallback` for heavy algorithms and implements a **circuit breaker** (3 consecutive failures = auto-disable) for fault tolerance.

### Algorithm Details

| Algorithm | Description |
|-----------|-------------|
| **semanticThesisGraph** | Builds a semantic content graph from thesis structure. Analyzes relationships between chapters, sections, and references. Exports to DOT format for Graphviz visualization. |
| **writingCoach** | 23 structural and linguistic checks across 5 categories: structure (intro gap, method justification, results interpretation), argument (claim density, contribution echo, transitional closing), citation (first-author reliance, recent citations, self-citation clusters), language (first-person singular, hedging overload, weak nominalizations, vague quantifiers, transition overuse), and academic style (abstract elements, keywords in abstract, acronym definitions, numbers below ten, inconsistent tense). Runs in chunks of 5 rules via `requestAnimationFrame` to avoid blocking. |
| **passiveVoice** | Detects passive voice constructions per chapter with severity levels and inline suggestions for active alternatives. |
| **transitionAnalyzer** | Evaluates paragraph-to-paragraph transition quality, flagging weak, missing, or repetitive transitions. |
| **acronymChecker** | Scans all chapters for acronyms used before definition and tracks inconsistent usage across the document. |
| **latexHeuristics** | 12 auto-fixable rules: smart quotes, percent signs, deprecated commands, common syntax mistakes. Each finding includes a fix action that can be applied with one click. |
| **deduplicator** | Multi-layer reference deduplication: O(1) DOI/URL exact match, O(1) normalized title match, and trigram-based fuzzy matching with merge suggestions. |
| **keywordExtractor** | TF-IDF keyword extraction from chapter content with cross-check against user-specified keywords. Highlights missing and over-represented terms. |
| **completenessScorer** | 8-dimension thesis completeness tracker (metadata, abstract, chapters, references, etc.) with per-dimension scoring and overall progress ring. |
| **structureAnalyzer** | Measures word count distribution across chapters against academic norms for the selected thesis type. |
| **readingStats** | Per-chapter word counts, reading time estimates, sentence length analysis, and chapter health assessment. |
| **citationGraph** | Network analysis of in-text citations vs bibliography. Detects undefined references (`\cite{}` without BibTeX entry) and uncited references (BibTeX entry never cited). |
| **citationParser** | Parses raw citation strings into structured data (authors, title, year, DOI). |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd my-project

# Install dependencies
npm install

# Initialize the database (optional, for server-side features)
npx prisma db push

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 3000 with Turbopack |
| `npm run build` | Production build with standalone output |
| `npm start` | Start production server from standalone build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://thesisforge-web.vercel.app` | Canonical URL for SEO, OG images, sitemap, JSON-LD |
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database path (optional, server-side features only) |

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
DATABASE_URL=file:./db/custom.db
```

---

## Deployment

### Vercel (Recommended)

1. Push the repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Vercel auto-detects Next.js and configures the build
4. Set `NEXT_PUBLIC_SITE_URL` environment variable for proper canonical URLs
5. Deploy — zero configuration needed for core functionality

### Docker / Standalone

The project builds to Next.js standalone output for minimal deployment size (~80MB):

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

### Self-Hosted

```bash
npm run build
npm start   # Starts standalone server on port 3000
```

---

## Project Structure

```
my-project/
├── public/                        # Static assets
│   ├── logo.svg                   # ThesisForge logo
│   ├── favicon.svg                # SVG favicon (modern browsers)
│   ├── favicon-192.png            # PNG fallback
│   ├── favicon-512.png            # High-res PWA icon
│   ├── apple-touch-icon.png       # iOS home screen icon
│   ├── og-image.jpg               # OpenGraph image (1200x630)
│   ├── manifest.webmanifest      # PWA manifest
│   ├── pdf.worker.min.mjs         # PDF.js Web Worker
│   └── robots.txt                 # Crawler rules
│
├── prisma/
│   └── schema.prisma              # SQLite schema (User, Post models)
│
├── src/
│   ├── app/                       # Next.js App Router pages
│   ├── components/
│   │   ├── thesis/                # Domain components (38 files)
│   │   ├── ui/                    # shadcn/ui primitives (40+)
│   │   └── ErrorBoundary.tsx
│   ├── core/                      # Business logic (28+ modules)
│   │   └── importer/              # Multi-format import (10 files)
│   ├── engine/                    # LaTeX generation engine
│   ├── hooks/                     # Custom React hooks
│   ├── intelligence/              # NLP algorithms (19 files)
│   ├── lib/                       # Stores, types, config
│   ├── ui/
│   │   └── tokens.css             # Design system tokens
│   ├── utils/                     # Pure utility functions
│   └── workers/                   # Web Workers (3)
│
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS config
├── tsconfig.json                  # TypeScript config (strict)
├── components.json                # shadcn/ui config (new-york)
├── postcss.config.mjs             # PostCSS config
├── vercel.json                    # Vercel deployment config
└── package.json                   # Dependencies and scripts
```

---

## License

[MIT](LICENSE) &copy; Abhishek Shah
