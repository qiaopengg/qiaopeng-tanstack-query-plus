import type { QueryClient, QueryFunction, QueryKey } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME } from "../core/config.js";
import { getNetworkInfo, getNetworkSpeed } from "./network.js";

interface NetworkInformation extends EventTarget { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean }
interface NavigatorWithConnection extends Navigator { connection?: NetworkInformation; mozConnection?: NetworkInformation; webkitConnection?: NetworkInformation }
export interface PrefetchConfig { priority?: "high" | "medium" | "low"; delay?: number; staleTime?: number; allowSlowNetwork?: boolean }
export interface PrefetchTask { queryKey: QueryKey; queryFn: QueryFunction<any>; config: PrefetchConfig; timestamp: number; id: string; predictionScore?: number }
export type NetworkSpeed = "slow" | "medium" | "fast" | "unknown";
export interface PrefetchStats { queueSize: number; historySize: number; networkSpeed: NetworkSpeed; isProcessing: boolean; totalPrefetches: number; successfulPrefetches: number; failedPrefetches: number; averagePrefetchTime: number; skippedPrefetches: number }
export interface InteractionRecord { queryKey: QueryKey; timestamp: number; type: "view" | "hover" | "click" | "focus" }
export interface PredictionResult { queryKey: QueryKey; score: number; reason: string }

