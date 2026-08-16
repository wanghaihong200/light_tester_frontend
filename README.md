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
9. 上传 .md → 发起生成 → SSE 看到流式输出 → 完成后暂存区出现分组用例
10. 勾选部分用例 → 入库 → 用例导图出现新功能点/用例;拒绝的消失
11. 导出 Excel:三个工作表(测试概述/功能点清单/测试用例)内容正确
12. 用例保存为「内容 PUT + 执行结果 PATCH」两请求:执行结果失败时提示「内容已保存,但执行结果保存失败」

## 生成任务(AI 用例生成)

文档库上传 .md → 生成任务 tab 发起(选文档+目标模块)→ 进度抽屉实时看 AI 流式输出(SSE)→ 完成后「暂存区」按功能点分组勾选 → 入库所选(转正入用例树,导图自动刷新)/ 拒绝所选(物理删除,无回收站)。

进度经浏览器原生 EventSource 流式推送 `/api/jobs/{id}/events`,页面关闭不中断任务(状态落库,可回看)。

### 环境变量

后端需在 `.env` 配置 `ANTHROPIC_API_KEY`(未配置时后端不启动生成 worker,任务将停留待执行);`AI_MODEL` 可选,默认 `claude-opus-5`。
