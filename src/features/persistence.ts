import type { Query } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { TIME_CONSTANTS } from "../core/config.js";

function isSerializable(data: unknown): boolean {
  try { JSON.stringify(data); return true; } catch { return false; }
}
function handleStorageQuotaError(error: unknown, key: string): void {
  if (error instanceof Error && error.name === "QuotaExceededError") {
    try { window.localStorage.removeItem(key); } catch {}
  }
}
function createSafeStorage(storage: Storage, key: string): Storage {
  return {
    getItem: (storageKey: string) => { try { return storage.getItem(storageKey); } catch { return null; } },
    setItem: (storageKey: string, value: string) => { try { storage.setItem(storageKey, value); } catch (error) { handleStorageQuotaError(error, key); } },
    removeItem: (storageKey: string) => { try { storage.removeItem(storageKey); } catch {} },
    clear: () => { try { storage.clear(); } catch {} },
    key: (index: number) => { try { return storage.key(index); } catch { return null; } },
    get length() {
      try { return storage.length; } catch { return 0; }
    }
  } as Storage;
}
export interface PersistOptions { maxAge?: number; onlyPersistSuccess?: boolean; dehydrateOptions?: { shouldDehydrateQuery?: (query: Query) => boolean } }
export function createPersistOptions(config: Partial<PersistOptions> = {}): { maxAge: number; dehydrateOptions?: { shouldDehydrateQuery?: (query: Query) => boolean } } {
  const { maxAge = TIME_CONSTANTS.ONE_DAY, onlyPersistSuccess = true, dehydrateOptions } = config;
  return {
    maxAge,
    dehydrateOptions: {
      ...dehydrateOptions,
      shouldDehydrateQuery:
        dehydrateOptions?.shouldDehydrateQuery ||
        (onlyPersistSuccess
          ? (query: Query) => {
              if (query.state.status !== "success") return false;
              if (!isSerializable(query.state.data)) return false;
              return true;
            }
          : undefined)
    }
  };
}
export function createPersister(storageKey = "tanstack-query-cache", storage?: Storage, onError?: (error: Error) => void): Persister | undefined {
  if (typeof window === "undefined") { return undefined; }
  const targetStorage = storage || window.localStorage;
  if (!targetStorage) { return undefined; }
  try {
    const safeStorage = createSafeStorage(targetStorage, storageKey);
    const persister: Persister = {
      persistClient: async (client: PersistedClient) => { try { safeStorage.setItem(storageKey, JSON.stringify(client)); } catch (e) { if (onError && e instanceof Error) { onError(e); } } },
      restoreClient: async () => { try { const raw = safeStorage.getItem(storageKey); return raw ? (JSON.parse(raw) as PersistedClient) : undefined; } catch (e) { if (onError && e instanceof Error) { onError(e); } return undefined; } },
      removeClient: async () => { try { safeStorage.removeItem(storageKey); } catch (e) { if (onError && e instanceof Error) { onError(e); } } }
    };
    return persister;
  } catch { return undefined; }
}
export function clearCache(key = "tanstack-query-cache"): void { try { window.localStorage.removeItem(key); } catch {} }
export function clearExpiredCache(key = "tanstack-query-cache", maxAge = TIME_CONSTANTS.ONE_DAY): void {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return;
    const parsed = JSON.parse(stored) as PersistedClient;
    const now = Date.now();
    if (parsed.timestamp && now - parsed.timestamp > maxAge) { window.localStorage.removeItem(key); }
  } catch {}
}
export async function migrateToIndexedDB(localStorageKey = "tanstack-query-cache", indexedDBKey = "tanstack-query-cache", indexedDBStorage: Storage | { setItem: (key: string, value: string) => Promise<void> }): Promise<boolean> {
  try {
    const localData = window.localStorage.getItem(localStorageKey);
    if (!localData) { return true; }
    const parsed = JSON.parse(localData) as PersistedClient;
    if (!parsed.clientState) { return false; }
    const setItemResult = indexedDBStorage.setItem(indexedDBKey, localData);
    if (setItemResult instanceof Promise) { await setItemResult; }
    window.localStorage.removeItem(localStorageKey);
    return true;
  } catch { return false; }
}
export function checkStorageSize(key = "tanstack-query-cache"): { sizeInBytes: number; sizeInMB: number; shouldMigrate: boolean; message: string } {
  try {
    const data = window.localStorage.getItem(key);
    if (!data) { return { sizeInBytes: 0, sizeInMB: 0, shouldMigrate: false, message: "No cache data found" }; }
    const sizeInBytes = new Blob([data]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    const shouldMigrate = sizeInMB > 5;
    return { sizeInBytes, sizeInMB: Math.round(sizeInMB * 100) / 100, shouldMigrate, message: shouldMigrate ? `Cache size (${sizeInMB.toFixed(2)}MB) exceeds recommended limit. Consider migrating to IndexedDB.` : `Cache size (${sizeInMB.toFixed(2)}MB) is within acceptable range.` };
  } catch { return { sizeInBytes: 0, sizeInMB: 0, shouldMigrate: false, message: "Failed to check storage size" }; }
}
export function getStorageStats(key = "tanstack-query-cache"): { exists: boolean; age?: number; queriesCount?: number; mutationsCount?: number; sizeInfo: ReturnType<typeof checkStorageSize> } {
  try {
    const data = window.localStorage.getItem(key);
    if (!data) { return { exists: false, sizeInfo: checkStorageSize(key) }; }
    const parsed = JSON.parse(data) as PersistedClient;
    const now = Date.now();
    const age = parsed.timestamp ? now - parsed.timestamp : undefined;
    return { exists: true, age, queriesCount: parsed.clientState?.queries?.length, mutationsCount: parsed.clientState?.mutations?.length, sizeInfo: checkStorageSize(key) };
  } catch { return { exists: false, sizeInfo: checkStorageSize(key) }; }
}
export type { PersistedClient, Persister };
