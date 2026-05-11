import { db } from "../../../db";
import { customAgents } from "../../../db/schema";
import {
  AgentDefinition,
  AgentCapability,
  AgentDefinitionSchema,
} from "../../../ipc/types/multi_agent";
import { eq } from "drizzle-orm";
import { DyadError, DyadErrorKind } from "../../../errors/dyad_error";

const BUILT_IN_AGENTS: AgentDefinition[] = [
  {
    id: "agent-frontend",
    name: "Frontend Specialist",
    description: "Expert in React, TypeScript, and modern CSS/UI design.",
    systemPrompt:
      "You are a specialized Frontend Engineer. Your goal is to implement beautiful, responsive, and accessible user interfaces. You follow best practices for React and Base UI.",
    capabilities: ["frontend"],
    toolConfiguration: {
      allowedTools: ["read_file", "write_file", "list_dir", "grep_search"],
      readOnly: false,
    },
    isBuiltIn: true,
  },
  {
    id: "agent-backend",
    name: "Backend Architect",
    description: "Expert in Node.js, databases, and API design.",
    systemPrompt:
      "You are a specialized Backend Architect. Your goal is to design robust APIs, database schemas, and server-side logic. You prioritize performance and security.",
    capabilities: ["backend"],
    toolConfiguration: {
      allowedTools: ["read_file", "write_file", "list_dir", "run_command"],
      readOnly: false,
    },
    isBuiltIn: true,
  },
  {
    id: "agent-testing",
    name: "QA & Testing Engineer",
    description: "Expert in Playwright, unit testing, and E2E automation.",
    systemPrompt:
      "You are a specialized QA Engineer. Your goal is to ensure code quality through comprehensive testing. You write robust unit and E2E tests.",
    capabilities: ["testing"],
    toolConfiguration: {
      allowedTools: ["read_file", "write_file", "list_dir", "run_command"],
      readOnly: false,
    },
    isBuiltIn: true,
  },
  {
    id: "agent-documentation",
    name: "Technical Writer",
    description: "Specialized in creating clear, concise documentation.",
    systemPrompt:
      "You are a specialized Technical Writer. Your goal is to document codebases, APIs, and user guides. You make complex concepts easy to understand.",
    capabilities: ["documentation"],
    toolConfiguration: {
      allowedTools: ["read_file", "write_file", "list_dir"],
      readOnly: false,
    },
    isBuiltIn: true,
  },
  {
    id: "agent-debugging",
    name: "Debug Specialist",
    description: "Expert in root cause analysis and bug fixing.",
    systemPrompt:
      "You are a specialized Debugging Expert. Your goal is to identify and fix bugs efficiently. You are methodical in your approach to troubleshooting.",
    capabilities: ["debugging"],
    toolConfiguration: {
      allowedTools: ["read_file", "list_dir", "grep_search", "run_command"],
      readOnly: false,
    },
    isBuiltIn: true,
  },
];

export class AgentRegistry {
  private static instance: AgentRegistry;

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  async getAll(): Promise<AgentDefinition[]> {
    const custom = await db.select().from(customAgents);
    const customMapped: AgentDefinition[] = custom.map((a) => {
      const toolConfig = a.toolConfiguration as any;
      return {
        id: a.id.toString(),
        name: a.name,
        description: a.description || undefined,
        systemPrompt: a.systemPrompt,
        capabilities: toolConfig.capabilities || [],
        toolConfiguration: {
          allowedTools: toolConfig.allowedTools || [],
          readOnly: !!toolConfig.readOnly,
        },
        isBuiltIn: false,
      };
    });

    return [...BUILT_IN_AGENTS, ...customMapped];
  }

  async findByCapability(capability: AgentCapability): Promise<AgentDefinition[]> {
    const all = await this.getAll();
    return all.filter((a) => a.capabilities.includes(capability));
  }

  async findById(id: string): Promise<AgentDefinition | undefined> {
    const all = await this.getAll();
    return all.find((a) => a.id === id);
  }

  async register(definition: Omit<AgentDefinition, "id" | "isBuiltIn">): Promise<AgentDefinition> {
    // Validation
    const validated = AgentDefinitionSchema.omit({
      id: true,
      isBuiltIn: true,
    }).safeParse(definition);
    if (!validated.success) {
      throw new DyadError(
        `Invalid agent definition: ${validated.error.message}`,
        DyadErrorKind.Validation,
      );
    }

    const [inserted] = await db
      .insert(customAgents)
      .values({
        name: definition.name,
        description: definition.description,
        systemPrompt: definition.systemPrompt,
        toolConfiguration: {
          ...definition.toolConfiguration,
          capabilities: definition.capabilities,
        },
      })
      .returning();

    return {
      id: inserted.id.toString(),
      name: inserted.name,
      description: inserted.description || undefined,
      systemPrompt: inserted.systemPrompt,
      capabilities: (inserted.toolConfiguration as any).capabilities || [],
      toolConfiguration: inserted.toolConfiguration as any,
      isBuiltIn: false,
    };
  }

  async unregister(id: string): Promise<void> {
    const agentId = parseInt(id, 10);
    if (isNaN(agentId)) {
      throw new DyadError("Cannot unregister built-in agents", DyadErrorKind.Validation);
    }

    await db.delete(customAgents).where(eq(customAgents.id, agentId));
  }

  async update(
    id: string,
    updates: Partial<Omit<AgentDefinition, "id" | "isBuiltIn">>,
  ): Promise<AgentDefinition> {
    const agentId = parseInt(id, 10);
    if (isNaN(agentId)) {
      throw new DyadError("Cannot update built-in agents", DyadErrorKind.Validation);
    }

    const [existing] = await db.select().from(customAgents).where(eq(customAgents.id, agentId));
    if (!existing) {
      throw new DyadError(`Agent with id ${id} not found`, DyadErrorKind.NotFound);
    }

    const toolConfig = (existing.toolConfiguration as any) || {};
    const updatedValues: any = {
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      systemPrompt: updates.systemPrompt ?? existing.systemPrompt,
      updatedAt: new Date(),
    };

    if (updates.toolConfiguration || updates.capabilities) {
      updatedValues.toolConfiguration = {
        ...(toolConfig as any),
        ...updates.toolConfiguration,
        capabilities: updates.capabilities ?? toolConfig.capabilities,
      };
    }

    const [updated] = await db
      .update(customAgents)
      .set(updatedValues)
      .where(eq(customAgents.id, agentId))
      .returning();

    return {
      id: updated.id.toString(),
      name: updated.name,
      description: updated.description || undefined,
      systemPrompt: updated.systemPrompt,
      capabilities: (updated.toolConfiguration as any).capabilities || [],
      toolConfiguration: updated.toolConfiguration as any,
      isBuiltIn: false,
    };
  }
}
