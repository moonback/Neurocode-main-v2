/**
 * Agent Registry — manages all available agents (built-in + custom).
 */

import log from "electron-log";
import crypto from "node:crypto";
import { BUILT_IN_AGENTS, getBuiltInAgentById } from "./agent_definitions";
import type {
  AgentDefinition,
  AgentCapability,
  AgentRole,
  CustomAgentConfig,
} from "./types";
import { readSettings, writeSettings } from "@/main/settings";

const logger = log.scope("agent_registry");

let customAgentsCache: AgentDefinition[] | null = null;

export function getAllAgents(): AgentDefinition[] {
  return [...BUILT_IN_AGENTS, ...getCustomAgents()];
}

export function getBuiltInAgentsAll(): readonly AgentDefinition[] {
  return BUILT_IN_AGENTS;
}

export function getCustomAgents(): AgentDefinition[] {
  if (customAgentsCache === null) {
    customAgentsCache = loadCustomAgentsFromSettings();
  }
  return customAgentsCache;
}

export function getAgentById(id: string): AgentDefinition | undefined {
  return getBuiltInAgentById(id) ?? getCustomAgents().find((a) => a.id === id);
}

export function getAgentsByRole(role: AgentRole): AgentDefinition[] {
  return getAllAgents().filter((a) => a.role === role);
}

export function getAgentsByCapabilities(
  required: readonly AgentCapability[],
): AgentDefinition[] {
  return getAllAgents().filter((agent) =>
    required.every((cap) => agent.capabilities.includes(cap)),
  );
}

export function getAgentsWithAnyCapability(
  caps: readonly AgentCapability[],
): AgentDefinition[] {
  return getAllAgents().filter((agent) =>
    caps.some((cap) => agent.capabilities.includes(cap)),
  );
}

export function findBestAgent(
  required: readonly AgentCapability[],
): AgentDefinition | undefined {
  let best: AgentDefinition | undefined;
  let bestScore = 0;
  for (const agent of getAllAgents()) {
    const score = required.filter((c) => agent.capabilities.includes(c)).length;
    if (score > bestScore) {
      bestScore = score;
      best = agent;
    }
  }
  return best;
}

// Custom Agent CRUD

export function createCustomAgent(
  config: Omit<CustomAgentConfig, "id" | "createdAt" | "updatedAt">,
): AgentDefinition {
  const now = Date.now();
  const agentConfig: CustomAgentConfig = {
    ...config,
    id: `custom:${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
  };
  const definition = configToDefinition(agentConfig);
  const configs = loadCustomAgentConfigs();
  configs.push(agentConfig);
  saveCustomAgentConfigs(configs);
  customAgentsCache = null;
  logger.info(`Created custom agent: ${definition.name} (${definition.id})`);
  return definition;
}

export function updateCustomAgent(
  id: string,
  updates: Partial<Omit<CustomAgentConfig, "id" | "createdAt" | "updatedAt">>,
): AgentDefinition | undefined {
  const configs = loadCustomAgentConfigs();
  const idx = configs.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  const updated: CustomAgentConfig = {
    ...configs[idx],
    ...updates,
    updatedAt: Date.now(),
  };
  configs[idx] = updated;
  saveCustomAgentConfigs(configs);
  customAgentsCache = null;
  logger.info(`Updated custom agent: ${updated.name} (${id})`);
  return configToDefinition(updated);
}

export function deleteCustomAgent(id: string): boolean {
  const configs = loadCustomAgentConfigs();
  const idx = configs.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  configs.splice(idx, 1);
  saveCustomAgentConfigs(configs);
  customAgentsCache = null;
  logger.info(`Deleted custom agent: ${id}`);
  return true;
}

// Persistence

function loadCustomAgentConfigs(): CustomAgentConfig[] {
  const settings = readSettings();
  return (settings as any).customAgents ?? [];
}

function saveCustomAgentConfigs(configs: CustomAgentConfig[]): void {
  const settings = readSettings();
  writeSettings({ ...settings, customAgents: configs } as any);
}

function loadCustomAgentsFromSettings(): AgentDefinition[] {
  try {
    return loadCustomAgentConfigs().map(configToDefinition);
  } catch (err) {
    logger.error("Failed to load custom agents:", err);
    return [];
  }
}

function configToDefinition(config: CustomAgentConfig): AgentDefinition {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    role: `custom:${config.id}`,
    systemPrompt: config.systemPrompt,
    capabilities: config.capabilities,
    allowedTools: config.allowedTools,
    excludedTools: config.excludedTools,
    icon: config.icon,
    color: config.color,
    isCustom: true,
    maxToolCallSteps: config.maxToolCallSteps,
  };
}
