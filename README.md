# @qiaopeng/tanstack-query-plus 完整使用教程

> 本教程将带你从零开始，循序渐进地学习如何使用 `@qiaopeng/tanstack-query-plus`。每个章节都会自然地引出下一个概念，帮助你建立完整的知识体系。

## 目录

1. [前言：为什么需要这个库？](#1-前言为什么需要这个库)
2. [安装与环境准备](#2-安装与环境准备)
3. [第一步：配置 Provider](#3-第一步配置-provider)
4. [第二步：发起你的第一个查询](#4-第二步发起你的第一个查询)
5. [第三步：使用增强查询追踪性能](#5-第三步使用增强查询追踪性能)
6. [第四步：管理 Query Key](#6-第四步管理-query-key)
7. [第五步：数据变更与乐观更新](#7-第五步数据变更与乐观更新)
8. [第六步：无限滚动与分页](#8-第六步无限滚动与分页)
9. [第七步：全局状态与 Mutation 监控](#9-第七步全局状态与-mutation-监控)
10. [第八步：批量查询与仪表盘](#10-第八步批量查询与仪表盘)
11. [第九步：智能预取](#11-第九步智能预取)
12. [第十步：Suspense 模式与 SSR](#12-第十步suspense-模式与-ssr)
13. [第十一步：离线支持与持久化](#13-第十一步离线支持与持久化)
14. [第十二步：数据防护与安全](#14-第十二步数据防护与安全)
15. [第十三步：焦点管理](#15-第十三步焦点管理)
16. [第十四步：工具函数与选择器](#16-第十四步工具函数与选择器)
17. [最佳实践与常见问题](#17-最佳实践与常见问题)
18. [API 索引](#18-api-索引)

---

## 1. 前言：为什么需要这个库？

在使用 TanStack Query（原 React Query）时，你可能会遇到以下问题：

- **配置繁琐**：每次新项目都要重新配置 staleTime、gcTime、重试策略等
- **缺乏最佳实践**：不确定什么样的配置才是最优的
- **重复代码**：乐观更新、错误处理、性能追踪等逻辑需要反复编写
- **离线支持复杂**：实现离线队列和数据持久化需要大量代码

`@qiaopeng/tanstack-query-plus` 就是为了解决这些问题而生的。它在 TanStack Query v5 的基础上，提供了：

- 🚀 **开箱即用的最佳实践配置**
- 🔄 **增强的 Hooks**（性能追踪、慢查询检测、错误日志）
- 💾 **一键启用的持久化**
- 📡 **完整的离线支持**
- ⚡ **多种智能预取策略**
- 🎯 **内置乐观更新**

接下来，让我们一步步学习如何使用这些功能。

### 1.1 设计初衷与原则

- 保持与 TanStack Query v5 完全兼容，不改变其核心行为，只做“安全增强”。
- 提供开箱即用的最佳实践配置，减少重复劳动与认知负担。
- 以“安全”为首要前提：数据防护、持久化安全、离线队列的稳健性、错误处理的可控性。
- API 设计坚持渐进增强：原生用法不变，增强能力按需启用，便于迁移和学习。
- TypeScript 友好：导出类型与范型参数与 TanStack 保持一致，避免类型陷阱。

### 1.2 适用场景

- 中大型前端应用，需要统一的查询管理与最佳实践配置。
- 有离线需求（电商、文档编辑、移动端 Web）或需要缓存持久化与恢复的场景。
- 需要更强的乐观更新、并发冲突处理、数据一致性保障。
- 希望最小化自定义基础设施代码，将精力聚焦在业务逻辑。

### 1.3 非目标与边界

- 不替代后端的并发控制与数据一致性保障；前端 Data Guard 仅作为“最后防线”。
- 不内置与具体后端协议的强绑定（如 GraphQL/REST 的特定实现）；保持通用。
- 不存储任何敏感凭据；持久化仅针对查询缓存，且可配置与可关闭。

### 1.4 安全与合规

- 持久化默认仅保存可序列化且成功的查询数据，避免异常对象导致恢复失败（参见 `createPersistOptions`）。
- 建议不要在 `queryKey` 中包含敏感信息（如 token、身份证号、手机号原文）。
- DevTools 仅在开发环境启用，避免在生产泄露内部状态（参见 `isDevToolsEnabled`）。
- 离线队列持久化时去除了函数体，仅存操作元数据；实际执行函数需通过注册表安全绑定。

### 1.5 术语速览

- `queryKey`：查询的唯一标识；必须是稳定、可序列化的值（通常为数组）
- `queryFn`：实际获取数据的异步函数；返回 Promise
- `staleTime`：数据保持“新鲜”的时间窗口；新鲜期内不会重复请求
- `gcTime`：缓存保留时间；超过后缓存会被清理
- `invalidate`：标记查询为过期；下一次渲染或焦点恢复时会重新请求
- `refetch`：主动重新请求数据
- `persist`：将查询缓存持久化到存储（localStorage/IndexedDB）并在刷新后恢复
- `offline`：网络不可用时的状态；本库提供队列与自动恢复机制
- `optimistic update`：先更新 UI，再与服务端同步；失败时需回滚
- `Data Guard`：防止旧数据覆盖新数据的前端机制（版本/时间戳/哈希比对）
---

## 2. 安装与环境准备

### 2.1 安装核心依赖

首先，安装必需的包：

```bash
npm install @qiaopeng/tanstack-query-plus @tanstack/react-query @tanstack/react-query-persist-client
```

这三个包的作用分别是：
- `@qiaopeng/tanstack-query-plus`：本库，提供增强功能
- `@tanstack/react-query`：TanStack Query 核心库
- `@tanstack/react-query-persist-client`：持久化支持

### 2.2 安装可选依赖

根据你的需求，可以选择安装以下可选依赖：

```bash
# 开发调试工具（强烈推荐在开发环境使用）
npm install @tanstack/react-query-devtools

# 视口预取功能（如果需要 useInViewPrefetch）
npm install react-intersection-observer

# 路由预取示例所需（如果使用 useRoutePrefetch 示例中的 Link/useNavigate）
npm install react-router-dom
```

### 2.3 环境要求

确保你的项目满足以下要求：
- Node.js >= 16
- React >= 18
- TypeScript（推荐，但非必需）

现在环境准备好了，让我们开始配置应用。

### 2.4 学习路径与检查清单

严格建议按照以下顺序学习与落地，并在每一步完成后进行自检：

1. 安装依赖：确保安装本库及 peer 依赖（`@tanstack/react-query`、`react`、`react-dom`），按需安装 `devtools`、`react-intersection-observer`、`react-router-dom`
2. 创建 `QueryClient`：使用 `GLOBAL_QUERY_CONFIG`，避免随意调整 `retry`、`staleTime` 造成请求风暴
3. 包裹应用：使用 `PersistQueryClientProvider` 开启持久化与离线支持（生产环境建议保留持久化）
4. 添加 DevTools（开发环境）：`isDevToolsEnabled()` 控制显示，严禁在生产强制开启
5. 发起首个查询：优先使用 `useEnhancedQuery`，在慢查询或错误场景验证日志输出
6. 增强 Mutation：在列表 CRUD 场景启用乐观更新，并验证回滚路径与错误处理
7. 离线与持久化：断网测试页面行为；验证缓存恢复与离线队列的稳健性
8. 数据防护（可选但推荐）：开启 Data Guard 的版本/时间戳/哈希策略，防止旧数据覆盖
9. 焦点管理：按照业务需要控制窗口聚焦时的刷新频率，避免抖动
10. 预取：根据网络情况与页面流量，按需启用悬停/视口/路由/空闲预取，避免过度预取

完成以上 10 点后，再进入“最佳实践与常见问题”章节进行整体检查与性能、安全优化。

### 2.5 五分钟上手示例

目标：用 5 分钟完成“配置 Provider + 首个查询 + DevTools 调试”。

1. 安装依赖：

```bash
npm install @qiaopeng/tanstack-query-plus @tanstack/react-query @tanstack/react-query-persist-client
npm install @tanstack/react-query-devtools --save-dev
```

2. 创建 Provider：

```tsx
// main.tsx
import { QueryClient, PersistQueryClientProvider } from '@qiaopeng/tanstack-query-plus'
import { GLOBAL_QUERY_CONFIG } from '@qiaopeng/tanstack-query-plus/core'
import { ReactQueryDevtools, isDevToolsEnabled } from '@qiaopeng/tanstack-query-plus/core/devtools'

const queryClient = new QueryClient({ defaultOptions: GLOBAL_QUERY_CONFIG })

function Providers({ children }) {
  return (
    <PersistQueryClientProvider client={queryClient}>
      {children}
      {isDevToolsEnabled() && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  )
}
```

3. 发起首个查询：

```tsx
// App.tsx
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'

export default function App() {
  const { data, isLoading, isError } = useEnhancedQuery({
    queryKey: ['hello'],
    queryFn: async () => ({ message: 'Hello Query Plus' }),
  })
  if (isLoading) return <div>加载中...</div>
  if (isError) return <div>加载失败</div>
  return <div>{data.message}</div>
}
```

4. 跑起来：在浏览器中打开 DevTools 面板，查看 `['hello']` 查询状态。

### 2.6 TypeScript 配置建议

以下 `tsconfig.json` 选项可以帮助初学者避免常见类型问题：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "useUnknownInCatchVariables": true
  }
}
```

说明：
- `strict: true` 有助于暴露隐含的 `any` 与未处理的 `undefined`
- `skipLibCheck: true` 可避免第三方库类型检查的噪音（对本库安全）
- `useUnknownInCatchVariables` 提醒你显式处理错误类型

---

## 3. 第一步：配置 Provider

任何使用 TanStack Query 的应用都需要一个 Provider 来提供 QueryClient 实例。本库提供了一个增强版的 Provider，让配置变得更简单。

### 3.1 最简配置

最简单的配置只需要几行代码：

```tsx
// App.tsx
import { QueryClient, PersistQueryClientProvider } from '@qiaopeng/tanstack-query-plus'
import { GLOBAL_QUERY_CONFIG } from '@qiaopeng/tanstack-query-plus/core'

// 创建 QueryClient，使用预配置的最佳实践
const queryClient = new QueryClient({
  defaultOptions: GLOBAL_QUERY_CONFIG
})

function App() {
  return (
    <PersistQueryClientProvider client={queryClient}>
      <YourApp />
    </PersistQueryClientProvider>
  )
}
```

这段代码做了什么？

1. **创建 QueryClient**：使用 `GLOBAL_QUERY_CONFIG` 预配置，包含了经过优化的默认值
2. **包裹应用**：`PersistQueryClientProvider` 让所有子组件都能访问 QueryClient

### 3.2 启用持久化和离线支持

`PersistQueryClientProvider` 默认就启用了持久化和离线支持（`enablePersistence` 和 `enableOfflineSupport` 默认都是 `true`）。如果你想显式配置或禁用某些功能：

```tsx
<PersistQueryClientProvider 
  client={queryClient}
  enablePersistence={true}    // 启用 localStorage 持久化（默认 true）
  enableOfflineSupport={true} // 启用离线状态监听（默认 true）
  cacheKey="my-app-cache"     // 自定义缓存 key（默认 'tanstack-query-cache'）
  onPersistRestore={() => console.log('缓存已恢复')}  // 缓存恢复回调
  onPersistError={(err) => console.error('持久化错误', err)}
>
  <YourApp />
</PersistQueryClientProvider>
```

**enablePersistence** 的作用：
- 自动将查询缓存保存到 localStorage
- 页面刷新后自动恢复缓存数据
- 用户可以立即看到上次的数据，无需等待网络请求
- 设为 `false` 可禁用持久化

**enableOfflineSupport** 的作用：
- 监听网络状态变化
- 离线时暂停请求，在线时自动恢复
- 配合离线队列管理器使用
- 设为 `false` 可禁用离线支持

### 3.3 理解预配置

`GLOBAL_QUERY_CONFIG` 包含了以下默认值：

```typescript
{
  queries: {
    staleTime: 30000,
    gcTime: 600000,
    retry: defaultQueryRetryStrategy,  // 智能重试：4XX不重试，5XX最多1次
    retryDelay: exponentialBackoff,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  },
  mutations: {
    retry: 0,  // Mutation 默认不重试
    retryDelay: exponentialBackoff,
    gcTime: 600000,
  }
}
```

**重试策略说明：**

- **Query 重试**（`defaultQueryRetryStrategy`）：
  - 4XX 客户端错误：不重试（客户端问题，重试无意义）
  - 5XX 服务端错误：最多重试 1 次（避免过度重试）
  - 网络错误：最多重试 2 次
  
- **Mutation 重试**（`defaultMutationRetryStrategy`）：
  - 4XX 客户端错误：不重试
  - 5XX 服务端错误：不重试（避免重复操作）
  - 网络错误：最多重试 1 次

这些值是经过实践验证的最佳实践，适合大多数应用场景。

### 3.4 根据环境选择配置

本库还提供了针对不同环境的预配置：

```tsx
import { getConfigByEnvironment } from '@qiaopeng/tanstack-query-plus/core'

// 根据环境自动选择配置
const env =
  process.env.NODE_ENV === 'production'
    ? 'production'
    : process.env.NODE_ENV === 'test'
      ? 'test'
      : 'development'
const config = getConfigByEnvironment(env)
const queryClient = new QueryClient({ defaultOptions: config })
```

不同环境的配置差异：

| 配置项 | development | production | test |
|--------|-------------|------------|------|
| staleTime | 0 | 10 分钟 | 0 |
| retry (Query) | 智能重试* | 智能重试* | 0 |
| retry (Mutation) | 0 | 0 | 0 |
| refetchOnWindowFocus | true | true | false |

*智能重试：4XX 不重试，5XX 最多 1 次，网络错误最多 2 次

补充：还支持 `getConfigByEnvironment('longCache')` 与 `getConfigByEnvironment('realtime')` 两种预设，分别适用于“长缓存”与“高实时”场景。

### 3.5 自定义重试策略

如果默认的重试策略不满足你的需求，可以使用 `createSafeRetryStrategy` 和 `createErrorSafeConfig` 来自定义：

```tsx
import { 
  createSafeRetryStrategy, 
  createErrorSafeConfig 
} from '@qiaopeng/tanstack-query-plus/core'

// 方式一：创建自定义重试策略
const customRetry = createSafeRetryStrategy(
  0,  // 4XX 错误重试次数
  1,  // 5XX 错误重试次数
  2   // 其他错误重试次数
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: customRetry,
    }
  }
})

// 方式二：使用错误安全配置（推荐）
const errorSafeConfig = createErrorSafeConfig({
  maxRetries4xx: 0,       // 4XX 不重试
  maxRetries5xx: 0,       // 5XX 不重试（严格模式）
  maxRetriesOther: 1,     // 网络错误最多 1 次
  disableFocus: false,    // 是否禁用窗口聚焦时 refetch
  disableReconnect: false // 是否禁用重连时 refetch
})

const queryClient = new QueryClient({
  defaultOptions: errorSafeConfig
})
```

**使用场景：**

1. **严格模式**：完全禁用 4XX/5XX 重试，避免不必要的请求
2. **宽松模式**：增加重试次数，适合网络不稳定的环境
3. **自定义场景**：根据业务需求精确控制重试行为

### 3.6 添加 DevTools（开发环境）

在开发环境中，强烈建议添加 DevTools 来调试查询状态：

```tsx
import { ReactQueryDevtools, isDevToolsEnabled } from '@qiaopeng/tanstack-query-plus/core/devtools'

function App() {
  return (
    <PersistQueryClientProvider client={queryClient}>
      <YourApp />
      {isDevToolsEnabled() && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  )
}
```

DevTools 可以让你：
- 查看所有查询的状态
- 手动触发 refetch
- 查看缓存数据
- 调试查询问题

现在 Provider 配置好了，让我们开始发起第一个查询！

---

## 4. 第二步：发起你的第一个查询

配置好 Provider 后，我们就可以在组件中使用查询了。

### 4.1 基础查询

最基本的查询可以使用 TanStack Query 原生的 `useQuery`，或者本库提供的增强版 `useEnhancedQuery`：

```tsx
// 方式一：使用 TanStack Query 原生 useQuery
import { useQuery } from '@tanstack/react-query'

// 方式二：使用本库的增强版（推荐，支持性能追踪等功能）
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'

function UserProfile({ userId }) {
  // 两者用法相同，useEnhancedQuery 额外支持性能追踪
  const { data, isLoading, isError, error } = useEnhancedQuery({
    queryKey: ['user', userId],  // 查询的唯一标识
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),  // 获取数据的函数
  })

  if (isLoading) return <div>加载中...</div>
  if (isError) return <div>错误: {error.message}</div>
  
  return <div>用户名: {data.name}</div>
}
```

**关键概念解释：**

1. **queryKey**：查询的唯一标识符，是一个数组。TanStack Query 用它来：
   - 缓存数据
   - 判断是否需要重新请求
   - 在多个组件间共享数据

2. **queryFn**：实际获取数据的异步函数。可以是 fetch、axios 或任何返回 Promise 的函数。

3. **返回值**：
   - `data`：查询成功后的数据
   - `isLoading`：首次加载中
   - `isError`：是否出错
   - `error`：错误对象

### 4.2 条件查询

有时候我们需要在满足某些条件时才发起查询：

```tsx
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'

function UserProfile({ userId }) {
  const { data } = useEnhancedQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,  // 只有 userId 存在时才查询
  })
  
  // ...
}
```

### 4.3 使用 skipToken 禁用查询

另一种禁用查询的方式是使用 `skipToken`：

```tsx
import { useEnhancedQuery, skipToken } from '@qiaopeng/tanstack-query-plus/hooks'

function UserProfile({ userId }) {
  const { data } = useEnhancedQuery({
    queryKey: ['user', userId],
    queryFn: userId ? () => fetchUser(userId) : skipToken,
  })
  
  // ...
}
```

**注意**：`skipToken` 也可以从 `@qiaopeng/tanstack-query-plus` 主包导入，或者从 `@tanstack/react-query` 导入。

`skipToken` 的好处是 TypeScript 类型推断更准确。

### 4.4 自定义缓存时间

你可以为特定查询设置不同的缓存策略：

```tsx
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'

const { data } = useEnhancedQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000,  // 5 分钟内数据视为新鲜
  gcTime: 30 * 60 * 1000,    // 缓存保留 30 分钟
})
```

**staleTime vs gcTime 的区别：**

- **staleTime**：数据被认为是"新鲜"的时间。在这段时间内，即使组件重新挂载，也不会重新请求。
- **gcTime**：数据在缓存中保留的时间。超过这个时间，数据会被垃圾回收。

现在你已经会发起基本查询了。但在实际项目中，我们往往需要追踪查询性能、检测慢查询。这就是增强查询的用武之地。

---

## 5. 第三步：使用增强查询追踪性能


`useEnhancedQuery` 是本库的核心 Hook 之一，它在原生 `useQuery` 的基础上增加了性能追踪、慢查询检测和错误日志功能。

### 5.1 基本使用

```tsx
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'

function UserProfile({ userId }) {
  const { 
    data, 
    isLoading, 
    isError, 
    error,
    // 增强的返回值
    refetchCount,       // 重新获取次数
    lastQueryDuration   // 最后一次查询耗时（毫秒）
  } = useEnhancedQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })

  if (isLoading) return <div>加载中...</div>
  if (isError) return <div>错误: {error.message}</div>
  
  return (
    <div>
      <h1>{data.name}</h1>
      <p className="text-sm text-gray-500">
        查询耗时: {lastQueryDuration}ms | 刷新次数: {refetchCount}
      </p>
    </div>
  )
}
```

### 5.2 启用性能追踪

要追踪查询性能，需要显式启用 `trackPerformance`：

```tsx
const { data, lastQueryDuration } = useEnhancedQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  trackPerformance: true,  // 启用性能追踪
})
```

启用后，`lastQueryDuration` 会记录每次查询的耗时。

### 5.3 检测慢查询

在生产环境中，检测慢查询对于性能优化至关重要：

```tsx
const { data } = useEnhancedQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  trackPerformance: true,
  slowQueryThreshold: 2000,  // 超过 2 秒视为慢查询
  onSlowQuery: (duration, queryKey) => {
    // 上报到监控系统
    analytics.track('slow_query', {
      queryKey: JSON.stringify(queryKey),
      duration,
    })
    console.warn(`慢查询警告: ${JSON.stringify(queryKey)} 耗时 ${duration}ms`)
  },
})
```

**实际应用场景：**

1. **性能监控**：将慢查询上报到 APM 系统（如 Sentry、DataDog）
2. **开发调试**：在开发环境中快速发现性能问题
3. **用户体验优化**：识别需要优化的 API 接口

### 5.4 错误日志

`useEnhancedQuery` 默认在开发环境自动记录错误：

```tsx
const { data } = useEnhancedQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  logErrors: true,  // 默认在开发环境为 true
})
```

当查询出错时，控制台会输出：
```
[useEnhancedQuery Error] ["user","123"]: Error: Network request failed
```

如果你想在生产环境禁用错误日志：

```tsx
logErrors: process.env.NODE_ENV === 'development'
```

### 5.5 完整示例：带监控的用户详情页

```tsx
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'

function UserDetailPage({ userId }) {
  const { 
    data: user, 
    isLoading, 
    isError, 
    error,
    refetchCount,
    lastQueryDuration,
    refetch
  } = useEnhancedQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) throw new Error('获取用户失败')
      return response.json()
    },
    trackPerformance: true,
    slowQueryThreshold: 3000,
    onSlowQuery: (duration, queryKey) => {
      // 发送到监控系统
      reportSlowQuery({ queryKey, duration })
    },
  })

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isError) {
    return (
      <ErrorDisplay 
        message={error.message} 
        onRetry={() => refetch()} 
      />
    )
  }

  return (
    <div>
      <UserCard user={user} />
      
      {/* 开发环境显示调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 text-xs">
          <p>查询耗时: {lastQueryDuration}ms</p>
          <p>刷新次数: {refetchCount}</p>
        </div>
      )}
    </div>
  )
}
```

现在你已经掌握了增强查询的使用。但你可能注意到，我们一直在手写 queryKey，比如 `['user', userId]`。随着项目变大，管理这些 key 会变得困难。接下来，让我们学习如何优雅地管理 Query Key。

---

## 6. 第四步：管理 Query Key

Query Key 是 TanStack Query 的核心概念。好的 Key 管理策略可以让你的代码更易维护、更不容易出错。

### 6.1 为什么需要管理 Query Key？

考虑以下场景：

```tsx
// 组件 A
useQuery({ queryKey: ['user', userId], ... })

// 组件 B
useQuery({ queryKey: ['users', userId], ... })  // 拼写错误！

// 组件 C - 需要失效用户缓存
queryClient.invalidateQueries({ queryKey: ['user', userId] })
```

问题：
1. 拼写错误导致缓存不共享
2. 修改 key 结构时需要全局搜索替换
3. 没有类型提示

### 6.2 使用内置的 Key 工厂

本库提供了一套预定义的 Key 工厂：

```tsx
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'

// 用户相关
queryKeys.users()              // ['tanstack-query', 'users']
queryKeys.user('123')          // ['tanstack-query', 'users', '123']
queryKeys.userProfile('123')   // ['tanstack-query', 'users', '123', 'profile']
queryKeys.userSettings('123')  // ['tanstack-query', 'users', '123', 'settings']
queryKeys.usersByRole('admin') // ['tanstack-query', 'users', 'by-role', 'admin']

// 文章相关
queryKeys.posts()              // ['tanstack-query', 'posts']
queryKeys.post('456')          // ['tanstack-query', 'posts', '456']
queryKeys.postsByUser('123')   // ['tanstack-query', 'posts', 'by-user', '123']
queryKeys.postComments('456')  // ['tanstack-query', 'posts', '456', 'comments']

// 搜索
queryKeys.search('react', 'posts')  // ['tanstack-query', 'search', { query: 'react', type: 'posts' }]

// 通知
queryKeys.notifications()           // ['tanstack-query', 'notifications']
queryKeys.unreadNotifications()     // ['tanstack-query', 'notifications', 'unread']
```

**使用示例：**

```tsx
import { queryKeys } from '@qiaopeng/tanstack-query-plus/core'
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'

function UserProfile({ userId }) {
  const { data } = useEnhancedQuery({
    queryKey: queryKeys.user(userId),  // 类型安全，不会拼错
    queryFn: () => fetchUser(userId),
  })
  
  // ...
}

// 失效缓存时也使用同样的 key
function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (_, { userId }) => {
      // 失效该用户的所有相关缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) })
    }
  })
}
```

### 6.3 创建自定义域 Key 工厂

对于内置 Key 工厂没有覆盖的业务领域，可以创建自定义工厂：

```tsx
import { createDomainKeyFactory } from '@qiaopeng/tanstack-query-plus/core'

// 创建产品域的 Key 工厂
const productKeys = createDomainKeyFactory('products')

productKeys.all()              // ['tanstack-query', 'products']
productKeys.lists()            // ['tanstack-query', 'products', 'list']
productKeys.list({ page: 1 })  // ['tanstack-query', 'products', 'list', { page: 1 }]
productKeys.details()          // ['tanstack-query', 'products', 'detail']
productKeys.detail('abc')      // ['tanstack-query', 'products', 'detail', 'abc']
productKeys.subResource('abc', 'reviews')  // ['tanstack-query', 'products', 'detail', 'abc', 'reviews']
productKeys.byRelation('category', 'electronics')  // ['tanstack-query', 'products', 'by-category', 'electronics']
```

**实际项目中的组织方式：**

```tsx
// src/queries/keys.ts
import { createDomainKeyFactory } from '@qiaopeng/tanstack-query-plus/core'

export const productKeys = createDomainKeyFactory('products')
export const orderKeys = createDomainKeyFactory('orders')
export const cartKeys = createDomainKeyFactory('cart')
export const reviewKeys = createDomainKeyFactory('reviews')

// 使用
import { productKeys } from '@/queries/keys'

useQuery({
  queryKey: productKeys.detail(productId),
  queryFn: () => fetchProduct(productId),
})
```

### 6.4 高级 Key 工具函数

本库还提供了一些高级的 Key 工具函数：

```tsx
import { 
  createFilteredKey,
  createPaginatedKey,
  createSortedKey,
  createSearchKey,
  createComplexKey,
  matchesKeyPattern,
  areKeysEqual
} from '@qiaopeng/tanstack-query-plus/core'

// 带筛选的 Key
const filteredKey = createFilteredKey(
  productKeys.lists(), 
  { category: 'electronics', inStock: true }
)
// ['tanstack-query', 'products', 'list', 'filtered', { category: 'electronics', inStock: true }]

// 带分页的 Key
const paginatedKey = createPaginatedKey(productKeys.lists(), 1, 20)
// ['tanstack-query', 'products', 'list', 'paginated', { page: 1, pageSize: 20 }]

// 带排序的 Key
const sortedKey = createSortedKey(productKeys.lists(), 'price', 'desc')
// ['tanstack-query', 'products', 'list', 'sorted', { sortBy: 'price', sortOrder: 'desc' }]

// 复杂查询 Key（组合多个条件）
const complexKey = createComplexKey(productKeys.lists(), {
  page: 1,
  pageSize: 20,
  filters: { category: 'electronics' },
  sortBy: 'price',
  sortOrder: 'desc',
  search: 'phone'
})

// 检查 Key 是否匹配模式
const matches = matchesKeyPattern(
  ['tanstack-query', 'products', 'detail', '123'],
  ['tanstack-query', 'products']  // 模式
)
// true - 可用于批量失效

// 比较两个 Key 是否相等
const equal = areKeysEqual(key1, key2)
```

### 6.5 Mutation Key 工厂

除了查询 Key，mutation 也可以有 Key（用于去重、追踪等）：

```tsx
import { createMutationKeyFactory } from '@qiaopeng/tanstack-query-plus/core'

const productMutations = createMutationKeyFactory('products')

productMutations.create()        // ['products', 'create']
productMutations.update('123')   // ['products', 'update', '123']
productMutations.delete('123')   // ['products', 'delete', '123']
productMutations.batch('archive') // ['products', 'batch', 'archive']
```

现在你已经掌握了 Query Key 的管理。接下来，让我们学习如何进行数据变更（Mutation）以及如何实现乐观更新。

---

## 7. 第五步：数据变更与乐观更新


查询（Query）用于获取数据，而变更（Mutation）用于创建、更新或删除数据。本库的 `useMutation` 提供了内置的乐观更新支持，让用户体验更流畅。

### 7.1 基础 Mutation

最基本的 mutation 使用：

```tsx
import { useMutation, useQueryClient } from '@qiaopeng/tanstack-query-plus'

function UpdateUserButton({ userId }) {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: (newName) => 
      fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName })
      }).then(r => r.json()),
    onSuccess: () => {
      // 成功后刷新用户数据
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`)
    }
  })

  return (
    <button 
      onClick={() => mutation.mutate('新名字')}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? '更新中...' : '更新名字'}
    </button>
  )
}
```

### 7.2 什么是乐观更新？

**传统流程：**
1. 用户点击"更新"
2. 显示 loading
3. 等待服务器响应
4. 更新 UI

**乐观更新流程：**
1. 用户点击"更新"
2. **立即更新 UI**（假设会成功）
3. 后台发送请求
4. 如果失败，**回滚到之前的状态**

乐观更新让用户感觉应用响应更快，体验更好。

### 7.3 使用内置乐观更新

本库的 `useMutation` 内置了乐观更新支持，无需手写复杂的 onMutate/onError 逻辑：

```tsx
import { useMutation } from '@qiaopeng/tanstack-query-plus/hooks'

function UpdateUserName({ userId, currentName }) {
  const mutation = useMutation({
    mutationFn: (newName) => updateUserAPI(userId, { name: newName }),
    
    // 乐观更新配置
    optimistic: {
      queryKey: ['user', userId],  // 要更新的缓存 key
      
      // 更新函数：接收旧数据和变量，返回新数据
      updater: (oldData, newName) => ({
        ...oldData,
        name: newName
      }),
      
      // 回滚回调（可选）：失败时执行
      rollback: (previousData, error) => {
        console.error('更新失败，已回滚:', error.message)
        toast.error(`更新失败: ${error.message}`)
      }
    },
    
    // 标准回调仍然可用
    onSuccess: () => {
      toast.success('更新成功')
    }
  })

  return (
    <button onClick={() => mutation.mutate('新名字')}>
      更新名字
    </button>
  )
}
```

**工作原理：**

1. 调用 `mutation.mutate('新名字')` 时：
   - 取消该 queryKey 的进行中请求
   - 保存当前缓存数据（用于回滚）
   - 调用 `updater` 立即更新缓存
   - 发送实际请求

2. 如果请求成功：
   - 自动失效该 queryKey，触发重新获取最新数据
   - 调用 `onSuccess` 回调

3. 如果请求失败：
   - 自动回滚到之前的数据
   - 调用 `rollback` 回调
   - 调用 `onError` 回调

### 7.4 字段映射

有时候 mutation 的变量名和缓存数据的字段名不一致，可以使用字段映射：

```tsx
const mutation = useMutation({
  mutationFn: ({ newTitle }) => updateTodo(todoId, { title: newTitle }),
  
  optimistic: {
    queryKey: ['todo', todoId],
    updater: (oldData, variables) => ({
      ...oldData,
      ...variables  // 映射后的变量会自动应用
    }),
    // 将 mutation 变量的 newTitle 映射到缓存数据的 title
    fieldMapping: {
      'newTitle': 'title'
    }
  }
})

// 调用时
mutation.mutate({ newTitle: '新标题' })
// 缓存会更新 title 字段
```

### 7.5 条件性乐观更新

本库未提供单独的 `useConditionalOptimisticMutation`。如需按条件启用乐观更新，使用以下两种安全模式：

1. 使用两个 mutation，根据条件选择调用哪个（最清晰、类型安全）：

```tsx
import { useMutation } from '@qiaopeng/tanstack-query-plus/hooks'

const optimisticUpdate = useMutation({
  mutationFn: updateTodo,
  optimistic: {
    queryKey: ['todos'],
    updater: (oldTodos, updatedTodo) => oldTodos?.map(t => t.id === updatedTodo.id ? { ...t, ...updatedTodo } : t)
  }
})

const plainUpdate = useMutation({ mutationFn: updateTodo })

function save(todo) {
  const shouldOptimistic = todo.priority === 'high'
  const runner = shouldOptimistic ? optimisticUpdate : plainUpdate
  runner.mutate(todo)
}
```

2. 基于状态切换 `optimistic.enabled`（适合全局开关）：

```tsx
// 以应用自身配置或组件状态为准（此处仅示例）
const enableOptimistic = true
const mutation = useMutation({
  mutationFn: updateTodo,
  optimistic: {
    queryKey: ['todos'],
    enabled: enableOptimistic,
    updater: (oldTodos, updatedTodo) => oldTodos?.map(t => t.id === updatedTodo.id ? { ...t, ...updatedTodo } : t)
  }
})
```

### 7.6 列表操作的简化 Mutation

对于常见的列表 CRUD 操作，可以使用 `useListMutation`：

```tsx
import { useListMutation } from '@qiaopeng/tanstack-query-plus/hooks'

function TodoList() {
  const mutation = useListMutation(
    async ({ operation, data }) => {
      switch (operation) {
        case 'create':
          return api.createTodo(data)
        case 'update':
          return api.updateTodo(data.id, data)
        case 'delete':
          return api.deleteTodo(data.id)
      }
    },
    ['todos']  // 操作完成后自动失效这个 queryKey
  )

  const handleCreate = () => {
    mutation.mutate({ 
      operation: 'create', 
      data: { title: '新任务', done: false } 
    })
  }

  const handleUpdate = (todo) => {
    mutation.mutate({ 
      operation: 'update', 
      data: { ...todo, done: !todo.done } 
    })
  }

  const handleDelete = (todoId) => {
    mutation.mutate({ 
      operation: 'delete', 
      data: { id: todoId } 
    })
  }

  // ...
}
```

### 7.7 批量 Mutation

本库未提供 `useBatchMutation`。进行批量操作时，推荐两种模式：

1. 在一个 mutation 中封装批量逻辑（一次请求或并发 Promise）：

```tsx
import { useMutation } from '@qiaopeng/tanstack-query-plus/hooks'

const batchDelete = useMutation({
  mutationFn: async (ids: string[]) => {
    return Promise.all(ids.map(id => api.deleteTodo(id)))
  },
  optimistic: {
    queryKey: ['todos'],
    updater: (old, ids: string[]) => old?.filter(t => !ids.includes(String(t.id)))
  }
})

// 使用
batchDelete.mutate(['id1', 'id2', 'id3'])
```

2. 使用离线队列在恢复网络后批量执行（稳健且可持久化）：

```tsx
import { createOfflineQueueManager, mutationRegistry, serializeMutationKey } from '@qiaopeng/tanstack-query-plus/features'
import { MutationOperationType } from '@qiaopeng/tanstack-query-plus/types'

const queue = createOfflineQueueManager({ storageKey: 'todo-ops', concurrency: 3 })

async function registerDelete(id: string) {
  const key = serializeMutationKey(['todos', 'delete', id])
  mutationRegistry.register(key, () => api.deleteTodo(id))
  await queue.add({
    type: MutationOperationType.DELETE,
    mutationKey: ['todos', 'delete', id],
    variables: { id },
    mutationFn: () => api.deleteTodo(id),
    priority: 1
  })
}
```

### 7.8 乐观更新工具函数

本库还提供了一些工具函数来简化列表的乐观更新：

```tsx
import { 
  listUpdater,
  createAddItemConfig,
  createUpdateItemConfig,
  createRemoveItemConfig,
  batchUpdateItems,
  batchRemoveItems,
  reorderItems,
  conditionalUpdateItems
} from '@qiaopeng/tanstack-query-plus/utils'

// 列表更新器（要求列表项有 id 字段）
const list1 = listUpdater.add(items, newItem)      // 添加到头部（如果 id 已存在则更新）
const list2 = listUpdater.update(items, { id: '1', title: '新标题' })  // 更新项
const list3 = listUpdater.remove(items, '1')       // 按 id 移除项

// 创建预配置的乐观更新配置（返回 { queryKey, updater, rollback?, enabled } 对象）
const addConfig = createAddItemConfig(['todos'], { 
  addToTop: true,  // 默认 true，添加到头部
  onRollback: (error) => console.error('添加失败:', error)
})
const updateConfig = createUpdateItemConfig(['todos'])
const removeConfig = createRemoveItemConfig(['todos'])

// 在 mutation 中使用这些配置
const addMutation = useMutation({
  mutationFn: createTodo,
  optimistic: addConfig,  // 直接使用预配置
})

// 批量更新（每个更新对象必须包含 id）
const list4 = batchUpdateItems(items, [
  { id: '1', done: true },
  { id: '2', done: true }
])

// 批量移除
const list5 = batchRemoveItems(items, ['1', '2', '3'])

// 重新排序（将 fromIndex 位置的项移动到 toIndex）
const list6 = reorderItems(items, 0, 2)  // 将第一项移到第三位

// 条件更新（满足条件的项才更新）
const list7 = conditionalUpdateItems(
  items,
  (item) => item.status === 'pending',  // 条件
  (item) => ({ status: 'completed' })   // 更新内容
)
```

### 7.9 完整示例：Todo 应用

```tsx
import { useEnhancedQuery, useMutation } from '@qiaopeng/tanstack-query-plus/hooks'
import { listUpdater } from '@qiaopeng/tanstack-query-plus/utils'

function TodoApp() {
  // 查询 todos
  const { data: todos, isLoading } = useEnhancedQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  // 添加 todo（乐观更新）
  const addMutation = useMutation({
    mutationFn: (title) => api.createTodo({ title, done: false }),
    optimistic: {
      queryKey: ['todos'],
      updater: (oldTodos, title) => [
        { id: `temp-${Date.now()}`, title, done: false },
        ...(oldTodos || [])
      ],
      rollback: (_, error) => toast.error(`添加失败: ${error.message}`)
    }
  })

  // 切换完成状态（乐观更新）
  const toggleMutation = useMutation({
    mutationFn: (todo) => api.updateTodo(todo.id, { done: !todo.done }),
    optimistic: {
      queryKey: ['todos'],
      updater: (oldTodos, todo) => 
        oldTodos?.map(t => t.id === todo.id ? { ...t, done: !t.done } : t),
    }
  })

  // 删除 todo（乐观更新）
  const deleteMutation = useMutation({
    mutationFn: (todoId) => api.deleteTodo(todoId),
    optimistic: {
      queryKey: ['todos'],
      updater: (oldTodos, todoId) => oldTodos?.filter(t => t.id !== todoId),
    }
  })

  if (isLoading) return <div>加载中...</div>

  return (
    <div>
      <AddTodoForm onAdd={(title) => addMutation.mutate(title)} />
      
      <ul>
        {todos?.map(todo => (
          <li key={todo.id}>
            <input 
              type="checkbox" 
              checked={todo.done}
              onChange={() => toggleMutation.mutate(todo)}
            />
            <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => deleteMutation.mutate(todo.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
  }
}
```

### 7.10 安全提示

- 明确回滚路径：在 `onError` 或 `rollback` 中恢复缓存或触发重新拉取
- 稳定的 `queryKey`：使用 Key 工厂，避免结构漂移导致更新不到位
- 变量安全：Mutation 变量不包含敏感信息（如 token），错误上报需脱敏
- 冲突处理：对 409 触发家族失效与 UI 提示；对 500 展示兜底提示并记录错误

现在你已经掌握了数据变更和乐观更新。接下来，让我们学习如何处理无限滚动和分页场景。

---

## 8. 第六步：无限滚动与分页


无限滚动是现代应用中常见的交互模式。本库提供了 `useEnhancedInfiniteQuery` 和多种分页模式的工厂函数，让实现变得简单。

### 8.1 理解三种分页模式

在实际项目中，后端 API 通常采用以下三种分页方式之一：

1. **游标分页（Cursor Pagination）**
   - 使用游标（通常是最后一条记录的 ID）来获取下一页
   - 适合：社交媒体 feed、聊天记录
   - 示例：`/api/posts?cursor=abc123`

2. **偏移分页（Offset Pagination）**
   - 使用 offset 和 limit 来获取数据
   - 适合：传统列表、搜索结果
   - 示例：`/api/posts?offset=20&limit=10`

3. **页码分页（Page Number Pagination）**
   - 使用页码来获取数据
   - 适合：传统分页 UI
   - 示例：`/api/posts?page=2`

### 8.2 游标分页

```tsx
import { 
  useEnhancedInfiniteQuery, 
  createCursorPaginationOptions 
} from '@qiaopeng/tanstack-query-plus/hooks'

// 假设 API 返回格式：
// { items: [...], cursor: 'next-cursor' | null }

function PostFeed() {
  // 创建游标分页配置
  const options = createCursorPaginationOptions({
    queryKey: ['posts', 'feed'],
    queryFn: async (cursor) => {
      const url = cursor 
        ? `/api/posts?cursor=${cursor}` 
        : '/api/posts'
      const response = await fetch(url)
      return response.json()
      // 返回 { items: Post[], cursor: string | null }
    },
    initialCursor: null,  // 初始游标
    staleTime: 30000,
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useEnhancedInfiniteQuery(options)

  if (isLoading) return <div>加载中...</div>

  return (
    <div>
      {/* 展平所有页的数据 */}
      {data?.pages.map((page, pageIndex) => (
        <div key={pageIndex}></div>      {page.items.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ))}

      {/* 加载更多按钮 */}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage 
          ? '加载中...' 
          : hasNextPage 
            ? '加载更多' 
            : '没有更多了'}
      </button>
    </div>
  )
}
```

### 8.3 偏移分页

```tsx
import { 
  useEnhancedInfiniteQuery, 
  createOffsetPaginationOptions 
} from '@qiaopeng/tanstack-query-plus/hooks'

