import React, { useMemo } from "react";
import { useAtom, useSetAtom } from "jotai";
import { inspectViewAtom, selectedReviewFileIdAtom } from "@/atoms/inspectAtoms";
import { DiffEditor } from "@monaco-editor/react";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, FileCode, AlertCircle, Activity } from "lucide-react";
import "./CodeReviewDashboard.css";

// ─── Mock Data ─────────────────────────────────────────────────────────────

type FileStatus = "modified" | "added" | "deleted";

interface CodeReviewItem {
  id: string;
  name: string;
  path: string;
  status: FileStatus;
  complexityScore: string;
  issues: number;
  original: string;
  modified: string;
}

const MOCK_FILES: CodeReviewItem[] = [
  {
    id: "f1",
    name: "authController.ts",
    path: "src/api/authController.ts",
    status: "modified",
    complexityScore: "C+",
    issues: 2,
    original: `export async function login(req, res) {
  const user = await db.findUser(req.body.email);
  if (user.password === req.body.password) {
    res.send("success");
  } else {
    res.status(401).send("fail");
  }
}`,
    modified: `import { compare } from "bcrypt";
import { signToken } from "../utils/jwt";

export async function login(req, res) {
  const user = await db.findUser(req.body.email);
  if (!user) return res.status(401).send("Invalid credentials");
  
  const isValid = await compare(req.body.password, user.passwordHash);
  if (isValid) {
    const token = signToken({ id: user.id });
    res.json({ token });
  } else {
    res.status(401).send("Invalid credentials");
  }
}`,
  },
  {
    id: "f2",
    name: "layout.tsx",
    path: "src/app/layout.tsx",
    status: "added",
    complexityScore: "A",
    issues: 0,
    original: ``,
    modified: `export function Layout({ children }) {
  return <div className="layout">{children}</div>;
}`,
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function CodeReviewDashboard() {
  const setInspectView = useSetAtom(inspectViewAtom);
  const [selectedFileId, setSelectedFileId] = useAtom(selectedReviewFileIdAtom);
  const { theme } = useTheme();

  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const editorTheme = isDarkMode ? "vs-dark" : "light";

  const selectedFile = useMemo(
    () => MOCK_FILES.find((f) => f.id === selectedFileId),
    [selectedFileId]
  );

  return (
    <div className="cr-dashboard">
      {/* Sidebar: File List */}
      <div className="cr-sidebar">
        <div className="cr-sidebar-header">
          <button
            className="cr-back-btn"
            onClick={() => setInspectView("dashboard")}
            title="Back to Inspect Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="cr-title">Pending Reviews</h2>
        </div>
        
        <div className="cr-file-list">
          {MOCK_FILES.map((file) => {
            const isActive = selectedFileId === file.id;
            return (
              <div
                key={file.id}
                className={`cr-file-item ${isActive ? "active" : ""}`}
                onClick={() => setSelectedFileId(file.id)}
              >
                <div className="cr-file-header">
                  <span className="cr-file-name" title={file.path}>
                    {file.name}
                  </span>
                  <span className={`cr-badge ${file.status}`}>
                    {file.status}
                  </span>
                </div>
                <div className="cr-file-metrics">
                  <span className="cr-metric" title="Complexity Score">
                    <Activity size={12} />
                    <span className="cr-metric-score">{file.complexityScore}</span>
                  </span>
                  {file.issues > 0 && (
                    <span className="cr-metric text-amber-500" title={`${file.issues} AI Issues Detected`}>
                      <AlertCircle size={12} />
                      {file.issues}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Diff Area */}
      <div className="cr-main">
        {selectedFile ? (
          <>
            <div className="cr-diff-header">
              <FileCode size={16} />
              <span>{selectedFile.path}</span>
            </div>
            <div className="cr-diff-wrapper">
              <DiffEditor
                original={selectedFile.original}
                modified={selectedFile.modified}
                language="typescript"
                theme={editorTheme}
                options={{
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  readOnly: true,
                  fontFamily: "monospace",
                  fontSize: 13,
                }}
              />
            </div>
          </>
        ) : (
          <div className="cr-empty-state">
            <FileCode size={48} strokeWidth={1} />
            <p>Select a file from the sidebar to review diffs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
