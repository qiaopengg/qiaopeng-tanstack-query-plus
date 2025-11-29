import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { EntityWithId } from "../types/selectors";
import { listUpdater } from "./optimisticUtils.js";

function ensureArray(key: QueryKey): unknown[] {
  return Array.isArray(key) ? (key as unknown[]) : [key as unknown];
}

/**
 * Robust deep equality check that handles object key order and common types
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a && b && typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    // Handle plain objects
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    // Check if all keys in A exist in B and values are deep equal
    // Key order doesn't matter here because we look up by key
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual((a as any)[key], (b as any)[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Loose equality check for IDs (string vs number)
 */
function idsAreEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a) === String(b);
}

export function startsWithKeyPrefix(key: QueryKey, prefix: QueryKey): boolean {
  const k = ensureArray(key);
  const p = ensureArray(prefix);

  if (p.length > k.length) return false;

  for (let i = 0; i < p.length; i++) {
    const a = k[i];
    const b = p[i];

    // Check for equality using robust deepEqual
    if (!deepEqual(a, b)) {
      return false;
    }
  }
  return true;
}

export type FamilySyncConfig = {
  idField?: string;
  listSelector?: (data: unknown) => { items: EntityWithId[]; total?: number } | null;
  writeBack?: (old: unknown, items: EntityWithId[], total?: number) => unknown;
  maxKeys?: number;
  enableForOperations?: Array<"update" | "delete">;
};

export function defaultListSelector(data: unknown): { items: EntityWithId[]; total?: number } | null {
  if (!data) return null;
  if (Array.isArray(data)) return { items: data as EntityWithId[] };
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items))
      return {
        items: obj.items as EntityWithId[],
        total: typeof obj.total === "number" ? (obj.total as number) : undefined
      };
    if (Array.isArray((obj as any).Rows))
      return {
        items: (obj as any).Rows as EntityWithId[],
        total: typeof (obj as any).Total === "number" ? (obj as any).Total : undefined
      };
  }
  return null;
}

export function defaultWriteBack(old: unknown, items: EntityWithId[], total?: number): unknown {
  if (old && typeof old === "object") {
    const obj = { ...(old as any) };
    if (Array.isArray((obj as any).Rows)) {
      obj.Rows = items;
      if (typeof total !== "undefined") obj.Total = total;
      return obj;
    }
    if (Array.isArray((obj as any).items)) {
      obj.items = items;
      if (typeof total !== "undefined") obj.total = total;
      return obj;
    }
  }
  return { items, total };
}

export const DEFAULT_FAMILY_SYNC: FamilySyncConfig = {
  idField: "id",
  listSelector: defaultListSelector,
  writeBack: defaultWriteBack,
  maxKeys: 50,
  enableForOperations: ["update", "delete"]
};

