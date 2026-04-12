import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/thesis/theme-provider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
});

// ============================================================
// JSON-LD Structured Data — Server-rendered, never client-injected
// ============================================================

const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ThesisForge",
  applicationCategory: "EducationalApplication",
  applicationSubCategory: "AcademicWritingTool",
  operatingSystem: "Web Browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "Free browser-based LaTeX thesis generator. No LaTeX knowledge required. Export compilable .tex and .bib files for Bachelor's, Master's, PhD, and Research Report theses.",
  url: "https://thesisforge-web.vercel.app",
  screenshot: "https://thesisforge-web.vercel.app/og-image.png",
  featureList: [
    "4 academic thesis templates",
    "6-step guided wizard",
    "BibTeX reference manager",
    "Overleaf-compatible export",
    "Auto-save with IndexedDB",
    "No account required",
    "Works offline",
  ],
  author: {
    "@type": "Person",
    name: "Abhishek Shah",
    url: "https://abhishekshah.vercel.app",
  },
};

const howToLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Generate a LaTeX Thesis Without Knowing LaTeX",
  description:
    "Use ThesisForge to generate a complete, compilable LaTeX thesis in under 10 minutes.",
  totalTime: "PT10M",
  tool: {
    "@type": "HowToTool",
    name: "ThesisForge (free, browser-based)",
  },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Choose a Template",
      text: "Select Bachelor's, Master's, PhD, or Research Report template based on your degree level.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Fill in Metadata",
      text: "Enter your thesis title, author name, university, abstract, and keywords.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Write Your Chapters",
      text: "Add and reorder chapters using the drag-and-drop editor. Add subsections as needed.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Add References",
      text: "Enter your citations with type-specific fields. ThesisForge validates and generates BibTeX automatically.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Configure Formatting",
      text: "Choose font size, paper size, citation style (APA/IEEE/Chicago/Harvard), and line spacing.",
    },
    {
      "@type": "HowToStep",
      position: 6,
      name: "Export Your Thesis",
      text: "Download a ZIP file containing main.tex and references.bib ready to compile on Overleaf or locally.",
    },
  ],
};

const faqPageLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is ThesisForge free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. ThesisForge is completely free, forever. No subscription, no credits, no sign-up required.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to know LaTeX to use ThesisForge?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No LaTeX knowledge is required. The 6-step wizard handles all LaTeX syntax. You fill in plain text and ThesisForge generates correct, compilable LaTeX code.",
      },
    },
    {
      "@type": "Question",
      name: "Does ThesisForge work with Overleaf?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. ThesisForge exports a ZIP containing main.tex and references.bib that can be uploaded directly to Overleaf and compiled.",
      },
    },
    {
      "@type": "Question",
      name: "Does ThesisForge store my thesis data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. All data is stored locally in your browser using IndexedDB. Nothing is sent to any server. Your thesis never leaves your device.",
      },
    },
    {
      "@type": "Question",
      name: "What thesis templates does ThesisForge support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ThesisForge includes 4 templates: Bachelor's Thesis, Master's Thesis, PhD Dissertation, and Research Report. Each is pre-configured with appropriate chapter structures, citation styles, and formatting defaults.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use ThesisForge offline?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. ThesisForge is 100% client-side. Once loaded in your browser, it works without an internet connection.",
      },
    },
    {
      "@type": "Question",
      name: "What citation styles does ThesisForge support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ThesisForge supports IEEE, APA, Vancouver, Chicago, and Harvard citation styles. Select your preferred style in Step 5 of the wizard.",
      },
    },
    {
      "@type": "Question",
      name: "Can I resume my thesis after closing the browser?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. ThesisForge auto-saves your progress to your browser's local storage. Open ThesisForge again and your draft will be exactly where you left it.",
      },
    },
  ],
};

// ============================================================
// Metadata API — Production SEO Configuration
// ============================================================

export const metadata: Metadata = {
  metadataBase: new URL("https://thesisforge-web.vercel.app"),
  title: {
    default:
      "ThesisForge — Free LaTeX Thesis Generator | No LaTeX Knowledge Required",
    template: "%s | ThesisForge",
  },
  description:
    "Generate a complete, compilable LaTeX thesis in minutes. Choose from Bachelor's, Master's, PhD, or Research Report templates. Free, no sign-up, works offline. Export .tex + .bib files ready for Overleaf.",
  keywords: [
    "latex thesis generator",
    "free latex thesis template",
    "thesis latex generator online",
    "phd thesis latex template",
    "masters thesis latex",
    "bachelors thesis latex template",
    "overleaf thesis template",
    "latex thesis without latex knowledge",
    "academic thesis generator",
    "bibtex generator",
    "thesis template download",
    "latex document generator free",
    "thesis writing tool",
    "dissertation latex generator",
    "research report latex template",
  ],
  authors: [{ name: "Abhishek Shah", url: "https://abhishekshah.vercel.app" }],
  creator: "Abhishek Shah",
  publisher: "ThesisForge",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://thesisforge-web.vercel.app",
    siteName: "ThesisForge",
    title: "ThesisForge — Free LaTeX Thesis Generator",
    description:
      "Generate compilable LaTeX thesis code in minutes. 4 templates, 6-step wizard, free forever, no sign-up. Export directly to Overleaf.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ThesisForge — Free LaTeX Thesis Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ThesisForge — Free LaTeX Thesis Generator",
    description:
      "Generate compilable LaTeX thesis code in minutes. Free, no sign-up, works offline.",
    images: ["/og-image.png"],
    creator: "@abhishekshah",
  },
  alternates: {
    canonical: "https://thesisforge-web.vercel.app",
  },
};

// ============================================================
// Root Layout
// ============================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* hreflang — future-proofed for international SEO */}
        <link
          rel="alternate"
          hrefLang="en"
          href="https://thesisforge-web.vercel.app"
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://thesisforge-web.vercel.app"
        />
        <link rel="me" href="mailto:abhishek.aimarine@gmail.com" />

        {/* JSON-LD Structured Data — MUST be server-rendered in <head> */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(howToLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqPageLd),
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${poppins.variable} font-poppins antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
