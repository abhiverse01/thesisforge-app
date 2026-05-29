import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/config";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

// ============================================================
// Blog Post Data
// ============================================================

const BASE_URL = SITE_URL;

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  content: string;
  excerpt: string;
  relatedLinks?: { label: string; href: string }[];
}

const blogPosts: BlogPost[] = [
  {
    slug: "how-to-write-bachelors-thesis-latex",
    title: "How to Write a Bachelor's Thesis in LaTeX — A Complete Guide",
    description: "A step-by-step walkthrough for undergraduate students who need to write a professional thesis in LaTeX.",
    date: "2025-04-15",
    author: "ThesisForge Team",
    excerpt: "A step-by-step walkthrough for undergraduate students who need to write a professional thesis in LaTeX.",
    content: `Writing a bachelor's thesis is one of the most significant academic milestones for any undergraduate student. It demonstrates your ability to conduct independent research, analyze data, and present your findings in a structured, professional format. LaTeX has long been the gold standard for academic document preparation, offering unmatched typesetting quality, automatic numbering of sections and figures, and seamless bibliography management through BibTeX.

Choosing the right thesis template is the first and most important step. A well-structured template sets up the correct page margins, heading hierarchy, citation style, and formatting conventions required by your university. ThesisForge provides pre-configured bachelor's thesis templates that follow common academic standards, so you do not need to spend hours adjusting preamble settings or chasing down formatting errors in your LaTeX document.

The typical structure of a bachelor's thesis in LaTeX includes a title page, abstract, table of contents, introduction, literature review, methodology, results and discussion, conclusion, references, and appendices. Each of these sections is automatically numbered and formatted by LaTeX, but you need to use the correct document class and packages. ThesisForge handles all of this for you — simply fill in your content through the step-by-step wizard, and the platform generates clean, compilable LaTeX code.

One of the biggest advantages of using LaTeX for your bachelor's thesis is reference management. Instead of manually formatting citations, you can use BibTeX with citation styles like APA, IEEE, or Chicago. ThesisForge includes a built-in reference editor that lets you add sources by title, DOI, or manual entry, and it generates the corresponding BibTeX entries automatically. This eliminates the tedious process of manually writing bibliography entries and ensures consistent formatting throughout your document.

After you have written all your chapters and added references, the final step is to compile your LaTeX document. ThesisForge exports a complete ZIP file containing your main.tex and references.bib files, ready to be opened in Overleaf, TeXStudio, or any other LaTeX editor. Simply upload the files, click compile, and your professionally formatted PDF thesis is ready for submission. No LaTeX knowledge required — ThesisForge generates everything for you.`,
    relatedLinks: [
      { label: 'ThesisForge vs Overleaf', href: '/vs/overleaf' },
      { label: 'LaTeX vs Word for Thesis', href: '/vs/word' },
    ],
  },
  {
    slug: "apa-vs-ieee-vs-chicago-citation-styles",
    title: "APA vs IEEE vs Chicago: Which Citation Style Should You Use?",
    description: "Understanding the differences between APA, IEEE, and Chicago citation styles and when to use each one.",
    date: "2025-04-10",
    author: "ThesisForge Team",
    excerpt: "Understanding the differences between APA, IEEE, and Chicago citation styles. Learn when to use each one and how ThesisForge handles them.",
    content: `Citation styles are one of the most confusing aspects of academic writing, yet they are essential for giving proper credit to sources and allowing readers to locate your references. The three most commonly used citation styles in thesis writing are APA (American Psychological Association), IEEE (Institute of Electrical and Electronics Engineers), and Chicago (also known as Turabian). Each style has distinct rules for in-text citations, reference list formatting, and overall document structure.

APA style is the standard for social sciences, education, psychology, and business. It uses an author-date system for in-text citations, meaning you cite sources by listing the author's last name and the year of publication in parentheses. For example: (Smith, 2024). The reference list at the end of your paper is organized alphabetically by author. APA style emphasizes the publication date, which makes it particularly useful for fields where recent research is especially relevant. ThesisForge generates APA-formatted citations automatically when you select the APA citation style in the format editor step.

IEEE style is widely used in engineering, computer science, and electrical engineering. Unlike APA, IEEE uses a numeric citation system where sources are numbered in the order they appear in your text. Each citation is a number in square brackets, like [1], [2], and so on. The reference list is also numbered correspondingly. IEEE style tends to produce more compact in-text citations, which is useful in technical papers where citations are frequent. ThesisForge supports IEEE citation format and will number your references sequentially as you add them.

Chicago style offers two systems: notes-bibliography (common in humanities) and author-date (common in sciences). The notes-bibliography system uses footnotes or endnotes with superscript numbers, while the author-date system works similarly to APA. Chicago is favored in history, philosophy, and the arts. The reference list formatting differs significantly from both APA and IEEE, with specific rules for capitalizing titles, abbreviating journal names, and listing publisher information.

Choosing the right citation style depends on your field of study and your university's requirements. Many universities specify which style to use in their thesis guidelines. If you are unsure, check with your advisor or department. ThesisForge makes it easy to switch between citation styles at any time during the writing process — simply change the citation format in the Format step and all your references will be re-formatted automatically.`,
    relatedLinks: [
      { label: 'ThesisForge vs Overleaf', href: '/vs/overleaf' },
      { label: 'ThesisForge vs LaTeX Templates', href: '/vs/latex-templates' },
    ],
  },
  {
    slug: "import-existing-thesis-thesisforge",
    title: "How to Import Your Existing Thesis into ThesisForge",
    description: "Learn how to import PDF, DOCX, TEX, or Markdown files into ThesisForge and continue editing.",
    date: "2025-04-05",
    author: "ThesisForge Team",
    excerpt: "Already started writing? Learn how to import your PDF, DOCX, TEX, or Markdown files into ThesisForge and continue editing with our step-by-step wizard.",
    content: `One of the most common questions we get from students is: "I already started writing my thesis in Word (or LaTeX, or Google Docs). Can I import it into ThesisForge?" The answer is yes — and the process is designed to be as smooth as possible, preserving as much of your existing work as possible.

ThesisForge supports importing from five file formats: PDF, LaTeX (.tex), Microsoft Word (.docx), Markdown (.md), and plain text (.txt). Each format has its own import engine that extracts text, identifies structural elements like chapters and sections, and maps the content to the appropriate fields in the ThesisForge wizard. The import system uses intelligent content analysis to detect headings, paragraphs, lists, and other document structures automatically.

To import your thesis, simply click the "Import Thesis Files" button on the ThesisForge homepage. You can select a single file or multiple files at once. For multi-file imports, ThesisForge merges the content intelligently — all chapters and references are combined into a single thesis project. After the import is processed, you will see a review modal that shows exactly what was extracted, including the confidence score for each detected field.

The review modal is a key part of the import workflow. It shows you a side-by-side comparison of the original content and the mapped fields, so you can verify that titles, abstracts, authors, and other metadata were extracted correctly. You can edit any field before accepting the import, which means you have full control over the final result. This is especially important for PDF imports, where text extraction can sometimes be less precise due to complex layouts or scanned pages.

Once you accept the import, all your content is loaded into the ThesisForge wizard. You can then continue editing through the step-by-step interface, add more chapters, manage references, and export a clean LaTeX file when you are ready. The import feature means you never lose your existing work — just bring it in, polish it, and export a professional LaTeX thesis.`,
    relatedLinks: [
      { label: 'ThesisForge vs Overleaf', href: '/vs/overleaf' },
      { label: 'ThesisForge vs LaTeX Templates', href: '/vs/latex-templates' },
    ],
  },
  {
    slug: "phd-dissertation-structure-chapter-guide",
    title: "PhD Dissertation Structure: A Chapter-by-Chapter Guide",
    description: "Everything you need to know about structuring a PhD dissertation with practical tips and LaTeX examples.",
    date: "2025-03-28",
    author: "ThesisForge Team",
    excerpt: "Everything you need to know about structuring a PhD dissertation. From the abstract to the appendices, we cover every chapter with practical tips.",
    content: `A PhD dissertation is the culmination of years of research, and its structure is fundamentally different from a bachelor's or master's thesis. While shorter theses typically follow the IMRAD format (Introduction, Methods, Results, and Discussion), a doctoral dissertation requires a more comprehensive and nuanced structure that reflects the depth and breadth of the research. Understanding this structure before you start writing will save you significant time and effort.

The dissertation begins with front matter, which includes the title page, abstract, declaration of originality, acknowledgements, table of contents, list of figures, list of tables, list of abbreviations, and nomenclature. The front matter sets the professional tone for your work and provides readers with an organized overview of the document structure. In LaTeX, all of these elements are generated automatically using packages like \\tableofcontents, \\listoffigures, and custom glossary packages. ThesisForge's PhD template includes all of these sections pre-configured.

Following the front matter is the introduction chapter, which typically comprises 5-10% of the total dissertation. This chapter establishes the research context, identifies the research gap, states the research questions or hypotheses, and outlines the significance and contributions of the work. A strong introduction should funnel from a broad context down to the specific research problem, making a compelling case for why the research matters and how it advances the field.

The literature review chapter is often the longest section, typically 20-30% of the dissertation. It provides a critical analysis of existing research related to your topic, identifies gaps in the current knowledge, and establishes the theoretical framework for your study. Unlike an annotated bibliography, a literature review synthesizes multiple sources to build a coherent narrative that leads naturally to your research questions. Organize the review thematically rather than chronologically, and make sure to highlight how each body of work relates to your own research.

The methodology chapter describes your research design, data collection methods, analysis techniques, and any tools or equipment used. It should provide enough detail for another researcher to replicate your study. For experimental research, this includes the experimental setup, variables, controls, and statistical methods. For computational research, it covers algorithms, software tools, data sources, and evaluation metrics. In a LaTeX thesis, you can use the \\lstlisting environment for code snippets and the \\algorithm environment for pseudocode.

The results and discussion chapters present your findings and interpret their significance. Some dissertations combine these into a single chapter, while others separate them. Each result should be presented objectively, with appropriate tables, figures, and statistical analyses. The discussion section then interprets these results in the context of your research questions, compares them with existing literature, and addresses any unexpected findings. ThesisForge's PhD template includes properly formatted figure and table environments with automatic numbering and cross-referencing.

The conclusion chapter summarizes the key findings, discusses their implications, acknowledges limitations, and suggests directions for future research. It should be concise — typically 3-5% of the total dissertation — and should not introduce new information. Finally, the appendices contain supplementary material such as raw data, mathematical proofs, survey instruments, and code listings. ThesisForge generates all of this structure automatically, letting you focus entirely on the content rather than formatting.`,
    relatedLinks: [
      { label: 'ThesisForge vs Overleaf', href: '/vs/overleaf' },
      { label: 'LaTeX vs Word for Thesis', href: '/vs/word' },
    ],
  },
];

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) {
    return {
      title: "Blog Post — ThesisForge",
      description: "Read this article on the ThesisForge blog.",
    };
  }

  return {
    title: `${post.title} | ThesisForge Blog`,
    description: post.description,
    alternates: {
      canonical: `${BASE_URL}/blog/${slug}`,
    },
    openGraph: {
      title: `${post.title} | ThesisForge Blog`,
      description: post.description,
      url: `${BASE_URL}/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      siteName: "ThesisForge",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  // Article JSON-LD
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "ThesisForge",
      url: BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleLd),
        }}
      />

      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl backdrop-saturate-[1.8]">
          <nav className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground font-medium truncate max-w-[200px]">{post.title}</li>
            </ol>
            <Link href="/" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0">
              Generate Thesis
            </Link>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {/* Post Header */}
            <header className="mb-10">
              <time
                dateTime={post.date}
                className="block text-sm text-muted-foreground mb-3"
              >
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <h1 className="page-title mb-4">{post.title}</h1>
              <p className="text-lg text-muted-foreground">{post.excerpt}</p>
              <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {post.author.charAt(0)}
                </div>
                <span>{post.author}</span>
              </div>
            </header>

            {/* Post Content */}
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed
              prose-headings:text-foreground prose-headings:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-code:font-mono prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-background prose-pre:border prose-pre:border-border
              prose-strong:text-foreground
              prose-li:text-muted-foreground">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            {/* CTA */}
            <section className="mt-14 rounded-2xl bg-primary/5 border border-primary/10 p-8 text-center">
              <h2 className="section-title mb-3">Ready to Write Your Thesis?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                Generate a professional LaTeX thesis in minutes with ThesisForge. Free, no account
                required.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Start Free Thesis Generator
              </Link>
            </section>

            {/* Related Comparisons — links to /vs/ pages */}
            {post.relatedLinks && post.relatedLinks.length > 0 && (
              <section className="mt-8">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Related Comparisons</h3>
                <div className="flex flex-wrap gap-2">
                  {post.relatedLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      {link.label}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Link>
                  ))}
                </div>
              </section>
            )}
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
