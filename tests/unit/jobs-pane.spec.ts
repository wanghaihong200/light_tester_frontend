import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it, vi } from 'vitest'

// ---- mock api modules ----
const jobsApi = vi.hoisted(() => {
  const closeFn = vi.fn()
  return {
    listJobs: vi.fn().mockResolvedValue([
      {
        id: 10,
        project_id: 1,
        document_id: 3,
        target_module_id: 5,
        job_type: 'generate',
        status: 'pending' as const,
        model: 'gpt-4',
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        error: null,
        created_at: '2026-08-16T10:00:00',
        document_name: '需求文档.md',
      },
      {
        id: 9,
        project_id: 1,
        document_id: 2,
        target_module_id: 4,
        job_type: 'generate',
        status: 'completed' as const,
        model: 'gpt-4',
        input_tokens: 1200,
        output_tokens: 800,
        cost_usd: 0.05,
        error: null,
        created_at: '2026-08-15T10:00:00',
        document_name: 'API文档.md',
        staged_count: 15,
      },
    ]),
    createJob: vi.fn().mockResolvedValue({
      id: 11,
      project_id: 1,
      document_id: 3,
      target_module_id: 5,
      job_type: 'generate',
      status: 'pending' as const,
      model: 'gpt-4',
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      error: null,
      created_at: '2026-08-16T11:00:00',
      document_name: '需求文档.md',
    }),
    getJob: vi.fn(),
    subscribeJobEvents: vi.fn().mockReturnValue(vi.fn()), // returns close function
  }
})
vi.mock('../../src/api/jobs', () => jobsApi)

const docsApi = vi.hoisted(() => ({
  listDocuments: vi.fn().mockResolvedValue([
    { id: 3, filename: '需求文档.md', uploaded_at: '2026-08-15T09:00:00' },
    { id: 2, filename: 'API文档.md', uploaded_at: '2026-08-14T09:00:00' },
  ]),
}))
vi.mock('../../src/api/documents', () => docsApi)

const treeApi = vi.hoisted(() => ({
  fetchTree: vi.fn().mockResolvedValue([
    { id: 5, name: '模块A', children: [], feature_points: [] },
    { id: 4, name: '模块B', children: [{ id: 6, name: '子模块B1', children: [], feature_points: [] }], feature_points: [] },
  ]),
}))
vi.mock('../../src/api/tree', () => treeApi)

import JobsPane from '../../src/components/JobsPane.vue'

describe('JobsPane', () => {
  it('加载并渲染任务列表', async () => {
    const wrapper = mount(JobsPane, { props: { projectId: 1 }, global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(jobsApi.listJobs).toHaveBeenCalledWith(1)
    const text = wrapper.text()
    expect(text).toContain('10')
    expect(text).toContain('需求文档.md')
    expect(text).toContain('API文档.md')
    expect(text).toContain('待执行')
    expect(text).toContain('已完成')
  })

  it('发起对话框提交调 createJob', async () => {
    const wrapper = mount(JobsPane, { props: { projectId: 1 }, global: { plugins: [ElementPlus] } })
    await flushPromises()

    // 点击「+ 发起生成」按钮
    await wrapper.find('button').trigger('click')
    await flushPromises()

    // 对话框应出现
    expect(wrapper.find('.el-dialog').exists()).toBe(true)

    // 设置两个 el-select 的值
    const selects = wrapper.findAllComponents({ name: 'ElSelect' })
    expect(selects.length).toBeGreaterThanOrEqual(2)
    await selects[0].vm.$emit('update:modelValue', 3)   // documentId
    await selects[1].vm.$emit('update:modelValue', 5)    // targetModuleId
    await flushPromises()

    // 找到并点击提交按钮(对话框内的「发起」按钮，精确匹配避免命中工具栏的「+ 发起生成」)
    const btns = wrapper.findAll('button')
    for (const btn of btns) {
      if (btn.text().trim() === '发起') {
        await btn.trigger('click')
        break
      }
    }
    await flushPromises()

    expect(jobsApi.createJob).toHaveBeenCalledWith(1, { documentId: 3, targetModuleId: 5 })
    // 自动打开该任务的进度抽屉 → subscribeJobEvents 被调用
    expect(jobsApi.subscribeJobEvents).toHaveBeenCalledWith(11, expect.any(Function))
  })

  it('终态任务进度不连 SSE', async () => {
    const wrapper = mount(JobsPane, { props: { projectId: 1 }, global: { plugins: [ElementPlus] } })
    await flushPromises()

    // 先重置 subscribeJobEvents 调用记录
    jobsApi.subscribeJobEvents.mockClear()

    // 找到所有「进度」按钮:第一个=pending(row0),第二个=completed(row1)
    const progressBtns = wrapper.findAll('button').filter(b => b.text().trim() === '进度')
    expect(progressBtns.length).toBeGreaterThanOrEqual(2)
    // 点击第二个(completed 任务的进度按钮)
    await progressBtns[1].trigger('click')
    await flushPromises()

    // 抽屉应打开且显示终态信息
    expect(wrapper.find('.el-drawer').exists()).toBe(true)
    // 终态任务不应调用 subscribeJobEvents
    expect(jobsApi.subscribeJobEvents).not.toHaveBeenCalled()
  })

  it('抽屉关闭断开', async () => {
    const closeFn = vi.fn()
    jobsApi.subscribeJobEvents.mockReturnValue(closeFn)

    const wrapper = mount(JobsPane, { props: { projectId: 1 }, global: { plugins: [ElementPlus] } })
    await flushPromises()

    // 点击第一个「进度」按钮(pending 任务的进度按钮)
    const progressBtns = wrapper.findAll('button').filter(b => b.text().trim() === '进度')
    expect(progressBtns.length).toBeGreaterThanOrEqual(1)
    await progressBtns[0].trigger('click')
    await flushPromises()

    // subscribeJobEvents 已被调用
    expect(jobsApi.subscribeJobEvents).toHaveBeenCalled()

    // 关闭抽屉
    const drawer = wrapper.findComponent({ name: 'ElDrawer' })
    drawer.vm.$emit('close')
    await flushPromises()

    expect(closeFn).toHaveBeenCalled()
  })
})
