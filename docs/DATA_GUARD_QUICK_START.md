# 🛡️ 数据防护功能 - 快速开始

## 新功能：自适应数据防护

v0.4.0 新增了**自适应数据防护**功能，可以自动防止数据回退和闪动问题。

### 核心特性

- ✅ **自动选择最佳策略**：根据后端返回的字段自动选择防护策略
- ✅ **零配置**：开箱即用，无需复杂配置
- ✅ **渐进增强**：后端可以逐步添加 `version` 或 `updatedAt`
- ✅ **完全防止数据回退**：不会出现"刚改的数据又变回去了"的问题

### 防护策略（自动选择）

1. **版本号策略**（最可靠）：后端返回 `version` 字段时使用
2. **时间戳策略**（次优）：后端返回 `updatedAt` 字段时使用  
3. **内容哈希策略**（兜底）：都没有时使用内容比较

### 快速使用

```typescript
import { useEnhancedQuery, useDataGuardQueryConfig, useDataGuardMutation } from '@qiaopeng/tanstack-query-plus/hooks'

function ProductList() {
  // 1. 使用数据防护查询
  const { data } = useEnhancedQuery(
    useDataGuardQueryConfig(
      ['products', 'list', { page: 1, pageSize: 20 }],
      () => fetchProducts(1, 20)
    )
  )
  
  // 2. 使用数据防护 Mutation
  const mutation = useDataGuardMutation(
    (updated) => api.updateProduct(updated.id, updated),
    ['products', 'list', { page: 1, pageSize: 20 }],
    {
      optimistic: {
        queryKey: ['products', 'list', { page: 1, pageSize: 20 }],
        updater: (old, updated) => ({
          ...old,
          items: old?.items?.map(p => p.id === updated.id ? updated : p)
        })
      },
      consistency: {
        mode: 'sync+invalidate',
        invalidationDelay: 3000
      }
    }
  )
  
  return <ProductGrid products={data?.items} onUpdate={mutation.mutate} />
}
```

### 后端接口要求

#### 推荐配置（最佳）

```typescript
// 更新接口返回
{
  "id": "123",
  "name": "Updated Product",
  "version": 6,                       // ⭐ 推荐：版本号
  "updatedAt": "2024-01-15T10:35:00Z" // ⭐ 推荐：时间戳
}
```

#### 最小要求

```typescript
// 至少返回时间戳
{
  "id": "123",
  "name": "Updated Product",
  "updatedAt": "2024-01-15T10:35:00Z" // ⭐ 至少这个
}
```

### 详细文档

查看完整文档：[数据防护功能使用指南](./DATA_GUARD_USAGE.md)

### 效果对比

#### 不使用数据防护

```
用户编辑数据 A → B
  ↓
切换分页
  ↓
显示缓存的旧数据 A  ← 😱 数据回退了！
  ↓
后台 refetch 返回 B
  ↓
更新为 B  ← 😱 闪动！
```

#### 使用数据防护

```
用户编辑数据 A → B
  ↓
切换分页
  ↓
显示缓存的新数据 B  ← ✅ 正确！
  ↓
后台 refetch 返回旧数据 A
  ↓
数据防护拒绝旧数据  ← ✅ 防护生效！
  ↓
保持显示 B  ← ✅ 无闪动！
```
