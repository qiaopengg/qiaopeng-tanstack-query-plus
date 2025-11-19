import type { QueryClient } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
export enum StorageType { LOCAL = "localStorage", SESSION = "sessionStorage", INDEXED_DB = "indexedDB", CUSTOM = "custom" }
export enum ConnectionQuality { SLOW = "slow", FAST = "fast", UNKNOWN = "unknown" }
export enum CachePriority { HIGH = "high", MEDIUM = "medium", LOW = "low" }
export enum PersistenceStrategyType { AGGRESSIVE = "aggressive", CONSERVATIVE = "conservative", SELECTIVE = "selective", CUSTOM = "custom" }
export interface OperationResult<T = unknown> { success: boolean; data?: T; error?: Error; duration?: number; metadata?: Record<string, unknown> }
export interface NetworkInformation { effectiveType?: "4g" | "3g" | "2g" | "slow-2g"; saveData?: boolean; downlink?: number; rtt?: number }
export interface NetworkStatus { isOnline: boolean; isOffline: boolean; connectionQuality: ConnectionQuality; connection?: NetworkInformation; lastOnlineAt?: Date; lastOfflineAt?: Date }
export type DeepReadonly<T> = { readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P] };
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type { PersistedClient, Persister, QueryClient };