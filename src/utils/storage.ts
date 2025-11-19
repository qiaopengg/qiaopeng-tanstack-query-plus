import type { StorageInfo } from "../types/persistence";
import { StorageType } from "../types/base.js";
function getStorageByType(storageType: StorageType): Storage | null {
  try {
    switch (storageType) {
      case StorageType.LOCAL:
        return typeof window !== "undefined" ? window.localStorage : null;
      case StorageType.SESSION:
        return typeof window !== "undefined" ? window.sessionStorage : null;
      default:
        return null;
    }
  } catch { return null; }
}
export function isStorageAvailable(storageType: StorageType): boolean {
  try {
    const storage = getStorageByType(storageType);
    if (!storage) { return false; }
    const testKey = "__storage_test__";
    storage.setItem(testKey, "test");
    storage.removeItem(testKey);
    return true;
  } catch { return false; }
}
export function getStorageUsage(storageType: StorageType): StorageInfo {
  try {
    const storage = getStorageByType(storageType);
    if (!storage) { return { type: storageType, used: 0, total: 0, usage: 0, available: false, error: "Storage not available" }; }
    let used = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const value = storage.getItem(key);
        if (value) { used += key.length + value.length; }
      }
    }
    const total = storageType === StorageType.LOCAL ? 5 * 1024 * 1024 : 5 * 1024 * 1024;
    return { type: storageType, used, total, usage: used / total, available: true };
  } catch (error) {
    return { type: storageType, used: 0, total: 0, usage: 0, available: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
export function formatBytes(bytes: number): string {
  if (bytes === 0) { return "0 Bytes"; }
  const k = 1024; const sizes = ["Bytes", "KB", "MB", "GB"]; const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") { return obj; }
  if ((obj as any) instanceof Date) { return new Date((obj as any).getTime()) as T; }
  if (Array.isArray(obj)) { return obj.map((item) => deepClone(item)) as T; }
  if (typeof obj === "object") { const cloned = {} as T; for (const key in obj as any) { if (Object.prototype.hasOwnProperty.call(obj as any, key)) { (cloned as any)[key] = deepClone((obj as any)[key]); } } return cloned; }
  return obj;
}