export class SmartPrefetchManager {
  private queryClient: QueryClient;
  private prefetchQueue: Map<string, PrefetchTask> = new Map();
  private prefetchHistory: Set<string> = new Set();
  private networkSpeed: NetworkSpeed = "fast";
  private isProcessing = false;
  private maxQueueSize = 10;
  private maxHistorySize = 100;
  private totalPrefetches = 0;
  private successfulPrefetches = 0;
  private failedPrefetches = 0;
  private skippedPrefetches = 0;
  private prefetchTimes: number[] = [];
  private maxPrefetchTimesSize = 50;
  private interactionHistory: InteractionRecord[] = [];
  private maxInteractionHistorySize = 100;
  private queryAccessCounts: Map<string, number> = new Map();
  private querySequences: Array<{ from: string; to: string; count: number }> = [];
  private maxSequenceSize = 50;
  private networkCleanup?: () => void;
  constructor(queryClient: QueryClient) { this.queryClient = queryClient; this.initNetworkMonitoring(); }
  private initNetworkMonitoring() {
    const networkInfo = getNetworkInfo();
    if (!networkInfo) { return; }
    this.updateNetworkSpeed();
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const navWithConnection = navigator as NavigatorWithConnection;
      const connection = navWithConnection.connection || navWithConnection.mozConnection || navWithConnection.webkitConnection;
      const handleNetworkChange = () => { this.updateNetworkSpeed(); };
      connection?.addEventListener?.("change", handleNetworkChange);
      this.networkCleanup = () => { connection?.removeEventListener("change", handleNetworkChange); };
    }
  }
  private updateNetworkSpeed() { this.networkSpeed = getNetworkSpeed(); }
  public getNetworkSpeed(): NetworkSpeed { return this.networkSpeed; }
  public isSlowNetwork(): boolean { return this.networkSpeed === "slow" || this.networkSpeed === "unknown"; }
  public shouldPrefetch(queryKey: QueryKey, config: PrefetchConfig = {}): boolean {
    const key = this.getQueryKeyString(queryKey);
    if (this.prefetchQueue.has(key)) return false;
    if (this.prefetchHistory.has(key)) return false;
    const cachedData = this.queryClient.getQueryData(queryKey);
    if (cachedData) return false;
    if (this.isSlowNetwork() && !config.allowSlowNetwork) return false;
    if (this.prefetchQueue.size >= this.maxQueueSize) return false;
    return true;
  }
  public addPrefetchTask(queryKey: QueryKey, queryFn: QueryFunction<any>, config: PrefetchConfig = {}): boolean {
    if (!this.shouldPrefetch(queryKey, config)) { this.skippedPrefetches++; return false; }
    const key = this.getQueryKeyString(queryKey);
    const task: PrefetchTask = { id: `${key}-${Date.now()}`, queryKey, queryFn, config: { priority: "medium", delay: 0, staleTime: DEFAULT_STALE_TIME, allowSlowNetwork: false, ...config }, timestamp: Date.now() };
    this.prefetchQueue.set(key, task);
    this.processQueue();
    return true;
  }
  private async processQueue() {
    if (this.isProcessing || this.prefetchQueue.size === 0) { return; }
    this.isProcessing = true;
    try {
      const sortedTasks = this.getSortedTasks();
      for (const task of sortedTasks) {
        const key = this.getQueryKeyString(task.queryKey);
        const startTime = Date.now();
        if (task.config.delay && task.config.delay > 0) { await this.delay(task.config.delay); }
        try {
          this.totalPrefetches++;
          await this.queryClient.prefetchQuery({ queryKey: task.queryKey, queryFn: task.queryFn, staleTime: task.config.staleTime });
          this.successfulPrefetches++;
          const duration = Date.now() - startTime;
          this.recordPrefetchTime(duration);
          this.addToHistory(key);
        } catch {
          this.failedPrefetches++;
        }
        this.prefetchQueue.delete(key);
      }
    } finally { this.isProcessing = false; }
  }
  private getSortedTasks(): PrefetchTask[] {
    const tasks = Array.from(this.prefetchQueue.values());
    const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
    return tasks.sort((a, b) => {
      const priorityA = priorityOrder[a.config.priority || "medium"]; const priorityB = priorityOrder[b.config.priority || "medium"]; if (priorityA !== priorityB) return priorityA - priorityB;
      if (a.predictionScore !== undefined && b.predictionScore !== undefined) { if (a.predictionScore !== b.predictionScore) { return b.predictionScore - a.predictionScore; } }
      return a.timestamp - b.timestamp;
    });
  }
  public async prefetchNow<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, config: PrefetchConfig = {}): Promise<void> {
    const key = this.getQueryKeyString(queryKey);
    const startTime = Date.now();
    try {
      this.totalPrefetches++;
      await this.queryClient.prefetchQuery({ queryKey, queryFn, staleTime: config.staleTime || DEFAULT_STALE_TIME });
      this.successfulPrefetches++;
      const duration = Date.now() - startTime;
      this.recordPrefetchTime(duration);
      this.addToHistory(key);
    } catch (error) { this.failedPrefetches++; throw error; }
  }
  private addToHistory(key: string) { this.prefetchHistory.add(key); if (this.prefetchHistory.size > this.maxHistorySize) { const firstKey = this.prefetchHistory.values().next().value as string | undefined; if (firstKey) { this.prefetchHistory.delete(firstKey); } } }
  public clearHistory() { this.prefetchHistory.clear(); }
  public clearQueue() { this.prefetchQueue.clear(); }
  public reset(): void { this.clearQueue(); this.clearHistory(); this.clearInteractionHistory(); this.resetStats(); }
  public destroy(): void { if (this.networkCleanup) { this.networkCleanup(); this.networkCleanup = undefined; } this.reset(); }
  public recordInteraction(queryKey: QueryKey, type: "view" | "hover" | "click" | "focus" = "view"): void {
    const interaction: InteractionRecord = { queryKey, timestamp: Date.now(), type };
    this.interactionHistory.push(interaction);
    if (this.interactionHistory.length > this.maxInteractionHistorySize) { this.interactionHistory.shift(); }
    const key = this.getQueryKeyString(queryKey);
    this.queryAccessCounts.set(key, (this.queryAccessCounts.get(key) || 0) + 1);
    if (this.interactionHistory.length >= 2) {
      const prevInteraction = this.interactionHistory[this.interactionHistory.length - 2];
      const prevKey = this.getQueryKeyString(prevInteraction.queryKey);
      const existingSequence = this.querySequences.find((s) => s.from === prevKey && s.to === key);
      if (existingSequence) { existingSequence.count++; } else { this.querySequences.push({ from: prevKey, to: key, count: 1 }); if (this.querySequences.length > this.maxSequenceSize) { this.querySequences.shift(); } }
    }
  }
  public getPredictions(currentQueryKey?: QueryKey, limit = 5): PredictionResult[] {
    const predictions: PredictionResult[] = [];
    if (currentQueryKey) {
      const currentKey = this.getQueryKeyString(currentQueryKey);
      const sequences = this.querySequences.filter((s) => s.from === currentKey).sort((a, b) => b.count - a.count).slice(0, limit);
      sequences.forEach((seq) => { try { const queryKey = JSON.parse(seq.to); predictions.push({ queryKey, score: Math.min(seq.count / 10, 1), reason: `Frequently accessed after current query (${seq.count} times)` }); } catch {} });
    }
    const frequentQueries = Array.from(this.queryAccessCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
    frequentQueries.forEach(([key, count]) => { try { const queryKey = JSON.parse(key); if (!predictions.some((p) => this.getQueryKeyString(p.queryKey) === key)) { predictions.push({ queryKey, score: Math.min(count / 20, 1), reason: `Frequently accessed (${count} times)` }); } } catch {} });
    const recentInteractions = this.interactionHistory.slice(-10).reverse();
    recentInteractions.forEach((interaction, index) => {
      const key = this.getQueryKeyString(interaction.queryKey);
      if (!predictions.some((p) => this.getQueryKeyString(p.queryKey) === key)) {
        predictions.push({ queryKey: interaction.queryKey, score: Math.max(0.3 - index * 0.03, 0.1), reason: `Recently accessed (${index + 1} queries ago)` });
      }
    });
    return predictions.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  public async prefetchPredicted(currentQueryKey: QueryKey | undefined, queryFnMap: Map<string, QueryFunction<any>>, config: PrefetchConfig = {}): Promise<void> {
    const predictions = this.getPredictions(currentQueryKey);
    for (const prediction of predictions) {
      const key = this.getQueryKeyString(prediction.queryKey);
      const queryFn = queryFnMap.get(key);
      if (queryFn) {
        const taskConfig = { ...config, priority: prediction.score > 0.7 ? "high" : prediction.score > 0.4 ? "medium" : "low" } as PrefetchConfig;
        const added = this.addPrefetchTask(prediction.queryKey, queryFn, taskConfig);
        if (added) { const task = this.prefetchQueue.get(key); if (task) { task.predictionScore = prediction.score; } }
      }
    }
  }
  public clearInteractionHistory(): void { this.interactionHistory = []; this.queryAccessCounts.clear(); this.querySequences = []; }
  private recordPrefetchTime(duration: number): void { this.prefetchTimes.push(duration); if (this.prefetchTimes.length > this.maxPrefetchTimesSize) { this.prefetchTimes.shift(); } }
  private getAveragePrefetchTime(): number { if (this.prefetchTimes.length === 0) { return 0; } const sum = this.prefetchTimes.reduce((acc, time) => acc + time, 0); return Math.round(sum / this.prefetchTimes.length); }
  public getStats(): PrefetchStats { return { queueSize: this.prefetchQueue.size, historySize: this.prefetchHistory.size, networkSpeed: this.networkSpeed, isProcessing: this.isProcessing, totalPrefetches: this.totalPrefetches, successfulPrefetches: this.successfulPrefetches, failedPrefetches: this.failedPrefetches, averagePrefetchTime: this.getAveragePrefetchTime(), skippedPrefetches: this.skippedPrefetches }; }
  public getPerformanceReport(): { stats: PrefetchStats; successRate: number; predictions: { totalInteractions: number; uniqueQueries: number; sequencePatterns: number }; queue: { size: number; byPriority: { high: number; medium: number; low: number } } } {
    const stats = this.getStats();
    const successRate = stats.totalPrefetches > 0 ? Math.round((stats.successfulPrefetches / stats.totalPrefetches) * 100) : 0;
    const queueTasks = Array.from(this.prefetchQueue.values());
    const byPriority = { high: queueTasks.filter((t) => t.config.priority === "high").length, medium: queueTasks.filter((t) => t.config.priority === "medium").length, low: queueTasks.filter((t) => t.config.priority === "low").length };
    return { stats, successRate, predictions: { totalInteractions: this.interactionHistory.length, uniqueQueries: this.queryAccessCounts.size, sequencePatterns: this.querySequences.length }, queue: { size: this.prefetchQueue.size, byPriority } };
  }
  public resetStats(): void { this.totalPrefetches = 0; this.successfulPrefetches = 0; this.failedPrefetches = 0; this.skippedPrefetches = 0; this.prefetchTimes = []; }
  private getQueryKeyString(queryKey: QueryKey): string { return JSON.stringify(queryKey); }
  private delay(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
  public setMaxQueueSize(size: number): void { this.maxQueueSize = size; }
  public setMaxHistorySize(size: number): void { this.maxHistorySize = size; }
  public getQueuedTasks(): PrefetchTask[] { return Array.from(this.prefetchQueue.values()); }
  public removeTask(queryKey: QueryKey): boolean { const key = this.getQueryKeyString(queryKey); return this.prefetchQueue.delete(key); }
  public hasTask(queryKey: QueryKey): boolean { const key = this.getQueryKeyString(queryKey); return this.prefetchQueue.has(key); }
  public updateTaskPriority(queryKey: QueryKey, priority: "high" | "medium" | "low"): boolean { const key = this.getQueryKeyString(queryKey); const task = this.prefetchQueue.get(key); if (task) { task.config.priority = priority; return true; } return false; }
  public pauseQueue(): void { this.isProcessing = true; }
  public resumeQueue(): void { this.isProcessing = false; this.processQueue(); }
}
let prefetchManagerInstance: SmartPrefetchManager | null = null;
export function getPrefetchManager(queryClient: QueryClient): SmartPrefetchManager { if (!prefetchManagerInstance) { prefetchManagerInstance = new SmartPrefetchManager(queryClient); } return prefetchManagerInstance; }
export function resetPrefetchManager() { prefetchManagerInstance = null; }