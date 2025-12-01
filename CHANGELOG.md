# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2024-01-15

### 🎉 新功能

#### 自适应数据防护系统

添加了全新的数据防护功能，可以自动防止数据回退和闪动问题。

**核心特性：**
- ✅ 自动根据后端返回的字段选择最佳防护策略
- ✅ 支持版本号、时间戳、内容哈希三种防护策略
- ✅ 零配置，开箱即用
- ✅ 完全防止数据不合理的回退

**新增 API：**
- `useDataGuardQueryConfig()` - 创建带数据防护的查询配置
- `useDataGuardMutation()` - 带数据防护的 Mutation Hook
- `applyDataGuard()` - 数据防护核心函数
- `hashObject()` - 对象哈希工具函数
- `markRecentlyUpdated()` - 标记最近更新的项
- `updateFamilyMetadata()` - 更新家族缓存元数据

**新增类型：**
- `VersionedEntity` - 带版本控制的实体接口
- `VersionedPaginatedResponse` - 带版本控制的分页响应
- `DataGuardOptions` - 数据防护配置选项
- `DataGuardStrategy` - 数据防护策略类型
- `ConflictError` - 冲突错误类

**文档：**
- 添加 `docs/DATA_GUARD_USAGE.md` - 完整使用指南
- 添加 `docs/DATA_GUARD_QUICK_START.md` - 快速开始指南

### 📝 改进

- 更新 package.json 描述，添加 data guard 关键词
- 优化类型导出结构

### 🔧 技术细节

**防护策略优先级：**
1. 版本号策略（最可靠）- 当后端返回 `version` 字段时使用
2. 时间戳策略（次优）- 当后端返回 `updatedAt` 字段时使用
3. 内容哈希策略（兜底）- 当都没有时使用内容比较

**工作原理：**
- 查询时自动比较新数据和缓存数据
- 检测到旧数据时自动拒绝，保持缓存
- Mutation 时自动更新版本号和时间戳
- 成功后同步更新所有家族缓存的元数据

### 📚 使用示例

```typescript
import { useEnhancedQuery, useDataGuardQueryConfig, useDataGuardMutation } from '@qiaopeng/tanstack-query-plus/hooks'

// 查询
const { data } = useEnhancedQuery(
  useDataGuardQueryConfig(
    ['products', 'list'],
    () => fetchProducts()
  )
)

// Mutation
const mutation = useDataGuardMutation(
  (updated) => api.updateProduct(updated.id, updated),
  ['products', 'list'],
  {
    optimistic: { /* ... */ },
    consistency: { mode: 'sync+invalidate', invalidationDelay: 3000 }
  }
)
```

---

## [0.3.1] - Previous Release

### Features
- Enhanced query hooks with performance tracking
- Optimistic updates with consistency support
- Offline queue management
- Data persistence with localStorage
- Smart prefetch strategies
- Batch query operations

### Improvements
- Better TypeScript types
- Improved documentation
- Performance optimizations

---

## Migration Guide

### Upgrading to 0.4.0

数据防护功能是**可选的**，不会影响现有代码。如果你想使用数据防护功能：

1. **更新导入**：
```typescript
// 新增导入
import { useDataGuardQueryConfig, useDataGuardMutation } from '@qiaopeng/tanstack-query-plus/hooks'
```

2. **更新查询**（可选）：
```typescript
// 之前
const { data } = useEnhancedQuery({
  queryKey: ['products'],
  queryFn: fetchProducts
})

// 现在（使用数据防护）
const { data } = useEnhancedQuery(
  useDataGuardQueryConfig(
    ['products'],
    fetchProducts
  )
)
```

3. **更新 Mutation**（可选）：
```typescript
// 之前
const mutation = useMutation({ /* ... */ })

// 现在（使用数据防护）
const mutation = useDataGuardMutation(
  mutationFn,
  queryKey,
  { /* ... */ }
)
```

4. **后端接口**（推荐）：
在更新接口的响应中添加 `version` 或 `updatedAt` 字段：
```typescript
{
  "id": "123",
  "name": "Product",
  "version": 5,  // 推荐
  "updatedAt": "2024-01-15T10:30:00Z"  // 或这个
}
```

### Breaking Changes

无破坏性变更。所有新功能都是向后兼容的。
