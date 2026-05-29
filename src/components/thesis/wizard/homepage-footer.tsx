"use client";

import React from "react";
import { Mail, ExternalLink, Github, Heart, Sparkles } from "lucide-react";
import Image from "next/image";

export function HomepageFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-border/40 relative overflow-hidden">
      {/* Subtle gradient glow above footer */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 5%, oklch(0.50 0.22 264 / 0.35) 25%, oklch(0.60 0.18 305 / 0.3) 50%, oklch(0.55 0.20 42 / 0.25) 75%, transparent 95%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        {/* Top row: Brand + Developer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand identity */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, oklch(0.50 0.22 264) 0%, oklch(0.60 0.18 305) 100%)',
                boxShadow: '0 2px 8px oklch(0.50 0.22 264 / 0.2)',
              }}
            >
              <Image
                src="/logo.png"
                alt="ThesisForge"
                width={20}
                height={20}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-semibold text-foreground/80 tracking-tight">
                ThesisForge
              </p>
              <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Free &middot; Open Source &middot; Works Offline
              </p>
            </div>
          </div>

          {/* Developer credit — refined */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border/30">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.50 0.22 264 / 0.15), oklch(0.60 0.18 305 / 0.15))',
                  border: '1px solid oklch(0.50 0.22 264 / 0.2)',
                }}
              >
                <span className="text-[10px] font-bold text-primary">
                  AS
                </span>
              </div>
              <a
                href="https://abhishekshah.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Abhishek Shah
              </a>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-0.5">
              <a
                href="mailto:abhishek.aimarine@gmail.com"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-all duration-200"
                title="Email"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://abhishekshah.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-all duration-200"
                title="Portfolio"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Pipeline badge — premium feel */}
        <div className="mt-3 pt-3 border-t border-border/20 flex items-center justify-center gap-2">
          <p className="text-[11px] text-muted-foreground/35 flex items-center gap-1.5">
            <span>
              Paste content &rarr;{" "}
              <code className="text-[11px] bg-secondary/40 px-1.5 py-0.5 rounded font-mono font-medium text-muted-foreground/50">
                .tex
              </code>{" "}
              &rarr; Compile &rarr; PDF
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