// 假设 API 返回格式：
// { items: [...], total: 100, hasMore: true }

function ProductList() {
  const options = createOffsetPaginationOptions({
    queryKey: ['products'],
    queryFn: async (offset, limit) => {
      const response = await fetch(
        `/api/products?offset=${offset}&limit=${limit}`
      )
      return response.json()
      // 返回 { items: Product[], total: number, hasMore: boolean }
    },
    limit: 20,  // 每页数量
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEnhancedInfiniteQuery(options)

  // 计算已加载的总数
  const loadedCount = data?.pages.reduce(
    (sum, page) => sum + page.items.length, 
    0
  ) || 0

  return (
    <div>
      <div className="grid grid-cols-4 gap-4">
        {data?.pages.flatMap(page => page.items).map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-4 text-center">
        <p>已加载 {loadedCount} / {data?.pages[0]?.total || 0} 个商品</p>
        
        {hasNextPage && (
          <button 
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            {isFetchingNextPage ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>
    </div>
  )
}
```

### 8.4 页码分页

```tsx
import { 
  useEnhancedInfiniteQuery, 
  createPageNumberPaginationOptions 
} from '@qiaopeng/tanstack-query-plus/hooks'

// 假设 API 返回格式：
// { items: [...], page: 1, totalPages: 10 }

function ArticleList() {
  const options = createPageNumberPaginationOptions({
    queryKey: ['articles'],
    queryFn: async (page) => {
      const response = await fetch(`/api/articles?page=${page}`)
      return response.json()
      // 返回 { items: Article[], page: number, totalPages: number }
    },
  })

  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
  } = useEnhancedInfiniteQuery(options)

  const currentPage = data?.pages.length || 0
  const totalPages = data?.pages[0]?.totalPages || 0

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.items.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ))}

      <div className="flex justify-between mt-4">
        <button 
          onClick={() => fetchPreviousPage()}
          disabled={!hasPreviousPage}
        >
          上一页
        </button>
        
        <span>第 {currentPage} / {totalPages} 页</span>
        
        <button 
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage ? '加载中...' : '下一页'}
        </button>
      </div>
    </div>
  )
}
```

### 8.5 无限滚动（自动加载）

结合 Intersection Observer 实现滚动到底部自动加载：

```tsx
import { useRef, useEffect } from 'react'
import { useEnhancedInfiniteQuery, createOffsetPaginationOptions } from '@qiaopeng/tanstack-query-plus/hooks'

