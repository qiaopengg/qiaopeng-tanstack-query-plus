export type Selector<TInput, TOutput> = (data: TInput | undefined) => TOutput;
export type EntityWithId<T = string | number> = { id: T; [key: string]: unknown };
export type PaginatedData<T> = { items: T[]; total?: number; [key: string]: unknown };