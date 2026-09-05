import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessage } from 'element-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../src/api/client'
import UserProjectsDialog from '../../src/components/UserProjectsDialog.vue'

// mock api 层:usersApi(projects)+ membersApi + 项目列表 listProjects(与 HomeView 同源模块)
const mocks = vi.hoisted(() => ({ projects: vi.fn(), list: vi.fn(), add: vi.fn(), changeRole: vi.fn(), remove: vi.fn(), listProjects: vi.fn() }))
vi.mock('../../src/api/users', () => ({ usersApi: { projects: mocks.projects } }))
vi.mock('../../src/api/members', () => ({
  membersApi: { list: mocks.list, add: mocks.add, changeRole: mocks.changeRole, remove: mocks.remove },
}))
vi.mock('../../src/api/projects', () => ({ listProjects: mocks.listProjects }))

const USER_ID = 7
const USERNAME = 'wang'

const PROJECTS = [
  { id: 1, name: 'alpha', description: null, git_repo_url: null, created_at: '2026-01-01T00:00:00' },
  { id: 2, name: 'beta', description: null, git_repo_url: null, created_at: '2026-01-02T00:00:00' },
  { id: 3, name: 'gamma', description: null, git_repo_url: null, created_at: '2026-01-03T00:00:00' },
]
// 只授权了 alpha(owner),beta/gamma 未授权(role=null 行,默认 viewer + 添加)
const GRANTED = [{ project_id: 1, project_name: 'alpha', role: 'owner' }]

function mockData(granted = GRANTED) {
  mocks.projects.mockResolvedValue(granted)
  mocks.listProjects.mockResolvedValue(PROJECTS)
}

function mountDialog(visible = true) {
  const w = mount(UserProjectsDialog, {
    attachTo: document.body, // el-dialog teleport 到 body,断言走 document
    props: { visible, userId: USER_ID, username: USERNAME },
    global: { plugins: [ElementPlus] },
  })
  return flushPromises().then(() => w)
}

function dialogEl(): HTMLElement {
  return [...document.querySelectorAll('.el-dialog')].find((d) => d.textContent?.includes('项目权限'))!
}

function tableRows(): HTMLElement[] {
  return [...dialogEl().querySelectorAll('.el-table__body-wrapper tbody tr')]
}

// 按项目名找行内 select 的组件实例(驱动草稿角色,同 project-members-dialog.spec 的 add-role 驱动方式)
async function setRowDraft(w: Awaited<ReturnType<typeof mountDialog>>, projectName: string, role: string) {
  const idx = tableRows().findIndex((r) => r.textContent?.includes(projectName))
  const select = w.findAllComponents({ name: 'ElSelect' }).find((c) => c.attributes('data-project-id') === String(PROJECTS[idx].id))!
  await select.vm.$emit('update:modelValue', role)
  await flushPromises()
}

function rowBtn(projectName: string, test: string): HTMLButtonElement {
  const row = tableRows().find((r) => r.textContent?.includes(projectName))!
  return row.querySelector<HTMLButtonElement>(`[data-test="${test}"]`)!
}