function InfiniteScrollList() {
  const loadMoreRef = useRef(null)
  
  const options = createOffsetPaginationOptions({
    queryKey: ['items'],
    queryFn: (offset, limit) => fetchItems(offset, limit),
    limit: 20,
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEnhancedInfiniteQuery(options)

  // 监听滚动到底部
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div>
      {data?.pages.flatMap(page => page.items).map(item => (
        <ItemCard key={item.id} item={item} />
      ))}

      {/* 触发加载的哨兵元素 */}
      <div ref={loadMoreRef} className="h-10">
        {isFetchingNextPage && <div>加载中...</div>}
        {!hasNextPage && <div>已经到底了</div>}
      </div>
    </div>
  )
}
```

### 8.6 自定义无限查询配置

如果预设的分页模式不满足需求，可以使用 `createInfiniteQueryOptions` 创建自定义配置：

```tsx
import { createInfiniteQueryOptions, useEnhancedInfiniteQuery } from '@qiaopeng/tanstack-query-plus/hooks'

// 使用 createInfiniteQueryOptions 创建自定义分页配置
const customOptions = createInfiniteQueryOptions({
  queryKey: ['custom-list'],
  queryFn: ({ pageParam }) => fetchCustomData(pageParam),
  initialPageParam: { page: 1, filter: 'active' },
  getNextPageParam: (lastPage, allPages, lastPageParam) => {
    if (lastPage.hasMore) {
      return { ...lastPageParam, page: lastPageParam.page + 1 }
    }
    return undefined  // 没有更多数据
  },
  getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
    if (firstPageParam.page > 1) {
      return { ...firstPageParam, page: firstPageParam.page - 1 }
    }
    return undefined
  },
  staleTime: 60000,
  gcTime: 300000,
})

