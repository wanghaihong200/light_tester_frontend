import { describe, expect, it } from 'vitest'
import { canAddChild, caseLabel, flattenModules, toMindmapData } from '../../src/adapters/tree'

const tree = [
  {
    id: 1,
    name: '登录模块',
    children: [
      {
        id: 3,
        name: '子模块A',
        children: [],
        feature_points: [{ id: 10, name: '账号登录', cases: [
          { id: 100, title: '正确账号密码登录成功', priority: 'P0', executed_pass: true },
          { id: 101, title: '密码错误提示', priority: 'P1', executed_pass: false },
        ] }],
      },
    ],
    feature_points: [{ id: 11, name: '扫码登录', cases: [] }],
  },
  { id: 2, name: '订单模块', children: [], feature_points: [] },
]

describe('toMindmapData', () => {
  const root = toMindmapData('商城系统', tree)

  it('根节点为项目名,nodeType=root', () => {
    expect(root.data).toEqual({ text: '商城系统', uid: 'root', nodeType: 'root' })
  })

  it('模块 uid/refId 正确,子模块先于功能点', () => {
    const m1 = root.children[0]
    expect(m1.data.nodeType).toBe('module')
    expect(m1.data.refId).toBe(1)
    expect(m1.children.map((c) => c.data.nodeType)).toEqual(['module', 'feature'])
    expect(m1.children[0].data.refId).toBe(3)
  })

  it('用例叶子文本带优先级,通过带对勾', () => {
    const cases = root.children[0].children[0].children[0].children
    expect(cases[0].data.text).toBe('✓ [P0] 正确账号密码登录成功')
    expect(cases[1].data.text).toBe('[P1] 密码错误提示')
    expect(cases[0].data).toMatchObject({ nodeType: 'case', refId: 100 })
  })

  it('空树也有根节点', () => {
    const empty = toMindmapData('空项目', [])
    expect(empty.data.text).toBe('空项目')
    expect(empty.children).toEqual([])
  })
})

describe('caseLabel / canAddChild / flattenModules', () => {
  it('caseLabel 三态', () => {
    expect(caseLabel({ id: 1, title: 't', priority: 'P2', executed_pass: null })).toBe('[P2] t')
    expect(caseLabel({ id: 1, title: 't', priority: 'P2', executed_pass: true })).toBe('✓ [P2] t')
  })

  it('canAddChild 类型规则', () => {
    expect(canAddChild('root')).toEqual(['module'])
    expect(canAddChild('module')).toEqual(['module', 'feature'])
    expect(canAddChild('feature')).toEqual(['case'])
    expect(canAddChild('case')).toEqual([])
  })

  it('flattenModules 深度序 + 排除子树', () => {
    const flat = flattenModules(tree as never, 1)
    expect(flat.map((m) => m.name)).toEqual(['订单模块'])
    const all = flattenModules(tree as never)
    expect(all.map((m) => m.depth)).toEqual([0, 0, 1])
  })
})
