import { ScanSearch, AlertTriangle, Clock, BarChart2, FileCode } from "lucide-react";

const PLACEHOLDER_ITEMS = [
  {
    icon: BarChart2,
    title: "Performance Dashboard",
    description: "Startup time, memory usage, token cost & tool latency metrics.",
    status: "coming-soon",
  },
  {
    icon: AlertTriangle,
    title: "AI Diagnostics",
    description: "AI-assisted error explanations, cross-file error tracing and call-chain visualisations.",
    status: "coming-soon",
  },
  {
    icon: FileCode,
    title: "Code Review",
    description: "Diff viewer, complexity scores and pattern analysis across the codebase.",
    status: "coming-soon",
  },
  {
    icon: Clock,
    title: "Agent Timeline",
    description: "Chronological view of past AI actions, modified files and token checkpoints.",
    status: "coming-soon",
  },
];

export function InspectPanel() {
  return (
    <div className="inspect-panel" style={panelContainerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={iconWrapStyle("rgba(79,130,236,0.15)", "#4f82ec")}>
          <ScanSearch size={22} color="#4f82ec" strokeWidth={1.8} />
        </div>
        <div>
          <h1 style={headingStyle}>Inspect</h1>
          <p style={subHeadingStyle}>Analysis &amp; Code Review</p>
        </div>
      </div>

      {/* Cards */}
      <div style={gridStyle}>
        {PLACEHOLDER_ITEMS.map(({ icon: Icon, title, description, status }) => (
          <div key={title} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Icon size={16} color="#4f82ec" strokeWidth={1.8} />
              <span style={cardTitleStyle}>{title}</span>
              {status === "coming-soon" && (
                <span style={badgeStyle}>Soon</span>
              )}
            </div>
            <p style={cardDescStyle}>{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline styles ─────────────────────────────────────────────────────────

const panelContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  padding: "32px",
  height: "100%",
  overflowY: "auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

function iconWrapStyle(bg: string, _color: string): React.CSSProperties {
  return {
    width: 46,
    height: 46,
    borderRadius: 12,
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid rgba(79,130,236,0.2)",
  };
}

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.3rem",
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const subHeadingStyle: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: "0.8rem",
  color: "var(--muted-foreground)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "16px",
};

const cardStyle: React.CSSProperties = {
  padding: "18px 20px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  backdropFilter: "blur(8px)",
  transition: "background 200ms ease, border-color 200ms ease",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  flex: 1,
};

const badgeStyle: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: "20px",
  background: "rgba(79,130,236,0.15)",
  color: "#4f82ec",
  border: "1px solid rgba(79,130,236,0.25)",
  letterSpacing: "0.02em",
};

const cardDescStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--muted-foreground)",
  lineHeight: 1.5,
  margin: 0,
};
