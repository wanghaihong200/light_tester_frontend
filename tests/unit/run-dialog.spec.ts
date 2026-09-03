import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessage } from 'element-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UiRun, UiScript } from '../../src/types'

// mock api:捕获 SSE 回调以便注入事件;orig 展开保持模块其他导出真实可用(import 不炸)
const mocks = vi.hoisted(() => {
  let cb: (e: Record<string, unknown>) => void = () => {}
  // createUiRun 返回值对齐 types.UiRun 真实契约(组件至少消费 id)
  const run: import('../../src/types').UiRun = {
    id: 5, project_id: 1, status: 'running', script_id: 1, script_name: '冒烟脚本',
    mode: 'headless', variables: {}, step_results: [], steps_total: 0,
    steps_passed: 0, steps_failed: 0, error: null, started_at: null, finished_at: null,
  }
  return {
    create: vi.fn(async () => run),
    subscribe: vi.fn((_id: number, c: (e: Record<string, unknown>) => void) => { cb = c; return mocks.close }),
    close: vi.fn(),
    listAuth: vi.fn(async () => [{ id: 3, project_id: 1, name: '管理员登录态', created_at: '2026-09-02T10:00:00' }]),
    fire: (e: Record<string, unknown>) => cb(e),
  }
})
vi.mock('../../src/api/uiAutomation', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  createUiRun: mocks.create,
  subscribeRunEvents: mocks.subscribe,
  listUiAuthStates: mocks.listAuth,
}))

import RunDialog from '../../src/components/webauto/RunDialog.vue'

function mkScript(opts: {
  id?: number; name?: string
  variables?: UiScript['script']['variables']; steps?: UiScript['script']['steps']
} = {}): UiScript {
  return {
    id: opts.id ?? 1,
    project_id: 1,
    name: opts.name ?? '冒烟脚本',
    description: null,
    script: {
      version: 1,
      meta: { start_url: 'http://x' },
      variables: opts.variables ?? [],
      steps: opts.steps ?? [],
    },
    created_at: '2026-09-02T10:00:00',
    updated_at: '2026-09-02T10:00:00',
  }
}

function mkRun(over: Partial<UiRun> = {}): UiRun {
  return {
    id: 5,
    project_id: 1,
    status: 'failed',
    script_id: 1,
    script_name: '冒烟脚本',
    mode: 'headless',
    variables: {},
    steps_total: 2,
    steps_passed: 1,
    steps_failed: 1,
    error: null,
    started_at: '2026-09-02T10:01:00',
    finished_at: '2026-09-02T10:01:05',
    step_results: [
      { index: 0, step_id: 's1', action: 'goto', status: 'passed', error: null, screenshot: 'step_0_passed.jpg', elapsed_ms: 100 },
      { index: 1, step_id: 's2', action: 'assert_text', status: 'failed', error: '文本不匹配', screenshot: 'step_1_failed.jpg', elapsed_ms: 200 },
    ],
    ...over,
  }
}

function mountDialog(props: Record<string, unknown>) {
  return mount(RunDialog, { props, global: { plugins: [ElementPlus] } })
}

