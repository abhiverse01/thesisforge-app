import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ThesisForge — Free LaTeX Thesis Generator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0a1d",
          padding: "60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 60%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            zIndex: 1,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 20,
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              marginBottom: "8px",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4H5z" />
              <path d="M14 3v3.5a1.5 1.5 0 001.5 1.5H19" />
              <path d="M16.5 7.5L8.5 16" strokeWidth="2.2" />
              <path d="M14.5 9.5l1.2-1.5" strokeWidth="1.4" opacity="0.6" />
              <circle cx="7.8" cy="16.8" r="1.3" fill="#a5b4fc" stroke="none" />
              <circle cx="7.8" cy="16.8" r="2" fill="none" stroke="#a5b4fc" strokeWidth="0.8" opacity="0.25" />
              <path d="M7 11h5.5" strokeWidth="1.2" />
              <path d="M7 13.5h4" strokeWidth="1.1" opacity="0.65" />
              <path d="M7 16h2.5" strokeWidth="1.0" opacity="0.35" />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Thesis
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#818cf8",
                letterSpacing: "-0.02em",
              }}
            >
              Forge
            </span>
          </div>

          {/* Tagline */}
          <p
            style={{
              fontSize: 28,
              color: "#a5b4fc",
              fontWeight: 500,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Free LaTeX Thesis Generator
          </p>

          {/* Code snippet preview */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "rgba(15, 12, 35, 0.8)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: 12,
              padding: "20px 28px",
              marginTop: "16px",
              fontFamily: "monospace",
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: "#6366f1" }}>{"\\documentclass"}</span>
            <span style={{ color: "#a5b4fc" }}>{`[12pt]{article}`}</span>
            <span style={{ color: "#6366f1" }}>{"\\begin"}{`{document}`}</span>
            <span style={{ color: "#94a3b8" }}>
              {"  "}{`\\title`}{" {Your Thesis Title}"}
            </span>
            <span style={{ color: "#94a3b8" }}>
              {"  "}{`\\author`}{" {Your Name}"}
            </span>
            <span style={{ color: "#94a3b8" }}>
              {"  "}{`\\maketitle`}
            </span>
            <span style={{ color: "#6366f1" }}>{"\\end"}{`{document}`}</span>
          </div>

          {/* Bottom badges */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            {["Free Forever", "No Sign-up", "Works Offline"].map(
              (badge) => (
                <span
                  key={badge}
                  style={{
                    fontSize: 16,
                    color: "#94a3b8",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    padding: "6px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {badge}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
