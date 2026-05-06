import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import AgentsPage from "../pages/agents";

export const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/agents",
  component: AgentsPage,
});