const result = useEnhancedInfiniteQuery(customOptions)
```

**方式二**：也可以直接传递配置给 `useEnhancedInfiniteQuery`：

```tsx
const result = useEnhancedInfiniteQuery({
  queryKey: ['custom-list'],
  queryFn: ({ pageParam }) => fetchCustomData(pageParam),
  initialPageParam: { page: 1, filter: 'active' },
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
})
```

**方式三**：使用 TanStack Query 的 `infiniteQueryOptions`（如果你需要与原生 API 保持一致）：

```tsx
import { infiniteQueryOptions } from '@tanstack/react-query'

const customOptions = infiniteQueryOptions({
  queryKey: ['custom-list'],
  queryFn: ({ pageParam }) => fetchCustomData(pageParam),
  initialPageParam: { page: 1, filter: 'active' },
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
})

const result = useEnhancedInfiniteQuery(customOptions)
```

现在你已经掌握了无限滚动和分页。在复杂的应用中，我们经常需要同时发起多个查询。接下来，让我们学习批量查询。

---

## 9. 第七步：全局状态与 Mutation 监控

在复杂的应用中，你可能需要监控全局的加载状态，或者获取正在进行的 Mutation 进度。本库补全了 v5 的状态监控 Hooks。

### 9.1 监控全局加载状态

使用 `useIsFetching` 和 `useIsMutating` 可以实时感知后台活动：

```tsx
import { useIsFetching, useIsMutating } from '@qiaopeng/tanstack-query-plus/hooks'

function GlobalLoadingIndicator() {
  const isFetching = useIsFetching() // 正在进行的 Query 数量
  const isMutating = useIsMutating() // 正在进行的 Mutation 数量

  if (!isFetching && !isMutating) return null

  return (
    <div className="fixed top-0 right-0 p-4">
      {isFetching > 0 && <span>数据加载中...</span>}
      {isMutating > 0 && <span>后台同步中...</span>}
    </div>
  )
}
```

### 9.2 监控 Mutation 详细状态

`useMutationState` 允许你订阅 Mutation 缓存，获取特定任务的进度或结果：

```tsx
import { useMutationState } from '@qiaopeng/tanstack-query-plus/hooks'

