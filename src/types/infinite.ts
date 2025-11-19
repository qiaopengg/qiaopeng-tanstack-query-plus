export interface CursorPaginatedResponse<T> { items: T[]; cursor?: string | null; hasMore?: boolean }
export interface OffsetPaginatedResponse<T> { items: T[]; offset: number; limit: number; total: number; hasMore?: boolean }
export interface PageNumberPaginatedResponse<T> { items: T[]; page: number; pageSize: number; totalPages: number; totalItems: number }
export interface PaginationParams { cursor?: string; offset?: number; page?: number; limit?: number; pageSize?: number }
export interface PaginationMeta { currentPage?: number; totalPages?: number; totalItems?: number; pageSize?: number; hasNextPage?: boolean; hasPreviousPage?: boolean }
export interface PaginatedResponseWithMeta<T> { items: T[]; meta: PaginationMeta }