describe('RunDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('执行流:index=-1 显示启动浏览器占位,step_end 原位更新并渲染错误与截图', async () => {
    const s = mkScript({ steps: [{ id: 's2', action: 'assert_text', params: { text: '欢迎' } }] })
    const w = mountDialog({ projectId: 1, queue: [{ script: s, mode: 'headless' }] })
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledWith(1, {
      script_id: 1, mode: 'headless', variables: {}, auth_state_id: undefined,
    })

    mocks.fire({ type: 'step_start', index: -1 }) // 环境预启步:仅占位行
    mocks.fire({ type: 'step_start', index: 0 })
    mocks.fire({ type: 'frame', data: 'QUJD', step_index: 0 })
    mocks.fire({ type: 'step_end', index: 0, status: 'failed', error: '元素不存在: #x', screenshot: 'step_0_failed.jpg' })
    await flushPromises()
    expect(w.text()).toContain('启动浏览器')
    expect(w.text()).toContain('元素不存在: #x')
    expect(w.html()).toContain('/api/ui-runs/5/screens/step_0_failed.jpg')
    expect(w.findAll('.log-row').length).toBe(2) // 占位行 + 真实步骤行,同 index 不重复建行
    expect(w.find('.frame-badge').text()).toBe('第 1 步') // 帧角标标注当前画面所属步骤
  })

  it('done 显示汇总(通过 x/总 y · 耗时 z 秒)并停止订阅,迟到事件不再打扰', async () => {
    const w = mountDialog({ projectId: 1, queue: [{ script: mkScript(), mode: 'headless' }] })
    await flushPromises()
    mocks.fire({ type: 'step_start', index: 0 })
    mocks.fire({ type: 'step_end', index: 0, status: 'passed', screenshot: 'step_0_passed.jpg' })
    mocks.fire({ type: 'done', status: 'completed', summary: { total: 2, passed: 1, failed: 1, duration_ms: 1500 } })
    mocks.fire({ type: 'error', message: '连接中断' })
    await flushPromises()
    expect(w.text()).toContain('通过 1/2 · 耗时 1.5 秒')
    expect(mocks.close).toHaveBeenCalled() // 终态即断流,避免 EventSource 重连 404 误报
    expect(w.text()).not.toContain('连接中断')
  })

  it('执行入口 400:createUiRun reject → 透传错误提示并跳过该脚本继续队列下一个', async () => {
    const errSpy = vi.spyOn(ElMessage, 'error')
    mocks.create.mockRejectedValueOnce(new Error('脚本不合法: 步骤缺少 action'))
    const w = mountDialog({
      projectId: 1,
      queue: [
        { script: mkScript({ id: 1, name: '脚本甲' }), mode: 'headless' },
        { script: mkScript({ id: 2, name: '脚本乙' }), mode: 'headless' },
      ],
    })
    await flushPromises()
    expect(String(errSpy.mock.calls[0][0])).toContain('脚本不合法')
    expect(mocks.create).toHaveBeenCalledTimes(2)
    expect(mocks.create).toHaveBeenNthCalledWith(2, 1, {
      script_id: 2, mode: 'headless', variables: {}, auth_state_id: undefined,
    })
    expect(w.text()).toContain('第 2/2 个:脚本乙') // 队列头部推进到下一个
  })

  it('历史模式:左侧 run 列表点选切换,渲染 step_results 与截图 URL,失败步骤整行红标', async () => {
    const r1 = mkRun()
    const r2 = mkRun({
      id: 6,
      status: 'completed',
      steps_total: 1,
      steps_passed: 1,
      steps_failed: 0,
      step_results: [
        { index: 0, step_id: 'x1', action: 'fill', status: 'passed', error: null, screenshot: 'step_0_passed.jpg', elapsed_ms: 50 },
      ],
    })
    const w = mountDialog({ projectId: 1, queue: [], history: { script: mkScript(), runs: [r1, r2] } })
    await flushPromises() // el-dialog 内容在 open 后才渲染
    expect(w.text()).toContain('执行历史 · 冒烟脚本')
    expect(w.text()).toContain('文本不匹配') // 默认选中第一条,直接可看步骤详情
    expect(w.html()).toContain('/api/ui-runs/5/screens/step_1_failed.jpg')
    expect(w.findAll('.row-failed').length).toBe(1) // 失败步骤红标

    await w.findAll('.run-item')[1].trigger('click') // 点选第二条 → 切换渲染该 run 的结果
    expect(w.text()).toContain('fill')
    expect(w.html()).toContain('/api/ui-runs/6/screens/step_0_passed.jpg')
    expect(w.findAll('.row-failed').length).toBe(0)
  })

  it('SSE error 事件:标记失败并断流,停在「运行中」的行收尾为失败', async () => {
    const w = mountDialog({ projectId: 1, queue: [{ script: mkScript(), mode: 'headless' }] })
    await flushPromises()
    mocks.fire({ type: 'step_start', index: -1 })
    mocks.fire({ type: 'step_start', index: 0 })
    mocks.fire({ type: 'error', message: '浏览器启动失败: 缺少可执行文件' })
    await flushPromises()
    expect(w.text()).toContain('浏览器启动失败: 缺少可执行文件')
    expect(mocks.close).toHaveBeenCalled() // 终态即断流
    expect(w.findAll('.log-row.failed').length).toBe(1) // 在途真实步骤行收尾为失败
    expect(w.findAll('.log-row.passed').length).toBe(1) // 环境预启行已在真实步骤开始时收尾
  })

  it('登录态下拉仅在项目存在登录态时显示;无登录态时确认后以无登录态执行', async () => {
    mocks.listAuth.mockResolvedValueOnce([])
    const s = mkScript({ variables: [{ name: 'kw', default: '', desc: '搜索关键词' }] })
    const w = mountDialog({ projectId: 1, queue: [{ script: s, mode: 'headless' }] })
    await flushPromises()
    expect(w.text()).not.toContain('登录态') // 项目暂无登录态:不出下拉
    await w.findAll('button').find((b) => b.text().includes('开始执行本脚本'))!.trigger('click')
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledWith(1, {
      script_id: 1, mode: 'headless', variables: { kw: '' }, auth_state_id: undefined,
    })
  })

  it('声明变量的脚本先在本对话框内收集变量与登录态,点「开始执行本脚本」才创建执行', async () => {
    const s = mkScript({ variables: [{ name: 'kw', default: '手机', desc: '搜索关键词' }] })
    const w = mountDialog({ projectId: 1, queue: [{ script: s, mode: 'headless' }] })
    await flushPromises()
    expect(mocks.listAuth).toHaveBeenCalledWith(1)
    expect(mocks.create).not.toHaveBeenCalled() // 表单未确认不启动执行
    expect(w.text()).toContain('搜索关键词')
    expect(w.findAll('input').some((i) => (i.element as HTMLInputElement).value === '手机')).toBe(true) // 预填默认值
    await w.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 3) // 选择登录态
    await flushPromises()

    await w.findAll('button').find((b) => b.text().includes('开始执行本脚本'))!.trigger('click')
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledWith(1, {
      script_id: 1, mode: 'headless', variables: { kw: '手机' }, auth_state_id: 3,
    })
    expect(mocks.subscribe).toHaveBeenCalledWith(5, expect.any(Function))
  })
})
