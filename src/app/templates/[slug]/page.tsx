import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// ============================================================
// Template Data — SEO & Content Definitions
// ============================================================

interface TemplateData {
  slug: string;
  seoTitle: string;
  description: string;
  keyword: string;
  chapters: string[];
  features: string[];
  level: string;
  pageContent: string;
  latexSnippet: string;
  faqs: { question: string; answer: string }[];
  comparisonHighlights: string;
}

const BASE_URL = "https://thesisforge-web.vercel.app";

const templates: Record<string, TemplateData> = {
  bachelors: {
    slug: "bachelors",
    seoTitle: "Free Bachelor Thesis LaTeX Template",
    description:
      "Generate a complete bachelor thesis in LaTeX without knowing LaTeX. Free template with IMRAD structure, BibTeX bibliography, and Overleaf export. No sign-up required.",
    keyword: "bachelor thesis latex template",
    chapters: [
      "Title Page",
      "Abstract",
      "Table of Contents",
      "Introduction",
      "Literature Review",
      "Methodology",
      "Results",
      "Discussion",
      "Conclusion",
      "References",
      "Appendices",
    ],
    features: [
      "IMRAD structure",
      "Simplified formatting",
      "Automatic table of contents",
      "BibTeX bibliography",
      "12pt font",
      "Standard margins",
    ],
    level: "Bachelor's",
    pageContent: `A bachelor thesis is the culmination of your undergraduate studies. It demonstrates your ability to independently investigate a research question, apply theoretical knowledge, and present findings in a structured academic format. Most universities require a bachelor thesis to follow the IMRAD structure — Introduction, Methods, Results, and Discussion — which forms the backbone of scientific and engineering disciplines.

Writing a bachelor thesis in LaTeX ensures professional typesetting that meets university submission requirements. LaTeX handles automatic numbering of sections, figures, tables, and references, so you can focus entirely on your content rather than wrestling with formatting. However, learning LaTeX from scratch can be daunting, especially when you are already under pressure to complete your thesis on time.

ThesisForge eliminates the LaTeX learning curve entirely. Our free bachelor thesis LaTeX template provides a complete, ready-to-use document structure with all the essential components pre-configured. You simply fill in your thesis content through our intuitive wizard, and ThesisForge generates correct, compilable LaTeX code that you can download and compile in Overleaf or any local LaTeX installation.

The bachelor thesis template includes a title page with your name, university, and submission date. An abstract section summarises your research question, methodology, key findings, and conclusions. The table of contents is generated automatically from your chapter headings. The main body follows the standard IMRAD format with clear section numbering. References are managed through BibTeX, and appendices provide space for supplementary material such as raw data, code listings, or detailed derivations.

With ThesisForge, you get the professional quality of LaTeX without spending hours learning commands and syntax. Your thesis will have consistent typography, proper mathematical typesetting, correctly formatted citations, and a polished appearance that impresses examiners. Best of all, ThesisForge works entirely in your browser — no installation, no sign-up, no cost.`,
    latexSnippet: `\\documentclass[12pt,a4paper]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}
\\usepackage{graphicx}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}
\\usepackage[backend=biber,style=apa]{biblatex}
\\addbibresource{references.bib}

\\title{Your Bachelor Thesis Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle
\\begin{abstract}
  Your abstract text summarising the
  research question, methodology, and
  key findings goes here.
\\end{abstract}
\\tableofcontents
\\chapter{Introduction}
  Background and research context.
\\chapter{Literature Review}
  Review of relevant prior work.
\\chapter{Methodology}
  Research design and methods used.
\\chapter{Results}
  Presentation of findings.
\\chapter{Discussion}
  Interpretation and implications.
\\chapter{Conclusion}
  Summary and future directions.
\\printbibliography
\\appendix
\\chapter{Appendix}
  Supplementary material.
\\end{document}`,
    faqs: [
      {
        question: "What is a bachelor thesis LaTeX template?",
        answer:
          "A bachelor thesis LaTeX template is a pre-configured LaTeX document structure designed specifically for undergraduate thesis submissions. It includes the standard IMRAD format (Introduction, Methods, Results, Discussion), automatic table of contents, bibliography management with BibTeX, and professional formatting that meets most university requirements.",
      },
      {
        question: "Do I need to know LaTeX to use this template?",
        answer:
          "No. ThesisForge's wizard handles all LaTeX syntax. You fill in your thesis content using a simple form-based interface, and ThesisForge generates correct, compilable LaTeX code automatically. You never need to type a single LaTeX command.",
      },
      {
        question: "Can I export this template to Overleaf?",
        answer:
          "Yes. ThesisForge exports a ZIP file containing your main.tex and references.bib files. You can upload these directly to Overleaf and compile your thesis into a PDF without any modifications.",
      },
      {
        question: "What citation styles are supported for a bachelor thesis?",
        answer:
          "ThesisForge supports APA, IEEE, Chicago, Harvard, and Vancouver citation styles. Choose your preferred style in the formatting step, and all citations and the bibliography will be formatted according to the selected standard.",
      },
      {
        question: "Is this bachelor thesis template really free?",
        answer:
          "Yes, completely free. There are no hidden fees, no premium tiers, and no sign-up required. ThesisForge works entirely in your browser, and your thesis data never leaves your device.",
      },
    ],
    comparisonHighlights:
      "Unlike generic LaTeX templates downloaded from the internet, ThesisForge provides a guided wizard that ensures every component of your bachelor thesis is correctly configured. There is no need to debug LaTeX errors, install packages, or configure your document class. ThesisForge also works offline and stores your data locally for complete privacy.",
  },

  masters: {
    slug: "masters",
    seoTitle: "Free Master Thesis LaTeX Template",
    description:
      "Create your master thesis in LaTeX for free. Professional template with extended abstract, literature review, and appendices. No LaTeX knowledge needed. Export to Overleaf.",
    keyword: "master thesis latex template free",
    chapters: [
      "Title Page",
      "Abstract",
      "Acknowledgements",
      "Table of Contents",
      "List of Figures",
      "List of Tables",
      "Introduction",
      "Literature Review",
      "Methodology",
      "Results and Analysis",
      "Discussion",
      "Conclusion",
      "References",
      "Appendices",
    ],
    features: [
      "Extended abstract",
      "Comprehensive literature review section",
      "List of figures and tables",
      "Multiple appendices",
      "Professional formatting",
      "Customizable citation styles",
    ],
    level: "Master's",
    pageContent: `A master thesis represents a significant piece of original research that demonstrates your ability to contribute meaningfully to your academic field. Unlike a bachelor thesis, a master thesis demands a more extensive literature review, more rigorous methodology, deeper analysis, and a professional presentation that meets the exacting standards expected at the postgraduate level.

The structure of a master thesis typically includes front matter (title page, abstract, acknowledgements, table of contents, list of figures, list of tables), a main body with multiple chapters, and back matter (references, appendices). This comprehensive structure ensures that your thesis is navigable, professionally formatted, and complete. LaTeX excels at managing this complex document structure, automatically generating tables of contents, list of figures, list of tables, and handling cross-references throughout the document.

However, configuring a LaTeX document for a master thesis can be time-consuming. You need to set up the document class, load the right packages, configure page margins, manage bibliography styles, and ensure all front matter pages are correctly numbered (often using roman numerals for preliminary pages and arabic numerals for the main text). These technical details, while important, distract from the primary task of writing excellent research.

ThesisForge's master thesis LaTeX template handles all of this complexity for you. The template comes pre-configured with a professional document structure that includes an extended abstract section, a comprehensive literature review chapter, dedicated methodology, results, and discussion sections, and multiple appendix chapters. All front matter elements — acknowledgements, table of contents, list of figures, and list of tables — are generated automatically.

The wizard guides you through each step: choose the master thesis template, enter your metadata (title, author, university, abstract, keywords), write each chapter with subsection support, add references with automatic BibTeX generation, configure your formatting (font size, paper size, citation style, line spacing), and finally export your complete thesis as a ZIP file ready for Overleaf or local compilation.

With ThesisForge, you get a publication-quality master thesis without spending time on LaTeX configuration. Your document will have consistent heading styles, properly formatted citations, correctly numbered sections and figures, and a professional layout that meets the highest academic standards.`,
    latexSnippet: `\\documentclass[12pt,a4paper]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}
\\usepackage{graphicx}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}
\\usepackage{natbib}
\\usepackage{listings}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\title{Your Master Thesis Title}
\\author{Your Name}
\\university{Your University}
\\date{\\today}

\\begin{document}
\\maketitle
\\begin{abstract}
  Extended abstract covering the research
  context, objectives, methodology, key
  findings, and scholarly contribution.
\\end{abstract}
\\begin{acknowledgements}
  Thank those who contributed.
\\end{acknowledgements}
\\tableofcontents
\\listoffigures
\\listoftables
\\chapter{Introduction}
  Research background and objectives.
\\chapter{Literature Review}
  Comprehensive review of prior research.
\\chapter{Methodology}
  Detailed research design and methods.
\\chapter{Results and Analysis}
  Findings with statistical analysis.
\\chapter{Discussion}
  Interpretation and contributions.
\\chapter{Conclusion}
  Summary, limitations, and future work.
\\bibliographystyle{apalike}
\\bibliography{references}
\\appendix
\\chapter{Supplementary Data}
  Additional tables and figures.
\\end{document}`,
    faqs: [
      {
        question: "How is a master thesis LaTeX template different from a bachelor thesis template?",
        answer:
          "A master thesis template includes additional front matter such as acknowledgements, list of figures, and list of tables. It supports an extended abstract, a more comprehensive literature review section, and multiple appendices. The formatting also tends to be more professional with tighter margin controls and higher typographic standards.",
      },
      {
        question: "Can I add my own chapters and subsections to this template?",
        answer:
          "Yes. ThesisForge lets you add, remove, and reorder chapters freely. Each chapter can have multiple subsections. The wizard handles all LaTeX numbering and cross-referencing automatically.",
      },
      {
        question: "What citation styles work best for a master thesis?",
        answer:
          "APA is the most common choice for social sciences and education, IEEE for engineering and computer science, Harvard for business and economics, and Chicago for humanities. ThesisForge supports all five of these styles and lets you switch between them at any time.",
      },
      {
        question: "Can I include mathematical equations in my master thesis?",
        answer:
          "Yes. ThesisForge's LaTeX output includes the amsmath and amssymb packages, which provide comprehensive support for mathematical equations, symbols, matrices, and proofs. Your equations will be professionally typeset in your compiled PDF.",
      },
      {
        question: "Will my master thesis work with my university's formatting guidelines?",
        answer:
          "ThesisForge generates standard LaTeX that you can further customise in Overleaf. You can adjust margins, fonts, spacing, and other parameters to match your university's specific requirements after exporting.",
      },
    ],
    comparisonHighlights:
      "ThesisForge's master thesis template is more than just a LaTeX document. It is a complete, guided experience that walks you through every step of thesis creation. Unlike static templates from Overleaf or LaTeX Templates, ThesisForge validates your references, provides writing intelligence feedback, and ensures your document compiles without errors on the first try.",
  },

  phd: {
    slug: "phd",
    seoTitle: "Free PhD Dissertation LaTeX Template",
    description:
      "Generate a complete PhD dissertation in LaTeX free. Full doctoral template with front matter, multiple chapters, glossary, and nomenclature. No LaTeX experience required.",
    keyword: "phd dissertation latex template",
    chapters: [
      "Title Page",
      "Abstract",
      "Acknowledgements",
      "Dedication",
      "Table of Contents",
      "List of Figures",
      "List of Tables",
      "Nomenclature",
      "Glossary",
      "Introduction",
      "Literature Review",
      "Methodology",
      "Chapter 3 (Custom)",
      "Chapter 4 (Custom)",
      "Chapter 5 (Custom)",
      "Results",
      "Discussion",
      "Conclusion",
      "Future Work",
      "References",
      "Appendices",
    ],
    features: [
      "Nomenclature section",
      "Glossary",
      "Two-side printing support",
      "Front/main/back matter",
      "Multiple custom chapters",
      "Dedication page",
      "Comprehensive bibliography",
    ],
    level: "PhD",
    pageContent: `A PhD dissertation is the most substantial academic document you will write in your career. Spanning tens of thousands of words across multiple chapters, a doctoral dissertation demands meticulous organisation, rigorous methodology, and a presentation that meets the highest standards of academic publishing. Every element — from the nomenclature and glossary to the front matter, main chapters, and appendices — must be flawlessly formatted and internally consistent.

LaTeX has long been the typesetting system of choice for PhD dissertations, and for good reason. It provides automatic numbering of sections, theorems, equations, figures, and tables. It handles cross-referencing with precision, manages complex bibliographies with BibTeX, and produces output that rivals professionally typeset books. For STEM dissertations in particular, LaTeX's mathematical typesetting is unmatched by any word processor.

However, setting up a PhD dissertation template in LaTeX from scratch is a significant undertaking. You need to configure the document class for two-side printing, set up front matter with roman numeral pagination, define nomenclature and glossary sections, configure multiple bibliography databases, and ensure that every package is compatible. A single misconfiguration can cause hours of debugging.

ThesisForge's PhD dissertation LaTeX template eliminates all of this complexity. Our template is pre-configured with the complete document structure expected of a doctoral dissertation: a title page, abstract, acknowledgements, dedication page, table of contents, list of figures, list of tables, nomenclature, glossary, and all the standard chapters. You can add custom chapters for your specific research contributions, and the wizard handles all numbering and cross-referencing automatically.

The template supports two-side printing for professional-quality output, comprehensive bibliography management with your choice of citation style, and multiple appendices for supplementary material such as proofs, questionnaires, interview transcripts, or additional data. Every aspect of the document — from margin widths to line spacing to heading styles — follows best practices for doctoral submissions at leading universities worldwide.

ThesisForge's intelligence features provide real-time feedback on your dissertation's completeness, reading level, and structural coherence. This helps you identify gaps in your literature review, over-long chapters, or missing elements before you submit to your committee. Combined with automatic BibTeX generation and Overleaf-compatible export, ThesisForge gives you everything you need to produce a publication-quality PhD dissertation without the steep LaTeX learning curve.`,
    latexSnippet: `\\documentclass[12pt,a4paper,twoside]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}
\\usepackage{graphicx}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{hyperref}
\\usepackage[backend=biber,style=apa]{biblatex}
\\usepackage{nomencl}
\\usepackage{glossaries}
\\usepackage{geometry}
\\geometry{margin=3cm}
\\makenomenclature
\\makeglossaries

\\title{Your PhD Dissertation Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\frontmatter
\\maketitle
\\begin{dedication}
  Dedicated to [person or cause].
\\end{dedication}
\\begin{abstract}
  Comprehensive abstract summarising
  the entire doctoral research.
\\end{abstract}
\\begin{acknowledgements}
  Acknowledgements section.
\\end{acknowledgements}
\\tableofcontents
\\listoffigures
\\listoftables
\\printnomenclature
\\printglossaries
\\mainmatter
\\chapter{Introduction}
  Research context and objectives.
\\chapter{Literature Review}
  Comprehensive scholarly review.
\\chapter{Methodology}
  Research design and justification.
\\chapter{Core Contribution}
  Your novel research contribution.
\\chapter{Additional Studies}
  Supplementary experiments.
\\chapter{Results}
  Consolidated findings.
\\chapter{Discussion}
  Interpretation and significance.
\\chapter{Conclusion}
  Summary and future directions.
\\backmatter
\\printbibliography
\\appendix
\\chapter{Mathematical Proofs}
\\chapter{Survey Instruments}
\\end{document}`,
    faqs: [
      {
        question: "What makes a PhD dissertation LaTeX template different from other templates?",
        answer:
          "A PhD dissertation template includes additional elements not found in bachelor or master thesis templates: a dedication page, nomenclature section, glossary, two-side printing support, front/main/back matter separation with different page numbering styles, and support for multiple custom research chapters.",
      },
      {
        question: "Can I add custom chapters for my specific research contributions?",
        answer:
          "Yes. ThesisForge allows you to add, remove, and reorder chapters freely. For a PhD dissertation, you can create dedicated chapters for each major contribution, study, or experiment, all with automatic numbering and cross-referencing.",
      },
      {
        question: "Does ThesisForge support nomenclature and glossary for my dissertation?",
        answer:
          "Yes. The PhD dissertation template includes nomenclature and glossary packages. You can define technical terms, abbreviations, and symbols that will be automatically formatted and cross-referenced throughout your document.",
      },
      {
        question: "How do I handle two-side printing for my PhD submission?",
        answer:
          "ThesisForge's PhD template is pre-configured with two-side printing enabled. This means chapters will start on odd-numbered pages (right-hand pages), and margins will alternate for correct binding. Your university's submission guidelines likely require this format.",
      },
      {
        question: "Can I export my PhD dissertation to Overleaf for collaborative editing?",
        answer:
          "Yes. ThesisForge exports a ZIP file with your main.tex and references.bib that is fully Overleaf-compatible. You can upload the ZIP directly to Overleaf, invite your supervisor as a collaborator, and work together in real time.",
      },
    ],
    comparisonHighlights:
      "While Overleaf and LaTeX Templates offer PhD dissertation templates, they require you to understand LaTeX syntax and debug errors independently. ThesisForge's wizard validates every input, generates error-free LaTeX code, and provides intelligence feedback on your dissertation's structure and completeness. This is especially valuable for a multi-chapter document as complex as a PhD dissertation.",
  },

  "research-report": {
    slug: "research-report",
    seoTitle: "Free Research Report LaTeX Template",
    description:
      "Create a professional research report in LaTeX free. Concise template for technical papers, lab reports, and project documentation. No LaTeX knowledge required.",
    keyword: "research report latex template",
    chapters: [
      "Title Page",
      "Abstract",
      "Table of Contents",
      "Introduction",
      "Background",
      "Methodology",
      "Results",
      "Analysis",
      "Conclusion",
      "References",
    ],
    features: [
      "Concise structure",
      "Technical paper formatting",
      "Numbered sections",
      "Figure and table support",
      "BibTeX bibliography",
    ],
    level: "Research Report",
    pageContent: `A research report is a concise document that presents the findings of a study, experiment, or project investigation. Unlike a full thesis or dissertation, a research report is focused and streamlined — typically ranging from 10 to 40 pages — making it ideal for lab reports, technical papers, project documentation, interim research summaries, and industry white papers.

The structure of a research report follows a clear, linear progression: title page, abstract, table of contents, introduction, background, methodology, results, analysis, conclusion, and references. This structure ensures that readers can quickly locate the information they need, whether they are reviewing the methodology, examining the results, or checking the bibliography. Each section serves a specific purpose and builds logically on the preceding one.

LaTeX is an excellent choice for research reports because it produces clean, professional documents with consistent typography. Automatic section numbering, table of contents generation, and BibTeX reference management save significant time and ensure accuracy. For technical reports that include mathematical equations, data tables, and figures, LaTeX's typesetting quality is far superior to word processors.

However, not everyone who needs to write a research report has the time or desire to learn LaTeX. The syntax can be confusing for newcomers, and debugging compilation errors can be frustrating when you are focused on presenting your research findings clearly and accurately.

ThesisForge's research report LaTeX template solves this problem completely. The template is designed for speed and simplicity: choose the research report template, fill in your metadata, write each section, add your references, configure your formatting, and export. The entire process takes minutes, not hours, and the result is a professionally typeset PDF when compiled in Overleaf or locally.

The research report template is particularly well-suited for students who need to submit lab reports, researchers writing technical papers for conferences or journals, engineers documenting project findings, and professionals creating industry reports. The concise structure keeps your document focused, while LaTeX's formatting capabilities ensure that your report looks polished and credible.

With support for figures, tables, mathematical equations, and BibTeX bibliography management, ThesisForge's research report template gives you the full power of LaTeX without any of the complexity. It is the fastest way to produce a publication-quality research report.`,
    latexSnippet: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}
\\usepackage{graphicx}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}
\\usepackage[backend=biber,style=ieee]{biblatex}
\\addbibresource{references.bib}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\title{Your Research Report Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle
\\begin{abstract}
  Summary of the research objectives,
  methods, key findings, and
  conclusions of this report.
\\end{abstract}
\\tableofcontents
\\section{Introduction}
  Research objectives and scope.
\\section{Background}
  Relevant context and prior work.
\\section{Methodology}
  Methods and experimental design.
\\section{Results}
  Key findings with data.
\\begin{table}[h]
  \\centering
  \\begin{tabular}{lcc}
    \\hline
    Metric & Value & Unit \\\\
    \\hline
    Accuracy & 95.2 & \\% \\\\
    Precision & 93.8 & \\% \\\\
    Recall & 96.1 & \\% \\\\
    \\hline
  \\end{tabular}
  \\caption{Performance metrics.}
\\end{table}
\\section{Analysis}
  Interpretation of results.
\\section{Conclusion}
  Summary and recommendations.
\\printbibliography
\\end{document}`,
    faqs: [
      {
        question: "What is a research report LaTeX template?",
        answer:
          "A research report LaTeX template is a pre-configured document structure for concise research documents such as lab reports, technical papers, and project documentation. It uses the article document class in LaTeX for a streamlined format with numbered sections, automatic table of contents, and BibTeX reference management.",
      },
      {
        question: "How long should a research report be?",
        answer:
          "Research reports typically range from 10 to 40 pages, depending on the requirements. ThesisForge's template is flexible — you can add as many sections and subsections as needed. The concise structure keeps your document focused and avoids unnecessary bloat.",
      },
      {
        question: "Can I include tables and figures in my research report?",
        answer:
          "Yes. ThesisForge's LaTeX output supports tables (tabular environment), figures (graphicx package), and captions. All tables and figures are automatically numbered and can be cross-referenced in your text.",
      },
      {
        question: "Is this template suitable for lab reports?",
        answer:
          "Yes. The research report template's concise structure — with dedicated sections for background, methodology, results, analysis, and conclusion — is ideal for lab reports. You can present your experimental setup, data, and findings in a clean, professional format.",
      },
      {
        question: "Can I use this research report template for conference papers?",
        answer:
          "Yes. While conference papers often have specific formatting guidelines from the publisher, you can use ThesisForge's template as a starting point and adjust the formatting in Overleaf to match the conference requirements after export.",
      },
    ],
    comparisonHighlights:
      "For research reports specifically, ThesisForge offers the fastest path from blank page to compiled PDF. The concise template structure eliminates unnecessary sections, and the wizard-driven workflow means you can produce a professional research report in minutes rather than hours. Overleaf requires you to start from scratch or adapt an existing template, while LaTeX Templates offer variety but no guidance.",
  },
};

// ============================================================
// Static Params & Metadata
// ============================================================

export function generateStaticParams() {
  return Object.values(templates).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = templates[slug];
  if (!data) return {};

  return {
    title: data.seoTitle,
    description: data.description,
    alternates: {
      canonical: `${BASE_URL}/templates/${slug}`,
    },
    openGraph: {
      title: `${data.seoTitle} | ThesisForge`,
      description: data.description,
      url: `${BASE_URL}/templates/${slug}`,
      type: "article",
      siteName: "ThesisForge",
    },
    twitter: {
      card: "summary_large_image",
      title: data.seoTitle,
      description: data.description,
    },
  };
}

// ============================================================
// Page Component
// ============================================================

const otherSlugs = (currentSlug: string) =>
  Object.values(templates).filter((t) => t.slug !== currentSlug);

export default async function TemplateLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = templates[slug];

  if (!data) {
    notFound();
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Templates",
        item: `${BASE_URL}/templates`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: data.level + " Thesis Template",
        item: `${BASE_URL}/templates/${slug}`,
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  const citationStyles = ["APA", "IEEE", "Chicago", "Harvard", "Vancouver"];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqLd),
        }}
      />

      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl backdrop-saturate-[1.8]">
          <nav
            className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"
            aria-label="Breadcrumb"
          >
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/templates/bachelors" className="hover:text-foreground transition-colors">
                  Templates
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground font-medium">{data.level} Template</li>
            </ol>
            <Link
              href={`/?template=${slug}`}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Generate Thesis
            </Link>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {/* H1 */}
            <h1 className="page-title mb-4">{data.keyword}</h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl">{data.description}</p>

            {/* Chapter Structure */}
            <section aria-labelledby="structure-heading" className="mb-14">
              <h2
                id="structure-heading"
                className="section-title mb-6"
              >
                Chapter Structure
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.chapters.map((chapter, i) => (
                  <div
                    key={chapter}
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card"
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-sm font-semibold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{chapter}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Features */}
            <section aria-labelledby="features-heading" className="mb-14">
              <h2
                id="features-heading"
                className="section-title mb-6"
              >
                Features Included in This {data.level} Template
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-3 p-4 rounded-xl border bg-card"
                  >
                    <svg
                      className="w-5 h-5 text-green-600 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Main Content — crawlable text */}
            <section aria-labelledby="about-heading" className="mb-14">
              <h2
                id="about-heading"
                className="section-title mb-6"
              >
                About the {data.level} Thesis Template
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed max-w-3xl">
                {data.pageContent.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph.trim()}</p>
                ))}
              </div>
            </section>

            {/* Comparison Highlights */}
            <section aria-labelledby="comparison-heading" className="mb-14">
              <h2
                id="comparison-heading"
                className="section-title mb-6"
              >
                ThesisForge vs Manual LaTeX vs Overleaf
              </h2>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Feature</th>
                      <th className="text-left p-4 font-medium">ThesisForge</th>
                      <th className="text-left p-4 font-medium">Manual LaTeX</th>
                      <th className="text-left p-4 font-medium">Overleaf</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Setup Time</td>
                      <td className="p-4 text-green-600 font-medium">Zero — instant</td>
                      <td className="p-4 text-muted-foreground">Hours to days</td>
                      <td className="p-4 text-muted-foreground">15–30 minutes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">LaTeX Knowledge Required</td>
                      <td className="p-4 text-green-600 font-medium">None</td>
                      <td className="p-4 text-muted-foreground">Extensive</td>
                      <td className="p-4 text-muted-foreground">Moderate</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Account Required</td>
                      <td className="p-4 text-green-600 font-medium">No</td>
                      <td className="p-4 text-green-600 font-medium">No</td>
                      <td className="p-4 text-amber-600 font-medium">Yes (free tier)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Works Offline</td>
                      <td className="p-4 text-green-600 font-medium">Yes</td>
                      <td className="p-4 text-green-600 font-medium">Yes</td>
                      <td className="p-4 text-muted-foreground">Limited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Data Privacy</td>
                      <td className="p-4 text-green-600 font-medium">100% local</td>
                      <td className="p-4 text-green-600 font-medium">100% local</td>
                      <td className="p-4 text-muted-foreground">Cloud-stored</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Real-time Collaboration</td>
                      <td className="p-4 text-muted-foreground">No</td>
                      <td className="p-4 text-muted-foreground">No</td>
                      <td className="p-4 text-green-600 font-medium">Yes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Error-Free Output</td>
                      <td className="p-4 text-green-600 font-medium">Guaranteed</td>
                      <td className="p-4 text-muted-foreground">Manual debugging</td>
                      <td className="p-4 text-muted-foreground">Manual debugging</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium">Cost</td>
                      <td className="p-4 text-green-600 font-medium">Free forever</td>
                      <td className="p-4 text-green-600 font-medium">Free (open source)</td>
                      <td className="p-4 text-amber-600 font-medium">Freemium</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-muted-foreground max-w-3xl">
                {data.comparisonHighlights}
              </p>
            </section>

            {/* LaTeX Code Snippet */}
            <section aria-labelledby="code-heading" className="mb-14">
              <h2
                id="code-heading"
                className="section-title mb-6"
              >
                {data.level} Thesis LaTeX Code Example
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
                Below is a sample of the LaTeX code that ThesisForge generates for a{" "}
                {data.level.toLowerCase()} thesis. You can export the complete, compilable code as a ZIP file and
                open it directly in Overleaf.
              </p>
              <div className="rounded-xl border bg-card overflow-x-auto">
                <pre className="latex-code-block p-6 text-sm leading-relaxed overflow-x-auto">
                  <code>{data.latexSnippet}</code>
                </pre>
              </div>
            </section>

            {/* CTA */}
            <section className="mb-14 rounded-2xl bg-primary/5 border border-primary/10 p-8 sm:p-10 text-center">
              <h2 className="section-title mb-3">
                Generate Your {data.level} Thesis Now
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Create a professional, compilable {data.level.toLowerCase()} thesis in LaTeX in under 10
                minutes. No LaTeX knowledge, no account, and no cost required.
              </p>
              <Link
                href={`/?template=${slug}`}
                className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity cta-pulse"
              >
                Start Free {data.level} Thesis Generator
              </Link>
            </section>

            {/* FAQ Section */}
            <section aria-labelledby="faq-heading" className="mb-14">
              <h2
                id="faq-heading"
                className="section-title mb-6"
              >
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {data.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-xl border bg-card"
                  >
                    <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-medium hover:text-primary transition-colors list-none">
                      {faq.question}
                      <svg
                        className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform shrink-0 ml-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Internal Links — Other Templates */}
            <section aria-labelledby="other-templates-heading" className="mb-14">
              <h2
                id="other-templates-heading"
                className="section-title mb-6"
              >
                Other Thesis Templates
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {otherSlugs(slug).map((t) => (
                  <Link
                    key={t.slug}
                    href={`/templates/${t.slug}`}
                    className="block p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <h3 className="text-sm font-semibold mb-1">{t.level} Template</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {t.description.slice(0, 100)}...
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Internal Links — Citation Styles */}
            <section aria-labelledby="citation-heading" className="mb-14">
              <h2
                id="citation-heading"
                className="section-title mb-6"
              >
                Citation Styles for Your {data.level} Thesis
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
                ThesisForge supports five major citation styles. Choose the one required by your
                university or discipline:
              </p>
              <div className="flex flex-wrap gap-3">
                {citationStyles.map((style) => (
                  <Link
                    key={style.toLowerCase()}
                    href={`/citation-styles/${style.toLowerCase()}`}
                    className="inline-flex items-center px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    {style}
                  </Link>
                ))}
              </div>
            </section>
          </article>
        </main>

        {/* Footer */}
        <footer className="border-t py-8 mt-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ThesisForge. Free forever.</p>
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