export function syncEntityAcrossFamily(
  queryClient: QueryClient,
  familyPrefix: QueryKey,
  cfg: FamilySyncConfig,
  operation: string,
  payload: Partial<EntityWithId>
): void {
  const enabledOps = cfg.enableForOperations ?? ["update", "delete"];
  const op = String(operation).toLowerCase();
  if (!enabledOps.includes(op as any)) return;

  const idField = cfg.idField ?? "id";
  const cache = queryClient.getQueryCache();
  const queries = cache.findAll({ predicate: (q) => startsWithKeyPrefix(q.queryKey as unknown[], familyPrefix) });
  const limited = typeof cfg.maxKeys === "number" && cfg.maxKeys > 0 ? queries.slice(0, cfg.maxKeys) : queries;

  limited.forEach((q) => {
    const key = q.queryKey as QueryKey;
    const old = queryClient.getQueryData(key);
    const picked = (cfg.listSelector ?? defaultListSelector)(old);
    if (!picked || !Array.isArray(picked.items)) return;

    const idValue = (payload as any)?.[idField];
    let items = picked.items as EntityWithId[];
    
    if (op === "update" && idValue !== undefined) {
       // Use custom listUpdater logic but ensure ID matching is robust if listUpdater uses strict equality
       // Since listUpdater is imported, we should ideally modify it too or handle it here.
       // For now, let's modify how we find the item index if we were doing it manually, 
       // but listUpdater is a black box here.
       // Assuming listUpdater uses strict equality, we might have a problem if we pass '1' and item has 1.
       // But listUpdater.update usually takes the whole object.
       
       // To be safe, we should ensure the payload ID matches the type of the item ID in the list if possible.
       // Or, we rely on listUpdater being robust.
       // Let's look at listUpdater implementation later. For now, let's assume we need to fix the ID type in payload if possible.
       
       // Actually, the safer way is to find the item using loose equality, get its strict ID, and use that in payload.
       const existingItem = items.find(item => idsAreEqual((item as any)[idField], idValue));
       if (existingItem) {
         const strictId = (existingItem as any)[idField];
         items = listUpdater.update(items, { ...(payload as any), [idField]: strictId } as any) as any;
       }
    } else if (op === "delete" && idValue !== undefined) {
       const existingItem = items.find(item => idsAreEqual((item as any)[idField], idValue));
       if (existingItem) {
          const strictId = (existingItem as any)[idField];
          items = listUpdater.remove(items, strictId) as any;
       }
    }

    const total = typeof picked.total === "number" && op === "delete" ? Math.max(0, picked.total - 1) : picked.total;
    const next = (cfg.writeBack ?? defaultWriteBack)(old, items, total);
    queryClient.setQueryData(key, next as any);
  });
}

export function syncEntityAcrossFamilyOptimistic(
  queryClient: QueryClient,
  familyPrefix: QueryKey,
  cfg: FamilySyncConfig,
  operation: string,
  payload: Partial<EntityWithId>
): Array<{ queryKey: QueryKey; previousData: unknown }> {
  const rollbackData: Array<{ queryKey: QueryKey; previousData: unknown }> = [];
  const enabledOps = cfg.enableForOperations ?? ["update", "delete"];
  const op = String(operation).toLowerCase();
  if (!enabledOps.includes(op as any)) return rollbackData;

  const idField = cfg.idField ?? "id";
  const cache = queryClient.getQueryCache();
  const queries = cache.findAll({ predicate: (q) => startsWithKeyPrefix(q.queryKey as unknown[], familyPrefix) });
  const limited = typeof cfg.maxKeys === "number" && cfg.maxKeys > 0 ? queries.slice(0, cfg.maxKeys) : queries;

  limited.forEach((q) => {
    const key = q.queryKey as QueryKey;
    const old = queryClient.getQueryData(key);

    const picked = (cfg.listSelector ?? defaultListSelector)(old);
    if (!picked || !Array.isArray(picked.items)) return;

    const idValue = (payload as any)?.[idField];
    let items = picked.items as EntityWithId[];
    let shouldUpdate = false;

    if (op === "update" && idValue !== undefined) {
      // Robust ID check
      const existingItem = items.find(item => idsAreEqual((item as any)[idField], idValue));
      
      if (existingItem) {
        const strictId = (existingItem as any)[idField];
        // Ensure payload uses the correct ID type from the store
        items = listUpdater.update(items, { ...(payload as any), [idField]: strictId } as any) as any;
        shouldUpdate = true;
      }
    } else if (op === "delete" && idValue !== undefined) {
      const existingItem = items.find(item => idsAreEqual((item as any)[idField], idValue));
      if (existingItem) {
        const strictId = (existingItem as any)[idField];
        items = listUpdater.remove(items, strictId) as any;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      rollbackData.push({ queryKey: key, previousData: old });
      const total = typeof picked.total === "number" && op === "delete" ? Math.max(0, picked.total - 1) : picked.total;
      const next = (cfg.writeBack ?? defaultWriteBack)(old, items, total);
      queryClient.setQueryData(key, next as any);
    }
  });

  return rollbackData;
}
