import type { QueryKey } from "@tanstack/react-query";

export const queryKeys = {
  all: ["tanstack-query"] as const,
  users: () => [...queryKeys.all, "users"] as const,
  user: (id: string) => [...queryKeys.users(), id] as const,
  userProfile: (id: string) => [...queryKeys.user(id), "profile"] as const,
  userSettings: (id: string) => [...queryKeys.user(id), "settings"] as const,
  usersByRole: (role: string) => [...queryKeys.users(), "by-role", role] as const,
  posts: () => [...queryKeys.all, "posts"] as const,
  post: (id: string) => [...queryKeys.posts(), id] as const,
  postsByUser: (userId: string) => [...queryKeys.posts(), "by-user", userId] as const,
  postsByTag: (tag: string) => [...queryKeys.posts(), "by-tag", tag] as const,
  postComments: (postId: string) => [...queryKeys.post(postId), "comments"] as const,
  search: (query: string, type?: string) => [...queryKeys.all, "search", { query, type }] as const,
  notifications: () => [...queryKeys.all, "notifications"] as const,
  notification: (id: string) => [...queryKeys.notifications(), id] as const,
  unreadNotifications: () => [...queryKeys.notifications(), "unread"] as const,
  settings: () => [...queryKeys.all, "settings"] as const,
  appSettings: () => [...queryKeys.settings(), "app"] as const,
  userPreferences: (userId: string) => [...queryKeys.settings(), "preferences", userId] as const
};

export function createFilteredKey(baseKey: QueryKey, filters: Record<string, unknown>): QueryKey {
  return [...baseKey, "filtered", filters];
}
export function createPaginatedKey(baseKey: QueryKey, page: number, pageSize: number): QueryKey {
  return [...baseKey, "paginated", { page, pageSize }];
}
export function createSortedKey(baseKey: QueryKey, sortBy: string, sortOrder: "asc" | "desc" = "asc"): QueryKey {
  return [...baseKey, "sorted", { sortBy, sortOrder }];
}
export function createSearchKey(baseKey: QueryKey, searchTerm: string, searchFields?: string[]): QueryKey {
  return [...baseKey, "search", { term: searchTerm, fields: searchFields }];
}
export function createComplexKey(
  baseKey: QueryKey,
  options: { page?: number; pageSize?: number; filters?: Record<string, unknown>; sortBy?: string; sortOrder?: "asc" | "desc"; search?: string }
): QueryKey {
  const params: Record<string, unknown> = {};
  if (options.page !== undefined && options.pageSize !== undefined) {
    params.page = options.page;
    params.pageSize = options.pageSize;
  }
  if (options.filters && Object.keys(options.filters).length > 0) {
    params.filters = options.filters;
  }
  if (options.sortBy) {
    params.sortBy = options.sortBy;
    params.sortOrder = options.sortOrder || "asc";
  }
  if (options.search) {
    params.search = options.search;
  }
  return [...baseKey, "complex", params];
}
export function matchesKeyPattern(queryKey: QueryKey, pattern: QueryKey): boolean {
  if (pattern.length > queryKey.length) return false;
  return pattern.every((patternPart, index) => {
    const keyPart = queryKey[index];
    if (typeof patternPart === "object" && typeof keyPart === "object") {
      return JSON.stringify(patternPart) === JSON.stringify(keyPart);
    }
    return patternPart === keyPart;
  });
}
export function validateQueryKey(queryKey: QueryKey): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  return queryKey.every(
    (part) => part !== null && part !== undefined && (typeof part === "string" || typeof part === "number" || typeof part === "boolean" || (typeof part === "object" && part !== null))
  );
}
export function containsEntity(queryKey: QueryKey, entity: string): boolean {
  return queryKey.includes(entity);
}
export function extractEntityId(queryKey: QueryKey, entityIndex: number): string | undefined {
  const value = queryKey[entityIndex];
  return typeof value === "string" ? value : undefined;
}
export function normalizeQueryKey(queryKey: QueryKey): QueryKey {
  return queryKey.filter((part) => part !== null && part !== undefined);
}
export function areKeysEqual(key1: QueryKey, key2: QueryKey): boolean {
  if (key1.length !== key2.length) return false;
  return key1.every((part, index) => {
    const otherPart = key2[index];
    if (typeof part === "object" && typeof otherPart === "object") {
      return JSON.stringify(part) === JSON.stringify(otherPart);
    }
    return part === otherPart;
  });
}
export function createDomainKeyFactory(domain: string) {
  return {
    all: () => [...queryKeys.all, domain] as const,
    lists: () => [...queryKeys.all, domain, "list"] as const,
    list: (params?: Record<string, unknown>) => (params ? ([...queryKeys.all, domain, "list", params] as const) : ([...queryKeys.all, domain, "list"] as const)),
    details: () => [...queryKeys.all, domain, "detail"] as const,
    detail: (id: string | number) => [...queryKeys.all, domain, "detail", id] as const,
    subResource: (id: string | number, resource: string) => [...queryKeys.all, domain, "detail", id, resource] as const,
    byRelation: (relation: string, relationId: string | number) => [...queryKeys.all, domain, `by-${relation}`, relationId] as const
  };
}
export function createMutationKeyFactory(domain: string) {
  return {
    create: () => [domain, "create"] as const,
    update: (id?: string | number) => (id ? ([domain, "update", id] as const) : ([domain, "update"] as const)),
    delete: (id?: string | number) => (id ? ([domain, "delete", id] as const) : ([domain, "delete"] as const)),
    batch: (operation: string) => [domain, "batch", operation] as const,
    custom: (operation: string, id?: string | number) => (id ? ([domain, operation, id] as const) : ([domain, operation] as const))
  };
}