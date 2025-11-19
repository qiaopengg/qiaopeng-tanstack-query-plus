import type { EntityWithId, PaginatedData } from "../types/selectors";
export function selectById<T extends EntityWithId>(id: T["id"]) { return (data: T[] | undefined): T | undefined => { return data?.find((item) => item.id === id); }; }
export function selectByIds<T extends EntityWithId>(ids: T["id"][]) { return (data: T[] | undefined): T[] => { if (!data) return []; return data.filter((item) => ids.includes(item.id)); }; }
export function selectFirst<T>(data: T[] | undefined): T | undefined { return data?.[0]; }
export function selectLast<T>(data: T[] | undefined): T | undefined { if (!data || data.length === 0) return undefined; return data[data.length - 1]; }
export function selectCount<T>(data: T[] | undefined): number { return data?.length ?? 0; }
export function selectTotal<T extends { total?: number }>(data: T | undefined): number { return data?.total ?? 0; }
export function selectItems<TItem, T extends PaginatedData<TItem>>(data: T | undefined): TItem[] { return data?.items ?? []; }
export function selectWhere<T>(predicate: (item: T) => boolean) { return (data: T[] | undefined): T[] => { if (!data) return []; return data.filter(predicate); }; }
export function selectMap<T, R>(mapper: (item: T) => R) { return (data: T[] | undefined): R[] => { if (!data) return []; return data.map(mapper); }; }
export function selectField<T, K extends keyof T>(field: K) { return (data: T | undefined): T[K] | undefined => { return data?.[field]; }; }
export function selectFields<T, K extends keyof T>(fields: K[]) { return (data: T | undefined): Pick<T, K> | undefined => { if (!data) return undefined; const result = {} as Pick<T, K>; fields.forEach((field) => { result[field] = data[field]; }); return result; }; }
export function compose<T, R1, R2>(selector1: (data: T) => R1, selector2: (data: R1) => R2) { return (data: T): R2 => { return selector2(selector1(data)); }; }
export const selectors = { byId: selectById, byIds: selectByIds, first: selectFirst, last: selectLast, count: selectCount, total: selectTotal, items: selectItems, where: selectWhere, map: selectMap, field: selectField, fields: selectFields, compose };