function UploadManager() {
  // 获取所有 ['upload'] 相关的 mutation 状态
  const uploads = useMutationState({
    filters: { mutationKey: ['upload'], status: 'pending' },
    select: (mutation) => mutation.state.variables,
  })

  return (
    <div>
      <h3>正在上传 ({uploads.length})</h3>
      <ul>
        {uploads.map((file, i) => (
          <li key={i}>{file.name} 正在传输...</li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 10. 第八步：批量查询与仪表盘


在仪表盘、数据概览等场景中，我们经常需要同时发起多个查询。本库提供了强大的批量查询功能，包括统计信息、批量操作和错误聚合。

### 9.1 基础批量查询

使用 `useEnhancedQueries` 同时发起多个查询：

```tsx
import { useEnhancedQueries, batchQueryUtils } from '@qiaopeng/tanstack-query-plus/hooks'

function Dashboard() {
  const { data: results, stats, operations } = useEnhancedQueries([
    { queryKey: ['users'], queryFn: fetchUsers },
    { queryKey: ['posts'], queryFn: fetchPosts },
    { queryKey: ['comments'], queryFn: fetchComments },
    { queryKey: ['analytics'], queryFn: fetchAnalytics },
  ])

  // stats 包含聚合统计信息
  // {
  //   total: 4,        // 总查询数
  //   loading: 1,      // 加载中的数量
  //   success: 2,      // 成功的数量
  //   error: 1,        // 失败的数量
  //   stale: 0,        // 过期的数量
  //   successRate: 50, // 成功率 (%)
  //   errorRate: 25,   // 错误率 (%)
  // }

  return (
    <div>
      {/* 显示加载状态 */}
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p>加载进度: {stats.success}/{stats.total}</p>
        <p>成功率: {stats.successRate.toFixed(1)}%</p>
        {stats.loading > 0 && <p>正在加载 {stats.loading} 个查询...</p>}
      </div>

      {/* 批量操作按钮 */}
      <div className="space-x-2 mb-4">
        <button onClick={() => operations.refetchAll()}>
          刷新全部
        </button>
        <button onClick={() => operations.invalidateAll()}>
          失效全部
        </button>
        <button onClick={() => operations.cancelAll()}>
          取消全部
        </button>
      </div>

      {/* 错误处理 */}
      {batchQueryUtils.hasError(results) && (
        <div className="p-4 bg-red-100 rounded mb-4">
          <p>部分查询失败</p>
          <button onClick={() => operations.retryFailed()}>
            重试失败的查询
          </button>
        </div>
      )}

      {/* 数据展示 */}
      {batchQueryUtils.isAllSuccess(results) && (
        <div className="grid grid-cols-2 gap-4">
          <UserStats data={results[0].data} />
          <PostStats data={results[1].data} />
          <CommentStats data={results[2].data} />
          <AnalyticsChart data={results[3].data} />
        </div>
      )}
    </div>
  )
}
```

### 9.2 批量查询工具函数

`batchQueryUtils` 提供了丰富的工具函数：

```tsx
import { batchQueryUtils } from '@qiaopeng/tanstack-query-plus/hooks'

// 状态检查
batchQueryUtils.isAllLoading(results)   // 是否全部加载中
batchQueryUtils.isAllSuccess(results)   // 是否全部成功
batchQueryUtils.isAllPending(results)   // 是否全部待处理
batchQueryUtils.hasError(results)       // 是否有错误
batchQueryUtils.hasStale(results)       // 是否有过期数据
batchQueryUtils.isAnyFetching(results)  // 是否有正在获取的

// 数据提取
batchQueryUtils.getAllData(results)     // 获取所有成功的数据
batchQueryUtils.getSuccessData(results) // 获取成功数据（带类型）
batchQueryUtils.getAllErrors(results)   // 获取所有错误
batchQueryUtils.getFirstError(results)  // 获取第一个错误

// 高级功能
batchQueryUtils.createErrorAggregate(results, queries)  // 创建错误聚合
batchQueryUtils.createOperationReport(results, queries, startTime)  // 创建操作报告
```

### 9.3 仪表盘查询（命名数据）

`useDashboardQueries` 让你可以用对象形式定义查询，返回命名的数据：

```tsx
import { useDashboardQueries } from '@qiaopeng/tanstack-query-plus/hooks'

function AdminDashboard() {
  const { 
    data,      // 命名的数据对象
    isLoading, // 任一查询加载中
    isError,   // 任一查询出错
    isSuccess, // 全部成功
    stats,     // 统计信息
    results    // 原始结果数组
  } = useDashboardQueries({
    users: { 
      queryKey: ['dashboard', 'users'], 
      queryFn: fetchUserStats 
    },
    revenue: { 
      queryKey: ['dashboard', 'revenue'], 
      queryFn: fetchRevenueStats 
    },
    orders: { 
      queryKey: ['dashboard', 'orders'], 
      queryFn: fetchOrderStats 
    },
    traffic: { 
      queryKey: ['dashboard', 'traffic'], 
      queryFn: fetchTrafficStats 
    },
  })

  if (isLoading) return <DashboardSkeleton />
  if (isError) return <DashboardError />

  // 直接通过名称访问数据
  return (
    <div className="grid grid-cols-2 gap-6">
      <StatCard title="用户" value={data.users?.total} />
      <StatCard title="收入" value={data.revenue?.total} />
      <StatCard title="订单" value={data.orders?.count} />
      <TrafficChart data={data.traffic} />
    </div>
  )
}
```

### 9.4 依赖查询链

有时候后续查询依赖于前一个查询的结果。使用 `useDependentBatchQueries`：

```tsx
import { useDependentBatchQueries } from '@qiaopeng/tanstack-query-plus/hooks'

function UserDashboard({ userId }) {
  const { 
    primaryResult,  // 主查询结果
    results,        // 从查询结果数组
    stats,          // 统计信息
    operations      // 批量操作
  } = useDependentBatchQueries({
    // 主查询：获取用户信息
    primaryQuery: {
      queryKey: ['user', userId],
      queryFn: () => fetchUser(userId),
    },
    // 从查询：基于用户信息获取相关数据
    dependentQueries: (user) => [
      { 
        queryKey: ['posts', user.id], 
        queryFn: () => fetchUserPosts(user.id) 
      },
      { 
        queryKey: ['followers', user.id], 
        queryFn: () => fetchFollowers(user.id) 
      },
      { 
        queryKey: ['following', user.id], 
        queryFn: () => fetchFollowing(user.id) 
      },
      // 可以使用用户数据中的任何信息
      ...(user.isAdmin ? [
        { 
          queryKey: ['admin-stats'], 
          queryFn: fetchAdminStats 
        }
      ] : [])
    ],
  })

  if (primaryResult.isLoading) return <div>加载用户信息...</div>
  if (primaryResult.isError) return <div>加载失败</div>

  const user = primaryResult.data
  const [postsResult, followersResult, followingResult] = results

  return (
    <div>
      <UserHeader user={user} />
      
      <div className="grid grid-cols-3 gap-4">
        <PostList 
          posts={postsResult?.data} 
          isLoading={postsResult?.isLoading} 
        />
        <FollowerList 
          followers={followersResult?.data}
          isLoading={followersResult?.isLoading}
        />
        <FollowingList 
          following={followingResult?.data}
          isLoading={followingResult?.isLoading}
        />
      </div>
    </div>
  )
}
```

### 9.5 动态批量查询

当查询数量是动态的（比如基于一个 ID 列表）：

```tsx
import { useDynamicBatchQueries } from '@qiaopeng/tanstack-query-plus/hooks'

function ProductComparison({ productIds }) {
  const { data: results, stats } = useDynamicBatchQueries({
    items: productIds,  // 动态的 ID 列表
    queryKeyPrefix: ['product'],
    queryFn: (productId) => fetchProduct(productId),
    enabled: productIds.length > 0,
    staleTime: 60000,
  })

  if (stats.loading > 0) {
    return <div>加载中... ({stats.success}/{stats.total})</div>
  }

  const products = batchQueryUtils.getSuccessData(results)

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### 9.6 自动刷新批量查询

对于需要定期刷新的仪表盘：

```tsx
import { useAutoRefreshBatchQueries } from '@qiaopeng/tanstack-query-plus/hooks'

function LiveDashboard() {
  const { data: results, stats } = useAutoRefreshBatchQueries({
    queries: [
      { queryKey: ['live-users'], queryFn: fetchLiveUsers },
      { queryKey: ['live-orders'], queryFn: fetchLiveOrders },
      { queryKey: ['live-revenue'], queryFn: fetchLiveRevenue },
    ],
    refreshInterval: 30000,  // 每 30 秒刷新
    enabled: true,
  })

  // ...
}
```

### 9.7 条件批量查询

只执行满足条件的查询：

```tsx
import { useConditionalBatchQueries } from '@qiaopeng/tanstack-query-plus/hooks'

function ConditionalDashboard({ userRole }) {
  const { data: results } = useConditionalBatchQueries([
    { 
      queryKey: ['basic-stats'], 
      queryFn: fetchBasicStats,
      enabled: true  // 总是执行
    },
    { 
      queryKey: ['admin-stats'], 
      queryFn: fetchAdminStats,
      enabled: userRole === 'admin'  // 只有管理员执行
    },
    { 
      queryKey: ['premium-stats'], 
      queryFn: fetchPremiumStats,
      enabled: userRole === 'premium' || userRole === 'admin'
    },
  ])

  // ...
}
```

现在你已经掌握了批量查询。为了提升用户体验，我们可以在用户需要数据之前就预先获取。接下来，让我们学习智能预取。

---

## 10. 第八步：智能预取


预取（Prefetch）是指在用户实际需要数据之前就提前获取。这可以显著提升用户体验，让页面切换感觉更快。本库提供了多种预取策略。

### 10.1 悬停预取

当用户将鼠标悬停在链接上时预取数据：

```tsx
import { useHoverPrefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function UserLink({ userId, userName }) {
  // 返回需要绑定到元素的事件处理器
  const hoverProps = useHoverPrefetch(
    ['user', userId],           // queryKey
    () => fetchUser(userId),    // queryFn
    {
      hoverDelay: 200,    // 悬停 200ms 后开始预取（避免快速划过触发）
      minInterval: 1000,  // 同一个 key 最小预取间隔
      staleTime: 30000,   // 数据新鲜时不预取
    }
  )

  return (
    <a 
      href={`/user/${userId}`} 
      {...hoverProps}  // 绑定 onMouseEnter, onMouseLeave, onFocus
    >
      {userName}
    </a>
  )
}
```

**工作原理：**
1. 用户鼠标移入元素
2. 等待 `hoverDelay` 毫秒
3. 检查数据是否已缓存且新鲜
4. 如果需要，发起预取请求
5. 用户点击链接时，数据已经准备好了

### 10.2 智能预取

`useSmartPrefetch` 会自动检测网络状态，在慢网络时跳过预取：

```tsx
import { useSmartPrefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function ProductCard({ productId }) {
  const { prefetch, shouldPrefetch, clearPrefetchHistory } = useSmartPrefetch()

  const handleMouseEnter = () => {
    // 自动检测网络状态，慢网络时不预取
    prefetch(
      ['product', productId],
      () => fetchProduct(productId),
      { staleTime: 60000 }
    )
  }

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      className="product-card"
    >
      <ProductImage id={productId} />
      <ProductInfo id={productId} />
      
      {/* 可选：显示网络状态 */}
      {!shouldPrefetch && (
        <span className="text-xs text-gray-400">
          慢网络，已禁用预取
        </span>
      )}
    </div>
  )
}
```

### 10.3 视口预取

当元素进入视口时预取（需要安装 `react-intersection-observer`）：

```tsx
import { useInViewPrefetch } from '@qiaopeng/tanstack-query-plus/hooks/inview'

function LazySection({ sectionId }) {
  // 返回一个 ref，绑定到需要监听的元素
  const ref = useInViewPrefetch(
    ['section', sectionId],
    () => fetchSectionData(sectionId),
    {
      threshold: 0.1,      // 10% 可见时触发
      rootMargin: '100px', // 提前 100px 触发（元素还没完全进入视口）
      triggerOnce: true,   // 只触发一次
    }
  )

  return (
    <section ref={ref}>
      <SectionContent id={sectionId} />
    </section>
  )
}
```

**使用场景：**
- 长页面的各个区块
- 图片懒加载
- 无限滚动列表的下一批数据

### 10.4 路由预取

在路由切换前预取下一个页面的数据：

```tsx
import { useRoutePrefetch } from '@qiaopeng/tanstack-query-plus/hooks'
import { Link, useNavigate } from 'react-router-dom'

function Navigation() {
  const prefetch = useRoutePrefetch()
  const navigate = useNavigate()

  const handlePrefetchUser = (userId) => {
    prefetch(
      ['user', userId],
      () => fetchUser(userId),
      { staleTime: 30000 }
    )
  }

  return (
    <nav>
      <Link 
        to="/user/123"
        onMouseEnter={() => handlePrefetchUser('123')}
      >
        用户 123
      </Link>
      
      {/* 或者在按钮点击前预取 */}
      <button
        onMouseEnter={() => handlePrefetchUser('456')}
        onClick={() => navigate('/user/456')}
      >
        查看用户 456
      </button>
    </nav>
  )
}
```

### 10.5 条件预取

只在满足条件时预取：

```tsx
import { useConditionalPrefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function SearchResults({ query, isHovered }) {
  // 当 isHovered 为 true 时预取
  useConditionalPrefetch(
    ['search', query],
    () => fetchSearchResults(query),
    isHovered,  // 条件
    { delay: 300 }  // 延迟 300ms
  )

  // ...
}
```

### 10.6 空闲时预取

利用浏览器空闲时间预取：

```tsx
import { useIdlePrefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function App() {
  // 在浏览器空闲时预取常用数据
  useIdlePrefetch(
    ['common-data'],
    fetchCommonData,
    { 
      timeout: 2000,  // 最多等待 2 秒进入空闲
      enabled: true 
    }
  )

  return <MainContent />
}
```

**工作原理：**
- 使用 `requestIdleCallback` API
- 在浏览器空闲时执行预取
- 不影响主线程性能

### 10.7 周期预取

定期预取数据，保持缓存新鲜：

```tsx
import { usePeriodicPrefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function Dashboard() {
  // 每分钟预取一次
  usePeriodicPrefetch(
    ['dashboard-stats'],
    fetchDashboardStats,
    { 
      interval: 60000,  // 60 秒
      enabled: true 
    }
  )

  // ...
}
```

### 10.8 批量预取

一次预取多个查询：

```tsx
import { useBatchPrefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function HomePage() {
  const batchPrefetch = useBatchPrefetch()

  useEffect(() => {
    // 页面加载后预取常用数据
    batchPrefetch([
      { queryKey: ['featured-products'], queryFn: fetchFeaturedProducts },
      { queryKey: ['categories'], queryFn: fetchCategories },
      { queryKey: ['promotions'], queryFn: fetchPromotions },
    ])
  }, [batchPrefetch])

  // ...
}
```

### 10.9 优先级预取

按优先级执行预取任务：

```tsx
import { usePriorityPrefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function App() {
  const { addPrefetchTask, processTasks, taskCount } = usePriorityPrefetch()

  useEffect(() => {
    // 添加不同优先级的预取任务
    addPrefetchTask(['critical-data'], fetchCriticalData, 'high')
    addPrefetchTask(['important-data'], fetchImportantData, 'medium')
    addPrefetchTask(['optional-data'], fetchOptionalData, 'low')

    // 按优先级顺序执行
    processTasks()
  }, [])

  return (
    <div>
      {taskCount > 0 && <span>预取中... ({taskCount} 个任务)</span>}
      <MainContent />
    </div>
  )
}
```

### 10.10 预测性预取

基于用户行为预测并预取：

```tsx
import { usePredictivePrefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function ProductBrowser() {
  const { 
    recordInteraction, 
    getPredictions, 
    prefetchPredicted 
  } = usePredictivePrefetch()

  const handleProductClick = (productId) => {
    // 记录用户交互
    recordInteraction('click', productId)
    navigate(`/product/${productId}`)
  }

  const handleProductHover = (productId) => {
    recordInteraction('hover', productId)
  }

  // 基于历史行为预取
  useEffect(() => {
    prefetchPredicted((target) => ({
      queryKey: ['product', target],
      queryFn: () => fetchProduct(target)
    }))
  }, [prefetchPredicted])

  return (
    <div>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => handleProductClick(product.id)}
          onMouseEnter={() => handleProductHover(product.id)}
        />
      ))}
    </div>
  )
}
```

### 10.11 预取最佳实践

1. **不要过度预取**：只预取用户很可能需要的数据
2. **设置合理的 staleTime**：避免重复预取新鲜数据
3. **考虑网络状况**：使用 `useSmartPrefetch` 在慢网络时禁用
4. **使用延迟**：悬停预取应该有延迟，避免快速划过触发
5. **优先级管理**：关键数据优先预取

现在你已经掌握了预取策略。接下来，让我们学习 Suspense 模式，它可以让你的代码更简洁。

### 10.12 安全提示

- 结合网络状况：使用 `useSmartPrefetch` 在慢网络禁用预取，避免拥塞
- 控制频率与间隔：为悬停/路由预取设置 `minInterval`，避免重复请求
- 严格限定 Key：预取目标必须是稳定且可序列化的 `queryKey`
- 避免敏感信息：不要将敏感数据拼入 `queryKey`
- 可回收：在复杂页面中适时清理预取历史（`clearPrefetchHistory`）以避免状态膨胀

---

## 12. 第十步：Suspense 模式与 SSR

React Suspense 提供了声明式的加载处理。本库不仅支持增强的 Suspense Hooks，还提供了完善的 SSR 水合支持。

### 12.1 基础 Suspense 查询

`useEnhancedSuspenseQuery` 保证 `data` 始终存在，省去非空判断：

```tsx
import { useEnhancedSuspenseQuery } from '@qiaopeng/tanstack-query-plus/hooks'

function UserProfile({ userId }) {
  const { data } = useEnhancedSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })
  
  return <div>{data.name}</div>
}
```

### 12.2 SSR 水合支持

在 Next.js (App Router) 或其他 SSR 框架中，使用 `HydrationBoundary` 进行注水：

```tsx
// Server Component
import { dehydrate, QueryClient } from '@qiaopeng/tanstack-query-plus'
import { HydrationBoundary } from '@qiaopeng/tanstack-query-plus/components'

export default async function Page() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({ queryKey: ['posts'], queryFn: fetchPosts })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsList />
    </HydrationBoundary>
  )
}
```

### 12.3 使用 SuspenseWrapper 组件

本库提供了 `SuspenseWrapper` 和 `QuerySuspenseWrapper` 组件，它们组合了 Suspense 和 ErrorBoundary：

```tsx
import { SuspenseWrapper, QuerySuspenseWrapper } from '@qiaopeng/tanstack-query-plus/components'

function UserPage({ userId }) {
  return (
    <SuspenseWrapper
      fallback={<UserSkeleton />}
      errorFallback={(error, reset) => (
        <div className="error-container">
          <p>加载失败: {error.message}</p>
          <button onClick={reset}>重试</button>
        </div>
      )}
      onError={(error, info) => {
        // 上报错误到监控系统
        reportError(error, info)
      }}
      resetKeys={[userId]}  // userId 变化时重置错误状态
    >
      <UserProfile userId={userId} />
    </SuspenseWrapper>
  )
}

// QuerySuspenseWrapper 是 SuspenseWrapper 的别名，语义更清晰
function DataPage() {
  return (
    <QuerySuspenseWrapper
      fallback={<DataSkeleton />}
      errorFallback={(error, reset) => (
        <ErrorDisplay error={error} onRetry={reset} />
      )}
    >
      <DataComponent />
    </QuerySuspenseWrapper>
  )
}
```

**注意**：`QuerySuspenseWrapper` 和 `SuspenseWrapper` 功能完全相同，只是名称不同。使用 `QuerySuspenseWrapper` 可以让代码语义更清晰，表明这是用于查询的 Suspense 包装器。

### 11.4 QueryErrorBoundary

专门为查询设计的错误边界，集成了 React Query 的错误重置：

```tsx
import { QueryErrorBoundary } from '@qiaopeng/tanstack-query-plus/components'

function DataSection() {
  return (
    <QueryErrorBoundary
      fallback={(error, reset) => (
        <div>
          <p>查询失败: {error.message}</p>
          <button onClick={reset}>重新加载</button>
        </div>
      )}
      resetKeys={['data-key']}
    >
      <Suspense fallback={<Loading />}>
        <DataComponent />
      </Suspense>
    </QueryErrorBoundary>
  )
}
```

### 11.5 Loading 组件库

本库提供了多种预设的 Loading 组件：

```tsx
import {
  DefaultLoadingFallback,  // 默认加载指示器
  SmallLoadingIndicator,   // 小型加载指示器
  FullScreenLoading,       // 全屏加载
  TextSkeletonFallback,    // 文本骨架屏
  CardSkeletonFallback,    // 卡片骨架屏
  ListSkeletonFallback,    // 列表骨架屏
  PageSkeletonFallback,    // 页面骨架屏
} from '@qiaopeng/tanstack-query-plus/components'

// 使用示例
<SuspenseWrapper fallback={<DefaultLoadingFallback />}>
  <Content />
</SuspenseWrapper>

<SuspenseWrapper fallback={<ListSkeletonFallback items={5} />}>
  <UserList />
</SuspenseWrapper>

<SuspenseWrapper fallback={<CardSkeletonFallback />}>
  <ProductCard />
</SuspenseWrapper>

// 小型加载指示器（用于按钮等）
<SmallLoadingIndicator size="sm" />  // sm | md | lg

// 全屏加载（用于页面切换）
<FullScreenLoading message="正在加载页面..." />

// 文本骨架屏
<TextSkeletonFallback lines={3} />
```

### 11.6 Suspense 无限查询

```tsx
import { useEnhancedSuspenseInfiniteQuery } from '@qiaopeng/tanstack-query-plus/hooks'

function PostList() {
  const { data, fetchNextPage, hasNextPage } = useEnhancedSuspenseInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  return (
    <div>
      {data.pages.flatMap(page => page.items).map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>加载更多</button>
      )}
    </div>
  )
}

// 使用
<SuspenseWrapper fallback={<PostListSkeleton />}>
  <PostList />
</SuspenseWrapper>
```

### 11.7 创建可复用的 Suspense 查询

使用工厂函数创建可复用的 Suspense 查询：

```tsx
import { createSuspenseQuery } from '@qiaopeng/tanstack-query-plus/hooks'

// 创建一个可复用的用户查询 hook
// 参数1: queryKey 生成函数，接收变量返回 queryKey
// 参数2: queryFn，接收 QueryFunctionContext（包含 queryKey, signal 等）
// 参数3: 可选的默认配置
const useUserSuspense = createSuspenseQuery(
  (userId: string) => ['user', userId],
  async (context) => {
    // context.queryKey 是 ['user', userId]
    // context.signal 可用于取消请求
    const [, userId] = context.queryKey
    return fetchUser(userId as string)
  },
  { staleTime: 30000 }
)

// 使用：传入变量，返回 Suspense 查询结果
function UserProfile({ userId }) {
  const { data } = useUserSuspense(userId)
  return <div>{data.name}</div>
}
```

### 11.8 嵌套 Suspense

对于复杂页面，可以使用嵌套的 Suspense 来实现渐进式加载：

```tsx
function UserDashboard({ userId }) {
  return (
    <div>
      {/* 用户信息先加载 */}
      <SuspenseWrapper fallback={<UserHeaderSkeleton />}>
        <UserHeader userId={userId} />
      </SuspenseWrapper>

      <div className="grid grid-cols-2 gap-4">
        {/* 文章列表独立加载 */}
        <SuspenseWrapper fallback={<PostListSkeleton />}>
          <UserPosts userId={userId} />
        </SuspenseWrapper>

        {/* 统计信息独立加载 */}
        <SuspenseWrapper fallback={<StatsSkeleton />}>
          <UserStats userId={userId} />
        </SuspenseWrapper>
      </div>
    </div>
  )
}
```

这样，各个区块可以独立加载，用户能更快看到部分内容。

### 11.9 Suspense 最佳实践

1. **合理划分 Suspense 边界**：不要把整个页面包在一个 Suspense 里
2. **使用骨架屏**：比简单的 "加载中..." 体验更好
3. **处理错误**：始终配合 ErrorBoundary 使用
4. **设置 resetKeys**：确保参数变化时能正确重置状态
5. **考虑 SSR**：Suspense 在服务端渲染时有特殊行为

现在你已经掌握了 Suspense 模式。接下来，让我们学习如何实现离线支持和数据持久化。

---

## 12. 第十步：离线支持与持久化


现代 Web 应用需要在网络不稳定甚至离线时也能正常工作。本库提供了完整的离线支持和数据持久化功能。

### 12.1 启用持久化

在第 3 章我们已经介绍了如何启用持久化：

```tsx
<PersistQueryClientProvider 
  client={queryClient}
  enablePersistence    // 启用 localStorage 持久化
  enableOfflineSupport // 启用离线状态监听
>
  <App />
</PersistQueryClientProvider>
```

启用后：
- 查询缓存会自动保存到 localStorage
- 页面刷新后自动恢复
- 网络状态变化会自动处理

### 12.2 监听网络状态

使用 `usePersistenceStatus` hook 可以方便地监听网络状态：

```tsx
import { usePersistenceStatus } from '@qiaopeng/tanstack-query-plus'

function NetworkIndicator() {
  const { isOnline, isOffline } = usePersistenceStatus()

  return (
    <div className={`network-status ${isOffline ? 'offline' : 'online'}`}>
      {isOffline ? (
        <span>📴 离线模式 - 数据可能不是最新的</span>
      ) : (
        <span>🌐 在线</span>
      )}
    </div>
  )
}
```

**底层 API**：如果你需要更细粒度的控制，也可以直接使用底层 API：

```tsx
import { useState, useEffect } from 'react'
import { isOnline, subscribeToOnlineStatus } from '@qiaopeng/tanstack-query-plus/features'

function NetworkIndicator() {
  const [online, setOnline] = useState(isOnline())

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setOnline)
    return unsubscribe
  }, [])

  return <div>{online ? '在线' : '离线'}</div>
}
```

### 12.3 手动管理持久化

使用 `usePersistenceManager` hook 可以方便地管理缓存：

```tsx
import { usePersistenceManager } from '@qiaopeng/tanstack-query-plus'

function SettingsPage() {
  const { clearCache, getOnlineStatus } = usePersistenceManager()

  const handleClearCache = () => {
    clearCache()  // 清除默认缓存
    // 或指定 key: clearCache('my-cache-key')
    alert('缓存已清除')
  }

  return (
    <div>
      <p>网络状态: {getOnlineStatus() ? '在线' : '离线'}</p>
      <button onClick={handleClearCache}>清除缓存</button>
    </div>
  )
}
```

**底层 API**：也可以直接使用底层函数：

```tsx
import { clearCache, isOnline } from '@qiaopeng/tanstack-query-plus/features'

