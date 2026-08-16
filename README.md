# test-platform frontend

测试平台前端:Vue3 + Vite + Element Plus + simple-mind-map。
后端契约与领域术语见仓库根 `CONTEXT.md`;整体计划见 `docs/superpowers/plans/`。

## 启动

```bash
# 1. 先起后端(见 ../backend/README.md,端口 8000)
npm i
npm run dev        # http://localhost:5173,/api 由 vite proxy 转发到 8000
```

## 测试

```bash
npm test           # vitest run(jsdom)
```

## 架构速览

- `src/api/` — 后端契约类型与 fetch 封装(ApiError 带 status/detail)
- `src/adapters/tree.ts` — 后端树(平行数组)→ 导图树(单链 children)纯函数
- `src/components/MindmapEditor.vue` — simple-mind-map 画布封装(禁画布编辑,编辑走侧边表单)
- `src/views/` — ProjectListView(项目 CRUD)、ProjectView(工作台:导图 tab + 文档库 tab)

## 手动冒烟清单(发版自查)

1. 新建项目 → 进入 → 工具栏建根模块 → 选中加子模块/功能点 → 功能点下加用例
2. 选中三类节点 → 侧边表单分别改名/改字段保存 → 画布文本同步刷新
3. 用例:改优先级/执行结果 → 画布前缀 `[P0]`/`✓` 变化;步骤空行保存被拦
4. 模块移动:改父模块 → 节点迁到目标下;选自己后代被后端 400 拒绝
5. 删除模块 → 整个子树消失
6. 文档库:拖拽上传 .md → 列表出现 → 下载一致 → 上传 .txt 被拦 → 删除
7. 导出 .xmind → 用 XMind(2020+)打开:层级/优先级旗帜/用例 notes(前置/步骤/执行结果)正确
8. 中文项目名导出文件名不乱码