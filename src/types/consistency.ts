import type { QueryKey } from "@tanstack/react-query";
export type ConsistencyMode = "invalidate" | "sync+invalidate";
export interface FamilyConsistencyOptions {
  baseKey: QueryKey;
  mode?: ConsistencyMode;
  idField?: string;
  listSelector?: (data: unknown) => unknown[] | { items: unknown[]; total?: number } | null;
  maxKeys?: number;
}
