/**
 * E2E tests for the NeuroCode Skills feature.
 *
 * Tests cover:
 * - Skill creation flow
 * - Skill invocation via slash command
 * - Skill management (list, edit, delete)
 * - Automatic skill loading suggestions
 * - Grouped skills
 */

import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Skills", () => {
  test.describe("Skill Creation", () => {
    test("creates a new user-level skill", async ({ po }) => {
      await po.setUp();

      // Navigate to skills management (assuming there's a UI for this)
      // For now, we'll use IPC directly to create a skill
      const skillName = "test-skill";
      const skillDescription = "A test skill for E2E testing";
      const skillContent = "# Test Skill\n\nThis is a test skill.";

      // Create skill via IPC
      const result = await po.page.evaluate(
        async ({ name, description, content }) => {
          return await (window as any).electron.ipcRenderer.invoke(
            "skills:create",
            {
              name,
              description,
              content,
              scope: "user",
            },
          );
        },
        {
          name: skillName,
          description: skillDescription,
          content: skillContent,
        },
      );

      // Verify skill was created
      expect(result.name).toBe(skillName);
      expect(result.description).toBe(skillDescription);
      expect(result.content).toBe(skillContent);
      expect(result.scope).toBe("user");
      expect(result.path).toContain(skillName);

      // Verify skill file exists on disk
      const skillPath = result.path;
      expect(fs.existsSync(skillPath)).toBe(true);

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });

    test("creates a new workspace-level skill", async ({ po }) => {
      await po.setUp();
      await po.importApp(
        path.join(__dirname, "fixtures", "import-app", "minimal"),
      );

      const skillName = "workspace-skill";
      const skillDescription = "A workspace-level test skill";
      const skillContent = "# Workspace Skill\n\nThis is a workspace skill.";

      // Create workspace-level skill
      const result = await po.page.evaluate(
        async ({ name, description, content }) => {
          return await (window as any).electron.ipcRenderer.invoke(
            "skills:create",
            {
              name,
              description,
              content,
              scope: "workspace",
            },
          );
        },
        {
          name: skillName,
          description: skillDescription,
          content: skillContent,
        },
      );

      // Verify skill was created with workspace scope
      expect(result.scope).toBe("workspace");
      expect(result.path).toContain(".neurocode");
      expect(result.path).toContain("skills");

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });

    test("validates skill name format", async ({ po }) => {
      await po.setUp();

      // Try to create a skill with invalid name (uppercase)
      const invalidName = "InvalidSkillName";

      const result = await po.page.evaluate(async (name) => {
        try {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description: "Test",
            content: "# Test",
            scope: "user",
          });
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }, invalidName);

      // Verify validation error
      expect(result.success).toBe(false);
      expect(result.error).toContain("name");
    });
  });

  test.describe("Skill Discovery and Listing", () => {
    test("discovers and lists all registered skills", async ({ po }) => {
      await po.setUp();

      // Create multiple test skills
      const skills = [
        {
          name: "skill-one",
          description: "First skill",
          content: "# Skill One",
        },
        {
          name: "skill-two",
          description: "Second skill",
          content: "# Skill Two",
        },
        {
          name: "skill-three",
          description: "Third skill",
          content: "# Skill Three",
        },
      ];

      for (const skill of skills) {
        await po.page.evaluate(async ({ name, description, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description,
            content,
            scope: "user",
          });
        }, skill);
      }

      // Trigger discovery
      await po.page.evaluate(async () => {
        await (window as any).electron.ipcRenderer.invoke("skills:discover");
      });

      // List all skills
      const allSkills = await po.page.evaluate(async () => {
        return await (window as any).electron.ipcRenderer.invoke("skills:list");
      });

      // Verify all created skills are in the list
      const skillNames = allSkills.map((s: any) => s.name);
      for (const skill of skills) {
        expect(skillNames).toContain(skill.name);
      }

      // Clean up
      for (const skill of skills) {
        await po.page.evaluate(async (name) => {
          await (window as any).electron.ipcRenderer.invoke(
            "skills:delete",
            name,
          );
        }, skill.name);
      }
    });

    test("filters skills by scope", async ({ po }) => {
      await po.setUp();
      await po.importApp(
        path.join(__dirname, "fixtures", "import-app", "minimal"),
      );

      // Create user and workspace skills
      await po.page.evaluate(async () => {
        await (window as any).electron.ipcRenderer.invoke("skills:create", {
          name: "user-skill",
          description: "User skill",
          content: "# User",
          scope: "user",
        });
        await (window as any).electron.ipcRenderer.invoke("skills:create", {
          name: "workspace-skill",
          description: "Workspace skill",
          content: "# Workspace",
          scope: "workspace",
        });
      });

      // Filter by user scope
      const userSkills = await po.page.evaluate(async () => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:list",
          {
            scope: "user",
          },
        );
      });

      expect(userSkills.some((s: any) => s.name === "user-skill")).toBe(true);
      expect(userSkills.some((s: any) => s.name === "workspace-skill")).toBe(
        false,
      );

      // Filter by workspace scope
      const workspaceSkills = await po.page.evaluate(async () => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:list",
          {
            scope: "workspace",
          },
        );
      });

      expect(
        workspaceSkills.some((s: any) => s.name === "workspace-skill"),
      ).toBe(true);
      expect(workspaceSkills.some((s: any) => s.name === "user-skill")).toBe(
        false,
      );

      // Clean up
      await po.page.evaluate(async () => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          "user-skill",
        );
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          "workspace-skill",
        );
      });
    });
  });

  test.describe("Skill Invocation", () => {
    test("invokes a skill via slash command", async ({ po }) => {
      await po.setUp();

      // Create a test skill
      const skillName = "test-invoke";
      const skillContent = "# Test Invoke\n\nPlease create a simple function.";

      await po.page.evaluate(
        async ({ name, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description: "Test invocation",
            content,
            scope: "user",
          });
        },
        { name: skillName, content: skillContent },
      );

      // Type slash command in chat input
      const chatInput = po.chatActions.getChatInput();
      await chatInput.fill(`/${skillName}`);

      // Execute the skill
      const result = await po.page.evaluate(async (name) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:execute",
          {
            name,
          },
        );
      }, skillName);

      // Verify skill content is returned
      expect(result.content).toBe(skillContent);
      expect(result.skill.name).toBe(skillName);

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });

    test("handles unknown skill invocation", async ({ po }) => {
      await po.setUp();

      const unknownSkillName = "nonexistent-skill";

      // Try to execute unknown skill
      const result = await po.page.evaluate(async (name) => {
        try {
          await (window as any).electron.ipcRenderer.invoke("skills:execute", {
            name,
          });
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }, unknownSkillName);

      // Verify error is returned
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test("invokes skill with arguments", async ({ po }) => {
      await po.setUp();

      // Create a skill that uses arguments
      const skillName = "skill-with-args";
      const skillContent = "# Skill With Args\n\nArguments: $ARGUMENTS";

      await po.page.evaluate(
        async ({ name, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description: "Skill with arguments",
            content,
            scope: "user",
          });
        },
        { name: skillName, content: skillContent },
      );

      // Execute skill with arguments
      const args = "arg1 arg2 arg3";
      const result = await po.page.evaluate(
        async ({ name, args }) => {
          return await (window as any).electron.ipcRenderer.invoke(
            "skills:execute",
            {
              name,
              args,
            },
          );
        },
        { name: skillName, args },
      );

      // Verify arguments are included in content
      expect(result.content).toContain(args);

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });
  });

  test.describe("Skill Management", () => {
    test("retrieves a skill by name", async ({ po }) => {
      await po.setUp();

      const skillName = "get-skill-test";
      const skillDescription = "Test get operation";
      const skillContent = "# Get Test";

      // Create skill
      await po.page.evaluate(
        async ({ name, description, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description,
            content,
            scope: "user",
          });
        },
        {
          name: skillName,
          description: skillDescription,
          content: skillContent,
        },
      );

      // Get skill by name
      const skill = await po.page.evaluate(async (name) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:get",
          name,
        );
      }, skillName);

      // Verify skill details
      expect(skill.name).toBe(skillName);
      expect(skill.description).toBe(skillDescription);
      expect(skill.content).toBe(skillContent);

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });

    test("updates a skill's content", async ({ po }) => {
      await po.setUp();

      const skillName = "update-skill-test";
      const originalContent = "# Original Content";
      const updatedContent = "# Updated Content";

      // Create skill
      await po.page.evaluate(
        async ({ name, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description: "Test update",
            content,
            scope: "user",
          });
        },
        { name: skillName, content: originalContent },
      );

      // Update skill content
      await po.page.evaluate(
        async ({ name, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:update", {
            name,
            content,
          });
        },
        { name: skillName, content: updatedContent },
      );

      // Verify content was updated
      const skill = await po.page.evaluate(async (name) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:get",
          name,
        );
      }, skillName);

      expect(skill.content).toBe(updatedContent);

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });

    test("updates a skill's description", async ({ po }) => {
      await po.setUp();

      const skillName = "update-desc-test";
      const originalDescription = "Original description";
      const updatedDescription = "Updated description";

      // Create skill
      await po.page.evaluate(
        async ({ name, description }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description,
            content: "# Test",
            scope: "user",
          });
        },
        { name: skillName, description: originalDescription },
      );

      // Update skill description
      await po.page.evaluate(
        async ({ name, description }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:update", {
            name,
            description,
          });
        },
        { name: skillName, description: updatedDescription },
      );

      // Verify description was updated
      const skill = await po.page.evaluate(async (name) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:get",
          name,
        );
      }, skillName);

      expect(skill.description).toBe(updatedDescription);

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });

    test("deletes a skill", async ({ po }) => {
      await po.setUp();

      const skillName = "delete-skill-test";

      // Create skill
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke("skills:create", {
          name,
          description: "Test delete",
          content: "# Delete Test",
          scope: "user",
        });
      }, skillName);

      // Verify skill exists
      const skillBefore = await po.page.evaluate(async (name) => {
        try {
          return await (window as any).electron.ipcRenderer.invoke(
            "skills:get",
            name,
          );
        } catch {
          return null;
        }
      }, skillName);
      expect(skillBefore).not.toBeNull();

      // Delete skill
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);

      // Verify skill no longer exists
      const skillAfter = await po.page.evaluate(async (name) => {
        try {
          return await (window as any).electron.ipcRenderer.invoke(
            "skills:get",
            name,
          );
        } catch {
          return null;
        }
      }, skillName);
      expect(skillAfter).toBeNull();
    });
  });

  test.describe("Grouped Skills", () => {
    test("creates and lists grouped skills", async ({ po }) => {
      await po.setUp();

      // Create grouped skills with namespace
      const groupedSkills = [
        {
          name: "dyad:lint",
          description: "Dyad lint skill",
          content: "# Dyad Lint",
        },
        {
          name: "dyad:test",
          description: "Dyad test skill",
          content: "# Dyad Test",
        },
        {
          name: "dyad:build",
          description: "Dyad build skill",
          content: "# Dyad Build",
        },
      ];

      for (const skill of groupedSkills) {
        await po.page.evaluate(async ({ name, description, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description,
            content,
            scope: "user",
          });
        }, skill);
      }

      // List all skills
      const allSkills = await po.page.evaluate(async () => {
        return await (window as any).electron.ipcRenderer.invoke("skills:list");
      });

      // Verify grouped skills have namespace
      const dyadSkills = allSkills.filter((s: any) =>
        s.name.startsWith("dyad:"),
      );
      expect(dyadSkills.length).toBe(3);
      for (const skill of dyadSkills) {
        expect(skill.namespace).toBe("dyad");
      }

      // Filter by namespace
      const namespacedSkills = await po.page.evaluate(async () => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:list",
          {
            namespace: "dyad",
          },
        );
      });

      expect(namespacedSkills.length).toBe(3);

      // Clean up
      for (const skill of groupedSkills) {
        await po.page.evaluate(async (name) => {
          await (window as any).electron.ipcRenderer.invoke(
            "skills:delete",
            name,
          );
        }, skill.name);
      }
    });

    test("invokes grouped skill with full path", async ({ po }) => {
      await po.setUp();

      const skillName = "group:subskill";
      const skillContent = "# Grouped Subskill\n\nThis is a grouped skill.";

      // Create grouped skill
      await po.page.evaluate(
        async ({ name, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description: "Grouped skill test",
            content,
            scope: "user",
          });
        },
        { name: skillName, content: skillContent },
      );

      // Execute grouped skill
      const result = await po.page.evaluate(async (name) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:execute",
          {
            name,
          },
        );
      }, skillName);

      // Verify skill is executed correctly
      expect(result.skill.name).toBe(skillName);
      expect(result.skill.namespace).toBe("group");
      expect(result.content).toBe(skillContent);

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });
  });

  test.describe("Skill Validation", () => {
    test("validates skill content", async ({ po }) => {
      await po.setUp();

      // Valid SKILL.md content
      const validContent = `---
name: test-skill
description: A test skill
---

# Test Skill

This is a test skill.`;

      const validResult = await po.page.evaluate(async (content) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:validate",
          content,
        );
      }, validContent);

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
    });

    test("detects missing frontmatter", async ({ po }) => {
      await po.setUp();

      // Invalid content without frontmatter
      const invalidContent = "# Test Skill\n\nNo frontmatter here.";

      const invalidResult = await po.page.evaluate(async (content) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:validate",
          content,
        );
      }, invalidContent);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    test("detects missing required fields", async ({ po }) => {
      await po.setUp();

      // Invalid content with missing name field
      const invalidContent = `---
description: A test skill
---

# Test Skill`;

      const invalidResult = await po.page.evaluate(async (content) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:validate",
          content,
        );
      }, invalidContent);

      expect(invalidResult.valid).toBe(false);
      expect(
        invalidResult.errors.some((e: any) => e.code.includes("NAME")),
      ).toBe(true);
    });

    test("warns about missing description", async ({ po }) => {
      await po.setUp();

      // Content with missing description (warning, not error)
      const contentWithoutDesc = `---
name: test-skill
---

# Test Skill`;

      const result = await po.page.evaluate(async (content) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:validate",
          content,
        );
      }, contentWithoutDesc);

      // Should have warnings but might still be valid
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w: any) => w.code.includes("DESCRIPTION")),
      ).toBe(true);
    });
  });

  test.describe("Workspace Override", () => {
    test("workspace-level skill overrides user-level skill with same name", async ({
      po,
    }) => {
      await po.setUp();
      await po.importApp(
        path.join(__dirname, "fixtures", "import-app", "minimal"),
      );

      const skillName = "override-test";
      const userContent = "# User Level Skill";
      const workspaceContent = "# Workspace Level Skill";

      // Create user-level skill
      await po.page.evaluate(
        async ({ name, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description: "User skill",
            content,
            scope: "user",
          });
        },
        { name: skillName, content: userContent },
      );

      // Create workspace-level skill with same name
      await po.page.evaluate(
        async ({ name, content }) => {
          await (window as any).electron.ipcRenderer.invoke("skills:create", {
            name,
            description: "Workspace skill",
            content,
            scope: "workspace",
          });
        },
        { name: skillName, content: workspaceContent },
      );

      // Trigger discovery to ensure override is applied
      await po.page.evaluate(async () => {
        await (window as any).electron.ipcRenderer.invoke("skills:discover");
      });

      // Get the skill - should return workspace version
      const skill = await po.page.evaluate(async (name) => {
        return await (window as any).electron.ipcRenderer.invoke(
          "skills:get",
          name,
        );
      }, skillName);

      // Verify workspace skill takes precedence
      expect(skill.scope).toBe("workspace");
      expect(skill.content).toBe(workspaceContent);

      // Clean up
      await po.page.evaluate(async (name) => {
        await (window as any).electron.ipcRenderer.invoke(
          "skills:delete",
          name,
        );
      }, skillName);
    });
  });
});
