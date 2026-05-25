import { Bot, Clock, Zap, Server, Cpu } from "lucide-react";
import { useAtom } from "jotai";
import { automateViewAtom } from "@/atoms/automateAtoms";
import { AgentConsoleDashboard } from "./automate/AgentConsoleDashboard";

const AUTOMATE_FEATURES = [
  { icon: Bot, title: "AI Agents", desc: "Run autonomous agents to generate code, refactor, or analyze projects.", action: "agents", status: "active" },
  { icon: Zap, title: "Task Scheduler", desc: "Schedule recurring tasks, background jobs, and timers.", action: "scheduler", status: "coming-soon" },
  { icon: Clock, title: "Workflow Recorder", desc: "Record and replay sequences of actions across sessions.", action: "recorder", status: "coming-soon" },
  { icon: Server, title: "Service Orchestration", desc: "Spin up local services, mock APIs, and container workflows.", action: "orchestration", status: "coming-soon" },
  { icon: Cpu, title: "Resource Monitor", desc: "CPU/Memory usage visualization for agents.", action: "monitor", status: "coming-soon" },
];

export function AutomatePanel() {
  const [automateView, setAutomateView] = useAtom(automateViewAtom);

  if (automateView === "agents") {
    return <AgentConsoleDashboard />;
  }

  return (
    <div className="automate-panel" style={containerStyle}>
      <header style={headerStyle}>
        <Bot size={22} color="#4f82ec" strokeWidth={1.8} />
        <div>
          <h1 style={titleStyle}>Automate</h1>
          <p style={subtitleStyle}>Autonomous Agents &amp; Workflows</p>
        </div>
      </header>
      <div style={gridStyle}>
        {AUTOMATE_FEATURES.map(({ icon: Icon, title, desc, action, status }) => (
          <div
            key={title}
            style={{
              ...cardStyle,
              cursor: status === "active" ? "pointer" : "default",
            }}
            onClick={() => {
              if (status === "active" && action === "agents") {
                setAutomateView("agents");
              }
            }}
          >
            <div style={cardHeaderStyle}>
              <Icon size={16} color="#4f82ec" strokeWidth={1.8} />
              <h3 style={cardTitle}>{title}</h3>
              {status === "coming-soon" && (
                <span style={badgeStyle}>Soon</span>
              )}
            </div>
            <p style={cardDesc}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: "20px",
  background: "rgba(79,130,236,0.15)",
  color: "#4f82ec",
  border: "1px solid rgba(79,130,236,0.25)",
  letterSpacing: "0.02em",
  marginLeft: "auto",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

// ----- Inline styles -----
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  padding: "32px",
  overflowY: "auto",
  height: "100%",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.3rem",
  fontWeight: 700,
};

const subtitleStyle: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: "0.85rem",
  color: "var(--muted-foreground)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "16px",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  backdropFilter: "blur(8px)",
};

const cardTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "#fff",
};

const cardDesc: React.CSSProperties = {
  margin: 0,
  fontSize: "0.78rem",
  color: "var(--muted-foreground)",
};