function SettingsPage() {
  const handleClearCache = () => {
    clearCache()  // 清除默认缓存
    alert('缓存已清除')
  }

  return (
    <div>
      <p>网络状态: {isOnline() ? '在线' : '离线'}</p>
      <button onClick={handleClearCache}>清除缓存</button>
    </div>
  )
}
```

### 12.4 离线功能 API

本库提供了丰富的离线功能 API：

```tsx
import {
  isOnline,
  subscribeToOnlineStatus,
  clearCache,
  clearExpiredCache,
  checkStorageSize,
  getStorageStats,
} from '@qiaopeng/tanstack-query-plus/features'

// 检查网络状态
const online = isOnline()

// 订阅网络状态变化
const unsubscribe = subscribeToOnlineStatus((online) => {
  console.log('网络状态:', online ? '在线' : '离线')
  if (online) {
    // 网络恢复，可以同步数据
    syncPendingChanges()
  }
})

// 清除缓存
clearCache()  // 清除所有缓存
clearCache('my-cache-key')  // 清除指定缓存

// 清除过期缓存
clearExpiredCache('tanstack-query-cache', 24 * 60 * 60 * 1000)  // 清除超过 24 小时的缓存

// 检查存储大小
const sizeInfo = checkStorageSize()
console.log(`缓存大小: ${sizeInfo.sizeInMB}MB`)
if (sizeInfo.shouldMigrate) {
  console.log('建议迁移到 IndexedDB')
}

// 获取存储统计
const stats = getStorageStats()
console.log({
  exists: stats.exists,
  age: stats.age,  // 缓存年龄（毫秒）
  queriesCount: stats.queriesCount,
  mutationsCount: stats.mutationsCount,
  sizeInfo: stats.sizeInfo,
})
```

### 12.5 离线队列管理器

对于需要在离线时也能操作的应用，可以使用离线队列管理器：

```tsx
import { createOfflineQueueManager, isOnline, mutationRegistry, serializeMutationKey } from '@qiaopeng/tanstack-query-plus/features'
import { MutationOperationType } from '@qiaopeng/tanstack-query-plus/types'

// 创建队列管理器
const queueManager = createOfflineQueueManager({
  maxSize: 100,              // 最大队列大小
  autoExecuteInterval: 5000, // 自动执行间隔（毫秒）
  executeOnReconnect: true,  // 网络恢复时自动执行
  operationTimeout: 30000,   // 操作超时时间
  concurrency: 3,            // 并发执行数
})

// 注册 mutation 函数（用于恢复队列时执行）
// 注册函数签名为 () => Promise<unknown>，如需变量请使用闭包或在入队项的 mutationFn 捕获
mutationRegistry.register(serializeMutationKey(['updateUser']), () => updateUserAPI(savedUserData))
mutationRegistry.register(serializeMutationKey(['createPost']), () => createPostAPI(savedPostData))

// 添加操作到队列
async function handleUpdateUser(userData) {
  if (!isOnline()) {
    // 离线时添加到队列
    await queueManager.add({
      type: MutationOperationType.UPDATE,
      mutationKey: ['updateUser'],
      variables: userData,
      mutationFn: () => updateUserAPI(userData),
      priority: 1,  // 优先级（数字越大越优先）
    })
    toast.info('已保存到离线队列，网络恢复后将自动同步')
  } else {
    // 在线时直接执行
    await updateUserAPI(userData)
 }
}

### 队列管理器操作参考

// 获取队列状态
const state = queueManager.getState()
console.log({
  isOffline: state.isOffline,
  queuedOperations: state.queuedOperations,
  failedQueries: state.failedQueries,
  isRecovering: state.isRecovering,
})

// 手动执行队列
const result = await queueManager.execute()
console.log(`成功: ${result.success}, 失败: ${result.failed}, 跳过: ${result.skipped}`)

// 获取队列中的操作
const operations = queueManager.getOperations()

// 清空队列
await queueManager.clear()

// 销毁管理器（清理定时器和监听器）
queueManager.destroy()
```

### 12.6 完整的离线应用示例

```tsx
import { useState, useEffect } from 'react'
import { createOfflineQueueManager } from '@qiaopeng/tanstack-query-plus/features'
import { MutationOperationType } from '@qiaopeng/tanstack-query-plus/types'
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'
import { useQueryClient, usePersistenceStatus } from '@qiaopeng/tanstack-query-plus'

// 创建全局队列管理器
const offlineQueue = createOfflineQueueManager({
  executeOnReconnect: true,
  autoExecuteInterval: 10000,
})

function TodoApp() {
  const queryClient = useQueryClient()
  const { isOnline: networkStatus } = usePersistenceStatus()  // 使用 hook 监听网络状态
  const [pendingCount, setPendingCount] = useState(0)

  // 网络状态变化时显示提示
  useEffect(() => {
    if (networkStatus) {
      toast.success('网络已恢复，正在同步数据...')
    } else {
      toast.warning('网络已断开，操作将在恢复后同步')
    }
  }, [networkStatus])

  // 更新待处理数量
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(offlineQueue.getState().queuedOperations)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // 查询 todos（离线时使用缓存）
  const { data: todos } = useEnhancedQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    staleTime: 60000,
  })

  // 添加 todo
  const addTodo = async (title) => {
    const todoData = { title, done: false, id: `temp-${Date.now()}` }
    
    if (!networkStatus) {
      // 离线：添加到队列
      await offlineQueue.add({
        type: MutationOperationType.CREATE,
        mutationKey: ['addTodo'],
        variables: todoData,
        mutationFn: () => api.createTodo(todoData),
        priority: 1,
      })
      // 乐观更新本地缓存
      queryClient.setQueryData(['todos'], (old) => [todoData, ...(old || [])])
      toast.info('已添加到离线队列')
    } else {
      // 在线：直接执行
      await api.createTodo(todoData)
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  }

  return (
    <div>
      {/* 网络状态指示器 */}
      <div className={`status-bar ${networkStatus ? 'online' : 'offline'}`}>
        {networkStatus ? '🌐 在线' : '📴 离线'}
        {pendingCount > 0 && (
          <span className="ml-2">
            ({pendingCount} 个操作待同步)
          </span>
        )}
      </div>

      {/* Todo 列表 */}
      <TodoList todos={todos} onAdd={addTodo} />
    </div>
  )
}
```

### 12.7 存储迁移

当缓存数据变大时，可以迁移到 IndexedDB：

```tsx
import { migrateToIndexedDB, checkStorageSize } from '@qiaopeng/tanstack-query-plus/features'

async function checkAndMigrate() {
  const sizeInfo = checkStorageSize()
  
  if (sizeInfo.shouldMigrate) {
    console.log(`缓存大小 ${sizeInfo.sizeInMB}MB，建议迁移到 IndexedDB`)
    
    // 假设你有一个 IndexedDB 存储实现
    const success = await migrateToIndexedDB(
      'tanstack-query-cache',  // localStorage key
      'tanstack-query-cache',  // IndexedDB key
      indexedDBStorage         // IndexedDB 存储实例
    )
    
    if (success) {
      console.log('迁移成功')
    }
  }
}
```

### 12.8 离线最佳实践

1. **合理设置 staleTime**：离线时用户看到的是缓存数据，设置合理的 staleTime 确保数据不会太旧
2. **提供视觉反馈**：让用户知道当前是离线状态
3. **队列优先级**：重要操作设置更高优先级
4. **冲突处理**：考虑离线期间数据可能被其他人修改的情况
5. **定期清理**：清除过期的缓存数据

现在你已经掌握了离线支持。接下来，让我们学习焦点管理，它可以优化用户切换标签页时的体验。

### 12.9 安全提示与 SSR 注意

- 持久化范围：仅持久化成功且可序列化的查询数据（默认行为），避免异常对象恢复失败
- 敏感信息：严禁将敏感凭据放入缓存数据或 `queryKey`
- 离线队列：仅持久化操作元信息，不持久化函数体；真实执行需通过 `mutationRegistry` 注册，避免函数闭包泄露
- 存储容量：`checkStorageSize` 超过 5MB 建议迁移到 IndexedDB；定期 `clearExpiredCache`
- SSR 注意：服务端渲染环境下 `PersistQueryClientProvider` 会自动降级为普通 Provider，浏览器 API 均有守卫，不会在 Node 环境访问 `window`

---

## 13. 第十一步：数据防护与安全

在多人协作或高并发的应用中，数据一致性是一个常见挑战。例如：
- **旧数据覆盖新数据**：用户 A 打开页面，用户 B 更新了数据，用户 A 保存时可能会覆盖 B 的更改。
- **乐观更新冲突**：前端乐观更新了数据，但后端因为版本冲突拒绝了请求。
- **竞态条件**：网络请求乱序返回，导致旧数据覆盖了新数据。

本库提供了 **Data Guard** 机制来解决这些问题。

### 13.1 查询数据防护

使用 `useDataGuardQueryConfig` 可以自动检测并拒绝过期的服务端数据：

```tsx
import { useEnhancedQuery, useDataGuardQueryConfig } from '@qiaopeng/tanstack-query-plus/hooks'

function ProductList() {
  // 自动包装查询配置
  const config = useDataGuardQueryConfig(
    ['products'],
    fetchProducts,
    {
      // 策略配置
      maxDataAge: 5000, // 允许的最大数据时差
      onStaleDataDetected: ({ reason, cached, rejected }) => {
        console.warn(`拒绝了旧数据: ${reason}`)
        // cached: 当前缓存的较新数据
        // rejected: 被拒绝的服务端旧数据
      }
    }
  )

  const { data } = useEnhancedQuery(config)
  
  return <div>...</div>
}
```

**防护策略优先级**：
1. **版本号 (Version)**: 如果数据包含 `version` 字段，严格比较版本号。
2. **时间戳 (Timestamp)**: 如果数据包含 `updatedAt` 字段，比较更新时间。
3. **哈希 (Hash)**: 如果都没有，计算内容哈希，拒绝相同内容的重复更新。

### 13.2 变更数据防护

使用 `useDataGuardMutation` 处理并发更新冲突：

```tsx
import { useDataGuardMutation } from '@qiaopeng/tanstack-query-plus/hooks'

function EditProduct({ product }) {
  const mutation = useDataGuardMutation(
    (updates) => api.updateProduct(updates),
    ['products'], // 相关的查询 key
    {
      // 发生冲突时的回调 (HTTP 409)
      onConflict: (error) => {
        toast.error('检测到数据冲突，页面将自动刷新')
      },
      // 内置乐观更新支持
      optimistic: {
        queryKey: ['products'],
        updater: (old, newProduct) => {
           // Data Guard 会自动处理版本号递增和时间戳更新
           return { ...old, ...newProduct }
        }
      }
    }
  )

  const handleSave = (updates) => {
    // 提交时带上当前版本号
    mutation.mutate({ 
      ...updates, 
      version: product.version 
    })
  }
}
```

 **`useDataGuardMutation` 的特性**：
- **自动冲突检测**：捕获 409 Conflict 错误并触发回调。
- **智能乐观更新**：自动递增本地数据的版本号，防止 UI 闪烁。
- **家族元数据同步**：更新成功后，自动同步相关查询元数据。
 - **自动失效**：发生冲突时，自动失效相关缓存以获取最新数据。

### 13.3 安全提示

- 统一数据版本：后端需提供 `version` 或 `updatedAt` 字段，前端 Data Guard 才能更有效地比对
- 明确冲突策略：将 409 视为冲突并提示用户刷新，避免静默覆盖
- 审计与日志：为冲突与拒绝旧数据的情况打点，便于后续排查
- 仅在必要处开启 Data Guard：对只读数据可关闭防护以减少开销
- 家族同步慎用：确保变体的 `queryKey` 有共同前缀，避免误伤无关查询

---

## 14. 第十二步：焦点管理


当用户切换浏览器标签页或窗口时，TanStack Query 默认会在窗口重新获得焦点时刷新数据。本库提供了更精细的焦点管理功能。

### 14.1 获取焦点状态

```tsx
import { useFocusState, usePageVisibility } from '@qiaopeng/tanstack-query-plus/hooks'

function FocusIndicator() {
  const isFocused = useFocusState()      // 窗口是否获得焦点
  const isVisible = usePageVisibility()  // 页面是否可见

  return (
    <div>
      <p>窗口焦点: {isFocused ? '是' : '否'}</p>
      <p>页面可见: {isVisible ? '是' : '否'}</p>
    </div>
  )
}
```

### 14.2 焦点恢复时刷新指定查询

默认情况下，所有查询都会在窗口聚焦时刷新。但有时你只想刷新特定的查询：

```tsx
import { useFocusRefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function Dashboard() {
  // 只在焦点恢复时刷新这些查询
  useFocusRefetch({
    queryKeys: [
      ['dashboard', 'stats'],
      ['notifications', 'unread'],
    ],
    minInterval: 5000,  // 最小刷新间隔（避免频繁切换时过度刷新）
    enabled: true,
  })

  // ...
}
```

### 14.3 焦点恢复时执行回调

```tsx
import { useFocusCallback } from '@qiaopeng/tanstack-query-plus/hooks'

function AnalyticsTracker() {
  // 焦点恢复时记录分析事件
  useFocusCallback(() => {
    analytics.track('page_focus', {
      page: window.location.pathname,
      timestamp: Date.now(),
    })
  }, {
    minInterval: 10000,  // 最小间隔 10 秒
    enabled: true,
  })

  return null
}
```

### 14.4 条件性焦点刷新

只在满足条件时刷新：

```tsx
import { useConditionalFocusRefetch } from '@qiaopeng/tanstack-query-plus/hooks'

function ChatRoom({ roomId, isActive }) {
  // 只有当聊天室处于活动状态时，焦点恢复才刷新消息
  useConditionalFocusRefetch(
    ['messages', roomId],
    () => isActive,  // 条件函数
    { minInterval: 3000 }
  )

  // ...
}
```

### 14.5 暂停焦点管理

在某些场景下（如模态框打开时），你可能想暂停焦点刷新：

```tsx
import { usePauseFocus } from '@qiaopeng/tanstack-query-plus/hooks'

function Modal({ isOpen, children }) {
  // 模态框打开时暂停焦点管理
  usePauseFocus({ pauseWhen: isOpen })

  return isOpen ? (
    <div className="modal">
      {children}
    </div>
  ) : null
}

// 或者手动控制
function VideoPlayer() {
  const { pause, resume } = usePauseFocus()

  const handlePlay = () => {
    pause()  // 播放时暂停焦点刷新
  }

  const handlePause = () => {
    resume()  // 暂停时恢复焦点刷新
  }

  return (
    <video onPlay={handlePlay} onPause={handlePause}>
      {/* ... */}
    </video>
  )
}
```

### 14.6 智能焦点管理器

获取焦点管理的统计信息：

```tsx
import { useSmartFocusManager } from '@qiaopeng/tanstack-query-plus/hooks'

function FocusDebugPanel() {
  const { pause, resume, getStats, stats } = useSmartFocusManager()

  return (
    <div className="debug-panel">
      <h3>焦点管理统计</h3>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
      
      <div className="space-x-2">
        <button onClick={pause}>暂停</button>
        <button onClick={resume}>恢复</button>
        <button onClick={() => console.log(getStats())}>
          打印统计
        </button>
      </div>
    </div>
  )
}
```

### 14.7 焦点管理最佳实践

1. **设置 minInterval**：避免用户频繁切换标签页时过度刷新
2. **选择性刷新**：不是所有数据都需要在焦点恢复时刷新
3. **考虑用户体验**：某些场景（如视频播放、表单填写）应该暂停焦点刷新
4. **结合 staleTime**：如果数据还新鲜，焦点刷新也不会发起请求

现在你已经掌握了焦点管理。最后，让我们学习一些实用的工具函数和选择器。

---

## 15. 第十三步：工具函数与选择器


本库提供了丰富的工具函数，帮助你更高效地处理数据。

### 15.1 选择器（Selectors）

选择器用于 `select` 选项，可以在数据返回后进行转换。注意：大部分选择器是高阶函数，需要先调用生成实际的选择器函数。

```tsx
import { selectors } from '@qiaopeng/tanstack-query-plus/utils'

// 按 ID 选择单个项（高阶函数，先传 ID 生成选择器）
const { data: user } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: selectors.byId('user-123'),  // 返回 (data) => data.find(...)
})

