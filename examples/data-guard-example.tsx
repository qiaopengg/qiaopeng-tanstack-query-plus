/**
 * 数据防护功能完整示例
 * 
 * 这个示例展示了如何使用数据防护功能来防止数据回退和闪动
 */

import { useState } from 'react'
import { useEnhancedQuery, useDataGuardQueryConfig, useDataGuardMutation } from '@qiaopeng/tanstack-query-plus/hooks'
import { createPaginatedKey } from '@qiaopeng/tanstack-query-plus/core'

// ============================================
// 类型定义
// ============================================
interface Product {
  id: string
  name: string
  price: number
  stock: number
  version?: number  // 可选：版本号
  updatedAt?: string  // 可选：更新时间
}

interface PaginatedResponse {
  items: Product[]
  total: number
  page: number
  pageSize: number
  version?: number  // 可选：列表版本号
  updatedAt?: string  // 可选：列表更新时间
}

// ============================================
// API 函数
// ============================================
const api = {
  // 获取产品列表
  async getProducts(page: number, pageSize: number): Promise<PaginatedResponse> {
    const response = await fetch(`/api/products?page=${page}&pageSize=${pageSize}`)
    return response.json()
  },

  // 更新产品
  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (response.status === 409) {
      // 冲突错误
      const error = await response.json()
      throw { status: 409, ...error }
    }

    return response.json()
  }
}

