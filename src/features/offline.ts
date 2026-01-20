import type { QueryClient } from "@tanstack/react-query";
import type { MutationFunctionRegistry, OfflineMutationOperation, OfflineQueueConfig, OfflineState } from "../types/offline";
import { onlineManager } from "@tanstack/react-query";
import { ConnectionQuality, StorageType } from "../types/base.js";
import { isStorageAvailable } from "../utils/storage.js";

export function setupOnlineManager() {
  if (typeof window === "undefined") return;
  onlineManager.setEventListener((setOnline) => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });
}
export const isOnline = () => onlineManager.isOnline();
export function subscribeToOnlineStatus(callback: (online: boolean) => void) { return onlineManager.subscribe(callback); }
export function configureOfflineQueries(_queryClient: QueryClient) {}

function sortObjectKeys(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  const sorted: Record<string, any> = {};
  Object.keys(value).sort().forEach((key) => { sorted[key] = sortObjectKeys(value[key]); });
  return sorted;
}

export function serializeMutationKey(mutationKey: unknown): string {
  try {
    if (typeof mutationKey === "string") return mutationKey;
    return JSON.stringify(sortObjectKeys(mutationKey));
  } catch {
    return String(mutationKey);
  }
}

const DEFAULT_QUEUE_CONFIG: OfflineQueueConfig = { enabled: true, maxSize: 100, persist: true, storageKey: "tanstack-query-offline-queue", autoExecuteInterval: 5000, executeOnReconnect: true, operationTimeout: 30000, concurrency: 3 };
export function calculateExponentialBackoff(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
  const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
}
class MutationRegistry implements MutationFunctionRegistry {
  private registry = new Map<string, () => Promise<unknown>>();
  register(key: string, fn: () => Promise<unknown>): void { this.registry.set(key, fn); }
  get(key: string): (() => Promise<unknown>) | undefined { return this.registry.get(key); }
  unregister(key: string): void { this.registry.delete(key); }
  clear(): void { this.registry.clear(); }
  getKeys(): string[] { return Array.from(this.registry.keys()); }
}
export const mutationRegistry = new MutationRegistry();

