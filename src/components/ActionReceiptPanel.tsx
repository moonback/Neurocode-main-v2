// ActionReceiptPanel.tsx
// This component displays a receipt of the last action performed by the user.
// It is placed in the chat sidebar to provide immediate feedback.

import React from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

// ActionReceiptPanel prop types
export type ActionReceiptProps = {
  /** Title summarizing the action */
  title: string;
  /** Detailed message or description */
  message: string;
  /** "success" | "error" */
  status: "success" | "error";
    /** Optional callback when the user dismisses the receipt */
  onClose?: () => void;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional callback for the action button */
  onAction?: () => void;
};

export const ActionReceiptPanel: React.FC<ActionReceiptProps> = ({
  title,
  message,
  status,
  onClose,
  actionLabel,
  onAction,
}) => {
  const { isDarkMode } = useTheme();
  const isDark = isDarkMode;

  const bgColor = isDark
    ? "rgba(30, 30, 30, 0.85)"
    : "rgba(255, 255, 255, 0.85)";
  const borderColor = isDark ? "#444" : "#e0e0e0";
  const accentColor = status === "success" ? "#34d399" : "#f87171"; // emerald / rose

  return (
    <Card
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor})`,
        border: `1px solid ${borderColor}`,
        backdropFilter: "blur(12px)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        width: "100%",
        maxWidth: "320px",
        margin: "0 auto",
      }}
    >
      <CardHeader
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "row",
          gap: "0.5rem",
          color: accentColor,
        }}
      >
        {status === "success" ? (
          <CheckCircle width={20} height={20} />
        ) : (
          <XCircle width={20} height={20} />
        )}
        <h6 style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>
          {title}
        </h6>
      </CardHeader>
      <CardContent style={{ color: isDark ? "#ddd" : "#333" }}>
        <p style={{ margin: 0, fontSize: "0.875rem" }}>{message}</p>
      </CardContent>
      {(onClose || onAction) && (
        <CardFooter style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          {onAction && actionLabel && (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {onClose && (
            <Button className="border border-gray-300 bg-white hover:bg-gray-100" onClick={onClose}>
              Close
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default ActionReceiptPanel;

