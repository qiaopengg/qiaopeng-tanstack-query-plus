# 分页列表变更成功后切换分页/每页仍短暂显示旧快照（缺失列表族级跨缓存同步写回）

## 环境
- 包版本：`@qiaopeng/tanstack-query-plus@0.2.5`
- 依赖：`@tanstack/react-query@^5`
- 列表形状：`{ Total, Rows }`

## 复现步骤
- 在分页列表（每页 20 条）编辑一条数据，使用乐观更新；编辑成功后当前页数据为最新。
- 切换每页条数到 10 或切换页码（开启 `placeholderData: keepPreviousData`）。
- 页面短暂显示编辑前的旧快照，随后刷新为最新数据。

## 预期行为
- 变更成功后，无论切换分页或每页条数，页面都应立即展示最新数据；后台失效刷新后与服务端完全一致。

## 实际行为
- 切到新的查询 key 时，React Query 会先渲染该 key 的旧缓存或上一查询的过渡快照；因为包未进行“族级跨缓存同步写回”，UI 在切页瞬间短暂回退到旧数据。

## 根因分析（源码引用）
- 家族失效已存在：编辑/列表相关的变更会按“族级”失效，刷新全家族变体。
  - `node_modules/@qiaopeng/tanstack-query-plus/dist/hooks/useMutation.js:91–103`
  - `node_modules/@qiaopeng/tanstack-query-plus/dist/hooks/useMutation.js:141–151`
- 但未进行“跨缓存同步写回”（把最新实体投影到各变体缓存的真实消费字段）。旧版 `utils/consistency.js` 逻辑仅支持写回 `items` 字段且未在当前 `useMutation` 中被调用：
  - `node_modules/@qiaopeng/tanstack-query-plus/dist/utils/consistency.js:53–66`
- 因此当使用 `{ Total, Rows }` 的列表形状时，变更成功后切换分页仍会短暂显示旧的 `Rows` 快照。

## 源头修复建议
1) 列表族级一致性（跨缓存同步写回）增强并回归 `useMutation`
- 在 `useMutation` 支持显式一致性配置：
  - `consistency.familySync?: { idField?: string; listSelector?: (data) => { items: T[]; total?: number } | null; writeBack?: (old, items, total?) => any; maxKeys?: number }`
- 行为：编辑/删除成功后先对“已缓存的家族变体”按 `id` 局部合并更新（sync），再执行族级失效（invalidate）。
- `listSelector` 用于读取不同形状；`writeBack` 用于写回到真实消费字段（例如 `{ Total, Rows }`）。
- 代码落点：在 `useMutation` 的 `onSuccess` 中调用增强版 `syncEntityAcrossFamily`，并在 `utils/index.js` 导出。

2) 家族键推导与匹配增强
- 保持 `deriveFamilyKey(optimistic.queryKey)` 去除参数与标签（`paginated/filtered/sorted/search/complex`），并允许通过 `familyKey` 覆盖。
- 匹配规则继续使用“前缀深比较”。

3) 首次访问变体的过渡优化（可选）
- 新增 `injectNewVariant?: 'none' | 'projected'`：`'projected'` 时基于 `contains(entity, params)` 将最新实体投影到未缓存的新变体，随后失效刷新对齐服务端。

4) 提供列表专用简化 API
- `createListFamilyConsistency({ baseKeyFactory, shape: 'rows', idField: 'id' })` 返回一致性配置，内置 `{ Total, Rows }` 写回。

## 验收标准
- 编辑成功后，切换 `pageSize 20 → 10` 或切换页码，UI不出现旧数据过渡；随后后台失效刷新与服务端完全一致。
- 删除同理。
- 新增默认仅当前页处理并族级失效；若开启跨页同步，需由服务端或 `contains` 判定归属。
- 支持数组形状与 `{ items, total }`、`{ Total, Rows }`；`listSelector` 不匹配时降级为仅失效。

## 最小使用示例（期望的包侧配置与行为）
```tsx
import { useMutation } from '@qiaopeng/tanstack-query-plus/hooks'
import { createPaginatedKey } from '@qiaopeng/tanstack-query-plus/core'

function useEditApplicableCondition({ page, pageSize }) {
  return useMutation({
    mutationFn: (payload) => api.updateApplicableCondition(payload.id, payload),

    optimistic: {
      queryKey: createPaginatedKey(['applicable-conditions','list'], page, pageSize),
      updater: (old, updated) => ({
        ...old,
        Rows: (old?.Rows ?? []).map(i => i.id === updated.id ? { ...i, ...updated } : i)
      })
    },

    // 族级一致性：先同步，再族级失效
    consistency: {
      familySync: {
        idField: 'id',
        listSelector: (data) => {
          if (data && typeof data === 'object' && Array.isArray((data as any).Rows)) {
            return { items: (data as any).Rows, total: (data as any).Total }
          }
          if (Array.isArray(data)) return { items: data }
          return null
        },
        writeBack: (old, items, total) => ({ ...old, Rows: items, Total: total ?? old.Total }),
        maxKeys: 50
      },
      mode: 'sync+invalidate'
    }
  })
}
```

## 业务端临时兜底代码片段（不改包也能立即避免回退）
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useEditApplicableConditionFamilySync() {
  const qc = useQueryClient()
  const familyPrefix = ['applicable-conditions','list']
  const startsWith = (key: any[], prefix: any[]) => prefix.length <= key.length && prefix.every((v, i) => {
    const a = key[i]
    if (typeof v === 'object' && v !== null && typeof a === 'object' && a !== null) return JSON.stringify(v) === JSON.stringify(a)
    return v === a
  })

  return useMutation({
    mutationFn: (payload) => api.updateApplicableCondition(payload.id, payload),
    onSuccess: (data, variables) => {
      const queries = qc.getQueryCache().findAll({ predicate: q => startsWith(q.queryKey as any[], familyPrefix) })
      queries.forEach(q => {
        const old: any = qc.getQueryData(q.queryKey)
        if (old && Array.isArray(old.Rows)) {
          const nextRows = old.Rows.map((i: any) => i.id === variables.id ? { ...i, ...data } : i)
          qc.setQueryData(q.queryKey, { ...old, Rows: nextRows })
        }
      })
      qc.invalidateQueries({ queryKey: familyPrefix, exact: false })
    }
  })
}
```

## 结论
- 目前版本具备“族级失效”但缺少“族级同步写回”，因此在使用 `keepPreviousData` 的分页场景中会短暂显示旧快照。
- 建议在包中补齐“列表族级跨缓存同步写回”的可配置能力，以实现“切页无旧快照 + 最终一致”的理想体验。