export class OfflineQueueManager {
  private queue: OfflineMutationOperation[] = [];
  private config: OfflineQueueConfig;
  private isExecuting = false;
  private executionTimer: NodeJS.Timeout | null = null;
  private unsubscribeOnline: (() => void) | null = null;
  private executingOperations = new Set<string>();
  constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    if (!this.config.enabled) { return; }
    if (this.config.persist) { this.loadQueue(); }
    if (this.config.executeOnReconnect) { this.setupOnlineListener(); }
    if (this.config.autoExecuteInterval > 0) { this.startAutoExecution(); }
  }
  async add(operation: Omit<OfflineMutationOperation, "id" | "createdAt" | "retryCount">): Promise<string> {
    if (!this.config.enabled) { throw new Error("Offline queue is disabled"); }
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newOperation: OfflineMutationOperation = { ...operation, id, createdAt: new Date(), retryCount: 0 };
    if (this.queue.length >= this.config.maxSize) { throw new Error(`Queue is full (max size: ${this.config.maxSize})`); }
    const insertIndex = this.queue.findIndex((op) => op.priority < newOperation.priority);
    if (insertIndex === -1) { this.queue.push(newOperation); } else { this.queue.splice(insertIndex, 0, newOperation); }
    if (this.config.persist) { await this.persistQueue(); }
    return id;
  }
  async remove(operationId: string): Promise<boolean> {
    const index = this.queue.findIndex((op) => op.id === operationId);
    if (index === -1) return false;
    this.queue.splice(index, 1);
    if (this.config.persist) { await this.persistQueue(); }
    return true;
  }
  getState(): OfflineState {
    const online = isOnline();
    return { isOffline: !online, networkStatus: { isOnline: online, isOffline: !online, connectionQuality: ConnectionQuality.UNKNOWN }, queuedOperations: this.queue.length, failedQueries: this.queue.filter((op) => op.lastError).length, lastSyncAt: this.queue.length === 0 ? new Date() : undefined, isRecovering: this.isExecuting };
  }
  getOperations(): OfflineMutationOperation[] { return [...this.queue]; }
  async clear(): Promise<void> { this.queue = []; if (this.config.persist) { await this.persistQueue(); } }
  async execute(): Promise<{ success: number; failed: number; skipped: number }> {
    if (!this.config.enabled) { return { success: 0, failed: 0, skipped: this.queue.length }; }
    if (this.isExecuting) { return { success: 0, failed: 0, skipped: this.queue.length }; }
    if (!isOnline()) { return { success: 0, failed: 0, skipped: this.queue.length }; }
    this.isExecuting = true;
    let successCount = 0; let failedCount = 0; let skippedCount = 0;
    try {
      const sortedOperations = this.sortOperationsByDependency();
      const batches = this.createBatches(sortedOperations, this.config.concurrency);
      for (const batch of batches) {
        const results = await Promise.allSettled(batch.map((op) => this.executeOperation(op)));
        results.forEach((result) => {
          if (result.status === "fulfilled") { if (result.value) { successCount++; } else { skippedCount++; } } else { failedCount++; }
        });
      }
      this.queue = this.queue.filter((op) => op.lastError !== undefined);
      if (this.config.persist) { await this.persistQueue(); }
      return { success: successCount, failed: failedCount, skipped: skippedCount };
    } finally { this.isExecuting = false; }
  }
  private async executeOperation(operation: OfflineMutationOperation): Promise<boolean> {
    if (this.executingOperations.has(operation.id)) { return false; }
    if (operation.dependsOn && operation.dependsOn.length > 0) {
      const dependenciesMet = operation.dependsOn.every((depId) => !this.queue.find((op) => op.id === depId));
      if (!dependenciesMet) { return false; }
    }
    this.executingOperations.add(operation.id);
    try {
      const mutationKey = serializeMutationKey(operation.mutationKey);
      const legacyMutationKey = Array.isArray(operation.mutationKey) ? operation.mutationKey.join("-") : String(operation.mutationKey);
      const mutationFn = mutationRegistry.get(mutationKey) || mutationRegistry.get(legacyMutationKey) || operation.mutationFn;
      const timeoutPromise = new Promise<never>((_, reject) => { setTimeout(() => reject(new Error("Operation timeout")), this.config.operationTimeout); });
      await Promise.race([mutationFn(), timeoutPromise]);
      await this.remove(operation.id);
      return true;
    } catch (error) {
      operation.retryCount++;
      operation.lastError = error instanceof Error ? error : new Error(String(error));
      if (operation.retryCount >= 5) { /* noop */ }
      if (this.config.persist) { await this.persistQueue(); }
      return false;
    } finally { this.executingOperations.delete(operation.id); }
  }
  private sortOperationsByDependency(): OfflineMutationOperation[] {
    const sorted: OfflineMutationOperation[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (operation: OfflineMutationOperation) => {
      if (visited.has(operation.id)) return;
      if (visiting.has(operation.id)) { return; }
      visiting.add(operation.id);
      if (operation.dependsOn) {
        for (const depId of operation.dependsOn) {
          const dep = this.queue.find((op) => op.id === depId);
          if (dep) { visit(dep); }
        }
      }
      visiting.delete(operation.id);
      visited.add(operation.id);
      sorted.push(operation);
    };
    const prioritySorted = [...this.queue].sort((a, b) => b.priority - a.priority);
    for (const operation of prioritySorted) { visit(operation); }
    return sorted;
  }
  private createBatches(operations: OfflineMutationOperation[], batchSize: number): OfflineMutationOperation[][] {
    const batches: OfflineMutationOperation[][] = [];
    for (let i = 0; i < operations.length; i += batchSize) { batches.push(operations.slice(i, i + batchSize)); }
    return batches;
  }
  private async persistQueue(): Promise<void> {
    if (!isStorageAvailable(StorageType.LOCAL)) { return; }
    try {
      const serialized = JSON.stringify(this.queue.map((op) => ({ ...op, createdAt: op.createdAt.toISOString(), mutationFn: undefined })));
      localStorage.setItem(this.config.storageKey, serialized);
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") {
        this.cleanupOldOperations();
        try {
          const serialized = JSON.stringify(this.queue.map((op) => ({ ...op, createdAt: op.createdAt.toISOString(), mutationFn: undefined })));
          localStorage.setItem(this.config.storageKey, serialized);
        } catch {}
      }
    }
  }
  private loadQueue(): void {
    if (!isStorageAvailable(StorageType.LOCAL)) { return; }
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) { this.queue = []; return; }
      this.queue = parsed.map((op: any) => ({ ...op, createdAt: new Date(op.createdAt as string), mutationFn: op.mutationFn || (() => Promise.reject(new Error("Mutation function not registered"))) } as OfflineMutationOperation));
    } catch { this.queue = []; }
  }
  private cleanupOldOperations(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.queue = this.queue.filter((op) => op.createdAt > oneDayAgo);
  }
  private setupOnlineListener(): void {
    this.unsubscribeOnline = subscribeToOnlineStatus((online) => { if (online && this.queue.length > 0) { this.execute().catch(() => {}); } });
  }
  private startAutoExecution(): void {
    this.executionTimer = setInterval(() => {
      if (isOnline() && this.queue.length > 0 && !this.isExecuting) { this.execute().catch(() => {}); }
    }, this.config.autoExecuteInterval);
  }
  private stopAutoExecution(): void {
    if (this.executionTimer) { clearInterval(this.executionTimer); this.executionTimer = null; }
  }
  destroy(): void {
    this.stopAutoExecution();
    if (this.unsubscribeOnline) { this.unsubscribeOnline(); this.unsubscribeOnline = null; }
    this.executingOperations.clear();
  }
}
export function createOfflineQueueManager(config?: Partial<OfflineQueueConfig>): OfflineQueueManager { return new OfflineQueueManager(config); }