// 按条件筛选（高阶函数）
const { data: activeUsers } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: selectors.where(user => user.isActive),  // 返回 (data) => data.filter(...)
})

// 映射转换（高阶函数）
const { data: userNames } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: selectors.map(user => user.name),  // 返回 (data) => data.map(...)
})

// 获取第一个/最后一个（直接是选择器函数，不是高阶函数）
const { data: firstUser } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: selectors.first,  // 直接传入，不需要调用
})

const { data: lastUser } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: selectors.last,  // 直接传入
})

// 计数（直接是选择器函数）
const { data: userCount } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: selectors.count,  // 直接传入
})

// 选择单个对象的特定字段（高阶函数，用于单个对象而非数组）
const { data: userName } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  select: selectors.field('name'),  // 返回 (data) => data?.name
})

// 选择单个对象的多个字段（高阶函数，用于单个对象）
const { data: userBasicInfo } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  select: selectors.fields(['id', 'name', 'email']),  // 返回 Pick<User, 'id'|'name'|'email'>
})
```

### 15.2 组合选择器

选择器可以组合使用：

```tsx
import { selectors } from '@qiaopeng/tanstack-query-plus/utils'

// 先筛选活跃用户，再获取他们的名字
const { data: activeUserNames } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: selectors.compose(
    selectors.where(u => u.isActive),
    selectors.map(u => u.name)
  ),
})

// 获取管理员的邮箱
const { data: adminEmails } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: selectors.compose(
    selectors.where(u => u.role === 'admin'),
    selectors.map(u => u.email)
  ),
})
```

### 15.3 独立使用选择器函数

选择器也可以独立使用。注意：这些函数大多是高阶函数，需要先传入参数生成选择器，再传入数据：

```tsx
import { 
  selectById, 
  selectWhere, 
  selectMap, 
  selectFirst,
  selectCount,
  compose 
} from '@qiaopeng/tanstack-query-plus/utils'

const users = [
  { id: '1', name: 'Alice', isActive: true },
  { id: '2', name: 'Bob', isActive: false },
  { id: '3', name: 'Charlie', isActive: true },
]

// 按 ID 查找（高阶函数：先传 ID，返回选择器函数，再传数据）
const userSelector = selectById('2')  // 返回 (data) => data.find(...)
const user = userSelector(users)      // { id: '2', name: 'Bob', ... }
// 或者链式调用
const user2 = selectById('2')(users)

// 筛选（高阶函数）
const activeUsers = selectWhere(u => u.isActive)(users)  // [Alice, Charlie]

// 映射（高阶函数）
const names = selectMap(u => u.name)(users)  // ['Alice', 'Bob', 'Charlie']

// 第一个（直接是选择器函数，不是高阶函数）
const first = selectFirst(users)  // Alice

// 计数（直接是选择器函数）
const count = selectCount(users)  // 3

// 组合（compose 接收两个选择器函数，返回组合后的选择器）
const activeNamesSelector = compose(
  selectWhere(u => u.isActive),  // 第一步：筛选活跃用户
  selectMap(u => u.name)         // 第二步：提取名字
)
const activeNames = activeNamesSelector(users)  // ['Alice', 'Charlie']
```

### 15.4 列表更新工具

用于乐观更新的列表操作：

```tsx
import { 
  listUpdater,
  batchUpdateItems,
  batchRemoveItems,
  reorderItems 
} from '@qiaopeng/tanstack-query-plus/utils'

const todos = [
  { id: '1', title: 'Task 1', done: false },
  { id: '2', title: 'Task 2', done: false },
  { id: '3', title: 'Task 3', done: true },
]

// 添加项（到头部）
const withNew = listUpdater.add(todos, { id: '4', title: 'Task 4', done: false })

// 更新项
const updated = listUpdater.update(todos, { id: '2', title: 'Updated Task 2', done: true })

// 移除项
const removed = listUpdater.remove(todos, '2')

// 批量更新
const batchUpdated = batchUpdateItems(todos, [
  { id: '1', done: true },
  { id: '2', done: true },
])

// 批量移除
const batchRemoved = batchRemoveItems(todos, ['1', '3'])

// 重新排序（将索引 0 的项移到索引 2）
const reordered = reorderItems(todos, 0, 2)
```

### 15.5 创建乐观更新配置

快速创建常用的乐观更新配置：

```tsx
import { 
  createAddItemConfig,
  createUpdateItemConfig,
  createRemoveItemConfig 
} from '@qiaopeng/tanstack-query-plus/utils'

// 添加配置
const addConfig = createAddItemConfig(['todos'], { addToTop: true })
// 返回: { queryKey: ['todos'], updater: (old, newItem) => [newItem, ...old] }

// 更新配置
const updateConfig = createUpdateItemConfig(['todos'])
// 返回: { queryKey: ['todos'], updater: (old, updated) => old.map(...) }

// 删除配置
const removeConfig = createRemoveItemConfig(['todos'])
// 返回: { queryKey: ['todos'], updater: (old, id) => old.filter(...) }

// 在 mutation 中使用
const addMutation = useMutation({
  mutationFn: createTodo,
  optimistic: addConfig,
})
```

### 15.6 Query Key 工具

```tsx
import { 
  createQueryKeyFactory,
  createSimpleQueryKeyFactory,
  isQueryKeyEqual,
  extractParamsFromKey,
  normalizeQueryParams 
} from '@qiaopeng/tanstack-query-plus/utils'

// 创建 key 工厂（使用 namespace 配置）
const todoKeys = createQueryKeyFactory({
  namespace: 'todos',
  normalizeConfig: {
    required: ['page'],
    defaults: { page: 1 },
    sortKeys: true,
    removeEmpty: true,
  }
})

todoKeys.all()                    // ['todos']
todoKeys.lists()                  // ['todos', 'list']
todoKeys.list({ page: 1 })        // ['todos', 'list', { page: 1 }]
todoKeys.details()                // ['todos', 'detail']
todoKeys.detail('123')            // ['todos', 'detail', '123']
todoKeys.custom('search', 'abc')  // ['todos', 'custom', 'search', 'abc']

// 简单 key 工厂
const simpleKeys = createSimpleQueryKeyFactory('products')
simpleKeys.all()              // ['products']
simpleKeys.lists()            // ['products', 'list']
simpleKeys.detail('abc')      // ['products', 'detail', 'abc']

// 比较 key
const equal = isQueryKeyEqual(
  ['todos', 'list', { page: 1 }],
  ['todos', 'list', { page: 1 }]
)  // true

// 从 key 中提取参数（获取最后一个对象元素）
const params = extractParamsFromKey(['todos', 'list', { page: 1, filter: 'active' }])
// { page: 1, filter: 'active' }

// 规范化查询参数（排序、移除空值）
const normalized = normalizeQueryParams(
  { page: 1, search: '', filter: null, sort: 'name' },
  { removeEmpty: true, sortKeys: true }
)  // { page: 1, sort: 'name' }
```

### 15.7 网络工具

```tsx
import { 
  isSlowNetwork, 
  isFastNetwork,
  getNetworkSpeed,
  getNetworkInfo 
} from '@qiaopeng/tanstack-query-plus/utils'

// 检查网络速度
if (isSlowNetwork()) {
  // 慢网络，减少预取
  console.log('慢网络，禁用预取')
}

if (isFastNetwork()) {
  // 快网络，可以预取更多
  console.log('快网络，启用激进预取')
}

// 获取网络速度（更细粒度）
const speed = getNetworkSpeed()  // 'fast' | 'medium' | 'slow' | 'unknown'

// 获取详细网络信息
const info = getNetworkInfo()
// {
//   effectiveType: '4g',
//   saveData: false,
//   downlink: 10,
//   rtt: 50
// }
```

### 15.8 存储工具

```tsx
import { 
  isStorageAvailable, 
  getStorageUsage,
  deepClone,
  formatBytes 
} from '@qiaopeng/tanstack-query-plus/utils'
import { StorageType } from '@qiaopeng/tanstack-query-plus/types'

// 检查存储是否可用（需要传入 StorageType）
if (isStorageAvailable(StorageType.LOCAL)) {
  console.log('localStorage 可用')
}

if (isStorageAvailable(StorageType.SESSION)) {
  console.log('sessionStorage 可用')
}

// 获取存储使用情况（需要传入 StorageType）
const usage = getStorageUsage(StorageType.LOCAL)
console.log(`已使用: ${formatBytes(usage.used)}`)
console.log(`总容量: ${formatBytes(usage.total)}`)
console.log(`使用率: ${(usage.usage * 100).toFixed(2)}%`)
console.log(`是否可用: ${usage.available}`)

// 深拷贝（用于乐观更新时保存原始数据）
const original = { nested: { value: 1 } }
const cloned = deepClone(original)
cloned.nested.value = 2
console.log(original.nested.value)  // 1（原始数据不变）
```

### 15.9 字段映射工具

```tsx
import { 
  createOptimisticBase,
  createTempId 
} from '@qiaopeng/tanstack-query-plus/utils'

// 创建临时 ID（用于乐观更新时生成临时标识）
const tempId = createTempId()        // 'temp-1234567890-abc123'
const tempId2 = createTempId('item') // 'item-1234567890-xyz789'

// 创建乐观更新的基础数据（包含常用的时间戳字段）
const optimisticBase = createOptimisticBase({
  title: '新任务',
  done: false,
})
// 返回:
// {
//   createTime: '2024-01-01T00:00:00.000Z',
//   updateTime: '2024-01-01T00:00:00.000Z',
//   createUser: '',
//   updateUser: '',
//   deleteStatus: 0,
//   title: '新任务',
//   done: false
// }

// 结合 createTempId 使用
const newTodo = {
  id: createTempId(),
  ...createOptimisticBase({ title: '新任务', done: false })
}
```

**注意**：`createFieldEnricher` 是一个高级函数，用于根据配置数据丰富查询结果中的字段（如将 ID 映射为名称），需要配合 QueryClient 使用，适用于特定的业务场景。

### 15.10 保持上一次数据

在数据刷新时保持显示上一次的数据：

```tsx
import { keepPreviousData } from '@qiaopeng/tanstack-query-plus/utils'

function SearchResults({ query }) {
  const { data, isPlaceholderData } = useQuery({
    queryKey: ['search', query],
    queryFn: () => search(query),
    placeholderData: keepPreviousData,  // 保持上一次的搜索结果
  })

  return (
    <div className={isPlaceholderData ? 'opacity-50' : ''}>
      {data?.map(result => (
        <SearchResult key={result.id} result={result} />
      ))}
    </div>
  )
}
```

### 15.11 家族一致性工具

在某些高级场景下，你可能需要自行枚举并同步同一资源的家族查询变体（分页/筛选/排序等）。本库提供了工具函数用于匹配与安全同步：

```tsx
import { useQueryClient } from '@qiaopeng/tanstack-query-plus'
import { findFamilyQueries, syncEntityAcrossFamily } from '@qiaopeng/tanstack-query-plus/utils'

function useManualFamilySync() {
  const queryClient = useQueryClient()
  const sync = (updated) => {
    const keys = findFamilyQueries(queryClient, { baseKey: ['products', 'list'], maxKeys: 50 })
    syncEntityAcrossFamily(queryClient, keys, updated, {
      idField: 'id',
      listSelector: (data) => {
        if (data && typeof data === 'object' && 'items' in (data as any)) {
          return { items: (data as any).items, total: (data as any).total }
        }
        if (Array.isArray(data)) return { items: data }
        return null
      },
    })
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
  }
  return { sync }
}
```

提示：上述工具已在 `useMutation` 的一致性配置中自动使用；仅在需要手动控制时使用它们。

现在你已经掌握了所有核心功能！最后，让我们看看一些最佳实践和常见问题。

---

## 16. 最佳实践与常见问题

### 导入路径速查表

| 路径 | 内容 | 说明 |
|------|------|------|
| `@qiaopeng/tanstack-query-plus` | 主入口：组件、核心配置、hooks、类型、工具函数、持久化 hooks | 推荐使用 |
| `@qiaopeng/tanstack-query-plus/core` | 配置、Key 工厂、环境变量、焦点管理 | 按需导入 |
| `@qiaopeng/tanstack-query-plus/core/devtools` | DevTools 配置和组件 | 需安装 @tanstack/react-query-devtools |
| `@qiaopeng/tanstack-query-plus/hooks` | 所有增强 Hooks（查询、mutation、预取、批量等） | 按需导入 |
| `@qiaopeng/tanstack-query-plus/hooks/inview` | useInViewPrefetch | 需安装 react-intersection-observer |
| `@qiaopeng/tanstack-query-plus/components` | React 组件（SuspenseWrapper、QuerySuspenseWrapper、Loading 等） | 按需导入 |
| `@qiaopeng/tanstack-query-plus/features` | 离线队列、持久化底层 API | 高级用法 |
| `@qiaopeng/tanstack-query-plus/utils` | 工具函数（选择器、列表更新器、网络检测等） | 按需导入 |
| `@qiaopeng/tanstack-query-plus/types` | TypeScript 类型定义 | 类型导入 |
| `@qiaopeng/tanstack-query-plus/react-query` | TanStack Query 原生 API 再导出 | 需要原生 API 时使用 |

**主入口导出的内容**：
- ✅ `QueryClient`, `QueryClientProvider`, `useQueryClient`, `skipToken`, `useIsMutating`
- ✅ `PersistQueryClientProvider`, `usePersistenceStatus`, `usePersistenceManager`
- ✅ 所有增强 hooks（`useEnhancedQuery`, `useMutation`, `useEnhancedInfiniteQuery` 等）
- ✅ 所有组件（`SuspenseWrapper`, `QuerySuspenseWrapper`, Loading 组件等）
- ✅ 所有工具函数和选择器
- ✅ 所有类型定义

**提示**：
- 大部分情况下，从主入口 `@qiaopeng/tanstack-query-plus` 导入即可
- 如果需要 TanStack Query 的原生 `useQuery`（而非增强版），从 `@tanstack/react-query` 导入
- 子路径导入可以实现更好的 tree-shaking

### 16.1 项目结构建议

```
src/
├── api/                    # API 请求函数
│   ├── users.ts
│   ├── posts.ts
│   └── index.ts
├── queries/                # 查询相关
│   ├── keys.ts            # Query Key 工厂
│   ├── users.ts           # 用户相关查询 hooks
│   ├── posts.ts           # 文章相关查询 hooks
│   └── index.ts
├── mutations/              # Mutation 相关
│   ├── users.ts
│   ├── posts.ts
│   └── index.ts
├── components/
├── pages/
└── App.tsx
```

### 16.2 封装自定义 Hooks

将查询逻辑封装成自定义 hooks：

```tsx
// queries/users.ts
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'
import { createDomainKeyFactory } from '@qiaopeng/tanstack-query-plus/core'
import { fetchUser, fetchUsers } from '@/api/users'

