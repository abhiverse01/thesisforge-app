import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// ============================================================
// Comparison Data — SEO & Content Definitions
// ============================================================

interface ComparisonData {
  slug: string;
  seoTitle: string;
  description: string;
  keyword: string;
  competitorName: string;
  pageContent: string;
  rows: { feature: string; thesisforge: string; competitor: string; verdict: "thesisforge" | "competitor" | "tie" }[];
  honestCompetitorWins: string[];
  thesisforgeWins: string[];
  faqs: { question: string; answer: string }[];
}

const BASE_URL = "https://thesisforge-web.vercel.app";

const comparisons: Record<string, ComparisonData> = {
  overleaf: {
    slug: "overleaf",
    seoTitle: "ThesisForge vs Overleaf — Free Alternative",
    description:
      "Compare ThesisForge vs Overleaf for LaTeX thesis writing. ThesisForge: no account, offline, zero setup, free forever. Honest comparison of features, pricing, and ease of use.",
    keyword: "overleaf alternative free",
    competitorName: "Overleaf",
    pageContent: `Choosing the right tool for writing your LaTeX thesis is an important decision that affects your workflow, privacy, and productivity. ThesisForge and Overleaf are both tools for creating LaTeX documents, but they take fundamentally different approaches to solving the same problem. This page provides an honest, detailed comparison to help you make the right choice for your academic needs.

Overleaf is a cloud-based LaTeX editor that provides a collaborative online environment for writing LaTeX documents. It offers real-time collaboration, a built-in PDF preview, and a vast template gallery. Overleaf has become the most popular online LaTeX editor, used by millions of students and researchers worldwide. Its strength lies in providing a complete LaTeX editing experience in the browser, with features like Git integration, real-time co-authoring, and a rich set of templates.

ThesisForge takes a different approach. Instead of being a LaTeX editor, ThesisForge is a guided thesis generator that eliminates the need to know LaTeX at all. You fill in your thesis content through a simple wizard — metadata, chapters, references, formatting — and ThesisForge generates correct, compilable LaTeX code that you can then compile in Overleaf or locally. Think of it as a bridge between the simplicity of a word processor and the power of LaTeX.

The key philosophical difference is this: Overleaf is for people who want to write LaTeX (and may already know it), while ThesisForge is for people who want LaTeX-quality output without learning LaTeX. These are complementary tools, not just competitors. In fact, many ThesisForge users export their thesis to Overleaf for final compilation and collaborative review.

Overleaf genuinely excels in several areas. Real-time collaboration is Overleaf's killer feature — multiple authors can edit the same document simultaneously, see each other's cursors, and leave comments. The template gallery is vast and community-contributed, covering niche formats that ThesisForge's four templates do not. The built-in compiler with instant PDF preview is excellent for iterative editing. And Overleaf's track changes and commenting features make it ideal for supervisor-student workflows.

However, Overleaf has limitations that ThesisForge addresses. You need to create an account to use Overleaf. Your documents are stored on Overleaf's servers, which raises privacy concerns for sensitive research data. The free tier limits collaboration and project count. And critically, you still need to know LaTeX syntax to use Overleaf effectively — it does not write LaTeX for you.

ThesisForge fills these gaps. No account is required. All data stays in your browser. It works offline. And most importantly, it handles all LaTeX syntax for you. For students who are new to LaTeX, writing a thesis under time pressure, or who simply want professional output without the learning curve, ThesisForge is the fastest path from blank page to compiled PDF.`,
    rows: [
      { feature: "Account Required", thesisforge: "No", competitor: "Yes (free tier available)", verdict: "thesisforge" },
      { feature: "LaTeX Knowledge Needed", thesisforge: "None", competitor: "Moderate to extensive", verdict: "thesisforge" },
      { feature: "Setup Time", thesisforge: "Zero — start immediately", competitor: "15–30 min (create account, find template)", verdict: "thesisforge" },
      { feature: "Data Privacy", thesisforge: "100% local (browser)", competitor: "Cloud-stored (servers)", verdict: "thesisforge" },
      { feature: "Works Offline", thesisforge: "Yes, fully", competitor: "Limited (cached only)", verdict: "thesisforge" },
      { feature: "Cost", thesisforge: "Free forever", competitor: "Freemium ($8–15/mo paid)", verdict: "thesisforge" },
      { feature: "Real-time Collaboration", thesisforge: "No", competitor: "Yes (excellent)", verdict: "competitor" },
      { feature: "Template Variety", thesisforge: "4 thesis templates", competitor: "Thousands of templates", verdict: "competitor" },
      { feature: "Live PDF Preview", thesisforge: "No (export then compile)", competitor: "Yes (built-in compiler)", verdict: "competitor" },
      { feature: "Git Integration", thesisforge: "No", competitor: "Yes", verdict: "competitor" },
      { feature: "Track Changes", thesisforge: "No", competitor: "Yes", verdict: "competitor" },
      { feature: "Error-Free Output", thesisforge: "Guaranteed (validated)", competitor: "Manual debugging required", verdict: "thesisforge" },
      { feature: "BibTeX Generation", thesisforge: "Automatic", competitor: "Manual entry", verdict: "thesisforge" },
      { feature: "Writing Intelligence", thesisforge: "Yes (completeness scoring)", competitor: "No", verdict: "thesisforge" },
      { feature: "Overleaf Compatible Export", thesisforge: "Yes (direct ZIP upload)", competitor: "N/A (native)", verdict: "tie" },
    ],
    honestCompetitorWins: [
      "Real-time collaboration — Overleaf allows multiple people to edit the same document simultaneously with cursor tracking and comments, making it ideal for team projects and supervisor-student workflows.",
      "Template variety — Overleaf's gallery includes thousands of templates for every imaginable document type, including university-specific thesis templates that ThesisForge does not offer.",
      "Live PDF preview — Overleaf compiles your document in real time as you type, giving instant feedback. ThesisForge requires you to export and compile separately.",
      "Git integration — Overleaf supports Git for version control, allowing advanced users to manage their documents with familiar workflows.",
    ],
    thesisforgeWins: [
      "No account required — ThesisForge works immediately without registration, login, or email verification.",
      "Offline support — ThesisForge works entirely in your browser with no internet connection needed after initial load.",
      "Data privacy — Your thesis data never leaves your device. Everything is stored locally using IndexedDB.",
      "Zero LaTeX knowledge — ThesisForge generates all LaTeX code for you. You fill in plain text forms and get compilable output.",
      "Free forever — No premium tiers, no feature gates, no subscription plans. Everything is free.",
      "Error-free output — ThesisForge validates all inputs and generates guaranteed-compilable LaTeX code.",
    ],
    faqs: [
      {
        question: "Is ThesisForge a replacement for Overleaf?",
        answer:
          "Not exactly. ThesisForge and Overleaf serve different needs. ThesisForge generates LaTeX code without requiring LaTeX knowledge. Overleaf is a full-featured LaTeX editor for people who know (or want to learn) LaTeX. Many users use both: ThesisForge to generate the initial document, then Overleaf for collaborative editing and final polishing.",
      },
      {
        question: "Can I export from ThesisForge to Overleaf?",
        answer:
          "Yes. ThesisForge exports a ZIP file containing your main.tex and references.bib that you can upload directly to Overleaf. It will compile without any modifications. This is actually the recommended workflow for many users.",
      },
      {
        question: "Is ThesisForge really free compared to Overleaf?",
        answer:
          "Yes. ThesisForge is completely free with no premium tiers or limitations. Overleaf offers a free tier with limited features (one collaborator, limited project count). Overleaf's paid plans cost $8–15 per month for features like track changes and advanced collaboration.",
      },
      {
        question: "Which is better for a beginner writing their first thesis?",
        answer:
          "ThesisForge is better for absolute beginners who do not know LaTeX. The wizard guides you through every step and generates error-free code. Overleaf requires you to understand LaTeX syntax, which can be overwhelming for first-time users under time pressure.",
      },
      {
        question: "Does Overleaf offer better templates than ThesisForge?",
        answer:
          "Overleaf has a much larger template library with thousands of community-contributed templates, including university-specific ones. However, ThesisForge's four templates cover the most common thesis types (bachelor, master, PhD, research report) and are pre-configured with correct formatting out of the box.",
      },
    ],
  },

  "latex-templates": {
    slug: "latex-templates",
    seoTitle: "ThesisForge vs LaTeX Templates — Free Alternative",
    description:
      "Compare ThesisForge vs downloading LaTeX templates. ThesisForge: wizard-guided, no LaTeX needed, instant output. Honest comparison for students choosing a thesis template solution.",
    keyword: "latex thesis template alternative",
    competitorName: "LaTeX Templates (manual)",
    pageContent: `When you search for a LaTeX thesis template online, you will find hundreds of websites offering downloadable .tex files for every imaginable thesis format. These templates — from sites like LaTeX Templates, Overleaf Gallery, GitHub, and university repositories — provide a starting point for your LaTeX document. But using a downloaded template comes with challenges that ThesisForge is designed to solve.

The traditional workflow with a downloaded LaTeX template looks like this: find a template that roughly matches your needs, download it, open it in your LaTeX editor (Overleaf, TeXstudio, or similar), spend time understanding the template's structure and conventions, delete the sample content, replace it with your own, fix compilation errors caused by missing packages or incorrect modifications, and eventually produce your thesis. This process can take hours or even days for LaTeX beginners.

The fundamental problem with downloaded templates is that they are static documents written in LaTeX syntax. To use them, you must understand LaTeX well enough to modify the template without breaking it. You need to know which packages are loaded and why, how to modify the preamble, how to add or remove chapters, how to format citations, and how to debug the inevitable compilation errors that arise from modifications.

LaTeX Templates websites genuinely offer advantages. The variety is unmatched — you can find templates for specific universities, specific disciplines, and specific document types. Community templates often include advanced features like custom commands, complex layouts, and discipline-specific formatting that would take significant effort to build from scratch. And because these templates are often maintained by experienced LaTeX users, they tend to be well-structured and comprehensive.

ThesisForge approaches the thesis template problem from a completely different angle. Instead of giving you a LaTeX file to modify, ThesisForge provides a guided wizard that generates LaTeX code from your input. You choose a template type, enter your metadata, write your chapters, add references, configure formatting, and export. The result is a complete, compilable LaTeX document that matches your input exactly — no template modification needed.

The key advantage of ThesisForge over downloaded templates is the elimination of the "LaTeX knowledge gap." With a downloaded template, you must understand enough LaTeX to modify it safely. With ThesisForge, you need zero LaTeX knowledge. The wizard ensures that every element is correctly formatted, every reference is properly cited, and the output compiles without errors.

Another advantage is that ThesisForge provides intelligence features that downloaded templates cannot offer. Completeness scoring, writing feedback, and reading-level analysis help you improve your thesis as you write. These features are built into the wizard and provide real-time guidance that a static .tex file simply cannot deliver.

For students who are comfortable with LaTeX and want maximum customisation, downloaded templates remain a good choice. But for the majority of students who need a professional thesis quickly and without the LaTeX learning curve, ThesisForge is the better solution.`,
    rows: [
      { feature: "LaTeX Knowledge Required", thesisforge: "None", competitor: "Moderate to extensive", verdict: "thesisforge" },
      { feature: "Time to First Draft", thesisforge: "10–30 minutes", competitor: "2–8 hours (modify template)", verdict: "thesisforge" },
      { feature: "Template Variety", thesisforge: "4 curated thesis templates", competitor: "Hundreds of templates", verdict: "competitor" },
      { feature: "University-Specific Templates", thesisforge: "No (generic)", competitor: "Yes (many available)", verdict: "competitor" },
      { feature: "Error-Free Output", thesisforge: "Guaranteed", competitor: "Requires debugging", verdict: "thesisforge" },
      { feature: "Guided Workflow", thesisforge: "Yes (6-step wizard)", competitor: "No (figure it out)", verdict: "thesisforge" },
      { feature: "BibTeX Management", thesisforge: "Built-in (validated)", competitor: "Manual (prone to errors)", verdict: "thesisforge" },
      { feature: "Writing Intelligence", thesisforge: "Yes (completeness, feedback)", competitor: "No", verdict: "thesisforge" },
      { feature: "Customisation Depth", thesisforge: "Moderate (wizard options)", competitor: "Unlimited (edit code)", verdict: "competitor" },
      { feature: "Learning LaTeX", thesisforge: "No (hides LaTeX)", competitor: "Yes (teaches by doing)", verdict: "competitor" },
      { feature: "Cost", thesisforge: "Free forever", competitor: "Free (open source)", verdict: "tie" },
      { feature: "Offline Support", thesisforge: "Yes", competitor: "Yes (local editor)", verdict: "tie" },
    ],
    honestCompetitorWins: [
      "Template variety — Downloaded template sites offer hundreds of templates for specific universities, disciplines, and document types that ThesisForge's four templates cannot match.",
      "Customisation depth — When you download a .tex file, you can modify every aspect of the document, including the preamble, custom commands, and layout. ThesisForge's customisation is limited to wizard options.",
      "Learning LaTeX — Working with downloaded templates teaches you LaTeX by doing, which is valuable for students who want to develop LaTeX skills for future academic work.",
    ],
    thesisforgeWins: [
      "No LaTeX knowledge — ThesisForge's wizard means you never need to read, write, or debug LaTeX code. Perfect for students under time pressure.",
      "Error-free output — Downloaded templates often require debugging, especially after modification. ThesisForge guarantees compilable output.",
      "Built-in BibTeX — Reference management is integrated with validation. No need to manually format BibTeX entries or debug citation errors.",
      "Writing intelligence — Completeness scoring, reading-level analysis, and structural feedback help you write a better thesis, not just format one.",
      "Instant output — From blank page to exported thesis in under 30 minutes. No template hunting, no setup, no configuration.",
    ],
    faqs: [
      {
        question: "Should I use a downloaded LaTeX template or ThesisForge?",
        answer:
          "Use ThesisForge if you do not know LaTeX, are under time pressure, or want guaranteed error-free output. Use a downloaded template if you are comfortable with LaTeX, want maximum customisation, or need a university-specific format that ThesisForge does not offer.",
      },
      {
        question: "Can I export from ThesisForge and then customise the LaTeX in Overleaf?",
        answer:
          "Yes. This is a common workflow. Use ThesisForge to generate the initial document quickly, then export to Overleaf for advanced customisation, collaborative editing, and final polishing.",
      },
      {
        question: "Do downloaded LaTeX templates work with Overleaf?",
        answer:
          "Yes. Most downloadable .tex files can be uploaded to Overleaf and compiled there. However, some templates may require specific packages or fonts that need to be installed or configured.",
      },
      {
        question: "Is ThesisForge better than LaTeX Templates website?",
        answer:
          "It depends on your needs. ThesisForge is better for speed and simplicity — no LaTeX knowledge required. LaTeX Templates is better for variety and customisation. Many users find ThesisForge sufficient for their thesis needs.",
      },
      {
        question: "Can I find university-specific templates online?",
        answer:
          "Yes. Many universities provide LaTeX thesis templates tailored to their specific formatting requirements. If your university has one, you may want to use it directly or use ThesisForge first and then adapt the output to match your university's template.",
      },
    ],
  },

  word: {
    slug: "word",
    seoTitle: "ThesisForge vs Word for Thesis Writing",
    description:
      "ThesisForge vs Microsoft Word for thesis writing — honest comparison. LaTeX quality output without LaTeX learning curve. Professional typesetting, bibliography, and math support.",
    keyword: "thesis in latex or word",
    competitorName: "Microsoft Word",
    pageContent: `The debate between LaTeX and Microsoft Word for academic writing has been going on for decades, and for good reason. Both tools are capable of producing a thesis, but they take fundamentally different approaches to document creation. This comparison helps you understand the trade-offs and explains how ThesisForge bridges the gap between the two.

Microsoft Word is the most widely used word processor in the world, and for good reason. Its familiar interface, WYSIWYG editing, and extensive feature set make it accessible to virtually everyone. Most students already know how to use Word, which eliminates the learning curve associated with LaTeX. Word handles basic formatting well — headings, paragraphs, bullet points, tables, and images are all easy to insert and modify. Its spelling and grammar checker is helpful for catching common errors, and its track changes feature makes supervisor feedback straightforward.

However, Word has significant limitations for long academic documents like theses and dissertations. Managing automatic numbering of figures, tables, and equations can be unreliable, especially in long documents with many cross-references. Formatting consistency often degrades as documents grow — heading styles get accidentally changed, margins shift, and page breaks appear in unexpected places. Bibliography management requires third-party plugins like Zotero or Mendeley, and formatting references according to specific citation styles can be error-prone.

LaTeX, on the other hand, excels at exactly the things Word struggles with. Automatic numbering is flawless — sections, figures, tables, equations, and references are all numbered correctly without manual intervention. Cross-references always point to the right location. The bibliography is generated automatically from your BibTeX database with correct formatting for any citation style. Mathematical typesetting is professional-quality, far surpassing Word's equation editor. And the overall typographic quality — consistent spacing, proper hyphenation, and professional-looking output — is significantly better than what Word produces.

The problem with LaTeX has always been the learning curve. LaTeX is essentially a programming language for documents. You write code, compile it, and view the output. If there is an error in your code, you get an error message (or worse, silent incorrect output). For students who are already under pressure to write their thesis, learning a new markup language can feel like an unnecessary burden.

This is where ThesisForge changes the equation. ThesisForge gives you the quality of LaTeX output without requiring you to learn LaTeX syntax. The wizard interface is as approachable as Word — you fill in forms, not code — but the output is pure LaTeX with all its advantages. You get automatic numbering, cross-referencing, bibliography management, mathematical typesetting, and professional typographic quality, all without writing a single LaTeX command.

For students who need the absolute best document quality and are comfortable with the learning curve, learning LaTeX directly remains the gold standard. For students who want familiar editing with real-time preview, Microsoft Word is perfectly adequate for most thesis requirements. But for students who want LaTeX quality without the LaTeX learning curve, ThesisForge offers the best of both worlds: the simplicity of a form-based interface with the output quality of a professional LaTeX document.`,
    rows: [
      { feature: "Learning Curve", thesisforge: "Minimal (form-based)", competitor: "Minimal (familiar interface)", verdict: "tie" },
      { feature: "Setup Time", thesisforge: "Zero (browser-based)", competitor: "Install Office (5–10 min)", verdict: "thesisforge" },
      { feature: "Cost", thesisforge: "Free forever", competitor: "$70–160/year (Microsoft 365)", verdict: "thesisforge" },
      { feature: "Auto-Numbering (Sections/Figures)", thesisforge: "Flawless (LaTeX)", competitor: "Often unreliable in long docs", verdict: "thesisforge" },
      { feature: "Cross-References", thesisforge: "Always correct (LaTeX)", competitor: "Can break in long docs", verdict: "thesisforge" },
      { feature: "Bibliography Management", thesisforge: "Built-in, validated (BibTeX)", competitor: "Requires plugin (Zotero/Mendeley)", verdict: "thesisforge" },
      { feature: "Mathematical Typesetting", thesisforge: "Professional (amsmath)", competitor: "Adequate (equation editor)", verdict: "thesisforge" },
      { feature: "Typographic Quality", thesisforge: "Excellent (LaTeX)", competitor: "Good (Word)", verdict: "thesisforge" },
      { feature: "WYSIWYG Editing", thesisforge: "No (wizard + compile)", competitor: "Yes (real-time preview)", verdict: "competitor" },
      { feature: "Spelling/Grammar Checker", thesisforge: "No (use external)", competitor: "Yes (built-in + Editor)", verdict: "competitor" },
      { feature: "Track Changes", thesisforge: "No (use Overleaf export)", competitor: "Yes (excellent)", verdict: "competitor" },
      { feature: "Familiarity", thesisforge: "Low (new tool)", competitor: "High (everyone knows Word)", verdict: "competitor" },
      { feature: "Offline Support", thesisforge: "Yes (browser)", competitor: "Yes (desktop app)", verdict: "tie" },
      { feature: "File Size", thesisforge: "Small (.tex + .bib)", competitor: "Large (.docx)", verdict: "thesisforge" },
    ],
    honestCompetitorWins: [
      "Familiarity — Microsoft Word is used by billions of people. There is virtually no learning curve for basic operations, and most students already have years of experience with it.",
      "WYSIWYG editing — What you see is what you get. Word shows you exactly how your document will look as you edit it, which is faster for iterative writing and formatting.",
      "Spelling and grammar — Word's built-in checker plus Microsoft Editor provide real-time writing assistance that ThesisForge does not offer natively.",
      "Track changes — Word's track changes feature is industry-standard for supervisor-student review workflows, allowing inline comments, suggestions, and revision tracking.",
    ],
    thesisforgeWins: [
      "Professional typesetting — LaTeX output has consistently better typography than Word, including proper hyphenation, ligatures, and spacing.",
      "Automatic numbering — Sections, figures, tables, equations, and references are always numbered correctly in LaTeX, even in 200-page documents.",
      "BibTeX bibliography — Built-in reference management with validated entries and automatic formatting for five citation styles. No plugins required.",
      "Mathematical equations — LaTeX's amsmath package produces publication-quality equations that far surpass Word's equation editor.",
      "Cost — Free forever vs. Microsoft 365 subscription. No recurring fees, no licensing issues.",
      "Document stability — LaTeX documents do not suffer from formatting drift, broken styles, or layout shifts that commonly affect long Word documents.",
    ],
    faqs: [
      {
        question: "Should I write my thesis in LaTeX or Word?",
        answer:
          "If your university does not specify a format, choose based on your priorities. Word is faster for most students because of familiarity and WYSIWYG editing. LaTeX produces better-quality output, especially for STEM theses with equations and complex references. ThesisForge gives you LaTeX quality without the LaTeX learning curve.",
      },
      {
        question: "Can I export my ThesisForge thesis to Word format?",
        answer:
          "Not directly. ThesisForge generates LaTeX code (.tex + .bib files). However, you can compile the LaTeX to PDF, which is the standard submission format for most universities. If you absolutely need .docx, you can use pandoc to convert LaTeX to Word.",
      },
      {
        question: "Is LaTeX really better than Word for academic writing?",
        answer:
          "For specific aspects, yes. LaTeX excels at automatic numbering, cross-referencing, bibliography management, mathematical typesetting, and long-document stability. Word excels at ease of use, WYSIWYG editing, and collaboration features. The best choice depends on your specific needs.",
      },
      {
        question: "Do professors prefer LaTeX or Word theses?",
        answer:
          "It varies by discipline. STEM fields (mathematics, physics, computer science, engineering) generally prefer or expect LaTeX. Humanities and social sciences are more evenly split, with Word being more common. ThesisForge lets you produce LaTeX-quality output regardless of your LaTeX expertise.",
      },
      {
        question: "Can I use ThesisForge if my university requires a specific Word template?",
        answer:
          "If your university mandates a specific .docx template, ThesisForge may not be the best primary tool. However, you can use ThesisForge to draft your content and then transfer it to the required Word template. The structured wizard helps you organise your thoughts even if the final formatting is done in Word.",
      },
    ],
  },
};

