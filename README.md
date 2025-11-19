# @qiaopeng/tanstack-query-plus

一个基于 React 与 TanStack Query v5 的增强工具包。文档以循序渐进方式介绍核心能力，参考 React Query 官网的学习路径：从 Provider 到查询，再到高级能力（Suspense/无限加载/批量/持久化/离线/Prefetch/Devtools）。

## 目录

1. 安装与环境
2. 初始化与 Provider
3. 基础查询（Queries）
4. Suspense 与 Error 边界
5. 变更（Mutations）与乐观更新
6. 无限加载（Infinite Queries）
7. 批量查询与批量操作
8. 预取（Prefetch）
9. 持久化与离线支持
10. Devtools（可选）
11. 配置与最佳实践
12. 子路径导出与常见问题

## 1. 安装与环境

- 要求：Node `>=16`、React 18、TanStack Query v5
- 安装：

```bash
npm install @qiaopeng/tanstack-query-plus @tanstack/react-query @tanstack/react-query-persist-client
```

- 可选能力（按需安装）：
  - Devtools：`npm install @tanstack/react-query-devtools`
  - InView 预取：`npm install react-intersection-observer`

## 2. 初始化与 Provider

使用增强版 Provider，自动启用离线监听与持久化（浏览器环境），在 SSR 环境自动降级为普通 Provider：

```tsx
import { QueryClient, PersistQueryClientProvider, useIsMutating } from '@qiaopeng/tanstack-query-plus'
import { GLOBAL_QUERY_CONFIG } from '@qiaopeng/tanstack-query-plus/core'

const queryClient = new QueryClient({ defaultOptions: GLOBAL_QUERY_CONFIG })

export function App() {
  return (
    <PersistQueryClientProvider client={queryClient} enablePersistence enableOfflineSupport>
      <Root />
    </PersistQueryClientProvider>
  )
}

// 统一门面层：直接使用顶层导出的 React Query 运行时
// 如需类型，可从 react-query 子路径获取：
// import type { UseQueryOptions, UseInfiniteQueryOptions, QueryKey } from '@qiaopeng/tanstack-query-plus/react-query'
```

## 3. 基础查询（Queries）

最简用法：

```tsx
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'

function UserProfile({ id }: { id: string }) {
  const result = useEnhancedQuery({
    queryKey: queryKeys.user(id),
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}`)
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    }
  })

  if (result.isLoading) return <div>Loading...</div>
  if (result.isError) return <div>Error: {String(result.error?.message || 'unknown')}</div>
  return <div>{result.data.name}</div>
}
```

更严格的选项工厂（统一最佳实践，例如 staleTime/gcTime、指数退避重试）：

```tsx
import { createAppQueryOptions, queryKeys } from '@qiaopeng/tanstack-query-plus/core'
import { useQuery } from '@qiaopeng/tanstack-query-plus/react-query'

const options = createAppQueryOptions({
  queryKey: queryKeys.settings(),
  queryFn: () => fetch('/api/settings').then(r => r.json())
})

function Settings() {
  const result = useQuery(options)
  return <pre>{JSON.stringify(result.data, null, 2)}</pre>
}
```

## 4. Suspense 与 Error 边界

为 Suspense 查询提供更顺滑的体验，并在错误时给出可重试界面：

```tsx
import { SuspenseWrapper, DefaultLoadingFallback } from '@qiaopeng/tanstack-query-plus/components'
import { useEnhancedSuspenseQuery } from '@qiaopeng/tanstack-query-plus/hooks'
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'

function SuspenseUser({ id }: { id: string }) {
  const result = useEnhancedSuspenseQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json())
  })
  return <div>{result.data.name}</div>
}

export function Page({ id }: { id: string }) {
  return (
    <SuspenseWrapper fallback={<DefaultLoadingFallback />}>
      <SuspenseUser id={id} />
    </SuspenseWrapper>
  )
}
```

## 5. 变更（Mutations）与乐观更新

常规变更：

```tsx
import { useMutation } from '@qiaopeng/tanstack-query-plus/hooks'
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'
import { useQueryClient } from '@tanstack/react-query'

