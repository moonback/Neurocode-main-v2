import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { AgentManagementPage } from "@/components/AgentManagementPage";

export const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/agents",
  component: AgentManagementPage,
});
