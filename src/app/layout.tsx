import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
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
    "Create professional LaTeX thesis documents instantly. Choose from standard templates, fill in your content, and download ready-to-compile LaTeX code.",
  keywords: [
    "thesis",
    "latex",
    "dissertation",
    "academic writing",
    "thesis generator",
    "LaTeX editor",
    "research paper",
  ],
  authors: [{ name: "ThesisForge" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>",
  },
  openGraph: {
    title: "ThesisForge — Instant LaTeX Thesis Creator",
    description: "Create professional LaTeX thesis documents instantly.",
    type: "website",
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
      </head>
      <body
        className={`${poppins.variable} font-poppins antialiased bg-background text-foreground`}
        style={{ fontFamily: "'Google Sans', 'Poppins', sans-serif" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
