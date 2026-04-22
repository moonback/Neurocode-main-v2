import type { ContextObservabilityRecord } from "../lib/schemas";

/**
 * In-memory ring buffer for storing context observability data.
 * Retains the most recent 50 interactions per session.
 */
export class ObservabilityStore {
  private records: Map<string, ContextObservabilityRecord> = new Map();
  private insertionOrder: string[] = [];
  private readonly maxEntries = 50;

  /**
   * Record a new observability entry.
   * If the store is at capacity, evicts the oldest entry.
   */
  record(entry: ContextObservabilityRecord): void {
    // If we're at capacity and this is a new entry, remove the oldest
    if (
      this.insertionOrder.length >= this.maxEntries &&
      !this.records.has(entry.interactionId)
    ) {
      const oldestId = this.insertionOrder.shift();
      if (oldestId) {
        this.records.delete(oldestId);
      }
    }

    // Update or add the record
    if (!this.records.has(entry.interactionId)) {
      this.insertionOrder.push(entry.interactionId);
    }
    this.records.set(entry.interactionId, entry);
  }

  /**
   * Retrieve an observability record by interaction ID.
   * Returns null if the ID is not found.
   */
  get(interactionId: string): ContextObservabilityRecord | { error: string } {
    const record = this.records.get(interactionId);
    if (!record) {
      return { error: "Observability data not available for this interaction" };
    }
    return record;
  }

  /**
   * Retrieve the N most recent observability records.
   * Returns records in descending order by timestamp (most recent first).
   */
  getRecent(limit: number = 50): ContextObservabilityRecord[] {
    const recentIds = this.insertionOrder.slice(-limit);
    const records = recentIds
      .map((id) => this.records.get(id))
      .filter((r): r is ContextObservabilityRecord => r !== undefined);

    // Sort by timestamp descending (most recent first)
    return records.sort((a, b) => b.timestamp - a.timestamp);
  }
}
