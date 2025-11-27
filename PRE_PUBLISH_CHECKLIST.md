# 发布前检查清单 - v0.2.0

## ✅ 代码质量检查

- [x] TypeScript 类型检查通过 (`npm run typecheck`)
- [x] 项目构建成功 (`npm run build`)
- [x] dist 目录生成正确
- [x] 所有新导出都在 dist 中

## ✅ 版本信息

- [x] package.json 版本更新为 0.2.0
- [x] 创建了 RELEASE_NOTES_v0.2.0.md

## ✅ 新增功能验证

### 主入口 (dist/index.d.ts)
- [x] `usePersistenceStatus` 已导出
- [x] `usePersistenceManager` 已导出
- [x] `PersistQueryClientProvider` 保持导出

### Hooks (dist/hooks/index.d.ts)
- [x] `createInfiniteQueryOptions` 已导出
- [x] 其他无限查询函数保持导出

### Components (dist/components/index.d.ts)
- [x] `QuerySuspenseWrapper` 已导出
- [x] `SuspenseWrapper` 保持导出

## ✅ 文档完整性

- [x] TUTORIAL.md 已更新
- [x] CHANGELOG_IMPROVEMENTS.md 已创建
- [x] API_IMPROVEMENTS_SUMMARY.md 已创建
- [x] VERIFICATION_CHECKLIST.md 已创建
- [x] RELEASE_NOTES_v0.2.0.md 已创建
- [x] PRE_PUBLISH_CHECKLIST.md 已创建

## ✅ Git 准备

需要执行的命令：

```bash
# 1. 查看所有改动
git status

# 2. 添加所有文件
git add .

# 3. 提交改动
git commit -m "chore: release v0.2.0

- feat: export usePersistenceStatus and usePersistenceManager hooks
- feat: export createInfiniteQueryOptions for custom infinite queries
- feat: export QuerySuspenseWrapper component
- docs: update TUTORIAL.md with new APIs and examples
- docs: add comprehensive documentation for all improvements"

# 4. 创建版本标签
git tag v0.2.0

# 5. 推送到远程仓库
git push origin main
git push origin v0.2.0
```

## ✅ NPM 发布

需要执行的命令：

```bash
# 1. 确保已登录 NPM
npm whoami

# 2. 如果未登录，先登录
npm login

# 3. 发布到 NPM（prepublishOnly 会自动运行 typecheck 和 build）
npm publish

# 4. 验证发布
npm view @qiaopeng/tanstack-query-plus version
```

## ✅ 发布后验证

- [ ] NPM 上的版本已更新为 0.2.0
- [ ] 可以通过 `npm install @qiaopeng/tanstack-query-plus@0.2.0` 安装
- [ ] 新功能可以正常导入和使用
- [ ] GitHub 上有对应的 release 和 tag

## 📝 发布后任务

### GitHub Release
1. 访问 https://github.com/qiaopengg/qiaopeng-tanstack-query-plus/releases/new
2. 选择 tag: v0.2.0
3. 标题: `v0.2.0 - API Enhancements`
4. 描述: 复制 RELEASE_NOTES_v0.2.0.md 的内容
5. 发布 release

### 社区通知（可选）
- [ ] 在项目 README 中更新版本号
- [ ] 在相关社区分享更新（如果适用）
- [ ] 更新项目文档网站（如果有）

## 🎯 发布命令总结

```bash
# 完整发布流程
git add .
git commit -m "chore: release v0.2.0

- feat: export usePersistenceStatus and usePersistenceManager hooks
- feat: export createInfiniteQueryOptions for custom infinite queries
- feat: export QuerySuspenseWrapper component
- docs: update TUTORIAL.md with new APIs and examples
- docs: add comprehensive documentation for all improvements"

git tag v0.2.0
git push origin main
git push origin v0.2.0

npm publish
```

## ✨ 准备就绪！

所有检查都已通过，可以安全发布 v0.2.0！
