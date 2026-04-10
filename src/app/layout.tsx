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
});

export const metadata: Metadata = {
  title: "ThesisForge — Instant LaTeX Thesis Creator",
  description:
    "Create professional LaTeX thesis documents instantly. Choose from standard templates, fill in your content, and download ready-to-compile LaTeX code. Built by Abhishek Shah.",
  keywords: [
    "thesis",
    "latex",
    "dissertation",
    "academic writing",
    "thesis generator",
    "LaTeX editor",
    "research paper",
    "ThesisForge",
    "Abhishek Shah",
  ],
  authors: [{ name: "Abhishek Shah", url: "https://abhishekshah.vercel.app" }],
  creator: "Abhishek Shah",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>",
  },
  openGraph: {
    title: "ThesisForge — Instant LaTeX Thesis Creator",
    description: "Create professional LaTeX thesis documents instantly. Paste content. Download .tex. Compile. Get PDF.",
    type: "website",
    siteName: "ThesisForge",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThesisForge — Instant LaTeX Thesis Creator",
    description: "Create professional LaTeX thesis documents instantly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="author" content="Abhishek Shah" />
        <meta name="creator" content="Abhishek Shah" />
        <link rel="me" href="mailto:abhishek.aimarine@gmail.com" />
      </head>
      <body
        className={`${poppins.variable} font-poppins antialiased bg-background text-foreground`}
        style={{ fontFamily: "'Google Sans', 'Poppins', system-ui, sans-serif" }}
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
