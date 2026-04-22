import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { SkillHelp } from "../SkillHelp";

describe("SkillHelp", () => {
  it("renders help button by default", () => {
    render(<SkillHelp />);
    const button = screen.getByTestId("skill-help-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Skill format help");
  });

  it("renders custom trigger when provided", () => {
    render(
      <SkillHelp
        trigger={<button data-testid="custom-trigger">Help</button>}
      />,
    );
    expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("skill-help-button")).not.toBeInTheDocument();
  });

  it("opens dialog when help button is clicked", async () => {
    const user = userEvent.setup();
    render(<SkillHelp />);

    const button = screen.getByTestId("skill-help-button");
    await user.click(button);

    // Dialog should be visible
    expect(screen.getByText("Skill Format & Usage")).toBeInTheDocument();
    expect(
      screen.getByText("Learn how to create and use skills in NeuroCode"),
    ).toBeInTheDocument();
  });

  it("displays all help sections", async () => {
    const user = userEvent.setup();
    render(<SkillHelp />);

    await user.click(screen.getByTestId("skill-help-button"));

    // Check for main sections
    expect(screen.getByText("What is a Skill?")).toBeInTheDocument();
    expect(screen.getByText("SKILL.md File Format")).toBeInTheDocument();
    expect(screen.getByText("Frontmatter Fields")).toBeInTheDocument();
    expect(screen.getByText("Naming Conventions")).toBeInTheDocument();
    expect(screen.getByText("How to Use Skills")).toBeInTheDocument();
    expect(screen.getByText("Skill Locations")).toBeInTheDocument();
    expect(screen.getByText("Tips")).toBeInTheDocument();
  });

  it("displays example SKILL.md format", async () => {
    const user = userEvent.setup();
    render(<SkillHelp />);

    await user.click(screen.getByTestId("skill-help-button"));

    const helpContent = screen.getByTestId("skill-help-content");
    expect(helpContent).toHaveTextContent("name: lint");
    expect(helpContent).toHaveTextContent(
      "description: Run pre-commit checks including formatting and linting",
    );
    expect(helpContent).toHaveTextContent("# Lint");
  });

  it("displays frontmatter field documentation", async () => {
    const user = userEvent.setup();
    render(<SkillHelp />);

    await user.click(screen.getByTestId("skill-help-button"));

    // Check for name field documentation
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(
      screen.getByText(/The skill identifier used in slash commands/),
    ).toBeInTheDocument();

    // Check for description field documentation
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(
      screen.getByText(/A brief explanation of when to use the skill/),
    ).toBeInTheDocument();
  });

  it("displays naming convention examples", async () => {
    const user = userEvent.setup();
    render(<SkillHelp />);

    await user.click(screen.getByTestId("skill-help-button"));

    expect(screen.getByText("Simple Skills")).toBeInTheDocument();
    expect(screen.getByText("Grouped Skills")).toBeInTheDocument();
    expect(screen.getByText(/namespace:skill-name/)).toBeInTheDocument();
  });

  it("displays skill invocation methods", async () => {
    const user = userEvent.setup();
    render(<SkillHelp />);

    await user.click(screen.getByTestId("skill-help-button"));

    expect(screen.getByText("Slash Commands")).toBeInTheDocument();
    expect(screen.getByText("Automatic Loading")).toBeInTheDocument();
    expect(screen.getByText(/\/skill-name/)).toBeInTheDocument();
  });

  it("displays skill location information", async () => {
    const user = userEvent.setup();
    render(<SkillHelp />);

    await user.click(screen.getByTestId("skill-help-button"));

    expect(screen.getByText("~/.neurocode/skills/")).toBeInTheDocument();
    expect(screen.getByText(".neurocode/skills/")).toBeInTheDocument();
    expect(
      screen.getByText(/Personal skills available only to you/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Team skills shared via version control/),
    ).toBeInTheDocument();
  });

  it("displays helpful tips", async () => {
    const user = userEvent.setup();
    render(<SkillHelp />);

    await user.click(screen.getByTestId("skill-help-button"));

    expect(
      screen.getByText(/Write clear, specific instructions/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Use descriptive names that reflect what the skill does/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Add a good description to enable automatic skill suggestions/,
      ),
    ).toBeInTheDocument();
  });
});
