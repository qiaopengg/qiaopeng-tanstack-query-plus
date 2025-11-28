import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface FamilyQueryMatchOptions {
  baseKey: QueryKey;
  maxKeys?: number;
}

function isObjectEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

function startsWithKey(key: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length > key.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (!isObjectEqual(key[i], prefix[i])) return false;
  }
  return true;
}

export function findFamilyQueries(queryClient: QueryClient, options: FamilyQueryMatchOptions): QueryKey[] {
  const { baseKey, maxKeys } = options;
  const queries = queryClient.getQueryCache().findAll({ predicate: (q) => startsWithKey(q.queryKey as QueryKey, baseKey) });
  const keys = queries.map((q) => q.queryKey as QueryKey);
  if (typeof maxKeys === "number" && maxKeys > 0) {
    return keys.slice(0, maxKeys);
  }
  return keys;
}

function updateArrayById(items: unknown[] | undefined, updated: Record<string, unknown>, idField: string): unknown[] {
  const list = Array.isArray(items) ? items : [];
  const id = updated[idField];
  if (id === undefined) return list;
  return list.map((item) => {
    const currentId = (item as Record<string, unknown>)[idField];
    if (currentId === id) {
      return { ...(item as Record<string, unknown>), ...updated };
    }
    return item;
  });
}

export function syncEntityAcrossFamily(queryClient: QueryClient, keys: QueryKey[], updatedEntity: unknown, options: { idField?: string; listSelector?: (data: unknown) => unknown[] | { items: unknown[]; total?: number } | null }): void {
  const idField = options.idField ?? "id";
  keys.forEach((key) => {
    const oldData = queryClient.getQueryData(key) as unknown;
    if (Array.isArray(oldData)) {
      const next = updateArrayById(oldData, updatedEntity as Record<string, unknown>, idField);
      queryClient.setQueryData(key, next);
      return;
    }
    if (oldData && typeof oldData === "object") {
      const selector = options.listSelector;
      if (selector) {
        const selected = selector(oldData);
        if (selected === null) return;
        if (selected && Array.isArray((selected as { items: unknown[] }).items)) {
          const nextItems = updateArrayById((selected as { items: unknown[] }).items, updatedEntity as Record<string, unknown>, idField);
          const next = { ...(oldData as Record<string, unknown>), items: nextItems };
          queryClient.setQueryData(key, next);
          return;
        }
      }
      if (Object.prototype.hasOwnProperty.call(oldData as Record<string, unknown>, "items")) {
        const items = (oldData as Record<string, unknown>)["items"] as unknown[] | undefined;
        const nextItems = updateArrayById(items, updatedEntity as Record<string, unknown>, idField);
        const next = { ...(oldData as Record<string, unknown>), items: nextItems };
        queryClient.setQueryData(key, next);
      }
    }
  });
}
