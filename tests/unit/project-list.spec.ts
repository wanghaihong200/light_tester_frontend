import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it, vi } from 'vitest'
import ProjectListView from '../../src/views/ProjectListView.vue'

vi.mock('../../src/api/projects', () => ({
  listProjects: vi.fn().mockResolvedValue([
    { id: 1, name: '商城系统', description: '电商核心', git_repo_url: null, created_at: '2026-08-15T10:00:00' },
    { id: 2, name: '风控平台', description: null, git_repo_url: null, created_at: '2026-08-14T09:00:00' },
  ]),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}))

describe('ProjectListView', () => {
  it('渲染项目列表', async () => {
    const wrapper = mount(ProjectListView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(wrapper.text()).toContain('商城系统')
    expect(wrapper.text()).toContain('风控平台')
  })

  it('点击"新建项目"打开对话框', async () => {
    // el-dialog 默认 teleport 到 body,断言走 document.body 而非 wrapper
    const wrapper = mount(ProjectListView, { global: { plugins: [ElementPlus] }, attachTo: document.body })
    await flushPromises()
    await wrapper.find('button.new-project').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('新建项目')
  })
})
