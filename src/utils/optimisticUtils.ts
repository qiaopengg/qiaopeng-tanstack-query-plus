import type { QueryKey } from "@tanstack/react-query";
import type { ListOperationConfig, OptimisticUpdateConfig, OptimisticOperationTypeValue } from "../types/optimistic";
import type { EntityWithId } from "../types/selectors";
import { ListOperationType } from "../types/optimistic.js";
/**
 * Loose equality check for IDs (string vs number)
 */
export function idsAreEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a) === String(b);
}

export const listUpdater = {
  add: <T extends EntityWithId>(items: T[] | undefined, newItem: T): T[] => {
    const currentItems = items || [];
    const existingIndex = currentItems.findIndex((item) => idsAreEqual(item.id, newItem.id));
    if (existingIndex >= 0) {
      const updatedItems = [...currentItems];
      updatedItems[existingIndex] = newItem;
      return updatedItems;
    }
    return [newItem, ...currentItems];
  },
  update: <T extends EntityWithId>(items: T[] | undefined, updatedItem: Partial<T> & { id: T["id"] }): T[] => {
    const currentItems = items || [];
    return currentItems.map((item) => (idsAreEqual(item.id, updatedItem.id) ? { ...item, ...updatedItem } : item));
  },
  remove: <T extends EntityWithId>(items: T[] | undefined, itemId: T["id"]): T[] => {
    const currentItems = items || [];
    return currentItems.filter((item) => !idsAreEqual(item.id, itemId));
  }
};
export function createAddItemConfig<T extends EntityWithId>(queryKey: QueryKey, options?: { addToTop?: boolean; onRollback?: (error: Error) => void }): OptimisticUpdateConfig<T[], T> {
  return { queryKey, updater: (oldData: T[] | undefined, newItem: T) => { const currentItems = oldData || []; if (options?.addToTop !== false) { return [newItem, ...currentItems]; } return [...currentItems, newItem]; }, rollback: options?.onRollback ? (_previousData: T[], error: Error) => { options.onRollback!(error); } : undefined, enabled: true };
}
export function createUpdateItemConfig<T extends EntityWithId>(queryKey: QueryKey, options?: { onRollback?: (error: Error) => void }): OptimisticUpdateConfig<T[], Partial<T> & { id: T["id"] }> {
  return { queryKey, updater: (oldData: T[] | undefined, updatedItem: Partial<T> & { id: T["id"] }) => { return listUpdater.update(oldData, updatedItem); }, rollback: options?.onRollback ? (_previousData: T[], error: Error) => { options.onRollback!(error); } : undefined, enabled: true };
}
export function createRemoveItemConfig<T extends EntityWithId>(queryKey: QueryKey, options?: { onRollback?: (error: Error) => void }): OptimisticUpdateConfig<T[], T["id"]> {
  return { queryKey, updater: (oldData: T[] | undefined, itemId: T["id"]) => { return listUpdater.remove(oldData, itemId); }, rollback: options?.onRollback ? (_previousData: T[], error: Error) => { options.onRollback!(error); } : undefined, enabled: true };
}
export type ListOperationVariables<T extends EntityWithId, TOperation extends ListOperationType> = TOperation extends ListOperationType.ADD ? T : TOperation extends ListOperationType.UPDATE ? Partial<T> & { id: T["id"] } : TOperation extends ListOperationType.REMOVE ? T["id"] : never;
export function createListOperationConfig<T extends EntityWithId, TOperation extends ListOperationType = ListOperationType>(config: ListOperationConfig<T>): OptimisticUpdateConfig<T[], ListOperationVariables<T, TOperation>> {
  return {
    queryKey: config.queryKey,
    updater: (oldData: T[] | undefined, variables: ListOperationVariables<T, TOperation>) => {
      switch (config.operation) {
        case ListOperationType.ADD:
          return listUpdater.add(oldData, variables as T);
        case ListOperationType.UPDATE:
          return listUpdater.update(oldData, variables as Partial<T> & { id: T["id"] });
        case ListOperationType.REMOVE:
          return listUpdater.remove(oldData, variables as T["id"]);
        default:
          return oldData || [];
      }
    },
    rollback: config.onRollback
      ? (previousData: T[], error: Error) => {
          const opType: OptimisticOperationTypeValue = config.operation === ListOperationType.ADD
            ? "create"
            : config.operation === ListOperationType.REMOVE
            ? "delete"
            : "update";
          config.onRollback!(error, { previousData, timestamp: Date.now(), operationType: opType });
        }
      : undefined,
    enabled: true
  };
}
export function batchUpdateItems<T extends EntityWithId>(items: T[] | undefined | null, updates: Array<Partial<T> & { id: T["id"] }>): T[] {
  let currentItems = items || [];
  updates.forEach((update) => { currentItems = listUpdater.update(currentItems, update); });
  return currentItems;
}
export function batchRemoveItems<T extends EntityWithId>(items: T[] | undefined | null, itemIds: Array<T["id"]>): T[] {
  let currentItems = items || [];
  itemIds.forEach((itemId) => { currentItems = listUpdater.remove(currentItems, itemId); });
  return currentItems;
}
export function reorderItems<T extends EntityWithId>(items: T[] | undefined | null, fromIndex: number, toIndex: number): T[] {
  const currentItems = [...(items || [])];
  if (fromIndex < 0 || fromIndex >= currentItems.length || toIndex < 0 || toIndex >= currentItems.length) { return currentItems; }
  const [movedItem] = currentItems.splice(fromIndex, 1);
  currentItems.splice(toIndex, 0, movedItem);
  return currentItems;
}
export function conditionalUpdateItems<T extends EntityWithId>(items: T[] | undefined | null, predicate: (item: T) => boolean, updater: (item: T) => Partial<T>): T[] {
  const currentItems = items || [];
  return currentItems.map((item) => { if (predicate(item)) { return { ...item, ...updater(item) }; } return item; });
}
export function applyListOperationToPaginated<T extends EntityWithId>(data: { items: T[]; total?: number }, operation: ListOperationType, payload: Partial<T>): { items: T[]; total?: number } {
  let items = data.items || [];
  if (operation === ListOperationType.ADD) { items = listUpdater.add(items, payload as T); }
  else if (operation === ListOperationType.UPDATE) { items = listUpdater.update(items, payload as Partial<T> & { id: T["id"] }); }
  else if (operation === ListOperationType.REMOVE) { const id = (payload as any)?.id; items = listUpdater.remove(items, id); }
  const total = typeof data.total === "number"
    ? operation === ListOperationType.ADD
      ? data.total + 1
      : operation === ListOperationType.REMOVE
      ? Math.max(0, data.total - 1)
      : data.total
    : data.total;
  return { ...data, items, total };
}
