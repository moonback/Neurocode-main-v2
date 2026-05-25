import React, { useMemo, useState, useEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import { automateViewAtom, selectedAgentIdAtom } from "@/atoms/automateAtoms";
import { ArrowLeft, Bot, Activity, Cpu, Play, Square, Terminal } from "lucide-react";
import "./AgentConsoleDashboard.css";

// ─── Mock Data ─────────────────────────────────────────────────────────────

type AgentStatus = "running" | "idle" | "error";

interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  cpu: string;
  memory: string;
}

interface LogEntry {
  id: number;
  time: string;
  msg: string;
  type: "info" | "success" | "error" | "warn" | "default";
}

const MOCK_AGENTS: Agent[] = [
  { id: "a1", name: "Code Refactor Agent", status: "running", cpu: "12%", memory: "1.2GB" },
  { id: "a2", name: "Security Scanner", status: "idle", cpu: "0%", memory: "40MB" },
  { id: "a3", name: "Dependency Updater", status: "error", cpu: "0%", memory: "0MB" },
];

const INITIAL_LOGS: Record<string, LogEntry[]> = {
  a1: [
    { id: 1, time: "10:00:01", msg: "Agent initialized and ready.", type: "info" },
    { id: 2, time: "10:00:05", msg: "Scanning src/ directory for refactor opportunities...", type: "default" },
    { id: 3, time: "10:00:15", msg: "Found 43 files. Analyzing AST structures.", type: "default" },
    { id: 4, time: "10:01:20", msg: "Successfully refactored src/api/authController.ts", type: "success" },
  ],
  a2: [
    { id: 1, time: "09:30:00", msg: "Security Scanner started.", type: "info" },
    { id: 2, time: "09:35:00", msg: "No critical vulnerabilities found.", type: "success" },
    { id: 3, time: "09:35:01", msg: "Agent sleeping until next schedule.", type: "info" },
  ],
  a3: [
    { id: 1, time: "08:15:00", msg: "Starting npm audit...", type: "default" },
    { id: 2, time: "08:15:10", msg: "Failed to reach registry.npmjs.org", type: "error" },
    { id: 3, time: "08:15:11", msg: "Agent terminated due to unhandled exception.", type: "error" },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────────

export function AgentConsoleDashboard() {
  const setAutomateView = useSetAtom(automateViewAtom);
  const [selectedAgentId, setSelectedAgentId] = useAtom(selectedAgentIdAtom);

  const [logs, setLogs] = useState<Record<string, LogEntry[]>>(INITIAL_LOGS);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const selectedAgent = useMemo(
    () => MOCK_AGENTS.find((a) => a.id === selectedAgentId),
    [selectedAgentId]
  );

  const currentLogs = useMemo(() => {
    return selectedAgentId ? logs[selectedAgentId] || [] : [];
  }, [logs, selectedAgentId]);

  // Simulate incoming logs if "Code Refactor Agent" is selected and "running"
  useEffect(() => {
    if (selectedAgent?.id === "a1" && selectedAgent.status === "running") {
      const interval = setInterval(() => {
        setLogs((prev) => {
          const newId = prev.a1.length + 1;
          const now = new Date();
          const time = now.toTimeString().split(" ")[0];
          const newEntry: LogEntry = {
            id: newId,
            time,
            msg: `Analyzing dependency graph for cyclic imports... [Batch ${newId}]`,
            type: "default",
          };
          return { ...prev, a1: [...prev.a1, newEntry] };
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedAgent]);

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentLogs]);

  return (
    <div className="agent-dashboard">
      {/* Sidebar: Agent Roster */}
      <div className="agent-sidebar">
        <div className="agent-sidebar-header">
          <button
            className="agent-back-btn"
            onClick={() => setAutomateView("dashboard")}
            title="Back to Automate Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="agent-title">AI Agents</h2>
        </div>
        
        <div className="agent-list">
          {MOCK_AGENTS.map((agent) => {
            const isActive = selectedAgentId === agent.id;
            return (
              <div
                key={agent.id}
                className={`agent-item ${isActive ? "active" : ""}`}
                onClick={() => setSelectedAgentId(agent.id)}
              >
                <div className="agent-header">
                  <div className="agent-name-wrap" title={agent.name}>
                    <Bot size={14} />
                    <span className="agent-name">{agent.name}</span>
                  </div>
                  <span className={`agent-badge ${agent.status}`}>
                    {agent.status}
                  </span>
                </div>
                <div className="agent-metrics">
                  <span className="agent-metric" title="CPU Usage">
                    <Cpu size={12} />
                    <span>{agent.cpu}</span>
                  </span>
                  <span className="agent-metric" title="Memory Usage">
                    <Activity size={12} />
                    <span>{agent.memory}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Console Area */}
      <div className="agent-main">
        {selectedAgent ? (
          <>
            <div className="agent-console-header">
              <div className="agent-console-title">
                <Terminal size={16} />
                <span>{selectedAgent.name} Terminal</span>
              </div>
              <div className="agent-controls">
                {selectedAgent.status === "running" ? (
                  <button className="agent-btn agent-btn-stop">
                    <Square size={12} fill="currentColor" /> Stop
                  </button>
                ) : (
                  <button className="agent-btn agent-btn-start">
                    <Play size={12} fill="currentColor" /> Start
                  </button>
                )}
              </div>
            </div>
            
            <div className="agent-terminal">
              {currentLogs.map((log) => (
                <div key={log.id} className="term-line">
                  <span className="term-time">[{log.time}]</span>
                  <span className={`term-msg ${log.type}`}>{log.msg}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </>
        ) : (
          <div className="agent-empty-state">
            <Bot size={48} strokeWidth={1} />
            <p>Select an agent from the roster to view its console.</p>
          </div>
        )}
      </div>
    </div>
  );
}