// ============================================================
// Static Params & Metadata
// ============================================================

export function generateStaticParams() {
  return Object.values(comparisons).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = comparisons[slug];
  if (!data) return {};

  return {
    title: data.seoTitle,
    description: data.description,
    alternates: {
      canonical: `${BASE_URL}/vs/${slug}`,
    },
    openGraph: {
      title: `${data.seoTitle} | ThesisForge`,
      description: data.description,
      url: `${BASE_URL}/vs/${slug}`,
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

export default async function ComparisonLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = comparisons[slug];

  if (!data) {
    notFound();
  }

  const otherComparisons = Object.values(comparisons).filter(
    (c) => c.slug !== slug
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl backdrop-saturate-[1.8]">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground font-medium">
              vs {data.competitorName}
            </li>
          </ol>
          <Link href="/" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Try ThesisForge
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* H1 */}
          <h1 className="page-title mb-4">{data.seoTitle}</h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl">{data.description}</p>

          {/* Main Content */}
          <section aria-labelledby="about-heading" className="mb-14">
            <h2 id="about-heading" className="section-title mb-6">
              ThesisForge vs {data.competitorName}: An Honest Comparison
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed max-w-3xl">
              {data.pageContent.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph.trim()}</p>
              ))}
            </div>
          </section>

          {/* Comparison Table */}
          <section aria-labelledby="table-heading" className="mb-14">
            <h2 id="table-heading" className="section-title mb-6">
              Feature Comparison Table
            </h2>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium min-w-[200px]">Feature</th>
                    <th className="text-left p-4 font-medium min-w-[180px]">ThesisForge</th>
                    <th className="text-left p-4 font-medium min-w-[200px]">{data.competitorName}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={row.feature} className={i < data.rows.length - 1 ? "border-b" : ""}>
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className={`p-4 ${row.verdict === "thesisforge" ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                        {row.thesisforge}
                      </td>
                      <td className={`p-4 ${row.verdict === "competitor" ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                        {row.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Honest Verdict */}
          <div className="grid gap-8 sm:grid-cols-2 mb-14">
            {/* Where ThesisForge Wins */}
            <section aria-labelledby="tf-wins-heading" className="rounded-xl border bg-green-50/50 dark:bg-green-500/5 p-6">
              <h3 id="tf-wins-heading" className="text-sm font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Where ThesisForge Wins
              </h3>
              <ul className="space-y-3">
                {data.thesisforgeWins.map((win) => (
                  <li key={win} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-0.5 shrink-0">•</span>
                    {win}
                  </li>
                ))}
              </ul>
            </section>

            {/* Where Competitor Wins */}
            <section aria-labelledby="comp-wins-heading" className="rounded-xl border bg-amber-50/50 dark:bg-amber-500/5 p-6">
              <h3 id="comp-wins-heading" className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Where {data.competitorName} Wins
              </h3>
              <ul className="space-y-3">
                {data.honestCompetitorWins.map((win) => (
                  <li key={win} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">•</span>
                    {win}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* CTA */}
          <section className="mb-14 rounded-2xl bg-primary/5 border border-primary/10 p-8 sm:p-10 text-center">
            <h2 className="section-title mb-3">
              Try ThesisForge Free — No Commitment Required
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Generate your first thesis in under 10 minutes and see the difference. No account, no
              cost, no LaTeX knowledge needed.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity cta-pulse"
            >
              Start Free Thesis Generator
            </Link>
          </section>

          {/* FAQ Section */}
          <section aria-labelledby="faq-heading" className="mb-14">
            <h2 id="faq-heading" className="section-title mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {data.faqs.map((faq) => (
                <details key={faq.question} className="group rounded-xl border bg-card">
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

          {/* Internal Links — Other Comparisons */}
          <section aria-labelledby="other-comparisons-heading" className="mb-14">
            <h2 id="other-comparisons-heading" className="section-title mb-6">
              Other Comparisons
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {otherComparisons.map((c) => (
                <Link
                  key={c.slug}
                  href={`/vs/${c.slug}`}
                  className="block p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                >
                  <h3 className="text-sm font-semibold mb-1">{c.seoTitle}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.description.slice(0, 120)}...
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Internal Links — Templates */}
          <section aria-labelledby="templates-heading" className="mb-14">
            <h2 id="templates-heading" className="section-title mb-6">
              Thesis Templates
            </h2>
            <div className="flex flex-wrap gap-3">
              {[
                { slug: "bachelors", label: "Bachelor" },
                { slug: "masters", label: "Master" },
                { slug: "phd", label: "PhD" },
                { slug: "research-report", label: "Research Report" },
              ].map((t) => (
                <Link
                  key={t.slug}
                  href={`/templates/${t.slug}`}
                  className="inline-flex items-center px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  {t.label} Template
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
  );
}
