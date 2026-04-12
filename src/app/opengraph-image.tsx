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
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
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
            <span style={{ color: "#a5b4fc" }}>[12pt]{article}</span>
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
