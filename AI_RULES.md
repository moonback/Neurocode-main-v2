# AI Rules for this React/TypeScript App

## Tech Stack (Bullet Points)
- **React 18** with functional components and hooks
- **TypeScript** for static typing (strict mode enabled)
- **React Router v6** for client-side routing (routes defined in `src/App.tsx`)
- **shadcn/ui** component library (built on Radix UI and Tailwind CSS) for all UI primitives
- **Tailwind CSS** for utility‑first styling (no custom CSS files unless absolutely necessary)
- **lucide-react** for icons (import individual icons as needed)
- **ESLint & Prettier** configured for code quality (via default tooling)
- **Vite** as the build tool and dev server
- **npm** as package manager

## Library Usage Rules
1. **UI Components**  
   - Use shadcn/ui components (`src/components/ui/*`) as the base for buttons, inputs, modals, tables, etc.  
   - Do **not** modify the shipped shadcn/ui files directly; if you need a customized version, create a new component that wraps or extends the shadcn/ui component.

2. **Styling**  
   - Apply styles exclusively with Tailwind utility classes.  
   - Avoid writing custom CSS or SCSS files; if unavoidable, place them in `src/styles/` and import them globally only once.

3. **Icons**  
   - Import icons from `lucide-react` (e.g., `import { LucideIcon } from 'lucide-react'`).  
   - Do not use external icon libraries or SVG sprites unless approved.

4. **Routing**  
   - Define all routes in `src/App.tsx` using `createBrowserRouter` and `RouterProvider`.  
   - Keep route definitions centralized; do not scatter `<Route>` components across multiple files.

5. **State Management**  
   - Prefer React's built‑in hooks (`useState`, `useEffect`, `useContext`) for local and shared state.  
   - If global state becomes complex, consider adding a lightweight library like **zustand** or **jotai** (but only after team consensus).

6. **Data Fetching**  
   - Use `fetch` or `axios` (if added) inside React Query or SWR for caching, background updates, and request deduplication.  
   - Do not perform raw data fetching in render‑critical paths without proper loading/error handling.

7. **Code Organization**  
   - Pages → `src/pages/` (each page is a React component).  
   - Reusable UI → `src/components/` (non‑UI logic can go in `src/lib/` or `src/utils/`).  
   - Custom hooks → `src/hooks/`.  
   - Types/interfaces → `src/types/` or colocated with the component if small.

8. **TypeScript**  
   - Enable `strict: true` in `tsconfig.json`.  
   - Avoid `any`; use explicit types or generics.  
   - When extending shadcn/ui components, forward the appropriate `ComponentPropsWithoutRef` or similar.

9. **Linting & Formatting**  
   - Run `npm run lint` (ESLint) and `npm run format` (Prettier) before committing.  
   - Resolve all lint errors; warnings should be addressed unless explicitly justified.

10. **Testing** *(if added later)*  
    - Use Vitest + React Testing Library for unit tests.  
    - Place test files alongside the source (`*.test.tsx`).  
    - Aim for 80%+ coverage on critical business logic.

These rules ensure consistency, maintainability, and leverage the strengths of the chosen stack.