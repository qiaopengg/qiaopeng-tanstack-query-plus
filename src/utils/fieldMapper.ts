import type { QueryClient } from "@tanstack/react-query";
export interface FieldMappingConfig { nameField: string; configKey: string }
export function createFieldEnricher<T = any>(queryKey: any, mappings: Record<string, FieldMappingConfig>) {
  return (data: T, queryClient: QueryClient): T => {
    const config = queryClient.getQueryData<any>(queryKey);
    if (!config) return data as T;
    const result: any = { ...(data as any) };
    Object.entries(mappings).forEach(([idField, { nameField, configKey }]) => {
      const idValue = (data as any)[idField];
      if (idValue == null) return;
      const options = config[configKey];
      if (!options?.length) return;
      const optionMap = new Map(options.map((item: any) => [String(item.value), item.label]));
      const label = optionMap.get(String(idValue));
      if (label) { result[nameField] = label; }
    });
    return result as T;
  };
}
export function createTempId(prefix = "temp"): string { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
export function createOptimisticBase(customFields?: Record<string, any>): Record<string, any> {
  const now = new Date().toISOString();
  return { createTime: now, updateTime: now, createUser: "", updateUser: "", deleteStatus: 0, ...customFields };
}