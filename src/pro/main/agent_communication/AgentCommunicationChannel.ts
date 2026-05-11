import { WebContents } from "electron";
import { safeSend } from "../../../ipc/utils/safe_sender";
import { v4 as uuidv4 } from "uuid";
import log from "electron-log";

const logger = log.scope("agent_communication");

export type AgentMessageType = "request" | "response" | "info" | "broadcast";

export interface AgentMessage {
  senderId: string;
  receiverId: string;
  content: string;
  messageType: AgentMessageType;
  requestId?: string;
}

export class AgentCommunicationChannel {
  private static instance: AgentCommunicationChannel;
  private pendingRequests = new Map<string, (response: string) => void>();

  private constructor() {}

  static getInstance(): AgentCommunicationChannel {
    if (!AgentCommunicationChannel.instance) {
      AgentCommunicationChannel.instance = new AgentCommunicationChannel();
    }
    return AgentCommunicationChannel.instance;
  }

  /**
   * Send a fire-and-forget message
   */
  send(sender: WebContents, message: Omit<AgentMessage, "requestId" | "messageType"> & { messageType?: "info" | "broadcast" }) {
    const requestId = uuidv4();
    const fullMessage: AgentMessage = {
      ...message,
      messageType: message.messageType || "info",
      requestId,
    };

    logger.debug(`Sending message from ${message.senderId} to ${message.receiverId}`);
    safeSend(sender, "multi-agent:communication", fullMessage);
  }

  /**
   * Send a request and wait for a response
   */
  async request(sender: WebContents, message: Omit<AgentMessage, "requestId" | "messageType">): Promise<string> {
    const requestId = uuidv4();
    const fullMessage: AgentMessage = {
      ...message,
      messageType: "request",
      requestId,
    };

    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, resolve);
      
      logger.debug(`Sending request ${requestId} from ${message.senderId} to ${message.receiverId}`);
      safeSend(sender, "multi-agent:communication", fullMessage);

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          logger.warn(`Request ${requestId} timed out`);
          this.pendingRequests.delete(requestId);
          resolve("Error: Request timed out");
        }
      }, 60000);
    });
  }

  /**
   * Handle an incoming response
   */
  handleResponse(requestId: string, content: string) {
    const resolve = this.pendingRequests.get(requestId);
    if (resolve) {
      logger.debug(`Received response for request ${requestId}`);
      this.pendingRequests.delete(requestId);
      resolve(content);
    } else {
      logger.warn(`Received response for unknown request ${requestId}`);
    }
  }

  /**
   * Broadcast a message to all agents
   */
  broadcast(sender: WebContents, senderId: string, content: string) {
    this.send(sender, {
      senderId,
      receiverId: "all",
      content,
      messageType: "broadcast",
    });
  }
}