function UpdateUserName({ id }: { id: string }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (name: string) => 
      fetch(`/api/users/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        .then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.user(id) }) }
  })
  return <button onClick={() => mutation.mutate('new name')}>Update</button>
}
```

乐观更新（支持字段映射、回滚与批量处理）：详见 `useMutation` 与 `useConditionalOptimisticMutation` 的选项。

## 6. 无限加载（Infinite Queries）

提供三种分页模型的选项工厂，统一分页逻辑：

```tsx
import { useEnhancedInfiniteQuery, createCursorPaginationOptions, createOffsetPaginationOptions, createPageNumberPaginationOptions } from '@qiaopeng/tanstack-query-plus/hooks'
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'

const cursorOptions = createCursorPaginationOptions({
  queryKey: queryKeys.posts(),
  queryFn: async (cursor) => fetch(`/api/posts?cursor=${cursor ?? ''}`).then(r => r.json()),
  initialCursor: null
})

const offsetOptions = createOffsetPaginationOptions({
  queryKey: queryKeys.posts(),
  queryFn: async (offset, limit) => fetch(`/api/posts?offset=${offset}&limit=${limit}`).then(r => r.json()),
  limit: 20
})

const pageNumberOptions = createPageNumberPaginationOptions({
  queryKey: queryKeys.posts(),
  queryFn: async (page) => fetch(`/api/posts?page=${page}`).then(r => r.json())
})

function InfiniteList() {
  const result = useEnhancedInfiniteQuery(offsetOptions)
  const pages = result.data?.pages ?? []
  return (
    <div>
      {pages.map((p, i) => (
        <div key={i}>{p.items.length} items</div>
      ))}
      <button disabled={!result.hasNextPage || result.isFetchingNextPage} onClick={() => result.fetchNextPage()}>
        下一页
      </button>
    </div>
  )
}
```

## 7. 批量查询与批量操作

在多查询场景下聚合统计并提供批量操作工具：

```tsx
import { useEnhancedQueries, batchQueryUtils } from '@qiaopeng/tanstack-query-plus/hooks'
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'

function Dashboard() {
  const { data: results, stats, operations } = useEnhancedQueries([
    { queryKey: queryKeys.users(), queryFn: () => fetch('/api/users').then(r => r.json()) },
    { queryKey: queryKeys.posts(), queryFn: () => fetch('/api/posts').then(r => r.json()) }
  ])

  return (
    <div>
      <div>成功率：{stats.successRate.toFixed(2)}%</div>
      <button onClick={() => operations.refetchAll()}>刷新全部</button>
      {batchQueryUtils.hasError(results) && <div>部分查询失败</div>}
    </div>
  )
}
```

## 8. 预取（Prefetch）

提供多种预取策略：悬停、路由变化、智能预取、视口内预取（可选依赖），并支持 `minInterval` 节流与 `stale` 检查。

```tsx
import { useEffect } from 'react'
import { useHoverPrefetch, useRoutePrefetch, useSmartPrefetch } from '@qiaopeng/tanstack-query-plus/hooks'
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'

function LinkWithPrefetch({ id }: { id: string }) {
  const hover = useHoverPrefetch(queryKeys.user(id), () => fetch(`/api/users/${id}`).then(r => r.json()), { hoverDelay: 200, minInterval: 1000 })
  return <a href={`/user/${id}`} {...hover}>用户详情</a>
}

function RouterChange() {
  const prefetch = useRoutePrefetch()
  useEffect(() => {
    prefetch(queryKeys.settings(), () => fetch('/api/settings').then(r => r.json()), { minInterval: 1000 })
  }, [])
  return null
}

function SmartCard({ id }: { id: string }) {
  const { prefetch } = useSmartPrefetch()
  return <div onMouseEnter={() => prefetch(queryKeys.user(id), () => fetch(`/api/users/${id}`).then(r => r.json()), { minInterval: 1000 })}>卡片</div>
}
```

视口内预取（可选依赖）：

```tsx
import { useInViewPrefetch } from '@qiaopeng/tanstack-query-plus/hooks/inview'
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'

function PrefetchOnView() {
  const ref = useInViewPrefetch(queryKeys.posts(), () => fetch('/api/posts').then(r => r.json()), { threshold: 0.2 })
  return <div ref={ref} />
}
```

## 9. 持久化与离线支持

浏览器环境下 Provider 自动启用持久化与离线状态监听；通过 features 子路径获取离线工具与持久化管理：

```tsx
import { useEffect, useState } from 'react'
import { isOnline, subscribeToOnlineStatus, clearCache } from '@qiaopeng/tanstack-query-plus/features'

function OfflineBanner() {
  const [online, setOnline] = useState(isOnline())
  useEffect(() => subscribeToOnlineStatus(setOnline), [])
  return online ? null : <div>当前离线，数据将使用缓存</div>
}

function ClearCacheButton() {
  return <button onClick={() => clearCache()}>清空持久化缓存</button>
}
```

## 10. Devtools（可选）

按需引入，避免未安装时报错：

```tsx
import { ReactQueryDevtools } from '@qiaopeng/tanstack-query-plus/core/devtools'
```

## 11. 配置与最佳实践

提供统一默认值与校验工具：

```ts
import { GLOBAL_QUERY_CONFIG, PRODUCTION_CONFIG, DEVELOPMENT_CONFIG, ensureBestPractices, validateConfig } from '@qiaopeng/tanstack-query-plus/core'
```

- 默认值包含合理的 `staleTime/gcTime`、重试与指数退避、焦点/重连自动刷新等
- `ensureBestPractices(config)` 会自动修正不合理配置（如 `gcTime <= staleTime`）

## 12. 子路径导出与常见问题

- 顶层：`@qiaopeng/tanstack-query-plus`
- 核心：`@qiaopeng/tanstack-query-plus/core`
- Hooks：`@qiaopeng/tanstack-query-plus/hooks`
- 组件：`@qiaopeng/tanstack-query-plus/components`
- 工具与类型：`@qiaopeng/tanstack-query-plus/utils`、`@qiaopeng/tanstack-query-plus/types`
- React Query 直通子路径：`@qiaopeng/tanstack-query-plus/react-query`
  - 运行时再导出：`QueryClient`、`QueryClientProvider`、`useQueryClient`、`skipToken`、`useIsMutating`
  - 类型再导出：`UseQueryOptions`、`UseSuspenseQueryOptions`、`UseInfiniteQueryOptions`、`QueryKey`、`MutationKey`、`InfiniteData`
- 可选能力：
  - Devtools：`@qiaopeng/tanstack-query-plus/core/devtools`
  - InView 预取：`@qiaopeng/tanstack-query-plus/hooks/inview`

常见问题：

- Devtools 未安装时报错？使用子路径 `core/devtools` 并安装 `@tanstack/react-query-devtools`
- InView 预取未安装时报错？使用子路径 `hooks/inview` 并安装 `react-intersection-observer`
- SSR 如何工作？Provider 会在无法持久化时自动降级；所有浏览器 API 都有守卫

## 许可

MIT

## API 参考

本节对导出的 Hooks 与 TSX 组件进行逐项说明，并给出最小示例，便于快速查阅与上手。

### Provider 与持久化/离线

- PersistQueryClientProvider(props)
  - 作用：集成 TanStack Query Provider，浏览器环境自动启用持久化与离线监听；SSR 环境安全降级
  - 关键 props：`client`、`cacheKey?`、`enablePersistence?`、`enableOfflineSupport?`
  - 用法：参见“初始化与 Provider”章节示例
- 离线/持久化工具（features 子路径）
  - `isOnline()` / `subscribeToOnlineStatus(callback)` / `configureOfflineQueries(queryClient)`
  - `clearCache(key?)` / `clearExpiredCache(key?, maxAge?)` / `createPersister(key?, storage?)`
  - 用法：参见“持久化与离线支持”章节示例

### 组件（TSX）

- SuspenseWrapper({ children, fallback?, errorFallback?, onError?, resetKeys? })
  - 作用：将 ErrorBoundary 与 React.Suspense 合并封装
- QueryErrorBoundary({ children, fallback?, onError?, resetKeys? })
  - 作用：结合 React Query 的错误重置能力，提供查询错误兜底 UI
- LoadingFallback 族
  - DefaultLoadingFallback / SmallLoadingIndicator / FullScreenLoading / TextSkeletonFallback / CardSkeletonFallback / ListSkeletonFallback / PageSkeletonFallback
  - 作用：一致的加载与骨架 UI，可按需组合

### Queries（标准与 Suspense）

- useEnhancedQuery(options)
  - 作用：基于 v5 `useQuery` 的增强封装，携带统一默认最佳实践（重试、指数退避、焦点刷新等）
  - 示例：参见“基础查询”章节
- useEnhancedSuspenseQuery(options)
  - 作用：针对 Suspense 模式的查询封装
- createAppQueryOptions(config)
  - 作用：生成带默认最佳实践的 `UseQueryOptions`；推荐与 `useQuery` 搭配
- createAppQueryOptionsWithSelect(config)
  - 作用：在服务器返回数据基础上做选择/映射
- createSuspenseQuery(config)、createSuspenseInfiniteQuery(config)
  - 作用：为 Suspense 场景生成标准化选项

签名参考：

```ts
// 标准查询
declare function useEnhancedQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError>

declare function createAppQueryOptions<TData>(
  config: { queryKey: QueryKey; queryFn: QueryFunction<TData, QueryKey>; staleTime?: number; gcTime?: number; enabled?: boolean }
): UseQueryOptions<TData, DefaultError, TData, QueryKey>

declare function createAppQueryOptionsWithSelect<TData, TSelected = TData>(
  config: { queryKey: QueryKey; queryFn: QueryFunction<TData, QueryKey>; select: (data: TData) => TSelected; staleTime?: number; gcTime?: number }
): UseQueryOptions<TData, DefaultError, TSelected, QueryKey>

// Suspense 查询
declare function useEnhancedSuspenseQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseSuspenseQueryResult<TData, TError>

declare function createSuspenseQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TVariables = void>(
  getQueryKey: (variables: TVariables) => TQueryKey,
  queryFn: QueryFunction<TQueryFnData, TQueryKey>,
  options?: Omit<UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
): (variables: TVariables) => UseSuspenseQueryResult<TData, TError>

// 说明：对于 v5 推荐在调用时将 TError 显式指定为 DefaultError，以与官方类型一致：
// useEnhancedQuery<..., DefaultError>(options)
// useEnhancedSuspenseQuery<..., DefaultError>(options)
```

### Infinite Queries（三种分页模型）

- useEnhancedInfiniteQuery(options)
  - 作用：增强版无限查询钩子
- createCursorPaginationOptions({ queryKey, queryFn, initialCursor?, staleTime?, gcTime? })
- createOffsetPaginationOptions({ queryKey, queryFn, limit?, staleTime?, gcTime? })
- createPageNumberPaginationOptions({ queryKey, queryFn, staleTime?, gcTime? })
  - 作用：三种分页模型的统一选项工厂；示例参见“无限加载”章节

签名参考：

```ts
declare function useEnhancedInfiniteQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(
  options: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>
): UseInfiniteQueryResult<TData, TError>

declare function createInfiniteQueryOptions<TQueryFnData = unknown, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(
  config: {
    queryKey: TQueryKey
    queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>
    initialPageParam: TPageParam
    getNextPageParam: (lastPage: TQueryFnData, allPages: TQueryFnData[], lastPageParam: TPageParam, allPageParams: TPageParam[]) => TPageParam | undefined | null
    getPreviousPageParam?: (firstPage: TQueryFnData, allPages: TQueryFnData[], firstPageParam: TPageParam, allPageParams: TPageParam[]) => TPageParam | undefined | null
    staleTime?: number
    gcTime?: number
  }
): UseInfiniteQueryOptions<TQueryFnData, DefaultError, TQueryFnData, TQueryKey, TPageParam>

declare function createCursorPaginationOptions<T>(
  config: { queryKey: QueryKey; queryFn: (cursor: string | null) => Promise<CursorPaginatedResponse<T>>; initialCursor?: string | null; staleTime?: number; gcTime?: number }
): UseInfiniteQueryOptions<CursorPaginatedResponse<T>, DefaultError, CursorPaginatedResponse<T>, QueryKey, string | null>

declare function createOffsetPaginationOptions<T>(
  config: { queryKey: QueryKey; queryFn: (offset: number, limit: number) => Promise<OffsetPaginatedResponse<T>>; limit?: number; staleTime?: number; gcTime?: number }
): UseInfiniteQueryOptions<OffsetPaginatedResponse<T>, DefaultError, OffsetPaginatedResponse<T>, QueryKey, number>

declare function createPageNumberPaginationOptions<T>(
  config: { queryKey: QueryKey; queryFn: (page: number) => Promise<PageNumberPaginatedResponse<T>>; staleTime?: number; gcTime?: number }
): UseInfiniteQueryOptions<PageNumberPaginatedResponse<T>, DefaultError, PageNumberPaginatedResponse<T>, QueryKey, number>
```

### 批量查询与操作

- useEnhancedQueries(queries, config?) / useEnhancedSuspenseQueries(queries, config?)
  - 作用：批量执行查询并返回聚合统计与批量操作
- useCombinedQueries({ queries, combine? })
  - 作用：自定义组合函数，得到合并后的结果
- useDashboardQueries(queriesMap)
  - 作用：以对象映射驱动多查询，返回 `combinedData`
- useDependentBatchQueries({ primaryQuery, dependentQueries, config? })
  - 作用：依赖查询链路（先主查询，再基于结果构造从查询集合）
- useDynamicBatchQueries({ items, queryKeyPrefix, queryFn, enabled?, staleTime?, gcTime?, config? })
  - 作用：根据动态 items 批量生成查询
- usePaginatedBatchQueries({ pageNumbers, queryKeyPrefix, queryFn, staleTime?, config? })
  - 作用：分页编号驱动的批量查询
- useConditionalBatchQueries(queries)
  - 作用：对 `enabled !== false` 的查询执行批量
- useRetryBatchQueries({ queries, retry?, retryDelay?, config? })
  - 作用：统一设置批量查询的重试策略
- batchQueryUtils
  - 常用聚合工具：`isAllLoading/isAllSuccess/hasError/hasStale/getAllErrors/getAllData/...`
- calculateBatchStats(results)
  - 返回成功率/错误率等批量统计
- createBatchQueryConfig(config?)
  - 作用：构建批量查询配置的默认值
- useBatchQueryPerformance(results)
  - 作用：统计平均拉取时间等性能指标

签名参考：

```ts
declare function useEnhancedQueries(
  queries: UseQueryOptions[],
  config?: BatchQueryConfig
): { data: UseQueryResult[]; stats: BatchQueryStats; operations: InternalBatchQueryOperations; config: BatchQueryConfig }

declare function useEnhancedSuspenseQueries(
  queries: UseSuspenseQueryOptions[],
  config?: BatchQueryConfig
): { data: UseSuspenseQueryResult[]; stats: BatchQueryStats; operations: InternalBatchQueryOperations; config: BatchQueryConfig }

declare function useCombinedQueries<TCombinedResult = UseQueryResult[]>(
  options: { queries: UseQueryOptions[]; combine?: (results: UseQueryResult[]) => TCombinedResult }
): TCombinedResult

declare function useDashboardQueries<T extends Record<string, UseQueryOptions>>(
  queriesMap: T
): { data: { [K in keyof T]: T[K] extends UseQueryOptions<infer D> ? D : unknown }; results: UseQueryResult[]; stats: BatchQueryStats; isLoading: boolean; isError: boolean; isSuccess: boolean }

declare function useDependentBatchQueries<TPrimaryData>(
  options: { primaryQuery: UseQueryOptions<TPrimaryData>; dependentQueries: (data: TPrimaryData) => UseQueryOptions[]; config?: BatchQueryConfig }
): { primaryResult: UseQueryResult<TPrimaryData, DefaultError>; results: UseQueryResult[]; stats: BatchQueryStats; operations: InternalBatchQueryOperations }
```

### Prefetch（预取）

- useHoverPrefetch(queryKey, queryFn, options?)
- useRoutePrefetch()
  - 返回：`prefetch(queryKey, queryFn, options?)`
- useSmartPrefetch()
  - 返回：`{ prefetch, shouldPrefetch, clearPrefetchHistory }`
- useConditionalPrefetch(queryKey, queryFn, condition, options?)
- useIdlePrefetch(queryKey, queryFn, { timeout?, ...options })
- usePeriodicPrefetch(queryKey, queryFn, { interval?, ...options })
- useBatchPrefetch([{ queryKey, queryFn, staleTime? }, ...])
- usePredictivePrefetch()
  - 返回：`{ recordInteraction, getPredictions, prefetchPredicted, clearHistory }`
- usePriorityPrefetch()
  - 返回：队列化按优先级执行预取任务
- useInViewPrefetch(queryKey, queryFn, options?)（子路径 `hooks/inview`）
  - 需安装 `react-intersection-observer`

签名参考：

```ts
declare function useHoverPrefetch<TData = unknown>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TData>,
  options?: { delay?: number; enabled?: boolean; staleTime?: number; hoverDelay?: number }
): { onMouseEnter: () => void; onMouseLeave: () => void; onFocus: () => void }

declare function useRoutePrefetch(): <TData = unknown>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TData>,
  options?: { enabled?: boolean; staleTime?: number }
) => void

declare function useSmartPrefetch(): {
  prefetch: <TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, options?: { staleTime?: number }) => void
  shouldPrefetch: boolean
  clearPrefetchHistory: () => void
}

declare function useInViewPrefetch<TData = unknown>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TData>,
  options?: { threshold?: number; rootMargin?: string; triggerOnce?: boolean; enabled?: boolean; staleTime?: number }
): (el: Element | null) => void
```

### 焦点管理（Focus）

- useFocusRefetch(options?) / useConditionalFocusRefetch(condition, options?)
  - 作用：基于页面焦点变化自动刷新
- useFocusCallback(callback)
  - 作用：焦点恢复时执行回调
- useFocusState()
  - 返回：当前是否处于焦点（布尔值）
- usePageVisibility()
  - 返回：页面是否可见（布尔值）
- usePauseFocus(options?) / useSmartFocusManager()
  - 作用：暂停/恢复全局焦点管理与最小间隔刷新的辅助

签名参考：

```ts
declare function useFocusRefetch(options?: { enabled?: boolean; minInterval?: number; queryKeys?: QueryKey[] }): void
declare function useConditionalFocusRefetch(queryKey: QueryKey, condition: () => boolean, options?: { minInterval?: number; enabled?: boolean }): void
declare function useFocusCallback(callback: () => void, options?: { minInterval?: number; enabled?: boolean; queryKey?: QueryKey }): void
declare function useFocusState(): boolean
declare function usePageVisibility(): boolean
declare function usePauseFocus(options?: { autoPause?: boolean; pauseWhen?: boolean }): { pause: () => void; resume: () => void }
declare function useSmartFocusManager(): { pause: () => void; resume: () => void; getStats: () => { isPaused: boolean; pauseCount: number; isFocused: boolean }; stats: { isPaused: boolean; pauseCount: number; isFocused: boolean } }
```

### Mutations（变更）

- useMutation(options)
  - 作用：增强版 `useMutation`，内置乐观更新支持（字段映射、回滚、用户上下文）
- useConditionalOptimisticMutation(mutationFn, condition, options?)
  - 作用：满足条件时才执行乐观更新
- useListMutation(mutationFn, queryKey, options?)
  - 作用：列表场景的简化变更（完成后自动 `invalidateQueries`）
- useBatchMutation(mutationFn, options?)
  - 作用：批量数据变更
- setupMutationDefaults(queryClient, config)
  - 作用：按 mutationKey 设置全局默认变更选项
- cancelQueriesBatch(queryClient, queryKeys)
- setQueryDataBatch(queryClient, updates)
- invalidateQueriesBatch(queryClient, queryKeys)
  - 作用：批量取消/更新/失效查询便捷工具

签名参考：

```ts
declare function useMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: MutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext>

declare function useConditionalOptimisticMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: MutationFunction<TData, TVariables>,
  condition: (variables: TVariables) => boolean,
  options?: Omit<MutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & { mutationKey?: readonly unknown[] }
): UseMutationResult<TData, TError, TVariables, TContext>

declare function useListMutation<T extends EntityWithId>(
  mutationFn: MutationFunction<T, { operation: string; data: Partial<T> }>,
  queryKey: QueryKey,
  options?: UseMutationOptions<T, Error, { operation: string; data: Partial<T> }> & { mutationKey?: readonly unknown[] }
): UseMutationResult<T, Error, { operation: string; data: Partial<T> }>

declare function useBatchMutation<TData = unknown, TError = Error, TVariables = unknown[]>(
  mutationFn: MutationFunction<TData[], TVariables>,
  options?: UseMutationOptions<TData[], TError, TVariables> & { mutationKey?: readonly unknown[] }
): UseMutationResult<TData[], TError, TVariables>

declare function setupMutationDefaults(queryClient: QueryClient, config: { [key: string]: UseMutationOptions<any, any, any, any> }): void
declare function cancelQueriesBatch(queryClient: QueryClient, queryKeys: Array<Parameters<QueryClient['cancelQueries']>[0]>): Promise<void>
declare function setQueryDataBatch(queryClient: QueryClient, updates: Array<{ queryKey: Parameters<QueryClient['setQueryData']>[0]; updater: Parameters<QueryClient['setQueryData']>[1] }>): void
declare function invalidateQueriesBatch(queryClient: QueryClient, queryKeys: Array<Parameters<QueryClient['invalidateQueries']>[0]>): Promise<void>
```

### 组件错误与加载（TSX）

- QueryErrorBoundary / ErrorBoundary
  - 作用：错误显示与重试，支持 `fallback` 自定义
- SuspenseWrapper
  - 作用：Suspense + 错误边界组合
- LoadingFallback 族
  - 作用：加载与骨架 UI，按需选择与组合

示例：

```tsx
import { DefaultLoadingFallback, FullScreenLoading, TextSkeletonFallback } from '@qiaopeng/tanstack-query-plus/components'

function LoadingExamples() {
  return (
    <div>
      <DefaultLoadingFallback />
      <FullScreenLoading message="加载中..." />
      <TextSkeletonFallback lines={4} />
    </div>
  )
}
```

### 说明与约定

- 错误类型默认对齐 v5：`DefaultError`
- 配置的默认值遵循最佳实践，必要时用 `ensureBestPractices` 自动纠正
- 可选依赖通过子路径导出按需使用，避免未安装造成解析失败