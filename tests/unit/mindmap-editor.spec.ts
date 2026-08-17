import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fakeInstance, MindMapCtor } = vi.hoisted(() => {
  const fakeInstance = { on: vi.fn(), setData: vi.fn(), destroy: vi.fn(), render: vi.fn(), resize: vi.fn() }
  const MindMapCtor = vi.fn(() => fakeInstance)
  return { fakeInstance, MindMapCtor }
})
vi.mock('simple-mind-map', () => ({ default: MindMapCtor }))

import MindmapEditor from '../../src/components/MindmapEditor.vue'
import type { MindmapNode } from '../../src/adapters/tree'

const sample: MindmapNode = { data: { text: '项目', uid: 'root', nodeType: 'root' }, children: [] }
const sample2: MindmapNode = { data: { text: '改名', uid: 'root', nodeType: 'root' }, children: [] }

describe('MindmapEditor 封装', () => {
  beforeEach(() => vi.clearAllMocks())

  it('挂载时用 props.data 实例化 MindMap', () => {
    mount(MindmapEditor, { props: { data: sample } })
    expect(MindMapCtor).toHaveBeenCalledTimes(1)
    expect(MindMapCtor.mock.calls[0][0].data).toEqual(sample)
    expect(MindMapCtor.mock.calls[0][0].disableDBClickTapNode).toBe(true)
  })

  it('data prop 变化时调用 setData', async () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    await wrapper.setProps({ data: sample2 })
    expect(fakeInstance.setData).toHaveBeenCalledWith(sample2)
  })

  it('node_click 转发为 nodeActive 事件(重复点击已激活节点也要转发)', async () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    const handler = fakeInstance.on.mock.calls.find((c) => c[0] === 'node_click')![1] as (node: unknown) => void
    const node = { getData: (k: string) => (k === 'nodeType' ? 'case' : 42) }
    handler(node)
    handler(node) // 同一节点再次点击仍应转发
    await flushPromises()
    expect(wrapper.emitted('nodeActive')).toHaveLength(2)
    expect(wrapper.emitted('nodeActive')![0]).toEqual([{ nodeType: 'case', refId: 42 }])
  })

  it('根节点点击只带 nodeType', async () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    const handler = fakeInstance.on.mock.calls.find((c) => c[0] === 'node_click')![1] as (node: unknown) => void
    handler({ getData: (k: string) => (k === 'nodeType' ? 'root' : undefined) })
    await flushPromises()
    expect(wrapper.emitted('nodeActive')![0]).toEqual([{ nodeType: 'root' }])
  })

  it('无 nodeType 数据的节点不触发', async () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    const handler = fakeInstance.on.mock.calls.find((c) => c[0] === 'node_click')![1] as (node: unknown) => void
    handler({ getData: () => undefined })
    await flushPromises()
    expect(wrapper.emitted('nodeActive')).toBeUndefined()
  })

  it('卸载时销毁实例', () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    wrapper.unmount()
    expect(fakeInstance.destroy).toHaveBeenCalled()
  })
})
