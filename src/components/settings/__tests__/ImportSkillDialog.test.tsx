import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImportSkillDialog } from "../ImportSkillDialog";
import { ipc } from "@/ipc/types";

// Mock IPC
vi.mock("@/ipc/types", () => ({
  ipc: {
    skills: {
      validate: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock toast
vi.mock("@/lib/toast", () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

describe("ImportSkillDialog", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should not render when closed", () => {
    render(
      <ImportSkillDialog
        isOpen={false}
        onClose={vi.fn()}
        onSkillImported={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.queryByText("Importer un skill")).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    render(
      <ImportSkillDialog
        isOpen={true}
        onClose={vi.fn()}
        onSkillImported={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText("Importer un skill")).toBeInTheDocument();
    expect(screen.getByText("Parcourir")).toBeInTheDocument();
  });

  it("should validate file on selection", async () => {
    const user = userEvent.setup();
    const mockValidate = vi.mocked(ipc.skills.validate);
    mockValidate.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    render(
      <ImportSkillDialog
        isOpen={true}
        onClose={vi.fn()}
        onSkillImported={vi.fn()}
      />,
      { wrapper },
    );

    const fileContent = `---
name: test-skill
description: Test skill description
---

# Test Skill Content`;

    const file = new File([fileContent], "test-skill.md", {
      type: "text/markdown",
    });

    const input = screen
      .getByRole("button", {
        name: /parcourir/i,
      })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalledWith(fileContent);
    });

    expect(screen.getByText("Skill valide")).toBeInTheDocument();
    expect(screen.getByText("/test-skill")).toBeInTheDocument();
  });

  it("should show validation error for invalid file", async () => {
    const user = userEvent.setup();
    const mockValidate = vi.mocked(ipc.skills.validate);
    mockValidate.mockResolvedValue({
      valid: false,
      errors: [{ code: "INVALID_FORMAT", message: "Invalid format" }],
      warnings: [],
    });

    render(
      <ImportSkillDialog
        isOpen={true}
        onClose={vi.fn()}
        onSkillImported={vi.fn()}
      />,
      { wrapper },
    );

    const fileContent = `Invalid content`;

    const file = new File([fileContent], "invalid.md", {
      type: "text/markdown",
    });

    const input = screen
      .getByRole("button", {
        name: /parcourir/i,
      })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Erreur de validation")).toBeInTheDocument();
    });
  });

  it("should import skill successfully", async () => {
    const user = userEvent.setup();
    const mockValidate = vi.mocked(ipc.skills.validate);
    const mockCreate = vi.mocked(ipc.skills.create);
    const onSkillImported = vi.fn();

    mockValidate.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    mockCreate.mockResolvedValue({
      name: "test-skill",
      description: "Test skill description",
      content: "# Test Skill Content",
      scope: "user",
      path: "/path/to/skill",
    });

    render(
      <ImportSkillDialog
        isOpen={true}
        onClose={vi.fn()}
        onSkillImported={onSkillImported}
      />,
      { wrapper },
    );

    const fileContent = `---
name: test-skill
description: Test skill description
---

# Test Skill Content`;

    const file = new File([fileContent], "test-skill.md", {
      type: "text/markdown",
    });

    const input = screen
      .getByRole("button", {
        name: /parcourir/i,
      })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Skill valide")).toBeInTheDocument();
    });

    const importButton = screen.getByRole("button", {
      name: /importer le skill/i,
    });
    await user.click(importButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        name: "test-skill",
        description: "Test skill description",
        content: "# Test Skill Content",
        scope: "user",
      });
      expect(onSkillImported).toHaveBeenCalled();
    });
  });

  it("should allow selecting workspace scope", async () => {
    const user = userEvent.setup();
    const mockValidate = vi.mocked(ipc.skills.validate);
    const mockCreate = vi.mocked(ipc.skills.create);

    mockValidate.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    mockCreate.mockResolvedValue({
      name: "test-skill",
      description: "Test skill description",
      content: "# Test Skill Content",
      scope: "workspace",
      path: "/path/to/skill",
    });

    render(
      <ImportSkillDialog
        isOpen={true}
        onClose={vi.fn()}
        onSkillImported={vi.fn()}
      />,
      { wrapper },
    );

    const fileContent = `---
name: test-skill
description: Test skill description
---

# Test Skill Content`;

    const file = new File([fileContent], "test-skill.md", {
      type: "text/markdown",
    });

    const input = screen
      .getByRole("button", {
        name: /parcourir/i,
      })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Skill valide")).toBeInTheDocument();
    });

    // Select workspace scope
    const workspaceRadio = screen.getByLabelText(
      /workspace \(partagé avec l'équipe\)/i,
    );
    await user.click(workspaceRadio);

    const importButton = screen.getByRole("button", {
      name: /importer le skill/i,
    });
    await user.click(importButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        name: "test-skill",
        description: "Test skill description",
        content: "# Test Skill Content",
        scope: "workspace",
      });
    });
  });
});