const userKeys = createDomainKeyFactory('users')

export function useUser(userId: string) {
  return useEnhancedQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
    trackPerformance: true,
  })
}

export function useUsers(filters?: UserFilters) {
  return useEnhancedQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
  })
}

// 使用
function UserProfile({ userId }) {
  const { data: user, isLoading } = useUser(userId)
  // ...
}
```

### 16.3 配置最佳实践

```tsx
// config/queryClient.ts
import { QueryClient } from '@qiaopeng/tanstack-query-plus'
import { getConfigByEnvironment, ensureBestPractices } from '@qiaopeng/tanstack-query-plus/core'

const env =
  process.env.NODE_ENV === 'production'
    ? 'production'
    : process.env.NODE_ENV === 'test'
      ? 'test'
      : 'development'
const baseConfig = getConfigByEnvironment(env)

// 确保配置符合最佳实践
const config = ensureBestPractices({
  ...baseConfig,
  queries: {
    ...baseConfig.queries,
    // 自定义覆盖
    staleTime: 60000,  // 1 分钟
  },
})

export const queryClient = new QueryClient({
  defaultOptions: config,
})
```

### 16.4 错误处理最佳实践

```tsx
// 全局错误处理
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...GLOBAL_QUERY_CONFIG.queries,
      // 全局错误处理
      onError: (error) => {
        if (error.status === 401) {
          // 未授权，跳转登录
          window.location.href = '/login'
        } else if (error.status >= 500) {
          // 服务器错误，显示通知
          toast.error('服务器错误，请稍后重试')
        }
      },
    },
    mutations: {
      ...GLOBAL_QUERY_CONFIG.mutations,
      onError: (error) => {
        toast.error(error.message || '操作失败')
      },
    },
  },
})
```

### 16.5 TypeScript 类型最佳实践

```tsx
import type { 
  EnhancedQueryOptions, 
  EnhancedQueryResult,
  MutationOptions 
} from '@qiaopeng/tanstack-query-plus/types'

// 定义 API 响应类型
interface User {
  id: string
  name: string
  email: string
}

interface ApiError {
  message: string
  code: string
}

// 类型安全的查询
function useUser(userId: string): EnhancedQueryResult<User, ApiError> {
  return useEnhancedQuery<User, ApiError>({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })
}

// 类型安全的 mutation
function useUpdateUser(userId: string) {
  return useMutation<User, ApiError, Partial<User>>({
    mutationFn: (patch) => updateUser(userId, patch),
    optimistic: {
      queryKey: ['user', userId],
      updater: (old, patch) => (old ? ({ ...old, ...patch }) : old),
    },
  })
}
```

### 16.6 常见问题解答

#### Q: DevTools 报错 "Module not found"

DevTools 是可选依赖，需要单独安装：

```bash
npm install @tanstack/react-query-devtools
```

然后从子路径导入：

```tsx
import { ReactQueryDevtools } from '@qiaopeng/tanstack-query-plus/core/devtools'
```

#### Q: useInViewPrefetch 报错

需要安装 `react-intersection-observer`：

```bash
npm install react-intersection-observer
```

然后从子路径导入：

```tsx
import { useInViewPrefetch } from '@qiaopeng/tanstack-query-plus/hooks/inview'
```

#### Q: SSR 环境下持久化不工作

`PersistQueryClientProvider` 在服务端会自动降级为普通 Provider，这是预期行为。所有浏览器 API 调用都有环境检测守卫。

#### Q: 如何禁用开发环境的错误日志

```tsx
useEnhancedQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  logErrors: false,
})
```

#### Q: 乐观更新失败后数据不一致

确保你的 `updater` 函数是纯函数，不要直接修改 `oldData`：

```tsx
// ❌ 错误
updater: (oldData, newItem) => {
  oldData.push(newItem)  // 直接修改
  return oldData
}

// ✅ 正确
updater: (oldData, newItem) => {
  return [...oldData, newItem]  // 返回新数组
}
```

#### Q: 如何在测试中使用

```tsx
import { getConfigByEnvironment } from '@qiaopeng/tanstack-query-plus/core'

const testConfig = getConfigByEnvironment('test')
// 测试配置：retry: 0, staleTime: 0, refetchOnWindowFocus: false

const queryClient = new QueryClient({ defaultOptions: testConfig })

// 在测试中
render(
  <QueryClientProvider client={queryClient}>
    <ComponentToTest />
  </QueryClientProvider>
)
```

#### Q: 缓存数据太大怎么办

1. 检查缓存大小：
```tsx
const stats = getStorageStats()
console.log(`缓存大小: ${stats.sizeInfo.sizeInMB}MB`)
```

2. 定期清理过期缓存：
```tsx
clearExpiredCache('tanstack-query-cache', 24 * 60 * 60 * 1000)
```

3. 考虑迁移到 IndexedDB

#### Q: 如何调试查询问题

1. 使用 DevTools 查看查询状态
2. 启用性能追踪：
```tsx
useEnhancedQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  trackPerformance: true,
  logErrors: true,
})
```
3. 检查 queryKey 是否正确（使用 key 工厂避免拼写错误）

### 16.7 性能优化建议

1. **合理设置 staleTime**：避免不必要的重复请求
2. **使用 select**：只选择需要的数据，减少重渲染
3. **使用预取**：提前获取用户可能需要的数据
4. **批量查询**：使用 `useEnhancedQueries` 而不是多个独立查询
5. **懒加载**：结合 Suspense 和代码分割
6. **避免过度乐观更新**：只在必要时使用

### 16.8 安全建议

 1. **不要在 queryKey 中包含敏感信息**：queryKey 可能被记录或暴露
2. **验证服务端响应**：不要盲目信任 API 返回的数据
3. **处理认证过期**：在全局错误处理中处理 401 错误
4. **清理敏感缓存**：用户登出时清除缓存

### 16.9 类型与错误处理规范

- 明确类型参数：在增强 hooks 中显式标注 `TData` 与 `TError`，避免 `any` 漏出
- 统一错误模型：为后端错误定义统一类型（如 `ApiError`），在 UI 层集中处理
- 不吞错误：日志与监控采集应在开发开启，生产使用采样与脱敏
- 优先 `isError` 分支渲染兜底组件，避免在 `data` 为 `undefined` 时解构引发异常
- 乐观更新的回滚必须可重入：错误重试不应导致状态错乱

### 16.10 SSR 注意事项

- Provider 降级：SSR 环境自动使用普通 `QueryClientProvider`，浏览器 API 有环境守卫
- 数据注入：如需 SSR 注水，建议结合 TanStack 原生脱水/注水（本库不强绑）
- 路由预取：服务端不执行预取相关浏览器 API，需在客户端挂载后进行

### 16.11 Tree-shaking 与导入路径

- 使用子路径导入（如 `@qiaopeng/tanstack-query-plus/hooks`、`/core`、`/utils`），提升摇树效果
- 保持副作用为零：本包 `sideEffects: false`，按需导入可以减少体积
- 避免从根入口导入全部模块：仅在需要时按子路径引入具体能力

### 16.12 起步排障清单

- DevTools 未显示：安装并从 `@qiaopeng/tanstack-query-plus/core/devtools` 导入，仅在开发环境显示（`core/devtools.ts:28`）
- 视口预取报错：安装 `react-intersection-observer` 并从 `hooks/inview` 子路径导入（`src/hooks/useInViewPrefetch.ts`）
- 路由预取报错：安装 `react-router-dom`，示例仅依赖其 Link/useNavigate
- 缓存未恢复：检查 `enablePersistence` 与 `cacheKey`；确认浏览器支持 localStorage（`features/persistence.ts:43`）
- 离线队列不执行：确保在恢复网络后调用 `createOfflineQueueManager`，并通过 `mutationRegistry` 注册函数（`features/offline.ts:30`）
- 乐观更新错乱：确保 `queryKey` 稳定、列表更新器使用 `id` 对齐（`utils/optimisticUtils.ts:14`）
- 冲突未处理：确认后端返回 409 或约定错误码，前端使用 `useDataGuardMutation` 捕获（`hooks/useDataGuardMutation.ts:80`）
- SSR 环境错误：确保 Provider 自动降级，不在服务端访问 `window`（`PersistQueryClientProvider.tsx:34`）

### 16.13 生产前检查清单

- DevTools：生产环境关闭（`isDevToolsEnabled()` 为 false）
- 错误处理：所有查询与变更都有兜底 UI 与日志记录
- 缓存策略：为高频接口设置合理 `staleTime`，避免重复请求
- 乐观更新：具备回滚与重试策略；冲突触发家族失效
- 持久化：确认缓存大小与迁移策略（localStorage → IndexedDB）
- 安全审查：queryKey 与缓存不包含敏感信息；队列不持久化函数体
- 监控：慢查询上报、错误采样与脱敏处理

## 17. API 索引

为方便查找，这里列出各子路径的主要导出与用途：

- `@qiaopeng/tanstack-query-plus`（顶层）
  - `PersistQueryClientProvider`、`usePersistenceStatus`、`usePersistenceManager`
  - `QueryClient`、`QueryClientProvider`、`useQueryClient`、`skipToken`、`useIsMutating`（直接再导出原生 API）

- `@qiaopeng/tanstack-query-plus/core`
  - 配置：`GLOBAL_QUERY_CONFIG`、`createCustomConfig`、`createErrorSafeConfig`、`DEFAULT_STALE_TIME`、`DEFAULT_GC_TIME`
  - 重试：`defaultQueryRetryStrategy`、`defaultMutationRetryStrategy`、`createSafeRetryStrategy`、`exponentialBackoff`
  - 环境：`isDev`、`isProd`、`isTest`
  - DevTools：`ReactQueryDevtools`、`isDevToolsEnabled`、`createDevToolsConfig`（src/core/devtools.ts:28）
  - 焦点管理：`focusManager`、`getSmartFocusManager`、`pauseFocusManager`、`resumeFocusManager`
  - Key 工具：`queryKeys`、`normalizeQueryKey`、`createDomainKeyFactory`、`createMutationKeyFactory`
  - Query 配置：`createAppQueryOptions`、`createListQueryOptions`

- `@qiaopeng/tanstack-query-plus/hooks`
  - 查询：`useEnhancedQuery`、`useEnhancedSuspenseQuery`、`useEnhancedInfiniteQuery`
  - 批量查询：`useEnhancedQueries`、`useAutoRefreshBatchQueries`、`useDashboardQueries`
  - Mutation：`useMutation`、`useListMutation`、`setupMutationDefaults`
  - 预取：`useHoverPrefetch`、`useInViewPrefetch`（子路径 `hooks/inview`）、`useRoutePrefetch`、`useSmartPrefetch`、`useConditionalPrefetch`、`useIdlePrefetch`、`usePeriodicPrefetch`、`usePredictivePrefetch`、`usePriorityPrefetch`
  - 焦点：`useFocusState`、`useFocusRefetch`、`useConditionalFocusRefetch`、`usePauseFocus`、`useSmartFocusManager`
  - 数据防护：`useDataGuardQueryConfig`、`useDataGuardMutation`

- `@qiaopeng/tanstack-query-plus/features`
  - 离线：`setupOnlineManager`、`isOnline`、`createOfflineQueueManager`、`OfflineQueueManager`、`mutationRegistry`、`serializeMutationKey`、`subscribeToOnlineStatus`
  - 持久化：`createPersistOptions`、`createPersister`、`clearCache`、`clearExpiredCache`、`checkStorageSize`、`getStorageStats`、`migrateToIndexedDB`

- `@qiaopeng/tanstack-query-plus/components`
  - Loading：`DefaultLoadingFallback`、`FullScreenLoading`、`ListSkeletonFallback`、`PageSkeletonFallback`、`SmallLoadingIndicator`、`TextSkeletonFallback`
  - 错误边界：`QueryErrorBoundary`
  - Suspense & SSR：`SuspenseWrapper`、`QuerySuspenseWrapper`、`HydrationBoundary`

- `@qiaopeng/tanstack-query-plus/utils`
  - 选择器：`selectById`、`selectFields`、`compose` 等
  - 列表/乐观工具：`listUpdater`、`createAddItemConfig`、`createUpdateItemConfig`、`reorderItems`
  - 预取管理器：`getPrefetchManager`、`SmartPrefetchManager`、`resetPrefetchManager`
  - Query Key 工厂：`createQueryKeyFactory`、`normalizeQueryParams`
  - 存储与网络：`isStorageAvailable`、`getNetworkSpeed`、`isSlowNetwork`
  - 数据防护：`applyDataGuard`、`updateFamilyMetadata`

- `@qiaopeng/tanstack-query-plus/react-query`
  - 原生 API 再导出：`useQuery`、`useMutation`、`useInfiniteQuery`、`useSuspenseQuery` 等（src/react-query/index.ts:1）

提示：完整导出列表可在 `package.json:33` 的 `exports` 字段中查看；顶层入口再导出常用原生 API，子路径按模块分层导出，便于 tree-shaking。

---

## 总结

你已经覆盖了 `@qiaopeng/tanstack-query-plus` 的核心能力：

1. ✅ 配置 Provider 和最佳实践
2. ✅ 基础查询和增强查询
3. ✅ Query Key 管理
4. ✅ 数据变更和乐观更新
5. ✅ 无限滚动和分页
6. ✅ 批量查询和仪表盘
7. ✅ 智能预取策略
8. ✅ Suspense 模式
9. ✅ 离线支持和持久化
10. ✅ 数据防护与安全
11. ✅ 焦点管理
12. ✅ 工具函数和选择器

### 下一步

- 查看 [GitHub 仓库](https://github.com/qiaopengg/qiaopeng-tanstack-query-plus) 获取最新更新
- 阅读 [TanStack Query 官方文档](https://tanstack.com/query/latest) 了解更多底层概念
- 在 [Issues](https://github.com/qiaopengg/qiaopeng-tanstack-query-plus/issues) 中提问或反馈
