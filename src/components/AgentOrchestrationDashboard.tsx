import { useEffect, useState } from "react";
import { multiAgentEventClient } from "@/ipc/types/multi_agent";
import { Bot, CheckCircle2, Circle, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface Task {
  id: string;
  agentId: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  error?: string;
}

export function AgentOrchestrationDashboard() {
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsubStarted = multiAgentEventClient.onAgentTaskStarted((event: any) => {
      setTasks((prev) => ({
        ...prev,
        [event.taskId]: {
          id: event.taskId,
          agentId: event.agentId,
          status: "running",
        },
      }));
      setLogs((prev) => [...prev, { type: "task", message: `Task ${event.taskId} started by agent ${event.agentId}`, timestamp: new Date() }]);
    });

    const unsubCompleted = multiAgentEventClient.onAgentTaskCompleted((event: any) => {
      setTasks((prev) => ({
        ...prev,
        [event.taskId]: {
          ...prev[event.taskId],
          status: "completed",
          output: event.output,
        },
      }));
      setLogs((prev) => [...prev, { type: "success", message: `Task ${event.taskId} completed`, timestamp: new Date() }]);
    });

    const unsubFailed = multiAgentEventClient.onAgentTaskFailed((event: any) => {
      setTasks((prev) => ({
        ...prev,
        [event.taskId]: {
          ...prev[event.taskId],
          status: "failed",
          error: event.error,
        },
      }));
      setLogs((prev) => [...prev, { type: "error", message: `Task ${event.taskId} failed: ${event.error}`, timestamp: new Date() }]);
    });

    const unsubComm = multiAgentEventClient.onAgentCommunication((event: any) => {
      setLogs((prev) => [...prev, { 
        type: "comm", 
        message: `${event.senderId} -> ${event.receiverId}: ${event.content}`, 
        timestamp: new Date(),
        details: event
      }]);
    });

    return () => {
      unsubStarted();
      unsubCompleted();
      unsubFailed();
      unsubComm();
    };
  }, []);

  const taskList = Object.values(tasks);
  const completedCount = taskList.filter((t) => t.status === "completed").length;
  const totalCount = taskList.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
      <Card className="border-border/50 bg-card/30 backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Active Tasks
          </CardTitle>
          <div className="mt-2 h-1 w-full bg-muted overflow-hidden rounded-full">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {taskList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic">
                  No active orchestration
                </div>
              ) : (
                taskList.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
                    <TaskStatusIcon status={task.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-xs font-bold truncate">{task.id}</span>
                        <Badge variant="outline" className="text-[10px]">{task.agentId}</Badge>
                      </div>
                      {task.status === "failed" && (
                        <p className="text-xs text-destructive mt-1 bg-destructive/5 p-2 rounded border border-destructive/10">
                          {task.error}
                        </p>
                      )}
                      {task.status === "completed" && task.output && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                          {task.output}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/30 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Agent Logs & Communication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic">
                  Waiting for events...
                </div>
              ) : (
                logs.slice().reverse().map((log, i) => (
                  <div key={i} className="text-xs border-b border-border/30 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-muted-foreground text-[10px]">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <LogBadge type={log.type} />
                    </div>
                    <p className="font-mono">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskStatusIcon({ status }: { status: Task["status"] }) {
  switch (status) {
    case "running": return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
    case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed": return <AlertCircle className="h-4 w-4 text-destructive" />;
    default: return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function LogBadge({ type }: { type: string }) {
  switch (type) {
    case "success": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] h-4">SUCCESS</Badge>;
    case "error": return <Badge variant="destructive" className="text-[10px] h-4">ERROR</Badge>;
    case "comm": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] h-4">COMM</Badge>;
    default: return <Badge variant="outline" className="text-[10px] h-4">INFO</Badge>;
  }
}