describe('UserProjectsDialog 用户项目授权弹窗', () => {
  beforeEach(() => {
    mocks.projects.mockReset()
    mocks.list.mockReset()
    mocks.add.mockReset()
    mocks.changeRole.mockReset()
    mocks.remove.mockReset()
    mocks.listProjects.mockReset()
  })

  it('打开时并行拉授权列表+全量项目,表格渲染全部项目(已授权=角色下拉+移除,未授权=下拉+添加)', async () => {
    mockData()
    const w = await mountDialog()
    expect(mocks.projects).toHaveBeenCalledWith(USER_ID)
    expect(mocks.listProjects).toHaveBeenCalledOnce()
    // 全量项目 ∩ 授权:3 行,alpha 已授权(移除),beta/gamma 未授权(添加)
    expect(tableRows().length).toBe(3)
    expect(dialogEl().textContent).toContain('alpha')
    expect(dialogEl().textContent).toContain('beta')
    expect(dialogEl().textContent).toContain('gamma')
    expect(document.querySelectorAll('[data-test="role-select"]').length).toBe(3)
    expect(document.querySelectorAll('[data-test="remove-btn"]').length).toBe(1)
    expect(document.querySelectorAll('[data-test="assign-btn"]').length).toBe(2)
    w.unmount()
  })

  it('visible=false 不拉取', async () => {
    const w = await mountDialog(false)
    expect(mocks.projects).not.toHaveBeenCalled()
    expect(mocks.listProjects).not.toHaveBeenCalled()
    w.unmount()
  })

  it('未授权行选 editor 点「添加」:add 收到 (project_id, username, role),成功后重拉并 emit changed', async () => {
    mockData()
    const w = await mountDialog()
    await setRowDraft(w, 'beta', 'editor')
    mocks.projects.mockClear()
    rowBtn('beta', 'assign-btn')!.click()
    await flushPromises()
    expect(mocks.add).toHaveBeenCalledWith(2, USERNAME, 'editor')
    expect(mocks.projects).toHaveBeenCalledTimes(1) // 重拉授权列表
    expect(w.emitted('changed')).toBeTruthy()
    w.unmount()
  })

  it('未授权行不动下拉直接「添加」:默认 viewer', async () => {
    mockData()
    const w = await mountDialog()
    rowBtn('gamma', 'assign-btn')!.click()
    await flushPromises()
    expect(mocks.add).toHaveBeenCalledWith(3, USERNAME, 'viewer')
    w.unmount()
  })

  it('已授权行改角色:changeRole 收到 (project_id, userId, role),成功后重拉并 emit changed', async () => {
    mockData()
    const w = await mountDialog()
    const row = (w.vm as any).rows[0]
    mocks.projects.mockClear()
    await (w.vm as any).onRoleChange(row, 'viewer')
    expect(mocks.changeRole).toHaveBeenCalledWith(1, USER_ID, 'viewer') // 第二参=本弹窗用户
    expect(mocks.projects).toHaveBeenCalledTimes(1) // 成功后重拉
    expect(w.emitted('changed')).toBeTruthy()
    w.unmount()
  })

  it('已授权行「移除」:remove 收到 (project_id, userId),成功后重拉并 emit changed', async () => {
    mockData()
    const w = await mountDialog()
    mocks.projects.mockClear()
    rowBtn('alpha', 'remove-btn')!.click()
    await flushPromises()
    expect(mocks.remove).toHaveBeenCalledWith(1, USER_ID)
    expect(mocks.projects).toHaveBeenCalledTimes(1)
    expect(w.emitted('changed')).toBeTruthy()
    w.unmount()
  })

  it('改角色被拒(409 末位 owner):透出后端 detail、行角色回滚、不重拉', async () => {
    mockData()
    const errSpy = vi.spyOn(ElMessage, 'error')
    const w = await mountDialog()
    mocks.changeRole.mockRejectedValue(new ApiError(409, '项目至少需要一名 owner'))
    const row = (w.vm as any).rows[0]
    await (w.vm as any).onRoleChange(row, 'viewer')
    expect(errSpy).toHaveBeenCalledWith('项目至少需要一名 owner')
    expect(row.role).toBe('owner') // 回滚,不残留假角色
    expect(w.emitted('changed')).toBeFalsy()
    w.unmount()
  })

  it('过滤「alp」:表格只剩 alpha 行(本地过滤)', async () => {
    mockData()
    const w = await mountDialog()
    // el-input 的透传属性可能落在原生 input 上(Element Plus 绑 attrs 到 input),两种取法兜底
    const input = (dialogEl().querySelector<HTMLInputElement>('input[data-test="project-filter"]') ??
      dialogEl().querySelector<HTMLInputElement>('[data-test="project-filter"] input'))!
    input.value = 'alp'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    const rows = tableRows()
    expect(rows.length).toBe(1)
    expect(rows[0].textContent).toContain('alpha')
    w.unmount()
  })
})
