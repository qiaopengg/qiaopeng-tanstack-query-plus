export { keepPreviousData } from "@tanstack/react-query";

export function stableListPlaceholder<T = any>(previousData: T | undefined): T | undefined {
  if (previousData === undefined || previousData === null) return previousData as any;
  if (Array.isArray(previousData)) {
    return [] as any;
  }
  if (typeof previousData === "object") {
    const obj = { ...(previousData as any) };
    if (Array.isArray(obj.Rows)) {
      obj.Rows = [];
      if (typeof obj.Total === "number") obj.Total = obj.Total;
      return obj as T;
    }
    if (Array.isArray(obj.items)) {
      obj.items = [];
      if (typeof obj.total === "number") obj.total = obj.total;
      return obj as T;
    }
    if (Array.isArray(obj.data)) {
      obj.data = [];
      return obj as T;
    }
  }
  return previousData as any;
}
