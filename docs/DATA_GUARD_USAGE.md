# 数据防护功能使用指南

## 概述

数据防护功能可以自动防止数据回退和闪动问题，根据后端返回的数据自动选择最佳防护策略：

1. **版本号策略**（最可靠）：如果后端返回 `version` 字段
2. **时间戳策略**（次优）：如果后端返回 `updatedAt` 字段
3. **内容哈希策略**（兜底）：如果都没有，使用内容哈希比较

## 快速开始

### 1. 基础用法

```typescript
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'
import { useDataGuardQueryConfig, useDataGuardMutation } from '@qiaopeng/tanstack-query-plus/hooks'
import { createPaginatedKey } from '@qiaopeng/tanstack-query-plus/core'

function ProductList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  // 使用数据防护查询
  const { data, isLoading } = useEnhancedQuery(
    useDataGuardQueryConfig(
      createPaginatedKey(['products', 'list'], page, pageSize),
      () => fetchProducts(page, pageSize),
      {
        maxDataAge: 5000,  // 时间戳模式下，最大接受5秒的旧数据
        onStaleDataDetected: (info) => {
          console.warn('检测到旧数据', info)
        }
      }
    )
  )
  
  // 使用数据防护 Mutation
  const mutation = useDataGuardMutation(
    (updated) => api.updateProduct(updated.id, updated),
    createPaginatedKey(['products', 'list'], page, pageSize),
    {
      optimistic: {
        queryKey: createPaginatedKey(['products', 'list'], page, pageSize),
        updater: (old, updated) => ({
          ...old,
          items: old?.items?.map(p => p.id === updated.id ? updated : p)
        })
      },
      consistency: {
        mode: 'sync+invalidate',
        invalidationDelay: 3000
      },
      onConflict: (error) => {
        toast.error('数据冲突，请刷新后重试')
      }
    }
  )
  
  return (
    <div>
      <ProductGrid 
        products={data?.items} 
        loading={isLoading}
        onUpdate={mutation.mutate}
      />
      <Pagination 
        page={page}
        pageSize={pageSize}
        total={data?.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
```

### 2. 后端接口要求

#### 最佳实践（推荐）

```typescript
// 列表查询接口
GET /api/products?page=1&pageSize=20

Response: {
  "items": [
    {
      "id": "123",
      "name": "Product A",
      "version": 5,                    // ⭐ 推荐：版本号
      "updatedAt": "2024-01-15T10:30:00Z"  // ⭐ 推荐：时间戳
    }
  ],
  "total": 100,
  "version": 42,                      // 可选：列表版本号
  "updatedAt": "2024-01-15T10:30:00Z" // 可选：列表更新时间
}

// 更新接口
PUT /api/products/123

Response: {
  "id": "123",
  "name": "Updated Product",
  "version": 6,                       // ⭐ 必须：新版本号
  "updatedAt": "2024-01-15T10:35:00Z" // ⭐ 必须：新时间戳
}
```

#### 最小要求

```typescript
// 至少在更新接口返回
PUT /api/products/123

Response: {
  "id": "123",
  "name": "Updated Product",
  "updatedAt": "2024-01-15T10:35:00Z" // ⭐ 至少返回这个
}
```

### 3. 配置选项

```typescript
interface DataGuardOptions {
  /** 时间戳模式下，最大接受的数据年龄（毫秒），默认 10000 */
  maxDataAge?: number
  
  /** 启用版本号检查，默认 true */
  enableVersionCheck?: boolean
  
  /** 启用时间戳检查，默认 true */
  enableTimestampCheck?: boolean
  
  /** 启用哈希检查（兜底），默认 true */
  enableHashCheck?: boolean
  
  /** 检测到旧数据时的回调 */
  onStaleDataDetected?: (info: StaleDataInfo) => void
  
  /** 应用防护时的回调 */
  onDataGuardApplied?: (info: DataGuardInfo) => void
}
```

## 高级用法

### 1. 监控和调试

```typescript
const { data } = useEnhancedQuery(
  useDataGuardQueryConfig(
    queryKey,
    fetchFn,
    {
      onStaleDataDetected: (info) => {
        // 上报到监控系统
        analytics.track('stale_data_detected', {
          strategy: info.strategy,
          reason: info.reason,
          queryKey: JSON.stringify(info.queryKey)
        })
      },
      onDataGuardApplied: (info) => {
        // 记录防护策略使用情况
        console.log('[Data Guard]', {
          strategy: info.strategy,
          passed: info.passed,
          details: info.details
        })
      }
    }
  )
)
```

### 2. 自定义防护策略

```typescript
const { data } = useEnhancedQuery(
  useDataGuardQueryConfig(
    queryKey,
    fetchFn,
    {
      // 只使用时间戳策略
      enableVersionCheck: false,
      enableHashCheck: false,
      enableTimestampCheck: true,
      maxDataAge: 3000  // 只接受3秒内的数据
    }
  )
)
```

### 3. 处理冲突

```typescript
const mutation = useDataGuardMutation(
  mutationFn,
  queryKey,
  {
    onConflict: (error) => {
      // 显示友好的错误提示
      toast.error('数据已被其他用户修改，请刷新后重试')
      
      // 自动刷新数据
      queryClient.invalidateQueries({ queryKey })
    }
  }
)
```

## 防护策略说明

### 策略 1: 版本号比较（最可靠）

- **触发条件**：后端返回 `version` 字段
- **工作原理**：比较缓存和新数据的版本号，拒绝版本号更小的数据
- **可靠性**：⭐⭐⭐⭐⭐
- **性能**：⭐⭐⭐⭐⭐（几乎零开销）