// ============================================
// 主组件
// ============================================
export function ProductListWithDataGuard() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // ============================================
  // 查询配置（带数据防护）
  // ============================================
  const { data, isLoading, error } = useEnhancedQuery(
    useDataGuardQueryConfig(
      createPaginatedKey(['products', 'list'], page, pageSize),
      () => api.getProducts(page, pageSize),
      {
        // 时间戳模式下，最大接受5秒的旧数据
        maxDataAge: 5000,

        // 启用所有防护策略
        enableVersionCheck: true,
        enableTimestampCheck: true,
        enableHashCheck: true,

        // 检测到旧数据时的回调
        onStaleDataDetected: (info) => {
          console.error('[数据防护] 检测到旧数据', {
            strategy: info.strategy,
            reason: info.reason,
            queryKey: info.queryKey
          })

          // 上报到监控系统
          if (typeof window !== 'undefined' && (window as any).analytics) {
            (window as any).analytics.track('stale_data_detected', {
              strategy: info.strategy,
              reason: info.reason,
              page,
              pageSize
            })
          }
        },

        // 应用防护时的回调
        onDataGuardApplied: (info) => {
          console.log('[数据防护] 策略应用', {
            strategy: info.strategy,
            passed: info.passed,
            details: info.details
          })
        }
      }
    )
  )

  // ============================================
  // Mutation 配置（带数据防护）
  // ============================================
  const updateMutation = useDataGuardMutation(
    (updated: Product) => api.updateProduct(updated.id, updated),
    createPaginatedKey(['products', 'list'], page, pageSize),
    {
      // 乐观更新配置
      optimistic: {
        queryKey: createPaginatedKey(['products', 'list'], page, pageSize),
        updater: (old, updated) => {
          if (!old) return old

          return {
            ...old,
            items: old.items.map(product =>
              product.id === updated.id
                ? { ...product, ...updated }
                : product
            )
          }
        }
      },

      // 家族一致性配置
      consistency: {
        mode: 'sync+invalidate',
        invalidationDelay: 3000,  // 3秒延迟，给服务器时间更新
        familySync: {
          idField: 'id',
          listSelector: (data: any) => {
            if (data?.items) {
              return {
                items: data.items,
                total: data.total,
                version: data.version,
                updatedAt: data.updatedAt
              }
            }
            return null
          }
        }
      },

      // 冲突处理
      onConflict: (error) => {
        console.error('[冲突] 数据已被修改', error)
        alert('数据已被其他用户修改，请刷新后重试')
      },

      // 成功回调
      onSuccess: (data) => {
        console.log('[成功] 产品已更新', data)
        // 可以显示成功提示
        // toast.success('更新成功')
      },

      // 错误回调
      onError: (error) => {
        console.error('[错误] 更新失败', error)
        // 可以显示错误提示
        // toast.error('更新失败')
      }
    }
  )

  // ============================================
  // 渲染
  // ============================================
  if (isLoading) {
    return <div className="loading">加载中...</div>
  }

  if (error) {
    return <div className="error">错误: {(error as Error).message}</div>
  }

  return (
    <div className="product-list">
      {/* 产品网格 */}
      <div className="product-grid">
        {data?.items.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onUpdate={(updated) => updateMutation.mutate(updated)}
            isUpdating={updateMutation.isPending}
          />
        ))}
      </div>

      {/* 分页控件 */}
      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          上一页
        </button>

        <span>
          第 {page} 页 / 共 {Math.ceil((data?.total || 0) / pageSize)} 页
        </span>

        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= Math.ceil((data?.total || 0) / pageSize)}
        >
          下一页
        </button>

        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPage(1)
          }}
        >
          <option value={10}>10 条/页</option>
          <option value={20}>20 条/页</option>
          <option value={50}>50 条/页</option>
          <option value={100}>100 条/页</option>
        </select>
      </div>

      {/* 调试信息（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-panel">
          <h3>调试信息</h3>
          <div>版本号: {data?.version || '无'}</div>
          <div>更新时间: {data?.updatedAt || '无'}</div>
          <div>数据哈希: {(data as any)?._hash?.slice(0, 8) || '无'}</div>
          <div>最近更新: {(data as any)?._recentlyUpdatedIds?.size || 0} 项</div>
          <div>当前页: {page}</div>
          <div>每页数量: {pageSize}</div>
          <div>总数: {data?.total || 0}</div>
        </div>
      )}
    </div>
  )
}

// ============================================
// 产品卡片组件
// ============================================
interface ProductCardProps {
  product: Product
  onUpdate: (updated: Product) => void
  isUpdating: boolean
}

function ProductCard({ product, onUpdate, isUpdating }: ProductCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(product.name)
  const [editedPrice, setEditedPrice] = useState(product.price)

  const handleSave = () => {
    onUpdate({
      ...product,
      name: editedName,
      price: editedPrice
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedName(product.name)
    setEditedPrice(product.price)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="product-card editing">
        <input
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          placeholder="产品名称"
        />
        <input
          type="number"
          value={editedPrice}
          onChange={(e) => setEditedPrice(Number(e.target.value))}
          placeholder="价格"
        />
        <div className="actions">
          <button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? '保存中...' : '保存'}
          </button>
          <button onClick={handleCancel} disabled={isUpdating}>
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p className="price">¥{product.price.toFixed(2)}</p>
      <p className="stock">库存: {product.stock}</p>
      {product.version && (
        <p className="version">版本: {product.version}</p>
      )}
      {product.updatedAt && (
        <p className="updated">
          更新: {new Date(product.updatedAt).toLocaleString()}
        </p>
      )}
      <button onClick={() => setIsEditing(true)}>编辑</button>
    </div>
  )
}

// ============================================
// 样式（可选）
// ============================================
const styles = `
.product-list {
  padding: 20px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.product-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.product-card.editing {
  border-color: #007bff;
}

.product-card input {
  width: 100%;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.product-card .actions {
  display: flex;
  gap: 8px;
}

.product-card button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
}

.product-card button:hover {
  background: #0056b3;
}

.product-card button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
  padding: 20px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.debug-panel {
  margin-top: 20px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
}

.debug-panel h3 {
  margin-top: 0;
}

.debug-panel div {
  margin: 4px 0;
}

.loading, .error {
  padding: 20px;
  text-align: center;
}

.error {
  color: red;
}
`
