import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('monaco-editor', () => ({
  editor: {
    create: vi.fn(() => ({ setValue: vi.fn(), getModel: () => ({ setValue: vi.fn() }), dispose: vi.fn() })),
    setModelLanguage: vi.fn(),
  },
}))

const repoApi = vi.hoisted(() => ({
  syncRepo: vi.fn(),
  listFiles: vi.fn().mockResolvedValue({ needs_sync: true }),
  readFile: vi.fn(),
  listChanges: vi.fn().mockResolvedValue({ files: [] }),
  listBranches: vi.fn(),
  pushFiles: vi.fn(),
}))
vi.mock('../../src/api/repo', () => repoApi)

import RepoPane from '../../src/components/RepoPane.vue'

describe('RepoPane', () => {
  beforeEach(() => vi.clearAllMocks())

  it('无 git_repo_url 时显示提示', () => {
    const w = mount(RepoPane, {
      props: { projectId: 1, project: { id: 1, name: 'p', git_repo_url: null } as any },
      global: { plugins: [ElementPlus] },
    })
    expect(w.text()).toContain('请先在项目列表编辑')
  })

  it('needs_sync 时显示同步占位', async () => {
    const w = mount(RepoPane, {
      props: { projectId: 1, project: { id: 1, name: 'p', git_repo_url: 'https://x' } as any },
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()
    expect(w.text()).toContain('同步工程')
    expect(w.text()).toContain('点击「同步工程」拉取仓库')
  })
})
