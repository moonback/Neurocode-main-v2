import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import LibraryHomePage from "@/pages/library-home";

export const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryHomePage,
});