```typescript
// 后端返回
{
  "id": "123",
  "name": "Product",
  "version": 5  // 版本号
}

// 防护逻辑
if (newData.version < cached.version) {
  // 拒绝旧数据
  return cached
}
```

### 策略 2: 时间戳比较（次优）

- **触发条件**：后端返回 `updatedAt` 字段
- **工作原理**：比较时间戳，拒绝超过 `maxDataAge` 的旧数据
- **可靠性**：⭐⭐⭐⭐
- **性能**：⭐⭐⭐⭐

```typescript
// 后端返回
{
  "id": "123",
  "name": "Product",
  "updatedAt": "2024-01-15T10:30:00Z"  // ISO 8601 时间戳
}

// 防护逻辑
const cachedTime = new Date(cached.updatedAt).getTime()
const newTime = new Date(newData.updatedAt).getTime()
const dataAge = Date.now() - newTime

if (newTime < cachedTime && dataAge > maxDataAge) {
  // 拒绝过期的旧数据
  return cached
}
```

### 策略 3: 内容哈希比较（兜底）

- **触发条件**：都没有版本号和时间戳
- **工作原理**：计算数据内容的哈希值，检测是否变化
- **可靠性**：⭐⭐⭐
- **性能**：⭐⭐⭐（有计算开销）

```typescript
// 防护逻辑
const newHash = hashObject(newData.items)
const cachedHash = cached._hash

if (cachedHash === newHash) {
  // 内容未变化，不需要更新
  return cached
}
```

## 常见问题

### Q1: 为什么还是会闪动？

**A:** 可能的原因：
1. 后端没有返回 `version` 或 `updatedAt`
2. `maxDataAge` 设置太大，接受了旧数据
3. 服务器数据更新延迟超过 `invalidationDelay`

**解决方案：**
- 确保后端返回 `version` 或 `updatedAt`
- 减小 `maxDataAge`（如 3000-5000ms）
- 增加 `invalidationDelay`（如 3000-5000ms）

### Q2: 如何知道使用了哪种防护策略？

**A:** 使用 `onDataGuardApplied` 回调：

```typescript
onDataGuardApplied: (info) => {
  console.log('使用的策略:', info.strategy)
  // 'version' | 'timestamp' | 'hash' | 'none'
}
```

### Q3: 如何处理 409 冲突错误？

**A:** 使用 `onConflict` 回调：

```typescript
const mutation = useDataGuardMutation(
  mutationFn,
  queryKey,
  {
    onConflict: (error) => {
      // 显示错误提示
      toast.error('数据冲突')
      
      // 刷新数据
      queryClient.invalidateQueries({ queryKey })
    }
  }
)
```

## 最佳实践

1. **后端优先返回 `version`**：这是最可靠的防护策略
2. **至少返回 `updatedAt`**：如果无法实现版本号，至少返回时间戳
3. **合理设置 `maxDataAge`**：建议 3000-5000ms
4. **配合 `consistency` 使用**：启用家族一致性功能
5. **监控防护效果**：使用回调函数记录和上报

## 完整示例

```typescript
import { useEnhancedQuery } from '@qiaopeng/tanstack-query-plus/hooks'
import { useDataGuardQueryConfig, useDataGuardMutation } from '@qiaopeng/tanstack-query-plus/hooks'
import { createPaginatedKey } from '@qiaopeng/tanstack-query-plus/core'

function ProductList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  // 查询配置
  const { data, isLoading } = useEnhancedQuery(
    useDataGuardQueryConfig(
      createPaginatedKey(['products', 'list'], page, pageSize),
      () => fetchProducts(page, pageSize),
      {
        maxDataAge: 5000,
        enableVersionCheck: true,
        enableTimestampCheck: true,
        enableHashCheck: true,
        onStaleDataDetected: (info) => {
          console.error('[监控] 检测到旧数据', info)
          analytics.track('stale_data_detected', {
            strategy: info.strategy,
            reason: info.reason
          })
        },
        onDataGuardApplied: (info) => {
          console.log('[监控] 数据防护', info)
        }
      }
    )
  )
  
  // Mutation 配置
  const mutation = useDataGuardMutation(
    (updated) => api.updateProduct(updated.id, updated),
    createPaginatedKey(['products', 'list'], page, pageSize),
    {
      optimistic: {
        queryKey: createPaginatedKey(['products', 'list'], page, pageSize),
        updater: (old, updated) => ({
          ...old,
          items: old?.items?.map(p => 
            p.id === updated.id ? { ...p, ...updated } : p
          )
        })
      },
      consistency: {
        mode: 'sync+invalidate',
        invalidationDelay: 3000,
        familySync: {
          idField: 'id',
          listSelector: (data) => {
            if (data?.items) {
              return { items: data.items, total: data.total }
            }
            return null
          }
        }
      },
      onConflict: (error) => {
        toast.error('数据冲突，请刷新后重试')
        console.error('[冲突]', error)
      },
      onSuccess: () => {
        toast.success('更新成功')
      }
    }
  )
  
  return (
    <div>
      <ProductGrid 
        products={data?.items} 
        loading={isLoading}
        onUpdate={mutation.mutate}
      />
      
      <Pagination 
        page={page}
        pageSize={pageSize}
        total={data?.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      
      {/* 调试信息（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-panel">
          <div>版本号: {data?.version || '无'}</div>
          <div>更新时间: {data?.updatedAt || '无'}</div>
          <div>数据哈希: {data?._hash?.slice(0, 8) || '无'}</div>
        </div>
      )}
    </div>
  )
}
```
