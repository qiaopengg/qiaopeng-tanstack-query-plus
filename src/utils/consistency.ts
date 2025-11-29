import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { EntityWithId } from "../types/selectors";
import { listUpdater } from "./optimisticUtils.js";
function ensureArray(key: QueryKey): unknown[] { return Array.isArray(key) ? key as unknown[] : [key as unknown]; }
function deepEqual(a: unknown, b: unknown): boolean { if (a === b) return true; if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } } return false; }
export function startsWithKeyPrefix(key: QueryKey, prefix: QueryKey): boolean { const k = ensureArray(key); const p = ensureArray(prefix); if (p.length > k.length) return false; for (let i = 0; i < p.length; i++) { const a = k[i]; const b = p[i]; if (!(a === b || deepEqual(a, b))) return false; } return true; }
export type FamilySyncConfig = { idField?: string; listSelector?: (data: unknown) => { items: EntityWithId[]; total?: number } | null; writeBack?: (old: unknown, items: EntityWithId[], total?: number) => unknown; maxKeys?: number; enableForOperations?: Array<"update" | "delete"> };
export function defaultListSelector(data: unknown): { items: EntityWithId[]; total?: number } | null {
  if (!data) return null;
  if (Array.isArray(data)) return { items: data as EntityWithId[] };
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return { items: obj.items as EntityWithId[], total: typeof obj.total === "number" ? (obj.total as number) : undefined };
    if (Array.isArray((obj as any).Rows)) return { items: (obj as any).Rows as EntityWithId[], total: typeof (obj as any).Total === "number" ? (obj as any).Total : undefined };
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
export const DEFAULT_FAMILY_SYNC: FamilySyncConfig = { idField: "id", listSelector: defaultListSelector, writeBack: defaultWriteBack, maxKeys: 50, enableForOperations: ["update", "delete"] };
export function syncEntityAcrossFamily(queryClient: QueryClient, familyPrefix: QueryKey, cfg: FamilySyncConfig, operation: string, payload: Partial<EntityWithId>): void {
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
    if (op === "update" && idValue !== undefined) { items = listUpdater.update(items, { ...(payload as any), id: idValue } as any) as any; }
    else if (op === "delete" && idValue !== undefined) { items = listUpdater.remove(items, idValue) as any; }
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
      const exists = items.some(item => (item as any)[idField] === idValue);
      if (exists) {
        items = listUpdater.update(items, { ...(payload as any), id: idValue } as any) as any;
        shouldUpdate = true;
      }
    } else if (op === "delete" && idValue !== undefined) {
      const exists = items.some(item => (item as any)[idField] === idValue);
      if (exists) {
        items = listUpdater.remove(items, idValue) as any;
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
