# Release Notes - v0.2.0

## 🎉 新增功能

### 持久化相关 Hooks
- ✨ **`usePersistenceStatus`** - 便捷的网络状态监听 hook
  - 自动监听在线/离线状态
  - 无需手动管理 state 和订阅
  - 返回 `{ isOnline, isOffline }`
  
- ✨ **`usePersistenceManager`** - 缓存管理 hook
  - 提供 `clearCache()` 方法清除缓存
  - 提供 `getOnlineStatus()` 方法获取网络状态
  - 简化缓存管理操作

### 无限查询增强
- ✨ **`createInfiniteQueryOptions`** - 通用无限查询配置工厂
  - 创建自定义分页逻辑
  - 支持复杂的分页参数
  - 完整的 TypeScript 类型支持

### 组件增强
- ✨ **`QuerySuspenseWrapper`** - 语义化的 Suspense 包装器
  - `SuspenseWrapper` 的别名
  - 更清晰的命名，表明用于查询场景
  - 功能完全相同，可根据喜好选择

## 📚 文档改进

### 更新的章节
- 📖 **12.2 节** - 网络状态监听（使用 `usePersistenceStatus`）
- 📖 **12.3 节** - 缓存管理（使用 `usePersistenceManager`）
- 📖 **8.6 节** - 自定义无限查询（使用 `createInfiniteQueryOptions`）
- 📖 **11.3 节** - Suspense 组件（添加 `QuerySuspenseWrapper`）
- 📖 **12.6 节** - 离线应用示例（使用新 hooks）
- 📖 **15 节** - 导入路径速查表（完善说明）

### 文档质量提升
- ✅ 所有新增 API 都有完整的使用示例
- ✅ 提供多种实现方式的对比说明
- ✅ 添加底层 API 作为高级用法参考
- ✅ 完善导入路径说明和最佳实践

## 🔄 使用示例

### 网络状态监听

**之前：**
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

**现在：**
```tsx
import { usePersistenceStatus } from '@qiaopeng/tanstack-query-plus'

function NetworkIndicator() {
  const { isOnline, isOffline } = usePersistenceStatus()
  return <div>{isOffline ? '离线' : '在线'}</div>
}
```

### 缓存管理

**现在：**
```tsx
import { usePersistenceManager } from '@qiaopeng/tanstack-query-plus'

function SettingsPage() {
  const { clearCache, getOnlineStatus } = usePersistenceManager()
  
  return (
    <div>
      <p>网络状态: {getOnlineStatus() ? '在线' : '离线'}</p>
      <button onClick={() => clearCache()}>清除缓存</button>
    </div>
  )
}
```

### 自定义无限查询

**现在：**
```tsx
import { createInfiniteQueryOptions, useEnhancedInfiniteQuery } from '@qiaopeng/tanstack-query-plus/hooks'

const customOptions = createInfiniteQueryOptions({
  queryKey: ['custom-list'],
  queryFn: ({ pageParam }) => fetchCustomData(pageParam),
  initialPageParam: { page: 1, filter: 'active' },
  getNextPageParam: (lastPage, allPages, lastPageParam) => {
    if (lastPage.hasMore) {
      return { ...lastPageParam, page: lastPageParam.page + 1 }
    }
    return undefined
  },
  staleTime: 60000,
})

const result = useEnhancedInfiniteQuery(customOptions)
```

## 📦 导入路径

所有新增功能都可以从主入口导入：

```tsx
import { 
  usePersistenceStatus, 
  usePersistenceManager 
} from '@qiaopeng/tanstack-query-plus'

import { 
  createInfiniteQueryOptions 
} from '@qiaopeng/tanstack-query-plus/hooks'

import { 
  QuerySuspenseWrapper 
} from '@qiaopeng/tanstack-query-plus/components'
```

## ⚠️ 破坏性变更

**无** - 本次更新完全向后兼容

- ✅ 所有现有 API 保持不变
- ✅ 没有删除任何功能
- ✅ 没有修改现有函数签名
- ✅ 现有代码无需修改

## 🔧 技术细节

### 类型安全
- ✅ 所有新增函数都有完整的 TypeScript 类型定义
- ✅ 无类型冲突
- ✅ 无重复导出警告

### 代码质量
- ✅ 通过 TypeScript 编译检查
- ✅ 无 ESLint 警告
- ✅ 代码风格一致

## 📈 升级指南

### 从 0.1.x 升级到 0.2.0

**无需任何代码修改！**

只需更新包版本：

```bash
npm install @qiaopeng/tanstack-query-plus@0.2.0
```

### 可选：使用新功能

如果你想使用新的 hooks 来简化代码：

1. **网络状态监听** - 用 `usePersistenceStatus` 替代手动状态管理
2. **缓存管理** - 用 `usePersistenceManager` 简化缓存操作
3. **自定义无限查询** - 用 `createInfiniteQueryOptions` 创建复杂分页逻辑
4. **语义化组件** - 用 `QuerySuspenseWrapper` 让代码意图更清晰

## 🙏 致谢

感谢所有使用本库的开发者！如果你有任何问题或建议，欢迎：

- 📝 [提交 Issue](https://github.com/qiaopengg/qiaopeng-tanstack-query-plus/issues)
- 💬 [参与讨论](https://github.com/qiaopengg/qiaopeng-tanstack-query-plus/discussions)
- ⭐ [给项目点星](https://github.com/qiaopengg/qiaopeng-tanstack-query-plus)

## 📚 相关链接

- [完整教程](./TUTORIAL.md)
- [API 改进说明](./CHANGELOG_IMPROVEMENTS.md)
- [改进总结](./API_IMPROVEMENTS_SUMMARY.md)
- [GitHub 仓库](https://github.com/qiaopengg/qiaopeng-tanstack-query-plus)
- [NPM 包](https://www.npmjs.com/package/@qiaopeng/tanstack-query-plus)

---

**发布日期**: 2024-01-XX  
**版本**: 0.2.0  
**类型**: Minor Release (新增功能，向后兼容)
