/**
 * Inter-agent message bus.
 *
 * Provides typed message passing between agents within a workflow.
 * Supports direct messages, broadcasts, and request/response patterns.
 */

import crypto from "node:crypto";
import log from "electron-log";
import type {
  AgentMessage,
  AgentMessagePayload,
  AgentMessageType,
} from "./types";

const logger = log.scope("agent_message_bus");

// ============================================================================
// Message Bus Types
// ============================================================================

type MessageHandler = (message: AgentMessage) => void | Promise<void>;

interface Subscription {
  readonly agentId: string;
  readonly handler: MessageHandler;
  readonly filter?: {
    readonly types?: readonly AgentMessageType[];
    readonly fromAgentId?: string;
  };
}

// ============================================================================
// AgentMessageBus
// ============================================================================

/**
 * Message bus scoped to a single workflow execution.
 * Each workflow gets its own bus instance so messages don't leak across workflows.
 */
export class AgentMessageBus {
  private readonly workflowId: string;
  private readonly subscriptions = new Map<string, Subscription[]>();
  private readonly messageLog: AgentMessage[] = [];
  private readonly pendingResponses = new Map<
    string,
    {
      resolve: (msg: AgentMessage) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(workflowId: string) {
    this.workflowId = workflowId;
  }

  /**
   * Subscribe an agent to receive messages.
   * Returns an unsubscribe function.
   */
  subscribe(
    agentId: string,
    handler: MessageHandler,
    filter?: Subscription["filter"],
  ): () => void {
    const sub: Subscription = { agentId, handler, filter };
    const existing = this.subscriptions.get(agentId) ?? [];
    existing.push(sub);
    this.subscriptions.set(agentId, existing);

    return () => {
      const subs = this.subscriptions.get(agentId);
      if (subs) {
        const idx = subs.indexOf(sub);
        if (idx >= 0) subs.splice(idx, 1);
        if (subs.length === 0) this.subscriptions.delete(agentId);
      }
    };
  }

  /**
   * Send a message from one agent to another.
   */
  async send(
    fromAgentId: string,
    toAgentId: string,
    type: AgentMessageType,
    payload: AgentMessagePayload,
    correlationId?: string,
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      fromAgentId,
      toAgentId,
      payload,
      correlationId,
    };

    this.messageLog.push(message);
    logger.info(
      `[${this.workflowId}] ${fromAgentId} → ${toAgentId}: ${type}`,
    );

    // Deliver to target agent
    await this.deliverToAgent(toAgentId, message);

    return message;
  }

  /**
   * Broadcast a message to all subscribed agents.
   */
  async broadcast(
    fromAgentId: string,
    type: AgentMessageType,
    payload: AgentMessagePayload,
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      fromAgentId,
      toAgentId: null,
      payload,
    };

    this.messageLog.push(message);
    logger.info(`[${this.workflowId}] ${fromAgentId} → ALL: ${type}`);

    // Deliver to all agents except the sender
    const deliveryPromises: Promise<void>[] = [];
    for (const [agentId] of this.subscriptions) {
      if (agentId !== fromAgentId) {
        deliveryPromises.push(this.deliverToAgent(agentId, message));
      }
    }
    await Promise.allSettled(deliveryPromises);

    return message;
  }

  /**
   * Send a message and wait for a response with the same correlationId.
   * Times out after the specified duration.
   */
  async sendAndWaitForResponse(
    fromAgentId: string,
    toAgentId: string,
    type: AgentMessageType,
    payload: AgentMessagePayload,
    timeoutMs = 30_000,
  ): Promise<AgentMessage> {
    const correlationId = crypto.randomUUID();

    const responsePromise = new Promise<AgentMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponses.delete(correlationId);
        reject(
          new Error(
            `Response timeout: ${fromAgentId} → ${toAgentId} (${type})`,
          ),
        );
      }, timeoutMs);

      this.pendingResponses.set(correlationId, { resolve, timer });
    });

    await this.send(fromAgentId, toAgentId, type, payload, correlationId);

    return responsePromise;
  }

  /**
   * Get the full message log for this workflow.
   */
  getMessageLog(): readonly AgentMessage[] {
    return this.messageLog;
  }

  /**
   * Get messages exchanged by a specific agent.
   */
  getMessagesForAgent(agentId: string): readonly AgentMessage[] {
    return this.messageLog.filter(
      (m) => m.fromAgentId === agentId || m.toAgentId === agentId,
    );
  }

  /**
   * Tear down the bus: cancel pending responses, clear subscriptions.
   */
  destroy(): void {
    for (const [, { timer }] of this.pendingResponses) {
      clearTimeout(timer);
    }
    this.pendingResponses.clear();
    this.subscriptions.clear();
    logger.info(`[${this.workflowId}] Message bus destroyed`);
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private async deliverToAgent(
    agentId: string,
    message: AgentMessage,
  ): Promise<void> {
    // Check for pending response resolution first
    if (message.correlationId) {
      const pending = this.pendingResponses.get(message.correlationId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingResponses.delete(message.correlationId);
        pending.resolve(message);
        return;
      }
    }

    const subs = this.subscriptions.get(agentId);
    if (!subs || subs.length === 0) return;

    for (const sub of subs) {
      // Apply filter
      if (sub.filter?.types && !sub.filter.types.includes(message.type)) {
        continue;
      }
      if (
        sub.filter?.fromAgentId &&
        sub.filter.fromAgentId !== message.fromAgentId
      ) {
        continue;
      }

      try {
        await sub.handler(message);
      } catch (err) {
        logger.error(
          `[${this.workflowId}] Handler error in ${agentId}:`,
          err,
        );
      }
    }
  }
}
