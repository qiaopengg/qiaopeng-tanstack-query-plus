import type { QueryKey } from "@tanstack/react-query";

export interface NormalizeConfig<T = any> { required?: (keyof T)[]; defaults?: Partial<T>; sortKeys?: boolean; removeEmpty?: boolean }
export function normalizeQueryParams<T extends Record<string, any>>(params: T | undefined, config: NormalizeConfig<T> = {}): Record<string, any> {
  const { required = [], defaults = {}, sortKeys = true, removeEmpty = true } = config;
  if (!params) { return { ...defaults }; }
  const normalized: Record<string, any> = {};
  required.forEach((key) => {
    const value = params[key] ?? (defaults as any)[key];
    if (value !== undefined) {
      if (typeof value === "number" || (typeof value === "string" && !Number.isNaN(Number(value)))) { normalized[String(key)] = Number(value); } else { normalized[String(key)] = value; }
    }
  });
  const optionalKeys = Object.keys(params).filter((key) => !required.includes(key as keyof T));
  if (sortKeys) { optionalKeys.sort(); }
  optionalKeys.forEach((key) => {
    const value = params[key];
    if (removeEmpty && (value === undefined || value === null || value === "")) { return; }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed || !removeEmpty) { normalized[key] = trimmed; }
    } else if (value !== undefined && value !== null) {
      normalized[key] = value;
    }
  });
  return normalized;
}
export interface QueryKeyFactoryConfig<TParams = any> { namespace: string; normalizeConfig?: NormalizeConfig<TParams> }
export interface QueryKeyFactory<TParams = any> { all: () => readonly [string]; lists: () => readonly [string, string]; list: (params?: TParams) => readonly [string, string, Record<string, any>]; details: () => readonly [string, string]; detail: (id: string) => readonly [string, string, string]; custom: (queryName: string, params?: any) => readonly [string, string, string, any?] }
export function createQueryKeyFactory<TParams = any>(config: QueryKeyFactoryConfig<TParams>): QueryKeyFactory<TParams> {
  const { namespace, normalizeConfig } = config;
  return {
    all: () => [namespace] as const,
    lists: () => [namespace, "list"] as const,
    list: (params?: TParams) => { const normalized = normalizeQueryParams(params as any, normalizeConfig); return [namespace, "list", normalized] as const; },
    details: () => [namespace, "detail"] as const,
    detail: (id: string) => [namespace, "detail", id] as const,
    custom: (queryName: string, params?: any) => { if (params !== undefined) { return [namespace, "custom", queryName, params] as const; } return [namespace, "custom", queryName] as const; }
  };
}
export function createSimpleQueryKeyFactory(namespace: string): QueryKeyFactory { return createQueryKeyFactory({ namespace }); }
export function isQueryKeyEqual(key1: readonly any[], key2: readonly any[]): boolean {
  if (key1.length !== key2.length) return false;
  return key1.every((value, index) => {
    const other = key2[index];
    if (typeof value !== "object" || value === null) { return value === other; }
    if (typeof other !== "object" || other === null) { return false; }
    const keys1 = Object.keys(value); const keys2 = Object.keys(other);
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key) => (value as any)[key] === (other as any)[key]);
  });
}
export function extractParamsFromKey(queryKey: readonly any[]): Record<string, any> | undefined {
  const lastItem = queryKey[queryKey.length - 1];
  if (typeof lastItem === "object" && lastItem !== null && !Array.isArray(lastItem)) { return lastItem; }
  return undefined;
}

export function startsWithKeyPrefix(key: QueryKey, prefix: QueryKey): boolean {
  const k = Array.isArray(key) ? key : [key];
  const p = Array.isArray(prefix) ? prefix : [prefix];
  if (p.length > k.length) return false;
  for (let i = 0; i < p.length; i++) {
    if (JSON.stringify(k[i]) !== JSON.stringify(p[i])) {
      return false;
    }
  }
  return true;
}
